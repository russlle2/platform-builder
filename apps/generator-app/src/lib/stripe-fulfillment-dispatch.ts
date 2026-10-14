import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  isStripeEventId,
  stripeFulfillmentWorkerUrl,
} from './stripe-fulfillment-queue'

export async function markStripeEventDispatched(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from('stripe_webhook_events')
    .update({ last_dispatched_at: new Date().toISOString() })
    .eq('event_id', eventId)
  if (error) console.error('[webhook] dispatch marker failed:', error.message)
}

export async function dispatchQueuedStripeEvent(eventId: string, origin: string): Promise<void> {
  if (!isStripeEventId(eventId)) throw new Error('invalid_stripe_event_id')
  const secret = process.env.STRIPE_FULFILLMENT_WORKER_SECRET
  if (!secret) throw new Error('STRIPE_FULFILLMENT_WORKER_SECRET is not configured.')

  const response = await fetch(stripeFulfillmentWorkerUrl(origin), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ eventId }),
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  })
  if (response.status !== 202) {
    throw new Error(`fulfillment_dispatch:${response.status}`)
  }
}

export async function redispatchDueStripeEvents(
  origin: string,
  limit = 20,
): Promise<{ discovered: number; dispatched: number; failed: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase fulfillment configuration is incomplete.')
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  const now = new Date().toISOString()
  const batchLimit = Math.max(1, Math.min(50, Math.floor(limit)))
  const [{ data: due, error: dueError }, { data: stale, error: staleError }] = await Promise.all([
    supabase
      .from('stripe_webhook_events')
      .select('event_id')
      .in('status', ['queued', 'failed'])
      .lte('next_attempt_at', now)
      .order('next_attempt_at', { ascending: true })
      .limit(batchLimit),
    supabase
      .from('stripe_webhook_events')
      .select('event_id')
      .eq('status', 'processing')
      .lte('lease_expires_at', now)
      .order('lease_expires_at', { ascending: true })
      .limit(batchLimit),
  ])
  if (dueError) throw new Error(`fulfillment_due_query:${dueError.message}`)
  if (staleError) throw new Error(`fulfillment_stale_query:${staleError.message}`)

  const eventIds = [...new Set([...(due || []), ...(stale || [])].map((row) => row.event_id))]
    .filter(isStripeEventId)
    .slice(0, batchLimit)
  const results = await Promise.allSettled(
    eventIds.map(async (eventId) => {
      await dispatchQueuedStripeEvent(eventId, origin)
      await markStripeEventDispatched(supabase, eventId)
    }),
  )
  const dispatched = results.filter((result) => result.status === 'fulfilled').length
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('[stripe-fulfillment-sweeper] dispatch failed:', eventIds[index], result.reason)
    }
  })
  return { discovered: eventIds.length, dispatched, failed: eventIds.length - dispatched }
}
