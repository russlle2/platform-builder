import { describe, expect, it } from 'vitest'
import { normalizeSiteSlug, validateSiteSlug } from './site-slug'

describe('site slug policy', () => {
  it('normalizes names and applies the public length bound', () => {
    expect(normalizeSiteSlug('  North Star Wellness!  ')).toBe('north-star-wellness')
    expect(normalizeSiteSlug('x'.repeat(50))).toHaveLength(30)
  })

  it('rejects protected, tiny, and malformed host labels', () => {
    expect(validateSiteSlug('www')).toMatch(/reserved/i)
    expect(validateSiteSlug('api')).toMatch(/reserved/i)
    expect(validateSiteSlug('draft-wellness')).toMatch(/reserved/i)
    expect(validateSiteSlug('x')).toMatch(/at least/i)
    expect(validateSiteSlug('bad--slug')).toMatch(/single hyphens/i)
    expect(validateSiteSlug('good-site')).toBeNull()
  })
})
