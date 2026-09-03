import { timingSafeEqual } from 'node:crypto'

export const STRIPE_FULFILLMENT_WORKER_PATH = '/.netlify/functions/stripe-fulfillment'
export const STRIPE_FULFILLMENT_MAX_ATTEMPTS = 8
export const STRIPE_FULFILLMENT_LEASE_MS = 16 * 60 * 1000

/** Stripe event IDs are opaque, but bounded validation keeps worker input tiny and predictable. */
export function isStripeEventId(value: unknown): value is string {
  return typeof value === 'string' && /^evt_[A-Za-z0-9_]{6,255}$/.test(value)
}

/** Constant-time comparison for the private webhook-to-worker bearer credential. */
export function isWorkerAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization?.startsWith('Bearer ')) return false
  const candidate = authorization.slice('Bearer '.length)
  const expectedBuffer = Buffer.from(secret)
  const candidateBuffer = Buffer.from(candidate)
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer)
}

/**
 * Exponential retry schedule for durable recovery after Netlify's built-in
 * background retries are exhausted. Attempts are one-based.
 */
export function stripeFulfillmentRetryDelayMs(attempt: number): number {
  const scheduleMinutes = [1, 2, 5, 15, 30, 60, 120]
  const index = Math.max(0, Math.min(scheduleMinutes.length - 1, attempt - 1))
  return scheduleMinutes[index] * 60 * 1000
}

export function stripeFulfillmentWorkerUrl(origin: string): string {
  const parsed = new URL(origin)
  if (parsed.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && parsed.protocol === 'http:')) {
    throw new Error('Fulfillment dispatch requires an HTTPS application origin.')
  }
  return new URL(STRIPE_FULFILLMENT_WORKER_PATH, parsed.origin).toString()
}

export function fulfillmentErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'Unknown fulfillment error')
  return message.replace(/[\r\n]+/g, ' ').slice(0, 2_000)
}

function objectId(value: unknown): string | null {
  if (typeof value === 'string' && value) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' && id ? id : null
  }
  return null
}

/** Serialize events that mutate the same checkout or subscription resource. */
export function stripeEventBusinessKey(event: {
  id: string
  type: string
  data?: { object?: unknown }
}): string {
  const object = (event.data?.object || {}) as Record<string, unknown>
  if (event.type.startsWith('checkout.session.')) {
    return `checkout:${objectId(object) || event.id}`
  }
  if (event.type.startsWith('customer.subscription.')) {
    return `subscription:${objectId(object) || event.id}`
  }
  if (event.type.startsWith('invoice.')) {
    const parent = object.parent as Record<string, unknown> | null | undefined
    const details = parent?.subscription_details as Record<string, unknown> | null | undefined
    const subscriptionId = objectId(details?.subscription) || objectId(object.subscription)
    return subscriptionId ? `subscription:${subscriptionId}` : `invoice:${objectId(object) || event.id}`
  }
  return `event:${event.id}`
}
