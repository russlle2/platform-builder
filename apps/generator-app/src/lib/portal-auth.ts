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
}

export interface PublicPortalSite {
  slug: string
  status: string | null
  updated_at: string | null
  public: {
    siteUrl: string | null
    plan: string | null
    niche: string | null
    template: string | null
  }
}

export function createPortalAccessCredentials(): { token: string; hash: string } | null {
  const token = crypto.randomBytes(32).toString('base64url')
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
): boolean {
  if (!token || !storedHash) return false
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
    status: row.status ?? null,
    updated_at: row.updated_at ?? null,
    public: {
      siteUrl: (data.site_url as string) || null,
      plan: (data.plan as string) || null,
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
  const { data, error } = await supabase
    .from('portal_sites')
    .select('portal_token_hash')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return (data.portal_token_hash as string) || null
}

export async function validatePortalTokenForSlug(
  supabase: SupabaseClient,
  slug: string,
  token: string | null,
): Promise<boolean> {
  if (!token) return false
  const storedHash = await fetchPortalTokenHash(supabase, slug)
  return verifyPortalTokenHash(token, storedHash)
}

export function buildPortalMagicLink(slug: string, token: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_PLATFORM_URL ||
    'https://dailyclarity.org'
  const url = new URL('/portal', base.replace(/\/$/, ''))
  url.searchParams.set('slug', slug)
  url.searchParams.set('token', token)
  return url.toString()
}
