import { describe, expect, it } from 'vitest'
import {
  CUSTOM_BUILD_AMOUNT_CENTS,
  CUSTOM_BUILD_CURRENCY,
  validateCustomBuildInput,
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
})
