import dns from 'dns'
import { isIP } from 'net'
import { domainToASCII } from 'url'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  setCustomDomain,
  getCustomDomainInstructions,
  getDomainDnsRecords,
  isApexCustomDomain,
} from '@/lib/netlify'
import {
  jsonForbidden,
  jsonUnauthorized,
  requireInternalAdminOrThrow,
} from '@/lib/server-auth'
import { getPortalTokenFromRequest, validatePortalTokenForSlug } from '@/lib/portal-auth'
import { isAuthenticatedPortalOwnerForSlug } from '@/lib/portal-owner-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const NETLIFY_LB_IP = '75.2.60.5'

function normalizeCustomDomain(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim().toLowerCase().replace(/\.$/, '')
  if (!raw || raw.length > 253 || raw.includes('://') || raw.includes('/') || isIP(raw)) return null
  const domain = domainToASCII(raw)
  if (!domain || domain.length > 253 || !domain.includes('.')) return null
  const labels = domain.split('.')
  if (labels.some((label) => (
    !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ))) return null
  const platformDomain = process.env.PLATFORM_DOMAIN?.trim().toLowerCase()
  if (platformDomain && (domain === platformDomain || domain.endsWith(`.${platformDomain}`))) return null
  return domain
}

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
  const ok = (
    await validatePortalTokenForSlug(supabase, slug, token)
  ) || await isAuthenticatedPortalOwnerForSlug(supabase, slug)
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
  const isApex = isApexCustomDomain(domain)

  try {
    const addresses = await dns.promises.resolveCname(domain)
    const normalizeDnsName = (value: string) => value.toLowerCase().replace(/\.$/, '')
    const match = addresses.find((address) => (
      normalizeDnsName(address) === normalizeDnsName(expectedCname)
    ))
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
    if (!process.env.PLATFORM_DOMAIN) {
      return NextResponse.json({ error: 'Platform domain is not configured.' }, { status: 503 })
    }

    const domain = normalizeCustomDomain(customDomain)
    if (!domain) {
      return NextResponse.json(
        { error: 'Enter a valid custom hostname that is not a DailyClarity subdomain.' },
        { status: 400 },
      )
    }

    let siteId: string | null = null
    let subdomain: string | null = null
    let previousDomain: string | null = null
    let serviceClient: SupabaseClient | null = null

    if (supabaseUrl && supabaseServiceKey) {
      serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })

      const { data } = await serviceClient
        .from('site_slugs')
        .select('netlify_site_id, site_url, status, custom_domain')
        .eq('slug', normalizedSlug)
        .maybeSingle()

      if (data?.status !== 'provisioned') {
        return NextResponse.json({ error: 'The site must finish provisioning first.' }, { status: 409 })
      }
      siteId = data.netlify_site_id || null
      subdomain = data.site_url || `https://${normalizedSlug}.${process.env.PLATFORM_DOMAIN}`
      previousDomain = data.custom_domain || null
      if (!siteId) {
        return NextResponse.json(
          { error: 'Site not found. Provision the site first.' },
          { status: 404 },
        )
      }

      // Reserve the domain in the database before mutating Netlify. The partial
      // unique index is the concurrency authority; a check-then-write sequence
      // could let two sites race for the same domain.
      const { error: reservationError } = await serviceClient
        .from('site_slugs')
        .update({ custom_domain: domain })
        .eq('slug', normalizedSlug)
      if (reservationError) {
        if (reservationError.code === '23505') {
          return NextResponse.json({ error: 'That domain is already assigned to another site.' }, { status: 409 })
        }
        throw new Error(`Unable to reserve custom domain: ${reservationError.message}`)
      }
    }

    if (!siteId) {
      return NextResponse.json(
        { error: 'Site not found. Provision the site first.' },
        { status: 404 },
      )
    }

    let result: Awaited<ReturnType<typeof setCustomDomain>>
    try {
      result = await setCustomDomain(siteId, domain)
    } catch (error) {
      // Compensate only if this request still owns the reservation. This avoids
      // leaving the database ahead of Netlify without clobbering a later update.
      if (serviceClient) {
        await serviceClient
          .from('site_slugs')
          .update({ custom_domain: previousDomain })
          .eq('slug', normalizedSlug)
          .eq('custom_domain', domain)
      }
      throw error
    }

    // Another tab or retry can reserve a newer domain while the Netlify call is
    // in flight. Re-read the database authority and converge Netlify on the
    // newest completed reservation instead of allowing the slowest request to
    // overwrite it. The database trigger mirrors each reservation into the
    // portal atomically.
    let appliedDomain = domain
    if (serviceClient) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data: current, error: currentError } = await serviceClient
          .from('site_slugs')
          .select('custom_domain')
          .eq('slug', normalizedSlug)
          .maybeSingle()
        if (currentError || !current) {
          throw new Error(`Unable to verify the active domain reservation: ${currentError?.message || 'not_found'}`)
        }
        const desiredDomain = normalizeCustomDomain(current.custom_domain)
        if (!desiredDomain) {
          throw new Error('The active domain reservation is invalid.')
        }
        if (desiredDomain === appliedDomain) break
        result = await setCustomDomain(siteId, desiredDomain)
        appliedDomain = desiredDomain
      }

      const { data: finalReservation, error: finalError } = await serviceClient
        .from('site_slugs')
        .select('custom_domain')
        .eq('slug', normalizedSlug)
        .maybeSingle()
      if (finalError || finalReservation?.custom_domain !== appliedDomain) {
        return NextResponse.json(
          { error: 'A newer domain change is still being applied. Please refresh and try again.' },
          { status: 409 },
        )
      }
    }

    if (appliedDomain !== domain) {
      return NextResponse.json(
        {
          error: 'This request was superseded by a newer domain change.',
          customDomain: appliedDomain,
        },
        { status: 409 },
      )
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

  const platformDomain = process.env.PLATFORM_DOMAIN
  if (!platformDomain) {
    return NextResponse.json({ error: 'Platform domain is not configured.' }, { status: 503 })
  }
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
