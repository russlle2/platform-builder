import { describe, it, expect } from 'vitest'
import { validateLeadContact } from '@/lib/lead-validation'

describe('validateLeadContact', () => {
  it('requires email or phone', () => {
    expect(validateLeadContact('', '')).toBeTruthy()
  })

  it('accepts valid email', () => {
    expect(validateLeadContact('hello@example.com', '')).toBeNull()
  })

  it('rejects invalid email', () => {
    expect(validateLeadContact('not-an-email', '')).toBeTruthy()
  })

  it('accepts valid phone', () => {
    expect(validateLeadContact('', '(904) 555-0100')).toBeNull()
  })
})
