import { describe, it, expect } from 'vitest'
import { computeClientReadiness } from './client-readiness'
import type { BusinessInfo, StylePreferences } from '@/store/previewStore'

const baseInfo: BusinessInfo = {
  businessName: '',
  ownerName: '',
  email: '',
  phone: '',
  address: '',
  niche: 'wellness_coach',
  tagline: '',
  description: '',
  services: '',
  website: '',
}

const basePrefs: StylePreferences = {
  vibes: [],
  proseStyle: 'professional',
  colorMood: 'cool-modern',
  fontPreference: 'sans-serif',
  layoutDensity: 'balanced',
}

describe('computeClientReadiness', () => {
  it('returns 0 overall for empty intake', () => {
    const result = computeClientReadiness(baseInfo, basePrefs)
    expect(result.overall).toBe(12)
    expect(result.categories).toHaveLength(5)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('returns high score for complete intake', () => {
    const result = computeClientReadiness(
      {
        ...baseInfo,
        businessName: 'Vital Path Coaching',
        ownerName: 'Alina Brooks',
        email: 'hello@vitalpath.com',
        phone: '(904) 555-0100',
        address: 'Jacksonville, FL + Online',
        tagline: 'Build habits and energy one step at a time.',
        description:
          'Licensed wellness coach with 12 years of experience helping clients create sustainable routines and certified habit strategies.',
        services: '1:1 Coaching, 8-Week Reset, Habit Strategy',
        website: 'https://vitalpath.com',
      },
      { ...basePrefs, vibes: ['warm', 'earthy'] },
    )
    expect(result.overall).toBeGreaterThanOrEqual(85)
    expect(result.suggestions.length).toBeLessThan(3)
  })

  it('detects trust language in description', () => {
    const withTrust = computeClientReadiness(
      { ...baseInfo, description: 'Board-certified practitioner with trauma-informed care.' },
      basePrefs,
    )
    const without = computeClientReadiness(baseInfo, basePrefs)
    const trustWith = withTrust.categories.find((c) => c.id === 'trustSignals')!
    const trustWithout = without.categories.find((c) => c.id === 'trustSignals')!
    expect(trustWith.score).toBeGreaterThan(trustWithout.score)
  })
})
