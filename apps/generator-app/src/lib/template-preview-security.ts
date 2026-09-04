/**
 * Defense-in-depth for HTML rendered in template preview iframes.
 *
 * The iframe is also sandboxed without `allow-same-origin`. Removing active
 * content here prevents generated template scripts from making network calls
 * or interfering with the trusted editor script that the app injects later.
 */
const SCHEME_OBFUSCATION_RE = /[\u0000-\u0020\u007f]+/g
const SAFE_RASTER_DATA_URL_RE = /^data:image\/(?:avif|gif|jpe?g|png|webp);base64,([a-z0-9+/]+={0,2})$/i
const COMPILER_COMPATIBILITY_SOURCE = 'assets/js/dc-compat.js'
const COMPILER_COMPATIBILITY_RUNTIME = 'compatibility-v1'
const COMPILER_COMPATIBILITY_TAG = `<script defer src="${COMPILER_COMPATIBILITY_SOURCE}" data-dc-runtime="${COMPILER_COMPATIBILITY_RUNTIME}"></script>`

export interface SanitizeTemplatePreviewHtmlOptions {
  /** Retain only the compiler-owned, fixed compatibility runtime tag. */
  preserveCompilerCompatibilityRuntime?: boolean
}

function decodeHtmlUrlValue(value: string): string {
  return value
    .replace(/&#(?:x([0-9a-f]{1,6})|(\d{1,7}));?/gi, (_entity, hex: string, decimal: string) => {
      const codePoint = Number.parseInt(hex || decimal, hex ? 16 : 10)
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : '\ufffd'
    })
    .replace(/&(colon|tab|newline);?/gi, (_entity, name: string) => (
      name.toLowerCase() === 'colon' ? ':' : name.toLowerCase() === 'tab' ? '\t' : '\n'
    ))
}

function normalizedUrlProbe(value: string): string {
  return decodeHtmlUrlValue(value).trim().replace(SCHEME_OBFUSCATION_RE, '').toLowerCase()
}

function isSafeEmbeddedRasterDataUrl(value: string): boolean {
  const normalized = decodeHtmlUrlValue(value).trim().replace(SCHEME_OBFUSCATION_RE, '')
  const match = SAFE_RASTER_DATA_URL_RE.exec(normalized)
  return Boolean(match && match[1]!.length % 4 === 0)
}

function isUnsafeTemplateUrl(tagName: string, attributeName: string, value: string): boolean {
  const probe = normalizedUrlProbe(value)
  if (/^(?:javascript|vbscript|blob):/.test(probe)) return true
  if (!probe.startsWith('data:')) return false
  const tag = tagName.toLowerCase()
  const attribute = attributeName.toLowerCase()
  const rasterContext = (tag === 'img' && attribute === 'src')
    || (tag === 'video' && attribute === 'poster')
  return !rasterContext || !isSafeEmbeddedRasterDataUrl(value)
}

interface SrcsetCandidate {
  url: string
  descriptor: string
}

function isValidSrcsetDescriptor(descriptor: string): boolean {
  if (!descriptor) return true
  const tokens = descriptor.split(/\s+/)
  let width = false
  let height = false
  let density = false
  for (const token of tokens) {
    if (/^[1-9]\d*w$/.test(token)) {
      if (width || density) return false
      width = true
      continue
    }
    if (/^[1-9]\d*h$/.test(token)) {
      if (height || density) return false
      height = true
      continue
    }
    if (/^(?:[1-9]\d*(?:\.\d+)?|0?\.\d*[1-9]\d*)x$/.test(token)) {
      if (density || width || height) return false
      density = true
      continue
    }
    return false
  }
  return !height || width
}

/** Parse the URL + descriptor subset emitted by the compiler. */
function parseSrcset(value: string): SrcsetCandidate[] | null {
  const candidates: SrcsetCandidate[] = []
  let cursor = 0
  while (cursor < value.length) {
    while (cursor < value.length && /[\t\n\f\r ,]/.test(value[cursor]!)) cursor += 1
    if (cursor >= value.length) break

    const urlStart = cursor
    while (cursor < value.length && !/[\t\n\f\r ]/.test(value[cursor]!)) cursor += 1
    let url = value.slice(urlStart, cursor)
    let endedWithComma = false
    while (url.endsWith(',')) {
      endedWithComma = true
      url = url.slice(0, -1)
    }
    if (!url || /[\u0000-\u001f\u007f]/.test(url)) return null

    if (endedWithComma) {
      candidates.push({ url, descriptor: '' })
      continue
    }

    while (cursor < value.length && /[\t\n\f\r ]/.test(value[cursor]!)) cursor += 1
    const descriptorStart = cursor
    let parentheses = 0
    while (cursor < value.length) {
      const character = value[cursor]!
      if (character === '(') parentheses += 1
      else if (character === ')') {
        if (parentheses === 0) return null
        parentheses -= 1
      } else if (character === ',' && parentheses === 0) {
        break
      }
      cursor += 1
    }
    if (parentheses !== 0) return null
    const descriptor = value.slice(descriptorStart, cursor).trim()
    if (!isValidSrcsetDescriptor(descriptor)) return null
    candidates.push({ url, descriptor })
    if (value[cursor] === ',') cursor += 1
  }
  return candidates.length > 0 ? candidates : null
}

function isUnsafeSrcsetCandidate(value: string): boolean {
  const probe = normalizedUrlProbe(value)
  if (/^(?:javascript|vbscript|blob):/.test(probe)) return true
  return probe.startsWith('data:') && !isSafeEmbeddedRasterDataUrl(value)
}

function containsUnsafeSrcset(value: string): boolean {
  const candidates = parseSrcset(value)
  return !candidates || candidates.some((candidate) => isUnsafeSrcsetCandidate(candidate.url))
}

function decodeCssEscapes(value: string): string {
  return value
    .replace(/\\([0-9a-f]{1,6})(?:\r\n|[\t\n\f\r ])?/gi, (_match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '\ufffd'
    })
    .replace(/\\([^\r\n\f0-9a-f])/gi, '$1')
}

function cssUrlReferences(css: string): string[] {
  const references: string[] = []
  const searchable = css.replace(/\/\*[\s\S]*?\*\//g, ' ')
  const lower = searchable.toLowerCase()
  for (let cursor = 0; cursor < searchable.length;) {
    const start = lower.indexOf('url', cursor)
    if (start < 0) break
    const before = start > 0 ? searchable[start - 1]! : ''
    let open = start + 3
    while (/\s/.test(searchable[open] ?? '')) open += 1
    if (/[A-Za-z0-9_-]/.test(before) || searchable[open] !== '(') {
      cursor = start + 3
      continue
    }
    let index = open + 1
    while (/\s/.test(searchable[index] ?? '')) index += 1
    const quote = searchable[index] === '"' || searchable[index] === "'" ? searchable[index++]! : ''
    const valueStart = index
    while (index < searchable.length && (quote ? searchable[index] !== quote : searchable[index] !== ')')) {
      index += 1
    }
    references.push(searchable.slice(valueStart, index).trim())
    if (quote && searchable[index] === quote) index += 1
    while (index < searchable.length && searchable[index] !== ')') index += 1
    cursor = Math.min(searchable.length, index + 1)
  }
  return references
}

function containsUnsafeCssReferences(css: string): boolean {
  const decoded = decodeCssEscapes(css).replace(/\/\*[\s\S]*?\*\//g, ' ')
  for (const reference of cssUrlReferences(decoded)) {
    const probe = normalizedUrlProbe(reference)
    if (/^(?:javascript|vbscript|blob):/.test(probe)) return true
    if (probe.startsWith('data:') && !isSafeEmbeddedRasterDataUrl(reference)) return true
  }
  for (const match of decoded.matchAll(/@import\b([^;]*)(?:;|$)/gi)) {
    const compact = match[1]!.replace(SCHEME_OBFUSCATION_RE, '').toLowerCase()
    if (/(?:^|[\s('"])(?:data|blob|javascript|vbscript):/.test(compact)) return true
  }
  return false
}

/** Reject the complete stylesheet if any active embedded URL remains. */
export function sanitizeTemplatePreviewCss(css: string): string {
  // CSS is injected into an HTML <style> element after the HTML sanitizer has
  // run. Reject a raw-text closing delimiter so CSS cannot break out and add
  // markup or executable content at that later trust boundary.
  if (!css || /<\/style\b/i.test(css) || containsUnsafeCssReferences(css)) return ''
  return css
}

function sanitizeOpeningTag(fullTag: string, rawTagName: string): string {
  const tagName = rawTagName.toLowerCase()
  return fullTag
    // A slash can delimit attributes in HTML (`<img/onerror=...>`), so do not
    // rely on whitespace alone when removing executable handler attributes.
    .replace(/(?:\s|\/)+on[a-z][a-z0-9_-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:\s|\/)+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(
      /(?:\s|\/)+srcset\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (match, doubleQuoted: string, singleQuoted: string, bare: string) => (
        containsUnsafeSrcset(doubleQuoted ?? singleQuoted ?? bare ?? '') ? '' : match
      ),
    )
    .replace(
      /(?:\s|\/)+style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (match, doubleQuoted: string, singleQuoted: string, bare: string) => (
        sanitizeTemplatePreviewCss(doubleQuoted ?? singleQuoted ?? bare ?? '') ? match : ''
      ),
    )
    .replace(
      /(?:\s|\/)+(href|src|poster|action|formaction|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (match, attribute: string, doubleQuoted: string, singleQuoted: string, bare: string) => {
        const value = doubleQuoted ?? singleQuoted ?? bare ?? ''
        if (isUnsafeTemplateUrl(tagName, attribute, value)) return ` ${attribute}="#"`
        return match.startsWith('/') ? ` ${match.slice(1)}` : match
      },
    )
}

function isExactCompilerCompatibilityScript(attributes: string, body: string): boolean {
  if (body.trim()) return false
  const parsed = new Map<string, string | null>()
  const attribute = /\s+([A-Za-z][A-Za-z0-9:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gy
  let cursor = 0
  while (cursor < attributes.length) {
    if (!attributes.slice(cursor).trim()) break
    attribute.lastIndex = cursor
    const match = attribute.exec(attributes)
    if (!match) return false
    cursor = attribute.lastIndex
    const name = match[1]!.toLowerCase()
    if (parsed.has(name)) return false
    parsed.set(name, match[2] ?? match[3] ?? match[4] ?? null)
  }
  const defer = parsed.get('defer')
  return parsed.size === 3
    && (defer === null || defer === '')
    && parsed.get('src') === COMPILER_COMPATIBILITY_SOURCE
    && parsed.get('data-dc-runtime') === COMPILER_COMPATIBILITY_RUNTIME
}

function containsExactCompilerCompatibilityScript(html: string): boolean {
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (isExactCompilerCompatibilityScript(match[1] ?? '', match[2] ?? '')) return true
  }
  return false
}

export function sanitizeTemplatePreviewHtml(
  html: string,
  options: SanitizeTemplatePreviewHtmlOptions = {},
): string {
  if (!html) return ''

  const preserveCompatibilityRuntime = options.preserveCompilerCompatibilityRuntime
    && containsExactCompilerCompatibilityScript(html)
  let sanitized = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/\s*>/gi, '')
    .replace(/<script\b[^>]*>/gi, '')
    .replace(/<(?:iframe|object|embed|applet|base)\b[^>]*>[\s\S]*?<\/(?:iframe|object|embed|applet)\s*>/gi, '')
    .replace(/<(?:iframe|object|embed|applet|base)\b[^>]*\/?\s*>/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '')
    .replace(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi, (match, _attrs: string, css: string) => (
      sanitizeTemplatePreviewCss(css) ? match : ''
    ))
    .replace(
      /<([A-Za-z][A-Za-z0-9:-]*)\b(?:(?:"[^"]*"|'[^']*'|[^'">])*)>/g,
      sanitizeOpeningTag,
    )
  if (preserveCompatibilityRuntime) {
    sanitized = sanitized.replace(
      /<\/body\s*>/i,
      (closing) => `${COMPILER_COMPATIBILITY_TAG}${closing}`,
    )
  }
  return sanitized
}

function isExternalOrFragment(value: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)
}

function resolveTemplatePath(value: string, documentPath: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || isExternalOrFragment(trimmed)) return null

  const suffixIndex = trimmed.search(/[?#]/)
  const pathname = suffixIndex >= 0 ? trimmed.slice(0, suffixIndex) : trimmed
  const suffix = suffixIndex >= 0 ? trimmed.slice(suffixIndex) : ''
  if (!pathname || pathname === '/' || pathname === './') return null

  const baseParts = pathname.startsWith('/')
    ? []
    : documentPath.split('/').slice(0, -1).filter(Boolean)
  const parts = [...baseParts]
  for (const segment of pathname.replace(/^\.\//, '').replace(/^\/+/, '').split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (parts.length === 0) return null
      parts.pop()
      continue
    }
    if (segment.includes('\\') || /[\0-\x1f]/.test(segment)) return null
    parts.push(segment)
  }
  return parts.length > 0 ? `${parts.join('/')}${suffix}` : null
}

/**
 * Point relative template resources at the manifest-backed asset endpoint.
 * Supports both quote styles and CSS url() references, including ../ paths.
 */
export function rewriteTemplateAssetReferences(
  source: string,
  assetBase: string,
  documentPath = 'index.html',
): string {
  const base = assetBase.replace(/\/+$/, '')
  const rewrite = (value: string, preserveHtmlLinks: boolean): string | null => {
    if (isExternalOrFragment(value) || value.startsWith('/api/')) return null
    const cleanPath = value.split(/[?#]/, 1)[0].toLowerCase()
    if (preserveHtmlLinks && (cleanPath.endsWith('.html') || value === '/' || value === './')) {
      return null
    }
    const resolved = resolveTemplatePath(value, documentPath)
    return resolved ? `${base}/${resolved}` : null
  }

  // The compiler runtime uses one template-root path on every page. Rewrite
  // its canonical, sanitizer-approved tag before ordinary page-relative URLs
  // so nested pages cannot accidentally point at pages/.../assets/js.
  const withCompatibilityRuntime = source.split(COMPILER_COMPATIBILITY_TAG).join(
    `<script defer src="${base}/${COMPILER_COMPATIBILITY_SOURCE}" data-dc-runtime="${COMPILER_COMPATIBILITY_RUNTIME}"></script>`,
  )

  return withCompatibilityRuntime
    .replace(
      /\b(href|src|poster)\s*=\s*(["'])([^"']+)\2/gi,
      (match, attr: string, quote: string, value: string) => {
        const rewritten = rewrite(value, attr.toLowerCase() === 'href')
        return rewritten ? `${attr}=${quote}${rewritten}${quote}` : match
      },
    )
    .replace(
      /\bsrcset\s*=\s*(["'])([^"']*)\1/gi,
      (match, quote: string, value: string) => {
        const candidates = parseSrcset(value)
        if (!candidates || candidates.some((candidate) => isUnsafeSrcsetCandidate(candidate.url))) return ''
        const rewritten = candidates.map((candidate) => {
          const url = rewrite(candidate.url, false) ?? candidate.url
          return candidate.descriptor ? `${url} ${candidate.descriptor}` : url
        })
        return `srcset=${quote}${rewritten.join(', ')}${quote}`
      },
    )
    .replace(
      /url\(\s*(?:(["'])(.*?)\1|([^)'"\s][^)]*?))\s*\)/gi,
      (match, quote: string | undefined, quotedValue: string | undefined, bareValue: string | undefined) => {
        const value = (quotedValue ?? bareValue ?? '').trim()
        const rewritten = rewrite(value, false)
        if (!rewritten) return match
        const outputQuote = quote || ''
        return `url(${outputQuote}${rewritten}${outputQuote})`
      },
    )
}

export function isSafePreviewPage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 160 &&
    /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.html$/.test(value)
  )
}

export function isSafePreviewText(value: unknown, maxLength = 10_000): value is string {
  return typeof value === 'string' && value.length <= maxLength
}

export function isSafePreviewImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) return false
  if (isSafeEmbeddedRasterDataUrl(value)) return true
  // blob: is intentionally accepted only for the trusted, post-sanitization
  // customer image-swap message path. Template HTML itself always loses it.
  return /^(?:https?:\/\/|blob:|\/)/i.test(value)
}
