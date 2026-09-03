import fs from 'fs'
import path from 'path'
import { getStore } from '@netlify/blobs'
import { NICHE_META, NICHE_SLUGS, getNicheSlugs } from './niche-meta'
import { inspectLaunchCatalog } from './launch-catalog-integrity'
import launchCatalogContract from './launch-catalog-contract.json'
export { hydrateTemplate } from './template-hydration'

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
  /** Complete deployable file list relative to this template directory. */
  files: string[]
  /**
   * Path to the template's directory RELATIVE to the templates root
   * (e.g. `"aromatherapy/aromatherapy-2026-02-16T14-59-46-083Z-001"`).
   * The registry composes both filesystem paths and CDN URLs from this.
   */
  dir: string
  /** SHA-256 of the complete deterministic template directory. */
  artifactSha256: string
  /** SHA-256 of the approved curated export report. */
  catalogReportSha256: string
  /** Original niche/slug path retained when Blob objects use release prefixes. */
  sourceDir?: string
  fields: TemplateField[]
  /** First 160 chars of visible text from index.html (for card preview) */
  snippet: string
  /** Set only by the audited publisher after the full editability contract passes. */
  editable?: boolean
  validation?: {
    status: 'passed'
    contractVersion: number
    tokens: string[]
  }
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
function templateBaseUrl(): string | null {
  const configured = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL
  )
  return configured ? configured.replace(/\/$/, '') : null
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
const MANIFEST_CACHE_TTL_MS = 5 * 60 * 1000
const EMPTY_MANIFEST_CACHE_TTL_MS = 5 * 1000

let _manifestPromise: Promise<ManifestShape> | null = null
let _manifestExpiresAt = 0

function loadManifest(): Promise<ManifestShape> {
  if (_manifestPromise && Date.now() < _manifestExpiresAt) return _manifestPromise

  const request = (async () => {
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
      const baseUrl = templateBaseUrl()
      if (!baseUrl) return {}
      const url = `${baseUrl}/_templates/${MANIFEST_RELATIVE}`
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

  _manifestPromise = request
  // Keep concurrent callers on one request, but retry quickly after a missing
  // manifest and periodically refresh healthy Blob-backed catalogs.
  _manifestExpiresAt = Number.POSITIVE_INFINITY
  request.then(
    (manifest) => {
      if (_manifestPromise !== request) return
      _manifestExpiresAt = Date.now() + (
        Object.keys(manifest).length > 0
          ? MANIFEST_CACHE_TTL_MS
          : EMPTY_MANIFEST_CACHE_TTL_MS
      )
    },
    () => {
      if (_manifestPromise === request) {
        _manifestPromise = null
        _manifestExpiresAt = 0
      }
    },
  )
  return request
}

async function getCache(): Promise<Map<string, TemplateMeta[]>> {
  const manifest = await loadManifest()
  const out = new Map<string, TemplateMeta[]>()
  for (const nicheSlug of Object.keys(NICHE_META)) {
    const templates = manifest[nicheSlug] || []
    const publishable = templates.filter(isPublishableTemplateMeta)
    if (publishable.length !== templates.length) {
      console.warn(
        `[niche-registry] quarantined ${templates.length - publishable.length} ` +
        `unvalidated template(s) in ${nicheSlug}`,
      )
    }
    out.set(nicheSlug, publishable)
  }

  const integrity = inspectLaunchCatalog(
    [...out.entries()].map(([slug, templates]) => ({
      slug,
      templates: templates.map((template) => ({
        slug: template.slug,
        artifactSha256: template.artifactSha256,
      })),
    })),
  )
  if (!integrity.ready) {
    console.error(
      `[niche-registry] launch catalog integrity failed; disabling the catalog: ${integrity.issues.join('; ')}`,
    )
    for (const nicheSlug of Object.keys(NICHE_META)) out.set(nicheSlug, [])
  }
  return out
}
/**
 * Fail-closed catalog boundary. Only manifests emitted by the audited uploader
 * can make a template visible to preview or checkout.
 */
export function isPublishableTemplateMeta(value: unknown): value is TemplateMeta {
  if (!value || typeof value !== 'object') return false
  const template = value as Partial<TemplateMeta>
  const validation = template.validation
  if (
    template.editable !== true ||
    validation?.status !== 'passed' ||
    validation.contractVersion !== 2 ||
    !Array.isArray(validation.tokens) ||
    validation.tokens.length === 0 ||
    typeof template.artifactSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(template.artifactSha256) ||
    typeof template.catalogReportSha256 !== 'string' ||
    template.catalogReportSha256 !== launchCatalogContract.curatedReportSha256
  ) {
    return false
  }
  if (
    typeof template.slug !== 'string' ||
    !/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(template.slug) ||
    typeof template.nicheSlug !== 'string' ||
    typeof template.dir !== 'string' ||
    !safeTemplateKey(template.dir) ||
    !Array.isArray(template.pages) ||
    template.pages.length === 0 ||
    !template.pages.every((page) => typeof page === 'string' && Boolean(safeTemplateKey(page))) ||
    !Array.isArray(template.files) ||
    !template.files.every((file) => typeof file === 'string' && Boolean(safeTemplateKey(file))) ||
    !template.pages.every((page) => template.files!.includes(page)) ||
    !Array.isArray(template.fields)
  ) {
    return false
  }

  const tokens = new Set(validation.tokens)
  if (
    tokens.size !== validation.tokens.length ||
    validation.tokens.some((token) => !/^[A-Z0-9_]+$/.test(token))
  ) {
    return false
  }
  const fields = new Set(
    template.fields
      .map((field) => typeof field?.name === 'string' ? field.name.trim().toUpperCase() : '')
      .filter(Boolean),
  )
  return fields.size === tokens.size && [...tokens].every((token) => fields.has(token))
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
  const resolvedRoot = path.resolve(root)
  const resolvedPath = path.resolve(root, ...parts)
  const relative = path.relative(resolvedRoot, resolvedPath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null
  return resolvedPath
}

/** Exact identities used by readiness checks; never exposes file contents. */
export async function getLaunchCatalogIdentitySnapshot() {
  const cache = await getCache()
  return [...cache.entries()].map(([slug, templates]) => ({
    slug,
    templates: templates.map((template) => ({
      slug: template.slug,
      artifactSha256: template.artifactSha256,
    })),
  }))
}

function safeTemplateKey(...parts: string[]): string | null {
  const combined = parts.join('/')
  if (!combined || combined.startsWith('/') || combined.includes('\\') || /[\0-\x1f]/.test(combined)) {
    return null
  }
  const segments = combined.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return null
  }
  return segments.join('/')
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
  const templateKey = safeTemplateKey(template.dir, filePath)
  if (!templateKey) return null

  // 1. Filesystem (local dev / build)
  const fsRoot = getFsRoot()
  if (fsRoot) {
    const fullPath = safeJoin(fsRoot, ...templateKey.split('/'))
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
      const text = await store.get(templateKey)
      if (text !== null) return text
    }
  } catch { /* fall through */ }

  // 3. HTTP fallback (last resort)
  try {
    const baseUrl = templateBaseUrl()
    if (!baseUrl) return null
    const encodedKey = templateKey.split('/').map(encodeURIComponent).join('/')
    const url = `${baseUrl}/_templates/${encodedKey}`
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
  const templateKey = safeTemplateKey(template.dir, filePath)
  if (!templateKey) return null

  // 1. Filesystem (local dev / build)
  const fsRoot = getFsRoot()
  if (fsRoot) {
    const fullPath = safeJoin(fsRoot, ...templateKey.split('/'))
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
      const buf = await store.get(templateKey, { type: 'arrayBuffer' })
      if (buf !== null) return Buffer.from(buf)
    }
  } catch { /* fall through */ }

  // 3. HTTP fallback (last resort)
  try {
    const baseUrl = templateBaseUrl()
    if (!baseUrl) return null
    const encodedKey = templateKey.split('/').map(encodeURIComponent).join('/')
    const url = `${baseUrl}/_templates/${encodedKey}`
    const res = await fetch(url)
    if (!res.ok) return null
    const arr = await res.arrayBuffer()
    return Buffer.from(arr)
  } catch {
    return null
  }
}
