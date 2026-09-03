import { describe, expect, it } from 'vitest'
import { isPublishableTemplateMeta } from './niche-registry'

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
