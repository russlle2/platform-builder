import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'
import { normalizeSiteSlug, validateSiteSlug } from '@/lib/site-slug'

export async function POST(req: NextRequest) {
  const allowed = rateLimitByIp(req, 'slug-check', 60, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

  try {
    const { slug } = await req.json()
    const normalized = normalizeSiteSlug(String(slug || ''))
    const error = validateSiteSlug(normalized)
    if (error) {
      return NextResponse.json({ available: false, reason: error })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        available: false,
        reason: 'Availability checks are temporarily unavailable.',
      }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })

    const { data: slugData, error: slugError } = await supabase
      .from('site_slugs')
      .select('slug')
      .eq('slug', normalized)
      .limit(1)
      .maybeSingle()

    if (slugData?.slug) {
      return NextResponse.json({
        available: false,
        reason: 'That slug is already taken.',
      })
    }

    const { data: portalData, error: portalError } = await supabase
      .from('portal_sites')
      .select('slug')
      .eq('slug', normalized)
      .limit(1)
      .maybeSingle()

    if (portalData?.slug) {
      return NextResponse.json({
        available: false,
        reason: 'That slug is already taken.',
      })
    }

    if (slugError || portalError) {
      return NextResponse.json({
        available: false,
        reason: 'Unable to confirm availability. Please try again.',
      }, { status: 503 })
    }

    return NextResponse.json({ available: true })
  } catch (error) {
    return NextResponse.json(
      { available: false, reason: 'Unable to check availability.' },
      { status: 400 }
    )
  }
}
