import { describe, expect, it } from 'vitest'
import Stripe from 'stripe'
import { isDefinitiveCheckoutRejection } from './checkout-creation-error'

describe('Stripe checkout creation outcome classification', () => {
  it.each([
    new Stripe.errors.StripeInvalidRequestError({ statusCode: 400 }),
    new Stripe.errors.StripeInvalidRequestError({ statusCode: 404 }),
    new Stripe.errors.StripeAuthenticationError({ statusCode: 401 }),
    new Stripe.errors.StripePermissionError({ statusCode: 403 }),
    new Stripe.errors.StripeCardError({ statusCode: 402 }),
  ])('recognizes definitive Stripe rejection %s', (error) => {
    expect(isDefinitiveCheckoutRejection(error)).toBe(true)
  })

  it.each([
    new Stripe.errors.StripeConnectionError({}),
    new Stripe.errors.StripeAPIError({ statusCode: 500 }),
    new Stripe.errors.StripeAPIError({ statusCode: 503 }),
    new Stripe.errors.StripeIdempotencyError({ statusCode: 400 }),
    new Stripe.errors.StripeAPIError({ statusCode: 409 }),
    new Stripe.errors.StripeRateLimitError({ statusCode: 429 }),
    new Stripe.errors.StripeInvalidRequestError({ statusCode: 500 }),
    new Stripe.errors.StripeInvalidRequestError({}),
    new Error('Unclassified transport error'),
    { statusCode: 400 },
  ])('preserves unknown, retry-conflict or ambiguous outcome %s', (error) => {
    expect(isDefinitiveCheckoutRejection(error)).toBe(false)
  })
})
