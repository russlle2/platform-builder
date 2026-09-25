import { afterEach, describe, expect, it, vi } from 'vitest'

const dispatch = vi.hoisted(() => ({
  redispatchDueStripeEvents: vi.fn(),
}))

vi.mock('./stripe-fulfillment-dispatch', () => dispatch)

import handler from '../../../../netlify/functions/stripe-fulfillment-sweeper'

function clearRecoveryEnvironment(): void {
  vi.stubEnv('URL', '')
  vi.stubEnv('DEPLOY_PRIME_URL', '')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  vi.stubEnv('STRIPE_FULFILLMENT_WORKER_SECRET', '')
}

describe('scheduled Stripe fulfillment recovery policy', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('is inert in isolated staging until its runtime is complete', async () => {
    clearRecoveryEnvironment()
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'staging')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(handler()).resolves.toBeUndefined()
    expect(dispatch.redispatchDueStripeEvents).not.toHaveBeenCalled()
  })

  it('fails loudly when production recovery configuration drifts', async () => {
    clearRecoveryEnvironment()
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'production')

    await expect(handler()).rejects.toThrow(
      'Stripe fulfillment recovery runtime is not fully configured.',
    )
    expect(dispatch.redispatchDueStripeEvents).not.toHaveBeenCalled()
  })

  it('dispatches due events when the full runtime is configured', async () => {
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'production')
    vi.stubEnv('URL', 'https://dailyclarity.org')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
    vi.stubEnv('STRIPE_FULFILLMENT_WORKER_SECRET', 'w'.repeat(32))
    dispatch.redispatchDueStripeEvents.mockResolvedValue({ dispatched: 0 })
    vi.spyOn(console, 'info').mockImplementation(() => undefined)

    await expect(handler()).resolves.toBeUndefined()
    expect(dispatch.redispatchDueStripeEvents).toHaveBeenCalledWith(
      'https://dailyclarity.org',
      20,
    )
  })
})
