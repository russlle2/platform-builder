import { describe, expect, it } from 'vitest'
import { getFirstReviewedShowcaseTemplate, getReviewedShowcaseTemplates, getSampleTemplates, hasShowcaseCuration, REVIEWED_SHOWCASE_SLUGS } from './showcase-curation'

describe('shared reviewed sample choices', () => {
  it('selects only entries present in the supplied active catalog, in review order', () => {
    const slugs = REVIEWED_SHOWCASE_SLUGS.wellness_coach!
    const first = { slug: slugs[0]!, marker: 'first' }
    const second = { slug: slugs[1]!, marker: 'second' }
    expect(getReviewedShowcaseTemplates('wellness_coach', [second, { slug: 'other' }, first])).toEqual([first, second])
    expect(getFirstReviewedShowcaseTemplate('wellness_coach', [second])).toBe(second)
    expect(getFirstReviewedShowcaseTemplate('wellness_coach', [{ slug: 'other' }])).toBeNull()
    expect(getFirstReviewedShowcaseTemplate('unknown', [first])).toBeNull()
  })

  it('uses one eligible active pool for sample URL choices, alternatives and manual browsing', () => {
    const reviewed = REVIEWED_SHOWCASE_SLUGS.wellness_coach!.map(slug => ({ slug }))
    const held = { slug: 'wellness_coach-2026-06-18T0600-095' }
    const unreviewed = { slug: 'unreviewed-highest-match' }
    const active = [unreviewed, held, ...reviewed.slice(0, 2).reverse()]
    const available = getSampleTemplates('wellness_coach', active)
    expect(available).toEqual(reviewed.slice(0, 2))
    expect(available.find(template => template.slug === held.slug)).toBeUndefined()
    expect(available.find(template => template.slug === unreviewed.slug)).toBeUndefined()
    expect(getSampleTemplates('wellness_coach', [unreviewed, held])).toEqual([])
    expect(active).toHaveLength(4)
  })

  it('preserves uncurated fallback order while excluding held samples', () => {
    const active = [{ slug: 'available-second' }, { slug: 'wellness_coach-2026-06-18T0600-095' }, { slug: 'available-first' }]
    expect(hasShowcaseCuration('unknown')).toBe(false)
    expect(hasShowcaseCuration('toString')).toBe(false)
    expect(getSampleTemplates('unknown', active)).toEqual([active[0], active[2]])
  })

  it('fails closed for an intentionally empty curation policy', () => {
    for (const niche of ['aromatherapy', 'holistic_medicine', 'sound_bath']) {
      expect(hasShowcaseCuration(niche)).toBe(true)
      expect(getSampleTemplates(niche, [{ slug: 'featured-fallback' }])).toEqual([])
    }
  })

  it('holds the superseded recommendations even outside a curated policy', () => {
    const held = [
      'aromatherapy-2026-02-16T18-54-45-056Z-049',
      'aromatherapy-MORE-2026-02-17T13-26-31-190Z-006',
      'holistic_medicine-2026-02-16T19-08-26-139Z-002',
      'holistic_medicine-2026-02-16T19-12-28-938Z-003',
      'holistic_medicine-2026-02-16T19-40-45-346Z-009',
      'sound_bath-2026-02-16T12-44-01-156Z-022',
      'sound_bath-MORE-2026-02-17T10-55-55-742Z-023',
      'private_practice_therapist-MORE-2026-02-17T07-50-08-089Z-030',
      'private_practice_therapist-2026-02-16T06-14-10-990Z-005',
    ].map(slug => ({ slug }))
    expect(getSampleTemplates('unknown', held)).toEqual([])
    expect(REVIEWED_SHOWCASE_SLUGS.private_practice_therapist).toEqual(['private_practice_therapist-2026-02-16T06-31-06-120Z-010'])
    expect(Object.values(REVIEWED_SHOWCASE_SLUGS).flat()).toHaveLength(4)
  })
})
