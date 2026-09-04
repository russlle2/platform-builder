import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createStripeClient: vi.fn(),
  getTemplate: vi.fn(),
  supabaseFrom: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mocks.supabaseFrom })),
}))

vi.mock('@/lib/stripe-client', () => ({
  createStripeClient: mocks.createStripeClient,
}))

vi.mock('@/lib/templates/niche-registry', () => ({
  getTemplate: mocks.getTemplate,
}))

vi.mock('@/lib/stripe-runtime', () => ({
  TEMPLATE_CHECKOUT_TYPE: 'template_subscription',
  getTemplateFulfillmentConfigIssues: vi.fn(() => []),
}))

const OWNER_A = 'draft-123e4567-e89b-42d3-a456-426614174000'
const OWNER_B = 'draft-123e4567-e89b-42d3-b456-426614174001'

let checkoutPost: typeof import('./route').POST

function requestWithImages(owners: string[]): NextRequest {
  return new NextRequest('https://dailyclarity.org/api/stripe/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      planKey: 'basic',
      template: 'serene',
      niche: 'wellness',
      slug: 'example-site',
      customerValues: {
        BUSINESS_NAME: 'Example Wellness',
        EMAIL: 'owner@example.com',
      },
      imageSwaps: {
        'index.html': owners.map((owner, index) => ({
          original: `/assets/image-${index}.jpg`,
          updated: `https://project.supabase.co/storage/v1/object/public/customer-images/${owner}/image-${index}.webp`,
        })),
      },
    }),
  })
}

describe('template checkout draft-image gate', () => {
  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_checkout'
    process.env.STRIPE_PRICE_BASIC = 'price_basic'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key'
    ;({ POST: checkoutPost } = await import('./route'))
  })

  afterAll(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_PRICE_BASIC
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTemplate.mockResolvedValue({ slug: 'serene' })
  })

  it('rejects an expired upload session before any Stripe or database write', async () => {
    const response = await checkoutPost(requestWithImages([OWNER_A]))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      code: 'image_upload_session_expired',
      recoveryUrl: '/preview-your-business',
    })
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
    expect(mocks.supabaseFrom).not.toHaveBeenCalled()
  })

  it('rejects mixed draft owners before any Stripe or database write', async () => {
    const response = await checkoutPost(requestWithImages([OWNER_A, OWNER_B]))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      code: 'image_upload_session_mismatch',
      recoveryUrl: '/preview-your-business',
    })
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
    expect(mocks.supabaseFrom).not.toHaveBeenCalled()
  })

  it('snapshots the server-side v3 catalogue revision into the checkout intent', async () => {
    const insertIntent = vi.fn().mockResolvedValue({ error: null })
    const insertSlug = vi.fn().mockResolvedValue({ error: null })
    const updateIntentEq = vi.fn().mockResolvedValue({ error: null })
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'checkout_intents') {
        return { insert: insertIntent, update: vi.fn(() => ({ eq: updateIntentEq })) }
      }
      if (table === 'site_slugs') return { insert: insertSlug }
      throw new Error(`Unexpected table ${table}`)
    })
    const createSession = vi.fn().mockResolvedValue({
      id: 'cs_catalog_pin',
      url: 'https://checkout.stripe.test/session',
    })
    mocks.createStripeClient.mockReturnValue({
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'price_basic',
          active: true,
          type: 'recurring',
          recurring: { interval: 'month', interval_count: 1 },
          unit_amount: 2_000,
          currency: 'usd',
        }),
      },
      checkout: {
        sessions: { create: createSession },
      },
    })
    mocks.getTemplate.mockResolvedValue({
      slug: 'serene',
      validation: { contractVersion: 3 },
      designId: 'design_shared',
      contentPresetId: 'content_serene',
      themePresetId: 'theme_serene',
      qualityReceipt: 'receipt_abc123',
    })

    const response = await checkoutPost(requestWithImages([]))
    expect(response.status).toBe(200)
    expect(insertIntent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        catalogRevision: {
          contractVersion: 3,
          designId: 'design_shared',
          contentPresetId: 'content_serene',
          themePresetId: 'theme_serene',
          qualityReceipt: 'receipt_abc123',
        },
      }),
    }))
    const stripePayload = createSession.mock.calls[0]?.[0]
    expect(stripePayload.metadata.catalogRevision_n).toBe('1')
    expect(JSON.parse(stripePayload.metadata.catalogRevision_0)).toMatchObject({
      designId: 'design_shared',
      contentPresetId: 'content_serene',
      themePresetId: 'theme_serene',
      qualityReceipt: 'receipt_abc123',
    })
  })
})
