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

function completeRuntimeFixture() {
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
        designId: `design_${slug}`,
        contentPresetId: `content_${slug}`,
        themePresetId: `theme_${slug}`,
        qualityReceipt: `receipt_${slug}`,
        canonicalLegacySlug: slug,
        disposition: 'canonical',
      }
      manifest[niche]!.push({
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
  const fixture = completeRuntimeFixture()
  const first = fixture.manifest.aromatherapy![0]!
  const assetKey = `${fixture.pointer.catalogHash ? `catalogs/${fixture.pointer.catalogHash}` : ''}/${first.dir}/index.html`
  const values = new Map<string, unknown>([
    [REHAB_STAGING_ACTIVE_KEY, fixture.pointer],
    [fixture.pointer.catalogKey, fixture.catalogText],
    [fixture.pointer.manifestKey, fixture.manifest],
    [assetKey, '<main><h1>{{BUSINESS_NAME}}</h1></main>'],
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
  await expect(registry.readTemplateFile('aromatherapy', String(first.slug), 'index.html'))
    .resolves.toContain('{{BUSINESS_NAME}}')
  const bytes = await registry.readTemplateFileBuffer('aromatherapy', String(first.slug), 'index.html')
  expect(bytes?.toString('utf8')).toContain('{{BUSINESS_NAME}}')
  await expect(registry.readTemplateFile('aromatherapy', String(first.slug), 'missing.html'))
    .resolves.toBeNull()

  expect(getStoreMock).toHaveBeenCalled()
  expect(reads).toContain(assetKey)
  expect(reads).not.toContain('_manifest.json')
  expect(fetchMock).not.toHaveBeenCalled()
})
