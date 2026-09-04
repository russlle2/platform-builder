import { describe, expect, it } from 'vitest'
import { dedupeTemplatesForGallery, isPublishableTemplateMeta } from './niche-registry'

function validTemplate() {
  return {
    slug: 'calm-studio',
    name: 'Calm Studio',
    niche: 'Aromatherapy',
    nicheSlug: 'aromatherapy',
    pages: ['index.html'],
    files: ['index.html', 'assets/css/styles.css'],
    dir: 'aromatherapy/calm-studio',
    fields: [{ name: 'BUSINESS_NAME', label: 'Business name', type: 'text' }],
    snippet: 'A calm introduction.',
    editable: true,
    validation: {
      status: 'passed' as const,
      contractVersion: 2,
      tokens: ['BUSINESS_NAME'],
    },
  }
}

describe('isPublishableTemplateMeta', () => {
  it('accepts an uploader-validated template with an exact field contract', () => {
    expect(isPublishableTemplateMeta(validTemplate())).toBe(true)
  })

  it('accepts complete v3 composition metadata and keeps aliases out of the gallery', () => {
    const canonical = {
      ...validTemplate(),
      slug: 'canonical',
      legacySlug: 'canonical',
      validation: { ...validTemplate().validation, contractVersion: 3 },
      designId: 'design_abc123',
      contentPresetId: 'content_first',
      themePresetId: 'theme_first',
      qualityReceipt: 'receipt_first',
      canonicalLegacySlug: 'canonical',
      disposition: 'canonical' as const,
    }
    const alias = {
      ...canonical,
      slug: 'legacy-alias',
      legacySlug: 'legacy-alias',
      contentPresetId: 'content_second',
      themePresetId: 'theme_second',
      qualityReceipt: 'receipt_second',
      canonicalLegacySlug: 'canonical',
      disposition: 'alias' as const,
    }
    expect(isPublishableTemplateMeta(canonical)).toBe(true)
    expect(isPublishableTemplateMeta({ ...canonical, qualityReceipt: undefined })).toBe(false)
    expect(isPublishableTemplateMeta({ ...canonical, disposition: undefined })).toBe(false)
    expect(dedupeTemplatesForGallery([alias, canonical])).toEqual([canonical])

    const firstLegacy = { ...canonical, disposition: undefined, canonicalLegacySlug: undefined }
    const secondLegacy = { ...alias, disposition: undefined, canonicalLegacySlug: undefined }
    expect(dedupeTemplatesForGallery([firstLegacy, secondLegacy])).toEqual([firstLegacy])
  })

  it('quarantines legacy, zero-token, mismatched, and unsafe entries', () => {
    const legacy = validTemplate()
    delete (legacy as Partial<typeof legacy>).validation
    expect(isPublishableTemplateMeta(legacy)).toBe(false)

    expect(isPublishableTemplateMeta({
      ...validTemplate(),
      validation: { status: 'passed', contractVersion: 2, tokens: [] },
    })).toBe(false)
    expect(isPublishableTemplateMeta({
      ...validTemplate(),
      validation: { status: 'passed', contractVersion: 2, tokens: ['EMAIL'] },
    })).toBe(false)
    expect(isPublishableTemplateMeta({ ...validTemplate(), dir: '../outside' })).toBe(false)
  })
})
