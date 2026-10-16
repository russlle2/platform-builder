import { describe, expect, it } from 'vitest'
import {
  CUSTOM_BUILD_AMOUNT_CENTS,
  CUSTOM_BUILD_CURRENCY,
  validateCustomBuildInput,
  validateCustomBuildBrief,
  customBuildReviewMessage,
  CUSTOM_BUILD_REVIEW_MESSAGE_LIMIT,
} from './custom-build'

const validInput = {
  businessName: 'Example Wellness',
  contactName: 'Jordan Example',
  email: 'Jordan@Example.com',
  phone: '',
  siteVision: 'A calm, modern wellness website with generous spacing, soft natural colors, clear service descriptions, and a welcoming but professional tone.'.repeat(2),
  requiredFunctionality: 'Contact form, appointment-request workflow, service pages, testimonials, responsive navigation, and basic search optimization.',
  inspirationLinks: 'https://example.com/inspiration',
  existingWebsite: '',
  acceptedTerms: true,
}

describe('custom build checkout validation', () => {
  it('uses an exact one-time price of $500 USD', () => {
    expect(CUSTOM_BUILD_AMOUNT_CENTS).toBe(50_000)
    expect(CUSTOM_BUILD_CURRENCY).toBe('usd')
  })

  it('normalizes a valid brief', () => {
    const result = validateCustomBuildInput(validInput)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.email).toBe('jordan@example.com')
      expect(result.data.phone).toBeNull()
    }
  })

  it('rejects short or incomplete briefs', () => {
    expect(validateCustomBuildInput({ ...validInput, siteVision: 'Too short' })).toEqual({
      ok: false,
      error: 'Website description must be at least 100 characters.',
    })
    expect(validateCustomBuildInput({ ...validInput, acceptedTerms: false })).toEqual({
      ok: false,
      error: 'You must accept the service terms before checkout.',
    })
  })

  it('allows an unpaid brief without creating payment consent', () => {
    const result = validateCustomBuildBrief({ ...validInput, acceptedTerms: false })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).not.toHaveProperty('acceptedTerms')
    expect(validateCustomBuildInput(result.data)).toEqual({
      ok: false, error: 'You must accept the service terms before checkout.',
    })
    expect(customBuildReviewMessage(result.data)).toContain('no payment requested or taken')
  })

  it('retains every brief field and lets the caller detect over-limit messages without truncation', () => {
    const result = validateCustomBuildBrief({
      ...validInput, siteVision: 'v'.repeat(5000), requiredFunctionality: 'f'.repeat(4000),
      inspirationLinks: 'r'.repeat(2000), existingWebsite: 'https://example.com',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const message = customBuildReviewMessage(result.data)
    for (const value of [result.data.businessName, result.data.siteVision, result.data.requiredFunctionality, result.data.inspirationLinks, result.data.existingWebsite]) {
      expect(message).toContain(value)
    }
    expect(message.length).toBeGreaterThan(CUSTOM_BUILD_REVIEW_MESSAGE_LIMIT)
  })
})
