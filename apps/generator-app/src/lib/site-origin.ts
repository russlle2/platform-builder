/** Return the trusted application origin used in payment redirects. */
export function getTrustedSiteOrigin(requestUrl?: string): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const candidate = configured || (process.env.NODE_ENV !== 'production' ? requestUrl : undefined)
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
