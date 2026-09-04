import { describe, it, expect } from 'vitest'
import {
  normalizePlanKey,
  isManagedPlan,
  getPlan,
  PLANS,
  MANAGED_FEATURES,
} from '../src/lib/plans'

describe('plans', () => {
  it('normalizes legacy growth alias to security_ads', () => {
    expect(normalizePlanKey('growth')).toBe('security_ads')
    expect(normalizePlanKey('pro')).toBe('security_ads')
    expect(normalizePlanKey('basic')).toBe('basic')
    expect(normalizePlanKey('unknown')).toBeNull()
  })

  it('gates managed service to security_ads only', () => {
    expect(isManagedPlan('basic')).toBe(false)
    expect(isManagedPlan('security_ads')).toBe(true)
    expect(isManagedPlan('growth')).toBe(true)
  })

  it('exposes correct pricing and stripe env mapping', () => {
    expect(PLANS.basic.price).toBe(20)
    expect(PLANS.security_ads.price).toBe(80)
    expect(PLANS.basic.stripePriceEnv).toBe('STRIPE_PRICE_BASIC')
    expect(PLANS.security_ads.stripePriceEnv).toBe('STRIPE_PRICE_GROWTH')
    expect(PLANS.basic.managedService).toBe(false)
    expect(PLANS.security_ads.managedService).toBe(true)
  })

  it('resolves plan definitions from aliases', () => {
    expect(getPlan('growth')?.name).toBe('Security + Ads')
    expect(getPlan('basic')?.managedService).toBe(false)
  })

  it('documents the single manual premium bundle', () => {
    expect(MANAGED_FEATURES.length).toBeGreaterThan(0)
    expect(MANAGED_FEATURES.some((f) => /ad/i.test(f))).toBe(true)
  })
})
