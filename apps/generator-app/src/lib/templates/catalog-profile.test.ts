import { describe, expect, it } from 'vitest'
import {
  LAUNCH_TEMPLATE_STORE,
  REHAB_STAGING_ACTIVE_KEY,
  REHAB_STAGING_EXPECTED_BY_NICHE,
  REHAB_STAGING_EXPECTED_TOTAL,
  REHAB_STAGING_TEMPLATE_STORE,
  catalogDocumentHash,
  catalogManifestHash,
  createRehabStagingActivePointer,
  loadRehabCatalogSnapshot,
  loadRehabStagingCatalog,
  loadCertifiedCatalog,
  rehabCatalogPrefix,
  resolveTemplateCatalogProfile,
  validateRehabStagingCatalogDocuments,
} from './catalog-profile'
import {
  CERTIFIED_STORE,
  PRODUCTION_NETLIFY_SITE_ID,
  canonicalDigest,
  createCertifiedPointer,
  type Certification,
} from './certified-catalog-contract.mjs'

function completeRehabDocuments(): {
  manifest: Record<string, Array<Record<string, unknown>>>
  catalog: Record<string, unknown>
} {
  const manifest: Record<string, Array<Record<string, unknown>>> = {}
  const mappings: Array<Record<string, unknown>> = []
  const gallery: Record<string, string[]> = {}
  for (const [niche, count] of Object.entries(REHAB_STAGING_EXPECTED_BY_NICHE)) {
    const entries: Array<Record<string, unknown>> = []
    const canonicalSlugs: string[] = []
    for (let index = 0; index < count; index += 1) {
      const slug = `${niche}-${String(index).padStart(4, '0')}`
      const mapping = {
        legacySlug: slug,
        niche,
        designId: `design_${slug}`,
        contentPresetId: `content_${slug}`,
        themePresetId: `theme_${slug}`,
        qualityReceipt: `receipt_${slug}`,
        canonicalLegacySlug: slug,
        disposition: 'canonical',
      }
      entries.push({
        ...mapping,
        slug,
        nicheSlug: niche,
        dir: `${niche}/${slug}`,
        name: slug,
        pages: ['index.html'],
        files: ['index.html'],
        fields: [{ name: 'BUSINESS_NAME', label: 'Business name', type: 'text' }],
        editable: true,
        validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] },
      })
      mappings.push(mapping)
      canonicalSlugs.push(slug)
    }
    manifest[niche] = entries
    gallery[niche] = canonicalSlugs
  }
  return {
    manifest,
    catalog: {
      contractVersion: 3,
      ruleVersion: 'test-rule',
      generatedAt: '2026-09-03T12:00:00.000Z',
      sourceTemplates: REHAB_STAGING_EXPECTED_TOTAL,
      canonicalDesigns: REHAB_STAGING_EXPECTED_TOTAL,
      templates: mappings,
      gallery,
    },
  }
}

function futureHistoricalDocuments(): {
  manifest: Record<string, Array<Record<string, unknown>>>
  catalog: Record<string, unknown>
} {
  const niche = 'future-niche'
  const slug = 'future-template'
  const mapping = {
    legacySlug: slug,
    niche,
    designId: 'design_future-template',
    contentPresetId: 'content_future-template',
    themePresetId: 'theme_future-template',
    qualityReceipt: 'receipt_future-template',
    canonicalLegacySlug: slug,
    disposition: 'canonical',
  }
  return {
    manifest: {
      [niche]: [{
        ...mapping,
        slug,
        nicheSlug: niche,
        dir: `${niche}/${slug}`,
        name: slug,
        pages: ['index.html'],
        files: ['index.html'],
        fields: [{ name: 'BUSINESS_NAME', label: 'Business name', type: 'text' }],
        editable: true,
        validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] },
      }],
    },
    catalog: {
      contractVersion: 3,
      ruleVersion: 'future-rule',
      generatedAt: '2027-01-01T00:00:00.000Z',
      sourceTemplates: 1,
      canonicalDesigns: 1,
      templates: [mapping],
      gallery: { [niche]: [slug] },
    },
  }
}

class MemoryReadStore {
  readonly reads: string[] = []

  constructor(private readonly values: Map<string, unknown>) {}

  async get(key: string, options?: { type?: 'json' | 'arrayBuffer' }): Promise<unknown> {
    this.reads.push(key)
    const value = this.values.get(key)
    if (options?.type === 'json' && typeof value === 'string') return JSON.parse(value)
    return value
  }
}

const STAGING_SITE_ID = '12345678-1234-4234-8234-123456789abc'

function certifiedFixture(documents = completeRehabDocuments()) {
  const catalogText = JSON.stringify(documents.catalog)
  const receipt: Certification = {
    version: 1, profile: 'rehab-certified', releaseSha: 'a'.repeat(40),
    catalogHash: catalogDocumentHash(catalogText), manifestHash: catalogManifestHash(documents.manifest),
    fullGateHash: 'b'.repeat(64), sourceCatalogHash: 'c'.repeat(64),
    templateEvidenceHash: 'd'.repeat(64), fileEvidenceHash: 'e'.repeat(64),
    sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0,
    customizationDiagnostics: 0, files: 16458, pages: 5486,
  }
  const pointer = createCertifiedPointer(receipt, '2026-09-25T12:00:00.000Z')
  const values = new Map<string, unknown>([
    [REHAB_STAGING_ACTIVE_KEY, pointer], [pointer.certificationKey, receipt],
    [pointer.catalogKey, catalogText], [pointer.manifestKey, documents.manifest],
  ])
  return { receipt, pointer, values, store: new MemoryReadStore(values) }
}

describe('template catalogue profile isolation', () => {
  it('defaults to the unchanged launch store and ignores public browser configuration', () => {
    expect(resolveTemplateCatalogProfile({
      NEXT_PUBLIC_DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'rehab-staging',
    })).toEqual({ profile: 'launch', storeName: LAUNCH_TEMPLATE_STORE })
  })

  it('selects the dedicated staging store only in a non-production server context', () => {
    expect(resolveTemplateCatalogProfile({
      DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'rehab-staging',
      CONTEXT: 'deploy-preview',
      NODE_ENV: 'production',
    })).toEqual({ profile: 'rehab-staging', storeName: REHAB_STAGING_TEMPLATE_STORE })

    expect(() => resolveTemplateCatalogProfile({
      DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'rehab-staging',
      CONTEXT: 'production',
    })).toThrow(/forbidden in production/i)
    expect(() => resolveTemplateCatalogProfile({
      DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'rehab-staging',
      NODE_ENV: 'production',
    })).toThrow(/forbidden in production/i)
    expect(() => resolveTemplateCatalogProfile({
      DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'surprise',
    })).toThrow(/must be launch or rehab-staging/i)
  })

  it('allows the pinned staging site production deploy without permitting the actual production site', () => {
    const env = {
      DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'rehab-staging', CONTEXT: 'production', NODE_ENV: 'production',
      DAILYCLARITY_ENVIRONMENT: 'staging', SITE_ID: STAGING_SITE_ID, DAILYCLARITY_STAGING_SITE_ID: STAGING_SITE_ID,
    }
    expect(resolveTemplateCatalogProfile(env)).toEqual({ profile: 'rehab-staging', storeName: REHAB_STAGING_TEMPLATE_STORE })
    for (const invalid of [
      { ...env, SITE_ID: PRODUCTION_NETLIFY_SITE_ID },
      { ...env, SITE_ID: PRODUCTION_NETLIFY_SITE_ID, DAILYCLARITY_STAGING_SITE_ID: PRODUCTION_NETLIFY_SITE_ID },
      { ...env, DAILYCLARITY_STAGING_SITE_ID: undefined },
      { ...env, SITE_ID: undefined },
      { ...env, DAILYCLARITY_ENVIRONMENT: undefined },
      { ...env, DAILYCLARITY_ENVIRONMENT: 'production' },
      { ...env, DAILYCLARITY_ENVIRONMENT: 'preview' },
    ]) expect(() => resolveTemplateCatalogProfile(invalid)).toThrow()
  })

  it('requires both production environment and the fixed production site for certified releases', () => {
    const env = {
      DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'rehab-certified',
      DAILYCLARITY_ENVIRONMENT: 'production', SITE_ID: PRODUCTION_NETLIFY_SITE_ID,
    }
    expect(resolveTemplateCatalogProfile(env)).toEqual({ profile: 'rehab-certified', storeName: CERTIFIED_STORE })
    for (const invalid of [
      { DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'rehab-certified', CONTEXT: 'production' },
      { ...env, DAILYCLARITY_ENVIRONMENT: undefined }, { ...env, DAILYCLARITY_ENVIRONMENT: 'staging' },
      { ...env, DAILYCLARITY_ENVIRONMENT: 'prod' }, { ...env, SITE_ID: undefined },
      { ...env, SITE_ID: STAGING_SITE_ID }, { ...env, SITE_ID: 'wrong' },
    ]) expect(() => resolveTemplateCatalogProfile(invalid)).toThrow()
  })

  it('retains local development behavior while rejecting partial or conflicting deployment pins', () => {
    for (const context of [undefined, 'dev', 'development', 'test', 'branch-deploy', 'deploy-preview']) {
      expect(resolveTemplateCatalogProfile({ DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'rehab-staging', CONTEXT: context })).toEqual({ profile: 'rehab-staging', storeName: REHAB_STAGING_TEMPLATE_STORE })
    }
    for (const pins of [
      { SITE_ID: STAGING_SITE_ID }, { DAILYCLARITY_ENVIRONMENT: 'staging' },
      { DAILYCLARITY_STAGING_SITE_ID: STAGING_SITE_ID }, { DAILYCLARITY_ENVIRONMENT: 'unknown' },
    ]) expect(() => resolveTemplateCatalogProfile({ DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'rehab-staging', CONTEXT: 'dev', ...pins })).toThrow()
  })
})

describe('certified catalogue loader', () => {
  it('loads the complete hash-bound receipt and 5,486-template snapshot from the certified store', async () => {
    const fixture = certifiedFixture()
    const loaded = await loadCertifiedCatalog(fixture.store)
    expect(loaded.profile).toBe('rehab-certified')
    expect(loaded.storeName).toBe(CERTIFIED_STORE)
    expect(Object.values(loaded.manifest).flat()).toHaveLength(5486)
    expect(loaded.pointer.releaseSha).toBe(fixture.receipt.releaseSha)
    expect(fixture.store.reads).toEqual([REHAB_STAGING_ACTIVE_KEY, fixture.pointer.certificationKey, fixture.pointer.catalogKey, fixture.pointer.manifestKey])
  })

  it('rejects receipt tampering before reading the catalogue and has no launch fallback', async () => {
    const fixture = certifiedFixture()
    fixture.values.set(fixture.pointer.certificationKey, { ...fixture.receipt, neutralFallbacks: 1 })
    fixture.values.set('_manifest.json', completeRehabDocuments().manifest)
    await expect(loadCertifiedCatalog(fixture.store)).rejects.toThrow(/receipt hash/i)
    expect(fixture.store.reads).toEqual([REHAB_STAGING_ACTIVE_KEY, fixture.pointer.certificationKey])
    const empty = new MemoryReadStore(new Map([['_manifest.json', {}]]))
    await expect(loadCertifiedCatalog(empty)).rejects.toThrow(/pointer/i)
    expect(empty.reads).toEqual([REHAB_STAGING_ACTIVE_KEY])
  })

  it('rejects self-consistent receipt hashes that do not bind to the approved release and documents', async () => {
    for (const [key, value] of [['releaseSha', 'f'.repeat(40)], ['catalogHash', 'f'.repeat(64)], ['manifestHash', 'f'.repeat(64)]] as const) {
      const fixture = certifiedFixture()
      const altered = { ...fixture.receipt, [key]: value }
      const hash = canonicalDigest(altered)
      const certificationKey = `certifications/${hash}.json`
      fixture.values.set(REHAB_STAGING_ACTIVE_KEY, { ...fixture.pointer, certificationHash: hash, certificationKey })
      fixture.values.set(certificationKey, altered)
      await expect(loadCertifiedCatalog(fixture.store)).rejects.toThrow(/does not match the approved release/i)
      expect(fixture.store.reads).toEqual([REHAB_STAGING_ACTIVE_KEY, certificationKey])
    }
  })

  it('rejects catalogue or manifest tampering despite a valid receipt', async () => {
    const catalogue = certifiedFixture()
    catalogue.values.set(catalogue.pointer.catalogKey, `${String(catalogue.values.get(catalogue.pointer.catalogKey))} `)
    await expect(loadCertifiedCatalog(catalogue.store)).rejects.toThrow(/catalogue bytes do not match/i)
    const manifest = certifiedFixture()
    manifest.values.set(manifest.pointer.manifestKey, {})
    await expect(loadCertifiedCatalog(manifest.store)).rejects.toThrow(/manifest does not match/i)
  })

  it('rejects incomplete or neutral certifications even when their hashes are rebuilt', async () => {
    for (const change of [{ certifiedTemplates: 5485 }, { sourceTemplates: 5485 }, { neutralFallbacks: 1 }, { customizationDiagnostics: 1 }, { pages: 5485 }, { files: 5485 }]) {
      const fixture = certifiedFixture()
      const receipt = { ...fixture.receipt, ...change }
      const hash = canonicalDigest(receipt)
      const certificationKey = `certifications/${hash}.json`
      fixture.values.set(REHAB_STAGING_ACTIVE_KEY, { ...fixture.pointer, certificationHash: hash, certificationKey })
      fixture.values.set(certificationKey, receipt)
      await expect(loadCertifiedCatalog(fixture.store)).rejects.toThrow(/complete browser\/customization evidence/i)
    }
  })

  it('rejects a valid historical snapshot hidden behind an overstated full certification', async () => {
    const fixture = certifiedFixture(futureHistoricalDocuments())
    await expect(loadCertifiedCatalog(fixture.store)).rejects.toThrow(/Certified catalogue failed validation/i)
  })

  it('rejects pointer namespace escapes and profile substitution before any object read', async () => {
    for (const change of [{ catalogKey: '_catalog-v3.json' }, { manifestKey: '../_manifest.json' }, { certificationKey: 'certifications/other.json' }, { profile: 'rehab-staging' }]) {
      const fixture = certifiedFixture()
      fixture.values.set(REHAB_STAGING_ACTIVE_KEY, { ...fixture.pointer, ...change })
      await expect(loadCertifiedCatalog(fixture.store)).rejects.toThrow(/pointer/i)
      expect(fixture.store.reads).toEqual([REHAB_STAGING_ACTIVE_KEY])
    }
  })
})

describe('rehabilitation staging loader', () => {
  it('loads one exact 5,486-template snapshot through its hash-bound pointer', async () => {
    const { manifest, catalog } = completeRehabDocuments()
    const catalogText = `${JSON.stringify(catalog)}\n`
    const catalogHash = catalogDocumentHash(catalogText)
    const pointer = createRehabStagingActivePointer({
      catalogHash,
      manifestHash: catalogManifestHash(manifest),
      activatedAt: '2026-09-03T13:00:00.000Z',
    })
    const store = new MemoryReadStore(new Map<string, unknown>([
      [REHAB_STAGING_ACTIVE_KEY, pointer],
      [pointer.catalogKey, catalogText],
      [pointer.manifestKey, manifest],
    ]))

    const loaded = await loadRehabStagingCatalog(store)

    expect(loaded.prefix).toBe(rehabCatalogPrefix(catalogHash))
    expect(loaded.storeName).toBe(REHAB_STAGING_TEMPLATE_STORE)
    expect(Object.values(loaded.manifest).flat()).toHaveLength(REHAB_STAGING_EXPECTED_TOTAL)
    expect(store.reads).toEqual([
      REHAB_STAGING_ACTIVE_KEY,
      pointer.catalogKey,
      pointer.manifestKey,
    ])
  })

  it('loads a historical snapshot directly without consulting the mutable active pointer', async () => {
    const { manifest, catalog } = futureHistoricalDocuments()
    const catalogText = `${JSON.stringify(catalog)}\n`
    const locator = {
      catalogHash: catalogDocumentHash(catalogText),
      manifestHash: catalogManifestHash(manifest),
    }
    const prefix = rehabCatalogPrefix(locator.catalogHash)
    const store = new MemoryReadStore(new Map<string, unknown>([
      [`${prefix}/_catalog-v3.json`, catalogText],
      [`${prefix}/_manifest.json`, manifest],
    ]))

    const loaded = await loadRehabCatalogSnapshot(store, locator)
    expect(loaded.catalogHash).toBe(locator.catalogHash)
    expect(loaded.manifestHash).toBe(locator.manifestHash)
    expect(store.reads).toEqual([
      `${prefix}/_catalog-v3.json`,
      `${prefix}/_manifest.json`,
    ])
    expect(store.reads).not.toContain(REHAB_STAGING_ACTIVE_KEY)
  })

  it('keeps current staging cardinality checks separate from intrinsic historical validation', async () => {
    const { manifest, catalog } = futureHistoricalDocuments()
    const activeValidation = validateRehabStagingCatalogDocuments(manifest, catalog)
    expect(activeValidation.pass).toBe(false)
    expect(activeValidation.errors.join('\n')).toMatch(/unexpected rehabilitation niche/i)

    const catalogText = `${JSON.stringify(catalog)}\n`
    const locator = {
      catalogHash: catalogDocumentHash(catalogText),
      manifestHash: catalogManifestHash(manifest),
    }
    const prefix = rehabCatalogPrefix(locator.catalogHash)
    const store = new MemoryReadStore(new Map<string, unknown>([
      [`${prefix}/_catalog-v3.json`, catalogText],
      [`${prefix}/_manifest.json`, manifest],
    ]))

    await expect(loadRehabCatalogSnapshot(store, locator)).resolves.toMatchObject(locator)
  })

  it('rejects an empty hash-valid historical snapshot', async () => {
    const manifest = {}
    const catalog = {
      contractVersion: 3,
      ruleVersion: 'empty-rule',
      generatedAt: '2027-01-01T00:00:00.000Z',
      sourceTemplates: 0,
      canonicalDesigns: 0,
      templates: [],
      gallery: {},
    }
    const catalogText = JSON.stringify(catalog)
    const locator = {
      catalogHash: catalogDocumentHash(catalogText),
      manifestHash: catalogManifestHash(manifest),
    }
    const prefix = rehabCatalogPrefix(locator.catalogHash)
    const store = new MemoryReadStore(new Map<string, unknown>([
      [`${prefix}/_catalog-v3.json`, catalogText],
      [`${prefix}/_manifest.json`, manifest],
    ]))

    await expect(loadRehabCatalogSnapshot(store, locator)).rejects.toThrow(/at least one template/i)
  })

  it('rejects multiple historical canonical templates for one design', async () => {
    const { manifest, catalog } = futureHistoricalDocuments()
    const originalEntry = manifest['future-niche']![0]!
    const duplicateSlug = 'future-template-copy'
    const duplicateMapping = {
      legacySlug: duplicateSlug,
      niche: 'future-niche',
      designId: originalEntry.designId,
      contentPresetId: 'content_future-template-copy',
      themePresetId: 'theme_future-template-copy',
      qualityReceipt: 'receipt_future-template-copy',
      canonicalLegacySlug: duplicateSlug,
      disposition: 'canonical',
    }
    manifest['future-niche']!.push({
      ...duplicateMapping,
      slug: duplicateSlug,
      nicheSlug: 'future-niche',
      dir: `future-niche/${duplicateSlug}`,
      name: duplicateSlug,
      pages: ['index.html'],
      files: ['index.html'],
      fields: [{ name: 'BUSINESS_NAME', label: 'Business name', type: 'text' }],
      editable: true,
      validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] },
    })
    ;(catalog.templates as Array<Record<string, unknown>>).push(duplicateMapping)
    catalog.sourceTemplates = 2
    catalog.canonicalDesigns = 1
    ;(catalog.gallery as Record<string, string[]>)['future-niche']!.push(duplicateSlug)

    const catalogText = JSON.stringify(catalog)
    const locator = {
      catalogHash: catalogDocumentHash(catalogText),
      manifestHash: catalogManifestHash(manifest),
    }
    const prefix = rehabCatalogPrefix(locator.catalogHash)
    const store = new MemoryReadStore(new Map<string, unknown>([
      [`${prefix}/_catalog-v3.json`, catalogText],
      [`${prefix}/_manifest.json`, manifest],
    ]))

    await expect(loadRehabCatalogSnapshot(store, locator)).rejects.toThrow(/multiple canonical templates/i)
  })

  it('rejects hash-valid historical documents with malformed provenance or runtime lineage', async () => {
    const malformedProvenance = futureHistoricalDocuments()
    malformedProvenance.catalog.generatedAt = 'not-a-date'
    let catalogText = JSON.stringify(malformedProvenance.catalog)
    let locator = {
      catalogHash: catalogDocumentHash(catalogText),
      manifestHash: catalogManifestHash(malformedProvenance.manifest),
    }
    let prefix = rehabCatalogPrefix(locator.catalogHash)
    let store = new MemoryReadStore(new Map<string, unknown>([
      [`${prefix}/_catalog-v3.json`, catalogText],
      [`${prefix}/_manifest.json`, malformedProvenance.manifest],
    ]))
    await expect(loadRehabCatalogSnapshot(store, locator)).rejects.toThrow(/v3\/count contract/i)

    const malformedLineage = futureHistoricalDocuments()
    malformedLineage.manifest['future-niche']![0]!.legacySlug = 'different-slug'
    catalogText = JSON.stringify(malformedLineage.catalog)
    locator = {
      catalogHash: catalogDocumentHash(catalogText),
      manifestHash: catalogManifestHash(malformedLineage.manifest),
    }
    prefix = rehabCatalogPrefix(locator.catalogHash)
    store = new MemoryReadStore(new Map<string, unknown>([
      [`${prefix}/_catalog-v3.json`, catalogText],
      [`${prefix}/_manifest.json`, malformedLineage.manifest],
    ]))
    await expect(loadRehabCatalogSnapshot(store, locator)).rejects.toThrow(/runtime template contract/i)
  })

  it('fails closed on undersized, tampered, or unpointed data without a launch fallback', async () => {
    const { manifest, catalog } = completeRehabDocuments()
    manifest.aromatherapy!.pop()
    const incomplete = validateRehabStagingCatalogDocuments(manifest, catalog)
    expect(incomplete.pass).toBe(false)
    expect(incomplete.errors.join('\n')).toMatch(/expected 1292, found 1291/i)
    expect(incomplete.errors.join('\n')).toMatch(/expected 5486, found 5485/i)

    const valid = completeRehabDocuments()
    const catalogText = JSON.stringify(valid.catalog)
    const pointer = createRehabStagingActivePointer({
      catalogHash: catalogDocumentHash(catalogText),
      manifestHash: catalogManifestHash(valid.manifest),
    })
    const tampered = new MemoryReadStore(new Map<string, unknown>([
      [REHAB_STAGING_ACTIVE_KEY, pointer],
      [pointer.catalogKey, `${catalogText} `],
      [pointer.manifestKey, valid.manifest],
      ['_manifest.json', valid.manifest],
    ]))
    await expect(loadRehabStagingCatalog(tampered)).rejects.toThrow(/catalogue bytes do not match/i)

    const launchOnly = new MemoryReadStore(new Map([['_manifest.json', valid.manifest]]))
    await expect(loadRehabStagingCatalog(launchOnly)).rejects.toThrow(/active pointer/i)
    expect(launchOnly.reads).toEqual([REHAB_STAGING_ACTIVE_KEY])
  })
})
