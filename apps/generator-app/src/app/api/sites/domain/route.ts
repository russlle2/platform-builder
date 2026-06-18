import dns from 'dns'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  setCustomDomain,
  getCustomDomainInstructions,
  getDomainDnsRecords,
} from '@/lib/netlify'
import {
  jsonForbidden,
  jsonUnauthorized,
  requireInternalAdminOrThrow,
} from '@/lib/server-auth'
import { getPortalTokenFromRequest, validatePortalTokenForSlug } from '@/lib/portal-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const NETLIFY_LB_IP = '75.2.60.5'

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

async function checkDnsPropagation(
  domain: string,
  netlifyUrl: string,
): Promise<{ propagated: boolean; record: string | null; expected: string }> {
  // Derive the expected CNAME target from the stored Netlify URL
  let expectedCname: string
  try {
    expectedCname = new URL(netlifyUrl).hostname
  } catch {
    expectedCname = netlifyUrl.includes('.') ? netlifyUrl : `${netlifyUrl}.netlify.app`
  }
  const isApex = !domain.startsWith('www.')

  try {
    const addresses = await dns.promises.resolveCname(domain)
    const match = addresses.find((a) => a.includes('netlify'))
    if (match) {
      return { propagated: true, record: match, expected: expectedCname }
    }
    return {
      propagated: false,
      record: addresses[0] || null,
      expected: expectedCname,
    }
  } catch {
    /* fall through to A record check for apex domains */
  }

  if (isApex) {
    try {
      const addresses = await dns.promises.resolve4(domain)
      if (addresses.includes(NETLIFY_LB_IP)) {
        return { propagated: true, record: NETLIFY_LB_IP, expected: NETLIFY_LB_IP }
      }
      return {
        propagated: false,
        record: addresses[0] || null,
        expected: NETLIFY_LB_IP,
      }
    } catch {
      return { propagated: false, record: null, expected: NETLIFY_LB_IP }
    }
  }

  return { propagated: false, record: null, expected: expectedCname }
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
      subdomain = data?.site_url || `https://${normalizedSlug}.${process.env.PLATFORM_DOMAIN || 'yourdomain.com'}`
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

    const siteSubdomain = subdomain || normalizedSlug
    const instructions = getCustomDomainInstructions(domain, siteSubdomain)
    const records = getDomainDnsRecords(domain, siteSubdomain)

    return NextResponse.json({
      ok: true,
      customDomain: domain,
      sslUrl: result.sslUrl,
      dnsInstructions: instructions,
      instructions,
      records,
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
 * GET /api/sites/domain?slug=xxx&check=true — DNS propagation check
 *
 * Returns domain configuration. Internal admin or portal token required.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const checkDns = req.nextUrl.searchParams.get('check') === 'true'

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
  // Use the stored Netlify URL for CNAME target; fall back to the platform subdomain
  // (which getDomainDnsRecords will use as a bare hostname)
  const netlifyUrl = data.site_url || `https://${normalizedSlug}.${platformDomain}`

  if (checkDns) {
    if (!data.custom_domain) {
      return NextResponse.json(
        { error: 'No custom domain configured for this site.' },
        { status: 400 },
      )
    }

    const dnsResult = await checkDnsPropagation(data.custom_domain, netlifyUrl)

    return NextResponse.json({
      checked: true,
      propagated: dnsResult.propagated,
      record: dnsResult.record,
      expected: dnsResult.expected,
    })
  }

  const customDomain = data.custom_domain
  const instructions = customDomain
    ? getCustomDomainInstructions(customDomain, subdomain)
    : null
  const records = customDomain ? getDomainDnsRecords(customDomain, netlifyUrl) : null

  return NextResponse.json({
    slug: data.slug,
    status: data.status,
    subdomain,
    siteUrl: data.site_url || `https://${subdomain}`,
    customDomain: customDomain || null,
    dnsInstructions: instructions,
    instructions,
    records,
  })
}
