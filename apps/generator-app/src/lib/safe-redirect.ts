const DEFAULT_REDIRECT_PATH = '/dashboard'

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/

/**
 * Return a same-site path that is safe to use after authentication.
 *
 * URL parsers treat backslashes and encoded leading slashes inconsistently, so
 * validate both the supplied value and a few rounds of decoding before parsing.
 * Anything ambiguous falls back to the dashboard.
 */
export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_REDIRECT_PATH
): string {
  const safeFallback = isSafeInternalPath(fallback) ? normalizeInternalPath(fallback) : '/'

  if (!value || !isSafeInternalPath(value)) {
    return safeFallback
  }

  return normalizeInternalPath(value)
}

function isSafeInternalPath(value: string): boolean {
  if (value !== value.trim() || !value.startsWith('/') || value.startsWith('//')) {
    return false
  }

  let decoded = value

  for (let index = 0; index < 3; index += 1) {
    if (
      CONTROL_CHARACTERS.test(decoded) ||
      decoded.includes('\\') ||
      decoded.startsWith('//')
    ) {
      return false
    }

    try {
      const nextDecoded = decodeURIComponent(decoded)
      if (nextDecoded === decoded) break
      decoded = nextDecoded
    } catch {
      return false
    }
  }

  if (
    CONTROL_CHARACTERS.test(decoded) ||
    decoded.includes('\\') ||
    decoded.startsWith('//')
  ) {
    return false
  }

  try {
    const parsed = new URL(value, 'https://dailyclarity.invalid')
    return parsed.origin === 'https://dailyclarity.invalid' && parsed.pathname.startsWith('/')
  } catch {
    return false
  }
}

function normalizeInternalPath(value: string): string {
  const parsed = new URL(value, 'https://dailyclarity.invalid')
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}
