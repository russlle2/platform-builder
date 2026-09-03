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
})
