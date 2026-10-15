import { afterEach, expect, it, vi } from 'vitest'
import {
  REHAB_STAGING_ACTIVE_KEY,
  REHAB_STAGING_EXPECTED_BY_NICHE,
  catalogDocumentHash,
  catalogManifestHash,
  createRehabStagingActivePointer,
} from './catalog-profile'

const getStoreMock = vi.hoisted(() => vi.fn())
vi.mock('@netlify/blobs', () => ({ getStore: getStoreMock }))

function completeRuntimeFixture(identitySuffix = '', firstNames: Record<string, string> = {}) {
  const manifest: Record<string, Array<Record<string, unknown>>> = {}
  const mappings: Array<Record<string, unknown>> = []
  const gallery: Record<string, string[]> = {}
  for (const [niche, count] of Object.entries(REHAB_STAGING_EXPECTED_BY_NICHE)) {
    manifest[niche] = []
    gallery[niche] = []
    for (let index = 0; index < count; index += 1) {
      const slug = `${niche}-${String(index).padStart(4, '0')}`
      const mapping = {
        legacySlug: slug,
        niche,
        designId: `design_${slug}${identitySuffix}`,
        contentPresetId: `content_${slug}${identitySuffix}`,
        themePresetId: `theme_${slug}${identitySuffix}`,
        qualityReceipt: `receipt_${slug}${identitySuffix}`,
        canonicalLegacySlug: slug,
        disposition: 'canonical',
      }
      manifest[niche]!.push({
        ...mapping,
        slug,
        nicheSlug: niche,
        dir: `${niche}/${slug}`,
        name: index === 0 ? firstNames[niche] ?? slug : slug,
        pages: ['index.html'],
        files: ['index.html'],
        fields: [{ name: 'BUSINESS_NAME', label: 'Business name', type: 'text' }],
        editable: true,
        validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] },
      })
      mappings.push(mapping)
      gallery[niche]!.push(slug)
    }
  }
  const catalog = {
    contractVersion: 3,
    ruleVersion: 'test-rule',
    generatedAt: '2026-09-03T12:00:00.000Z',
    sourceTemplates: mappings.length,
    canonicalDesigns: mappings.length,
    templates: mappings,
    gallery,
  }
  const catalogText = `${JSON.stringify(catalog)}\n`
  const pointer = createRehabStagingActivePointer({
    catalogHash: catalogDocumentHash(catalogText),
    manifestHash: catalogManifestHash(manifest),
  })
  return { manifest, catalogText, pointer }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
  getStoreMock.mockReset()
})

it('serves staging metadata and assets only from the active hash prefix in the isolated store', async () => {
  const names = {
    aromatherapy: ['Warm Ember Outfit Â· Clinical Modern â€” Aromatherapy', 'Warm Ember Outfit · Clinical Modern — Aromatherapy'],
    holistic_medicine: ['Cream Linen Plus Jakarta Â· Café · Âme – Ω', 'Cream Linen Plus Jakarta · Café · Âme – Ω'],
    private_practice_therapist: ['Golden Hour Cormorant Â· Care — Élan', 'Golden Hour Cormorant · Care — Élan'],
    sound_bath: ['Rose Quartz Inter Â· Calm â€” Sound Bath', 'Rose Quartz Inter · Calm — Sound Bath'],
    wellness_coach: ['Original Lora Â· Wellness – 日本語', 'Original Lora · Wellness – 日本語'],
  }
  const fixture = completeRuntimeFixture('', Object.fromEntries(
    Object.entries(names).map(([niche, [raw]]) => [niche, raw!]),
  ))
  const rawManifest = JSON.stringify(fixture.manifest)
  const first = fixture.manifest.aromatherapy![0]!
  const assetKey = `${fixture.pointer.catalogHash ? `catalogs/${fixture.pointer.catalogHash}` : ''}/${first.dir}/index.html`
  const sourceHtml = '<main><h1>{{BUSINESS_NAME}}</h1><p>Â· â€” Café</p></main>'
  const values = new Map<string, unknown>([
    [REHAB_STAGING_ACTIVE_KEY, fixture.pointer],
    [fixture.pointer.catalogKey, fixture.catalogText],
    [fixture.pointer.manifestKey, fixture.manifest],
    [assetKey, sourceHtml],
  ])
  const reads: string[] = []
  const store = {
    async get(key: string, options?: { type?: 'json' | 'arrayBuffer' }) {
      reads.push(key)
      const value = values.get(key)
      if (value === undefined) return null
      if (options?.type === 'arrayBuffer') return new TextEncoder().encode(String(value)).buffer
      return value
    },
  }
  getStoreMock.mockImplementation((options: { name: string }) => {
    expect(options.name).toBe('templates-rehab-staging')
    return store
  })
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE', 'rehab-staging')
  vi.stubEnv('CONTEXT', 'branch-deploy')

  const registry = await import('./niche-registry')
  const template = await registry.getTemplate('aromatherapy', String(first.slug))
  expect(template?.legacySlug).toBe(first.legacySlug)
  expect(template?.catalogHash).toBe(fixture.pointer.catalogHash)
  expect(template?.manifestHash).toBe(fixture.pointer.manifestHash)
  for (const [niche, [, displayName]] of Object.entries(names)) {
    const original = fixture.manifest[niche]![0]!
    const displayed = (await registry.getTemplatesForNiche(niche))[0]
    expect(displayed).toEqual({
      ...original,
      name: displayName,
      catalogHash: fixture.pointer.catalogHash,
      manifestHash: fixture.pointer.manifestHash,
    })
    await expect(registry.getTemplate(niche, String(original.slug))).resolves.toEqual(displayed)
  }
  expect(JSON.stringify(fixture.manifest)).toBe(rawManifest)
  expect(catalogManifestHash(fixture.manifest)).toBe(fixture.pointer.manifestHash)
  await expect(registry.readTemplateFile('aromatherapy', String(first.slug), 'index.html'))
    .resolves.toBe(sourceHtml)
  const bytes = await registry.readTemplateFileBuffer('aromatherapy', String(first.slug), 'index.html')
  expect(bytes).toEqual(Buffer.from(sourceHtml, 'utf8'))
  await expect(registry.readTemplateFile('aromatherapy', String(first.slug), 'missing.html'))
    .resolves.toBeNull()

  expect(getStoreMock).toHaveBeenCalled()
  expect(reads).toContain(assetKey)
  expect(reads).not.toContain('_manifest.json')
  expect(fetchMock).not.toHaveBeenCalled()
  const readiness = await registry.getTemplateCatalogReadiness()
  expect(readiness).toMatchObject({ ready: true, profile: 'rehab-staging', actualTotal: 5486, expectedTotal: 5486, catalogHash: fixture.pointer.catalogHash, manifestHash: fixture.pointer.manifestHash })
  values.set(fixture.pointer.manifestKey, {})
  expect(await registry.getTemplateCatalogReadiness()).toMatchObject({ ready: false, profile: 'rehab-staging', expectedTotal: 5486 })
})

it('keeps a saved edit bound to its historical hash after the active pointer changes', async () => {
  const active = completeRuntimeFixture('_active')
  const historical = completeRuntimeFixture('_purchased', {
    aromatherapy: 'Warm Ember Outfit Â· Clinical Modern â€” Café · Âme – Ω',
  })
  const rawHistoricalManifest = JSON.stringify(historical.manifest)
  const first = historical.manifest.aromatherapy![0]!
  const activeFirst = active.manifest.aromatherapy![0]!
  const historicalPrefix = `catalogs/${historical.pointer.catalogHash}`
  const activePrefix = `catalogs/${active.pointer.catalogHash}`
  const historicalAssetKey = `${historicalPrefix}/${first.dir}/index.html`
  const activeAssetKey = `${activePrefix}/${activeFirst.dir}/index.html`
  const values = new Map<string, unknown>([
    [REHAB_STAGING_ACTIVE_KEY, active.pointer],
    [active.pointer.catalogKey, active.catalogText],
    [active.pointer.manifestKey, active.manifest],
    [historical.pointer.catalogKey, historical.catalogText],
    [historical.pointer.manifestKey, historical.manifest],
    [activeAssetKey, '<main>active revision</main>'],
    [historicalAssetKey, '<main>purchased revision</main>'],
  ])
  const reads: string[] = []
  const store = {
    async get(key: string, options?: { type?: 'json' | 'arrayBuffer' }) {
      reads.push(key)
      const value = values.get(key)
      if (value === undefined) return null
      if (options?.type === 'arrayBuffer') return new TextEncoder().encode(String(value)).buffer
      return value
    },
  }
  getStoreMock.mockReturnValue(store)
  vi.stubGlobal('fetch', vi.fn())
  vi.stubEnv('DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE', 'rehab-staging')
  vi.stubEnv('CONTEXT', 'branch-deploy')

  const registry = await import('./niche-registry')
  const hashlessLegacyPin = {
    contractVersion: 3 as const,
    designId: String(first.designId),
    contentPresetId: String(first.contentPresetId),
    themePresetId: String(first.themePresetId),
    qualityReceipt: String(first.qualityReceipt),
  }
  await expect(registry.getTemplateAtCatalogRevision(
    'aromatherapy',
    String(first.slug),
    hashlessLegacyPin,
  )).rejects.toThrow(/catalogue revision mismatch/i)

  const pin = {
    contractVersion: 3 as const,
    designId: String(first.designId),
    contentPresetId: String(first.contentPresetId),
    themePresetId: String(first.themePresetId),
    qualityReceipt: String(first.qualityReceipt),
    catalogHash: historical.pointer.catalogHash,
    manifestHash: historical.pointer.manifestHash,
  }
  const resolved = await registry.getTemplateAtCatalogRevision(
    'aromatherapy',
    String(first.slug),
    pin,
  )
  expect(resolved?.qualityReceipt).toBe(first.qualityReceipt)
  expect(resolved).toEqual({
    ...first,
    name: 'Warm Ember Outfit · Clinical Modern — Café · Âme – Ω',
    catalogHash: historical.pointer.catalogHash,
    manifestHash: historical.pointer.manifestHash,
  })
  await expect(registry.getTemplateAtCatalogSnapshot('aromatherapy', String(first.slug), {
    catalogHash: historical.pointer.catalogHash,
    manifestHash: historical.pointer.manifestHash,
  })).resolves.toEqual(resolved)
  expect(JSON.stringify(historical.manifest)).toBe(rawHistoricalManifest)
  expect(catalogManifestHash(historical.manifest)).toBe(historical.pointer.manifestHash)
  await expect(registry.readTemplateFile(
    'aromatherapy',
    String(first.slug),
    'index.html',
    pin,
  )).resolves.toContain('purchased revision')
  expect(reads).toContain(historicalAssetKey)
  expect(reads).not.toContain(activeAssetKey)
})
