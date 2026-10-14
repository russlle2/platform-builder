import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  buildDeployFiles: vi.fn(),
  deploySiteFiles: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}))

vi.mock('@/lib/site-deploy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/site-deploy')>()),
  buildDeployFiles: mocks.buildDeployFiles,
}))

vi.mock('@/lib/netlify', () => ({ deploySiteFiles: mocks.deploySiteFiles }))
vi.mock('@/lib/portal-owner-auth', () => ({
  isAuthenticatedPortalOwnerForSlug: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/server-auth', () => ({
  rateLimitByIp: () => true,
  jsonTooManyRequests: () => Response.json({}, { status: 429 }),
  jsonUnauthorized: () => Response.json({}, { status: 401 }),
  jsonForbidden: () => Response.json({}, { status: 403 }),
}))
vi.mock('@/lib/portal-auth', () => ({
  getPortalTokenFromRequest: () => 'valid-token',
  verifyPortalTokenHash: () => true,
  toAuthenticatedPortalSite: vi.fn(),
  toPublicPortalSite: vi.fn(),
}))

let post: typeof import('./route').POST

describe('customer portal catalogue revision persistence', () => {
  beforeAll(async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
    ;({ POST: post } = await import('./route'))
  })

  afterAll(() => vi.unstubAllEnvs())

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-token')
  })

  it('preserves the server pin and passes it to portal republish', async () => {
    const catalogRevision = {
      contractVersion: 3,
      designId: 'design_shared',
      contentPresetId: 'content_alias',
      themePresetId: 'theme_alias',
      qualityReceipt: 'receipt_checkout',
    }
    const existingData = {
      niche: 'wellness',
      template: 'legacy-alias',
      customerValues: { BUSINESS_NAME: 'Before' },
      catalogRevision,
      netlify_site_id: 'netlify-site',
      site_url: 'https://customer-site.netlify.app',
    }
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              slug: 'customer-site',
              data: existingData,
              status: 'active',
              portal_token_hash: 'hash',
            },
            error: null,
          }),
        }),
      }),
    })
    mocks.rpc.mockResolvedValue({
      data: {
        ...existingData,
        customerValues: { BUSINESS_NAME: 'After' },
      },
      error: null,
    })
    mocks.buildDeployFiles.mockResolvedValue({ 'index.html': '<html></html>' })
    mocks.deploySiteFiles.mockResolvedValue({ deployId: 'deploy-1' })

    const response = await post(new NextRequest('https://dailyclarity.org/api/portal/customer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug: 'customer-site',
        customerValues: { BUSINESS_NAME: 'After' },
        // A browser cannot repin a purchase to a different catalogue entry.
        catalogRevision: {
          ...catalogRevision,
          contentPresetId: 'content_attacker_choice',
        },
      }),
    }))

    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('merge_portal_site_data', expect.objectContaining({
      p_data_patch: expect.not.objectContaining({ catalogRevision: expect.anything() }),
    }))
    expect(mocks.buildDeployFiles).toHaveBeenCalledWith(expect.objectContaining({
      catalogRevision,
      customerValues: { BUSINESS_NAME: 'After' },
    }))
  })
})
