/**
 * Client-safe helpers for capturing and re-applying inline text edits made in
 * the live preview iframe. Pure string/data utilities — safe to import into
 * client components (no server-only deps).
 *
 * The deploy-time equivalent lives in lib/site-deploy.ts (server). Keeping the
 * apply logic identical on both sides means the preview the customer approves
 * matches what gets deployed.
 */

export interface InlineTextEdit {
  /** Text exactly as it appeared before the user edited it. */
  original: string
  /** Replacement text the user typed. */
  updated: string
}

/** Map of page filename ("index.html") → its inline edits. */
export type InlineEditMap = Record<string, InlineTextEdit[]>

export const INLINE_EDITS_KEY = 'pb_inline_edits'

/**
 * Merge a newly-captured inline edit into a page's edit list.
 * Chains re-edits: if the user edits text they already edited, we advance the
 * existing edit's target rather than recording a broken intermediate.
 */
export function mergeInlineEdit(
  edits: InlineTextEdit[],
  original: string,
  updated: string,
): InlineTextEdit[] {
  const trimmed = (original || '').trim()
  if (!trimmed || trimmed === updated) return edits
  const next = edits.map((e) => ({ ...e }))
  const chained = next.find((e) => e.updated.trim() === trimmed)
  if (chained) {
    chained.updated = updated
    return next
  }
  const existing = next.find((e) => e.original.trim() === trimmed)
  if (existing) {
    existing.updated = updated
    return next
  }
  next.push({ original: trimmed, updated })
  return next
}

/** Apply captured inline text overrides to freshly-fetched preview HTML. */
export function applyInlineEditsToHtml(html: string, edits?: InlineTextEdit[]): string {
  if (!edits || edits.length === 0) return html
  let result = html
  for (const { original, updated } of edits) {
    const orig = (original || '').trim()
    if (!orig || orig === updated) continue
    result = result.split(orig).join(updated)
  }
  return result
}

/** Read the persisted inline-edit map from sessionStorage. */
export function loadInlineEdits(): InlineEditMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(INLINE_EDITS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Persist the inline-edit map to sessionStorage. */
export function saveInlineEdits(map: InlineEditMap): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(INLINE_EDITS_KEY, JSON.stringify(map))
  } catch { /* quota — ignore */ }
}
