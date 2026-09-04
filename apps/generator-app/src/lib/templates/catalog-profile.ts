import { createHash } from 'node:crypto'
import rehabCatalogContract from './rehab-catalog-contract.json'

export type TemplateCatalogProfile = 'launch' | 'rehab-staging'

export const TEMPLATE_CATALOG_PROFILE_ENV = 'DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE'
export const LAUNCH_TEMPLATE_STORE = 'templates'
export const REHAB_STAGING_TEMPLATE_STORE = 'templates-rehab-staging'
export const REHAB_STAGING_ACTIVE_KEY = '_active.json'
export const REHAB_STAGING_EXPECTED_TOTAL = rehabCatalogContract.totalTemplates
export const REHAB_STAGING_EXPECTED_BY_NICHE: Readonly<Record<string, number>> = Object.freeze({
  ...rehabCatalogContract.templatesByNiche,
})

const SHA256 = /^[a-f0-9]{64}$/
const SAFE_SEGMENT = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/
const SAFE_RELATIVE_FILE = /^(?!\/)(?!.*\\)(?!.*(?:^|\/)\.{1,2}(?:\/|$))[A-Za-z0-9._/-]+$/
const V3_ID = {
  designId: /^design_[A-Za-z0-9_-]+$/,
  contentPresetId: /^content_[A-Za-z0-9_-]+$/,
  themePresetId: /^theme_[A-Za-z0-9_-]+$/,
  qualityReceipt: /^receipt_[A-Za-z0-9_-]+$/,
} as const

export interface TemplateCatalogProfileConfig {
  profile: TemplateCatalogProfile
  storeName: typeof LAUNCH_TEMPLATE_STORE | typeof REHAB_STAGING_TEMPLATE_STORE
}

export interface RehabStagingActivePointer {
  version: 1
  profile: 'rehab-staging'
  catalogHash: string
  catalogKey: string
  manifestHash: string
  manifestKey: string
  sourceTemplates: number
  activatedAt: string
}

export interface RehabCatalogStore {
  get(key: string, options?: { type?: 'json' | 'arrayBuffer' }): Promise<unknown>
}

export interface LoadedRehabStagingCatalog {
  profile: 'rehab-staging'
  storeName: typeof REHAB_STAGING_TEMPLATE_STORE
  prefix: string
  manifest: Record<string, unknown[]>
  catalog: Record<string, unknown>
  pointer: RehabStagingActivePointer
}

export interface RehabCatalogValidation {
  pass: boolean
  errors: string[]
  totalTemplates: number
  countsByNiche: Record<string, number>
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function catalogDocumentHash(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

export function catalogManifestHash(value: unknown): string {
  return catalogDocumentHash(canonicalJson(value))
}

function deploymentContext(env: Readonly<Record<string, string | undefined>>): string {
  return (env.CONTEXT ?? env.NETLIFY_CONTEXT ?? '').trim().toLowerCase()
}

/**
 * Resolve the server-side catalogue source. The public environment namespace
 * is intentionally ignored so browser input can never select a Blob store.
 */
export function resolveTemplateCatalogProfile(
  env: Readonly<Record<string, string | undefined>> = process.env,
): TemplateCatalogProfileConfig {
  const raw = (env[TEMPLATE_CATALOG_PROFILE_ENV] ?? 'launch').trim().toLowerCase()
  if (raw === 'launch') return { profile: 'launch', storeName: LAUNCH_TEMPLATE_STORE }
  if (raw !== 'rehab-staging') {
    throw new Error(`${TEMPLATE_CATALOG_PROFILE_ENV} must be launch or rehab-staging`)
  }

  const context = deploymentContext(env)
  const explicitlyNonProduction = ['deploy-preview', 'branch-deploy', 'dev', 'development', 'test'].includes(context)
  if (
    context === 'production'
    || context === 'prod'
    || (env.NODE_ENV === 'production' && !explicitlyNonProduction)
  ) {
    throw new Error('The rehab-staging template catalogue profile is forbidden in production')
  }
  return { profile: 'rehab-staging', storeName: REHAB_STAGING_TEMPLATE_STORE }
}

export function rehabCatalogPrefix(catalogHash: string): string {
  if (!SHA256.test(catalogHash)) throw new Error('Rehabilitation catalogue hash must be a lowercase SHA-256 digest')
  return `catalogs/${catalogHash}`
}

export function createRehabStagingActivePointer(input: {
  catalogHash: string
  manifestHash: string
  activatedAt?: string
}): RehabStagingActivePointer {
  if (!SHA256.test(input.catalogHash) || !SHA256.test(input.manifestHash)) {
    throw new Error('Rehabilitation active pointer requires valid catalogue and manifest hashes')
  }
  const activatedAt = input.activatedAt ?? new Date().toISOString()
  if (!Number.isFinite(Date.parse(activatedAt))) throw new Error('Rehabilitation activation time is invalid')
  const prefix = rehabCatalogPrefix(input.catalogHash)
  return {
    version: 1,
    profile: 'rehab-staging',
    catalogHash: input.catalogHash,
    catalogKey: `${prefix}/_catalog-v3.json`,
    manifestHash: input.manifestHash,
    manifestKey: `${prefix}/_manifest.json`,
    sourceTemplates: REHAB_STAGING_EXPECTED_TOTAL,
    activatedAt,
  }
}

export function validateRehabStagingActivePointer(value: unknown): RehabStagingActivePointer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Rehabilitation active pointer is missing or malformed')
  }
  const pointer = value as Partial<RehabStagingActivePointer>
  if (
    pointer.version !== 1
    || pointer.profile !== 'rehab-staging'
    || typeof pointer.catalogHash !== 'string'
    || !SHA256.test(pointer.catalogHash)
    || typeof pointer.manifestHash !== 'string'
    || !SHA256.test(pointer.manifestHash)
    || pointer.sourceTemplates !== REHAB_STAGING_EXPECTED_TOTAL
    || typeof pointer.activatedAt !== 'string'
    || !Number.isFinite(Date.parse(pointer.activatedAt))
  ) {
    throw new Error('Rehabilitation active pointer failed its contract')
  }
  const prefix = rehabCatalogPrefix(pointer.catalogHash)
  if (
    pointer.catalogKey !== `${prefix}/_catalog-v3.json`
    || pointer.manifestKey !== `${prefix}/_manifest.json`
  ) {
    throw new Error('Rehabilitation active pointer escaped its content-addressed catalogue prefix')
  }
  return pointer as RehabStagingActivePointer
}

function safeMappingIdentity(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const mapping = value as Record<string, unknown>
  return (
    typeof mapping.niche === 'string' && SAFE_SEGMENT.test(mapping.niche)
    && typeof mapping.legacySlug === 'string' && SAFE_SEGMENT.test(mapping.legacySlug)
    && typeof mapping.canonicalLegacySlug === 'string' && SAFE_SEGMENT.test(mapping.canonicalLegacySlug)
    && (mapping.disposition === 'canonical' || mapping.disposition === 'alias')
    && ((mapping.disposition === 'canonical') === (mapping.legacySlug === mapping.canonicalLegacySlug))
    && Object.entries(V3_ID).every(([field, pattern]) => (
      typeof mapping[field] === 'string' && pattern.test(mapping[field] as string)
    ))
  )
}

/** Validate the complete immutable rehab snapshot and its runtime manifest. */
export function validateRehabStagingCatalogDocuments(
  manifestValue: unknown,
  catalogValue: unknown,
): RehabCatalogValidation {
  const errors: string[] = []
  const manifest = manifestValue && typeof manifestValue === 'object' && !Array.isArray(manifestValue)
    ? manifestValue as Record<string, unknown>
    : null
  const catalog = catalogValue && typeof catalogValue === 'object' && !Array.isArray(catalogValue)
    ? catalogValue as Record<string, unknown>
    : null
  if (!manifest) errors.push('rehabilitation runtime manifest is missing or malformed')
  if (!catalog) errors.push('rehabilitation catalogue document is missing or malformed')

  const countsByNiche: Record<string, number> = {}
  const manifestByKey = new Map<string, Record<string, unknown>>()
  if (manifest) {
    for (const [niche, expected] of Object.entries(REHAB_STAGING_EXPECTED_BY_NICHE)) {
      const entries = manifest[niche]
      const count = Array.isArray(entries) ? entries.length : 0
      countsByNiche[niche] = count
      if (!Array.isArray(entries)) {
        errors.push(`${niche}: rehabilitation manifest entry is missing or malformed`)
        continue
      }
      if (count !== expected) errors.push(`${niche}: expected ${expected}, found ${count}`)
      for (const [index, raw] of entries.entries()) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          errors.push(`${niche}[${index}]: malformed runtime template entry`)
          continue
        }
        const entry = raw as Record<string, unknown>
        const slug = entry.legacySlug
        const validation = entry.validation as Record<string, unknown> | undefined
        const pages = Array.isArray(entry.pages) ? entry.pages : []
        const files = Array.isArray(entry.files) ? entry.files : []
        const fields = Array.isArray(entry.fields) ? entry.fields : []
        const tokens = Array.isArray(validation?.tokens) ? validation.tokens : []
        const fieldNames = new Set(fields.map((field) => (
          field && typeof field === 'object' && !Array.isArray(field)
            ? String((field as Record<string, unknown>).name ?? '').trim().toUpperCase()
            : ''
        )).filter(Boolean))
        if (
          typeof slug !== 'string' || !SAFE_SEGMENT.test(slug)
          || entry.slug !== slug
          || entry.nicheSlug !== niche
          || entry.dir !== `${niche}/${slug}`
          || entry.editable !== true
          || validation?.status !== 'passed'
          || validation.contractVersion !== 3
          || tokens.length === 0
          || tokens.some((token) => typeof token !== 'string' || !/^[A-Z0-9_]+$/.test(token))
          || new Set(tokens).size !== tokens.length
          || fieldNames.size !== tokens.length
          || tokens.some((token) => !fieldNames.has(token as string))
          || pages.length === 0
          || pages.some((page) => typeof page !== 'string' || !SAFE_RELATIVE_FILE.test(page) || !/\.html?$/i.test(page))
          || new Set(pages).size !== pages.length
          || files.length === 0
          || files.some((file) => typeof file !== 'string' || !SAFE_RELATIVE_FILE.test(file))
          || new Set(files).size !== files.length
          || pages.some((page) => !files.includes(page))
          || !Object.entries(V3_ID).every(([field, pattern]) => (
            typeof entry[field] === 'string' && pattern.test(entry[field] as string)
          ))
          || typeof entry.canonicalLegacySlug !== 'string'
          || !SAFE_SEGMENT.test(entry.canonicalLegacySlug)
          || !['canonical', 'alias'].includes(String(entry.disposition))
          || ((entry.disposition === 'canonical') !== (entry.legacySlug === entry.canonicalLegacySlug))
        ) {
          errors.push(`${niche}[${index}]: runtime template contract is incomplete`)
          continue
        }
        const key = `${niche}/${slug}`
        if (manifestByKey.has(key)) errors.push(`rehabilitation manifest repeats ${key}`)
        else manifestByKey.set(key, entry)
      }
    }
    for (const niche of Object.keys(manifest)) {
      if (!Object.prototype.hasOwnProperty.call(REHAB_STAGING_EXPECTED_BY_NICHE, niche)) {
        errors.push(`${niche}: unexpected rehabilitation niche`)
        countsByNiche[niche] = Array.isArray(manifest[niche]) ? manifest[niche].length : 0
      }
    }
  }

  const totalTemplates = Object.values(countsByNiche).reduce((sum, count) => sum + count, 0)
  if (totalTemplates !== REHAB_STAGING_EXPECTED_TOTAL) {
    errors.push(`rehabilitation total: expected ${REHAB_STAGING_EXPECTED_TOTAL}, found ${totalTemplates}`)
  }

  const mappingsByKey = new Map<string, Record<string, unknown>>()
  if (catalog) {
    if (
      catalog.contractVersion !== 3
      || catalog.sourceTemplates !== REHAB_STAGING_EXPECTED_TOTAL
      || !Array.isArray(catalog.templates)
      || catalog.templates.length !== REHAB_STAGING_EXPECTED_TOTAL
      || !catalog.gallery || typeof catalog.gallery !== 'object' || Array.isArray(catalog.gallery)
    ) errors.push('rehabilitation catalogue document failed its v3/count contract')
    if (Array.isArray(catalog.templates)) {
      for (const raw of catalog.templates) {
        if (!safeMappingIdentity(raw)) {
          errors.push('rehabilitation catalogue contains a malformed mapping')
          continue
        }
        const key = `${raw.niche}/${raw.legacySlug}`
        if (mappingsByKey.has(key)) errors.push(`rehabilitation catalogue repeats ${key}`)
        else mappingsByKey.set(key, raw)
      }
    }
  }

  for (const [key, entry] of manifestByKey) {
    const mapping = mappingsByKey.get(key)
    if (!mapping) {
      errors.push(`rehabilitation catalogue is missing ${key}`)
      continue
    }
    for (const field of ['designId', 'contentPresetId', 'themePresetId', 'qualityReceipt', 'canonicalLegacySlug', 'disposition']) {
      if (entry[field] !== mapping[field]) errors.push(`rehabilitation ${field} differs for ${key}`)
    }
    const canonicalKey = `${mapping.niche}/${mapping.canonicalLegacySlug}`
    const canonical = mappingsByKey.get(canonicalKey)
    if (
      !canonical
      || canonical.disposition !== 'canonical'
      || canonical.legacySlug !== canonical.canonicalLegacySlug
      || canonical.designId !== mapping.designId
    ) errors.push(`rehabilitation canonical lineage is invalid for ${key}`)
  }
  for (const key of mappingsByKey.keys()) {
    if (!manifestByKey.has(key)) errors.push(`rehabilitation catalogue has unknown mapping ${key}`)
  }

  const expectedGallery: Record<string, string[]> = {}
  for (const mapping of mappingsByKey.values()) {
    if (mapping.disposition !== 'canonical') continue
    const niche = mapping.niche as string
    const entries = expectedGallery[niche] ?? []
    entries.push(mapping.legacySlug as string)
    expectedGallery[niche] = entries
  }
  for (const values of Object.values(expectedGallery)) values.sort()
  const canonicalDesigns = new Set([...mappingsByKey.values()]
    .filter((mapping) => mapping.disposition === 'canonical')
    .map((mapping) => mapping.designId))
  if (catalog?.canonicalDesigns !== canonicalDesigns.size) {
    errors.push(`rehabilitation canonical design count differs: declared=${String(catalog?.canonicalDesigns)} actual=${canonicalDesigns.size}`)
  }
  if (catalog?.gallery && typeof catalog.gallery === 'object' && !Array.isArray(catalog.gallery)) {
    const gallery = catalog.gallery as Record<string, unknown>
    for (const niche of new Set([...Object.keys(REHAB_STAGING_EXPECTED_BY_NICHE), ...Object.keys(gallery)])) {
      const actual = gallery[niche]
      const expected = expectedGallery[niche] ?? []
      if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
        errors.push(`rehabilitation gallery differs for ${niche}`)
      }
    }
  }

  return { pass: errors.length === 0, errors, totalTemplates, countsByNiche }
}

async function getJson(store: RehabCatalogStore, key: string): Promise<unknown> {
  return store.get(key, { type: 'json' })
}

async function getText(store: RehabCatalogStore, key: string): Promise<string> {
  const value = await store.get(key)
  if (typeof value !== 'string') throw new Error(`Rehabilitation catalogue object is missing: ${key}`)
  return value
}

/**
 * Load exactly one active, immutable rehab catalogue from its dedicated store.
 * The caller supplies only that store; there is deliberately no launch-store,
 * filesystem, or HTTP fallback in this code path.
 */
export async function loadRehabStagingCatalog(
  store: RehabCatalogStore,
): Promise<LoadedRehabStagingCatalog> {
  const pointer = validateRehabStagingActivePointer(await getJson(store, REHAB_STAGING_ACTIVE_KEY))
  const [catalogText, manifest] = await Promise.all([
    getText(store, pointer.catalogKey),
    getJson(store, pointer.manifestKey),
  ])
  if (catalogDocumentHash(catalogText) !== pointer.catalogHash) {
    throw new Error('Active rehabilitation catalogue bytes do not match the pointer hash')
  }
  if (catalogManifestHash(manifest) !== pointer.manifestHash) {
    throw new Error('Active rehabilitation manifest does not match the pointer hash')
  }
  let catalog: unknown
  try {
    catalog = JSON.parse(catalogText)
  } catch {
    throw new Error('Active rehabilitation catalogue document is malformed JSON')
  }
  const validation = validateRehabStagingCatalogDocuments(manifest, catalog)
  if (!validation.pass) {
    throw new Error(`Active rehabilitation catalogue failed validation: ${validation.errors.join('; ')}`)
  }
  return {
    profile: 'rehab-staging',
    storeName: REHAB_STAGING_TEMPLATE_STORE,
    prefix: rehabCatalogPrefix(pointer.catalogHash),
    manifest: manifest as Record<string, unknown[]>,
    catalog: catalog as Record<string, unknown>,
    pointer,
  }
}
