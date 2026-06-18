import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_LIMIT_MS = 30_000

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

function asOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(req: NextRequest) {
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

    if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
      return NextResponse.json(
        { error: 'A valid email is required.' },
        { status: 400 },
      )
    }

    const email = emailRaw.toLowerCase()
    const name = asOptionalString(body.name)
    const phone = asOptionalString(body.phone)
    const businessName = asOptionalString(body.businessName)
    const niche = asOptionalString(body.niche)

    const { data: existing, error: lookupError } = await supabase
      .from('intake_contacts')
      .select('updated_at')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) {
      console.error('[api/intake/contact] lookup error:', lookupError)
      return NextResponse.json(
        { error: 'Failed to save intake contact.' },
        { status: 500 },
      )
    }

    if (existing?.updated_at) {
      const lastUpdate = new Date(existing.updated_at).getTime()
      if (Date.now() - lastUpdate < RATE_LIMIT_MS) {
        return NextResponse.json({ ok: true })
      }
    }

    const { error } = await supabase.from('intake_contacts').upsert(
      {
        email,
        name,
        phone,
        business_name: businessName,
        niche,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    )

    if (error) {
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
