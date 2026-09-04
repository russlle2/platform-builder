import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getTemplate: vi.fn() }))

vi.mock('@/lib/templates/niche-registry', () => ({ getTemplate: mocks.getTemplate }))

import { GET } from './route'

describe('template detail catalogue metadata', () => {
  it('exposes the complete v3 alias lineage and checkout revision pin', async () => {
    mocks.getTemplate.mockResolvedValue({
      slug: 'legacy-alias',
      legacySlug: 'legacy-alias',
      name: 'Legacy Alias',
      niche: 'Wellness',
      nicheSlug: 'wellness',
      pages: ['index.html'],
      fields: [],
      snippet: 'Example',
      editable: true,
      validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] },
      designId: 'design_shared',
      contentPresetId: 'content_alias',
      themePresetId: 'theme_alias',
      qualityReceipt: 'receipt_abc123',
      canonicalLegacySlug: 'canonical-template',
      disposition: 'alias',
    })

    const response = await GET(new Request('https://dailyclarity.org/api/templates/wellness/legacy-alias'), {
      params: Promise.resolve({ niche: 'wellness', slug: 'legacy-alias' }),
    })
    await expect(response.json()).resolves.toMatchObject({
      legacySlug: 'legacy-alias',
      designId: 'design_shared',
      contentPresetId: 'content_alias',
      themePresetId: 'theme_alias',
      qualityReceipt: 'receipt_abc123',
      canonicalLegacySlug: 'canonical-template',
      disposition: 'alias',
      catalogRevision: {
        contractVersion: 3,
        designId: 'design_shared',
        contentPresetId: 'content_alias',
        themePresetId: 'theme_alias',
        qualityReceipt: 'receipt_abc123',
      },
    })
  })
})
