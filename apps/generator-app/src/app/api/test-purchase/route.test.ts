import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, POST } from './route'

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
})
