import { NextResponse } from 'next/server'
import { getSafeRedirectPath } from './safe-redirect'

const AUTH_CREDENTIAL_PARAMETERS = [
  'code', 'token_hash', 'access_token', 'refresh_token',
  'provider_token', 'provider_refresh_token', 'id_token',
]

/** Keep application destinations without carrying OAuth callback credentials onward.
 * Generic token parameters remain valid for existing token-based portal links. */
export function getAuthReturnPath(value: string | null | undefined, depth = 0): string {
  const url = new URL(getSafeRedirectPath(value), 'https://auth-redirect.invalid')
  for (const name of AUTH_CREDENTIAL_PARAMETERS) url.searchParams.delete(name)
  if (url.searchParams.has('next')) {
    if (depth >= 3) url.searchParams.delete('next')
    else url.searchParams.set('next', getAuthReturnPath(url.searchParams.get('next'), depth + 1))
  }
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Create the private redirect headers and a safe local destination. Callers
 * resolve it against the trusted configured origin when hosting requires an
 * absolute Location; caller-supplied forwarding headers must not choose it.
 */
export function createAuthRedirect(path: string): NextResponse {
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: getSafeRedirectPath(path),
      'Cache-Control': 'private, no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
