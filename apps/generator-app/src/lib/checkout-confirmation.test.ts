import { describe, expect, it } from 'vitest'
import type Stripe from 'stripe'
import { describeCheckoutConfirmation } from './checkout-confirmation'

type Session = Parameters<typeof describeCheckoutConfirmation>[0]
function checkout(overrides: Partial<Session> = {}): Session {
  return {
    status: 'complete', payment_status: 'paid', mode: 'subscription', livemode: false,
    subscription: 'sub_fixture', metadata: { checkoutType: 'template_subscription', planKey: 'basic', slug: 'clear-wellness' },
    ...overrides,
  }
}

describe('checkout confirmation', () => {
  it('confirms a paid sandbox checkout without claiming fulfillment or exposing a portal credential', () => {
    const result = describeCheckoutConfirmation(checkout(), false)
    expect(result).toMatchObject({ ok: true, slug: 'clear-wellness', planName: 'Basic', testMode: true })
    expect(result).not.toHaveProperty('siteUrl')
    expect(result).not.toHaveProperty('portalToken')
  })

  it('rejects unfinished, asynchronous-unpaid and opposite-environment sessions', () => {
    expect(describeCheckoutConfirmation(checkout({ status: 'open' }), false).ok).toBe(false)
    expect(describeCheckoutConfirmation(checkout({ payment_status: 'unpaid' }), false).ok).toBe(false)
    expect(describeCheckoutConfirmation(checkout({ livemode: true }), false).ok).toBe(false)
    expect(describeCheckoutConfirmation(checkout(), true).ok).toBe(false)
  })

  it('distinguishes an actual trial from a discounted zero-total subscription', () => {
    const free = checkout({ payment_status: 'no_payment_required', subscription: { id: 'sub_free', status: 'active' } as Stripe.Subscription })
    expect(describeCheckoutConfirmation(free, false)).toMatchObject({ ok: true, trialStarted: false, noPaymentRequired: true })
    const trial = checkout({ payment_status: 'no_payment_required', subscription: { id: 'sub_trial', status: 'trialing' } as Stripe.Subscription })
    expect(describeCheckoutConfirmation(trial, false)).toMatchObject({ ok: true, trialStarted: true })
    expect(describeCheckoutConfirmation(checkout({ payment_status: 'no_payment_required', subscription: null }), false).ok).toBe(false)
    const unexpanded = checkout({ payment_status: 'no_payment_required', subscription: 'sub_unexpanded' })
    expect(describeCheckoutConfirmation(unexpanded, false)).toMatchObject({ ok: true, trialStarted: false, noPaymentRequired: true })
  })

  it('requires a subscription reference before confirming a subscription checkout', () => {
    expect(describeCheckoutConfirmation(checkout({ subscription: null }), false).ok).toBe(false)
    expect(describeCheckoutConfirmation(checkout({ subscription: '' }), false).ok).toBe(false)
  })

  it('confirms a historical paid checkout without treating a canceled subscription as a current trial', () => {
    const completed = checkout({ subscription: { id: 'sub_canceled', status: 'canceled' } as Stripe.Subscription })
    expect(describeCheckoutConfirmation(completed, false)).toMatchObject({ ok: true, trialStarted: false, noPaymentRequired: false })
  })

  it('rejects unrelated products and mismatched checkout modes', () => {
    expect(describeCheckoutConfirmation(checkout({ metadata: { checkoutType: 'booking_kit' } }), false).ok).toBe(false)
    expect(describeCheckoutConfirmation(checkout({ mode: 'payment' }), false).ok).toBe(false)
    expect(describeCheckoutConfirmation(checkout({ metadata: { checkoutType: 'custom_build' } }), false).ok).toBe(false)
  })

  it('confirms custom builds only with a completed paid one-time session', () => {
    const session = checkout({ mode: 'payment', subscription: null, metadata: { checkoutType: 'custom_build', customBuildRequestId: 'request-fixture' } })
    expect(describeCheckoutConfirmation(session, false)).toMatchObject({ ok: true, customBuild: true, requestId: 'request-fixture', testMode: true })
    expect(describeCheckoutConfirmation({ ...session, payment_status: 'no_payment_required' }, false).ok).toBe(false)
  })

  it('does not turn malformed metadata into a dashboard navigation target', () => {
    const session = checkout({ metadata: { checkoutType: 'template_subscription', slug: '../another?token=secret' } })
    expect(describeCheckoutConfirmation(session, false).slug).toBeUndefined()
    expect(describeCheckoutConfirmation(checkout({ metadata: { checkoutType: 'template_subscription', slug: 'x'.repeat(31) } }), false).slug).toBeUndefined()
    expect(describeCheckoutConfirmation(checkout({ metadata: { checkoutType: 'template_subscription', slug: 'admin' } }), false).slug).toBeUndefined()
  })
})
