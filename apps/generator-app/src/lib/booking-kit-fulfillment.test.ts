import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { composeBookingKit } from './booking-kit-content'
import { bookingKitArtifactHash, type BookingKitOrder } from './booking-kit-server'
import { assertBookingKitPayment, fulfillBookingKit, handleBookingKitRefund } from './booking-kit-fulfillment'
import { processStripeEvent } from './stripe-fulfillment-worker'
import { stripeEventBusinessKey } from './stripe-fulfillment-queue'
import { sendEmail } from './email'

vi.mock('./email', async (original) => ({ ...await original<typeof import('./email')>(), sendEmail: vi.fn() }))

function fixtures() {
  const artifact = composeBookingKit({ niche: 'sound_bath', service: 'Evening sound bath', audience: 'Adults', format: 'Small group', duration: '60 minutes', pricingChoice: 'quote', bookingMethod: 'Email hello@example.test' })
  const order: BookingKitOrder = {
    id: 'order_one', state: 'checkout_pending', purchase_email: 'buyer@example.test', artifact,
    artifact_version: artifact.version, artifact_hash: bookingKitArtifactHash(artifact),
    stripe_price_id: 'price_kit', stripe_session_id: 'cs_kit', stripe_payment_intent_id: null,
    amount_cents: 900, currency: 'usd', paid_at: null, access_expires_at: null, delivery_sent_at: null,
  }
  const session = {
    id: 'cs_kit', metadata: { checkoutType: 'booking_kit', bookingKitOrderId: order.id },
    client_reference_id: order.id, mode: 'payment', currency: 'usd', amount_total: 900,
    payment_status: 'paid', payment_intent: 'pi_kit', customer_details: { email: 'buyer@example.test' },
    line_items: { has_more: false, data: [{ quantity: 1, price: { id: 'price_kit' }, currency: 'usd', amount_total: 900 }] },
  } as unknown as Stripe.Checkout.Session
  const payment = {
    id: 'pi_kit', status: 'succeeded', currency: 'usd', amount_received: 900,
    metadata: session.metadata, latest_charge: { id: 'ch_kit', created: Math.floor(Date.now() / 1000), amount_refunded: 0 },
  }
  const refundList = { data: [] as Array<{ status: string; amount: number }>, has_more: false }
  const stripe = {
    checkout: { sessions: { retrieve: vi.fn(async () => session) } },
    paymentIntents: { retrieve: vi.fn(async () => payment) },
    refunds: { list: vi.fn(async () => refundList) },
  } as unknown as Stripe
  const tokens: Record<string, unknown>[] = []
  const db = {
    from: vi.fn((table: string) => {
      if (!['booking_kit_orders', 'booking_kit_access_tokens'].includes(table)) throw new Error(`Unexpected non-kit table ${table}`)
      let patch: Record<string, unknown> | null = null
      const predicates: Array<() => boolean> = []
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((key: string, value: unknown) => { predicates.push(() => (order as unknown as Record<string, unknown>)[key] === value); return query }),
        in: vi.fn((key: string, values: unknown[]) => { predicates.push(() => values.includes((order as unknown as Record<string, unknown>)[key])); return query }),
        update: vi.fn((value: Record<string, unknown>) => { patch = value; return query }),
        insert: vi.fn(async (value: Record<string, unknown>) => { tokens.push(value); return { error: null } }),
        maybeSingle: vi.fn(async () => ({ data: { ...order }, error: null })),
        then: (resolve: (value: unknown) => unknown) => {
          if (patch && predicates.every(predicate => predicate())) Object.assign(order, patch)
          return Promise.resolve(resolve({ error: null }))
        },
      }
      return query
    }),
    rpc: vi.fn(async (name: string, args: { p_purchase_email: string; p_paid_at: string | null }) => {
      if (name === 'fulfill_booking_kit_order' && !['paid', 'refunded'].includes(order.state)) {
        Object.assign(order, { state: 'paid', purchase_email: args.p_purchase_email, stripe_payment_intent_id: 'pi_kit', paid_at: args.p_paid_at, access_expires_at: new Date(Date.parse(args.p_paid_at!) + 90 * 86400000).toISOString() })
      } else if (name === 'revoke_booking_kit_order') {
        Object.assign(order, { state: 'refunded', purchase_email: args.p_purchase_email, paid_at: order.paid_at || args.p_paid_at })
      }
      return { data: true, error: null }
    }),
  } as unknown as SupabaseClient
  return { order, session, stripe, db, payment, refundList, tokens, paidEvent: { type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000) } }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dailyclarity.example.test')
  vi.mocked(sendEmail).mockResolvedValue({ To: 'buyer@example.test', SubmittedAt: '', MessageID: '', ErrorCode: 0, Message: '' })
})

describe('Booking Kit verified fulfillment', () => {
  it('fulfills a paid kit through the existing worker without touching site/slug/hosting tables', async () => {
    const f = fixtures()
    await processStripeEvent(f.db, f.stripe, { created: f.paidEvent.created, type: 'checkout.session.completed', data: { object: f.session } } as Stripe.Event)
    expect(f.order.state).toBe('paid')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(f.tokens[0].token_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(f.tokens[0]).not.toHaveProperty('token')
  })

  it.each(['unpaid', 'no_payment_required'] as const)('does not unlock %s checkout', async (status) => {
    const f = fixtures(); f.session.payment_status = status
    await fulfillBookingKit(f.db, f.stripe, f.session, f.paidEvent)
    expect(f.order.state).toBe('payment_pending')
    expect(f.db.rpc).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('accepts async success after a failure but ignores late failures after paid', async () => {
    const f = fixtures()
    await processStripeEvent(f.db, f.stripe, { created: f.paidEvent.created, type: 'checkout.session.async_payment_failed', data: { object: f.session } } as Stripe.Event)
    expect(f.order.state).toBe('checkout_failed')
    await processStripeEvent(f.db, f.stripe, { created: f.paidEvent.created, type: 'checkout.session.async_payment_succeeded', data: { object: f.session } } as Stripe.Event)
    expect(f.order.state).toBe('paid')
    await processStripeEvent(f.db, f.stripe, { created: f.paidEvent.created, type: 'checkout.session.expired', data: { object: f.session } } as Stripe.Event)
    expect(f.order.state).toBe('paid')
  })

  it('deduplicates completed and async paid events without extending access or duplicating delivery', async () => {
    const f = fixtures()
    await fulfillBookingKit(f.db, f.stripe, f.session, f.paidEvent)
    const expiry = f.order.access_expires_at
    await fulfillBookingKit(f.db, f.stripe, f.session, f.paidEvent)
    expect(f.order.access_expires_at).toBe(expiry)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(f.tokens).toHaveLength(1)
  })

  it('preserves entitlement on email failure and retries delivery without rebuilding the artifact', async () => {
    const f = fixtures()
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('transport down'))
    await expect(fulfillBookingKit(f.db, f.stripe, f.session, f.paidEvent)).rejects.toThrow('delivery_failed')
    expect(f.order.state).toBe('paid')
    const expiry = f.order.access_expires_at
    await fulfillBookingKit(f.db, f.stripe, f.session, f.paidEvent)
    expect(f.order.state).toBe('paid')
    expect(f.order.access_expires_at).toBe(expiry)
    expect(f.order.delivery_sent_at).toBeTruthy()
    expect(f.order).toHaveProperty('delivery_failed_at')
    expect(f.tokens).toHaveLength(2)
  })

  it('starts 90-day access from verified asynchronous payment success, not earlier charge creation or worker time', async () => {
    const f = fixtures()
    f.payment.latest_charge.created = Math.floor(Date.now() / 1000) - 10 * 86400
    const paid = { type: 'checkout.session.async_payment_succeeded', created: Math.floor(Date.now() / 1000) - 7 * 86400 }
    await fulfillBookingKit(f.db, f.stripe, f.session, paid)
    expect(f.order.paid_at).toBe(new Date(paid.created * 1000).toISOString())
    expect(f.order.access_expires_at).toBe(new Date((paid.created + 90 * 86400) * 1000).toISOString())
  })

  it('does not force-grant from an earlier unpaid event when the fetched session has since become paid', async () => {
    const f = fixtures()
    const pendingPayload = { ...f.session, payment_status: 'unpaid' } as Stripe.Checkout.Session
    await fulfillBookingKit(f.db, f.stripe, pendingPayload, f.paidEvent)
    expect(f.order.state).toBe('payment_pending')
    expect(f.db.rpc).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it.each([0, NaN, Infinity, Math.floor(Date.now() / 1000) + 86400])('rejects invalid paid event timestamp %s', async (created) => {
    const f = fixtures()
    await expect(fulfillBookingKit(f.db, f.stripe, f.session, { ...f.paidEvent, created })).rejects.toThrow('event_timestamp_invalid')
    expect(f.db.rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['wrong session', (s: Stripe.Checkout.Session) => { s.id = 'cs_other' }],
    ['wrong order', (s: Stripe.Checkout.Session) => { s.metadata!.bookingKitOrderId = 'another' }],
    ['wrong reference', (s: Stripe.Checkout.Session) => { s.client_reference_id = 'another' }],
    ['wrong price', (s: Stripe.Checkout.Session) => { s.line_items!.data[0].price!.id = 'price_other' }],
    ['wrong currency', (s: Stripe.Checkout.Session) => { s.currency = 'eur' }],
    ['wrong total', (s: Stripe.Checkout.Session) => { s.amount_total = 100 }],
    ['invalid purchase email', (s: Stripe.Checkout.Session) => { s.customer_details!.email = 'not an email' }],
    ['subscription mode', (s: Stripe.Checkout.Session) => { s.mode = 'subscription' }],
    ['extra item', (s: Stripe.Checkout.Session) => { s.line_items!.data.push(s.line_items!.data[0]) }],
    ['unverified pagination', (s: Stripe.Checkout.Session) => { s.line_items!.has_more = true }],
  ] as const)('rejects %s before changing access', async (_name, tamper) => {
    const f = fixtures(); tamper(f.session)
    await expect(fulfillBookingKit(f.db, f.stripe, f.session, f.paidEvent)).rejects.toThrow()
    expect(f.order.state).toBe('checkout_pending')
    expect(f.db.rpc).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('rejects an altered saved artifact', () => {
    const f = fixtures(); f.order.artifact.headline = 'tampered'
    expect(() => assertBookingKitPayment(f.order, f.session)).toThrow('artifact_integrity')
  })

  it('binds corrected Checkout email atomically with payment and delivers to the corrected address', async () => {
    const f = fixtures()
    f.session.customer_email = 'buyer@example.test'
    f.session.customer_details!.email = '  CORRECTED@example.test  '
    await fulfillBookingKit(f.db, f.stripe, f.session, f.paidEvent)
    expect(f.db.rpc).toHaveBeenCalledWith('fulfill_booking_kit_order', expect.objectContaining({ p_purchase_email: 'corrected@example.test', p_session_id: 'cs_kit' }))
    expect(f.order.purchase_email).toBe('corrected@example.test')
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'corrected@example.test' }))
  })

  it('uses the corrected verified email when a refund arrives before fulfillment', async () => {
    const f = fixtures()
    f.session.customer_details!.email = 'corrected@example.test'
    f.refundList.data.push({ status: 'succeeded', amount: 900 })
    await handleBookingKitRefund(f.db, f.stripe, { type: 'refund.updated', data: { object: { status: 'succeeded', amount: 900, payment_intent: 'pi_kit' } } } as unknown as Stripe.Event)
    expect(f.order.state).toBe('refunded')
    expect(f.order.purchase_email).toBe('corrected@example.test')
    expect(f.db.rpc).toHaveBeenCalledWith('revoke_booking_kit_order', expect.objectContaining({ p_purchase_email: 'corrected@example.test' }))
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('checks current refunds before honoring a stale paid event', async () => {
    const f = fixtures(); f.refundList.data.push({ status: 'succeeded', amount: 900 })
    await fulfillBookingKit(f.db, f.stripe, f.session, f.paidEvent)
    expect(f.order.state).toBe('refunded')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('revokes a confirmed refund before fulfillment and never reactivates it', async () => {
    const f = fixtures(); f.refundList.data.push({ status: 'succeeded', amount: 900 })
    const event = { type: 'refund.updated', data: { object: { status: 'succeeded', amount: 900, payment_intent: 'pi_kit' } } } as unknown as Stripe.Event
    await handleBookingKitRefund(f.db, f.stripe, event)
    expect(f.order.state).toBe('refunded')
    expect(f.order.paid_at).toBeNull()
    expect(f.db.rpc).toHaveBeenCalledWith('revoke_booking_kit_order', expect.objectContaining({ p_paid_at: null }))
    await fulfillBookingKit(f.db, f.stripe, f.session, f.paidEvent)
    expect(f.order.state).toBe('refunded')
    expect(f.order.paid_at).toBe(new Date(f.paidEvent.created * 1000).toISOString())
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it.each(['pending', 'failed', 'canceled'])('ignores %s refunds', async (status) => {
    const f = fixtures()
    await handleBookingKitRefund(f.db, f.stripe, { type: 'refund.updated', data: { object: { status, amount: 900, payment_intent: 'pi_kit' } } } as unknown as Stripe.Event)
    expect(f.db.rpc).not.toHaveBeenCalled()
  })

  it('serializes different paid event IDs for the same kit order', () => {
    const f = fixtures()
    expect(stripeEventBusinessKey({ id: 'evt_one', type: 'checkout.session.completed', data: { object: f.session } }))
      .toBe(stripeEventBusinessKey({ id: 'evt_two', type: 'checkout.session.async_payment_succeeded', data: { object: f.session } }))
  })
})
