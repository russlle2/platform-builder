import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const normalizeSlug = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

export async function GET(req: NextRequest) {
  const slug = normalizeSlug(req.nextUrl.searchParams.get('slug') || '')
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Portal not configured.' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('portal_sites')
    .select('slug, data, status, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Unable to load site.' }, { status: 500 })
  }

  return NextResponse.json({ site: data })
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Portal not configured.' }, { status: 500 })
  }

  const body = await req.json()
  const slug = normalizeSlug(body.slug || '')
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  }

  const data = body.data || {}

  const { error } = await supabase.from('portal_sites').upsert({
    slug,
    data,
    status: body.status || 'draft',
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: 'Unable to save site.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
