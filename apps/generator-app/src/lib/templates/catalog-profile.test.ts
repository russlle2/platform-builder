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
