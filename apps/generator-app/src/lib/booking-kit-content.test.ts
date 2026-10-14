import { describe, expect, it } from 'vitest'
import { artifactToText, BOOKING_KIT_CONTENT_VERSION, BOOKING_KIT_NICHES, composeBookingKit, parseBookingKitFacts, type BookingKitFacts } from './booking-kit-content'

const facts: BookingKitFacts = {
  niche: 'wellness_coach', service: 'A planning session', audience: 'adults preparing a weekly routine',
  format: 'Online one-to-one', duration: '45 minutes', pricingChoice: 'published', priceDetails: '$45 USD per session',
  bookingMethod: 'Email bookings@example.com', businessName: 'Example Practice',
}

describe('Booking Clarity Kit fact-based composition', () => {
  it.each(BOOKING_KIT_NICHES)('delivers the complete versioned kit for %s without invented claims', (niche) => {
    const kit = composeBookingKit({ ...facts, niche })
    expect(kit.version).toBe(BOOKING_KIT_CONTENT_VERSION)
    expect(kit.faqs).toHaveLength(5)
    expect(kit.headline).toBe('A planning session for adults preparing a weekly routine')
    expect(kit.serviceDescription).toContain('45 minutes')
    expect(kit.bookingCallToAction).toContain('bookings@example.com')
    expect(kit.businessBio).toContain('Example Practice')
    expect(kit.confirmationReply).toContain('[SEND ONLY AFTER YOU HAVE CONFIRMED THE BOOKING]')
    expect(kit.confirmationReply).toContain('[date, time and time zone]')
    const text = artifactToText(kit)
    expect(text).not.toMatch(/licensed|certified|guaranteed|cures|testimonials|24.hour cancellation|insurance accepted/i)
    expect(text).toContain('UNFINISHED')
    expect(kit.unfinishedItems).toHaveLength(4)
    expect(composeBookingKit({ ...facts, niche })).toEqual(kit)
  })
  it('uses distinct niche wording without changing supplied service facts', () => {
    const kits = BOOKING_KIT_NICHES.map((niche) => composeBookingKit({ ...facts, niche }))
    expect(new Set(kits.map((kit) => kit.businessBio)).size).toBe(5)
    expect(new Set(kits.map((kit) => kit.faqs[0].question)).size).toBe(5)
    expect(new Set(kits.map((kit) => kit.serviceDescription)).size).toBe(1)
  })
  it.each(['niche', 'service', 'audience', 'format', 'duration', 'pricingChoice', 'bookingMethod'])('requires %s', (key) => {
    const input = { ...facts, [key]: '   ' }
    expect(parseBookingKitFacts(input).success).toBe(false)
    expect(() => composeBookingKit(input)).toThrow('incomplete or invalid')
  })
  it.each([null, [], 'facts', 2])('rejects a malformed input: %s', (input) => {
    expect(parseBookingKitFacts(input).success).toBe(false)
  })
  it.each(['<script>alert(1)</script>', 'javascript:alert(1)', 'data:text/html,hello', 'hidden\u202eaddress', 'bad\u0000text'])('rejects unsafe supplied text: %s', (service) => {
    expect(parseBookingKitFacts({ ...facts, service }).success).toBe(false)
  })
  it('normalizes plain text, permits real booking URLs and drops undeclared properties', () => {
    const result = parseBookingKitFacts({ ...facts, businessName: '  Zoë’s   Practice  ', bookingMethod: 'https://example.com/book?service=one&date=soon', injected: '<script>bad</script>' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.facts.businessName).toBe('Zoë’s Practice')
    expect(result.facts.bookingMethod).toContain('https://example.com/book')
    expect(result.facts).not.toHaveProperty('injected')
  })
  it('requires a price only when published and never invents a price for quotes', () => {
    expect(parseBookingKitFacts({ ...facts, priceDetails: '' }).success).toBe(false)
    const quote = composeBookingKit({ ...facts, pricingChoice: 'quote', priceDetails: '$999' })
    expect(artifactToText(quote)).toContain('Ask for a quote before booking.')
    expect(artifactToText(quote)).not.toContain('$999')
    expect(artifactToText(composeBookingKit({ ...facts, pricingChoice: 'free' }))).toContain('no charge')
  })
  it('preserves supplied policies and clearly marks only the remaining missing items', () => {
    const kit = composeBookingKit({ ...facts, cancellationPolicy: 'Contact us 48 hours before your session to reschedule', preparation: 'Bring your notebook', locationDetails: 'The link is sent after booking' })
    expect(kit.faqs[4].answer).toContain('48 hours')
    expect(kit.confirmationReply).toContain('Bring your notebook')
    expect(kit.confirmationReply).not.toContain('[UNFINISHED:')
    expect(kit.unfinishedItems).toHaveLength(1)
    expect(artifactToText(kit)).toContain('CONFIRMATION AND PREPARATION REPLY')
  })
  it('bounds every free-text field and rejects non-string facts', () => {
    expect(parseBookingKitFacts({ ...facts, service: 'x'.repeat(161) }).success).toBe(false)
    expect(parseBookingKitFacts({ ...facts, cancellationPolicy: 'x'.repeat(601) }).success).toBe(false)
    expect(parseBookingKitFacts({ ...facts, duration: { minutes: 45 } }).success).toBe(false)
  })
})
