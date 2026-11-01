import { describe, expect, it } from 'vitest'
import type { BusinessInfo } from '@/store/previewStore'
import { checkoutAccountEmail, isValidPreviewEmail, validatePreviewInfo } from './preview-intake'

const info: BusinessInfo = {
  businessName: 'Stillwater', niche: 'private_practice_therapist', ownerName: '',
  accountEmail: 'private@example.com', email: 'hello@example.com', phone: '', address: '', tagline: '', description: '', services: '', website: '',
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

  it('allows a preview before email collection and validates addresses when supplied', () => {
    expect(validatePreviewInfo({ ...info, accountEmail: '', email: '' })).toEqual({})
    expect(validatePreviewInfo({ ...info, accountEmail: '' })).toEqual({})
    expect(validatePreviewInfo({ ...info, accountEmail: 'bad@' })).toHaveProperty('accountEmail')
    expect(validatePreviewInfo({ ...info, accountEmail: ' private@example.com ' })).toEqual({})
    expect(validatePreviewInfo({ ...info, email: '   ' })).toEqual({})
    expect(validatePreviewInfo({ ...info, email: 'bad@' })).toHaveProperty('email')
    expect(validatePreviewInfo({ ...info, email: ' hello@example.com ' })).toEqual({})
  })

  it('requires a real address format at the checkout boundary', () => {
    expect(isValidPreviewEmail('')).toBe(false)
    expect(isValidPreviewEmail('hello there@example.com')).toBe(false)
    expect(isValidPreviewEmail('hello@example')).toBe(false)
    for (const address of ['hello,world@example.com', 'hello;world@example.com', '<hello@example.com>']) {
      expect(isValidPreviewEmail(address)).toBe(false)
    }
    expect(isValidPreviewEmail(' hello+site@example.com ')).toBe(true)
    expect(isValidPreviewEmail(`${'a'.repeat(308)}@example.com`)).toBe(true)
    expect(isValidPreviewEmail(`${'a'.repeat(309)}@example.com`)).toBe(false)
  })
})

describe('private checkout identity restoration', () => {
  const values = { BUSINESS_NAME: info.businessName, EMAIL: info.email }
  it('keeps a separate private inbox across pricing restores', () => {
    expect(checkoutAccountEmail(values, JSON.stringify({ ...info, accountEmail: ' PRIVATE@example.com ' }))).toBe('private@example.com')
  })

  it('preserves legacy shared email only when private identity was never supplied', () => {
    const { accountEmail: _oldAccount, ...legacy } = info
    expect(checkoutAccountEmail(values, JSON.stringify(legacy))).toBe(info.email)
    expect(checkoutAccountEmail(values, null)).toBe(info.email)
  })

  it.each(['', null, 123, 'not-email'])('blocks explicit invalid private identity (%s)', (accountEmail) => {
    expect(checkoutAccountEmail(values, JSON.stringify({ ...info, accountEmail }))).toBeNull()
  })

  it('rejects malformed storage and identity from a different or stale business draft', () => {
    for (const raw of ['{', 'null', '[]', JSON.stringify({ ...info, businessName: 'Another business' }), JSON.stringify({ ...info, email: 'another@example.com' })]) {
      expect(checkoutAccountEmail(values, raw)).toBeNull()
    }
  })
})
