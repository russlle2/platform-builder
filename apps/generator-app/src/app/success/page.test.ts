import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mocks = vi.hoisted(() => ({ retrieve: vi.fn(), createStripeClient: vi.fn() }))
vi.mock('@/lib/stripe-client', () => ({ createStripeClient: mocks.createStripeClient }))

import SuccessPage from './page'

const SESSION_ID = 'cs_test_abcdefghijklmnopqrstuvwxyz'
const paidTemplate = {
  status: 'complete', payment_status: 'paid', mode: 'subscription', livemode: false,
  subscription: { id: 'sub_test', status: 'active' },
  metadata: { checkoutType: 'template_subscription', planKey: 'basic', slug: 'customer-site' },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'staging')
  vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_example')
  mocks.createStripeClient.mockReturnValue({ checkout: { sessions: { retrieve: mocks.retrieve } } })
  mocks.retrieve.mockResolvedValue(paidTemplate)
})
afterEach(() => vi.unstubAllEnvs())

async function render(sessionId?: string) {
  return renderToStaticMarkup(await SuccessPage({ searchParams: Promise.resolve({ session_id: sessionId }) }))
}

describe('server-verified checkout result page', () => {
  it('does not confirm a missing session or contact Stripe with a wrong-environment key', async () => {
    expect(await render()).toContain('confirm this payment')
    vi.stubEnv('STRIPE_SECRET_KEY', 'rk_live_example')
    expect(await render(SESSION_ID)).toContain('confirm this payment')
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })

  it('confirms only the retrieved session and distinguishes checkout from website delivery', async () => {
    const html = await render(SESSION_ID)
    expect(mocks.retrieve).toHaveBeenCalledWith(SESSION_ID, { expand: ['subscription'] })
    expect(html).toContain('Payment confirmed')
    expect(html).toContain('Stripe test mode — no real money charged')
    expect(html).toContain('Website setup is a separate step.')
    expect(html).toContain('/dashboard?site=customer-site')
    expect(html).not.toContain('customer-site.dailyclarity.org')
  })

  it('keeps an asynchronous unpaid checkout unconfirmed', async () => {
    mocks.retrieve.mockResolvedValue({ ...paidTemplate, payment_status: 'unpaid' })
    const html = await render(SESSION_ID)
    expect(html).toContain('confirm this payment')
    expect(html).not.toContain('Go to My Dashboard')
  })

  it('describes a paid custom checkout without asserting queue or email delivery', async () => {
    mocks.retrieve.mockResolvedValue({
      ...paidTemplate, mode: 'payment', subscription: null,
      metadata: { checkoutType: 'custom_build', customBuildRequestId: 'request-fixture' },
    })
    const html = await render(SESSION_ID)
    expect(html).toContain('Your custom-build checkout is complete.')
    expect(html).toContain('Project review and email delivery happen separately.')
    expect(html).not.toContain('is in our build queue')
    expect(html).not.toContain('$500 payment')
  })
})
