import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getTemplate: vi.fn() }))

vi.mock('@/lib/templates/niche-registry', () => ({
  getTemplateAtCatalogRevision: mocks.getTemplate,
}))

import { GET, POST } from './route'

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
      catalogHash: 'a'.repeat(64),
      manifestHash: 'b'.repeat(64),
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
        catalogHash: 'a'.repeat(64),
        manifestHash: 'b'.repeat(64),
      },
    })
  })

  it('resolves portal metadata through the saved immutable revision', async () => {
    const catalogRevision = {
      contractVersion: 3,
      designId: 'design_saved',
      contentPresetId: 'content_saved',
      themePresetId: 'theme_saved',
      qualityReceipt: 'receipt_saved',
      catalogHash: 'c'.repeat(64),
      manifestHash: 'd'.repeat(64),
    }
    mocks.getTemplate.mockResolvedValue({
      slug: 'saved',
      name: 'Saved',
      niche: 'Wellness',
      nicheSlug: 'wellness',
      pages: ['index.html'],
      fields: [],
      snippet: 'Saved',
      editable: true,
      validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] },
      ...catalogRevision,
    })
    const response = await POST(new Request('https://dailyclarity.org/api/templates/wellness/saved', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ catalogRevision }),
    }), { params: Promise.resolve({ niche: 'wellness', slug: 'saved' }) })
    expect(response.status).toBe(200)
    expect(mocks.getTemplate).toHaveBeenCalledWith('wellness', 'saved', catalogRevision)
  })
})
