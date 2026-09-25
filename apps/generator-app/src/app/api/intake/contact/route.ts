import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsonTooManyRequests, rateLimitByIp } from '@/lib/server-auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface IntakeContactBody {
  email?: unknown
  name?: unknown
  phone?: unknown
  businessName?: unknown
  niche?: unknown
}

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

function asOptionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null
}

export async function POST(req: NextRequest) {
  if (!rateLimitByIp(req, 'intake-contact', 10, 10 * 60 * 1000)) {
    return jsonTooManyRequests()
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Intake storage not configured.' },
        { status: 500 },
      )
    }

    const body = (await req.json()) as IntakeContactBody
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : ''

    if (!emailRaw || emailRaw.length > 320 || !EMAIL_RE.test(emailRaw)) {
      return NextResponse.json(
        { error: 'A valid email is required.' },
        { status: 400 },
      )
    }

    const email = emailRaw.toLowerCase()
    const name = asOptionalString(body.name, 160)
    const phone = asOptionalString(body.phone, 40)
    const businessName = asOptionalString(body.businessName, 200)
    const niche = asOptionalString(body.niche, 80)

    // Anonymous intake is insert-only. A caller who knows an email address can
    // neither inspect nor replace an existing person's contact/profile data.
    const { error } = await supabase.from('intake_contacts').insert({
      email,
      name,
      phone,
      business_name: businessName,
      niche,
      source: 'preview-intake',
      updated_at: new Date().toISOString(),
    })

    if (error) {
      if (error.code === '23505') return NextResponse.json({ ok: true })
      console.error('[api/intake/contact] database error:', error)
      return NextResponse.json(
        { error: 'Failed to save intake contact.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api/intake/contact]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
