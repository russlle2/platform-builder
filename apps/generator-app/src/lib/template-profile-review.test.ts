import { describe, expect, it } from 'vitest'
import { hydrateTemplate } from './templates/template-hydration'
import { readProfileFields, reviewTemplateProfile, templateProfileScope, type ProfileField } from './template-profile-review'

const fields: ProfileField[] = [
  { name: 'BUSINESS_NAME', type: 'text', required: true },
  { name: 'EMAIL', type: 'email', required: true },
  { name: 'PRACTITIONER_NAME', required: true },
  { name: 'PHONE', type: 'tel', required: true },
  { name: 'CITY', required: true, default: 'Your City' },
  { name: 'STATE', required: true, default: 'Your State' },
  { name: 'TAGLINE', required: true, default: 'Care that meets you where you are.' },
  { name: 'BOOKING_URL', type: 'url', required: true },
]
const complete = { BUSINESS_NAME: 'Jane & Joe', EMAIL: 'hello@example.com', OWNER_NAME: 'Jane', PHONE_NUMBER: '+1 555 0100', CITY: 'Albany', STATE: 'New York', BOOKING_URL: '/contact.html' }

describe('selected-template profile review', () => {
  it('finds unfinished details without requiring a valid tagline default', () => {
    const issues = reviewTemplateProfile(fields, { BUSINESS_NAME: 'Studio', EMAIL: 'hello@example.com', BOOKING_URL: '/contact.html' })
    expect(issues.map((issue) => issue.name)).toEqual(['PRACTITIONER_NAME', 'PHONE', 'CITY', 'STATE'])
  })
  it('uses aliases, field types and defaults without changing or double-escaping raw values', () => {
    expect(reviewTemplateProfile(fields, complete)).toEqual([])
    expect(complete.BUSINESS_NAME).toBe('Jane & Joe')
    expect(hydrateTemplate('<h1>{{BUSINESS_NAME}}</h1>', complete, fields)).toBe('<h1>Jane &amp; Joe</h1>')
  })
  it.each(['+', 'ext', '.'])('rejects a required phone with no digits (%s)', (phone) => {
    expect(reviewTemplateProfile(fields, { ...complete, PHONE_NUMBER: phone })).toEqual([expect.objectContaining({ name: 'PHONE' })])
  })
  it('does not silently replace explicitly invalid input with a valid default', () => {
    expect(reviewTemplateProfile([{ name: 'BOOKING_URL', type: 'url', required: true, default: '/contact.html' }], { BOOKING_URL: 'javascript:alert(1)' }))
      .toEqual([expect.objectContaining({ name: 'BOOKING_URL' })])
  })
  it('rejects invalid metadata and private account tokens', () => {
    expect(readProfileFields([{ name: 'BAD-NAME', required: true }])).toBeNull()
    expect(readProfileFields([{ name: 'ACCOUNT_EMAIL', required: true }])).toBeNull()
    expect(readProfileFields([{ name: 'ACCOUNT__EMAIL', required: true }])).toBeNull()
    expect(readProfileFields([{ name: 'CITY' }, { name: 'city' }])).toBeNull()
    expect(reviewTemplateProfile([{ name: 'BAD-NAME', required: true }], {})).toHaveLength(1)
  })
  it('binds profile values to catalogue identity and template', () => {
    const pin = { contractVersion: 3, designId: 'design_one', contentPresetId: 'content_one', themePresetId: 'theme_one', qualityReceipt: 'receipt_one' }
    expect(templateProfileScope('sound_bath', 'one', pin)).not.toBe(templateProfileScope('sound_bath', 'two', pin))
    expect(templateProfileScope('sound_bath', 'one', pin)).not.toBe(templateProfileScope('sound_bath', 'one', { ...pin, qualityReceipt: 'receipt_two' }))
  })
})
