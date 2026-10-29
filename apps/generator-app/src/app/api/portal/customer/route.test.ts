import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  buildDeployFiles: vi.fn(),
  deploySiteFiles: vi.fn(),
  authorized: vi.fn(),
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
  isAuthenticatedPortalOwnerForSlug: mocks.authorized,
}))
vi.mock('@/lib/server-auth', () => ({
  rateLimitByIp: () => true,
  jsonTooManyRequests: () => Response.json({}, { status: 429 }),
  jsonUnauthorized: () => Response.json({}, { status: 401 }),
  jsonForbidden: () => Response.json({}, { status: 403 }),
}))
vi.mock('@/lib/portal-auth', () => ({
  getPortalTokenFromRequest: () => 'valid-token',
  verifyPortalTokenHash: () => false,
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
    vi.resetAllMocks()
    mocks.authorized.mockResolvedValue(true)
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
    mocks.rpc.mockImplementation(async (name: string) => name === 'reserve_site_usage'
      ? { data: { state: 'reserved', limit: 30, used: 1, resetAt: '2099-01-01T00:00:00Z' }, error: null }
      : name === 'finish_site_usage' ? { data: true, error: null }
      : name === 'site_usage_status' ? { data: null, error: null } : {
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

  it('republishes a public email edit without accepting account or ownership changes', async () => {
    const existingData = {
      niche: 'wellness', template: 'serene', email: 'private-owner@example.com',
      customerValues: { BUSINESS_NAME: 'Customer Business', EMAIL: 'old-public@example.com' },
      netlify_site_id: 'netlify-site', site_url: 'https://customer-site.netlify.app',
    }
    mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { slug: 'customer-site', data: existingData, status: 'active', owner_id: 'verified-owner', owner_email: 'private-owner@example.com' },
        error: null,
      }) }) }),
    })
    mocks.rpc.mockImplementation(async (_name: string, args: {
      p_customer_values: Record<string, string>
      p_data_patch: Record<string, unknown>
    }) => _name === 'reserve_site_usage'
      ? { data: { state: 'reserved', limit: 30, used: 1, resetAt: '2099-01-01T00:00:00Z' }, error: null }
      : _name === 'finish_site_usage' ? { data: true, error: null }
      : _name === 'site_usage_status' ? { data: null, error: null } : ({
      data: {
        ...existingData,
        customerValues: { ...existingData.customerValues, ...args.p_customer_values },
        ...args.p_data_patch,
      },
      error: null,
    }))
    mocks.buildDeployFiles.mockResolvedValue({ 'index.html': '<html></html>' })
    mocks.deploySiteFiles.mockResolvedValue({ deployId: 'deploy-1' })

    const response = await post(new NextRequest('https://dailyclarity.org/api/portal/customer', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug: 'customer-site', customerValues: { EMAIL: 'new-public@example.com' },
        accountEmail: 'changed-owner@example.com', email: 'changed-owner@example.com',
        owner_email: 'changed-owner@example.com', owner_id: 'different-owner',
        data: { email: 'changed-owner@example.com' },
      }),
    }))
    expect(response.status).toBe(200)
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'merge_portal_site_data')).toEqual([['merge_portal_site_data', {
      p_slug: 'customer-site', p_customer_values: { EMAIL: 'new-public@example.com' },
      p_data_patch: { imageOwner: 'customer-site' },
    }]])
    expect(mocks.buildDeployFiles).toHaveBeenCalledWith(expect.objectContaining({
      customerValues: { BUSINESS_NAME: 'Customer Business', EMAIL: 'new-public@example.com' },
    }))
    expect(JSON.stringify(mocks.buildDeployFiles.mock.calls)).not.toContain('private-owner@example.com')
    expect(JSON.stringify(mocks.buildDeployFiles.mock.calls)).not.toContain('changed-owner@example.com')
  })

  describe('publication allowance side-effect boundaries', () => {
    const operationId = '00000000-0000-4000-8000-000000000001'
    const existingData = {
      niche: 'wellness', template: 'serene', customerValues: { BUSINESS_NAME: 'Before' },
      netlify_site_id: 'netlify-site', site_url: 'https://customer-site.netlify.app',
    }
    const submit = () => post(new NextRequest('https://dailyclarity.org/api/portal/customer', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: 'customer-site', customerValues: { BUSINESS_NAME: 'After' }, operationId }),
    }))
    beforeEach(() => {
      mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { slug: 'customer-site', data: existingData, status: 'active' }, error: null,
      }) }) }) })
      mocks.rpc.mockImplementation(async (name: string) => ({ error: null, data:
        name === 'reserve_site_usage' ? { state: 'reserved', limit: 30, used: 1, resetAt: '2099-01-01T00:00:00Z' }
          : name === 'merge_portal_site_data' ? existingData : name === 'site_usage_status' ? null : true,
      }))
      mocks.buildDeployFiles.mockResolvedValue({ 'index.html': '<html></html>' })
      mocks.deploySiteFiles.mockResolvedValue({ deployId: 'deploy-1' })
    })
    it.each([
      [{ state: 'limited', resetAt: '2099-01-01T00:00:00Z' }, 429],
      [{ state: 'ineligible' }, 402], [{ state: 'pending' }, 409], [{ state: 'bad' }, 503],
    ])('does not save or publish when the claim is %j', async (claim, status) => {
      mocks.rpc.mockResolvedValueOnce({ data: claim, error: null })
      expect((await submit()).status).toBe(status)
      expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(['reserve_site_usage'])
      expect(mocks.buildDeployFiles).not.toHaveBeenCalled()
      expect(mocks.deploySiteFiles).not.toHaveBeenCalled()
    })
    it('replays the exact receipt without saving or publishing again', async () => {
      mocks.rpc.mockResolvedValueOnce({ data: { state: 'completed', status: 200, body: { ok: true, republished: true } }, error: null })
      const response = await submit()
      expect(await response.json()).toEqual({ ok: true, republished: true })
      expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(['reserve_site_usage'])
      expect(mocks.deploySiteFiles).not.toHaveBeenCalled()
    })
    it('authorizes the owner before consuming any allowance', async () => {
      mocks.authorized.mockResolvedValue(false)
      expect((await submit()).status).toBe(403)
      expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('keeps the publication slot occupied after an uncertain provider outcome', async () => {
      mocks.deploySiteFiles.mockRejectedValue(new Error('connection lost after submit'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const response = await submit()
      expect(response.status).toBe(502)
      expect(await response.json()).toMatchObject({ code: 'publish_pending', saved: true })
      expect(mocks.rpc.mock.calls.map(([name]) => name)).not.toContain('finish_site_usage')
      expect(mocks.rpc.mock.calls.map(([name]) => name)).not.toContain('release_site_usage')
      vi.restoreAllMocks()
    })
    it('releases the allowance when saving fails before any publication', async () => {
      mocks.rpc.mockImplementation(async (name: string) => name === 'reserve_site_usage'
        ? { data: { state: 'reserved', limit: 30, used: 1, resetAt: '2099-01-01T00:00:00Z' }, error: null }
        : name === 'merge_portal_site_data' ? { data: null, error: { message: 'save failed' } } : { data: true, error: null })
      expect((await submit()).status).toBe(500)
      expect(mocks.rpc).toHaveBeenCalledWith('release_site_usage', expect.objectContaining({ p_operation_id: operationId }))
      expect(mocks.deploySiteFiles).not.toHaveBeenCalled()
    })
  })

})
