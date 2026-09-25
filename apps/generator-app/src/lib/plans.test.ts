import { describe, expect, it } from 'vitest'
import { shouldCreateManagedServiceTask } from './plans'

describe('managed service activation', () => {
  it('opens work for paid and trial-start premium checkouts', () => {
    expect(shouldCreateManagedServiceTask('security_ads', 'paid')).toBe(true)
    expect(shouldCreateManagedServiceTask('security_ads', 'no_payment_required')).toBe(true)
    expect(shouldCreateManagedServiceTask('growth', 'no_payment_required')).toBe(true)
  })

  it('does not open work for basic or unpaid checkouts', () => {
    expect(shouldCreateManagedServiceTask('basic', 'paid')).toBe(false)
    expect(shouldCreateManagedServiceTask('security_ads', 'unpaid')).toBe(false)
    expect(shouldCreateManagedServiceTask('security_ads', undefined)).toBe(false)
  })
})
