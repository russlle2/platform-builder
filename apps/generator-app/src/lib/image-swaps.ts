/**
 * Client-safe helpers for persistent image swaps (original src → uploaded URL).
 */

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
    if (!id || id.length < 8) {
      id = `draft-${crypto.randomUUID().slice(0, 12)}`
      sessionStorage.setItem(IMAGE_OWNER_KEY, id)
    }
    return id
  } catch {
    return `draft-${Date.now()}`
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
  for (const swap of swaps) {
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

export function loadImageSwaps(): ImageSwapMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(IMAGE_SWAPS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveImageSwaps(map: ImageSwapMap): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(IMAGE_SWAPS_KEY, JSON.stringify(map))
  } catch { /* quota */ }
}

/** Upload file to /api/upload and return the durable public URL. */
export async function uploadCustomerImageFile(
  file: File,
  owner: string,
): Promise<{ url: string; path: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('owner', owner)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Upload failed')
  }
  if (!data.url || data.embedded) {
    throw new Error('Image storage is not configured. Set Supabase credentials for persistent uploads.')
  }
  return { url: data.url as string, path: (data.path as string) || data.url }
}

export async function fetchCustomerImageLibrary(owner: string): Promise<
  { url: string; path: string; filename: string }[]
> {
  const res = await fetch(`/api/upload?owner=${encodeURIComponent(owner)}`)
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
): Promise<{ map: ImageSwapMap; url: string }> {
  const { url } = await uploadCustomerImageFile(file, owner)
  const rel = extractRelativeAssetPath(originalSrc)
  const pageSwaps = mergeImageSwap(currentMap[page] || [], originalSrc, url, rel)
  const map = { ...currentMap, [page]: pageSwaps }
  saveImageSwaps(map)
  return { map, url }
}
