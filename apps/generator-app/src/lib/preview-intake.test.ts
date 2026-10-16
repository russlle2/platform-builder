import { describe, expect, it } from 'vitest'
import type { BusinessInfo } from '@/store/previewStore'
import { isValidPreviewEmail, validatePreviewInfo } from './preview-intake'

const info: BusinessInfo = {
  businessName: 'Stillwater', niche: 'private_practice_therapist', ownerName: '',
  email: 'hello@example.com', phone: '', address: '', tagline: '', description: '', services: '', website: '',
}

describe('preview intake validation', () => {
  it('accepts the minimum real-business intake without requiring optional details', () => {
    expect(validatePreviewInfo(info)).toEqual({})
  })

  it('rejects missing names and unpublished industries', () => {
    expect(validatePreviewInfo({ ...info, businessName: '  ', niche: 'retired_niche' })).toEqual({
      businessName: 'Enter your business name.', niche: 'Choose an available industry.',
    })
  })

  it('requires email for a personalized preview while accepting surrounding whitespace', () => {
    expect(validatePreviewInfo({ ...info, email: '   ' })).toHaveProperty('email')
    expect(validatePreviewInfo({ ...info, email: 'bad@' })).toHaveProperty('email')
    expect(validatePreviewInfo({ ...info, email: ' hello@example.com ' })).toEqual({})
  })

  it('requires a real address format at the checkout boundary', () => {
    expect(isValidPreviewEmail('')).toBe(false)
    expect(isValidPreviewEmail('hello there@example.com')).toBe(false)
    expect(isValidPreviewEmail('hello@example')).toBe(false)
    expect(isValidPreviewEmail(' hello+site@example.com ')).toBe(true)
    expect(isValidPreviewEmail(`${'a'.repeat(308)}@example.com`)).toBe(true)
    expect(isValidPreviewEmail(`${'a'.repeat(309)}@example.com`)).toBe(false)
  })
})
