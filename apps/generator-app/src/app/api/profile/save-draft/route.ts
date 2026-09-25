/**
 * Save draft profile to Supabase for later recovery.
 * Called when user completes preview/business info entry.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'
import {
  createDraftProfileSession,
  DRAFT_PROFILE_COOKIE,
  verifyDraftProfileSession,
} from '@/lib/draft-profile-auth'

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
      return NextResponse.json({ error: 'Draft storage is not configured.' }, { status: 503 })
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

    const normalizedEmail = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 320) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }
    const serialized = JSON.stringify(profile)
    if (serialized.length > 100_000) {
      return NextResponse.json({ error: 'Profile data is too large.' }, { status: 413 })
    }

    const sessionDraftId = verifyDraftProfileSession(
      req.cookies.get(DRAFT_PROFILE_COOKIE)?.value,
    )
    // Mint the credential before mutating storage. If signing is unavailable,
    // no orphaned draft row is created that the browser can never recover.
    const draftId = sessionDraftId || crypto.randomUUID()
    const session = createDraftProfileSession(draftId)
    if (!session) {
      return NextResponse.json({ error: 'Secure draft storage is not configured.' }, { status: 503 })
    }
    const payload = {
      draft_id: draftId,
      email: normalizedEmail,
      profile,
      updated_at: new Date().toISOString(),
    }

    // Draft ownership is an opaque browser-bound ID, not an email address.
    // Multiple visitors can submit the same email without blocking or replacing
    // one another; only the browser holding this signed ID can update its row.
    const query = supabase
      .from('draft_profiles')
      .upsert(payload, { onConflict: 'draft_id' })
    const { error } = await query

    if (error) {
      console.error('[api/profile/save-draft] database error:', error)
      return NextResponse.json(
        { error: 'Failed to save draft profile.' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(DRAFT_PROFILE_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
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

    const draftId = verifyDraftProfileSession(req.cookies.get(DRAFT_PROFILE_COOKIE)?.value)
    if (!draftId) return NextResponse.json({ error: 'Draft access is required.' }, { status: 401 })

    const { data, error } = await supabase
      .from('draft_profiles')
      .select('profile, updated_at')
      .eq('draft_id', draftId)
      .maybeSingle()

    if (error) {
      console.error('[api/profile/save-draft GET] database error:', error)
      return NextResponse.json({ draft: null })
    }

    const response = NextResponse.json({ draft: data })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('[api/profile/save-draft GET]', error)
    return NextResponse.json({ draft: null })
  }
}
