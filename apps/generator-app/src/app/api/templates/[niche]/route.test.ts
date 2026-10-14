import { describe, expect, it, vi } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/templates/niche-registry', () => ({
  getNiches: async () => [{ slug: 'aromatherapy', name: 'Aromatherapy' }],
  getTemplatesForNiche: async () => Array.from({ length: 65 }, (_, index) => ({
    slug: `template-${index}`, name: `Template ${index}`, fields: [], pages: ['index.html'],
  })),
}))

async function catalog(query = '', niche = 'aromatherapy') {
  const response = await GET(new Request(`https://example.test/api/templates/${niche}?${query}`), {
    params: Promise.resolve({ niche }),
  })
  return { status: response.status, body: await response.json() }
}

describe('catalogue pagination query validation', () => {
  it.each(['nope', 'NaN', 'Infinity', '-Infinity', '2x', '1.5', '1e2', '0x10', '', ' ', '9007199254740992']) (
    'defaults malformed integer parameters (%j) without corrupting the shuffle', async (value) => {
      const query = new URLSearchParams({ page: value, limit: value, seed: value })
      const result = await catalog(query.toString())
      expect(result).toEqual(await catalog())
      expect(result.body.page).toBe(1)
      expect(result.body.limit).toBe(12)
      expect(result.body.templates).toHaveLength(12)
      expect(result.body.templates.every((template: unknown) => template !== null)).toBe(true)
    },
  )

  it('retains lower and upper bounds for valid integers', async () => {
    const low = await catalog('page=-2&limit=0&seed=-10')
    expect(low.body).toMatchObject({ page: 1, limit: 1, total: 65, hasMore: true })
    expect(low.body.templates).toHaveLength(1)
    const high = await catalog('page=2&limit=99&seed=-10')
    expect(high.body).toMatchObject({ page: 2, limit: 50, total: 65, hasMore: false })
    expect(high.body.templates).toHaveLength(15)
  })

  it('accepts safe integer extremes and never emits null templates or metadata', async () => {
    for (const seed of ['9007199254740991', '-9007199254740991']) {
      const result = await catalog(`seed=${seed}&limit=50`)
      expect(result.body.templates).toHaveLength(50)
      expect(new Set(result.body.templates.map((template: { slug: string }) => template.slug)).size).toBe(50)
    }
    const result = await catalog('page=9007199254740991')
    expect(result.body).toMatchObject({ page: Number.MAX_SAFE_INTEGER, limit: 12, templates: [], hasMore: false })
  })

  it('keeps seeded pagination consistent and complete', async () => {
    const pages = await Promise.all([1, 2, 3].map(page => catalog(`page=${page}&limit=25&seed=42`)))
    const slugs = pages.flatMap(result => result.body.templates.map((template: { slug: string }) => template.slug))
    expect(slugs).toHaveLength(65)
    expect(new Set(slugs).size).toBe(65)
    expect(await catalog('page=2&limit=25&seed=42')).toEqual(pages[1])
  })

  it('preserves all, featured and unknown-niche behavior', async () => {
    expect((await catalog('all=true&page=nope')).body.templates).toHaveLength(65)
    expect((await catalog('featured=true&seed=nope')).body.templates).toEqual([])
    expect((await catalog('', 'missing')).status).toBe(404)
  })
})
