import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'
import { normalizeLeadInput, validateLeadContact } from '@/lib/lead-validation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: NextRequest) {
  const allowed = rateLimitByIp(req, 'leads', 10, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

  try {
    const body = await req.json()
    const { email: rawEmail, phone: rawPhone, source } = body
    const { email, phone } = normalizeLeadInput(
      typeof rawEmail === 'string' ? rawEmail : '',
      typeof rawPhone === 'string' ? rawPhone : '',
    )
    const validationError = validateLeadContact(email, phone)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Lead capture not configured.' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const { error } = await supabase.from('lead_captures').insert({
      email,
      phone,
      source: source || 'modal',
    })

    if (error) {
      return NextResponse.json(
        { error: 'Unable to save lead.' },
        { status: 500 }
      )
    }

    // Notify platform owner about the new lead
    const platformOwnerEmail = process.env.PLATFORM_OWNER_EMAIL
    const postmarkConfigured = !!(process.env.POSTMARK_SERVER_TOKEN && process.env.EMAIL_FROM_ADDRESS)

    if (postmarkConfigured && platformOwnerEmail) {
      await sendEmail({
        to: platformOwnerEmail,
        subject: `New lead captured: ${email || phone}`,
        htmlBody: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e293b;">New lead captured</h2>
            <p><strong>Email:</strong> ${email || '—'}</p>
            <p><strong>Phone:</strong> ${phone || '—'}</p>
            <p><strong>Source:</strong> ${source || 'modal'}</p>
            <p style="color: #64748b; font-size: 0.875rem;">Captured at ${new Date().toISOString()}</p>
          </div>
        `,
      }).catch((err) => console.error('[leads] notification failed:', err))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unable to save lead.' },
      { status: 500 }
    )
  }
}
