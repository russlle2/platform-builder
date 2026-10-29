import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCheckoutAttempt, inspectCheckoutAttempt, verifyCheckoutAttempt, CHECKOUT_ATTEMPT_MAX_AGE } from './checkout-resume'

const id = '123e4567-e89b-42d3-a456-426614174000'
const now = 1_800_000_000_000
const payload = { template: 'serene', customerValues: { BUSINESS_NAME: 'Example', EMAIL: 'public@example.com' } }
const intent = { id, slug: 'example', plan: 'basic', email: 'private@example.com', payload, status: 'session_created', stripe_session_id: 'cs_test_owned' }
const session = { id: 'cs_test_owned', status: 'open', mode: 'subscription', livemode: false, payment_status: 'unpaid', url: 'https://checkout.stripe.com/c/pay/cs_test_owned', client_reference_id: id,
  metadata: { checkoutType: 'template_subscription', checkoutIntentId: id, slug: 'example', planKey: 'basic' } }
const requested = { plan: 'basic', accountEmail: 'private@example.com', explicitSlug: 'example', payload }

beforeEach(() => vi.stubEnv('PORTAL_TOKEN_SECRET', 'a-test-only-domain-separated-signing-secret'))
afterEach(() => vi.unstubAllEnvs())

describe('checkout attempt capability', () => {
  it('binds only an intent with a bounded lifetime, without private payment or email fields', () => {
    const value = createCheckoutAttempt(id, now)!
    expect(verifyCheckoutAttempt(value, now)).toBe(id)
    expect(value).not.toContain('cs_test')
    expect(value).not.toContain('@')
    expect(verifyCheckoutAttempt(value, now + CHECKOUT_ATTEMPT_MAX_AGE * 1000)).toBeNull()
    expect(verifyCheckoutAttempt(value, now - 61_000)).toBeNull()
    expect(verifyCheckoutAttempt(value.replace(id, '123e4567-e89b-42d3-a456-426614174001'), now)).toBeNull()
    vi.stubEnv('PORTAL_TOKEN_SECRET', 'another-secret')
    expect(verifyCheckoutAttempt(value, now)).toBeNull()
  })
  it('rejects unsigned, malformed and oversized input', () => {
    for (const value of [undefined, '', id, 'x'.repeat(161), `v1.${id}.1800000000.forged`]) expect(verifyCheckoutAttempt(value, now)).toBeNull()
    vi.stubEnv('PORTAL_TOKEN_SECRET', '')
    expect(createCheckoutAttempt(id, now)).toBeNull()
  })
})

describe('live session reconciliation', () => {
  it('resumes the same draft regardless of object key order, including an auto-generated slug', () => {
    expect(inspectCheckoutAttempt(intent, session, { ...requested, explicitSlug: null,
      payload: { customerValues: { EMAIL: 'public@example.com', BUSINESS_NAME: 'Example' }, template: 'serene' } }, false)).toBe('open')
  })
  it.each([
    { plan: 'security_ads' }, { accountEmail: 'other@example.com' }, { explicitSlug: 'different' },
    { payload: { ...payload, customerValues: { ...payload.customerValues, BUSINESS_NAME: 'Changed' } } },
  ])('does not silently resume altered draft %j', patch => {
    expect(inspectCheckoutAttempt(intent, session, { ...requested, ...patch }, false)).toBe('changed')
  })
  it.each([
    { id: 'cs_test_foreign' }, { client_reference_id: 'foreign' }, { mode: 'payment' }, { livemode: true },
    { metadata: { ...session.metadata, slug: 'foreign' } }, { metadata: { ...session.metadata, checkoutIntentId: 'foreign' } },
    { metadata: { ...session.metadata, planKey: 'security_ads' } }, { metadata: null },
    { url: 'https://attacker.example/session' }, { url: 'http://checkout.stripe.com/session' },
    { status: null }, { payment_status: 'paid' },
  ])('preserves uncertainty on mismatched or invalid session %j', patch => {
    expect(inspectCheckoutAttempt(intent, { ...session, ...patch }, requested, false)).toBe('uncertain')
  })
  it('recognizes completed free trials before changed draft matching', () => {
    expect(inspectCheckoutAttempt(intent, { ...session, status: 'complete', payment_status: 'no_payment_required', url: null }, { ...requested, plan: 'security_ads' }, false)).toBe('complete')
  })
  it('accepts only provider-confirmed unpaid expiration, not a local deadline', () => {
    expect(inspectCheckoutAttempt(intent, { ...session, status: 'expired', url: null }, requested, false)).toBe('expired')
    expect(inspectCheckoutAttempt(intent, { ...session, status: 'expired', payment_status: 'paid' }, requested, false)).toBe('uncertain')
    expect(inspectCheckoutAttempt(intent, session, requested, null)).toBe('uncertain')
  })
})
