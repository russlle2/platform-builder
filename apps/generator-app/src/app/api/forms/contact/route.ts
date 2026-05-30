import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendContactNotification, sendContactConfirmation } from '@/lib/email'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * POST /api/forms/contact
 *
 * Handles contact-form submissions from generated client sites.
 *
 * Body: { slug, name, email, phone?, message }
 *
 * 1. Stores the message in Supabase `contact_messages` table.
 * 2. Looks up the site owner's email from `portal_sites.data.email`.
 * 3. Sends the owner a notification email via Postmark.
 * 4. Sends the visitor a confirmation email.
 */
export async function POST(req: NextRequest) {
  const allowed = rateLimitByIp(req, 'contact', 5, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

  try {
    const body = await req.json()
    const { slug, name, email, phone, message } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      )
    }

    // Normalise slug
    const normalizedSlug = (slug || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')

    let ownerEmail: string | null = null
    let siteName = 'Your business'

    // ---- Persist to Supabase ----
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })

      // Store the contact message
      await supabase.from('contact_messages').insert({
        slug: normalizedSlug || null,
        visitor_name: name,
        visitor_email: email,
        visitor_phone: phone || null,
        message,
      })

      // Look up business owner email for notification
      if (normalizedSlug) {
        const { data: site } = await supabase
          .from('portal_sites')
          .select('data')
          .eq('slug', normalizedSlug)
          .maybeSingle()

        if (site?.data) {
          ownerEmail = site.data.email || null
          siteName = site.data.businessName || siteName
        }
      }
    }

    // ---- Email notifications via Postmark ----
    const postmarkConfigured = !!(process.env.POSTMARK_SERVER_TOKEN && process.env.EMAIL_FROM_ADDRESS)

    if (postmarkConfigured && ownerEmail) {
      // Notify the business owner
      await sendContactNotification({
        ownerEmail,
        visitorName: name,
        visitorEmail: email,
        visitorPhone: phone,
        message,
        siteName,
      }).catch((err) => console.error('[contact] owner notification failed:', err))

      // Confirm receipt to the visitor
      await sendContactConfirmation({
        visitorEmail: email,
        visitorName: name,
        siteName,
      }).catch((err) => console.error('[contact] visitor confirmation failed:', err))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[contact] handler error:', error)
    return NextResponse.json(
      { error: 'Unable to process your message.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
