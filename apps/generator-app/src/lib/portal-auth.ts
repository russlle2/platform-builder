/**
 * Customer portal access tokens — slug alone is not sufficient for read/write of site data.
 */
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PortalSiteRow {
  slug: string
  data: Record<string, unknown>
  status?: string | null
  updated_at?: string | null
  portal_token_hash?: string | null
  portal_token_expires_at?: string | null
}

export interface PublicPortalSite {
  slug: string
  public: {
    siteUrl: string | null
    niche: string | null
    template: string | null
  }
}

export function createPortalAccessCredentials(subject?: string): { token: string; hash: string } | null {
  const secret = process.env.PORTAL_TOKEN_SECRET
  if (!secret) return null

  // Stripe may retry checkout fulfillment after a partial outage. A stable,
  // checkout-bound token prevents an earlier portal link from being silently
  // invalidated by the retry. Non-checkout callers still receive randomness.
  const token = subject
    ? crypto
        .createHmac('sha256', secret)
        .update(`dailyclarity:portal-access:${subject}`)
        .digest('base64url')
    : crypto.randomBytes(32).toString('base64url')
  const hash = hashPortalToken(token)
  if (!hash) return null
  return { token, hash }
}

export function hashPortalToken(token: string): string | null {
  const secret = process.env.PORTAL_TOKEN_SECRET
  if (!secret || !token) return null
  return crypto.createHmac('sha256', secret).update(token).digest('hex')
}

export function verifyPortalTokenHash(
  token: string,
  storedHash: string | null | undefined,
  expiresAt?: string | null,
): boolean {
  if (!token || !storedHash) return false
  // Persisted portal credentials pass an explicit expiry and fail closed when
  // that timestamp is absent, invalid, or elapsed. The optional form keeps this
  // low-level hash helper useful for non-persisted credentials and unit tests.
  if (expiresAt !== undefined) {
    const expiresAtMs = Date.parse(expiresAt || '')
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return false
  }
  const computed = hashPortalToken(token)
  if (!computed) return false
  const a = Buffer.from(computed)
  const b = Buffer.from(storedHash)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function getPortalTokenFromRequest(
  req: NextRequest,
  body?: { token?: string },
): string | null {
  const fromQuery = req.nextUrl.searchParams.get('token')?.trim()
  if (fromQuery) return fromQuery

  const fromBody = body?.token?.trim()
  if (fromBody) return fromBody

  const bearer = req.headers.get('authorization') || ''
  if (bearer.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim()
  }

  return req.headers.get('x-portal-token')?.trim() || null
}

export function toPublicPortalSite(row: PortalSiteRow): PublicPortalSite {
  const data = (row.data || {}) as Record<string, unknown>
  return {
    slug: row.slug,
    public: {
      siteUrl: (data.site_url as string) || null,
      niche: (data.niche as string) || null,
      template: (data.template as string) || null,
    },
  }
}

export function toAuthenticatedPortalSite(row: PortalSiteRow) {
  const data = { ...(row.data || {}) } as Record<string, unknown>
  delete data.netlify_site_id
  return {
    slug: row.slug,
    status: row.status ?? null,
    updated_at: row.updated_at ?? null,
    data,
  }
}

export async function fetchPortalTokenHash(
  supabase: SupabaseClient,
  slug: string,
): Promise<string | null> {
  const credential = await fetchPortalTokenCredential(supabase, slug)
  return credential?.hash || null
}

async function fetchPortalTokenCredential(
  supabase: SupabaseClient,
  slug: string,
): Promise<{ hash: string; expiresAt: string | null } | null> {
  const { data, error } = await supabase
    .from('portal_sites')
    .select('portal_token_hash, portal_token_expires_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data || typeof data.portal_token_hash !== 'string') return null
  return {
    hash: data.portal_token_hash,
    expiresAt: typeof data.portal_token_expires_at === 'string'
      ? data.portal_token_expires_at
      : null,
  }
}

export async function validatePortalTokenForSlug(
  supabase: SupabaseClient,
  slug: string,
  token: string | null,
): Promise<boolean> {
  if (!token) return false
  const credential = await fetchPortalTokenCredential(supabase, slug)
  return Boolean(
    credential && verifyPortalTokenHash(token, credential.hash, credential.expiresAt),
  )
}

export function buildPortalMagicLink(slug: string, token: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_PLATFORM_URL ||
    'https://dailyclarity.org'
  const url = new URL('/portal', base.replace(/\/$/, ''))
  url.searchParams.set('slug', slug)
  // URL fragments are not sent to the origin/CDN or included in HTTP referrer
  // headers. The portal consumes this once, stores it for the tab, and removes
  // it from the visible URL. Query tokens remain accepted for legacy links.
  url.hash = new URLSearchParams({ token }).toString()
  return url.toString()
}
