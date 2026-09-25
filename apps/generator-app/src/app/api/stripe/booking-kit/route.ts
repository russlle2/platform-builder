import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { composeBookingKit, parseBookingKitFacts, BOOKING_KIT_PRICE_CENTS } from '@/lib/booking-kit-content'
import {
  bookingKitArtifactHash, bookingKitClientIp, bookingKitCredential, bookingKitDatabase,
  bookingKitSalesEnabled, bookingKitStripeModeAllowed, consumeBookingKitLimit, normalizeBookingKitEmail,
  readBookingKitJson, resolveBookingKitPrice, BOOKING_KIT_PRIVATE_HEADERS,
} from '@/lib/booking-kit-server'
import { createStripeClient, stripeIntegrationIdentifier } from '@/lib/stripe-client'
import { BOOKING_KIT_CHECKOUT_TYPE } from '@/lib/stripe-runtime'
import { rateLimitByIp } from '@/lib/server-auth'
import { getTrustedSiteOrigin } from '@/lib/site-origin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: BOOKING_KIT_PRIVATE_HEADERS })
  if (!bookingKitSalesEnabled()) return json({ error: 'Booking Kit sales are not open yet.' }, 503)
  if (!rateLimitByIp(req, 'booking-kit-checkout', 5, 60 * 60 * 1000)) return json({ error: 'Please try again later.' }, 429)
  const origin = getTrustedSiteOrigin(req.url)
  if (!origin || (req.headers.get('origin') && req.headers.get('origin') !== origin)) return json({ error: 'Invalid checkout origin.' }, 403)
  let input: unknown
  try { input = await readBookingKitJson(req) } catch { return json({ error: 'Provide a valid brief.' }, 400) }
  const body = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const email = normalizeBookingKitEmail(body.purchaseEmail)
  const parsed = parseBookingKitFacts(body.facts)
  if (!email || !parsed.success) return json({ error: 'Check your purchase email and required service facts.', ...(!parsed.success ? { errors: parsed.errors } : {}) }, 400)
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !bookingKitStripeModeAllowed(key) || !process.env.STRIPE_WEBHOOK_SECRET || (process.env.STRIPE_FULFILLMENT_WORKER_SECRET?.length || 0) < 32 || !process.env.POSTMARK_SERVER_TOKEN || !process.env.EMAIL_FROM_ADDRESS) {
    return json({ error: 'Booking Kit checkout is temporarily unavailable.' }, 503)
  }
  try {
    const db = bookingKitDatabase()
    const { data: schemaVersion, error: schemaError } = await db.rpc('booking_kit_schema_version')
    if (schemaError || schemaVersion !== '20260925.2') throw new Error('booking_kit_schema_not_ready')
    if (!await consumeBookingKitLimit(db, `checkout-ip:${bookingKitClientIp(req)}`, 5)) return json({ error: 'Please try again later.' }, 429)
    const stripe = createStripeClient(key)
    const priceId = await resolveBookingKitPrice(stripe)
    const artifact = composeBookingKit(parsed.facts)
    const orderId = randomUUID()
    const credential = bookingKitCredential()
    const { error: insertError } = await db.from('booking_kit_orders').insert({
      id: orderId, state: 'checkout_pending', purchase_email: email, supplied_facts: parsed.facts,
      artifact, artifact_version: artifact.version, artifact_hash: bookingKitArtifactHash(artifact),
      stripe_price_id: priceId, amount_cents: BOOKING_KIT_PRICE_CENTS, currency: 'usd',
      checkout_access_hash: credential.hash, checkout_access_expires_at: credential.expiresAt,
    })
    if (insertError) throw new Error('booking_kit_order_save_failed')
    const metadata = { checkoutType: BOOKING_KIT_CHECKOUT_TYPE, bookingKitOrderId: orderId }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', line_items: [{ price: priceId, quantity: 1 }], customer_email: email,
      client_reference_id: orderId, metadata, payment_intent_data: { metadata },
      integration_identifier: stripeIntegrationIdentifier('dailyclarity-booking-kit', orderId),
      success_url: `${origin}/booking-kit/result`, cancel_url: `${origin}/booking-kit?canceled=1`,
      adaptive_pricing: { enabled: false },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      custom_text: { submit: { message: '$9 once. Private hosted access lasts 90 days after payment; downloaded copies remain editable. No subscription. Private links expire after one hour and can be recovered using your purchase email.' } },
    }, { idempotencyKey: `dailyclarity-booking-kit-${orderId}` })
    const { error: updateError } = await db.from('booking_kit_orders').update({ stripe_session_id: session.id }).eq('id', orderId)
    // Never return a payable checkout until its session is durably bound.
    if (updateError || !session.url) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined)
      throw new Error('booking_kit_session_save_failed')
    }
    return json({ url: session.url, orderId, accessToken: credential.token })
  } catch {
    console.error('[booking-kit] checkout preparation failed')
    return json({ error: 'Unable to prepare your kit checkout. Please try again.' }, 503)
  }
}
