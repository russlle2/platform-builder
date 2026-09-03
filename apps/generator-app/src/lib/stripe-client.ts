import Stripe from 'stripe'
import { createHash } from 'node:crypto'

export const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2026-08-26.dahlia'

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
}

/**
 * Stable across an idempotent retry, random across UUID-backed checkout
 * intents, and compliant with Stripe's eight-letter tracking suffix guidance.
 */
export function stripeIntegrationIdentifier(flow: string, randomIntentId: string): string {
  const label = flow.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  if (!label || !randomIntentId) throw new Error('Stripe integration identifier input is missing.')
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'
  const digest = createHash('sha256').update(randomIntentId).digest()
  const suffix = [...digest.subarray(0, 8)].map((byte) => alphabet[byte % alphabet.length]).join('')
  return `${label}-${suffix}`
}
