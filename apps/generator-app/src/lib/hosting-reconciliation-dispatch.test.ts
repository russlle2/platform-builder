import { afterEach, describe, expect, it, vi } from 'vitest'
import { dispatchHostingReconciliation, hasHostingReconciliationConfig } from './hosting-reconciliation-dispatch'
function configured() {
  vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'staging')
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture')
  vi.stubEnv('STRIPE_FULFILLMENT_WORKER_SECRET', 'w'.repeat(32))
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://staging.example.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
  vi.stubEnv('DAILYCLARITY_SUPABASE_PROJECT_REF', 'project')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-service-key')
  vi.stubEnv('STRIPE_PRICE_BASIC', 'price_basic')
  vi.stubEnv('STRIPE_PRICE_GROWTH', '')
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('scheduled hosting reconciliation', () => {
  it('allows Basic recovery without requiring an unused premium Price', async () => {
    configured()
    expect(hasHostingReconciliationConfig()).toBe(true)
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetch)
    await dispatchHostingReconciliation('https://staging.example.test')
    expect(fetch.mock.calls[0][0].toString()).toBe('https://staging.example.test/.netlify/functions/hosting-reconciliation')
    expect(fetch.mock.calls[0][1].body).toBe('{}')
  })
  it('rejects a wrong database pin or live key in staging before dispatch', async () => {
    configured()
    vi.stubEnv('DAILYCLARITY_SUPABASE_PROJECT_REF', 'other')
    expect(hasHostingReconciliationConfig()).toBe(false)
    vi.stubEnv('DAILYCLARITY_SUPABASE_PROJECT_REF', 'project')
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_fixture')
    expect(hasHostingReconciliationConfig()).toBe(false)
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    await expect(dispatchHostingReconciliation('https://staging.example.test')).rejects.toThrow('configuration_incomplete')
    expect(fetch).not.toHaveBeenCalled()
  })
})
