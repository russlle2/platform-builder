import { describe, expect, it } from 'vitest'
import {
  LAUNCH_CATALOG_EXPECTED_BY_NICHE,
  LAUNCH_CATALOG_EXPECTED_TOTAL,
  inspectLaunchCatalog,
} from './launch-catalog-integrity'

function completeCatalog() {
  return Object.entries(LAUNCH_CATALOG_EXPECTED_BY_NICHE).map(([slug, templateCount]) => ({
    slug,
    templateCount,
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
    catalog[0] = { ...catalog[0], templateCount: catalog[0].templateCount - 1 }

    const result = inspectLaunchCatalog(catalog)

    expect(result.ready).toBe(false)
    expect(result.actualTotal).toBe(LAUNCH_CATALOG_EXPECTED_TOTAL - 1)
    expect(result.issues).toContain('aromatherapy: expected 12, found 11')
    expect(result.issues).toContain('total: expected 60, found 59')
  })

  it('rejects unexpected or duplicated niche results', () => {
    const result = inspectLaunchCatalog([
      ...completeCatalog(),
      { slug: 'aromatherapy', templateCount: 12 },
      { slug: 'unexpected', templateCount: 1 },
    ])

    expect(result.ready).toBe(false)
    expect(result.issues).toContain('aromatherapy: duplicate niche result')
    expect(result.issues).toContain('unexpected: unexpected launch niche')
  })
})
