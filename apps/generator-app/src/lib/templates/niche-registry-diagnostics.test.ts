import { afterEach, expect, it, vi } from 'vitest'
import { LAUNCH_CATALOG_APPROVED_IDENTITIES } from './launch-catalog-integrity'
import contract from './launch-catalog-contract.json'
import { canonicalDigest } from './certified-catalog-contract.mjs'

const store = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@netlify/blobs', () => ({ getStore: () => store }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
  store.get.mockReset()
})

async function readiness(manifest: unknown) {
  vi.stubEnv('DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE', 'launch')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
  store.get.mockResolvedValue(manifest)
  return (await import('./niche-registry')).getTemplateCatalogReadiness()
}

function approvedManifest() {
  const manifest: Record<string, Array<Record<string, unknown>>> = {}
  for (const { niche, slug, sha256 } of LAUNCH_CATALOG_APPROVED_IDENTITIES) {
    (manifest[niche] ??= []).push({
      slug, name: slug, nicheSlug: niche, niche, artifactSha256: sha256,
      catalogReportSha256: contract.curatedReportSha256,
      dir: `_releases/${contract.templateIdentitySha256}/${niche}/${slug}`,
      sourceDir: `${niche}/${slug}`, pages: ['index.html'], files: ['index.html'],
      fields: [{ name: 'BUSINESS_NAME', label: 'Business name', type: 'text' }],
      editable: true, validation: { status: 'passed', contractVersion: 2, tokens: ['BUSINESS_NAME'] },
    })
  }
  return manifest
}

it('attests actual validated launch identities, report and active manifest without full-catalogue claims', async () => {
  const manifest = approvedManifest()
  const result = await readiness(manifest)
  expect(result).toMatchObject({
    ready: true, profile: 'launch', actualTotal: 60, expectedTotal: 60,
    catalogHash: contract.templateIdentitySha256, manifestHash: canonicalDigest(manifest),
    curatedReportHash: contract.curatedReportSha256, certificationHash: null, catalogueReleaseSha: null,
  })
  // A valid metadata change must change the active-document hash, even when
  // all approved artifact identities and report hashes remain the same.
  manifest.aromatherapy[0].name = 'Updated gallery title'
  const refreshed = await (await import('./niche-registry')).getTemplateCatalogReadiness()
  expect(refreshed.catalogHash).toBe(result.catalogHash)
  expect(refreshed.manifestHash).toBe(canonicalDigest(manifest))
  expect(refreshed.manifestHash).not.toBe(result.manifestHash)
  const template = await (await import('./niche-registry')).getTemplate('aromatherapy', String(manifest.aromatherapy[0].slug))
  expect(template?.catalogHash).toBeUndefined()
  expect(template?.manifestHash).toBeUndefined()
})

it.each(['missing', 'artifact', 'report', 'extra-entry', 'extra-niche'])(
  'does not fabricate launch evidence for a %s-invalid active manifest', async (mutation) => {
    const manifest = approvedManifest()
    if (mutation === 'missing') manifest.aromatherapy.pop()
    if (mutation === 'artifact') manifest.aromatherapy[0].artifactSha256 = 'f'.repeat(64)
    if (mutation === 'report') manifest.aromatherapy[0].catalogReportSha256 = 'f'.repeat(64)
    if (mutation === 'extra-entry') manifest.aromatherapy.push({ slug: 'unvalidated-legacy-entry' })
    if (mutation === 'extra-niche') manifest.unexpected = []
    const result = await readiness(manifest)
    expect(result).toMatchObject({ ready: false, catalogHash: null, manifestHash: null, curatedReportHash: null })
  },
)

it('distinguishes a present legacy catalogue rejected by validation from a missing manifest', async () => {
  const result = await readiness({ aromatherapy: [{ slug: 'original-legacy-template', pages: ['index.html'] }] })
  expect(result.ready).toBe(false)
  expect(result).toMatchObject({ catalogHash: null, manifestHash: null, curatedReportHash: null })
  expect(result.actualTotal).toBe(0)
  expect(result.diagnostics).toEqual({
    sourceTemplates: 1, validatedTemplates: 0, rejectedTemplates: 1,
    malformedNiches: 0, cause: 'entries-unvalidated',
  })
})

it('identifies unavailable storage without exposing storage credentials or raw errors', async () => {
  const result = await readiness(null)
  expect(result.ready).toBe(false)
  expect(result).toMatchObject({ catalogHash: null, manifestHash: null, curatedReportHash: null })
  expect(result.diagnostics).toEqual({
    sourceTemplates: 0, validatedTemplates: 0, rejectedTemplates: 0,
    malformedNiches: 0, cause: 'manifest-unavailable',
  })
})

it('fails closed with diagnostics instead of throwing for an object-valued niche', async () => {
  const result = await readiness({ aromatherapy: { invalid: 'not an array' } })
  expect(result.ready).toBe(false)
  expect(result.actualTotal).toBe(0)
  expect(result.diagnostics).toMatchObject({ malformedNiches: 1, cause: 'manifest-malformed' })
})

it('identifies a malformed manifest root without treating it as an empty inventory', async () => {
  const result = await readiness([])
  expect(result.ready).toBe(false)
  expect(result.diagnostics.cause).toBe('manifest-malformed')
})


it('keeps sample availability empty when a valid catalog lacks reviewed identities, without losing counts', async () => {
  vi.stubEnv('DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE', 'launch')
  const manifest = approvedManifest()
  // Featured metadata cannot populate intentionally empty promotional groups.
  for (const entry of manifest.aromatherapy) entry.featured = true
  const original = JSON.stringify(manifest)
  store.get.mockResolvedValue(manifest)
  const { getNichesWithSampleAvailability } = await import('./niche-registry')
  const niches = await getNichesWithSampleAvailability()
  expect(niches.reduce((total, niche) => total + niche.templateCount, 0)).toBe(60)
  // This approved launch fixture contains none of the retained reviewed IDs.
  // Published counts or featured flags must not become sample availability.
  expect(niches.every(niche => !niche.sampleAvailable)).toBe(true)
  for (const slug of ['aromatherapy', 'holistic_medicine', 'sound_bath']) {
    expect(niches.find(niche => niche.slug === slug)).toMatchObject({ sampleAvailable: false })
    expect(niches.find(niche => niche.slug === slug)!.templateCount).toBeGreaterThan(0)
  }
  expect(JSON.stringify(manifest)).toBe(original)
  expect(store.get).toHaveBeenCalledTimes(1)
})
