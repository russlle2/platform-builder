import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import {
  buildDeployFiles,
  sanitizeCustomerValues,
  sanitizeInlineEditMap,
  type InlineTextEdit,
} from '@/lib/site-deploy'
import { sanitizeImageSwapMap, type ImageSwap } from '@/lib/image-swaps'
import { deploySiteFiles } from '@/lib/netlify'
import { requireInternalAdminOrThrow } from '@/lib/server-auth'
import type { CustomTheme } from '@/lib/custom-theme'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface SiteData {
  niche?: string
  template?: string
  colorScheme?: string
  fontVariation?: string
  structureVariation?: string
  customTheme?: CustomTheme | null
  customerValues?: Record<string, string>
  inlineEdits?: Record<string, InlineTextEdit[]>
  imageSwaps?: Record<string, ImageSwap[]>
  imageOwner?: string
  email?: string
  netlify_site_id?: string
  site_url?: string
  plan?: string
  [key: string]: unknown
}

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

const writeLocalSite = async (slug: string, site: unknown) => {
  const dirPath = path.join('/tmp', 'platform-builder-portal-sites')
  await mkdir(dirPath, { recursive: true })
  const filePath = getLocalCacheFilePath(slug)
  await writeFile(filePath, JSON.stringify(site), 'utf-8')
}

export async function GET(req: NextRequest) {
  const authError = requireInternalAdminOrThrow(req)
  if (authError) return authError

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

/**
 * Re-build and re-deploy the customer's live site from its stored
 * configuration. No-op (returns false) when Netlify isn't configured or the
 * site was never provisioned.
 */
async function republishSite(slug: string, data: SiteData): Promise<boolean> {
  const siteId = data.netlify_site_id
  if (!process.env.NETLIFY_ACCESS_TOKEN || !siteId || !data.site_url || !data.niche || !data.template) {
    return false
  }
  const deployFiles = await buildDeployFiles({
    niche: data.niche,
    templateSlug: data.template,
    customerValues: data.customerValues || {},
    colorScheme: data.colorScheme,
    fontVariation: data.fontVariation,
    structureVariation: data.structureVariation,
    customTheme: data.customTheme,
    inlineEdits: data.inlineEdits,
    imageSwaps: data.imageSwaps,
    slug,
    siteUrl: data.site_url,
  })
  if (!deployFiles) return false
  await deploySiteFiles(siteId, deployFiles)
  return true
}

export async function POST(req: NextRequest) {
  const authError = requireInternalAdminOrThrow(req)
  if (authError) return authError

  const body = await req.json()
  const slug = normalizeSlug(body.slug || '')
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  }

  // Incoming edits: a partial customerValues map (canonical {{TOKEN}} keys) and
  // optional inline text edits. We merge them onto the existing stored config
  // so we never clobber niche/template/variation/hosting info.
  const incomingValues = sanitizeCustomerValues(body.customerValues)
  const incomingInlineEdits = body.inlineEdits === undefined
    ? undefined
    : sanitizeInlineEditMap(body.inlineEdits)
  const incomingImageSwaps = body.imageSwaps === undefined
    ? undefined
    : sanitizeImageSwapMap(body.imageSwaps)

  const supabase = getSupabase()

  if (!supabase) {
    const existing = (await readLocalSite(slug)) || {}
    const prevData: SiteData = (existing.data as SiteData) || {}
    const mergedData: SiteData = {
      ...prevData,
      customerValues: { ...(prevData.customerValues || {}), ...incomingValues },
      ...(incomingInlineEdits ? { inlineEdits: incomingInlineEdits } : {}),
      ...(incomingImageSwaps ? { imageSwaps: incomingImageSwaps } : {}),
      imageOwner: slug,
    }
    const sitePayload = {
      slug,
      data: mergedData,
      status: body.status || existing.status || 'active',
      updated_at: new Date().toISOString(),
    }
    await writeLocalSite(slug, sitePayload)
    return NextResponse.json({ ok: true, fallback: 'local-cache', republished: false })
  }

  // Load current config so the merge is non-destructive.
  const { data: existingRow } = await supabase
    .from('portal_sites')
    .select('data, status')
    .eq('slug', slug)
    .maybeSingle()

  const prevData: SiteData = (existingRow?.data as SiteData) || {}
  const mergedData: SiteData = {
    ...prevData,
    customerValues: { ...(prevData.customerValues || {}), ...incomingValues },
    ...(incomingInlineEdits ? { inlineEdits: incomingInlineEdits } : {}),
    ...(incomingImageSwaps ? { imageSwaps: incomingImageSwaps } : {}),
    imageOwner: slug,
  }

  const { error } = await supabase.from('portal_sites').upsert({
    slug,
    data: mergedData,
    status: body.status || existingRow?.status || 'active',
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: 'Unable to save site.' }, { status: 500 })
  }

  // Push the edits live so post-purchase changes actually reach the site.
  let republished = false
  try {
    republished = await republishSite(slug, mergedData)
  } catch (err) {
    console.error('[portal/site] republish failed:', err)
  }

  return NextResponse.json({ ok: true, republished })
}
