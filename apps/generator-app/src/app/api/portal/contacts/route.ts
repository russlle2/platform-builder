import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validatePortalTokenForSlug } from '@/lib/portal-auth'
import { isAuthenticatedPortalOwnerForSlug } from '@/lib/portal-owner-auth'
import { rateLimitByIp } from '@/lib/server-auth'
import { validateSiteSlug } from '@/lib/site-slug'

export const dynamic = 'force-dynamic'

const MAX_OFFSET = 10_000
const NOTIFICATION_STATUSES = new Set([
  'not_attempted', 'sent', 'failed', 'not_configured', 'no_recipient',
])

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      Vary: 'Cookie, Authorization, X-Portal-Token',
    },
  })
}

function boundedInteger(value: string | null, fallback: number, min: number, max: number) {
  if (value === null) return fallback
  if (!/^\d{1,5}$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null
}

/** This endpoint never accepts credentials in URLs, which can enter access logs. */
function headerToken(req: NextRequest): string | null {
  const authorization = req.headers.get('authorization') || ''
  const token = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : req.headers.get('x-portal-token')?.trim()
  return token && token.length <= 256 ? token : null
}

/** Customer inbox: authorize a single site before using the service-role client. */
export async function GET(req: NextRequest) {
  if (!rateLimitByIp(req, 'portal-contacts-get', 60, 10 * 60 * 1000)) {
    return json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  const params = req.nextUrl.searchParams
  const slug = params.get('slug') || ''
  const offset = boundedInteger(params.get('offset'), 0, 0, MAX_OFFSET)
  const limit = boundedInteger(params.get('limit'), 20, 1, 50)
  if (
    validateSiteSlug(slug) || offset === null || limit === null ||
    ['slug', 'offset', 'limit'].some((key) => params.getAll(key).length > 1)
  ) {
    return json({ error: 'A valid site address and pagination values are required.' }, 400)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return json({ error: 'The contact inbox is temporarily unavailable.' }, 503)
  }

  try {
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const authorized = await validatePortalTokenForSlug(supabase, slug, headerToken(req)) ||
      await isAuthenticatedPortalOwnerForSlug(supabase, slug)
    if (!authorized) {
      // A missing site and another customer's site have the same response.
      return json({ error: 'Sign in as the site owner or open a valid portal link.' }, 401)
    }

    // Platform-wide intake_contacts has no tenant key and is never used here.
    // The extra row determines whether another page exists without a full count.
    const { data, error } = await supabase
      .from('contact_messages')
      .select('id, visitor_name, visitor_email, visitor_phone, message, created_at, owner_notification_status')
      .eq('slug', slug)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit)
    if (error) {
      return json({ error: 'Unable to load messages. Please try again.' }, 500)
    }

    const rows = data || []
    const hasMore = rows.length > limit
    const nextOffset = hasMore && offset + limit <= MAX_OFFSET ? offset + limit : null
    return json({
      // Whitelist fields even if a future query accidentally selects more columns.
      messages: rows.slice(0, limit).map((row) => ({
        id: row.id,
        name: row.visitor_name,
        email: row.visitor_email,
        phone: row.visitor_phone,
        message: row.message,
        createdAt: row.created_at,
        notificationStatus: NOTIFICATION_STATUSES.has(row.owner_notification_status)
          ? row.owner_notification_status
          : 'unknown',
      })),
      nextOffset,
      paginationLimitReached: hasMore && nextOffset === null,
    })
  } catch {
    // Neither provider errors nor submitted contact information belong in logs.
    return json({ error: 'Unable to load messages. Please try again.' }, 500)
  }
}
