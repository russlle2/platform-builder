const SCHEME_OBFUSCATION = /[\u0000-\u0020\u007f]+/g;
const SAFE_RASTER_DATA_URL = /^data:image\/(?:avif|gif|jpe?g|png|webp);base64,([a-z0-9+/]+={0,2})$/i;

/** Normalize only for classification; callers retain the original URL bytes. */
export function normalizedUrlProbe(value: string): string {
  // Strip scheme-obfuscating controls before applying the bounded probe. If
  // truncation happened first, a long run of controls could push `data:` or
  // `blob:` beyond the inspected prefix while browsers still ignore them.
  return value.trim().replace(SCHEME_OBFUSCATION, '').slice(0, 512).toLowerCase();
}

export function isSafeEmbeddedRasterDataUrl(value: string): boolean {
  const normalized = value.trim().replace(SCHEME_OBFUSCATION, '');
  const match = SAFE_RASTER_DATA_URL.exec(normalized);
  return Boolean(match && match[1]!.length % 4 === 0);
}

export function isEmbeddedUrl(value: string): boolean {
  return /^(?:data|blob):/.test(normalizedUrlProbe(value));
}

/** Candidate sets are intentionally local-only; embedded/active schemes are rejected wholesale. */
export function containsUnsafeSrcset(value: string): boolean {
  const normalized = value.replace(SCHEME_OBFUSCATION, '').toLowerCase();
  return /(?:^|,)(?:data|blob|javascript|vbscript):/.test(normalized);
}

function decodeCssEscapes(value: string): string {
  return value
    .replace(/\\([0-9a-f]{1,6})(?:\r\n|[\t\n\f\r ])?/gi, (_match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '\ufffd';
    })
    .replace(/\\([^\r\n\f0-9a-f])/gi, '$1');
}

/**
 * Static templates may embed a base64 raster only in an image source or video
 * poster. Blob URLs are transient and every other data URL is active or
 * ambiguous, so they are rejected before publication.
 */
export function isUnsafeStaticUrl(tagName: string, attributeName: string, value: string): boolean {
  const probe = normalizedUrlProbe(value);
  if (/^(?:javascript|vbscript):/.test(probe)) return true;
  if (probe.startsWith('blob:')) return true;
  if (!probe.startsWith('data:')) return false;

  const tag = tagName.toLowerCase();
  const attribute = attributeName.toLowerCase();
  const imageContext = (tag === 'img' && attribute === 'src')
    || (tag === 'video' && attribute === 'poster');
  return !imageContext || !isSafeEmbeddedRasterDataUrl(value);
}

/** CSS may embed only the same base64 raster payload; imports never qualify. */
export function isUnsafeCssUrl(value: string, importRule = false): boolean {
  const decoded = decodeCssEscapes(value);
  const probe = normalizedUrlProbe(decoded);
  if (/^(?:javascript|vbscript|blob):/.test(probe)) return true;
  if (!probe.startsWith('data:')) return false;
  return importRule || !isSafeEmbeddedRasterDataUrl(decoded);
}

function cssUrlReferences(css: string): string[] {
  const references: string[] = [];
  const searchable = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const lower = searchable.toLowerCase();
  for (let cursor = 0; cursor < searchable.length;) {
    const start = lower.indexOf('url', cursor);
    if (start < 0) break;
    const before = start > 0 ? searchable[start - 1]! : '';
    let open = start + 3;
    while (/\s/.test(searchable[open] ?? '')) open += 1;
    if (/[A-Za-z0-9_-]/.test(before) || searchable[open] !== '(') {
      cursor = start + 3;
      continue;
    }
    let index = open + 1;
    while (/\s/.test(searchable[index] ?? '')) index += 1;
    const quote = searchable[index] === '"' || searchable[index] === "'" ? searchable[index++]! : '';
    const valueStart = index;
    let escaped = false;
    while (index < searchable.length) {
      const character = searchable[index]!;
      if (escaped) {
        escaped = false;
        index += 1;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        index += 1;
        continue;
      }
      if (quote ? character === quote : character === ')') break;
      index += 1;
    }
    references.push(searchable.slice(valueStart, index).trim());
    if (quote && searchable[index] === quote) index += 1;
    while (index < searchable.length && searchable[index] !== ')') index += 1;
    cursor = Math.min(searchable.length, index + 1);
  }
  return references;
}

/** Detect unsafe embedded URLs in a declaration block or complete stylesheet. */
export function containsUnsafeCssReferences(css: string): boolean {
  const searchable = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (cssUrlReferences(searchable).some((reference) => isUnsafeCssUrl(reference))) return true;
  for (const match of searchable.matchAll(/@import\s+(?!url\s*\()\s*(?:"([^"]*)"|'([^']*)'|([^\s;]+))/gi)) {
    if (isUnsafeCssUrl(match[1] ?? match[2] ?? match[3] ?? '', true)) return true;
  }
  // url() imports were already discovered above, but need the stricter rule
  // that even an otherwise safe raster cannot be imported as a stylesheet.
  for (const match of searchable.matchAll(/@import\s+url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    if (isUnsafeCssUrl(match[2] ?? '', true)) return true;
  }
  return false;
}
