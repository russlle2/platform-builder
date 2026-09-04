import { createClient } from '@supabase/supabase-js'
import { requireInternalAdminOrThrow } from '@/lib/server-auth'
import { dispatchQueuedStripeEvent } from '@/lib/stripe-fulfillment-dispatch'
import { isStripeEventId } from '@/lib/stripe-fulfillment-queue'

/** Requeue a retained failed/dead-letter event after its root cause is fixed. */
export async function POST(request: Request) {
  const authError = requireInternalAdminOrThrow(request)
  if (authError) return authError

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: 'Fulfillment storage is unavailable.' }, { status: 503 })
  }

  let eventId: unknown
  try {
    eventId = (await request.json() as { eventId?: unknown }).eventId
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 })
  }
  if (!isStripeEventId(eventId)) {
    return Response.json({ error: 'A valid Stripe event ID is required.' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .update({
      status: 'queued',
      attempts: 0,
      last_error: null,
      processed_at: null,
      next_attempt_at: now,
      lease_token: null,
      lease_expires_at: null,
      updated_at: now,
    })
    .eq('event_id', eventId)
    .in('status', ['failed', 'dead_letter'])
    .select('event_id')
    .maybeSingle()
  if (error) {
    console.error('[stripe-fulfillment-retry] requeue failed:', error.message)
    return Response.json({ error: 'Could not requeue the event.' }, { status: 500 })
  }
  if (!data) {
    return Response.json({ error: 'No retryable event was found.' }, { status: 404 })
  }

  try {
    await dispatchQueuedStripeEvent(eventId, new URL(request.url).origin)
  } catch (error) {
    console.error('[stripe-fulfillment-retry] dispatch failed:', error)
    return Response.json(
      { error: 'Event was requeued; immediate dispatch failed and the recovery sweep will retry it.' },
      { status: 503 },
    )
  }
  return Response.json({ queued: true, eventId }, { status: 202 })
}
