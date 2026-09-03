import {
  processQueuedStripeEvent,
} from '../../apps/generator-app/src/lib/stripe-fulfillment-worker'
import {
  isStripeEventId,
  isWorkerAuthorized,
} from '../../apps/generator-app/src/lib/stripe-fulfillment-queue'

/**
 * Authenticated, asynchronous Stripe fulfillment worker. Netlify acknowledges
 * the invocation with 202 before this handler runs, then gives the work up to
 * 15 minutes and retries handler failures twice.
 */
export default async function handler(request: Request): Promise<void> {
  if (!isWorkerAuthorized(
    request.headers.get('authorization'),
    process.env.STRIPE_FULFILLMENT_WORKER_SECRET,
  )) {
    console.warn('[stripe-fulfillment] rejected unauthenticated invocation')
    return
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    console.warn('[stripe-fulfillment] rejected malformed JSON')
    return
  }
  const eventId = (payload as { eventId?: unknown } | null)?.eventId
  if (!isStripeEventId(eventId)) {
    console.warn('[stripe-fulfillment] rejected invalid event ID')
    return
  }

  const result = await processQueuedStripeEvent(eventId)
  console.info('[stripe-fulfillment] invocation complete', { eventId, result })
}

export const config = {
  background: true,
  path: '/.netlify/functions/stripe-fulfillment',
  method: 'POST',
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 120,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
