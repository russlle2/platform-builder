import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NICHE_META } from '@/lib/templates/niche-meta'
import { getNichesWithSampleAvailability } from '@/lib/templates/niche-registry'
import HomePage from './page'

vi.mock('@/lib/templates/niche-registry', () => ({
  getNichesWithSampleAvailability: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getNichesWithSampleAvailability).mockReset()
  vi.mocked(getNichesWithSampleAvailability).mockResolvedValue(Object.entries(NICHE_META).map(([slug, meta]) => ({ slug, ...meta, templateCount: 10, sampleAvailable: false })))
})

describe('homepage sample availability', () => {
  it('offers only sample practices present in the active showcase and keeps full-catalog discovery', async () => {
    vi.mocked(getNichesWithSampleAvailability).mockResolvedValue(Object.entries(NICHE_META).map(([slug, meta]) => ({
      slug, ...meta, templateCount: 10, sampleAvailable: slug === 'private_practice_therapist',
    })))
    const html = renderToStaticMarkup(await HomePage())
    expect(getNichesWithSampleAvailability).toHaveBeenCalledTimes(1)
    const picker = html.match(/<select[^>]*id="sample-practice"[\s\S]*?<\/select>/)?.[0]
    expect(picker).toContain('value="private_practice_therapist" selected=""')
    expect(picker).not.toContain('wellness_coach')
    expect(picker).not.toContain('aromatherapy')
    expect(html).toContain('/preview-your-business?sample=1&amp;niche=private_practice_therapist')
    expect(html).toContain('href="/aromatherapy"')
    expect(html).toContain('50 published templates across 5 practice types.')
  })

  it('shows an honest empty state and a personal preview route when no sample is active', async () => {
    const html = renderToStaticMarkup(await HomePage())
    expect(getNichesWithSampleAvailability).toHaveBeenCalledTimes(1)
    expect(html).toContain('No sample is available right now.')
    expect(html).toContain('Start with my business details')
    expect(html).toContain('href="/preview-your-business"')
    expect(html).not.toContain('id="sample-practice"')
    expect(html).not.toContain('sample=1')
    expect(html).not.toContain('Try a sample website')
  })
})
