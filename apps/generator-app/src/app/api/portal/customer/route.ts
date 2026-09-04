/**
 * Customer portal API — slug alone does not grant access to editable site data.
 * GET: public summary without token; full site payload with valid portal token.
 * POST: requires valid portal token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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
import { isAuthenticatedPortalOwnerForSlug } from '@/lib/portal-owner-auth'
import { rateLimitByIp, jsonTooManyRequests, jsonUnauthorized, jsonForbidden } from '@/lib/server-auth'
import {
  getPortalTokenFromRequest,
  toAuthenticatedPortalSite,
  toPublicPortalSite,
  verifyPortalTokenHash,
  type PortalSiteRow,
} from '@/lib/portal-auth'
import { sanitizeCustomTheme, type CustomTheme } from '@/lib/custom-theme'
import type { CatalogRevisionPin } from '@/lib/catalog-revision'
import { getColorScheme, getFontVariation, getStructureVariation } from '@/lib/templates/variations'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface SiteData {
  niche?: string
  template?: string
  colorScheme?: string
  fontVariation?: string
  structureVariation?: string
  customTheme?: CustomTheme | null
  catalogRevision?: CatalogRevisionPin
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
  portal_token_expires_at?: string | null
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

async function isAuthorizedPortalOwner(
  serviceClient: SupabaseClient,
  row: OwnedPortalRow,
  token: string | null,
): Promise<boolean> {
  if (verifyPortalTokenHash(
    token || '',
    row.portal_token_hash,
    row.portal_token_expires_at,
  )) return true
  return isAuthenticatedPortalOwnerForSlug(serviceClient, row.slug)
}

async function republishSite(slug: string, data: SiteData): Promise<boolean> {
  const siteId = data.netlify_site_id
  if (!process.env.NETLIFY_ACCESS_TOKEN || !siteId || !data.site_url || !data.niche || !data.template) return false
  const deployFiles = await buildDeployFiles({
    niche: data.niche,
    templateSlug: data.template,
    customerValues: data.customerValues || {},
    colorScheme: data.colorScheme,
    fontVariation: data.fontVariation,
    structureVariation: data.structureVariation,
    customTheme: data.customTheme,
    catalogRevision: data.catalogRevision,
    inlineEdits: data.inlineEdits,
    imageSwaps: data.imageSwaps,
    slug,
    siteUrl: data.site_url,
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
    const authenticated = verifyPortalTokenHash(
      token || '',
      local.portal_token_hash,
      local.portal_token_expires_at,
    )
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
    .select('slug, data, status, updated_at, portal_token_hash, portal_token_expires_at, owner_id, owner_email')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Unable to load site.' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ site: null, authenticated: false })
  }

  const authenticated = await isAuthorizedPortalOwner(supabase, data as OwnedPortalRow, token)
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

  const incomingValues = sanitizeCustomerValues(body.customerValues)
  const incomingInlineEdits = body.inlineEdits === undefined
    ? undefined
    : sanitizeInlineEditMap(body.inlineEdits)
  const incomingImageSwaps = body.imageSwaps === undefined
    ? undefined
    : sanitizeImageSwapMap(body.imageSwaps)
  const incomingColorScheme = typeof body.colorScheme === 'string'
    ? getColorScheme(body.colorScheme).id
    : undefined
  const incomingFontVariation = typeof body.fontVariation === 'string'
    ? getFontVariation(body.fontVariation).id
    : undefined
  const incomingStructureVariation = typeof body.structureVariation === 'string'
    ? getStructureVariation(body.structureVariation).id
    : undefined
  const incomingCustomTheme = body.customTheme === undefined
    ? undefined
    : body.customTheme === null
      ? null
      : sanitizeCustomTheme(body.customTheme)
  if (body.customTheme !== undefined && body.customTheme !== null && !incomingCustomTheme) {
    return NextResponse.json({ error: 'Custom theme settings are invalid.' }, { status: 400 })
  }

  if (!supabase) {
    const local = await readLocalSite(slug)
    if (!verifyPortalTokenHash(
      token || '',
      local?.portal_token_hash,
      local?.portal_token_expires_at,
    )) {
      return jsonUnauthorized()
    }
    if (local?.status === 'billing_suspended') {
      return NextResponse.json(
        { error: 'Publishing is paused while billing needs attention.', code: 'billing_suspended' },
        { status: 402 },
      )
    }

    const prevData: SiteData = local?.data || {}
    const mergedData: SiteData = {
      ...prevData,
      customerValues: { ...(prevData.customerValues || {}), ...incomingValues },
      ...(incomingInlineEdits ? { inlineEdits: incomingInlineEdits } : {}),
      ...(incomingImageSwaps ? { imageSwaps: incomingImageSwaps } : {}),
      ...(incomingColorScheme ? { colorScheme: incomingColorScheme } : {}),
      ...(incomingFontVariation ? { fontVariation: incomingFontVariation } : {}),
      ...(incomingStructureVariation ? { structureVariation: incomingStructureVariation } : {}),
      ...(incomingCustomTheme !== undefined ? { customTheme: incomingCustomTheme } : {}),
      imageOwner: slug,
    }
    await writeLocalSite(slug, {
      slug,
      data: mergedData,
      // Billing/provisioning status is server-controlled; portal edits cannot
      // promote a suspended or failed site back to active.
      status: local?.status || 'pending',
      updated_at: new Date().toISOString(),
      portal_token_hash: local?.portal_token_hash ?? null,
      portal_token_expires_at: local?.portal_token_expires_at ?? null,
    })
    return NextResponse.json({ ok: true, fallback: 'local-cache', republished: false })
  }

  const { data: existingRow, error: existingError } = await supabase
    .from('portal_sites')
    .select('slug, data, status, updated_at, portal_token_hash, portal_token_expires_at, owner_id, owner_email')
    .eq('slug', slug)
    .maybeSingle()
  if (existingError || !existingRow) {
    return NextResponse.json({ error: 'Unable to load site.' }, { status: 500 })
  }
  const authorized = await isAuthorizedPortalOwner(supabase, existingRow as OwnedPortalRow, token)
  if (!authorized) return jsonForbidden()
  if (existingRow.status === 'billing_suspended') {
    return NextResponse.json(
      { error: 'Publishing is paused while billing needs attention.', code: 'billing_suspended' },
      { status: 402 },
    )
  }

  const dataPatch: Partial<SiteData> = {
    ...(incomingInlineEdits ? { inlineEdits: incomingInlineEdits } : {}),
    ...(incomingImageSwaps ? { imageSwaps: incomingImageSwaps } : {}),
    ...(incomingColorScheme ? { colorScheme: incomingColorScheme } : {}),
    ...(incomingFontVariation ? { fontVariation: incomingFontVariation } : {}),
    ...(incomingStructureVariation ? { structureVariation: incomingStructureVariation } : {}),
    ...(incomingCustomTheme !== undefined ? { customTheme: incomingCustomTheme } : {}),
    imageOwner: slug,
  }

  const { data: mergedResult, error } = await supabase.rpc('merge_portal_site_data', {
    p_slug: slug,
    p_customer_values: incomingValues,
    p_data_patch: dataPatch,
  })

  if (error || !mergedResult || typeof mergedResult !== 'object' || Array.isArray(mergedResult)) {
    return NextResponse.json({ error: 'Unable to save site.' }, { status: 500 })
  }
  const mergedData = mergedResult as SiteData

  let republished = false
  let publishError: string | null = null
  try {
    republished = await republishSite(slug, mergedData)
  } catch (err) {
    console.error('[portal/customer] republish failed:', err)
    publishError = err instanceof Error ? err.message : 'Publish failed'
  }

  if (mergedData.netlify_site_id && !republished) {
    return NextResponse.json(
      {
        error: 'Your changes were saved, but the live publish failed. Please retry.',
        saved: true,
        republished: false,
        code: 'publish_failed',
        ...(process.env.NODE_ENV === 'development' && publishError ? { detail: publishError } : {}),
      },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, republished })
}

interface OwnedPortalRow extends PortalSiteRow {
  owner_id?: string | null
  owner_email?: string | null
}
