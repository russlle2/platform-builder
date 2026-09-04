import fs from 'fs'
import path from 'path'
import { getStore } from '@netlify/blobs'
import { NICHE_META, NICHE_SLUGS, getNicheSlugs } from './niche-meta'
import { inspectLaunchCatalog } from './launch-catalog-integrity'
import {
  LAUNCH_TEMPLATE_STORE,
  REHAB_STAGING_EXPECTED_BY_NICHE,
  REHAB_STAGING_EXPECTED_TOTAL,
  loadRehabCatalogSnapshot,
  loadRehabStagingCatalog,
  resolveTemplateCatalogProfile,
  type TemplateCatalogProfile,
} from './catalog-profile'
import {
  assertCatalogRevision,
  catalogSnapshotLocator,
  sanitizeCatalogSnapshotLocator,
  sanitizeCatalogRevisionPin,
  type CatalogSnapshotLocator,
  type CatalogRevisionPin,
} from '../catalog-revision'
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
  /** Original addressable slug; retained even when its design is deduplicated from the gallery. */
  legacySlug?: string
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
  /** Catalogue v3 separates shared design structure from per-slug copy/theme. */
  designId?: string
  contentPresetId?: string
  themePresetId?: string
  qualityReceipt?: string
  canonicalLegacySlug?: string
  disposition?: 'canonical' | 'alias'
  /** Runtime-only immutable snapshot coordinates; never embedded in the manifest. */
  catalogHash?: string
  /** Runtime-only immutable snapshot coordinates; never embedded in the manifest. */
  manifestHash?: string
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
function getBlobsStore(name = LAUNCH_TEMPLATE_STORE) {
  try {
    return getStore({ name, consistency: 'strong' })
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

interface CatalogState {
  profile: TemplateCatalogProfile
  storeName: string
  prefix: string
  manifest: ManifestShape
  catalogHash?: string
  manifestHash?: string
}

let _catalogStatePromise: Promise<CatalogState> | null = null
let _catalogStateExpiresAt = 0
let _catalogStateProfile: TemplateCatalogProfile | null = null

function loadCatalogState(): Promise<CatalogState> {
  const profile = resolveTemplateCatalogProfile(process.env)
  if (
    _catalogStatePromise
    && _catalogStateProfile === profile.profile
    && Date.now() < _catalogStateExpiresAt
  ) return _catalogStatePromise

  const request: Promise<CatalogState> = (async (): Promise<CatalogState> => {
    if (profile.profile === 'rehab-staging') {
      // This branch is intentionally Blob-only. It must never fall back to the
      // launch filesystem, launch store, or public HTTP manifest.
      const store = getBlobsStore(profile.storeName)
      if (!store) {
        console.error('[niche-registry] rehabilitation staging Blob store is unavailable')
        return { profile: profile.profile, storeName: profile.storeName, prefix: '', manifest: {} }
      }
      try {
        const loaded = await loadRehabStagingCatalog(store)
        return {
          profile: loaded.profile,
          storeName: loaded.storeName,
          prefix: loaded.prefix,
          manifest: loaded.manifest as ManifestShape,
          catalogHash: loaded.pointer.catalogHash,
          manifestHash: loaded.pointer.manifestHash,
        }
      } catch (error) {
        console.error('[niche-registry] rehabilitation staging catalogue failed closed:', error)
        return { profile: profile.profile, storeName: profile.storeName, prefix: '', manifest: {} }
      }
    }

    // 1. Filesystem (local dev / build)
    const fsRoot = getFsRoot()
    if (fsRoot) {
      const p = path.join(fsRoot, MANIFEST_RELATIVE)
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8')
          return { profile: profile.profile, storeName: profile.storeName, prefix: '', manifest: JSON.parse(raw) as ManifestShape }
        }
      } catch (err) {
        console.error('[niche-registry] failed reading manifest from fs:', err)
      }
    }

    // 2. Netlify Blobs (production runtime)
    try {
      const store = getBlobsStore(profile.storeName)
      if (store) {
        const data = await store.get('_manifest.json', { type: 'json' })
        if (data) return { profile: profile.profile, storeName: profile.storeName, prefix: '', manifest: data as ManifestShape }
      }
    } catch (err) {
      console.error('[niche-registry] failed reading manifest from Blobs:', err)
    }

    // 3. HTTP fallback (last resort)
    try {
      const baseUrl = templateBaseUrl()
      if (!baseUrl) return { profile: profile.profile, storeName: profile.storeName, prefix: '', manifest: {} }
      const url = `${baseUrl}/_templates/${MANIFEST_RELATIVE}`
      const res = await fetch(url)
      if (res.ok) {
        return { profile: profile.profile, storeName: profile.storeName, prefix: '', manifest: await res.json() as ManifestShape }
      }
      console.error(`[niche-registry] manifest fetch ${url} -> ${res.status}`)
    } catch (err) {
      console.error('[niche-registry] failed fetching manifest:', err)
    }

    return { profile: profile.profile, storeName: profile.storeName, prefix: '', manifest: {} }
  })()

  _catalogStatePromise = request
  _catalogStateProfile = profile.profile
  // Keep concurrent callers on one request, but retry quickly after a missing
  // manifest and periodically refresh healthy Blob-backed catalogs.
  _catalogStateExpiresAt = Number.POSITIVE_INFINITY
  request.then(
    (state) => {
      if (_catalogStatePromise !== request) return
      _catalogStateExpiresAt = Date.now() + (
        Object.keys(state.manifest).length > 0
          ? MANIFEST_CACHE_TTL_MS
          : EMPTY_MANIFEST_CACHE_TTL_MS
      )
    },
    () => {
      if (_catalogStatePromise === request) {
        _catalogStatePromise = null
        _catalogStateExpiresAt = 0
        _catalogStateProfile = null
      }
    },
  )
  return request
}

const historicalCatalogStatePromises = new Map<string, Promise<CatalogState>>()
const MAX_HISTORICAL_CATALOG_CACHE = 4

/**
 * Resolve an immutable catalogue snapshot inside the one server-selected
 * store. Hashless legacy pins deliberately stay on the active catalogue.
 */
async function loadCatalogStateAtSnapshot(locator: CatalogSnapshotLocator): Promise<CatalogState> {
  const active = await loadCatalogState()
  if (
    active.catalogHash === locator.catalogHash &&
    active.manifestHash === locator.manifestHash
  ) return active

  const key = `${active.profile}:${active.storeName}:${locator.catalogHash}:${locator.manifestHash}`
  const cached = historicalCatalogStatePromises.get(key)
  if (cached) {
    // Refresh insertion order so the small cache behaves as an LRU.
    historicalCatalogStatePromises.delete(key)
    historicalCatalogStatePromises.set(key, cached)
    return cached
  }

  const request = (async (): Promise<CatalogState> => {
    const store = getBlobsStore(active.storeName)
    if (!store) throw new Error('Historical template catalogue store is unavailable')
    const loaded = await loadRehabCatalogSnapshot(store, locator)
    return {
      profile: active.profile,
      storeName: active.storeName,
      prefix: loaded.prefix,
      manifest: loaded.manifest as ManifestShape,
      catalogHash: loaded.catalogHash,
      manifestHash: loaded.manifestHash,
    }
  })()
  while (historicalCatalogStatePromises.size >= MAX_HISTORICAL_CATALOG_CACHE) {
    const oldest = historicalCatalogStatePromises.keys().next().value as string | undefined
    if (!oldest) break
    historicalCatalogStatePromises.delete(oldest)
  }
  historicalCatalogStatePromises.set(key, request)
  request.catch(() => {
    if (historicalCatalogStatePromises.get(key) === request) {
      historicalCatalogStatePromises.delete(key)
    }
  })
  return request
}

async function loadCatalogStateAtRevision(expected: CatalogRevisionPin): Promise<CatalogState> {
  const locator = catalogSnapshotLocator(expected)
  return locator ? loadCatalogStateAtSnapshot(locator) : loadCatalogState()
}

function templateFromCatalogState(
  state: CatalogState,
  nicheSlug: string,
  templateSlug: string,
): TemplateMeta | null {
  const value = (state.manifest[nicheSlug] || []).find((template) => template.slug === templateSlug)
  if (!isPublishableTemplateMeta(value)) return null
  if (
    value.validation?.contractVersion === 3 &&
    state.catalogHash && state.manifestHash
  ) {
    return {
      ...value,
      catalogHash: state.catalogHash,
      manifestHash: state.manifestHash,
    }
  }
  return value
}

interface TemplateCaches {
  all: Map<string, TemplateMeta[]>
  gallery: Map<string, TemplateMeta[]>
}

export function dedupeTemplatesForGallery(templates: readonly TemplateMeta[]): TemplateMeta[] {
  const seenDesigns = new Set<string>()
  return templates.filter((template) => {
    if (template.disposition === 'alias') return false
    if (!template.designId) return true
    if (seenDesigns.has(template.designId)) return false
    seenDesigns.add(template.designId)
    return true
  })
}

async function getCaches(): Promise<TemplateCaches> {
  const state = await loadCatalogState()
  const manifest = state.manifest
  const all = new Map<string, TemplateMeta[]>()
  for (const nicheSlug of Object.keys(NICHE_META)) {
    const templates = manifest[nicheSlug] || []
    const publishable = templates
      .filter(isPublishableTemplateMeta)
      .map((template) => (
        template.validation?.contractVersion === 3 && state.catalogHash && state.manifestHash
          ? { ...template, catalogHash: state.catalogHash, manifestHash: state.manifestHash }
          : template
      ))
    if (publishable.length !== templates.length) {
      console.warn(
        `[niche-registry] quarantined ${templates.length - publishable.length} ` +
        `unvalidated template(s) in ${nicheSlug}`,
      )
    }
    all.set(nicheSlug, publishable)
  }

  const counts = [...all.entries()].map(([slug, templates]) => ({ slug, templateCount: templates.length }))
  const integrity = state.profile === 'launch'
    ? inspectLaunchCatalog(counts)
    : (() => {
        const actualByNiche = Object.fromEntries(counts.map(({ slug, templateCount }) => [slug, templateCount]))
        const issues = Object.entries(REHAB_STAGING_EXPECTED_BY_NICHE)
          .filter(([slug, expected]) => actualByNiche[slug] !== expected)
          .map(([slug, expected]) => `${slug}: expected ${expected}, found ${actualByNiche[slug] ?? 0}`)
        const actualTotal = Object.values(actualByNiche).reduce((sum, count) => sum + count, 0)
        if (actualTotal !== REHAB_STAGING_EXPECTED_TOTAL) {
          issues.push(`total: expected ${REHAB_STAGING_EXPECTED_TOTAL}, found ${actualTotal}`)
        }
        return { ready: issues.length === 0, issues }
      })()
  if (!integrity.ready) {
    console.error(
      `[niche-registry] ${state.profile} catalog integrity failed; disabling the catalog: ${integrity.issues.join('; ')}`,
    )
    for (const nicheSlug of Object.keys(NICHE_META)) all.set(nicheSlug, [])
  }

  const gallery = new Map<string, TemplateMeta[]>()
  for (const [nicheSlug, templates] of all) {
    // v2 entries have no design ID and remain individually visible. v3
    // aliases retain direct URL resolution in `all`, while only the first
    // deterministic representative of each design appears in the gallery.
    gallery.set(nicheSlug, dedupeTemplatesForGallery(templates))
  }
  return { all, gallery }
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
    ![2, 3].includes(validation.contractVersion) ||
    !Array.isArray(validation.tokens) ||
    validation.tokens.length === 0
  ) {
    return false
  }
  if (validation.contractVersion === 3 && (
    typeof template.designId !== 'string' || !/^design_[A-Za-z0-9_-]+$/.test(template.designId) ||
    typeof template.contentPresetId !== 'string' || !/^content_[A-Za-z0-9_-]+$/.test(template.contentPresetId) ||
    typeof template.themePresetId !== 'string' || !/^theme_[A-Za-z0-9_-]+$/.test(template.themePresetId) ||
    typeof template.qualityReceipt !== 'string' || !/^receipt_[A-Za-z0-9_-]+$/.test(template.qualityReceipt) ||
    typeof template.legacySlug !== 'string' || !/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(template.legacySlug) ||
    typeof template.canonicalLegacySlug !== 'string' || !/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(template.canonicalLegacySlug) ||
    !['canonical', 'alias'].includes(template.disposition || '') ||
    (template.disposition === 'canonical') !== (template.legacySlug === template.canonicalLegacySlug)
  )) {
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
  const cache = (await getCaches()).gallery
  return Object.entries(NICHE_META).map(([slug, meta]) => ({
    slug,
    ...meta,
    templateCount: cache.get(slug)?.length || 0,
  }))
}

/** Get all templates for a niche */
export async function getTemplatesForNiche(nicheSlug: string): Promise<TemplateMeta[]> {
  const cache = (await getCaches()).gallery
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
  const templates = (await getCaches()).all.get(nicheSlug) || []
  return templates.find((t) => t.slug === templateSlug) || null
}

/** Resolve and verify the exact catalogue revision captured for a customer. */
export async function getTemplateAtCatalogRevision(
  nicheSlug: string,
  templateSlug: string,
  expectedValue: unknown,
): Promise<TemplateMeta | null> {
  if (expectedValue === undefined || expectedValue === null) {
    return getTemplate(nicheSlug, templateSlug)
  }
  const expected = sanitizeCatalogRevisionPin(expectedValue)
  if (!expected) throw new Error('Saved catalogue revision pin is invalid.')
  const locator = catalogSnapshotLocator(expected)
  const template = locator
    ? templateFromCatalogState(
        await loadCatalogStateAtSnapshot(locator),
        nicheSlug,
        templateSlug,
      )
    : await getTemplate(nicheSlug, templateSlug)
  if (!template) return null
  assertCatalogRevision(template, expected)
  return template
}

/** Resolve a public template from one verified content-addressed snapshot. */
export async function getTemplateAtCatalogSnapshot(
  nicheSlug: string,
  templateSlug: string,
  locatorValue: unknown,
): Promise<TemplateMeta | null> {
  const locator = sanitizeCatalogSnapshotLocator(locatorValue)
  if (!locator) throw new Error('Catalogue snapshot locator is invalid.')
  return templateFromCatalogState(
    await loadCatalogStateAtSnapshot(locator),
    nicheSlug,
    templateSlug,
  )
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
  catalogRevision?: unknown,
): Promise<string | null> {
  const template = await getTemplateAtCatalogRevision(nicheSlug, templateSlug, catalogRevision)
  if (!template) return null
  const templateKey = safeTemplateKey(template.dir, filePath)
  if (!templateKey) return null

  const revision = catalogRevision === undefined || catalogRevision === null
    ? null
    : sanitizeCatalogRevisionPin(catalogRevision)
  if (catalogRevision !== undefined && catalogRevision !== null && !revision) {
    throw new Error('Saved catalogue revision pin is invalid.')
  }
  const catalog = revision ? await loadCatalogStateAtRevision(revision) : await loadCatalogState()
  if (catalog.prefix) {
    const key = safeTemplateKey(catalog.prefix, templateKey)
    if (!key) return null
    try {
      const store = getBlobsStore(catalog.storeName)
      if (!store) return null
      const text = await store.get(key)
      return typeof text === 'string' ? text : null
    } catch {
      return null
    }
  }

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
    const store = getBlobsStore(catalog.storeName)
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
  catalogRevision?: unknown,
): Promise<Buffer | null> {
  const template = await getTemplateAtCatalogRevision(nicheSlug, templateSlug, catalogRevision)
  if (!template) return null
  const templateKey = safeTemplateKey(template.dir, filePath)
  if (!templateKey) return null

  const revision = catalogRevision === undefined || catalogRevision === null
    ? null
    : sanitizeCatalogRevisionPin(catalogRevision)
  if (catalogRevision !== undefined && catalogRevision !== null && !revision) {
    throw new Error('Saved catalogue revision pin is invalid.')
  }
  const catalog = revision ? await loadCatalogStateAtRevision(revision) : await loadCatalogState()
  if (catalog.prefix) {
    const key = safeTemplateKey(catalog.prefix, templateKey)
    if (!key) return null
    try {
      const store = getBlobsStore(catalog.storeName)
      if (!store) return null
      const value = await store.get(key, { type: 'arrayBuffer' })
      return value instanceof ArrayBuffer ? Buffer.from(value) : null
    } catch {
      return null
    }
  }

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
    const store = getBlobsStore(catalog.storeName)
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
