/**
 * Client-safe helpers for persistent image swaps (original src → uploaded URL).
 */

import { isDraftImageOwner } from './image-owner'

export interface ImageSwap {
  /** Full src URL/path at the moment the user clicked the image in preview. */
  original: string
  /** Permanent URL after upload (Supabase or /uploads/...). */
  updated: string
  /** Relative path inside the template (e.g. assets/hero.jpg) for deploy. */
  originalRelative?: string
}

export type ImageSwapMap = Record<string, ImageSwap[]>

export const IMAGE_SWAPS_KEY = 'pb_image_swaps'
export const IMAGE_OWNER_KEY = 'pb_image_owner'
const SCOPED_IMAGE_SWAPS_KEY = 'pb_image_swaps_by_scope_v1'
const LEGACY_IMAGE_MIGRATION_KEY = 'pb_image_swaps_legacy_migrated_v1'
const MAX_IMAGE_SWAPS_PER_PAGE = 50
const MAX_SCOPES = 50

function safeImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 2 || value.length > 2_048 || /[\0-\x1f"'<>]/.test(value)) {
    return false
  }
  if (/^\/(?!\/)/.test(value)) return !value.includes('..')
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function safeRelativeAsset(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 512 &&
    !value.includes('..') &&
    !value.includes('\\') &&
    !/[\0-\x1f"'<>]/.test(value)
  )
}

/** Validate untrusted persisted/client swaps before they touch template HTML. */
export function sanitizeImageSwapMap(value: unknown): ImageSwapMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: ImageSwapMap = {}
  for (const [page, rawSwaps] of Object.entries(value)) {
    if (!/^[A-Za-z0-9_-]+\.html$/.test(page) || !Array.isArray(rawSwaps)) continue
    const swaps: ImageSwap[] = []
    for (const raw of rawSwaps.slice(0, MAX_IMAGE_SWAPS_PER_PAGE)) {
      if (!raw || typeof raw !== 'object') continue
      const candidate = raw as Partial<ImageSwap>
      if (!safeImageUrl(candidate.updated)) continue
      const original = safeImageUrl(candidate.original) || safeRelativeAsset(candidate.original)
        ? candidate.original!
        : ''
      const originalRelative = safeRelativeAsset(candidate.originalRelative)
        ? candidate.originalRelative
        : undefined
      if (!original && !originalRelative) continue
      swaps.push({ original, updated: candidate.updated, originalRelative })
    }
    if (swaps.length > 0) result[page] = swaps
  }
  return result
}

/** Stable owner id for storage: draft UUID pre-purchase, or site slug when known. */
export function getOrCreateImageOwnerId(siteSlug?: string | null): string {
  if (typeof window === 'undefined') return 'anonymous'
  if (siteSlug?.trim()) {
    const normalized = siteSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
    sessionStorage.setItem(IMAGE_OWNER_KEY, normalized)
    return normalized
  }
  try {
    let id = sessionStorage.getItem(IMAGE_OWNER_KEY)
    // A portal visit stores its live slug here. Never reuse that slug from an
    // unauthenticated pre-purchase editor; issue a fresh draft upload owner.
    if (!isDraftImageOwner(id)) {
      id = `draft-${crypto.randomUUID()}`
      sessionStorage.setItem(IMAGE_OWNER_KEY, id)
    }
    return id
  } catch {
    return `draft-${crypto.randomUUID()}`
  }
}

/** Extract template-relative asset path from a preview iframe img src. */
export function extractRelativeAssetPath(iframeSrc: string): string | undefined {
  if (!iframeSrc) return undefined
  const match = iframeSrc.match(/\/api\/templates\/[^/]+\/[^/]+\/assets\/(.+)$/i)
  if (match) return match[1]
  try {
    const u = new URL(iframeSrc, 'http://local')
    const p = u.pathname
    const idx = p.indexOf('/assets/')
    if (idx >= 0) return p.slice(idx + '/assets/'.length)
  } catch { /* ignore */ }
  return undefined
}

export function mergeImageSwap(
  swaps: ImageSwap[],
  original: string,
  updated: string,
  originalRelative?: string,
): ImageSwap[] {
  const orig = (original || '').trim()
  if (!orig || orig === updated) return swaps
  const next = swaps.map((s) => ({ ...s }))
  const existing = next.find(
    (s) => s.original === orig || (originalRelative && s.originalRelative === originalRelative),
  )
  if (existing) {
    existing.updated = updated
    if (originalRelative) existing.originalRelative = originalRelative
    return next
  }
  next.push({ original: orig, updated, originalRelative })
  return next
}

/** Apply image swaps to preview/deploy HTML. */
export function applyImageSwapsToHtml(html: string, swaps?: ImageSwap[]): string {
  if (!swaps || swaps.length === 0) return html
  let result = html
  const safeSwaps = sanitizeImageSwapMap({ 'index.html': swaps })['index.html'] || []
  for (const swap of safeSwaps) {
    const { original, updated, originalRelative } = swap
    if (!updated) continue
    if (original && original !== updated) {
      result = result.split(original).join(updated)
    }
    if (originalRelative && originalRelative !== updated) {
      result = result.split(`src="${originalRelative}"`).join(`src="${updated}"`)
      result = result.split(`src='${originalRelative}'`).join(`src='${updated}'`)
      result = result.split(`url(${originalRelative})`).join(`url(${updated})`)
    }
  }
  return result
}

function readImageSwapMap(key: string): ImageSwapMap {
  try {
    const raw = sessionStorage.getItem(key)
    return sanitizeImageSwapMap(raw ? JSON.parse(raw) : {})
  } catch {
    return {}
  }
}

function readScopedImageSwapMaps(): Record<string, ImageSwapMap> {
  try {
    const raw = sessionStorage.getItem(SCOPED_IMAGE_SWAPS_KEY)
    const value = raw ? JSON.parse(raw) : {}
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([scope, map]) => [scope, sanitizeImageSwapMap(map)])
        .filter(([, map]) => Object.keys(map as ImageSwapMap).length > 0),
    )
  } catch {
    return {}
  }
}

function writeScopedImageSwapMaps(maps: Record<string, ImageSwapMap>): void {
  const entries = Object.entries(maps).slice(-MAX_SCOPES)
  sessionStorage.setItem(SCOPED_IMAGE_SWAPS_KEY, JSON.stringify(Object.fromEntries(entries)))
}

/** Load one template/site scope and mirror it to the checkout compatibility key. */
export function loadImageSwaps(scope?: string): ImageSwapMap {
  if (typeof window === 'undefined') return {}
  if (!scope) return readImageSwapMap(IMAGE_SWAPS_KEY)
  try {
    const scoped = readScopedImageSwapMaps()
    let map = scoped[scope]
    if (!map && sessionStorage.getItem(LEGACY_IMAGE_MIGRATION_KEY) !== 'true') {
      map = readImageSwapMap(IMAGE_SWAPS_KEY)
      scoped[scope] = map
      sessionStorage.setItem(LEGACY_IMAGE_MIGRATION_KEY, 'true')
      writeScopedImageSwapMaps(scoped)
    }
    const selected = map || {}
    sessionStorage.setItem(IMAGE_SWAPS_KEY, JSON.stringify(selected))
    return selected
  } catch {
    return {}
  }
}

/** Persist one scope and mirror only that selected map for checkout. */
export function saveImageSwaps(map: ImageSwapMap, scope?: string): void {
  if (typeof window === 'undefined') return
  try {
    const safeMap = sanitizeImageSwapMap(map)
    if (scope) {
      const scoped = readScopedImageSwapMaps()
      delete scoped[scope]
      scoped[scope] = safeMap
      writeScopedImageSwapMaps(scoped)
    }
    sessionStorage.setItem(IMAGE_SWAPS_KEY, JSON.stringify(safeMap))
  } catch { /* quota */ }
}

async function resolveAuthorizedImageOwner(owner: string, portalToken?: string): Promise<string> {
  // A provisioned slug can be authorized either by its portal token or the
  // caller's Supabase session. The API remains the source of truth.
  if (owner && !isDraftImageOwner(owner)) return owner

  const res = await fetch('/api/upload/session', { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || typeof data.owner !== 'string') {
    throw new Error(data.error || 'Could not start a secure image upload session.')
  }
  try {
    sessionStorage.setItem(IMAGE_OWNER_KEY, data.owner)
  } catch { /* storage unavailable */ }
  return data.owner
}

function portalHeaders(portalToken?: string): HeadersInit | undefined {
  return portalToken ? { 'x-portal-token': portalToken } : undefined
}

/** Upload file to /api/upload and return the durable public URL. */
export async function uploadCustomerImageFile(
  file: File,
  owner: string,
  portalToken?: string,
): Promise<{ url: string; path: string; owner: string }> {
  const authorizedOwner = await resolveAuthorizedImageOwner(owner, portalToken)
  const formData = new FormData()
  formData.append('file', file)
  formData.append('owner', authorizedOwner)
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: portalHeaders(portalToken),
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Upload failed')
  }
  if (!data.url || data.embedded) {
    throw new Error('Image storage is not configured. Set Supabase credentials for persistent uploads.')
  }
  return {
    url: data.url as string,
    path: (data.path as string) || data.url,
    owner: authorizedOwner,
  }
}

export async function fetchCustomerImageLibrary(owner: string, portalToken?: string): Promise<
  { url: string; path: string; filename: string }[]
> {
  const authorizedOwner = await resolveAuthorizedImageOwner(owner, portalToken)
  const res = await fetch(`/api/upload?owner=${encodeURIComponent(authorizedOwner)}`, {
    headers: portalHeaders(portalToken),
  })
  const data = await res.json()
  if (!res.ok) return []
  return (data.images || []) as { url: string; path: string; filename: string }[]
}

/** Upload, record swap for this page, persist to sessionStorage. */
export async function handlePersistentImageUpload(
  file: File,
  owner: string,
  originalSrc: string,
  page: string,
  currentMap: ImageSwapMap,
  portalToken?: string,
  scope?: string,
): Promise<{ map: ImageSwapMap; url: string }> {
  const { url } = await uploadCustomerImageFile(file, owner, portalToken)
  const rel = extractRelativeAssetPath(originalSrc)
  const pageSwaps = mergeImageSwap(currentMap[page] || [], originalSrc, url, rel)
  const map = { ...currentMap, [page]: pageSwaps }
  saveImageSwaps(map, scope)
  return { map, url }
}
