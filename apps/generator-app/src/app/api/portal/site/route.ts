import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

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

const getLocalCacheFilePath = (slug: string) => {
  return path.join('/tmp', 'platform-builder-portal-sites', `${slug}.json`)
}

const readLocalSite = async (slug: string) => {
  const filePath = getLocalCacheFilePath(slug)
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const writeLocalSite = async (slug: string, site: any) => {
  const dirPath = path.join('/tmp', 'platform-builder-portal-sites')
  await mkdir(dirPath, { recursive: true })
  const filePath = getLocalCacheFilePath(slug)
  await writeFile(filePath, JSON.stringify(site), 'utf-8')
}

export async function GET(req: NextRequest) {
  const slug = normalizeSlug(req.nextUrl.searchParams.get('slug') || '')
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    const localSite = await readLocalSite(slug)
    return NextResponse.json({ site: localSite })
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
  const body = await req.json()
  const slug = normalizeSlug(body.slug || '')
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  }

  const data = body.data || {}
  const sitePayload = {
    slug,
    data,
    status: body.status || 'draft',
    updated_at: new Date().toISOString(),
  }

  const supabase = getSupabase()
  if (!supabase) {
    await writeLocalSite(slug, sitePayload)
    return NextResponse.json({ ok: true, fallback: 'local-cache' })
  }

  const { error } = await supabase.from('portal_sites').upsert({
    ...sitePayload,
  })

  if (error) {
    return NextResponse.json({ error: 'Unable to save site.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
