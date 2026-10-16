import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, POST } from './route'

const providers = vi.hoisted(() => ({
  sendOrderConfirmationEmail: vi.fn(),
  deleteSite: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  provisionSite: vi.fn(),
  deploySiteFiles: vi.fn(),
  buildDeployFiles: vi.fn(),
  getTemplate: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: providers.from,
  }),
}))
vi.mock('@/lib/netlify', () => ({
  provisionSite: providers.provisionSite,
  deploySiteFiles: providers.deploySiteFiles,
  deleteSite: providers.deleteSite,
}))
vi.mock('@/lib/email', () => ({ sendOrderConfirmationEmail: providers.sendOrderConfirmationEmail }))
vi.mock('@/lib/templates/niche-registry', () => ({ getTemplate: providers.getTemplate }))
vi.mock('@/lib/site-deploy', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/site-deploy')>(),
  buildDeployFiles: providers.buildDeployFiles,
}))

function simulatedPurchase(overrides: Record<string, unknown> = {}) {
  return new Request('https://dailyclarity-staging.netlify.app/api/test-purchase', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-purchase-secret': 's'.repeat(32) },
    body: JSON.stringify({
      slug: 'e2e-email', template: 'fixture', niche: 'wellness_coach',
      customerValues: { BUSINESS_NAME: 'Email fixture', EMAIL: 'e2e-public@dailyclarity.test' },
      ...overrides,
    }),
  })
}

describe('test purchase route secret policy', () => {
  beforeEach(() => {
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'staging')
    vi.stubEnv('ENABLE_TEST_PURCHASE', 'true')
    vi.stubEnv('STAGING_APP_HOST', 'dailyclarity-staging.netlify.app')
    vi.stubEnv('STAGING_SUPABASE_PROJECT_REF', 'stagingref')
    vi.stubEnv('DAILYCLARITY_SUPABASE_PROJECT_REF', 'stagingref')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://stagingref.supabase.co')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('TEST_PURCHASE_ADMIN_SECRET', 's'.repeat(32))
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'staging-service-fixture')
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'staging-netlify-fixture')
    vi.stubEnv('PORTAL_TOKEN_SECRET', 'p'.repeat(32))
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dailyclarity-staging.netlify.app')
    providers.from.mockReturnValue({
      upsert: providers.upsert,
      update: () => ({ eq: async () => ({ error: null }) }),
    })
    providers.upsert.mockResolvedValue({ error: null })
    providers.provisionSite.mockResolvedValue({ siteId: 'staging-fixture', siteUrl: 'https://platform-e2e-email.netlify.app', defaultDomain: 'platform-e2e-email.netlify.app' })
    providers.deploySiteFiles.mockResolvedValue({ deployId: 'fixture-deploy' })
    providers.buildDeployFiles.mockResolvedValue({ 'index.html': '<html><body>Fixture</body></html>' })
    providers.getTemplate.mockResolvedValue({ validation: { contractVersion: 2 } })
    providers.sendOrderConfirmationEmail.mockResolvedValue(undefined)
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

  it.each([
    [{ accountEmail: '  E2E-Private@dailyclarity.test ' }, 'e2e-private@dailyclarity.test'],
    [{ accountEmail: 'e2e-public@dailyclarity.test' }, 'e2e-public@dailyclarity.test'],
    [{}, 'e2e-public@dailyclarity.test'],
  ])('preserves separate and legacy recipients in the protected simulation: %j', async (account, expectedEmail) => {
    const response = await POST(simulatedPurchase({
      ...account,
      customerValues: {
        BUSINESS_NAME: 'Email fixture', EMAIL: 'e2e-public@dailyclarity.test',
        accountEmail: 'e2e-private@dailyclarity.test', ACCOUNT_EMAIL: 'e2e-private@dailyclarity.test',
      },
    }))
    expect(response.status).toBe(200)
    expect(providers.buildDeployFiles).toHaveBeenCalledWith(expect.objectContaining({
      customerValues: { BUSINESS_NAME: 'Email fixture', EMAIL: 'e2e-public@dailyclarity.test' },
    }))
    expect(JSON.stringify(providers.buildDeployFiles.mock.calls)).not.toContain('e2e-private@dailyclarity.test')
    const portal = providers.upsert.mock.calls.find(([row]) => row.data)?.[0]
    expect(portal).toMatchObject({
      owner_email: expectedEmail,
      data: { email: expectedEmail, test_purchase: true, customerValues: { EMAIL: 'e2e-public@dailyclarity.test' } },
    })
    expect(portal.data).not.toHaveProperty('accountEmail')
    expect(providers.sendOrderConfirmationEmail.mock.calls[0][0]).toBe(expectedEmail)
  })

  it.each(['', '  ', 'invalid', null, false, 123, {}, []])('rejects invalid explicit private email %j before simulated provider writes', async (accountEmail) => {
    const response = await POST(simulatedPurchase({ accountEmail }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'A valid account email address is required.' })
    expect(providers.from).not.toHaveBeenCalled()
    expect(providers.getTemplate).not.toHaveBeenCalled()
    expect(providers.provisionSite).not.toHaveBeenCalled()
    expect(providers.sendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it.each([
    { accountEmail: 'real-owner@example.com' },
    { accountEmail: 'e2e-private@dailyclarity.test', customerValues: { EMAIL: 'real-contact@example.com' } },
  ])('preserves the generated-fixture allowlist for both email roles: %j', async (overrides) => {
    expect((await POST(simulatedPurchase(overrides))).status).toBe(400)
    expect(providers.from).not.toHaveBeenCalled()
    expect(providers.provisionSite).not.toHaveBeenCalled()
    expect(providers.sendOrderConfirmationEmail).not.toHaveBeenCalled()
  })

  it('keeps the entire simulation unavailable in production with distinct valid addresses', async () => {
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'production')
    expect((await POST(simulatedPurchase({ accountEmail: 'e2e-private@dailyclarity.test' }))).status).toBe(403)
    expect(providers.from).not.toHaveBeenCalled()
    expect(providers.provisionSite).not.toHaveBeenCalled()
    expect(providers.sendOrderConfirmationEmail).not.toHaveBeenCalled()
  })
})
