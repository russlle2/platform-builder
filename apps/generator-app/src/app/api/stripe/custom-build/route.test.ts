import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'

const mocks = vi.hoisted(() => ({ from: vi.fn(), createStripeClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mocks.from }) }))
vi.mock('@/lib/stripe-client', () => ({ createStripeClient: mocks.createStripeClient, stripeIntegrationIdentifier: vi.fn() }))
vi.mock('@/lib/server-auth', () => ({ rateLimitByIp: () => true, jsonTooManyRequests: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'staging')
  vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_example')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_example')
  vi.stubEnv('STRIPE_FULFILLMENT_WORKER_SECRET', 'w'.repeat(32))
  vi.stubEnv('STRIPE_PRICE_CUSTOM_BUILD', 'price_custom')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://stagingproject.supabase.co')
  vi.stubEnv('DAILYCLARITY_SUPABASE_PROJECT_REF', 'stagingproject')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test-key')
  vi.stubEnv('POSTMARK_SERVER_TOKEN', 'postmark-test-token')
  vi.stubEnv('EMAIL_FROM_ADDRESS', 'hello@example.com')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://staging.example.com')
})
afterEach(() => vi.unstubAllEnvs())

function request(body: string, contentLength?: string) {
  return new NextRequest('https://staging.example.com/api/stripe/custom-build', {
    method: 'POST', body,
    headers: { 'content-type': 'application/json', ...(contentLength ? { 'content-length': contentLength } : {}) },
  })
}

function validRequest() {
  return request(JSON.stringify({
    businessName: 'Example Business', email: 'buyer@example.com',
    siteVision: 'A clear website describing our business and helping prospective customers learn about our services and contact us.',
    requiredFunctionality: 'A home page, service information, and a contact form for customer enquiries.',
    acceptedTerms: true,
  }))
}

function customCheckoutLifecycle() {
  const insert = vi.fn().mockResolvedValue({ error: null })
  const statusFilter = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn((_values: Record<string, unknown>) => ({
    eq: vi.fn(() => ({
      in: statusFilter,
      then: (resolve: (result: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve),
    })),
  }))
  mocks.from.mockReturnValue({ insert, update })
  const retrievePrice = vi.fn().mockResolvedValue({ id: 'price_custom', active: true, type: 'one_time', currency: 'usd', unit_amount: 50_000 })
  const createSession = vi.fn().mockResolvedValue({ id: 'cs_custom_known', url: 'https://checkout.stripe.com/example' })
  mocks.createStripeClient.mockReturnValue({
    prices: { retrieve: retrievePrice }, checkout: { sessions: { create: createSession } },
  })
  return { insert, update, statusFilter, retrievePrice, createSession }
}

describe('custom-build checkout request and Stripe environment gates', () => {
  it('pauses new paid sales before saving a brief or contacting Stripe', async () => {
    vi.stubEnv('DAILYCLARITY_SALES_PAUSED', 'true')
    const { POST } = await import('./route')
    const response = await POST(request('{}'))
    expect(response.status).toBe(503)
    expect(await response.json()).toHaveProperty('retrySafe', true)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
  })
  it('starts guest checkout with minimal billing fields, dynamic wallets, and automatic card authentication', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    mocks.from.mockReturnValue({ insert, update })
    const create = vi.fn().mockResolvedValue({ id: 'cs_test_custom', url: 'https://checkout.stripe.com/example' })
    mocks.createStripeClient.mockReturnValue({
      prices: { retrieve: vi.fn().mockResolvedValue({ id: 'price_custom', active: true, type: 'one_time', currency: 'usd', unit_amount: 50_000 }) },
      checkout: { sessions: { create } },
    })
    const { POST } = await import('./route')
    const response = await POST(request(JSON.stringify({
      businessName: 'Example Business', email: 'buyer@example.com',
      siteVision: 'A clear website describing our business and helping prospective customers learn about our services and contact us.',
      requiredFunctionality: 'A home page, service information, and a contact form for customer enquiries.',
      acceptedTerms: true,
      // The browser cannot add extra checkout challenges or required fields.
      billing_address_collection: 'required', phone_number_collection: { enabled: true },
      payment_method_options: { card: { request_three_d_secure: 'challenge' } },
      wallet_options: { link: { display: 'auto' } },
    })))
    expect(response.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ phone: null, contact_name: null }))
    const params = create.mock.calls[0][0]
    expect(params).toMatchObject({
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      payment_method_options: { card: { request_three_d_secure: 'automatic' } },
      wallet_options: { link: { display: 'never' } },
      customer_email: 'buyer@example.com',
    })
    expect(params).not.toHaveProperty('shipping_address_collection')
    expect(params).not.toHaveProperty('payment_method_types')
    expect(params).not.toHaveProperty('customer')
    expect(params).not.toHaveProperty('customer_creation')
  })

  it.each([
    ['staging', 'rk_live_example'],
    ['staging', 'sk_live_example'],
    ['production', 'rk_test_example'],
    ['production', 'sk_test_example'],
    ['', 'sk_live_example'],
  ])('blocks %s with %s before any purchase side effects', async (environment, key) => {
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', environment)
    vi.stubEnv('STRIPE_SECRET_KEY', key)
    const { POST } = await import('./route')
    const response = await POST(request('{}'))
    expect(response.status).toBe(503)
    expect(await response.json()).toHaveProperty('retrySafe', true)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
  })

  it('returns a client error for malformed JSON before saving a brief or contacting Stripe', async () => {
    const { POST } = await import('./route')
    expect((await POST(request('{'))).status).toBe(400)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
  })

  it('bounds both declared and streamed request bodies before saving a brief', async () => {
    const { POST } = await import('./route')
    expect((await POST(request('{}', '64001'))).status).toBe(413)
    const streamedOversize = request(JSON.stringify({ unknown: 'x'.repeat(64_001) }))
    expect((await POST(streamedOversize)).status).toBe(413)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
  })

  it('marks a saved brief failed when a Stripe price read fails before session creation', async () => {
    const state = customCheckoutLifecycle()
    state.retrievePrice.mockRejectedValue(new Stripe.errors.StripeConnectionError({ message: 'Price lookup unavailable' }))
    const { POST } = await import('./route')
    const response = await POST(validRequest())
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).not.toHaveProperty('code', 'checkout_creation_uncertain')
    expect(body).toHaveProperty('retrySafe', true)
    expect(state.createSession).not.toHaveBeenCalled()
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'checkout_failed' }))
  })

  it('allows retry after the brief cannot be saved before any Stripe request', async () => {
    const state = customCheckoutLifecycle()
    state.insert.mockResolvedValue({ error: { code: 'unavailable' } } as never)
    const { POST } = await import('./route')
    const response = await POST(validRequest())
    expect(response.status).toBe(500)
    expect(await response.json()).toHaveProperty('retrySafe', true)
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
    expect(state.createSession).not.toHaveBeenCalled()
  })

  it.each([
    new Stripe.errors.StripeConnectionError({ message: 'Connection lost' }),
    new Stripe.errors.StripeAPIError({ message: 'Server error', statusCode: 503 }),
    new Error('Unknown transport outcome'),
  ])('keeps the saved brief pending after uncertain creation: %s', async (error) => {
    const state = customCheckoutLifecycle()
    state.createSession.mockRejectedValue(error)
    const { POST } = await import('./route')
    const response = await POST(validRequest())
    const body = await response.json()
    expect(response.status).toBe(409)
    expect(body).toMatchObject({ code: 'checkout_creation_uncertain', reference: state.insert.mock.calls[0][0].id, supportUrl: '/contact' })
    expect(body.error).toContain("don't start another payment")
    expect(body).not.toHaveProperty('retrySafe')
    expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'checkout_pending' }))
    expect(state.update).not.toHaveBeenCalled()
  })

  it('preserves a returned Stripe session when a later local persistence error occurs', async () => {
    const state = customCheckoutLifecycle()
    state.update.mockImplementationOnce(() => { throw new Error('Database unavailable') })
    const { POST } = await import('./route')
    const response = await POST(validRequest())
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body).toHaveProperty('code', 'checkout_creation_uncertain')
    expect(body).not.toHaveProperty('retrySafe')
    expect(state.update).toHaveBeenLastCalledWith(expect.objectContaining({ stripe_session_id: 'cs_custom_known' }))
    expect(state.statusFilter).toHaveBeenCalledWith('status', ['checkout_pending', 'payment_pending'])
    for (const [values] of state.update.mock.calls) expect(values).not.toHaveProperty('status', 'checkout_failed')
  })

  it('keeps uncertainty visible if recording a known session also fails', async () => {
    const state = customCheckoutLifecycle()
    state.createSession.mockResolvedValue({ id: 'cs_custom_known', url: null } as never)
    state.statusFilter.mockRejectedValue(new Error('Database unavailable'))
    const { POST } = await import('./route')
    const response = await POST(validRequest())
    expect(response.status).toBe(409)
    expect(await response.json()).toHaveProperty('code', 'checkout_creation_uncertain')
    for (const [values] of state.update.mock.calls) expect(values).not.toHaveProperty('status', 'checkout_failed')
  })

  it('marks a brief failed after a definitive rejected Stripe create request', async () => {
    const state = customCheckoutLifecycle()
    state.createSession.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({ message: 'Invalid price', statusCode: 400 }))
    const { POST } = await import('./route')
    const response = await POST(validRequest())
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).not.toHaveProperty('code', 'checkout_creation_uncertain')
    expect(body).toHaveProperty('retrySafe', true)
    expect(state.update).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ status: 'checkout_failed' }))
  })
})
