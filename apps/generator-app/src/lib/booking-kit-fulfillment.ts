import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BOOKING_KIT_CHECKOUT_TYPE } from './stripe-runtime'
import {
  assertBookingKitArtifact, emailBookingKitLink, issueBookingKitLink,
  loadBookingKitOrder, normalizeBookingKitEmail, type BookingKitOrder,
} from './booking-kit-server'

function objectId(value: unknown): string | null {
  if (typeof value === 'string') return value
  return value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' ? value.id : null
}

/** Compare authoritative Stripe objects to the immutable order saved before checkout. */
export function assertBookingKitPayment(order: BookingKitOrder, session: Stripe.Checkout.Session): string {
  const lines = session.line_items
  const line = lines?.data[0]
  // Hosted Checkout can correct the prefilled email. Trust the verified,
  // session-bound Stripe response; never strand a buyer who fixes a typo.
  const purchaseEmail = normalizeBookingKitEmail(session.customer_details?.email || session.customer_email)
  if (
    !order.stripe_session_id || session.id !== order.stripe_session_id ||
    session.metadata?.checkoutType !== BOOKING_KIT_CHECKOUT_TYPE ||
    session.metadata?.bookingKitOrderId !== order.id || session.client_reference_id !== order.id ||
    session.mode !== 'payment' || session.currency !== order.currency || order.currency !== 'usd' ||
    session.amount_total !== order.amount_cents || order.amount_cents !== 900 ||
    !lines || lines.has_more || lines.data.length !== 1 || !line || line.quantity !== 1 ||
    objectId(line.price) !== order.stripe_price_id || line.currency !== order.currency ||
    line.amount_total !== order.amount_cents ||
    !purchaseEmail
  ) throw new Error('booking_kit_payment_mismatch')
  assertBookingKitArtifact(order)
  return purchaseEmail
}

export type BookingKitPaymentEvent = { created: number; type: string }

function paymentTimestamp(event: BookingKitPaymentEvent): string {
  if (!Number.isSafeInteger(event.created) || event.created <= 0 || event.created * 1000 > Date.now() + 300_000) {
    throw new Error('booking_kit_paid_event_timestamp_invalid')
  }
  return new Date(event.created * 1000).toISOString()
}

async function revokeBookingKit(db: SupabaseClient, order: BookingKitOrder, payment: Stripe.PaymentIntent, purchaseEmail: string, paidAt: string | null): Promise<void> {
  const { error } = await db.rpc('revoke_booking_kit_order', {
    p_order_id: order.id, p_session_id: order.stripe_session_id, p_payment_intent_id: payment.id, p_paid_at: paidAt, p_purchase_email: purchaseEmail,
  })
  if (error) throw new Error('booking_kit_refund_save_failed')
}

export async function fulfillBookingKit(db: SupabaseClient, stripe: Stripe, eventSession: Stripe.Checkout.Session, event: BookingKitPaymentEvent): Promise<void> {
  const orderId = eventSession.metadata?.bookingKitOrderId
  if (!orderId) throw new Error('booking_kit_order_id_missing')
  let order = await loadBookingKitOrder(db, orderId)
  // The event must match the stored session as well as the current API response.
  if (eventSession.id !== order.stripe_session_id) throw new Error('booking_kit_session_mismatch')
  const session = await stripe.checkout.sessions.retrieve(eventSession.id, { expand: ['line_items'] })
  const purchaseEmail = assertBookingKitPayment(order, session)
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) throw new Error('booking_kit_paid_event_invalid')
  const paidEvent = event.type === 'checkout.session.async_payment_succeeded' || eventSession.payment_status === 'paid'
  if (!paidEvent || session.payment_status !== 'paid') {
    const { error } = await db.from('booking_kit_orders').update({ state: 'payment_pending' })
      .eq('id', order.id).in('state', ['checkout_pending', 'payment_pending'])
    if (error) throw new Error('booking_kit_pending_save_failed')
    return
  }
  const paymentIntentId = objectId(session.payment_intent)
  if (!paymentIntentId) throw new Error('booking_kit_payment_intent_missing')
  const payment = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] })
  if (payment.metadata.checkoutType !== BOOKING_KIT_CHECKOUT_TYPE || payment.metadata.bookingKitOrderId !== order.id ||
    payment.status !== 'succeeded' || payment.currency !== order.currency || payment.amount_received !== order.amount_cents ||
    (order.stripe_payment_intent_id && order.stripe_payment_intent_id !== payment.id)) {
    throw new Error('booking_kit_payment_intent_mismatch')
  }
  // A charge can be created days before an asynchronous payment succeeds.
  // Start hosted access at the authenticated paid-event timestamp, never at
  // charge creation or delayed worker execution.
  const paidAt = paymentTimestamp(event)
  // Check current refunds too: a refund can arrive before a delayed paid event.
  const refunds = await stripe.refunds.list({ payment_intent: payment.id, limit: 100 })
  if (refunds.data.some((refund) => refund.status === 'succeeded' && refund.amount > 0)) {
    await revokeBookingKit(db, order, payment, purchaseEmail, paidAt)
    return
  }
  if (refunds.has_more) throw new Error('booking_kit_refund_verification_incomplete')
  const { error } = await db.rpc('fulfill_booking_kit_order', {
    p_order_id: order.id, p_session_id: session.id, p_payment_intent_id: payment.id, p_paid_at: paidAt, p_purchase_email: purchaseEmail,
  })
  if (error) throw new Error('booking_kit_paid_save_failed')
  order = await loadBookingKitOrder(db, order.id)
  if (order.state !== 'paid' || !order.access_expires_at || Date.parse(order.access_expires_at) <= Date.now() || order.delivery_sent_at) return
  // Entitlement is committed before email. Transport failures retry in the
  // existing durable worker without taking away the buyer's browser access.
  try {
    const link = await issueBookingKitLink(db, order.id)
    await emailBookingKitLink(order.purchase_email, link, order.access_expires_at)
    const { error: markError } = await db.from('booking_kit_orders').update({
      delivery_sent_at: new Date().toISOString(),
    }).eq('id', order.id).eq('state', 'paid')
    if (markError) throw new Error('booking_kit_delivery_marker_failed')
  } catch {
    await db.from('booking_kit_orders').update({ delivery_failed_at: new Date().toISOString() }).eq('id', order.id)
    throw new Error('booking_kit_delivery_failed')
  }
}

export async function failBookingKitCheckout(db: SupabaseClient, session: Stripe.Checkout.Session): Promise<void> {
  if (!session.metadata?.bookingKitOrderId) return
  const { error } = await db.from('booking_kit_orders').update({ state: 'checkout_failed' })
    .eq('id', session.metadata.bookingKitOrderId).eq('stripe_session_id', session.id)
    .in('state', ['checkout_pending', 'payment_pending'])
  if (error) throw new Error('booking_kit_checkout_failure_save_failed')
}

export async function handleBookingKitRefund(db: SupabaseClient, stripe: Stripe, event: Stripe.Event): Promise<void> {
  let paymentIntentId: string | null = null
  if (event.type === 'charge.refunded') {
    paymentIntentId = objectId((event.data.object as Stripe.Charge).payment_intent)
  } else {
    const refund = event.data.object as Stripe.Refund
    if (refund.status !== 'succeeded' || refund.amount <= 0) return
    paymentIntentId = objectId(refund.payment_intent)
    if (!paymentIntentId && refund.charge) {
      const charge = await stripe.charges.retrieve(objectId(refund.charge)!)
      paymentIntentId = objectId(charge.payment_intent)
    }
  }
  if (!paymentIntentId) return
  const payment = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] })
  if (payment.metadata.checkoutType !== BOOKING_KIT_CHECKOUT_TYPE) return
  const orderId = payment.metadata.bookingKitOrderId
  if (!orderId) throw new Error('booking_kit_refund_order_missing')
  const order = await loadBookingKitOrder(db, orderId)
  if (order.state === 'refunded') return
  if (!order.stripe_session_id) throw new Error('booking_kit_refund_session_missing')
  const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, { expand: ['line_items'] })
  const purchaseEmail = assertBookingKitPayment(order, session)
  if (objectId(session.payment_intent) !== payment.id) throw new Error('booking_kit_refund_payment_mismatch')
  const refunds = await stripe.refunds.list({ payment_intent: payment.id, limit: 100 })
  if (refunds.data.some((refund) => refund.status === 'succeeded' && refund.amount > 0)) {
    await revokeBookingKit(db, order, payment, purchaseEmail, order.paid_at)
  } else if (refunds.has_more) {
    throw new Error('booking_kit_refund_verification_incomplete')
  }
}
