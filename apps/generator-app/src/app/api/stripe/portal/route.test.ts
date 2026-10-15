import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createStripeClient: vi.fn(), getUser: vi.fn(), from: vi.fn(), claim: vi.fn(),
}))
vi.mock('@/lib/stripe-client', () => ({ createStripeClient: mocks.createStripeClient }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mocks.from }) }))
vi.mock('@/lib/portal-owner-auth', () => ({ claimPortalSitesForUser: mocks.claim }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'staging')
  vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_example')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://stagingproject.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test-key')
  vi.stubEnv('STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID', 'bpc_test')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://staging.example.com')
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } })
})
afterEach(() => vi.unstubAllEnvs())

function request() {
  return new Request('https://staging.example.com/api/stripe/portal', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: 'my-site' }),
  })
}

describe('billing portal Stripe mode and ownership', () => {
  it.each([['staging', 'rk_live_example'], ['production', 'rk_test_example']])('blocks %s with %s before account or Stripe access', async (environment, key) => {
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', environment)
    vi.stubEnv('STRIPE_SECRET_KEY', key)
    const { POST } = await import('./route')
    expect((await POST(request())).status).toBe(503)
    expect(mocks.getUser).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
  })

  it('requires an authenticated customer before creating a billing portal', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('./route')
    expect((await POST(request())).status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
  })

  it('uses only the signed-in customer’s requested site for its test billing portal', async () => {
    const query = {
      select: vi.fn(() => query), eq: vi.fn(() => query),
      maybeSingle: vi.fn().mockResolvedValue({ data: { data: { stripe_customer_id: 'cus_owned_test' } }, error: null }),
    }
    mocks.from.mockReturnValue(query)
    const create = vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test/session' })
    mocks.createStripeClient.mockReturnValue({
      billingPortal: {
        configurations: { retrieve: vi.fn().mockResolvedValue({ id: 'bpc_test', active: true, features: { subscription_update: { enabled: false } } }) },
        sessions: { create },
      },
    })
    const { POST } = await import('./route')
    expect((await POST(request())).status).toBe(200)
    expect(query.eq).toHaveBeenCalledWith('owner_id', 'owner-1')
    expect(query.eq).toHaveBeenCalledWith('slug', 'my-site')
    expect(create).toHaveBeenCalledWith({ customer: 'cus_owned_test', configuration: 'bpc_test', return_url: 'https://staging.example.com/dashboard' })
  })
})
