const PRODUCTION_SITE_ORIGIN = 'https://dailyclarity.org'

function parseSiteOrigin(candidate: string | undefined): string | null {
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

/** Return the trusted application origin used in payment redirects. */
export function getTrustedSiteOrigin(requestUrl?: string): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  return parseSiteOrigin(configured || (process.env.NODE_ENV !== 'production' ? requestUrl : undefined))
}

/** Account and portal links carry private access and must stay on the production host. */
export function getCustomerSiteOrigin(): string {
  const deployment = process.env.DAILYCLARITY_ENVIRONMENT?.trim().toLowerCase()
  if (deployment === 'production') return PRODUCTION_SITE_ORIGIN

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || process.env.NEXT_PUBLIC_API_URL?.trim()
    || process.env.NEXT_PUBLIC_PLATFORM_URL?.trim()
  const origin = parseSiteOrigin(configured || (deployment === 'staging' ? undefined : PRODUCTION_SITE_ORIGIN))
  if (!origin) throw new Error('A valid site origin is required for customer links.')
  return origin
}

export function buildCustomerPortalLink(origin: string, slug: string, token?: string): string {
  const url = new URL('/portal', origin)
  url.searchParams.set('slug', slug)
  // Fragments keep credentials out of HTTP requests, access logs, and referrer headers.
  if (token) url.hash = new URLSearchParams({ token }).toString()
  return url.toString()
}
