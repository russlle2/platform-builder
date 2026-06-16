/**
 * Save draft profile to Supabase for later recovery.
 * Called when user completes preview/business info entry.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

export async function POST(req: NextRequest) {
  if (!rateLimitByIp(req, 'save-draft', 20, 10 * 60 * 1000)) {
    return jsonTooManyRequests()
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      // Silently fail if Supabase is not configured
      return NextResponse.json({ ok: false, message: 'Draft storage not configured' })
    }

    const { email, profile } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      )
    }

    if (!profile || typeof profile !== 'object') {
      return NextResponse.json(
        { error: 'Profile data is required.' },
        { status: 400 }
      )
    }

    // Save/update draft profile linked to email
    const { error } = await supabase.from('draft_profiles').upsert(
      {
        email: email.toLowerCase().trim(),
        profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )

    if (error) {
      console.error('[api/profile/save-draft] database error:', error)
      return NextResponse.json(
        { error: 'Failed to save draft profile.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api/profile/save-draft]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Retrieve draft profile by email for profile recovery.
 */
export async function GET(req: NextRequest) {
  if (!rateLimitByIp(req, 'load-draft', 30, 10 * 60 * 1000)) {
    return jsonTooManyRequests()
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ draft: null })
    }

    const email = req.nextUrl.searchParams.get('email')
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('draft_profiles')
      .select('profile, updated_at')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (error) {
      console.error('[api/profile/save-draft GET] database error:', error)
      return NextResponse.json({ draft: null })
    }

    return NextResponse.json({ draft: data })
  } catch (error) {
    console.error('[api/profile/save-draft GET]', error)
    return NextResponse.json({ draft: null })
  }
}
