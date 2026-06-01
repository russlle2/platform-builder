import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setCustomDomain, getCustomDomainInstructions } from '@/lib/netlify'
import {
  jsonForbidden,
  jsonUnauthorized,
  requireInternalAdminOrThrow,
} from '@/lib/server-auth'
import { getPortalTokenFromRequest, validatePortalTokenForSlug } from '@/lib/portal-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function authorizePortalOrAdmin(
  req: NextRequest,
  slug: string,
  body?: { token?: string },
): Promise<NextResponse | null> {
  const adminError = requireInternalAdminOrThrow(req)
  if (!adminError) return null

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonForbidden()
  }

  const token = getPortalTokenFromRequest(req, body)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  const ok = await validatePortalTokenForSlug(supabase, slug, token)
  if (!ok) {
    return jsonUnauthorized()
  }
  return null
}

/**
 * POST /api/sites/domain
 *
 * Configures a custom domain on an existing Netlify-hosted client site.
 * Requires internal admin or valid portal access token for the slug.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, customDomain } = body

    if (!slug || !customDomain) {
      return NextResponse.json(
        { error: 'slug and customDomain are required.' },
        { status: 400 },
      )
    }

    const normalizedSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')

    const authError = await authorizePortalOrAdmin(req, normalizedSlug, body)
    if (authError) return authError

    if (!process.env.NETLIFY_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Netlify is not configured.' }, { status: 500 })
    }

    const domain = customDomain.toLowerCase().trim()

    let siteId: string | null = null
    let subdomain: string | null = null

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })

      const { data } = await supabase
        .from('site_slugs')
        .select('netlify_site_id, site_url')
        .eq('slug', normalizedSlug)
        .maybeSingle()

      siteId = data?.netlify_site_id || null
      subdomain = data?.site_url || `${normalizedSlug}.${process.env.PLATFORM_DOMAIN || 'yourdomain.com'}`
    }

    if (!siteId) {
      return NextResponse.json(
        { error: 'Site not found. Provision the site first.' },
        { status: 404 },
      )
    }

    const result = await setCustomDomain(siteId, domain)

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })

      await supabase
        .from('site_slugs')
        .update({ custom_domain: domain })
        .eq('slug', normalizedSlug)
    }

    const instructions = getCustomDomainInstructions(domain, subdomain || '')

    return NextResponse.json({
      ok: true,
      customDomain: domain,
      sslUrl: result.sslUrl,
      dnsInstructions: instructions,
    })
  } catch (error: unknown) {
    console.error('[domain] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Domain configuration failed.' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/sites/domain?slug=xxx
 *
 * Returns domain configuration. Internal admin or portal token required.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  if (!slug || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  }

  const normalizedSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  const authError = await authorizePortalOrAdmin(req, normalizedSlug)
  if (authError) return authError

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  const { data } = await supabase
    .from('site_slugs')
    .select('slug, status, netlify_site_id, site_url, custom_domain')
    .eq('slug', normalizedSlug)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ error: 'Site not found.' }, { status: 404 })
  }

  const platformDomain = process.env.PLATFORM_DOMAIN || 'yourdomain.com'
  const subdomain = `${normalizedSlug}.${platformDomain}`

  return NextResponse.json({
    slug: data.slug,
    status: data.status,
    subdomain,
    siteUrl: data.site_url || `https://${subdomain}`,
    customDomain: data.custom_domain || null,
    dnsInstructions: data.custom_domain
      ? getCustomDomainInstructions(data.custom_domain, subdomain)
      : null,
  })
}
