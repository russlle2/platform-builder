import fs from 'fs'
import path from 'path'
import { getStore } from '@netlify/blobs'
import { NICHE_META, NICHE_SLUGS, getNicheSlugs } from './niche-meta'

export { NICHE_META, NICHE_SLUGS, getNicheSlugs }

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TemplateField {
  name: string
  label: string
  type: string
  required?: boolean
  default?: string
}

export interface TemplateMeta {
  slug: string
  name: string
  niche: string
  nicheSlug: string
  layoutFamily?: string
  voiceFamily?: string
  /** Gallery ordering key (lower = earlier). Undefined sorts last. */
  order?: number
  /** Featured on niche landing pages */
  featured?: boolean
  /** Showcase card order on niche landing (lower = earlier) */
  showcaseOrder?: number
  pages: string[]
  /**
   * Path to the template's directory RELATIVE to the templates root
   * (e.g. `"aromatherapy/aromatherapy-2026-02-16T14-59-46-083Z-001"`).
   * The registry composes both filesystem paths and CDN URLs from this.
   */
  dir: string
  fields: TemplateField[]
  /** First 160 chars of visible text from index.html (for card preview) */
  snippet: string
}

export interface NicheInfo {
  slug: string
  label: string
  description: string
  icon: string
  accent: string
  templateCount: number
}

type ManifestShape = Record<string, TemplateMeta[]>

/* ------------------------------------------------------------------ */
/* Filesystem + URL roots                                              */
/* ------------------------------------------------------------------ */

/**
 * Candidate locations for the templates directory. Local dev reads from the
 * checked-out `platform-builder/` directory. The `public/_templates` paths
 * are kept as legacy candidates for any env that still mirrors there.
 */
const FS_ROOT_CANDIDATES: string[] = [
  path.join(process.cwd(), 'public', '_templates'),
  path.join(process.cwd(), 'apps', 'generator-app', 'public', '_templates'),
  path.join(process.cwd(), '..', '..', 'platform-builder'),
  path.join(process.cwd(), 'platform-builder'),
]

let _fsRoot: string | null | undefined
function getFsRoot(): string | null {
  if (_fsRoot !== undefined) return _fsRoot
  for (const candidate of FS_ROOT_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) {
        _fsRoot = candidate
        return _fsRoot
      }
    } catch { /* ignore */ }
  }
  _fsRoot = null
  return null
}

/** Base URL used to fetch template assets at runtime as a last resort. */
function templateBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    `http://localhost:${process.env.PORT || 3000}`
  )
}

/** Obtain a Netlify Blobs store, or null if the env is not configured. */
function getBlobsStore() {
  try {
    return getStore({ name: 'templates', consistency: 'strong' })
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Manifest loading                                                    */
/* ------------------------------------------------------------------ */

const MANIFEST_RELATIVE = '_manifest.json'

let _manifestPromise: Promise<ManifestShape> | null = null

function loadManifest(): Promise<ManifestShape> {
  if (_manifestPromise) return _manifestPromise
  _manifestPromise = (async () => {
    // 1. Filesystem (local dev / build)
    const fsRoot = getFsRoot()
    if (fsRoot) {
      const p = path.join(fsRoot, MANIFEST_RELATIVE)
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8')
          return JSON.parse(raw) as ManifestShape
        }
      } catch (err) {
        console.error('[niche-registry] failed reading manifest from fs:', err)
      }
    }

    // 2. Netlify Blobs (production runtime)
    try {
      const store = getBlobsStore()
      if (store) {
        const data = await store.get('_manifest.json', { type: 'json' })
        if (data) return data as ManifestShape
      }
    } catch (err) {
      console.error('[niche-registry] failed reading manifest from Blobs:', err)
    }

    // 3. HTTP fallback (last resort)
    try {
      const url = `${templateBaseUrl()}/_templates/${MANIFEST_RELATIVE}`
      const res = await fetch(url)
      if (res.ok) {
        return (await res.json()) as ManifestShape
      }
      console.error(`[niche-registry] manifest fetch ${url} -> ${res.status}`)
    } catch (err) {
      console.error('[niche-registry] failed fetching manifest:', err)
    }

    return {}
  })()
  // Allow retry on next call if the load throws.
  _manifestPromise.catch(() => { _manifestPromise = null })
  return _manifestPromise
}

async function getCache(): Promise<Map<string, TemplateMeta[]>> {
  const manifest = await loadManifest()
  const out = new Map<string, TemplateMeta[]>()
  for (const nicheSlug of Object.keys(NICHE_META)) {
    out.set(nicheSlug, manifest[nicheSlug] || [])
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Get all niches with their metadata and counts */
export async function getNiches(): Promise<NicheInfo[]> {
  const cache = await getCache()
  return Object.entries(NICHE_META).map(([slug, meta]) => ({
    slug,
    ...meta,
    templateCount: cache.get(slug)?.length || 0,
  }))
}

/** Get all templates for a niche */
export async function getTemplatesForNiche(nicheSlug: string): Promise<TemplateMeta[]> {
  const cache = await getCache()
  return cache.get(nicheSlug) || []
}

/** Featured templates for niche landing showcase, ordered by showcaseOrder */
export async function getFeaturedTemplatesForNiche(nicheSlug: string): Promise<TemplateMeta[]> {
  const templates = await getTemplatesForNiche(nicheSlug)
  return templates
    .filter((t) => t.featured)
    .sort((a, b) => {
      const ao = typeof a.showcaseOrder === 'number' ? a.showcaseOrder : Number.POSITIVE_INFINITY
      const bo = typeof b.showcaseOrder === 'number' ? b.showcaseOrder : Number.POSITIVE_INFINITY
      return ao - bo
    })
}

/** Get a single template by niche + slug */
export async function getTemplate(nicheSlug: string, templateSlug: string): Promise<TemplateMeta | null> {
  const templates = await getTemplatesForNiche(nicheSlug)
  return templates.find((t) => t.slug === templateSlug) || null
}

/* ------------------------------------------------------------------ */
/* Body-content reads                                                  */
/* ------------------------------------------------------------------ */

function safeJoin(root: string, ...parts: string[]): string | null {
  const full = path.join(root, ...parts)
  const normRoot = path.resolve(root) + path.sep
  if (!path.resolve(full).startsWith(normRoot.slice(0, -1))) return null
  return full
}

/**
 * Read a template file (html, css, js, etc.) and return contents as a UTF-8
 * string. Resolution order: filesystem → Netlify Blobs → HTTP.
 */
export async function readTemplateFile(
  nicheSlug: string,
  templateSlug: string,
  filePath: string,
): Promise<string | null> {
  const template = await getTemplate(nicheSlug, templateSlug)
  if (!template) return null

  // 1. Filesystem (local dev / build)
  const fsRoot = getFsRoot()
  if (fsRoot) {
    const fullPath = safeJoin(fsRoot, template.dir, filePath)
    if (fullPath) {
      try {
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath, 'utf-8')
        }
      } catch { /* fall through */ }
    }
  }

  // 2. Netlify Blobs (production runtime)
  try {
    const store = getBlobsStore()
    if (store) {
      const text = await store.get(`${template.dir}/${filePath}`)
      if (text !== null) return text
    }
  } catch { /* fall through */ }

  // 3. HTTP fallback (last resort)
  try {
    const url = `${templateBaseUrl()}/_templates/${template.dir}/${filePath}`
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/**
 * Read a template asset as raw bytes. Resolution order: filesystem → Netlify Blobs → HTTP.
 */
export async function readTemplateFileBuffer(
  nicheSlug: string,
  templateSlug: string,
  filePath: string,
): Promise<Buffer | null> {
  const template = await getTemplate(nicheSlug, templateSlug)
  if (!template) return null

  // 1. Filesystem (local dev / build)
  const fsRoot = getFsRoot()
  if (fsRoot) {
    const fullPath = safeJoin(fsRoot, template.dir, filePath)
    if (fullPath) {
      try {
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath)
        }
      } catch { /* fall through */ }
    }
  }

  // 2. Netlify Blobs (production runtime)
  try {
    const store = getBlobsStore()
    if (store) {
      const buf = await store.get(`${template.dir}/${filePath}`, { type: 'arrayBuffer' })
      if (buf !== null) return Buffer.from(buf)
    }
  } catch { /* fall through */ }

  // 3. HTTP fallback (last resort)
  try {
    const url = `${templateBaseUrl()}/_templates/${template.dir}/${filePath}`
    const res = await fetch(url)
    if (!res.ok) return null
    const arr = await res.arrayBuffer()
    return Buffer.from(arr)
  } catch {
    return null
  }
}

/** Replace all {{PLACEHOLDER}} tokens with provided values */
export function hydrateTemplate(html: string, values: Record<string, string>): string {
  let result = html
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value)
  }
  result = result.replace(/\{\{[A-Z_]+\}\}/g, '')
  return result
}
