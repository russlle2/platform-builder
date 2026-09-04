import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'
import { normalizeLeadInput, validateLeadContact } from '@/lib/lead-validation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const ALLOWED_SOURCES = new Set(['modal'])

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character)
}

export async function POST(req: NextRequest) {
  const allowed = rateLimitByIp(req, 'leads', 10, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

  try {
    const body = await req.json()
    const { email: rawEmail, phone: rawPhone, source: rawSource } = body
    const { email, phone } = normalizeLeadInput(
      typeof rawEmail === 'string' ? rawEmail : '',
      typeof rawPhone === 'string' ? rawPhone : '',
    )
    const validationError = validateLeadContact(email, phone)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    const source = typeof rawSource === 'string' && ALLOWED_SOURCES.has(rawSource)
      ? rawSource
      : 'modal'

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
      source,
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
      const safeEmail = escapeHtml(email || '—')
      const safePhone = escapeHtml(phone || '—')
      const safeSource = escapeHtml(source)
      await sendEmail({
        to: platformOwnerEmail,
        subject: `New lead captured: ${(email || phone || 'unknown').replace(/[\r\n]/g, '')}`,
        htmlBody: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e293b;">New lead captured</h2>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Phone:</strong> ${safePhone}</p>
            <p><strong>Source:</strong> ${safeSource}</p>
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
