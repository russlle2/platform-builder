import { describe, expect, it, vi } from 'vitest'
import {
  STRIPE_FULFILLMENT_WORKER_PATH,
  fulfillmentErrorMessage,
  isStripeEventId,
  isWorkerAuthorized,
  stripeFulfillmentRetryDelayMs,
  stripeFulfillmentWorkerUrl,
  stripeEventBusinessKey,
} from './stripe-fulfillment-queue'

describe('stripe fulfillment queue safeguards', () => {
  it('only accepts bounded Stripe event identifiers', () => {
    expect(isStripeEventId('evt_123456')).toBe(true)
    expect(isStripeEventId('evt_bad/path')).toBe(false)
    expect(isStripeEventId('pi_123456')).toBe(false)
    expect(isStripeEventId('evt_' + 'a'.repeat(256))).toBe(false)
  })

  it('requires an exact bearer secret', () => {
    expect(isWorkerAuthorized('Bearer internal-secret', 'internal-secret')).toBe(true)
    expect(isWorkerAuthorized('Bearer internal-secreu', 'internal-secret')).toBe(false)
    expect(isWorkerAuthorized('Basic internal-secret', 'internal-secret')).toBe(false)
    expect(isWorkerAuthorized(null, 'internal-secret')).toBe(false)
    expect(isWorkerAuthorized('Bearer internal-secret', undefined)).toBe(false)
  })

  it('backs off durable retries and caps the delay', () => {
    expect(stripeFulfillmentRetryDelayMs(1)).toBe(60_000)
    expect(stripeFulfillmentRetryDelayMs(3)).toBe(300_000)
    expect(stripeFulfillmentRetryDelayMs(99)).toBe(7_200_000)
  })

  it('serializes events that mutate the same checkout or subscription', () => {
    expect(stripeEventBusinessKey({
      id: 'evt_checkout',
      type: 'checkout.session.async_payment_succeeded',
      data: { object: { id: 'cs_same', subscription: 'sub_same' } },
    })).toBe('subscription:sub_same')
    expect(stripeEventBusinessKey({
      id: 'evt_checkout_one_time',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_one_time' } },
    })).toBe('checkout:cs_one_time')
    expect(stripeEventBusinessKey({
      id: 'evt_invoice',
      type: 'invoice.paid',
      data: { object: { parent: { subscription_details: { subscription: 'sub_same' } } } },
    })).toBe('subscription:sub_same')
    expect(stripeEventBusinessKey({
      id: 'evt_subscription',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_same' } },
    })).toBe('subscription:sub_same')
  })

  it('builds the fixed worker endpoint without inheriting paths', () => {
    expect(stripeFulfillmentWorkerUrl('https://dailyclarity.org/api/stripe/webhook'))
      .toBe(`https://dailyclarity.org${STRIPE_FULFILLMENT_WORKER_PATH}`)
  })

  it('rejects insecure production dispatch and bounds single-line errors', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => stripeFulfillmentWorkerUrl('http://dailyclarity.org')).toThrow(/HTTPS/)
    vi.unstubAllEnvs()
    expect(fulfillmentErrorMessage(new Error(`first\nsecond${'x'.repeat(3_000)}`)))
      .toHaveLength(2_000)
  })
})
