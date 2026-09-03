/**
 * Defense-in-depth for HTML rendered in template preview iframes.
 *
 * The iframe is also sandboxed without `allow-same-origin`. Removing active
 * content here prevents generated template scripts from making network calls
 * or interfering with the trusted editor script that the app injects later.
 */
export function sanitizeTemplatePreviewHtml(html: string): string {
  if (!html) return ''

  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/\s*>/gi, '')
    .replace(/<(?:iframe|object|embed|applet|base)\b[^>]*>[\s\S]*?<\/(?:iframe|object|embed|applet)\s*>/gi, '')
    .replace(/<(?:iframe|object|embed|applet|base)\b[^>]*\/?\s*>/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '')
    // A slash can delimit attributes in HTML (`<img/onerror=...>`), so do not
    // rely on whitespace alone when removing executable handler attributes.
    .replace(/(?:\s|\/)+on[a-z][a-z0-9_-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(
      /(?:\s|\/)+(href|src|action|formaction|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (match, attribute: string, doubleQuoted: string, singleQuoted: string, bare: string) => {
        const value = doubleQuoted ?? singleQuoted ?? bare ?? ''
        const decodedScheme = value
          .replace(/&#(?:x([0-9a-f]+)|(\d+));?/gi, (_entity: string, hex: string, decimal: string) => {
            const codePoint = Number.parseInt(hex || decimal, hex ? 16 : 10)
            return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ''
          })
          .replace(/&(colon|tab|newline);/gi, (entity) => (
            entity.toLowerCase() === '&colon;'
              ? ':'
              : entity.toLowerCase() === '&tab;'
                ? '\t'
                : '\n'
          ))
          .replace(/[\u0000-\u0020\u007f]+/g, '')
          .toLowerCase()
        if (/^(?:javascript|vbscript):/.test(decodedScheme) || decodedScheme.startsWith('data:text/html')) {
          return ` ${attribute}="#"`
        }
        return match.startsWith('/') ? ` ${match.slice(1)}` : match
      },
    )
    .replace(/(?:\s|\/)+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
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

  return source
    .replace(
      /\b(href|src)\s*=\s*(["'])([^"']+)\2/gi,
      (match, attr: string, quote: string, value: string) => {
        const rewritten = rewrite(value, true)
        return rewritten ? `${attr}=${quote}${rewritten}${quote}` : match
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
    !value.includes('..') &&
    /^[a-zA-Z0-9/_-]+\.html$/.test(value)
  )
}

export function isSafePreviewText(value: unknown, maxLength = 10_000): value is string {
  return typeof value === 'string' && value.length <= maxLength
}

export function isSafePreviewImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) return false
  return /^(?:https?:\/\/|data:image\/|blob:|\/)/i.test(value)
}
