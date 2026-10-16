import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { ClientReadinessPanel } from '@/components/preview/ClientReadinessPanel'
import { categoryPercent, computeClientReadiness, type ReadinessCategoryId } from './client-readiness'
import type { BusinessInfo, StylePreferences } from '@/store/previewStore'

const baseInfo: BusinessInfo = {
  businessName: '',
  ownerName: '',
  email: '',
  accountEmail: '',
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

const completeInfo: BusinessInfo = {
  ...baseInfo,
  businessName: 'Vital Path Coaching',
  ownerName: 'Alina Brooks',
  email: 'hello@vitalpath.com',
  address: 'Online sessions for clients in Florida',
  tagline: 'Practical support for everyday habits.',
  description: 'I help busy adults build routines through weekly coaching sessions.',
  services: 'Individual habit coaching',
}

const completePrefs: StylePreferences = { ...basePrefs, vibes: ['warm'] }

function categoryScore(info: BusinessInfo, id: ReadinessCategoryId): number {
  return computeClientReadiness(info, completePrefs).categories.find((category) => category.id === id)!.score
}

describe('computeClientReadiness', () => {
  it('counts only the two saved style defaults when the intake is empty', () => {
    const result = computeClientReadiness(baseInfo, basePrefs)
    expect(result.overall).toBe(12)
    expect(result.categories).toHaveLength(5)
    expect(result.suggestions).toContain('Add your business name so visitors know who they are contacting.')
  })

  it('accepts one real service, one style, one contact method, and no existing site', () => {
    const result = computeClientReadiness(completeInfo, completePrefs)
    expect(result.overall).toBe(100)
    expect(result.suggestions).toEqual([])
  })

  it('does not reward padding a description or adding unnecessary services or styles', () => {
    const concise = computeClientReadiness(completeInfo, completePrefs)
    const padded = computeClientReadiness(
      {
        ...completeInfo,
        description: `${completeInfo.description} ${'More information. '.repeat(20)}`,
        services: `${completeInfo.services}, Another service, A third service`,
      },
      { ...completePrefs, vibes: ['warm', 'earthy', 'clean'] },
    )
    expect(concise).toEqual(padded)
  })

  it.each([
    'Learn to pause and return to a calmer routine.',
    'Modern support for everyday habits.',
    'Registered nurse (RN) offering habit coaching.',
    'Board-certified practitioner with trauma-informed care.',
    'I help busy adults build routines.',
  ])('does not award a credibility bonus for description keywords: %s', (description) => {
    const candidate = computeClientReadiness({ ...completeInfo, description }, completePrefs)
    expect(candidate).toEqual(computeClientReadiness(completeInfo, completePrefs))
    expect(candidate.categories.find((category) => category.id === 'trustSignals')?.label).toBe('About you')
  })

  it('asks for an accurate introduction without requiring credentials', () => {
    const result = computeClientReadiness({ ...completeInfo, description: '' }, completePrefs)
    expect(result.suggestions).toEqual([
      'Introduce who you help and how you work. Include experience or qualifications only if accurate; credentials are optional.',
    ])
  })

  it.each(['', 'https://vitalpath.com'])('treats an existing website as optional: %s', (website) => {
    expect(computeClientReadiness({ ...completeInfo, website }, completePrefs))
      .toEqual(computeClientReadiness(completeInfo, completePrefs))
  })

  it.each([
    { email: ' hello@vitalpath.com ', phone: '' },
    { email: '', phone: '+1 (904) 555-0100' },
    { email: 'hello@vitalpath.com', phone: '(904) 555-0100' },
  ])('accepts either contact method without asking for both: %j', (contact) => {
    const result = computeClientReadiness({ ...completeInfo, ...contact }, completePrefs)
    expect(result.overall).toBe(100)
    expect(result.suggestions).toEqual([])
  })

  it('asks for one monitored contact method when neither is supplied', () => {
    const result = computeClientReadiness({ ...completeInfo, email: '', phone: '' }, completePrefs)
    expect(result.suggestions).toEqual([
      'Add an email address or phone number you monitor. Either contact method is enough.',
    ])
    expect(result.categories.find((category) => category.id === 'bookingPath')?.score).toBe(0)
  })

  it('does not mistake a private account email for public website contact details', () => {
    const info = { ...completeInfo, email: '', phone: '', accountEmail: 'private@example.com' }
    expect(categoryScore(info, 'bookingPath')).toBe(0)
    expect(computeClientReadiness(info, completePrefs).suggestions).toContain(
      'Add an email address or phone number you monitor. Either contact method is enough.',
    )
  })

  it.each([
    { email: 'not-an-email', phone: '' },
    { email: '', phone: '123' },
    { email: '', phone: 'call me tomorrow' },
  ])('does not count malformed contact information: %j', (contact) => {
    const info = { ...completeInfo, ...contact }
    expect(categoryScore(info, 'bookingPath')).toBe(0)
    expect(computeClientReadiness(info, completePrefs).suggestions).toHaveLength(1)
  })

  it('retains a usable contact method while flagging another malformed method', () => {
    const result = computeClientReadiness({ ...completeInfo, phone: '123' }, completePrefs)
    expect(result.categories.find((category) => category.id === 'bookingPath')?.score).toBe(20)
    expect(result.suggestions).toEqual(['Check the phone number, including its area or country code.'])
  })

  it.each(['Online sessions in Florida', 'Virtual sessions in Ontario', 'London', 'Île-de-France'])(
    'accepts a supplied service area without requiring a US street address: %s',
    (address) => {
      const result = computeClientReadiness({ ...completeInfo, address }, completePrefs)
      expect(result.overall).toBe(100)
      expect(result.suggestions).toEqual([])
    },
  )

  it('asks virtual practices to describe where they can serve clients without requesting a street address', () => {
    const result = computeClientReadiness({ ...completeInfo, address: '' }, completePrefs)
    expect(result.suggestions).toEqual([
      'Add your city, region, or online service area. For virtual work, say where you can serve clients; a street address is optional.',
    ])
  })

  it('does not hide service-area or style guidance behind an arbitrary suggestion limit', () => {
    const result = computeClientReadiness(baseInfo, basePrefs)
    expect(result.suggestions).toHaveLength(8)
    expect(result.suggestions.at(-2)).toContain('street address is optional')
    expect(result.suggestions.at(-1)).toContain('One preferred style is enough')
  })

  it('does not count whitespace or empty comma-separated services as supplied details', () => {
    const whitespaceInfo = Object.fromEntries(Object.keys(baseInfo).map((key) => [key, '  '])) as unknown as BusinessInfo
    expect(computeClientReadiness(whitespaceInfo, basePrefs)).toEqual(computeClientReadiness(baseInfo, basePrefs))
    expect(categoryScore({ ...completeInfo, services: ' , , ' }, 'offerClarity')).toBe(14)
  })
})

describe('ClientReadinessPanel', () => {
  it.each([false, true])('describes completeness honestly and keeps manual launch checks at 100%% (compact: %s)', (compact) => {
    const result = computeClientReadiness(completeInfo, completePrefs)
    const markup = renderToStaticMarkup(createElement(ClientReadinessPanel, { result, compact }))
    expect(markup).toContain('Your website details')
    expect(markup).toContain('Website details 100 percent complete')
    expect(markup).toContain('It does not verify credentials, test booking, or predict enquiries.')
    expect(markup).toContain('Before you publish')
    expect(markup).toContain('Replace sample text, photos, and contact details')
    expect(markup).toContain('every claim and qualification is accurate')
    expect(markup).toContain('first appointment and fees')
    expect(markup).toContain('send a test enquiry')
    expect(markup).not.toContain('Improve your score')
    expect(markup).not.toContain('Details to add or review')
  })
})

describe('categoryPercent', () => {
  it('handles an empty category without dividing by zero', () => {
    expect(categoryPercent({ id: 'offerClarity', label: 'Practice overview', score: 0, maxScore: 0 })).toBe(0)
  })
})
