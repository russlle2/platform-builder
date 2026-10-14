import { describe, expect, it } from 'vitest'
import {
  PRODUCTION_NETLIFY_SITE_ID,
  assertCatalogDeployment,
  canonicalDigest,
  createCertifiedPointer,
  validateCertification,
  validateCertifiedPointer,
  type Certification,
} from './certified-catalog-contract.mjs'

const receipt = (): Certification => ({
  version: 1, profile: 'rehab-certified', releaseSha: 'a'.repeat(40),
  catalogHash: 'b'.repeat(64), manifestHash: 'c'.repeat(64), fullGateHash: 'd'.repeat(64),
  sourceCatalogHash: 'e'.repeat(64), templateEvidenceHash: 'f'.repeat(64), fileEvidenceHash: '1'.repeat(64),
  sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0,
  customizationDiagnostics: 0, files: 16458, pages: 5486,
})

describe('certified catalogue release evidence contract', () => {
  it('binds one complete receipt into an immutable pointer and stable canonical digest', () => {
    const valid = receipt()
    const pointer = createCertifiedPointer(valid, '2026-09-25T12:00:00.000Z')
    expect(validateCertification(valid, { releaseSha: valid.releaseSha, catalogHash: valid.catalogHash, manifestHash: valid.manifestHash })).toEqual(valid)
    expect(validateCertifiedPointer(pointer)).toEqual(pointer)
    expect(pointer.certificationHash).toBe(canonicalDigest(valid))
    expect(pointer.certificationKey).toBe(`certifications/${canonicalDigest(valid)}.json`)
    const reordered = Object.fromEntries(Object.entries(valid).reverse())
    expect(canonicalDigest(reordered)).toBe(canonicalDigest(valid))
    expect(canonicalDigest({ ...valid, pages: valid.pages + 1 })).not.toBe(canonicalDigest(valid))
  })

  it('rejects missing, malformed, coerced, or wrong-profile identity and evidence fields', () => {
    for (const input of [null, undefined, {}, [], 'receipt', { ...receipt(), version: 2 }, { ...receipt(), profile: 'rehab-staging' }]) {
      expect(() => validateCertification(input)).toThrow()
    }
    for (const key of ['releaseSha', 'catalogHash', 'manifestHash', 'fullGateHash', 'sourceCatalogHash', 'templateEvidenceHash', 'fileEvidenceHash'] as const) {
      for (const value of [undefined, '', 'not-a-digest', 'A'.repeat(key === 'releaseSha' ? 40 : 64), [receipt()[key]]]) {
        expect(() => validateCertification({ ...receipt(), [key]: value }), `${key}=${JSON.stringify(value)}`).toThrow()
      }
    }
  })

  it('rejects incomplete certification, residual diagnostics, neutral fallbacks, and non-integer counts', () => {
    for (const change of [
      { sourceTemplates: 5485 }, { sourceTemplates: 5487 }, { certifiedTemplates: 5485 },
      { neutralFallbacks: 1 }, { neutralFallbacks: -1 }, { customizationDiagnostics: 1 },
      { pages: 5485 }, { pages: 5486.5 }, { files: 5485 }, { files: Infinity }, { files: '16458' },
    ]) expect(() => validateCertification({ ...receipt(), ...change })).toThrow()
  })

  it('rejects every pointer namespace escape, bad identity type, or malformed activation time', () => {
    const pointer = createCertifiedPointer(receipt(), '2026-09-25T12:00:00.000Z')
    for (const change of [
      { catalogKey: 'catalogs/../_catalog-v3.json' }, { manifestKey: '_manifest.json' },
      { certificationKey: 'https://other.example/receipt.json' }, { profile: 'rehab-staging' },
      { sourceTemplates: 5485 }, { releaseSha: [pointer.releaseSha] },
      { certificationHash: [pointer.certificationHash] },
      { activatedAt: 'not-a-date' }, { activatedAt: undefined }, { activatedAt: 1 },
    ]) expect(() => validateCertifiedPointer({ ...pointer, ...change }), JSON.stringify(change)).toThrow()
    expect(() => createCertifiedPointer(receipt(), 'not-a-date')).toThrow()
  })
})

describe('catalogue deployment pin validation', () => {
  it('allows exact production and separately pinned staging identities', () => {
    expect(() => assertCatalogDeployment({ DAILYCLARITY_ENVIRONMENT: 'production', SITE_ID: PRODUCTION_NETLIFY_SITE_ID }, 'production')).not.toThrow()
    const staging = '12345678-1234-4234-8234-123456789abc'
    expect(() => assertCatalogDeployment({ DAILYCLARITY_ENVIRONMENT: 'staging', SITE_ID: staging, DAILYCLARITY_STAGING_SITE_ID: staging }, 'staging')).not.toThrow()
  })

  it('rejects malformed matching staging pins and accidental production-site reuse', () => {
    for (const site of ['-'.repeat(36), 'a'.repeat(36), '12345678--234-4234-8234-123456789abc', PRODUCTION_NETLIFY_SITE_ID]) {
      expect(() => assertCatalogDeployment({ DAILYCLARITY_ENVIRONMENT: 'staging', SITE_ID: site, DAILYCLARITY_STAGING_SITE_ID: site }, 'staging'), site).toThrow()
    }
  })
})
