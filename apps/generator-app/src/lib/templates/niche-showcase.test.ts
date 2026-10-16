import { describe, expect, it } from 'vitest'
import { selectShowcaseTemplates, type TemplateMeta } from './niche-registry'

function template(slug: string, family: string, extra: Partial<TemplateMeta> = {}): TemplateMeta {
  return {
    slug, name: slug, niche: 'Wellness Coach', nicheSlug: 'wellness_coach',
    pages: ['index.html'], files: ['index.html'], dir: `wellness_coach/${slug}`,
    fields: [], snippet: '', layoutFamily: family, ...extra,
  }
}

describe('landing-page showcase selection', () => {
  it('shows diverse actual gallery entries when editorial flags are absent, bounded to six', () => {
    const input = [
      template('a', 'earthy-warm'), template('b', 'earthy_warm'),
      template('c', 'minimal'), template('d', 'clinical'),
      template('e', 'editorial'), template('f', 'bold'), template('g', 'gallery'),
      template('h', 'extra'),
    ]
    expect(selectShowcaseTemplates(input).map((entry) => entry.slug)).toEqual(['a', 'c', 'd', 'e', 'f', 'g'])
    expect(selectShowcaseTemplates([...input].reverse())).toEqual(selectShowcaseTemplates(input))
    expect(input.map((entry) => entry.slug)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
  })

  it('respects explicit editorial choices and order instead of replacing them', () => {
    const input = [
      template('fallback', 'minimal', { order: 0 }),
      template('third', 'earthy', { featured: true, showcaseOrder: 3 }),
      template('first', 'earthy', { featured: true, showcaseOrder: 1 }),
      template('second', 'clinical', { featured: true, showcaseOrder: 2 }),
    ]
    expect(selectShowcaseTemplates(input).map((entry) => entry.slug)).toEqual(['first', 'second', 'third'])
  })

  it('fills remaining spaces from available designs and handles missing family data', () => {
    const input = Array.from({ length: 12 }, (_, index) => template(String(index).padStart(2, '0'), ''))
    expect(selectShowcaseTemplates(input)).toEqual(input.slice(0, 6))
    expect(selectShowcaseTemplates(input.slice(0, 2))).toEqual(input.slice(0, 2))
    expect(selectShowcaseTemplates([])).toEqual([])
  })

  it('caps an oversized curated selection without inventing or mutating entries', () => {
    const input = Array.from({ length: 10 }, (_, index) => template(`style-${index}`, 'minimal', { featured: true, showcaseOrder: index }))
    expect(selectShowcaseTemplates(input)).toEqual(input.slice(0, 6))
    expect(selectShowcaseTemplates(input).every((entry) => input.includes(entry))).toBe(true)
  })
})

describe('reviewed marketing choices', () => {
  it('uses available reviewed choices in editorial order without changing their metadata', () => {
    const input = [
      template('unreviewed-first', 'minimal', { order: 0 }),
      template('wellness-spec-2026-02-16T01-22-17-887Z-012', 'hero-left'),
      template('wellness-spec-2026-02-16T01-20-21-384Z-026', 'sidebar-nav'),
    ]
    expect(selectShowcaseTemplates(input)).toEqual([input[2], input[1]])
    expect(input[2]?.featured).toBeUndefined()
  })

  it('holds known unreadable designs out of marketing even if marked featured', () => {
    const input = [
      template('wellness_coach-2026-06-18T0600-095', 'clinical', { featured: true }),
      template('sound_bath-2026-02-16T11-24-27-037Z-003', 'zen', { featured: true }),
      template('available-style', 'minimal'),
    ]
    expect(selectShowcaseTemplates(input)).toEqual([input[2]])
    expect(input).toHaveLength(3)
  })
})
