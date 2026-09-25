import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as checkout } from '@/app/api/stripe/booking-kit/route'
import { GET as result } from '@/app/api/booking-kit/result/route'
import { POST as recover } from '@/app/api/booking-kit/recover/route'
import { bookingKitArtifactHash, bookingKitCredential, bookingKitStripeModeAllowed, hashBookingKitToken } from './booking-kit-server'
import { composeBookingKit } from './booking-kit-content'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), from: vi.fn(), price: vi.fn(), create: vi.fn(), expire: vi.fn(), email: vi.fn(),
  events: [] as string[], inserts: [] as { table: string; value: Record<string, unknown> }[],
  orders: [] as Record<string, unknown>[], updateError: false,
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc: mocks.rpc, from: mocks.from }) }))
vi.mock('./stripe-client', () => ({
  createStripeClient: () => ({ prices: { retrieve: mocks.price }, checkout: { sessions: { create: mocks.create, expire: mocks.expire } } }),
  stripeIntegrationIdentifier: () => 'dailyclarity-booking-kit-abcdefgh',
}))
vi.mock('./email', () => ({ sendEmail: mocks.email }))
vi.mock('./server-auth', () => ({ rateLimitByIp: () => true }))

const facts = { niche: 'aromatherapy', service: 'Scent consultation', audience: 'Adults', format: 'Online', duration: '30 minutes', pricingChoice: 'quote', bookingMethod: 'Email hello@example.test' } as const
const post = (url: string, body: unknown) => new NextRequest(`https://kit.example.test${url}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', origin: 'https://kit.example.test' } })
const validBody = { facts, purchaseEmail: 'Buyer@Example.test' }

beforeEach(() => {
  vi.resetAllMocks()
  for (const [key, value] of Object.entries({
    BOOKING_KIT_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_test_unit_only', STRIPE_PRICE_BOOKING_KIT: 'price_kit',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_only', STRIPE_FULFILLMENT_WORKER_SECRET: 'x'.repeat(32),
    NEXT_PUBLIC_SUPABASE_URL: 'https://kit-project.supabase.co', DAILYCLARITY_SUPABASE_PROJECT_REF: 'kit-project',
    SUPABASE_SERVICE_ROLE_KEY: 'service_test_only', NEXT_PUBLIC_SITE_URL: 'https://kit.example.test',
    POSTMARK_SERVER_TOKEN: 'postmark_test_only', EMAIL_FROM_ADDRESS: 'sender@example.test', PORTAL_TOKEN_SECRET: 'y'.repeat(32),
    DAILYCLARITY_ENVIRONMENT: 'staging',
  })) vi.stubEnv(key, value)
  mocks.events.length = 0; mocks.inserts.length = 0; mocks.orders.length = 0; mocks.updateError = false
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'booking_kit_schema_version' ? '20260925.2' : name === 'read_booking_kit_result' ? [] : true, error: null }))
  mocks.price.mockResolvedValue({ id: 'price_kit', active: true, type: 'one_time', currency: 'usd', unit_amount: 900 })
  mocks.create.mockImplementation(async () => { mocks.events.push('stripe'); return { id: 'cs_kit', url: 'https://checkout.stripe.com/kit' } })
  mocks.expire.mockResolvedValue({})
  mocks.email.mockResolvedValue({})
  mocks.from.mockImplementation((table: string) => {
    let isUpdate = false
    const query = {
      insert: vi.fn(async (value: Record<string, unknown>) => { mocks.events.push(`insert:${table}`); mocks.inserts.push({ table, value }); return { error: null } }),
      update: vi.fn(() => { isUpdate = true; return query }),
      select: vi.fn(() => query), eq: vi.fn(() => query), gt: vi.fn(() => query), order: vi.fn(() => query), limit: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: mocks.orders, error: isUpdate && mocks.updateError ? { message: 'offline' } : null })),
    }
    return query
  })
})

describe('Booking Kit checkout boundary', () => {
  it('stores versioned generated content before checkout and stores only the access hash', async () => {
    const response = await checkout(post('/api/stripe/booking-kit', validBody))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(mocks.events.indexOf('insert:booking_kit_orders')).toBeLessThan(mocks.events.indexOf('stripe'))
    const saved = mocks.inserts[0].value
    expect(saved.artifact_hash).toBe(bookingKitArtifactHash(saved.artifact))
    expect(saved.purchase_email).toBe('buyer@example.test')
    expect(saved.checkout_access_hash).toBe(hashBookingKitToken(data.accessToken))
    expect(JSON.stringify(saved)).not.toContain(data.accessToken)
    const params = mocks.create.mock.calls[0][0]
    expect(JSON.stringify(params)).not.toContain(data.accessToken)
    expect(params.success_url).toBe('https://kit.example.test/booking-kit/result')
    expect(params).not.toHaveProperty('subscription_data')
    expect(params.metadata).not.toHaveProperty('slug')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it.each(['false', '', 'TRUE'])('sales fail closed for flag %s', async (flag) => {
    vi.stubEnv('BOOKING_KIT_ENABLED', flag)
    expect((await checkout(post('/api/stripe/booking-kit', validBody))).status).toBe(503)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects live keys in staging and incomplete production identity', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_unit_only')
    expect((await checkout(post('/api/stripe/booking-kit', validBody))).status).toBe(503)
    expect(bookingKitStripeModeAllowed('sk_live_test', { NODE_ENV: 'production' })).toBe(false)
    expect(bookingKitStripeModeAllowed('rk_live_test', { NODE_ENV: 'production', DAILYCLARITY_ENVIRONMENT: 'production' })).toBe(true)
    expect(bookingKitStripeModeAllowed('rk_test_test', { NODE_ENV: 'production', DAILYCLARITY_ENVIRONMENT: 'production' })).toBe(false)
  })

  it('does not charge with an absent or outdated private schema', async () => {
    mocks.rpc.mockResolvedValue({ data: 'old', error: null })
    expect((await checkout(post('/api/stripe/booking-kit', validBody))).status).toBe(503)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it.each([
    { active: false }, { type: 'recurring' }, { currency: 'eur' }, { unit_amount: 800 }, { id: 'price_other' },
  ])('rejects incompatible server price %j', async (change) => {
    mocks.price.mockResolvedValue({ id: 'price_kit', active: true, type: 'one_time', currency: 'usd', unit_amount: 900, ...change })
    expect((await checkout(post('/api/stripe/booking-kit', validBody))).status).toBe(503)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('uses the configured price despite browser-submitted price and amount', async () => {
    await checkout(post('/api/stripe/booking-kit', { ...validBody, price: 'free', amount: 0 }))
    expect(mocks.create.mock.calls[0][0].line_items).toEqual([{ price: 'price_kit', quantity: 1 }])
  })

  it('expires a session that cannot be durably bound instead of returning a payable URL', async () => {
    mocks.updateError = true
    const response = await checkout(post('/api/stripe/booking-kit', validBody))
    expect(response.status).toBe(503)
    expect(mocks.expire).toHaveBeenCalledWith('cs_kit')
    expect(await response.json()).not.toHaveProperty('url')
  })

  it.each([{ ...validBody, purchaseEmail: 'bad\r\nBcc: attacker@example.test' }, { purchaseEmail: 'a@example.test', facts: {} }, { ...validBody, facts: { ...facts, service: '<script>alert(1)</script>' } }])('rejects incomplete/unsafe brief %j', async (body) => {
    expect((await checkout(post('/api/stripe/booking-kit', body))).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('bounds the request body before parsing or composing', async () => {
    expect((await checkout(post('/api/stripe/booking-kit', { ...validBody, extra: 'x'.repeat(20000) }))).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})

describe('Booking Kit private result and recovery', () => {
  it('requires a correctly shaped bearer and never accepts query/session identifiers as credentials', async () => {
    expect((await result(new NextRequest('https://kit.example.test/api/booking-kit/result?session_id=cs_kit&token=anything'))).status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it.each(['checkout_pending', 'payment_pending', 'checkout_failed', 'refunded', 'paid'])('handles %s without leaking facts or payment identifiers', async (state) => {
    const artifact = composeBookingKit(facts)
    mocks.rpc.mockResolvedValue({ data: [{ state, artifact, artifact_version: artifact.version, artifact_hash: bookingKitArtifactHash(artifact), access_expires_at: new Date(Date.now() + 86400000).toISOString() }], error: null })
    const response = await result(new NextRequest('https://kit.example.test/api/booking-kit/result', { headers: { authorization: `Bearer ${bookingKitCredential().token}` } }))
    expect(response.status).toBe(state === 'paid' ? 200 : state.endsWith('pending') ? 202 : 403)
    const data = await response.json()
    expect(data).not.toHaveProperty('supplied_facts')
    expect(data).not.toHaveProperty('stripe_session_id')
    if (state !== 'paid') expect(data).not.toHaveProperty('artifact')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('denies a well-formed wrong or expired token', async () => {
    const response = await result(new NextRequest('https://kit.example.test/api/booking-kit/result', { headers: { authorization: `Bearer ${bookingKitCredential().token}` } }))
    expect(response.status).toBe(401)
  })

  it('keeps recovery available when sales are disabled and sends only to the recorded purchase email', async () => {
    vi.stubEnv('BOOKING_KIT_ENABLED', 'false')
    mocks.orders.push({ id: 'order_kit', purchase_email: 'buyer@example.test', access_expires_at: new Date(Date.now() + 86400000).toISOString() })
    const response = await recover(post('/api/booking-kit/recover', { email: 'buyer@example.test', sendTo: 'attacker@example.test' }))
    expect(response.status).toBe(202)
    expect(mocks.email.mock.calls[0][0].to).toBe('buyer@example.test')
    expect(mocks.email.mock.calls[0][0].textBody).toContain('#access_token=')
    expect(await response.json()).not.toHaveProperty('token')
  })

  it('uses identical generic recovery response when no purchase matches or email delivery fails', async () => {
    const absent = await (await recover(post('/api/booking-kit/recover', { email: 'absent@example.test' }))).json()
    mocks.orders.push({ id: 'order_kit', purchase_email: 'buyer@example.test', access_expires_at: new Date(Date.now() + 86400000).toISOString() })
    mocks.email.mockRejectedValue(new Error('delivery offline'))
    const failed = await (await recover(post('/api/booking-kit/recover', { email: 'buyer@example.test' }))).json()
    expect(failed).toEqual(absent)
  })

  it('enforces the durable email cap before creating credentials or sending', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null })
    expect((await recover(post('/api/booking-kit/recover', { email: 'buyer@example.test' }))).status).toBe(202)
    expect(mocks.email).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
