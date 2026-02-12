import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MIN_SLUG_LENGTH = 3
const MAX_SLUG_LENGTH = 30
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'billing',
  'blog',
  'dashboard',
  'help',
  'login',
  'portal',
  'pricing',
  'settings',
  'signup',
  'support',
  'www',
])

const normalizeSlug = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const validateSlug = (value: string) => {
  if (!value) {
    return 'Slug is required.'
  }
  if (value.length < MIN_SLUG_LENGTH) {
    return `Slug must be at least ${MIN_SLUG_LENGTH} characters.`
  }
  if (value.length > MAX_SLUG_LENGTH) {
    return `Slug must be ${MAX_SLUG_LENGTH} characters or fewer.`
  }
  if (!/^[a-z0-9-]+$/.test(value)) {
    return 'Use only lowercase letters, numbers, and hyphens.'
  }
  return null
}

export async function POST(req: Request) {
  try {
    const { slug } = await req.json()
    const normalized = normalizeSlug(String(slug || ''))
    const error = validateSlug(normalized)
    if (error) {
      return NextResponse.json({ available: false, reason: error })
    }

    if (RESERVED_SLUGS.has(normalized)) {
      return NextResponse.json({
        available: false,
        reason: 'This slug is reserved. Please choose another.',
      })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        available: false,
        reason: 'Availability check is not configured yet.',
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const { data, error: dbError } = await supabase
      .from('site_slugs')
      .select('slug')
      .eq('slug', normalized)
      .limit(1)
      .maybeSingle()

    if (dbError) {
      return NextResponse.json({
        available: false,
        reason: 'Unable to confirm availability right now.',
      })
    }

    if (data?.slug) {
      return NextResponse.json({
        available: false,
        reason: 'That slug is already taken.',
      })
    }

    return NextResponse.json({ available: true })
  } catch (error) {
    return NextResponse.json(
      { available: false, reason: 'Unable to check availability.' },
      { status: 400 }
    )
  }
}
