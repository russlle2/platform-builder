import type { InlineTextEdit } from './inline-edits'
import { isSafeInlineEditId } from './inline-edits'
import { isSafePreviewText } from './template-preview-security'

export type PageSeoField = 'title' | 'description'

export interface EditablePageSeoSlot {
  field: PageSeoField
  nodeId: string
  value: string
}

export interface EditablePageSeoSettings {
  title: EditablePageSeoSlot | null
  description: EditablePageSeoSlot | null
}

export const PAGE_TITLE_MAX_LENGTH = 160
export const PAGE_DESCRIPTION_MAX_LENGTH = 500

const COMPILER_EDIT_ID_RE = /^txt_[a-f0-9]{18}$/
const HEAD_RE = /<head\b[^>]*>([\s\S]*?)<\/head\s*>/gi
const TITLE_RE = /<title\b([^>]*)>([\s\S]*?)<\/title\s*>/gi
const META_RE = /<meta\b([^>]*)>/gi

function decodeHtml(value: string): string {
  return value.replace(
    /&(?:#x([0-9a-f]+)|#(\d+)|(amp|lt|gt|quot|apos|nbsp));/gi,
    (entity, hex: string | undefined, decimal: string | undefined, named: string | undefined) => {
      if (hex || decimal) {
        const codePoint = Number.parseInt(hex || decimal || '', hex ? 16 : 10)
        if (Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff) {
          try {
            return String.fromCodePoint(codePoint)
          } catch {
            return entity
          }
        }
        return entity
      }
      switch (named?.toLowerCase()) {
        case 'amp': return '&'
        case 'lt': return '<'
        case 'gt': return '>'
        case 'quot': return '"'
        case 'apos': return "'"
        case 'nbsp': return '\u00a0'
        default: return entity
      }
    },
  )
}

function attributeValues(rawAttributes: string, attribute: string): string[] {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\u0060]+))`,
    'gi',
  )
  return [...rawAttributes.matchAll(pattern)].map((match) => (
    decodeHtml(match[1] ?? match[2] ?? match[3] ?? '')
  ))
}

function singleAttribute(rawAttributes: string, attribute: string): string | null {
  const values = attributeValues(rawAttributes, attribute)
  return values.length === 1 ? values[0] : null
}

function hasAttribute(rawAttributes: string, attribute: string): boolean {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s*=|\\s|$)`, 'i').test(rawAttributes)
}

function compilerNodeId(rawAttributes: string): string | null {
  const nodeId = singleAttribute(rawAttributes, 'data-dc-edit-id')
  return nodeId && isSafeInlineEditId(nodeId) && COMPILER_EDIT_ID_RE.test(nodeId)
    ? nodeId
    : null
}

function safeHead(html: string): string | null {
  // The rendered page can legitimately be much larger than an individual
  // edit value. Bound pathological input without applying the edit-value cap.
  if (html.length > 5_000_000) return null
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '')
  const heads = [...withoutComments.matchAll(HEAD_RE)]
  return heads.length === 1 ? heads[0][1] : null
}

function stableIdCount(html: string, nodeId: string): number {
  const escaped = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `\\sdata-(?:dc|pb)-edit-id\\s*=\\s*(?:"${escaped}"|'${escaped}'|${escaped}(?=\\s|>))`,
    'gi',
  )
  return [...html.matchAll(pattern)].length
}

function editableTitle(head: string): EditablePageSeoSlot | null {
  const titles = [...head.matchAll(TITLE_RE)]
  if (titles.length !== 1) return null
  const [, rawAttributes, rawValue] = titles[0]
  const nodeId = compilerNodeId(rawAttributes)
  if (!nodeId || hasAttribute(rawAttributes, 'data-dc-edit-attribute')) return null
  // A title is a leaf text slot. Treat unexpected child markup as a malformed
  // compiler contract instead of attempting to flatten it.
  if (/<[A-Za-z!/][^>]*>/.test(rawValue)) return null
  return { field: 'title', nodeId, value: decodeHtml(rawValue) }
}

function editableDescription(head: string): EditablePageSeoSlot | null {
  const candidates: EditablePageSeoSlot[] = []
  for (const match of head.matchAll(META_RE)) {
    const rawAttributes = match[1]
    if (singleAttribute(rawAttributes, 'name')?.trim().toLowerCase() !== 'description') continue
    const nodeId = compilerNodeId(rawAttributes)
    const editableAttribute = singleAttribute(rawAttributes, 'data-dc-edit-attribute')
    const content = singleAttribute(rawAttributes, 'content')
    if (!nodeId || editableAttribute !== 'content' || content === null) continue
    candidates.push({ field: 'description', nodeId, value: content })
  }
  return candidates.length === 1 ? candidates[0] : null
}

/**
 * Discover only the two compiler-v3 SEO slots that are safe to expose in the
 * customer editor. Other head metadata (especially viewport) is ignored.
 */
export function readEditablePageSeoSettings(html: string | null | undefined): EditablePageSeoSettings {
  if (!html) return { title: null, description: null }
  const head = safeHead(html)
  if (!head) return { title: null, description: null }
  let title = editableTitle(head)
  let description = editableDescription(head)
  if (title && stableIdCount(html, title.nodeId) !== 1) title = null
  if (description && stableIdCount(html, description.nodeId) !== 1) description = null
  if (title && description && title.nodeId === description.nodeId) {
    title = null
    description = null
  }
  return { title, description }
}

/** Build one stable-ID edit after re-validating the current rendered page. */
export function buildPageSeoInlineEdit(
  html: string | null | undefined,
  field: PageSeoField,
  updated: string,
): InlineTextEdit | null {
  const maxLength = field === 'title' ? PAGE_TITLE_MAX_LENGTH : PAGE_DESCRIPTION_MAX_LENGTH
  if (!isSafePreviewText(updated, maxLength) || !updated.trim() || updated.includes('\0')) return null
  const slot = readEditablePageSeoSettings(html)[field]
  if (!slot || slot.value === updated) return null
  return {
    nodeId: slot.nodeId,
    original: slot.value,
    updated,
  }
}
