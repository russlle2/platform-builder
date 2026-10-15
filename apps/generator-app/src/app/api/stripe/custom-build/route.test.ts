import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

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

describe('custom-build checkout request and Stripe environment gates', () => {
  it('pauses new paid sales before saving a brief or contacting Stripe', async () => {
    vi.stubEnv('DAILYCLARITY_SALES_PAUSED', 'true')
    const { POST } = await import('./route')
    expect((await POST(request('{}'))).status).toBe(503)
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
    expect((await POST(request('{}'))).status).toBe(503)
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
})
