import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildDeployFiles: vi.fn(),
  deploySiteFiles: vi.fn(),
  verifyPublishedSite: vi.fn(),
  provisionSite: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/lib/site-deploy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/site-deploy')>()),
  buildDeployFiles: mocks.buildDeployFiles,
}))

vi.mock('@/lib/netlify', () => ({
  provisionSite: mocks.provisionSite,
  deploySiteFiles: mocks.deploySiteFiles,
  verifyPublishedSite: mocks.verifyPublishedSite,
}))

vi.mock('@/lib/portal-auth', () => ({
  createPortalAccessCredentials: () => ({ token: 'portal-token', hash: 'portal-hash' }),
}))

vi.mock('@/lib/customer-images', () => ({
  migrateImagesToSiteSlug: vi.fn(),
  rewriteImageSwapUrls: (swaps: unknown) => swaps,
}))

vi.mock('@/lib/email', () => ({
  sendOrderConfirmationEmail: vi.fn(),
  sendWebsiteLiveEmail: vi.fn(),
  sendManualServiceAlert: vi.fn(),
  sendCustomBuildCustomerConfirmation: vi.fn(),
  sendCustomBuildOwnerAlert: vi.fn(),
}))

import { handleCheckoutCompleted } from './stripe-fulfillment-worker'

function mutation(data: unknown = null) {
  const result = { data, error: null }
  const builder: Record<string, unknown> = {}
  builder.eq = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.select = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(async () => result)
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return builder
}

describe('fulfillment catalogue revision persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    mocks.provisionSite.mockResolvedValue({
      siteId: 'netlify-site',
      siteUrl: 'https://customer-site.netlify.app',
    })
    mocks.buildDeployFiles.mockResolvedValue({ 'index.html': '<html></html>' })
    mocks.deploySiteFiles.mockResolvedValue({ deployId: 'deploy-1' })
    mocks.verifyPublishedSite.mockResolvedValue(undefined)
    mocks.rpc.mockResolvedValue({ data: true, error: null })
  })

  afterEach(() => vi.unstubAllEnvs())

  it('carries the checkout pin into deployment and the durable portal record', async () => {
    const catalogRevision = {
      contractVersion: 3 as const,
      designId: 'design_shared',
      contentPresetId: 'content_alias',
      themePresetId: 'theme_alias',
      qualityReceipt: 'receipt_checkout',
    }
    const checkoutIntent = {
      id: 'intent-1',
      slug: 'customer-site',
      plan: 'basic',
      email: '',
      stripe_session_id: 'cs_test',
      payload: {
        template: 'legacy-alias',
        niche: 'wellness',
        customerValues: { BUSINESS_NAME: 'Customer' },
        imageSwaps: {},
        catalogRevision,
      },
    }
    const from = vi.fn((table: string) => {
      if (table === 'checkout_intents') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: checkoutIntent, error: null }) }) }),
          update: () => mutation(),
        }
      }
      if (table === 'site_slugs') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({
              data: { slug: 'customer-site', status: 'checkout_pending', reserved_for: 'intent-1' },
              error: null,
            }) }),
          }),
          update: () => mutation({ slug: 'customer-site' }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'portal_sites') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          update: () => mutation(),
        }
      }
      if (table === 'orders') return { upsert: vi.fn().mockResolvedValue({ error: null }) }
      if (table === 'manual_service_tasks') {
        return { upsert: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    await handleCheckoutCompleted({ from, rpc: mocks.rpc } as never, {
      id: 'cs_test',
      metadata: { slug: 'customer-site', checkoutIntentId: 'intent-1', planKey: 'basic' },
      customer: null,
      subscription: 'sub_test',
      customer_details: { email: null },
      payment_status: 'paid',
      amount_total: 2_000,
      currency: 'usd',
    } as never)

    expect(mocks.buildDeployFiles).toHaveBeenCalledWith(expect.objectContaining({
      templateSlug: 'legacy-alias',
      catalogRevision,
    }))
    expect(mocks.rpc).toHaveBeenCalledWith(
      'upsert_portal_checkout_state',
      expect.objectContaining({
        p_data_patch: expect.objectContaining({ catalogRevision }),
      }),
    )

    // The Stripe copy is a recovery path for older/missing intent payload
    // fields. It must reconstruct the identical immutable pin.
    delete (checkoutIntent.payload as Record<string, unknown>).catalogRevision
    mocks.buildDeployFiles.mockClear()
    await handleCheckoutCompleted({ from, rpc: mocks.rpc } as never, {
      id: 'cs_test',
      metadata: {
        slug: 'customer-site',
        checkoutIntentId: 'intent-1',
        planKey: 'basic',
        catalogRevision_n: '1',
        catalogRevision_0: JSON.stringify(catalogRevision),
      },
      customer: null,
      subscription: 'sub_test',
      customer_details: { email: null },
      payment_status: 'paid',
      amount_total: 2_000,
      currency: 'usd',
    } as never)
    expect(mocks.buildDeployFiles).toHaveBeenCalledWith(expect.objectContaining({
      catalogRevision,
    }))
  })
})
