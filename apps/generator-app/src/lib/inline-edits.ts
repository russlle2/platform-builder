/**
 * Client-safe helpers for capturing and re-applying inline text edits made in
 * the live preview iframe. Pure string/data utilities — safe to import into
 * client components (no server-only deps).
 *
 * New edits target deterministic element IDs instead of rendered text. This
 * keeps entities, repeated labels, and preview/deploy output stable. The
 * original-text path remains as a compatibility fallback for existing drafts.
 */

export interface InlineTextEdit {
  /** Stable ID assigned from page name + editable-element ordinal. */
  id?: string
  /** Rendered text before the user edited it (legacy fallback). */
  original: string
  /** Replacement text the user typed. */
  updated: string
}

/** Map of page filename ("index.html") → its inline edits. */
export type InlineEditMap = Record<string, InlineTextEdit[]>

export const INLINE_EDITS_KEY = 'pb_inline_edits'
const SCOPED_INLINE_EDITS_KEY = 'pb_inline_edits_by_scope_v1'
const LEGACY_INLINE_MIGRATION_KEY = 'pb_inline_edits_legacy_migrated_v1'
const MAX_SCOPES = 50
const MAX_EDITS_PER_PAGE = 250
const MAX_EDIT_LENGTH = 10_000

const EDITABLE_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'li', 'td', 'th', 'a',
  'blockquote', 'figcaption', 'label', 'button', 'dt', 'dd', 'small', 'summary',
  'strong', 'em', 'b', 'i', 'cite', 'legend', 'address', 'time', 'code', 'pre',
  'div', 'section', 'article',
] as const

const EDITABLE_OPEN_TAG_RE = new RegExp(
  `<(${EDITABLE_TAGS.join('|')})\\b([^>]*)>`,
  'gi',
)
const PROTECTED_BLOCK_RE = /<!--[\s\S]*?-->|<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi
const EXISTING_EDIT_ID_RE = /\sdata-pb-edit-id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const SAFE_EDIT_ID_RE = /^pb-[a-z0-9-]{1,120}-\d{4,7}$/

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function safeScopePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

/** Build the storage namespace for one template or one purchased portal site. */
export function buildCustomizationScope(
  niche: string,
  template: string,
  portalSlug?: string | null,
): string {
  const safeNiche = safeScopePart(niche)
  const safeTemplate = safeScopePart(template)
  const safePortal = safeScopePart(portalSlug || '')
  if (!safeNiche || !safeTemplate) return ''
  return safePortal
    ? `portal:${safePortal}:${safeNiche}:${safeTemplate}`
    : `template:${safeNiche}:${safeTemplate}`
}

export function isSafeInlineEditId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_EDIT_ID_RE.test(value)
}

/** Normalize session data before it can affect preview markup or editor state. */
export function sanitizeStoredInlineEditMap(value: unknown): InlineEditMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: InlineEditMap = {}
  for (const [page, rawEdits] of Object.entries(value)) {
    if (!/^[A-Za-z0-9_-]+\.html$/.test(page) || !Array.isArray(rawEdits)) continue
    const edits: InlineTextEdit[] = []
    for (const raw of rawEdits.slice(0, MAX_EDITS_PER_PAGE)) {
      if (!raw || typeof raw !== 'object') continue
      const candidate = raw as Partial<InlineTextEdit>
      if (typeof candidate.original !== 'string' || typeof candidate.updated !== 'string') continue
      const original = candidate.original.replace(/\0/g, '').trim().slice(0, MAX_EDIT_LENGTH)
      const updated = candidate.updated.replace(/\0/g, '').slice(0, MAX_EDIT_LENGTH)
      if (!original || original === updated) continue
      const id = isSafeInlineEditId(candidate.id) ? candidate.id : undefined
      edits.push({ ...(id ? { id } : {}), original, updated })
    }
    if (edits.length > 0) result[page] = edits
  }
  return result
}

function pageIdPrefix(page: string): string {
  const safePage = safeScopePart(page.replace(/\.html$/i, '')).replace(/[._]+/g, '-') || 'index'
  return `pb-${safePage}`
}

function annotateSegment(
  segment: string,
  prefix: string,
  nextOrdinal: () => number,
): string {
  EDITABLE_OPEN_TAG_RE.lastIndex = 0
  return segment.replace(EDITABLE_OPEN_TAG_RE, (full, tag: string, rawAttrs: string) => {
    if (/\/\s*>$/.test(full)) return full
    const attrs = rawAttrs.replace(EXISTING_EDIT_ID_RE, '')
    const ordinal = String(nextOrdinal()).padStart(4, '0')
    return `<${tag}${attrs} data-pb-edit-id="${prefix}-${ordinal}">`
  })
}

/**
 * Add deterministic IDs to editable elements without touching scripts, styles,
 * comments, or templates. IDs depend only on the page and markup order, so the
 * independently built preview and deploy documents receive the same targets.
 */
export function annotateEditableElements(html: string, page = 'index.html'): string {
  const prefix = pageIdPrefix(page)
  let ordinal = 0
  const nextOrdinal = () => {
    ordinal += 1
    return ordinal
  }
  let cursor = 0
  let result = ''

  PROTECTED_BLOCK_RE.lastIndex = 0
  let protectedMatch: RegExpExecArray | null
  while ((protectedMatch = PROTECTED_BLOCK_RE.exec(html)) !== null) {
    result += annotateSegment(html.slice(cursor, protectedMatch.index), prefix, nextOrdinal)
    result += protectedMatch[0]
    cursor = protectedMatch.index + protectedMatch[0].length
  }
  result += annotateSegment(html.slice(cursor), prefix, nextOrdinal)
  return result
}

function replaceElementTextById(
  html: string,
  id: string,
  updated: string,
): { html: string; replaced: boolean } {
  if (!isSafeInlineEditId(id)) return { html, replaced: false }
  const escapedId = escapeRegExp(id)
  const openingTag = new RegExp(
    `<([A-Za-z][A-Za-z0-9:-]*)\\b[^>]*\\bdata-pb-edit-id\\s*=\\s*(["'])${escapedId}\\2[^>]*>`,
    'i',
  )
  const opening = openingTag.exec(html)
  if (!opening) return { html, replaced: false }

  const tagName = opening[1]
  const contentStart = opening.index + opening[0].length
  const matchingTag = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*>`, 'gi')
  matchingTag.lastIndex = contentStart
  let depth = 1
  let match: RegExpExecArray | null

  while ((match = matchingTag.exec(html)) !== null) {
    const isClosing = /^<\//.test(match[0])
    const isSelfClosing = /\/\s*>$/.test(match[0])
    if (isClosing) depth -= 1
    else if (!isSelfClosing) depth += 1
    if (depth === 0) {
      return {
        html: html.slice(0, contentStart) + escapeHtmlText(updated) + html.slice(match.index),
        replaced: true,
      }
    }
  }

  return { html, replaced: false }
}

/** Merge a newly captured edit, chaining re-edits by stable element ID. */
export function mergeInlineEdit(
  edits: InlineTextEdit[],
  original: string,
  updated: string,
  id?: string,
): InlineTextEdit[] {
  const trimmed = (original || '').trim()
  if (!trimmed || trimmed === updated) return edits
  const next = edits.map((edit) => ({ ...edit }))
  const safeId = isSafeInlineEditId(id) ? id : undefined

  if (safeId) {
    const targeted = next.find((edit) => edit.id === safeId)
    if (targeted) {
      targeted.updated = updated
      return next
    }
  }

  // Legacy drafts did not have IDs. Keep their chaining semantics intact.
  const chained = next.find((edit) => !edit.id && edit.updated.trim() === trimmed)
  if (chained) {
    chained.updated = updated
    if (safeId) chained.id = safeId
    return next
  }
  const existing = next.find((edit) => !edit.id && edit.original.trim() === trimmed)
  if (existing) {
    existing.updated = updated
    if (safeId) existing.id = safeId
    return next
  }
  next.push({ ...(safeId ? { id: safeId } : {}), original: trimmed, updated })
  return next
}

/**
 * Annotate a fresh document and apply edits. ID edits replace only the selected
 * element and safely handle HTML entities; legacy edits retain exact-text
 * replacement behavior. All replacement text is escaped in both environments.
 */
export function applyInlineEditsToHtml(
  html: string,
  edits?: InlineTextEdit[],
  page = 'index.html',
): string {
  let result = annotateEditableElements(html, page)
  if (!edits || edits.length === 0) return result

  for (const edit of edits) {
    if (!edit || typeof edit.original !== 'string' || typeof edit.updated !== 'string') continue
    if (edit.id) {
      const targeted = replaceElementTextById(result, edit.id, edit.updated)
      result = targeted.html
      if (targeted.replaced) continue
    }

    const original = edit.original.trim()
    if (!original || original === edit.updated) continue
    result = result.split(original).join(escapeHtmlText(edit.updated))
  }
  return result
}

function readMap(key: string): InlineEditMap {
  try {
    const raw = sessionStorage.getItem(key)
    return sanitizeStoredInlineEditMap(raw ? JSON.parse(raw) : {})
  } catch {
    return {}
  }
}

function readScopedMaps(): Record<string, InlineEditMap> {
  try {
    const raw = sessionStorage.getItem(SCOPED_INLINE_EDITS_KEY)
    const value = raw ? JSON.parse(raw) : {}
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(-MAX_SCOPES)
        .map(([scope, map]) => [scope, sanitizeStoredInlineEditMap(map)])
        .filter(([, map]) => Object.keys(map as InlineEditMap).length > 0),
    )
  } catch {
    return {}
  }
}

function writeScopedMaps(maps: Record<string, InlineEditMap>): void {
  const entries = Object.entries(maps).slice(-MAX_SCOPES)
  sessionStorage.setItem(SCOPED_INLINE_EDITS_KEY, JSON.stringify(Object.fromEntries(entries)))
}

/** Load one template/site scope and mirror it to the checkout compatibility key. */
export function loadInlineEdits(scope?: string): InlineEditMap {
  if (typeof window === 'undefined') return {}
  if (!scope) return readMap(INLINE_EDITS_KEY)

  try {
    const scoped = readScopedMaps()
    let map = scoped[scope]
    if (!map && sessionStorage.getItem(LEGACY_INLINE_MIGRATION_KEY) !== 'true') {
      map = readMap(INLINE_EDITS_KEY)
      scoped[scope] = map
      sessionStorage.setItem(LEGACY_INLINE_MIGRATION_KEY, 'true')
      writeScopedMaps(scoped)
    }
    const selected = map || {}
    sessionStorage.setItem(INLINE_EDITS_KEY, JSON.stringify(selected))
    return selected
  } catch {
    return {}
  }
}

/** Persist one scope and mirror only that selected map for checkout. */
export function saveInlineEdits(map: InlineEditMap, scope?: string): void {
  if (typeof window === 'undefined') return
  try {
    const safeMap = sanitizeStoredInlineEditMap(map)
    if (scope) {
      const scoped = readScopedMaps()
      delete scoped[scope]
      scoped[scope] = safeMap
      writeScopedMaps(scoped)
    }
    sessionStorage.setItem(INLINE_EDITS_KEY, JSON.stringify(safeMap))
  } catch { /* quota — ignore */ }
}
