/**
 * Customer portal API — slug alone does not grant access to editable site data.
 * GET: public summary without token; full site payload with valid portal token.
 * POST: requires valid portal token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { buildDeployFiles, type InlineTextEdit } from '@/lib/site-deploy'
import type { ImageSwap } from '@/lib/image-swaps'
import { deploySiteFiles } from '@/lib/netlify'
import { rateLimitByIp, jsonTooManyRequests, jsonUnauthorized, jsonForbidden } from '@/lib/server-auth'
import {
  getPortalTokenFromRequest,
  toAuthenticatedPortalSite,
  toPublicPortalSite,
  validatePortalTokenForSlug,
  verifyPortalTokenHash,
  type PortalSiteRow,
} from '@/lib/portal-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface SiteData {
  niche?: string
  template?: string
  colorScheme?: string
  fontVariation?: string
  structureVariation?: string
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

interface LocalPortalCache {
  slug: string
  data: SiteData
  status?: string
  updated_at?: string
  portal_token_hash?: string | null
}

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
}

const localCachePath = (slug: string) =>
  path.join('/tmp', 'platform-builder-portal-sites', `${slug}.json`)

const readLocalSite = async (slug: string): Promise<LocalPortalCache | null> => {
  const fp = localCachePath(slug)
  if (!existsSync(fp)) return null
  try {
    return JSON.parse(await readFile(fp, 'utf-8')) as LocalPortalCache
  } catch {
    return null
  }
}

const writeLocalSite = async (slug: string, site: LocalPortalCache) => {
  const dir = path.join('/tmp', 'platform-builder-portal-sites')
  await mkdir(dir, { recursive: true })
  await writeFile(localCachePath(slug), JSON.stringify(site), 'utf-8')
}

async function republishSite(slug: string, data: SiteData): Promise<boolean> {
  const siteId = data.netlify_site_id
  if (!process.env.NETLIFY_ACCESS_TOKEN || !siteId || !data.niche || !data.template) return false
  const deployFiles = await buildDeployFiles({
    niche: data.niche,
    templateSlug: data.template,
    customerValues: data.customerValues || {},
    colorScheme: data.colorScheme,
    fontVariation: data.fontVariation,
    structureVariation: data.structureVariation,
    inlineEdits: data.inlineEdits,
    imageSwaps: data.imageSwaps,
    slug,
  })
  if (!deployFiles) return false
  await deploySiteFiles(siteId, deployFiles)
  return true
}

export async function GET(req: NextRequest) {
  if (!rateLimitByIp(req, 'portal-customer-get', 30, 10 * 60 * 1000)) {
    return jsonTooManyRequests()
  }

  const slug = normalizeSlug(req.nextUrl.searchParams.get('slug') || '')
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  }

  const token = getPortalTokenFromRequest(req)
  const supabase = getSupabase()

  if (!supabase) {
    const local = await readLocalSite(slug)
    if (!local) {
      return NextResponse.json({ site: null, authenticated: false })
    }
    const authenticated = verifyPortalTokenHash(token || '', local.portal_token_hash)
    if (!authenticated) {
      return NextResponse.json({
        site: toPublicPortalSite(local as PortalSiteRow),
        authenticated: false,
      })
    }
    return NextResponse.json({
      site: toAuthenticatedPortalSite(local as PortalSiteRow),
      authenticated: true,
    })
  }

  const { data, error } = await supabase
    .from('portal_sites')
    .select('slug, data, status, updated_at, portal_token_hash')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Unable to load site.' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ site: null, authenticated: false })
  }

  const authenticated = await validatePortalTokenForSlug(supabase, slug, token)
  if (!authenticated) {
    return NextResponse.json({
      site: toPublicPortalSite(data as PortalSiteRow),
      authenticated: false,
    })
  }

  return NextResponse.json({
    site: toAuthenticatedPortalSite(data as PortalSiteRow),
    authenticated: true,
  })
}

export async function POST(req: NextRequest) {
  if (!rateLimitByIp(req, 'portal-customer-post', 10, 10 * 60 * 1000)) {
    return jsonTooManyRequests()
  }

  const body = await req.json()
  const slug = normalizeSlug(body.slug || '')
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
  }

  const token = getPortalTokenFromRequest(req, body)
  const supabase = getSupabase()

  const incomingValues: Record<string, string> =
    body.customerValues && typeof body.customerValues === 'object' ? body.customerValues : {}
  const incomingInlineEdits: Record<string, InlineTextEdit[]> | undefined =
    body.inlineEdits && typeof body.inlineEdits === 'object' ? body.inlineEdits : undefined
  const incomingImageSwaps: Record<string, ImageSwap[]> | undefined =
    body.imageSwaps && typeof body.imageSwaps === 'object' ? body.imageSwaps : undefined

  if (!supabase) {
    const local = await readLocalSite(slug)
    if (!verifyPortalTokenHash(token || '', local?.portal_token_hash)) {
      return jsonUnauthorized()
    }

    const prevData: SiteData = local?.data || {}
    const mergedData: SiteData = {
      ...prevData,
      customerValues: { ...(prevData.customerValues || {}), ...incomingValues },
      ...(incomingInlineEdits ? { inlineEdits: incomingInlineEdits } : {}),
      ...(incomingImageSwaps ? { imageSwaps: incomingImageSwaps } : {}),
      imageOwner: slug,
    }
    await writeLocalSite(slug, {
      slug,
      data: mergedData,
      status: body.status || local?.status || 'active',
      updated_at: new Date().toISOString(),
      portal_token_hash: local?.portal_token_hash ?? null,
    })
    return NextResponse.json({ ok: true, fallback: 'local-cache', republished: false })
  }

  const authorized = await validatePortalTokenForSlug(supabase, slug, token)
  if (!authorized) {
    return jsonForbidden()
  }

  const { data: existingRow } = await supabase
    .from('portal_sites')
    .select('data, status, portal_token_hash')
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
    portal_token_hash: existingRow?.portal_token_hash,
  })

  if (error) {
    return NextResponse.json({ error: 'Unable to save site.' }, { status: 500 })
  }

  let republished = false
  try {
    republished = await republishSite(slug, mergedData)
  } catch (err) {
    console.error('[portal/customer] republish failed:', err)
  }

  return NextResponse.json({ ok: true, republished })
}
