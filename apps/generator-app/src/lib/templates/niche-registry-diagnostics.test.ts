import { afterEach, expect, it, vi } from 'vitest'

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

it('distinguishes a present legacy catalogue rejected by validation from a missing manifest', async () => {
  const result = await readiness({ aromatherapy: [{ slug: 'original-legacy-template', pages: ['index.html'] }] })
  expect(result.ready).toBe(false)
  expect(result.actualTotal).toBe(0)
  expect(result.diagnostics).toEqual({
    sourceTemplates: 1, validatedTemplates: 0, rejectedTemplates: 1,
    malformedNiches: 0, cause: 'entries-unvalidated',
  })
})

it('identifies unavailable storage without exposing storage credentials or raw errors', async () => {
  const result = await readiness(null)
  expect(result.ready).toBe(false)
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
