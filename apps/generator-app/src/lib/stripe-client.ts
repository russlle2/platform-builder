import Stripe from 'stripe'

export const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2026-08-26.dahlia'

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
}
