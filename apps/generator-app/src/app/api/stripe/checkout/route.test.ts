import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'

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
  stripeIntegrationIdentifier: (_kind: string, id: string) => `dc-${id}`,
}))

vi.mock('@/lib/templates/niche-registry', () => ({
  getTemplateAtCatalogRevision: mocks.getTemplate,
}))

vi.mock('@/lib/stripe-runtime', () => ({
  TEMPLATE_CHECKOUT_TYPE: 'template_subscription',
  getTemplateFulfillmentConfigIssues: vi.fn(() => []),
}))

const OWNER_A = 'draft-123e4567-e89b-42d3-a456-426614174000'
const OWNER_B = 'draft-123e4567-e89b-42d3-b456-426614174001'

let checkoutPost: typeof import('./route').POST
let requestNumber = 1

function requestWithImages(owners: string[], overrides: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('https://dailyclarity.org/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-nf-client-connection-ip': `198.51.100.${requestNumber++}`,
    },
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
      ...overrides,
    }),
  })
}

function checkoutLifecycle() {
  const insertIntent = vi.fn().mockResolvedValue({ error: null })
  const insertSlug = vi.fn().mockResolvedValue({ error: null })
  const intentStatusFilter = vi.fn().mockResolvedValue({ error: null })
  const updateIntent = vi.fn((_values: Record<string, unknown>) => ({
    eq: vi.fn(() => ({
      in: intentStatusFilter,
      then: (resolve: (result: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve),
    })),
  }))
  const deletedSlugFilters: Array<[string, unknown]> = []
  const slugDeletion = {
    eq: (field: string, value: unknown) => { deletedSlugFilters.push([field, value]); return slugDeletion },
    then: (resolve: (result: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve),
  }
  const deleteSlug = vi.fn(() => slugDeletion)
  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'checkout_intents') return { insert: insertIntent, update: updateIntent }
    if (table === 'site_slugs') return { insert: insertSlug, delete: deleteSlug }
    throw new Error(`Unexpected table ${table}`)
  })
  const retrievePrice = vi.fn().mockResolvedValue({
    id: 'price_basic', active: true, type: 'recurring',
    recurring: { interval: 'month', interval_count: 1 }, unit_amount: 2_000, currency: 'usd',
  })
  const createSession = vi.fn().mockResolvedValue({ id: 'cs_lifecycle', url: 'https://checkout.stripe.test/session' })
  mocks.createStripeClient.mockReturnValue({
    prices: { retrieve: retrievePrice }, checkout: { sessions: { create: createSession } },
  })
  return { insertIntent, insertSlug, updateIntent, intentStatusFilter, deleteSlug, deletedSlugFilters, retrievePrice, createSession }
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

  it('pauses new paid sales before any Stripe or database action', async () => {
    vi.stubEnv('DAILYCLARITY_SALES_PAUSED', 'true')
    try {
      const response = await checkoutPost(requestWithImages([]))
      expect(response.status).toBe(503)
      expect(await response.json()).toHaveProperty('retrySafe', true)
      expect(mocks.createStripeClient).not.toHaveBeenCalled()
      expect(mocks.supabaseFrom).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
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

  it('does not accept a managed-service purchase without an operator inbox', async () => {
    vi.stubEnv('PLATFORM_OWNER_EMAIL', '')
    try {
      const response = await checkoutPost(requestWithImages([], { planKey: 'security_ads' }))
      expect(response.status).toBe(503)
      expect(await response.json()).toHaveProperty('retrySafe', true)
      expect(mocks.createStripeClient).not.toHaveBeenCalled()
      expect(mocks.supabaseFrom).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
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
    const catalogRevision = {
      contractVersion: 3,
      designId: 'design_shared',
      contentPresetId: 'content_serene',
      themePresetId: 'theme_serene',
      qualityReceipt: 'receipt_abc123',
      catalogHash: 'a'.repeat(64),
      manifestHash: 'b'.repeat(64),
    }
    const insertIntent = vi.fn().mockResolvedValue({ error: null })
    const insertSlug = vi.fn().mockResolvedValue({ error: null })
    const updateIntentEq = vi.fn(() => ({ in: vi.fn().mockResolvedValue({ error: null }) }))
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
      catalogHash: catalogRevision.catalogHash,
      manifestHash: catalogRevision.manifestHash,
    })

    const response = await checkoutPost(requestWithImages([], { catalogRevision }))
    expect(response.status).toBe(200)
    expect(insertIntent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        catalogRevision: {
          contractVersion: 3,
          designId: 'design_shared',
          contentPresetId: 'content_serene',
          themePresetId: 'theme_serene',
          qualityReceipt: 'receipt_abc123',
          catalogHash: catalogRevision.catalogHash,
          manifestHash: catalogRevision.manifestHash,
        },
      }),
    }))
    const stripePayload = createSession.mock.calls[0]?.[0]
    expect(stripePayload).toMatchObject({
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      payment_method_options: { card: { request_three_d_secure: 'automatic' } },
      wallet_options: { link: { display: 'never' } },
      customer_email: 'owner@example.com',
    })
    expect(stripePayload).not.toHaveProperty('shipping_address_collection')
    expect(stripePayload).not.toHaveProperty('payment_method_types')
    expect(stripePayload).not.toHaveProperty('customer')
    expect(stripePayload.integration_identifier).toBe(`dc-${stripePayload.client_reference_id}`)
    expect(stripePayload.metadata.catalogRevision_n).toBe('1')
    expect(JSON.parse(stripePayload.metadata.catalogRevision_0)).toMatchObject({
      designId: 'design_shared',
      contentPresetId: 'content_serene',
      themePresetId: 'theme_serene',
      qualityReceipt: 'receipt_abc123',
      catalogHash: catalogRevision.catalogHash,
      manifestHash: catalogRevision.manifestHash,
    })
    expect(mocks.getTemplate).toHaveBeenCalledWith('wellness', 'serene', catalogRevision)
  })

  it('fails before payment when the approved preview revision cannot be resolved', async () => {
    mocks.getTemplate.mockRejectedValue(new Error('historical snapshot is missing'))
    const response = await checkoutPost(requestWithImages([], {
      catalogRevision: {
        contractVersion: 3,
        designId: 'design_old',
        contentPresetId: 'content_old',
        themePresetId: 'theme_old',
        qualityReceipt: 'receipt_old',
        catalogHash: 'c'.repeat(64),
        manifestHash: 'd'.repeat(64),
      },
    }))
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      code: 'catalog_revision_unavailable',
      recoveryUrl: '/preview-your-business',
    })
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
    expect(mocks.supabaseFrom).not.toHaveBeenCalled()
  })

  it('rejects malformed and oversized bodies before catalogue, database, or Stripe access', async () => {
    const malformed = new NextRequest('https://dailyclarity.org/api/stripe/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.31' },
      body: '{',
    })
    const declaredOversize = new NextRequest('https://dailyclarity.org/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '200001',
        'x-forwarded-for': '198.51.100.32',
      },
      body: '{}',
    })

    expect((await checkoutPost(malformed)).status).toBe(400)
    expect((await checkoutPost(declaredOversize)).status).toBe(413)
    expect(mocks.getTemplate).not.toHaveBeenCalled()
    expect(mocks.supabaseFrom).not.toHaveBeenCalled()
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
  })

  it.each([
    ['separate inboxes', { accountEmail: '  Private.Owner@Example.com  ' }, 'private.owner@example.com'],
    ['same inbox', { accountEmail: ' Public.Contact@Example.com ' }, 'public.contact@example.com'],
    ['legacy absent field', {}, 'public.contact@example.com'],
  ])('keeps account and template email separate for %s', async (_label, account, expectedEmail) => {
    const insertIntent = vi.fn().mockResolvedValue({ error: null })
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'checkout_intents') return {
        insert: insertIntent,
        update: () => ({ eq: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ error: null }) })) }),
      }
      if (table === 'site_slugs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
      throw new Error(`Unexpected table ${table}`)
    })
    const createSession = vi.fn().mockResolvedValue({ id: 'cs_separate_email', url: 'https://checkout.stripe.test/session' })
    mocks.createStripeClient.mockReturnValue({
      prices: { retrieve: vi.fn().mockResolvedValue({
        id: 'price_basic', active: true, type: 'recurring',
        recurring: { interval: 'month', interval_count: 1 }, unit_amount: 2_000, currency: 'usd',
      }) },
      checkout: { sessions: { create: createSession } },
    })
    const response = await checkoutPost(requestWithImages([], {
      ...account,
      customerValues: {
        BUSINESS_NAME: 'Public Business', EMAIL: 'Public.Contact@Example.com',
        accountEmail: 'nested-private@example.com', ACCOUNT_EMAIL: 'nested-private@example.com',
      },
    }))

    expect(response.status).toBe(200)
    const intent = insertIntent.mock.calls[0][0]
    expect(intent.email).toBe(expectedEmail)
    expect(intent.payload.customerValues).toEqual({
      BUSINESS_NAME: 'Public Business', EMAIL: 'Public.Contact@Example.com',
    })
    expect(intent.payload).not.toHaveProperty('accountEmail')
    expect(JSON.stringify(intent.payload)).not.toContain('private@example.com')
    if (_label === 'separate inboxes') expect(JSON.stringify(intent.payload)).not.toContain(expectedEmail)
    expect(createSession.mock.calls[0][0].customer_email).toBe(expectedEmail)
    expect(JSON.stringify(createSession.mock.calls[0][0].metadata)).not.toContain(expectedEmail)
  })

  it.each(['', '   ', 'invalid', 'a@b', 'a,b@example.com', '<a@example.com>', 'a@example.com\r\nBcc:b@example.com', null, false, 123, {}, [], `${'a'.repeat(310)}@example.com`])(
    'rejects explicit invalid account email %j before provider side effects',
    async (accountEmail) => {
      const response = await checkoutPost(requestWithImages([], { accountEmail }))
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: 'A valid account email address is required.' })
      expect(mocks.getTemplate).not.toHaveBeenCalled()
      expect(mocks.createStripeClient).not.toHaveBeenCalled()
      expect(mocks.supabaseFrom).not.toHaveBeenCalled()
    },
  )

  it('still validates the public email when the private account email is valid', async () => {
    const response = await checkoutPost(requestWithImages([], {
      accountEmail: 'private@example.com',
      customerValues: { BUSINESS_NAME: 'Public Business', EMAIL: 'invalid' },
    }))
    expect(response.status).toBe(400)
    expect(mocks.getTemplate).not.toHaveBeenCalled()
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
    expect(mocks.supabaseFrom).not.toHaveBeenCalled()
  })

  it('keeps a pre-creation Stripe read failure distinct from an uncertain checkout creation', async () => {
    const state = checkoutLifecycle()
    state.retrievePrice.mockRejectedValue(new Stripe.errors.StripeConnectionError({ message: 'Price lookup unavailable' }))
    const response = await checkoutPost(requestWithImages([]))
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).not.toHaveProperty('code', 'checkout_creation_uncertain')
    expect(body).toHaveProperty('retrySafe', true)
    expect(state.createSession).not.toHaveBeenCalled()
    expect(state.insertIntent).not.toHaveBeenCalled()
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it('marks a saved intent failed when slug reservation fails before session creation', async () => {
    const state = checkoutLifecycle()
    state.insertSlug.mockResolvedValue({ error: { code: 'unavailable' } } as never)
    const response = await checkoutPost(requestWithImages([]))
    expect(response.status).toBe(500)
    expect(await response.json()).toHaveProperty('retrySafe', true)
    expect(state.createSession).not.toHaveBeenCalled()
    expect(state.updateIntent).toHaveBeenCalledWith(expect.objectContaining({ status: 'checkout_failed' }))
  })

  it.each([
    new Stripe.errors.StripeConnectionError({ message: 'Connection lost' }),
    new Stripe.errors.StripeAPIError({ message: 'Server error', statusCode: 500 }),
    new Error('Unknown transport outcome'),
  ])('preserves the durable intent and reserved slug after uncertain creation: %s', async (error) => {
    const state = checkoutLifecycle()
    state.createSession.mockRejectedValue(error)
    const response = await checkoutPost(requestWithImages([]))
    const body = await response.json()
    expect(response.status).toBe(409)
    expect(body).toMatchObject({ code: 'checkout_creation_uncertain', reference: state.insertIntent.mock.calls[0][0].id, supportUrl: '/contact' })
    expect(body.error).toContain("don't start another payment")
    expect(body).not.toHaveProperty('retrySafe')
    expect(state.updateIntent).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ last_error: 'checkout_creation_uncertain' }))
    expect(state.updateIntent.mock.calls[0][0]).not.toHaveProperty('status')
    expect(state.intentStatusFilter).toHaveBeenCalledWith('status', ['pending', 'session_created'])
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it('retains the known session and slug when creation succeeds but its checkout URL is missing', async () => {
    const state = checkoutLifecycle()
    state.createSession.mockResolvedValue({ id: 'cs_known', url: null } as never)
    const response = await checkoutPost(requestWithImages([]))
    expect(response.status).toBe(409)
    expect(await response.json()).not.toHaveProperty('retrySafe')
    expect(state.updateIntent).toHaveBeenCalledWith(expect.objectContaining({
      stripe_session_id: 'cs_known', status: 'session_created', last_error: 'checkout_creation_uncertain',
    }))
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it('returns the uncertain contract even if recording uncertainty also fails', async () => {
    const state = checkoutLifecycle()
    state.createSession.mockRejectedValue(new Stripe.errors.StripeConnectionError({ message: 'Connection lost' }))
    state.intentStatusFilter.mockRejectedValue(new Error('Database unavailable'))
    const response = await checkoutPost(requestWithImages([]))
    expect(response.status).toBe(409)
    expect(await response.json()).toHaveProperty('code', 'checkout_creation_uncertain')
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it('fails and releases only its own reservation after a definitive Stripe request rejection', async () => {
    const state = checkoutLifecycle()
    state.createSession.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({ message: 'Invalid price', statusCode: 400 }))
    const response = await checkoutPost(requestWithImages([]))
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).not.toHaveProperty('code', 'checkout_creation_uncertain')
    expect(body).toHaveProperty('retrySafe', true)
    expect(state.updateIntent).toHaveBeenCalledWith(expect.objectContaining({ status: 'checkout_failed' }))
    expect(state.deleteSlug).toHaveBeenCalledOnce()
    expect(state.deletedSlugFilters).toEqual([
      ['slug', 'example-site'], ['reserved_for', state.insertIntent.mock.calls[0][0].id], ['status', 'checkout_pending'],
    ])
  })

  it('does not regress a concurrently completed intent when persisting a successful session', async () => {
    const state = checkoutLifecycle()
    let persistedStatus = 'pending'
    state.createSession.mockImplementation(async () => {
      // The signed webhook wins the race before the create response arrives.
      persistedStatus = 'completed'
      return { id: 'cs_already_completed', url: 'https://checkout.stripe.test/session' }
    })
    state.intentStatusFilter.mockImplementation(async (_field: string, allowedStatuses: string[]) => {
      if (allowedStatuses.includes(persistedStatus)) {
        persistedStatus = String(state.updateIntent.mock.calls.at(-1)?.[0].status)
      }
      return { error: null }
    })

    const response = await checkoutPost(requestWithImages([]))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ url: 'https://checkout.stripe.test/session' })
    expect(state.intentStatusFilter).toHaveBeenCalledExactlyOnceWith('status', ['pending', 'session_created'])
    expect(persistedStatus).toBe('completed')
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })
})
