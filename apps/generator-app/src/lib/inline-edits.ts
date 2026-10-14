/**
 * Client-safe helpers for capturing and re-applying inline text edits made in
 * the live preview iframe. Pure string/data utilities — safe to import into
 * client components (no server-only deps).
 *
 * New edits target deterministic element IDs instead of rendered text. This
 * keeps entities, repeated labels, and preview/deploy output stable. The
 * original-text path remains as a compatibility fallback for existing drafts.
 */

import { isSafePreviewPage } from './template-preview-security'

export interface InlineTextEdit {
  /** Stable v3 ID stored in `data-dc-edit-id`. */
  nodeId?: string
  /**
   * Transitional v2 field. It is accepted on input and normalized to
   * `nodeId`; new records are never written with it.
   */
  id?: string
  /** Rendered text before the user edited it (v2 fallback). */
  original?: string
  /** Replacement text the user typed. */
  updated: string
}

/** Map of page filename ("index.html") → its inline edits. */
export type InlineEditMap = Record<string, InlineTextEdit[]>

export interface InlineEditApplicationResult {
  html: string
  /** Stable v3 targets that were no longer present in the annotated page. */
  unmatchedNodeIds: string[]
}

export const EDITABLE_ATTRIBUTE_NAMES = [
  'content',
  'alt',
  'title',
  'placeholder',
  'aria-label',
] as const

export type EditableAttributeName = (typeof EDITABLE_ATTRIBUTE_NAMES)[number]

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

/** Selector shared by both visual editors. Only explicitly annotated targets
 * are interactive. Legacy pages receive deterministic IDs before entering the
 * iframe; compiler-v3 pages retain their audited, leaf-granular IDs. */
export const VISUAL_EDITABLE_SELECTOR = '[data-dc-edit-id],[data-pb-edit-id]'

const EDITABLE_OPEN_TAG_RE = new RegExp(
  `<(${EDITABLE_TAGS.join('|')})\\b([^>]*)>`,
  'gi',
)
const PROTECTED_BLOCK_RE = /<!--[\s\S]*?-->|<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi
const EXISTING_DC_EDIT_ID_RE = /\sdata-dc-edit-id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const EXISTING_PB_EDIT_ID_RE = /\sdata-pb-edit-id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const READ_DC_EDIT_ID_RE = /\bdata-dc-edit-id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
const READ_PB_EDIT_ID_RE = /\bdata-pb-edit-id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
const READ_EDIT_ATTRIBUTE_RE = /\bdata-(?:dc|pb)-edit-attribute\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
const SAFE_EDIT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const COMPILER_V3_EDIT_ID_RE = /\bdata-dc-edit-id\s*=\s*(?:"txt_[a-f0-9]{18}"|'txt_[a-f0-9]{18}'|txt_[a-f0-9]{18}(?=\s|>))/i
const COMPILER_V3_DOCUMENT_RE = /<html\b[^>]*\bdata-dc-catalog-version\s*=\s*(?:"3"|'3'|3(?=\s|>))/i
const EDITABLE_ATTRIBUTE_SET = new Set<string>(EDITABLE_ATTRIBUTE_NAMES)

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

function replaceLegacyVisibleText(html: string, original: string, updated: string): string {
  const replaceText = (value: string) => value.split(original).join(updated)
  let result = ''
  let cursor = 0

  while (cursor < html.length) {
    const tagStart = html.indexOf('<', cursor)
    if (tagStart < 0) {
      result += replaceText(html.slice(cursor))
      break
    }
    result += replaceText(html.slice(cursor, tagStart))

    if (html.startsWith('<!--', tagStart)) {
      const commentEnd = html.indexOf('-->', tagStart + 4)
      if (commentEnd < 0) return result + html.slice(tagStart)
      result += html.slice(tagStart, commentEnd + 3)
      cursor = commentEnd + 3
      continue
    }

    let quote = ''
    let tagEnd = tagStart + 1
    for (; tagEnd < html.length; tagEnd += 1) {
      const character = html[tagEnd]
      if (quote) {
        if (character === quote) quote = ''
      } else if (character === '"' || character === "'") {
        quote = character
      } else if (character === '>') {
        tagEnd += 1
        break
      }
    }
    if (tagEnd > html.length || html[tagEnd - 1] !== '>') return result + html.slice(tagStart)

    const openingTag = html.slice(tagStart, tagEnd)
    const protectedName = /^<\s*(script|style|noscript|template)\b/i.exec(openingTag)?.[1]
    if (protectedName && !/^<\s*\//.test(openingTag)) {
      const closing = new RegExp(`<\\/${protectedName}\\s*>`, 'ig')
      closing.lastIndex = tagEnd
      const match = closing.exec(html)
      if (!match) return result + html.slice(tagStart)
      result += html.slice(tagStart, match.index + match[0].length)
      cursor = match.index + match[0].length
      continue
    }

    result += openingTag
    cursor = tagEnd
  }

  return result
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

export function isSafeEditableAttribute(value: unknown): value is EditableAttributeName {
  return typeof value === 'string' && EDITABLE_ATTRIBUTE_SET.has(value)
}

function readEditId(rawAttrs: string): string | undefined {
  const dc = READ_DC_EDIT_ID_RE.exec(rawAttrs)
  const legacy = READ_PB_EDIT_ID_RE.exec(rawAttrs)
  const value = dc?.[1] || dc?.[2] || dc?.[3] || legacy?.[1] || legacy?.[2] || legacy?.[3]
  return isSafeInlineEditId(value) ? value : undefined
}

function editNodeId(edit: Pick<InlineTextEdit, 'nodeId' | 'id'>): string | undefined {
  // The newest identity field is authoritative whenever it is present. A
  // malformed nodeId must not fall through to an older ID (or later to broad
  // original-text replacement).
  if (edit.nodeId !== undefined) {
    return isSafeInlineEditId(edit.nodeId) ? edit.nodeId : undefined
  }
  return isSafeInlineEditId(edit.id) ? edit.id : undefined
}

/** Normalize session data before it can affect preview markup or editor state. */
export function sanitizeStoredInlineEditMap(value: unknown): InlineEditMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: InlineEditMap = {}
  for (const [page, rawEdits] of Object.entries(value)) {
    if (!isSafePreviewPage(page) || !Array.isArray(rawEdits)) continue
    const edits: InlineTextEdit[] = []
    for (const raw of rawEdits.slice(0, MAX_EDITS_PER_PAGE)) {
      if (!raw || typeof raw !== 'object') continue
      const candidate = raw as Partial<InlineTextEdit>
      if (typeof candidate.updated !== 'string') continue
      const original = typeof candidate.original === 'string'
        ? candidate.original.replace(/\0/g, '').trim().slice(0, MAX_EDIT_LENGTH)
        : undefined
      const updated = candidate.updated.replace(/\0/g, '').slice(0, MAX_EDIT_LENGTH)
      // A record carrying the v3 field must never be reinterpreted as a v2
      // text-only edit. Invalid IDs are discarded instead of being allowed to
      // replace every matching string in the page.
      if (candidate.nodeId !== undefined && !isSafeInlineEditId(candidate.nodeId)) continue
      if (
        candidate.nodeId === undefined &&
        candidate.id !== undefined &&
        !isSafeInlineEditId(candidate.id)
      ) continue
      const nodeId = editNodeId(candidate)
      if ((!nodeId && !original) || original === updated) continue
      edits.push({ ...(nodeId ? { nodeId } : {}), ...(original ? { original } : {}), updated })
    }
    if (edits.length > 0) result[page] = edits
  }
  return result
}

function pageIdPrefix(page: string): string {
  const safePage = safeScopePart(page.replace(/\.html$/i, '')).replace(/[._]+/g, '-') || 'index'
  return `dc-edit-${safePage}`
}

function annotateSegment(
  segment: string,
  nextId: (existingId?: string) => string,
): string {
  EDITABLE_OPEN_TAG_RE.lastIndex = 0
  return segment.replace(EDITABLE_OPEN_TAG_RE, (full, tag: string, rawAttrs: string) => {
    if (/\/\s*>$/.test(full)) return full
    const existingId = readEditId(rawAttrs)
    const attrs = rawAttrs
      .replace(EXISTING_DC_EDIT_ID_RE, '')
      .replace(EXISTING_PB_EDIT_ID_RE, '')
    return `<${tag}${attrs} data-dc-edit-id="${nextId(existingId)}">`
  })
}

/**
 * Add deterministic IDs to editable elements without touching scripts, styles,
 * comments, or templates. IDs depend only on the page and markup order, so the
 * independently built preview and deploy documents receive the same targets.
 */
export function annotateEditableElements(html: string, page = 'index.html'): string {
  // Compiler-v3 output is exhaustively annotated by the rehabilitation
  // compiler. Synthesizing broad legacy IDs on top of it would reintroduce
  // unsafe parent slots that can own links or form controls. The explicit
  // document marker also protects the valid zero-text-slot case.
  if (COMPILER_V3_DOCUMENT_RE.test(html) || COMPILER_V3_EDIT_ID_RE.test(html)) return html

  const prefix = pageIdPrefix(page)
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
    result += annotateSegment(html.slice(cursor, protectedMatch.index), nextId)
    result += protectedMatch[0]
    cursor = protectedMatch.index + protectedMatch[0].length
  }
  result += annotateSegment(html.slice(cursor), nextId)
  return result
}

function declaredEditableAttribute(rawTag: string): {
  declared: boolean
  attribute?: EditableAttributeName
} {
  const match = READ_EDIT_ATTRIBUTE_RE.exec(rawTag)
  if (!match) return { declared: false }
  const value = match[1] || match[2] || match[3]
  return {
    declared: true,
    ...(isSafeEditableAttribute(value) ? { attribute: value } : {}),
  }
}

export function isEditableAttributeForTag(
  tagName: unknown,
  attribute: EditableAttributeName,
): boolean {
  if (typeof tagName !== 'string') return false
  const tag = tagName.toLowerCase()
  if (attribute === 'content') return tag === 'meta'
  if (attribute === 'alt') return tag === 'img'
  if (attribute === 'placeholder') return tag === 'input' || tag === 'textarea'
  return !['base', 'embed', 'iframe', 'link', 'object', 'script', 'style', 'template'].includes(tag)
}

function replaceElementValueById(
  html: string,
  id: string,
  updated: string,
): { html: string; replaced: boolean } {
  if (!isSafeInlineEditId(id)) return { html, replaced: false }
  const escapedId = escapeRegExp(id)
  const openingTag = new RegExp(
    `<([A-Za-z][A-Za-z0-9:-]*)\\b[^>]*\\bdata-(?:dc|pb)-edit-id\\s*=\\s*(["'])${escapedId}\\2[^>]*>`,
    'gi',
  )
  const openings = [...html.matchAll(openingTag)]
  // Stable IDs are a uniqueness contract. Refuse an ambiguous document
  // instead of silently editing the first duplicate.
  if (openings.length !== 1) return { html, replaced: false }
  const opening = openings[0]

  const tagName = opening[1]
  const declaredAttribute = declaredEditableAttribute(opening[0])
  if (declaredAttribute.declared) {
    const attribute = declaredAttribute.attribute
    if (!attribute || !isEditableAttributeForTag(tagName, attribute)) {
      return { html, replaced: false }
    }
    const attributePattern = new RegExp(
      `(\\s)${escapeRegExp(attribute)}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`,
      'i',
    )
    if (!attributePattern.test(opening[0])) return { html, replaced: false }
    const escapedUpdated = escapeHtmlText(updated)
    const replacement = opening[0].replace(
      attributePattern,
      (_match, leadingSpace: string) => `${leadingSpace}${attribute}="${escapedUpdated}"`,
    )
    return {
      html: html.slice(0, opening.index) + replacement + html.slice(opening.index + opening[0].length),
      replaced: true,
    }
  }

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
      const innerHtml = html.slice(contentStart, match.index)
      // Text edits are intentionally leaf-only. Refuse stale or legacy IDs
      // that would replace descendant markup such as links, images, or form
      // controls with escaped plain text.
      if (/<[A-Za-z][^>]*>/.test(innerHtml)) return { html, replaced: false }
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
  nodeId?: string,
): InlineTextEdit[] {
  const trimmed = (original || '').trim()
  if (nodeId !== undefined && nodeId !== '' && !isSafeInlineEditId(nodeId)) return edits
  const safeNodeId = isSafeInlineEditId(nodeId) ? nodeId : undefined
  if ((!trimmed && !safeNodeId) || trimmed === updated) return edits
  const next = edits.map((edit) => ({ ...edit }))

  if (safeNodeId) {
    const targeted = next.find((edit) => editNodeId(edit) === safeNodeId)
    if (targeted) {
      targeted.updated = updated
      targeted.nodeId = safeNodeId
      delete targeted.id
      return next
    }
  }

  // Legacy drafts did not have IDs. Keep their chaining semantics intact.
  const chained = next.find((edit) => !editNodeId(edit) && edit.updated.trim() === trimmed)
  if (chained) {
    chained.updated = updated
    if (safeNodeId) chained.nodeId = safeNodeId
    return next
  }
  const existing = next.find((edit) => !editNodeId(edit) && edit.original?.trim() === trimmed)
  if (existing) {
    existing.updated = updated
    if (safeNodeId) existing.nodeId = safeNodeId
    return next
  }
  next.push({
    ...(safeNodeId ? { nodeId: safeNodeId } : {}),
    ...(trimmed ? { original: trimmed } : {}),
    updated,
  })
  return next
}

/**
 * Annotate a fresh document and apply edits. ID edits replace only the selected
 * element and safely handle HTML entities; legacy edits retain exact-text
 * replacement behavior. All replacement text is escaped in both environments.
 */
export function applyInlineEditsToHtmlWithReport(
  html: string,
  edits?: InlineTextEdit[],
  page = 'index.html',
): InlineEditApplicationResult {
  let result = annotateEditableElements(html, page)
  if (!edits || edits.length === 0) return { html: result, unmatchedNodeIds: [] }
  const unmatchedNodeIds = new Set<string>()

  for (const edit of edits) {
    if (!edit || typeof edit.updated !== 'string') continue
    const nodeId = editNodeId(edit)
    if (nodeId) {
      const targeted = replaceElementValueById(result, nodeId, edit.updated)
      result = targeted.html
      if (targeted.replaced) continue
      unmatchedNodeIds.add(nodeId)
      // Stable IDs are authoritative. Falling through to the v2 global text
      // replacement can silently modify multiple duplicate nodes after a
      // design revision, which is worse than leaving a stale edit unapplied.
      continue
    }
    if (edit.nodeId !== undefined || edit.id !== undefined) {
      // Direct callers may not have passed through the storage sanitizer.
      // Preserve fail-closed semantics for malformed identity records as well.
      unmatchedNodeIds.add(String(edit.nodeId ?? edit.id).slice(0, 128))
      continue
    }

    const original = typeof edit.original === 'string' ? edit.original.trim() : ''
    if (!original || original === edit.updated) continue
    result = replaceLegacyVisibleText(result, original, escapeHtmlText(edit.updated))
  }
  return { html: result, unmatchedNodeIds: [...unmatchedNodeIds] }
}

/** Apply edits for preview callers that do not need the diagnostic report. */
export function applyInlineEditsToHtml(
  html: string,
  edits?: InlineTextEdit[],
  page = 'index.html',
): string {
  return applyInlineEditsToHtmlWithReport(html, edits, page).html
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
