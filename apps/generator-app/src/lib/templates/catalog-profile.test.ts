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
  rehabCatalogPrefix,
  resolveTemplateCatalogProfile,
  validateRehabStagingCatalogDocuments,
} from './catalog-profile'

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
