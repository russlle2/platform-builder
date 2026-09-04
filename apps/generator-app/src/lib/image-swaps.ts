/** Client-safe helpers for persistent, independently targeted image slots. */

import { isDraftImageOwner } from './image-owner'
import { isSafePreviewPage } from './template-preview-security'

export interface ImageSwap {
  /** Stable v3 ID stored in `data-dc-image-id`. */
  slotId?: string
  /** Transitional v2 identifier. Accepted on input, normalized to `slotId`. */
  id?: string
  /** Full src URL/path at click time (v2/degraded fallback). */
  original?: string
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
const MAX_COORDINATED_IMAGE_SLOTS = 32
const MAX_SCOPES = 50
const MAX_IMAGE_SOURCE_LENGTH = 4_096
const MAX_NETLIFY_PROXY_UNWRAPS = 2
const NETLIFY_IMAGE_PROXY_PATH = '/.netlify/images'
const SAFE_IMAGE_SLOT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const PROTECTED_BLOCK_RE = /<!--[\s\S]*?-->|<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi
const OPEN_TAG_RE = /<([A-Za-z][A-Za-z0-9:-]*)\b([^>]*)>/gi
const READ_DC_IMAGE_ID_RE = /\bdata-dc-image-id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
const READ_PB_IMAGE_ID_RE = /\bdata-pb-image-id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
const EXISTING_DC_IMAGE_ID_RE = /\sdata-dc-image-id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const EXISTING_PB_IMAGE_ID_RE = /\sdata-pb-image-id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const COMPILER_V3_IMAGE_ID_RE = /\bdata-dc-image-id\s*=\s*(?:"(?:img|css)_[a-f0-9]{18}"|'(?:img|css)_[a-f0-9]{18}'|(?:img|css)_[a-f0-9]{18}(?=\s|>))/i

function safeImageUrl(value: unknown): value is string {
  // Persisted swaps are eventually interpolated into both quoted HTML
  // attributes and unquoted CSS url(...) values. Keep the accepted wire
  // format deliberately narrower than URL itself so a closing parenthesis,
  // CSS escape, or whitespace cannot escape the image value in a v2
  // fallback. HTML entities are escaped separately at the write boundary.
  if (typeof value !== 'string' || value.length < 2 || value.length > 2_048 || /[\s"'<>\\()]/.test(value)) {
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

export interface ImageSwapApplicationResult {
  html: string
  /** Stable v3 targets that were no longer present in the annotated page. */
  unmatchedSlotIds: string[]
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;')
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

export function isSafeImageSlotId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_IMAGE_SLOT_ID_RE.test(value)
}

/** Validate the exact set of stable slots belonging to one customer-selected picture. */
export function normalizeCoordinatedImageSlotIds(
  primarySlotId: unknown,
  value: unknown,
): string[] | null {
  if (!isSafeImageSlotId(primarySlotId) || !Array.isArray(value)) return null
  if (value.length === 0 || value.length > MAX_COORDINATED_IMAGE_SLOTS) return null
  const ids: string[] = []
  const seen = new Set<string>()
  for (const candidate of value) {
    if (!isSafeImageSlotId(candidate) || seen.has(candidate)) return null
    seen.add(candidate)
    ids.push(candidate)
  }
  if (!seen.has(primarySlotId)) return null
  return [primarySlotId, ...ids.filter((id) => id !== primarySlotId)]
}

function imageSlotId(swap: Pick<ImageSwap, 'slotId' | 'id'>): string | undefined {
  // v3 identity is authoritative whenever present. Never allow a malformed
  // slotId to fall through to a transitional ID or broad URL replacement.
  if (swap.slotId !== undefined) {
    return isSafeImageSlotId(swap.slotId) ? swap.slotId : undefined
  }
  return isSafeImageSlotId(swap.id) ? swap.id : undefined
}

function safePagePart(page: string): string {
  return page
    .replace(/\.html$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/[._]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'index'
}

function readImageId(rawAttrs: string): string | undefined {
  const dc = READ_DC_IMAGE_ID_RE.exec(rawAttrs)
  const legacy = READ_PB_IMAGE_ID_RE.exec(rawAttrs)
  const value = dc?.[1] || dc?.[2] || dc?.[3] || legacy?.[1] || legacy?.[2] || legacy?.[3]
  return isSafeImageSlotId(value) ? value : undefined
}

function annotateImageSegment(
  segment: string,
  nextId: (existingId?: string) => string,
): string {
  OPEN_TAG_RE.lastIndex = 0
  return segment.replace(OPEN_TAG_RE, (full, tag: string, rawAttrs: string) => {
    const existingId = readImageId(rawAttrs)
    const element = tag.toLowerCase()
    const isImage = element === 'img' || (element === 'source' && /\s(?:src|srcset)\s*=/i.test(rawAttrs))
    const hasInlineBackground = /\bstyle\s*=\s*(?:"[^"]*\bbackground(?:-image)?\s*:[^"]*url\s*\(|'[^']*\bbackground(?:-image)?\s*:[^']*url\s*\()/i.test(rawAttrs)
    if (!existingId && !isImage && !hasInlineBackground) return full

    const selfClosing = /\/\s*$/.test(rawAttrs)
    const attrs = rawAttrs
      .replace(EXISTING_DC_IMAGE_ID_RE, '')
      .replace(EXISTING_PB_IMAGE_ID_RE, '')
      .replace(/\s*\/\s*$/, '')
    return `<${tag}${attrs} data-dc-image-id="${nextId(existingId)}"${selfClosing ? ' /' : ''}>`
  })
}

/**
 * Give each image/background its own deterministic slot. Existing v3 IDs are
 * preserved and legacy `data-pb-image-id` attributes are canonicalized.
 */
export function annotateImageSlots(html: string, page = 'index.html'): string {
  // Compiler-v3 owns its complete, audited image-slot manifest. Do not mint
  // client-only slots or silently repair duplicate compiler identities.
  if (COMPILER_V3_IMAGE_ID_RE.test(html)) return html

  const prefix = `dc-image-${safePagePart(page)}`
  let ordinal = 0
  const usedIds = new Set<string>()
  const nextId = (existingId?: string) => {
    ordinal += 1
    if (existingId && !usedIds.has(existingId)) {
      usedIds.add(existingId)
      return existingId
    }
    let candidate = `${prefix}-${String(ordinal).padStart(4, '0')}`
    while (usedIds.has(candidate)) {
      ordinal += 1
      candidate = `${prefix}-${String(ordinal).padStart(4, '0')}`
    }
    usedIds.add(candidate)
    return candidate
  }
  let cursor = 0
  let result = ''

  PROTECTED_BLOCK_RE.lastIndex = 0
  let protectedMatch: RegExpExecArray | null
  while ((protectedMatch = PROTECTED_BLOCK_RE.exec(html)) !== null) {
    result += annotateImageSegment(html.slice(cursor, protectedMatch.index), nextId)
    result += protectedMatch[0]
    cursor = protectedMatch.index + protectedMatch[0].length
  }
  result += annotateImageSegment(html.slice(cursor), nextId)
  return result
}

/** Validate untrusted persisted/client swaps before they touch template HTML. */
export function sanitizeImageSwapMap(value: unknown): ImageSwapMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: ImageSwapMap = {}
  for (const [page, rawSwaps] of Object.entries(value)) {
    if (!isSafePreviewPage(page) || !Array.isArray(rawSwaps)) continue
    const swaps: ImageSwap[] = []
    for (const raw of rawSwaps.slice(0, MAX_IMAGE_SWAPS_PER_PAGE)) {
      if (!raw || typeof raw !== 'object') continue
      const candidate = raw as Partial<ImageSwap>
      if (!safeImageUrl(candidate.updated)) continue
      const original = safeImageUrl(candidate.original) || safeRelativeAsset(candidate.original)
        ? candidate.original!
        : undefined
      const originalRelative = safeRelativeAsset(candidate.originalRelative)
        ? candidate.originalRelative
        : undefined
      // A malformed v3 slot must not degrade into broad v2 URL replacement.
      if (candidate.slotId !== undefined && !isSafeImageSlotId(candidate.slotId)) continue
      if (
        candidate.slotId === undefined &&
        candidate.id !== undefined &&
        !isSafeImageSlotId(candidate.id)
      ) continue
      const slotId = imageSlotId(candidate)
      if (!slotId && !original && !originalRelative) continue
      swaps.push({
        ...(slotId ? { slotId } : {}),
        ...(original ? { original } : {}),
        updated: candidate.updated,
        ...(originalRelative ? { originalRelative } : {}),
      })
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

function decodedAssetPath(pathname: string): string | undefined {
  const idx = pathname.toLowerCase().indexOf('/assets/')
  if (idx < 0) return undefined

  const encoded = pathname.slice(idx + '/assets/'.length)
  let decoded = encoded
  try {
    // URL.pathname retains percent escapes. Decode the source path so it still
    // matches the original template attribute during deployment.
    decoded = decodeURIComponent(encoded)

    // Validate a few additional decoding layers without returning them. This
    // rejects encoded traversal/backslash tricks while preserving ordinary
    // percent characters in a real filename after the first URL decode.
    let safetyValue = decoded
    for (let pass = 0; pass < 2; pass += 1) {
      let next: string
      try {
        next = decodeURIComponent(safetyValue)
      } catch {
        break
      }
      if (next === safetyValue) break
      safetyValue = next
    }
    if (!safeRelativeAsset(safetyValue)) return undefined
  } catch {
    return undefined
  }
  return safeRelativeAsset(decoded) ? decoded : undefined
}

function isNetlifyImageProxySource(value: string): boolean {
  if (!value || value.length > MAX_IMAGE_SOURCE_LENGTH) return false
  try {
    const url = new URL(value.replace(/&amp;/gi, '&'), 'http://local')
    return url.pathname.replace(/\/+$/, '').toLowerCase() === NETLIFY_IMAGE_PROXY_PATH
  } catch {
    return false
  }
}

/** Extract template-relative asset path from a preview iframe img src. */
export function extractRelativeAssetPath(iframeSrc: string): string | undefined {
  if (typeof iframeSrc !== 'string') return undefined
  let candidate = iframeSrc.trim()
  if (!candidate || candidate.length > MAX_IMAGE_SOURCE_LENGTH) return undefined

  for (let unwraps = 0; unwraps <= MAX_NETLIFY_PROXY_UNWRAPS; unwraps += 1) {
    try {
      const url = new URL(candidate.replace(/&amp;/gi, '&'), 'http://local')
      const normalizedPath = url.pathname.replace(/\/+$/, '').toLowerCase()
      if (normalizedPath === NETLIFY_IMAGE_PROXY_PATH) {
        if (unwraps === MAX_NETLIFY_PROXY_UNWRAPS) return undefined
        const proxiedSource = url.searchParams.get('url')?.trim()
        if (
          !proxiedSource ||
          proxiedSource === candidate ||
          proxiedSource.length > MAX_IMAGE_SOURCE_LENGTH
        ) return undefined
        candidate = proxiedSource
        continue
      }
      return decodedAssetPath(url.pathname)
    } catch {
      return undefined
    }
  }
  return undefined
}

function replaceLegacyProxiedImageSources(
  html: string,
  originalRelative: string,
  safeUpdated: string,
): string {
  return html.replace(/<(?:img|source)\b[^>]*>/gi, (tag) => tag.replace(
    /(\ssrc\s*=\s*)(["'])([^"']*)\2/gi,
    (attribute, prefix: string, quote: string, source: string) => (
      isNetlifyImageProxySource(source) && extractRelativeAssetPath(source) === originalRelative
        ? `${prefix}${quote}${safeUpdated}${quote}`
        : attribute
    ),
  ))
}

function replaceLegacyImageReferences(
  html: string,
  original: string,
  safeUpdated: string,
): string {
  const transformSegment = (segment: string) => {
    OPEN_TAG_RE.lastIndex = 0
    return segment.replace(OPEN_TAG_RE, (tag, rawName: string) => {
      const name = rawName.toLowerCase()
      let replacement = tag
      if (name === 'img' || name === 'source') {
        replacement = replacement.replace(
          /(\s)src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
          (attribute, leading: string, doubleQuoted: string, singleQuoted: string, bare: string) => {
            const value = doubleQuoted ?? singleQuoted ?? bare ?? ''
            if (value.replace(/&amp;/gi, '&') !== original.replace(/&amp;/gi, '&')) return attribute
            const quote = doubleQuoted !== undefined ? '"' : singleQuoted !== undefined ? "'" : '"'
            return `${leading}src=${quote}${safeUpdated}${quote}`
          },
        )
      }
      return replacement.replace(
        /(\sstyle\s*=\s*)(["'])([\s\S]*?)\2/i,
        (attribute, prefix: string, quote: string, style: string) => {
          const nextStyle = style.replace(
            /url\(\s*(?:(["']|&quot;|&#(?:39|x27);)(.*?)\1|([^)'"\s][^)]*?))\s*\)/gi,
            (url, urlQuote: string | undefined, quoted: string | undefined, bare: string | undefined) => {
              const value = (quoted ?? bare ?? '').trim().replace(/&amp;/gi, '&')
              if (value !== original.replace(/&amp;/gi, '&')) return url
              const outputQuote = urlQuote || ''
              return `url(${outputQuote}${safeUpdated}${outputQuote})`
            },
          )
          return nextStyle === style ? attribute : `${prefix}${quote}${nextStyle}${quote}`
        },
      )
    })
  }

  let cursor = 0
  let result = ''
  PROTECTED_BLOCK_RE.lastIndex = 0
  let protectedMatch: RegExpExecArray | null
  while ((protectedMatch = PROTECTED_BLOCK_RE.exec(html)) !== null) {
    result += transformSegment(html.slice(cursor, protectedMatch.index))
    result += protectedMatch[0]
    cursor = protectedMatch.index + protectedMatch[0].length
  }
  return result + transformSegment(html.slice(cursor))
}

export function mergeImageSwap(
  swaps: ImageSwap[],
  original: string,
  updated: string,
  originalRelative?: string,
  slotId?: string,
): ImageSwap[] {
  const orig = (original || '').trim()
  if (slotId !== undefined && slotId !== '' && !isSafeImageSlotId(slotId)) return swaps
  const safeSlotId = isSafeImageSlotId(slotId) ? slotId : undefined
  if ((!orig && !safeSlotId) || orig === updated) return swaps
  const next = swaps.map((s) => ({ ...s }))
  const existing = safeSlotId
    ? next.find((s) => imageSlotId(s) === safeSlotId) || next.find((s) => (
      !imageSlotId(s) && (
        s.original === orig ||
        s.updated === orig ||
        (originalRelative && s.originalRelative === originalRelative)
      )
    ))
    : next.find((s) => (
      s.original === orig || (originalRelative && s.originalRelative === originalRelative)
    ))
  if (existing) {
    existing.updated = updated
    if (safeSlotId) existing.slotId = safeSlotId
    delete existing.id
    if (orig && !existing.original) existing.original = orig
    if (originalRelative) existing.originalRelative = originalRelative
    return next
  }
  next.push({
    ...(safeSlotId ? { slotId: safeSlotId } : {}),
    ...(orig ? { original: orig } : {}),
    updated,
    ...(originalRelative ? { originalRelative } : {}),
  })
  return next
}

/**
 * Persist one responsive picture action as independent stable-ID swaps.
 * Validation is all-or-nothing so a malformed group cannot degrade to a
 * partial fallback image update.
 */
export function mergeCoordinatedImageSwaps(
  swaps: ImageSwap[],
  original: string,
  updated: string,
  originalRelative: string | undefined,
  primarySlotId: unknown,
  slotIds: unknown,
): ImageSwap[] {
  const coordinated = normalizeCoordinatedImageSlotIds(primarySlotId, slotIds)
  if (!coordinated) return swaps
  let next = swaps
  for (const slotId of coordinated) {
    const primary = slotId === primarySlotId
    next = mergeImageSwap(
      next,
      primary ? original : '',
      updated,
      primary ? originalRelative : undefined,
      slotId,
    )
  }
  return next.length <= MAX_IMAGE_SWAPS_PER_PAGE ? next : swaps
}

function replaceImageSlot(
  html: string,
  slotId: string,
  updated: string,
): { html: string; replaced: boolean } {
  if (!isSafeImageSlotId(slotId)) return { html, replaced: false }
  const escapedId = slotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const openingTag = new RegExp(
    `<([A-Za-z][A-Za-z0-9:-]*)\\b[^>]*\\bdata-(?:dc|pb)-image-id\\s*=\\s*(["'])${escapedId}\\2[^>]*>`,
    'gi',
  )
  const matches = [...html.matchAll(openingTag)]
  // Stable slot IDs must identify exactly one element. Duplicate identities
  // are ambiguous and therefore fail closed.
  if (matches.length !== 1) return { html, replaced: false }
  const match = matches[0]

  let replacement = match[0]
  const safeUpdated = escapeHtmlAttribute(updated)
  const element = match[1].toLowerCase()
  if (element === 'img') {
    replacement = replacement.replace(/\s+srcset\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    if (/\ssrc\s*=/i.test(replacement)) {
      replacement = replacement.replace(
        /(\s)src\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
        `$1src="${safeUpdated}"`,
      )
    } else {
      replacement = replacement.replace(/\s*\/?\s*>$/, ` src="${safeUpdated}">`)
    }
  } else if (element === 'source') {
    if (/\ssrcset\s*=/i.test(replacement)) {
      replacement = replacement.replace(
        /(\s)srcset\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
        `$1srcset="${safeUpdated}"`,
      )
    } else if (/\ssrc\s*=/i.test(replacement)) {
      replacement = replacement.replace(
        /(\s)src\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
        `$1src="${safeUpdated}"`,
      )
    } else {
      replacement = replacement.replace(/\s*\/?\s*>$/, ` srcset="${safeUpdated}">`)
    }
  } else if (/\bstyle\s*=/i.test(replacement)) {
    replacement = replacement.replace(
      /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
      (_style, doubleQuoted: string | undefined, singleQuoted: string | undefined) => (
        `style="${doubleQuoted || singleQuoted || ''};background-image:url(${safeUpdated})!important"`
      ),
    )
  } else {
    replacement = replacement.replace(/\s*\/?\s*>$/, ` style="background-image:url(${safeUpdated})!important">`)
  }

  return {
    html: html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length),
    replaced: true,
  }
}

/** Apply image swaps to preview/deploy HTML, targeting v3 slot IDs first. */
export function applyImageSwapsToHtmlWithReport(
  html: string,
  swaps?: ImageSwap[],
  page = 'index.html',
): ImageSwapApplicationResult {
  let result = annotateImageSlots(html, page)
  if (!swaps || swaps.length === 0) return { html: result, unmatchedSlotIds: [] }
  const safeSwaps = sanitizeImageSwapMap({ 'index.html': swaps })['index.html'] || []
  const unmatchedSlotIds = new Set<string>()
  for (const swap of safeSwaps) {
    const { original, updated, originalRelative } = swap
    if (!updated) continue
    const slotId = imageSlotId(swap)
    if (slotId) {
      const targeted = replaceImageSlot(result, slotId, updated)
      result = targeted.html
      if (targeted.replaced) continue
      unmatchedSlotIds.add(slotId)
      // v3 slot identity is authoritative; never turn a stale targeted edit
      // into a global replacement of every duplicate image URL.
      continue
    }
    if (original && original !== updated) {
      result = replaceLegacyImageReferences(result, original, escapeHtmlAttribute(updated))
    }
    // Old v2 drafts created after preview image proxying was introduced may
    // have stored only the absolute `currentSrc` proxy URL. Recover its source
    // path at application time so those drafts work in both preview (proxied)
    // and deployment (original template-relative) HTML.
    const fallbackRelative = originalRelative || (
      original && isNetlifyImageProxySource(original)
        ? extractRelativeAssetPath(original)
        : undefined
    )
    if (fallbackRelative && fallbackRelative !== updated) {
      const safeUpdated = escapeHtmlAttribute(updated)
      result = replaceLegacyProxiedImageSources(result, fallbackRelative, safeUpdated)
      result = replaceLegacyImageReferences(result, fallbackRelative, safeUpdated)
    }
  }
  return { html: result, unmatchedSlotIds: [...unmatchedSlotIds] }
}

/** Apply swaps for preview callers that do not need the diagnostic report. */
export function applyImageSwapsToHtml(
  html: string,
  swaps?: ImageSwap[],
  page = 'index.html',
): string {
  return applyImageSwapsToHtmlWithReport(html, swaps, page).html
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
  slotId?: string,
  coordinatedSlotIds?: readonly string[],
): Promise<{ map: ImageSwapMap; url: string; slotIds: string[] }> {
  const coordinated = coordinatedSlotIds === undefined
    ? undefined
    : normalizeCoordinatedImageSlotIds(slotId, coordinatedSlotIds)
  if (coordinatedSlotIds !== undefined && !coordinated) {
    throw new Error('The selected responsive image group is invalid or ambiguous.')
  }
  const currentPageSwaps = currentMap[page] || []
  if (coordinated) {
    const reservationUrl = 'https://images.invalid/dc-responsive-reservation.webp'
    const prospective = mergeCoordinatedImageSwaps(
      currentPageSwaps,
      originalSrc,
      reservationUrl,
      extractRelativeAssetPath(originalSrc),
      slotId,
      coordinated,
    )
    const complete = coordinated.every((id) => (
      prospective.filter((swap) => imageSlotId(swap) === id).length === 1
    ))
    if (!complete || prospective.length > MAX_IMAGE_SWAPS_PER_PAGE) {
      throw new Error('The selected responsive image group cannot be saved atomically.')
    }
  }
  const { url } = await uploadCustomerImageFile(file, owner, portalToken)
  const rel = extractRelativeAssetPath(originalSrc)
  const pageSwaps = coordinated
    ? mergeCoordinatedImageSwaps(currentPageSwaps, originalSrc, url, rel, slotId, coordinated)
    : mergeImageSwap(currentPageSwaps, originalSrc, url, rel, slotId)
  const map = { ...currentMap, [page]: pageSwaps }
  saveImageSwaps(map, scope)
  return {
    map,
    url,
    slotIds: coordinated || (isSafeImageSlotId(slotId) ? [slotId] : []),
  }
}
