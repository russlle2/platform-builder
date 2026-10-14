import { describe, expect, it } from 'vitest'
import {
  LAUNCH_CATALOG_EXPECTED_BY_NICHE,
  LAUNCH_CATALOG_EXPECTED_TOTAL,
  LAUNCH_CATALOG_APPROVED_IDENTITIES,
  inspectLaunchCatalog,
} from './launch-catalog-integrity'

function completeCatalog() {
  return Object.keys(LAUNCH_CATALOG_EXPECTED_BY_NICHE).map((slug) => ({
    slug,
    templates: LAUNCH_CATALOG_APPROVED_IDENTITIES
      .filter((template) => template.niche === slug)
      .map((template) => ({
        slug: template.slug,
        artifactSha256: template.sha256,
      })),
  }))
}

describe('inspectLaunchCatalog', () => {
  it('requires the complete 60-template, 12-per-niche launch catalog', () => {
    const result = inspectLaunchCatalog(completeCatalog())

    expect(result.ready).toBe(true)
    expect(result.actualTotal).toBe(LAUNCH_CATALOG_EXPECTED_TOTAL)
    expect(result.issues).toEqual([])
  })

  it('fails closed when one niche is incomplete even if other templates exist', () => {
    const catalog = completeCatalog()
    catalog[0] = { ...catalog[0], templates: catalog[0].templates.slice(1) }

    const result = inspectLaunchCatalog(catalog)

    expect(result.ready).toBe(false)
    expect(result.actualTotal).toBe(LAUNCH_CATALOG_EXPECTED_TOTAL - 1)
    expect(result.issues).toContain('aromatherapy: expected 12, found 11')
    expect(result.issues).toContain('total: expected 60, found 59')
  })

  it('rejects unexpected or duplicated niche results', () => {
    const result = inspectLaunchCatalog([
      ...completeCatalog(),
      { slug: 'aromatherapy', templates: [] },
      { slug: 'unexpected', templates: [] },
    ])

    expect(result.ready).toBe(false)
    expect(result.issues).toContain('aromatherapy: duplicate niche result')
    expect(result.issues).toContain('unexpected: unexpected launch niche')
  })

  it('rejects a substituted slug or one-byte artifact mutation', () => {
    const substituted = completeCatalog()
    substituted[0].templates[0] = {
      ...substituted[0].templates[0],
      slug: 'valid-looking-substitute',
    }
    expect(inspectLaunchCatalog(substituted).ready).toBe(false)

    const mutated = completeCatalog()
    const original = mutated[1].templates[0].artifactSha256
    mutated[1].templates[0] = {
      ...mutated[1].templates[0],
      artifactSha256: `${original.slice(0, -1)}${original.endsWith('0') ? '1' : '0'}`,
    }
    const result = inspectLaunchCatalog(mutated)
    expect(result.ready).toBe(false)
    expect(result.issues.some((issue) => issue.includes('artifact differs'))).toBe(true)
  })
})
