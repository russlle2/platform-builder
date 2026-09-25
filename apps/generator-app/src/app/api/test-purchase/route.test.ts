import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, POST } from './route'

const providers = vi.hoisted(() => ({
  sendOrderConfirmationEmail: vi.fn(),
  deleteSite: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      upsert: async () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  }),
}))
vi.mock('@/lib/netlify', () => ({
  provisionSite: async () => ({ siteId: 'staging-fixture', siteUrl: 'https://platform-e2e-email.netlify.app', defaultDomain: 'platform-e2e-email.netlify.app' }),
  deploySiteFiles: async () => ({ deployId: 'fixture-deploy' }),
  deleteSite: providers.deleteSite,
}))
vi.mock('@/lib/email', () => ({ sendOrderConfirmationEmail: providers.sendOrderConfirmationEmail }))
vi.mock('@/lib/templates/niche-registry', () => ({ getTemplate: async () => ({ validation: { contractVersion: 2 } }) }))
vi.mock('@/lib/site-deploy', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/site-deploy')>(),
  buildDeployFiles: async () => ({ 'index.html': '<html><body>Fixture</body></html>' }),
}))

describe('test purchase route secret policy', () => {
  beforeEach(() => {
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'staging')
    vi.stubEnv('ENABLE_TEST_PURCHASE', 'true')
    vi.stubEnv('STAGING_APP_HOST', 'dailyclarity-staging.netlify.app')
    vi.stubEnv('STAGING_SUPABASE_PROJECT_REF', 'stagingref')
    vi.stubEnv('DAILYCLARITY_SUPABASE_PROJECT_REF', 'stagingref')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://stagingref.supabase.co')
    vi.stubEnv('NODE_ENV', 'production')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('fails both privileged methods closed when the configured secret is short', async () => {
    vi.stubEnv('TEST_PURCHASE_ADMIN_SECRET', 'too-short')
    const url = 'https://dailyclarity-staging.netlify.app/api/test-purchase'

    const post = await POST(new Request(url, {
      method: 'POST',
      headers: { 'x-test-purchase-secret': 'too-short' },
      body: '{}',
    }))
    const remove = await DELETE(new Request(
      `${url}?slug=e2e-fixture&email=e2e-fixture@dailyclarity.test`,
      {
        method: 'DELETE',
        headers: { 'x-test-purchase-secret': 'too-short' },
      },
    ))

    expect(post.status).toBe(503)
    expect(remove.status).toBe(503)
  })

  it.each([true, false])('reports email provider acceptance accurately when acceptance is %s', async (accepted) => {
    const secret = 's'.repeat(32)
    vi.stubEnv('TEST_PURCHASE_ADMIN_SECRET', secret)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'staging-service-fixture')
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'staging-netlify-fixture')
    vi.stubEnv('PORTAL_TOKEN_SECRET', 'p'.repeat(32))
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dailyclarity-staging.netlify.app')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    if (accepted) providers.sendOrderConfirmationEmail.mockResolvedValueOnce(undefined)
    else providers.sendOrderConfirmationEmail.mockRejectedValueOnce(new Error('Provider unavailable'))

    const response = await POST(new Request('https://dailyclarity-staging.netlify.app/api/test-purchase', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-purchase-secret': secret },
      body: JSON.stringify({
        slug: 'e2e-email', template: 'fixture', niche: 'wellness_coach',
        customerValues: { BUSINESS_NAME: 'Email fixture', EMAIL: 'e2e-email@dailyclarity.test' },
      }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(providers.sendOrderConfirmationEmail).toHaveBeenCalledOnce()
    expect(providers.deleteSite).not.toHaveBeenCalled()
    expect(body.log.some((line: string) => line.includes('email accepted by provider'))).toBe(accepted)
    expect(body.log.some((line: string) => line.includes('email failed'))).toBe(!accepted)
    expect(body.log.some((line: string) => line.includes('email sent'))).toBe(false)
  })
})
