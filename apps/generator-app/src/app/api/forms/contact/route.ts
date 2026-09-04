import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendContactNotification, sendContactConfirmation } from '@/lib/email'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeSlug(value: unknown): string {
  return (typeof value === 'string' ? value : '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function corsHeaders(origin: string | null): HeadersInit | undefined {
  if (!origin) return undefined
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(
  body: Record<string, unknown>,
  status: number,
  allowedOrigin: string | null = null,
) {
  return NextResponse.json(body, { status, headers: corsHeaders(allowedOrigin) })
}

async function resolveAllowedOrigin(
  req: NextRequest,
  normalizedSlug: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  const origin = req.headers.get('origin')
  if (!origin) return null

  let parsedOrigin: string
  try {
    parsedOrigin = new URL(origin).origin
  } catch {
    return null
  }
  if (parsedOrigin === req.nextUrl.origin) return parsedOrigin
  if (!normalizedSlug) return null

  const platformDomain = (
    process.env.PLATFORM_DOMAIN ||
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ||
    'dailyclarity.org'
  ).toLowerCase()
  const allowed = new Set<string>([`https://${normalizedSlug}.${platformDomain}`])
  const { data, error } = await supabase
    .from('site_slugs')
    .select('site_url, custom_domain')
    .eq('slug', normalizedSlug)
    .maybeSingle()
  if (error) throw error

  if (typeof data?.site_url === 'string') {
    try {
      allowed.add(new URL(data.site_url).origin)
    } catch {
      // Ignore malformed legacy URLs instead of reflecting an untrusted origin.
    }
  }
  if (typeof data?.custom_domain === 'string' && data.custom_domain) {
    const customHost = data.custom_domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    allowed.add(`https://${customHost}`)
  }
  return allowed.has(parsedOrigin) ? parsedOrigin : null
}

/**
 * POST /api/forms/contact
 *
 * Handles contact-form submissions from DailyClarity and generated client sites.
 *
 * Body: { slug?, name, email, phone?, message }
 *
 * 1. Stores the message in Supabase `contact_messages` table.
 * 2. Looks up the site owner's email from `portal_sites.data.email`.
 * 3. Sends the owner a notification email via Postmark.
 * 4. Sends the visitor a confirmation email.
 */
export async function POST(req: NextRequest) {
  const allowed = rateLimitByIp(req, 'contact', 5, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

  let allowedOrigin: string | null = null

  try {
    const body = await req.json()
    const normalizedSlug = normalizeSlug(body?.slug)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''

    if (!name || !email || !message) {
      return json({ error: 'Name, email, and message are required.' }, 400)
    }

    if (!EMAIL_PATTERN.test(email) || /[\r\n]/.test(name) || /[\r\n]/.test(phone)) {
      return json({ error: 'Please provide valid contact information.' }, 400)
    }

    if (name.length > 200 || email.length > 320 || phone.length > 50 || message.length > 10000) {
      return json({ error: 'One or more fields exceed the allowed length.' }, 400)
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[contact] Supabase is not configured')
      return json(
        { error: 'Contact submissions are temporarily unavailable. Please email support@dailyclarity.org.' },
        503,
      )
    }

    let ownerEmail: string | null = normalizedSlug
      ? null
      : process.env.CONTACT_EMAIL_ADDRESS || 'support@dailyclarity.org'
    let siteName = normalizedSlug ? 'Your business' : 'DailyClarity'

    // ---- Persist to Supabase ----
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    // Generated-site submissions must name a real provisioned tenant. This
    // keeps no-Origin API clients from filling the shared inbox with arbitrary
    // synthetic slugs while preserving the slug-less DailyClarity form.
    if (normalizedSlug) {
      const { data: siteSlug, error: siteSlugError } = await supabase
        .from('site_slugs')
        .select('slug')
        .eq('slug', normalizedSlug)
        .eq('status', 'provisioned')
        .maybeSingle()
      if (siteSlugError) throw siteSlugError
      if (!siteSlug) {
        return json({ error: 'Site not found.' }, 404)
      }
    }

    allowedOrigin = await resolveAllowedOrigin(req, normalizedSlug, supabase)
    if (req.headers.get('origin') && !allowedOrigin) {
      return json({ error: 'Origin is not authorized for this site.' }, 403)
    }

    // Store the contact message before reporting success to the visitor.
    const { data: insertedMessage, error: insertError } = await supabase
      .from('contact_messages')
      .insert({
        slug: normalizedSlug || null,
        visitor_name: name,
        visitor_email: email,
        visitor_phone: phone || null,
        message,
      })
      .select('id')
      .single()

    if (insertError || !insertedMessage) {
      throw insertError
    }

    // Look up business owner email for notification.
    if (normalizedSlug) {
      const { data: site, error: siteError } = await supabase
        .from('portal_sites')
        .select('data')
        .eq('slug', normalizedSlug)
        .maybeSingle()

      if (siteError) {
        console.error('[contact] site lookup failed:', siteError)
      } else if (site?.data) {
        const siteData = site.data as Record<string, unknown>
        const customerValues = siteData.customerValues && typeof siteData.customerValues === 'object'
          ? siteData.customerValues as Record<string, unknown>
          : {}
        ownerEmail = typeof siteData.email === 'string'
          ? siteData.email
          : typeof customerValues.EMAIL === 'string'
            ? customerValues.EMAIL
            : null
        siteName = typeof siteData.businessName === 'string'
          ? siteData.businessName
          : typeof customerValues.BUSINESS_NAME === 'string'
            ? customerValues.BUSINESS_NAME
            : siteName
      }
    }

    // ---- Email notifications via Postmark ----
    const postmarkConfigured = !!(process.env.POSTMARK_SERVER_TOKEN && process.env.EMAIL_FROM_ADDRESS)

    let ownerNotificationStatus = postmarkConfigured
      ? ownerEmail ? 'not_attempted' : 'no_recipient'
      : 'not_configured'
    let visitorConfirmationStatus = postmarkConfigured ? 'not_attempted' : 'not_configured'
    const notificationErrors: string[] = []

    if (postmarkConfigured) {
      const [ownerResult, visitorResult] = await Promise.allSettled([
        ownerEmail
          ? sendContactNotification({
              ownerEmail,
              visitorName: name,
              visitorEmail: email,
              visitorPhone: phone,
              message,
              siteName,
            })
          : Promise.resolve(null),
        sendContactConfirmation({
          visitorEmail: email,
          visitorName: name,
          siteName,
        }),
      ])

      if (ownerEmail) {
        ownerNotificationStatus = ownerResult.status === 'fulfilled' ? 'sent' : 'failed'
        if (ownerResult.status === 'rejected') {
          const detail = ownerResult.reason instanceof Error ? ownerResult.reason.message : 'unknown error'
          notificationErrors.push(`owner: ${detail}`)
          console.error('[contact] owner notification failed:', ownerResult.reason)
        }
      }
      visitorConfirmationStatus = visitorResult.status === 'fulfilled' ? 'sent' : 'failed'
      if (visitorResult.status === 'rejected') {
        const detail = visitorResult.reason instanceof Error ? visitorResult.reason.message : 'unknown error'
        notificationErrors.push(`visitor: ${detail}`)
        console.error('[contact] visitor confirmation failed:', visitorResult.reason)
      }
    }

    const { error: statusError } = await supabase
      .from('contact_messages')
      .update({
        owner_notification_status: ownerNotificationStatus,
        visitor_confirmation_status: visitorConfirmationStatus,
        notification_last_error: notificationErrors.join('; ').slice(0, 1_000) || null,
        notification_attempted_at: postmarkConfigured ? new Date().toISOString() : null,
      })
      .eq('id', insertedMessage.id)
    if (statusError) {
      console.error('[contact] notification status update failed:', statusError)
    }

    return json({
      ok: true,
      deliveryStatus: ownerNotificationStatus === 'sent' ? 'sent' : 'stored_for_review',
    }, 200, allowedOrigin)
  } catch (error) {
    console.error('[contact] handler error:', error)
    return json({ error: 'Unable to process your message.' }, 500, allowedOrigin)
  }
}

export async function OPTIONS(req: NextRequest) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return new NextResponse(null, { status: 503 })
  }
  const normalizedSlug = normalizeSlug(req.nextUrl.searchParams.get('slug'))
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  try {
    const allowedOrigin = await resolveAllowedOrigin(req, normalizedSlug, supabase)
    if (!allowedOrigin) return new NextResponse(null, { status: 403 })
    return new NextResponse(null, { status: 204, headers: corsHeaders(allowedOrigin) })
  } catch (error) {
    console.error('[contact] preflight error:', error)
    return new NextResponse(null, { status: 500 })
  }
}

export async function GET() {
  return json({ error: 'Not found' }, 404)
}
