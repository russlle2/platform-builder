import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const insert = vi.fn().mockResolvedValue({ error: null })
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn(() => ({ eq: updateEq }))
  const from = vi.fn(() => ({ insert, update }))
  const event = {
    id: 'evt_test123456',
    type: 'product.updated',
    livemode: false,
    created: 1_788_465_600,
    data: { object: { id: 'prod_test' } },
  }
  return { event, from, insert, update, updateEq }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mocks.from }),
}))

vi.mock('@/lib/stripe-client', () => ({
  createStripeClient: () => ({
    webhooks: { constructEvent: () => mocks.event },
  }),
}))

describe('Stripe webhook durable acknowledgement', () => {
  let post: (request: Request) => Promise<Response>

  beforeAll(async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_example')
    vi.stubEnv('STRIPE_FULFILLMENT_WORKER_SECRET', 'w'.repeat(64))
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-example')
    post = (await import('./stripe-fulfillment-worker')).POST
  })

  afterAll(() => vi.unstubAllEnvs())

  it('stores the verified event before dispatching only its opaque ID', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await post(new Request('https://dailyclarity.org/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'signed-test-request' },
      body: JSON.stringify(mocks.event),
    }))

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toMatchObject({ received: true, queued: true })
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      event_id: mocks.event.id,
      status: 'queued',
      attempts: 0,
      payload: mocks.event,
    }))
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dailyclarity.org/.netlify/functions/stripe-fulfillment',
      expect.objectContaining({ body: JSON.stringify({ eventId: mocks.event.id }) }),
    )
    expect(mocks.insert.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0])

    vi.unstubAllGlobals()
  })
})
