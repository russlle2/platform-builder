import { describe, expect, it } from 'vitest'
import { getFirstReviewedShowcaseTemplate, getReviewedShowcaseTemplates, REVIEWED_SHOWCASE_SLUGS } from './showcase-curation'

describe('shared reviewed sample choices', () => {
  it('selects only entries present in the supplied active catalog, in review order', () => {
    const slugs = REVIEWED_SHOWCASE_SLUGS.sound_bath!
    const first = { slug: slugs[0]!, marker: 'first' }
    const second = { slug: slugs[1]!, marker: 'second' }
    expect(getReviewedShowcaseTemplates('sound_bath', [second, { slug: 'other' }, first])).toEqual([first, second])
    expect(getFirstReviewedShowcaseTemplate('sound_bath', [second])).toBe(second)
    expect(getFirstReviewedShowcaseTemplate('sound_bath', [{ slug: 'other' }])).toBeNull()
    expect(getFirstReviewedShowcaseTemplate('unknown', [first])).toBeNull()
  })
})
