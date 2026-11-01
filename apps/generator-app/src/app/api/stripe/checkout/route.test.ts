import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { CHECKOUT_ATTEMPT_COOKIE } from '@/lib/checkout-resume'

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
  configuredStripeLivemode: () => false,
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
      origin: 'https://dailyclarity.org',
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
  const loadIntent = vi.fn().mockResolvedValue({ data: null, error: null })
  const insertIntent = vi.fn().mockResolvedValue({ error: null })
  const loadCleanupIntent = vi.fn(async () => ({ data: { ...insertIntent.mock.calls[0]?.[0],
    status: 'checkout_failed', last_error: 'checkout_expired', stripe_session_id: 'cs_lifecycle' }, error: null }))
  const insertSlug = vi.fn().mockResolvedValue({ error: null })
  const loadReservation = vi.fn(async () => ({ data: insertSlug.mock.calls[0]?.[0], error: null }))
  const intentStatusFilter = vi.fn().mockResolvedValue({ error: null })
  const updateIntent = vi.fn((_values: Record<string, unknown>) => ({
    eq: vi.fn(() => ({
      in: intentStatusFilter,
      then: (resolve: (result: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve),
    })),
  }))
  const deletedSlugFilters: Array<[string, unknown]> = []
  const releaseResult = vi.fn().mockResolvedValue({ error: null })
  const slugDeletion = {
    eq: (field: string, value: unknown) => { deletedSlugFilters.push([field, value]); return slugDeletion },
    then: (resolve: (result: { error: null }) => unknown) => releaseResult().then(resolve),
  }
  const deleteSlug = vi.fn(() => slugDeletion)
  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'checkout_intents') return { insert: insertIntent, update: updateIntent,
      select: (fields: string) => ({ eq: () => ({ maybeSingle: fields === 'id,slug,status,stripe_session_id,last_error' ? loadCleanupIntent : loadIntent }) }) }
    if (table === 'site_slugs') return { insert: insertSlug, delete: deleteSlug, select: () => ({ eq: () => ({ maybeSingle: loadReservation }) }) }
    throw new Error(`Unexpected table ${table}`)
  })
  const retrievePrice = vi.fn().mockResolvedValue({
    id: 'price_basic', active: true, type: 'recurring',
    recurring: { interval: 'month', interval_count: 1 }, unit_amount: 2_000, currency: 'usd',
  })
  const createSession = vi.fn().mockResolvedValue({ id: 'cs_lifecycle', url: 'https://checkout.stripe.test/session' })
  const retrieveSession = vi.fn()
  const expireSession = vi.fn().mockResolvedValue({})
  mocks.createStripeClient.mockReturnValue({
    prices: { retrieve: retrievePrice }, checkout: { sessions: { create: createSession, retrieve: retrieveSession, expire: expireSession } },
  })
  return { insertIntent, insertSlug, updateIntent, intentStatusFilter, deleteSlug, deletedSlugFilters, retrievePrice, createSession, loadIntent, retrieveSession, expireSession, loadReservation, releaseResult, loadCleanupIntent }
}

describe('template checkout draft-image gate', () => {
  beforeAll(async () => {
    process.env.PORTAL_TOKEN_SECRET = 'test-checkout-cookie-secret-32-characters'
    process.env.STRIPE_SECRET_KEY = 'sk_test_checkout'
    process.env.STRIPE_PRICE_BASIC = 'price_basic'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key'
    ;({ POST: checkoutPost } = await import('./route'))
  })

  afterAll(() => {
    delete process.env.PORTAL_TOKEN_SECRET
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_PRICE_BASIC
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTemplate.mockResolvedValue({ slug: 'serene', fields: [] })
  })

  it('rejects an incomplete pinned template profile before any Stripe or database write', async () => {
    mocks.getTemplate.mockResolvedValue({ slug: 'serene', fields: [
      { name: 'CITY', type: 'text', required: true, default: 'Your City' },
      { name: 'PRACTITIONER_NAME', type: 'text', required: true },
    ] })
    const response = await checkoutPost(requestWithImages([], { reviewed: true }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'template_profile_incomplete', fields: [
      expect.objectContaining({ name: 'CITY' }), expect.objectContaining({ name: 'PRACTITIONER_NAME' }),
    ] })
    expect(mocks.createStripeClient).not.toHaveBeenCalled()
    expect(mocks.supabaseFrom).not.toHaveBeenCalled()
  })

  it('accepts legitimate defaults and complete aliases without changing customer text', async () => {
    mocks.getTemplate.mockResolvedValue({ slug: 'serene', fields: [
      { name: 'PRACTITIONER_NAME', required: true },
      { name: 'TAGLINE', required: true, default: 'A gentle place to begin.' },
      { name: 'BOOKING_URL', type: 'url', required: true },
    ] })
    const state = checkoutLifecycle()
    const response = await checkoutPost(requestWithImages([], { customerValues: {
      BUSINESS_NAME: 'Jane & Joe', EMAIL: 'hello@example.com', OWNER_NAME: 'Jane', BOOKING_URL: '/contact.html',
    } }))
    expect(response.status).toBe(200)
    expect(state.insertIntent).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({
      customerValues: expect.objectContaining({ BUSINESS_NAME: 'Jane & Joe' }),
    }) }))
  })

  it.each(['original', 'ocean-breeze'])('retains the requested %s palette in the durable fulfillment payload', async (colorScheme) => {
    const { insertIntent } = checkoutLifecycle()
    const customTheme = colorScheme === 'original'
      ? null
      : { primary: '#123456', background: '#ffffff', text: '#123456', headingFont: 'Georgia, serif', bodyFont: 'Georgia, serif' }
    const response = await checkoutPost(requestWithImages([], { colorScheme, customTheme }))
    expect(response.status).toBe(200)
    expect(insertIntent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ colorScheme, customTheme }),
    }))
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
      slug: 'serene', fields: [],
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
  async function preparedAttempt(initialOverrides: Record<string, unknown> = {}) {
    const state = checkoutLifecycle()
    const first = await checkoutPost(requestWithImages([], initialOverrides))
    expect(first.status).toBe(200)
    const cookie = first.cookies.get(CHECKOUT_ATTEMPT_COOKIE)!
    expect(cookie.httpOnly).toBe(true)
    expect(cookie.sameSite).toBe('lax')
    const intent = { ...state.insertIntent.mock.calls[0][0], status: 'session_created', stripe_session_id: 'cs_lifecycle' }
    state.loadIntent.mockResolvedValue({ data: intent, error: null })
    const session = {
      id: 'cs_lifecycle', status: 'open', payment_status: 'unpaid', mode: 'subscription', livemode: false,
      url: 'https://checkout.stripe.com/c/pay/cs_lifecycle', client_reference_id: intent.id,
      metadata: state.createSession.mock.calls[0][0].metadata,
    }
    state.retrieveSession.mockResolvedValue(session)
    const request = (overrides: Record<string, unknown> = {}) => {
      const req = requestWithImages([], { ...initialOverrides, ...overrides })
      req.cookies.set(CHECKOUT_ATTEMPT_COOKIE, cookie.value)
      return req
    }
    return { ...state, intent, session, request }
  }

  it('resumes the original unpaid session after returning from Stripe without another intent, reservation or subscription', async () => {
    const state = await preparedAttempt()
    const response = await checkoutPost(state.request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ url: state.session.url })
    expect(state.retrieveSession).toHaveBeenCalledWith('cs_lifecycle', {}, { timeout: 3_000, maxNetworkRetries: 0 })
    expect(state.insertIntent).toHaveBeenCalledTimes(1)
    expect(state.insertSlug).toHaveBeenCalledTimes(1)
    expect(state.createSession).toHaveBeenCalledTimes(1)
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it('resumes a draft whose template-matching requested slug was automatically made unique', async () => {
    const state = await preparedAttempt({ slug: 'serene' })
    expect(state.intent.slug).not.toBe('serene')
    const response = await checkoutPost(state.request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ url: state.session.url })
    expect(state.createSession).toHaveBeenCalledTimes(1)
  })

  it('requires explicit selection to resume an earlier checkout after draft changes', async () => {
    const state = await preparedAttempt()
    const changed = { customerValues: { BUSINESS_NAME: 'Changed Wellness', EMAIL: 'owner@example.com' } }
    const blocked = await checkoutPost(state.request(changed))
    expect(blocked.status).toBe(409)
    expect(await blocked.json()).toMatchObject({ code: 'checkout_draft_changed', previousBusinessName: 'Example Wellness', previousPlan: 'Basic' })
    const resumed = await checkoutPost(state.request({ ...changed, resumePreviousCheckout: true }))
    expect(await resumed.json()).toEqual({ url: state.session.url })
    expect(state.createSession).toHaveBeenCalledTimes(1)
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it('sends a completed free trial to its original success page instead of creating another subscription', async () => {
    const state = await preparedAttempt()
    state.retrieveSession.mockResolvedValue({ ...state.session, status: 'complete', payment_status: 'no_payment_required', url: null })
    const response = await checkoutPost(state.request())
    expect(await response.json()).toEqual({ url: 'https://dailyclarity.org/success?session_id=cs_lifecycle' })
    expect(response.cookies.get(CHECKOUT_ATTEMPT_COOKIE)?.maxAge).toBe(0)
    expect(state.createSession).toHaveBeenCalledTimes(1)
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it('validates the stored profile when explicitly resuming, rather than different complete current details', async () => {
    const state = await preparedAttempt()
    mocks.getTemplate.mockResolvedValue({ slug: 'serene', fields: [{ name: 'CITY', required: true, default: 'Your City' }] })
    const response = await checkoutPost(state.request({ resumePreviousCheckout: true, customerValues: {
      BUSINESS_NAME: 'Example Wellness', EMAIL: 'owner@example.com', CITY: 'Albany',
    } }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'checkout_previous_profile_incomplete', previousBusinessName: 'Example Wellness' })
    expect(state.createSession).toHaveBeenCalledTimes(1)
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it('keeps a completed prior purchase reachable when the current draft lacks newly required details', async () => {
    const state = await preparedAttempt()
    mocks.getTemplate.mockResolvedValue({ slug: 'serene', fields: [{ name: 'CITY', required: true, default: 'Your City' }] })
    state.retrieveSession.mockResolvedValue({ ...state.session, status: 'complete', payment_status: 'paid' })
    const response = await checkoutPost(state.request())
    expect(response.status).toBe(200)
    expect(await response.json()).toHaveProperty('url', 'https://dailyclarity.org/success?session_id=cs_lifecycle')
    expect(state.createSession).toHaveBeenCalledTimes(1)
  })

  it('releases only the owned pending reservation after verified expiration and requires a new click', async () => {
    const state = await preparedAttempt()
    state.retrieveSession.mockResolvedValue({ ...state.session, status: 'expired', url: null })
    const response = await checkoutPost(state.request())
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'checkout_expired', retrySafe: true })
    expect(state.deletedSlugFilters).toEqual([['slug', 'example-site'], ['reserved_for', state.intent.id], ['status', 'checkout_pending']])
    expect(response.cookies.get(CHECKOUT_ATTEMPT_COOKIE)?.maxAge).toBe(0)
    expect(state.createSession).toHaveBeenCalledTimes(1)
  })

  it.each(['provider failure', 'wrong binding', 'missing stored session'])('preserves the existing attempt when resume is uncertain: %s', async reason => {
    const state = await preparedAttempt()
    if (reason === 'provider failure') state.retrieveSession.mockRejectedValue(new Error('Network failed'))
    if (reason === 'wrong binding') state.retrieveSession.mockResolvedValue({ ...state.session, client_reference_id: 'foreign' })
    if (reason === 'missing stored session') state.loadIntent.mockResolvedValue({ data: { ...state.intent, stripe_session_id: null }, error: null })
    const response = await checkoutPost(state.request())
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'checkout_creation_uncertain', reference: state.intent.id })
    expect(state.createSession).toHaveBeenCalledTimes(1)
    expect(state.insertIntent).toHaveBeenCalledTimes(1)
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it('never accepts a client-supplied intent or an unowned resume action', async () => {
    const state = checkoutLifecycle()
    const request = requestWithImages([], { resumePreviousCheckout: true, intentId: 'foreign', sessionId: 'cs_foreign' })
    request.cookies.set(CHECKOUT_ATTEMPT_COOKIE, 'forged')
    const response = await checkoutPost(request)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'checkout_resume_unavailable' })
    expect(state.loadIntent).not.toHaveBeenCalled()
    expect(state.retrieveSession).not.toHaveBeenCalled()
    expect(state.createSession).not.toHaveBeenCalled()
  })

  it.each([
    { replacePreviousCheckout: 'true' }, { resumePreviousCheckout: 'false' },
    { replacePreviousCheckout: true, resumePreviousCheckout: true },
  ])('rejects ambiguous recovery controls before provider activity: %j', async controls => {
    const state = checkoutLifecycle()
    const response = await checkoutPost(requestWithImages([], controls))
    expect(response.status).toBe(400)
    expect(state.createSession).not.toHaveBeenCalled()
    expect(state.expireSession).not.toHaveBeenCalled()
  })

  it.each([undefined, 'forged'])('rejects replacement without its signed capability: %s', async cookie => {
    const state = checkoutLifecycle()
    const req = requestWithImages([], { replacePreviousCheckout: true, intentId: 'foreign', sessionId: 'cs_foreign' })
    if (cookie) req.cookies.set(CHECKOUT_ATTEMPT_COOKIE, cookie)
    const response = await checkoutPost(req)
    expect(response.status).toBe(409)
    expect(state.loadIntent).not.toHaveBeenCalled()
    expect(state.expireSession).not.toHaveBeenCalled()
  })

  it.each([
    { accountEmail: 'new-private@example.com' }, { template: 'another-template' },
    { customerValues: { BUSINESS_NAME: 'Updated Practice', EMAIL: 'updated@example.com' } },
  ])('closes an owned unpaid checkout for updated details without starting another: %j', async changes => {
    const state = await preparedAttempt()
    state.retrieveSession.mockResolvedValueOnce(state.session)
      .mockResolvedValueOnce({ ...state.session, status: 'expired', url: null })
    const response = await checkoutPost(state.request({ ...changes, replacePreviousCheckout: true }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ code: 'checkout_replaced', retrySafe: true })
    expect(state.expireSession).toHaveBeenCalledExactlyOnceWith('cs_lifecycle', {}, {
      timeout: 3_000, maxNetworkRetries: 0, idempotencyKey: `dailyclarity-checkout-expire-${state.intent.id}`,
    })
    expect(state.retrieveSession).toHaveBeenCalledTimes(2)
    expect(state.deletedSlugFilters).toEqual([['slug', 'example-site'], ['reserved_for', state.intent.id], ['status', 'checkout_pending']])
    expect(response.cookies.get(CHECKOUT_ATTEMPT_COOKIE)?.maxAge).toBe(0)
    expect(state.createSession).toHaveBeenCalledTimes(1)
    expect(state.insertIntent).toHaveBeenCalledTimes(1)
  })

  it('validates a changed plan price before expiring the earlier checkout', async () => {
    const state = await preparedAttempt()
    vi.stubEnv('PLATFORM_OWNER_EMAIL', 'support@example.com')
    vi.stubEnv('STRIPE_PRICE_GROWTH', 'price_managed')
    try {
      state.retrievePrice.mockResolvedValue({ id: 'price_managed', active: true, type: 'recurring',
        recurring: { interval: 'month', interval_count: 1 }, unit_amount: 8_000, currency: 'usd' })
      state.retrieveSession.mockResolvedValueOnce(state.session)
        .mockResolvedValueOnce({ ...state.session, status: 'expired', url: null })
      const response = await checkoutPost(state.request({ replacePreviousCheckout: true, planKey: 'security_ads' }))
      expect(response.status).toBe(200)
      expect(state.expireSession).toHaveBeenCalledTimes(1)
      expect(state.createSession).toHaveBeenCalledTimes(1)
    } finally { vi.unstubAllEnvs() }
  })

  it('does not cancel an earlier checkout when the updated profile is incomplete', async () => {
    const state = await preparedAttempt()
    mocks.getTemplate.mockResolvedValue({ slug: 'serene', fields: [{ name: 'CITY', required: true }] })
    const response = await checkoutPost(state.request({ replacePreviousCheckout: true }))
    expect(await response.json()).toMatchObject({ code: 'template_profile_incomplete' })
    expect(state.expireSession).not.toHaveBeenCalled()
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it.each(['missing', 'foreign', 'active'])('preserves an inconsistent %s reservation without attempting expiration', async problem => {
    const state = await preparedAttempt()
    state.loadReservation.mockResolvedValue({ data: problem === 'missing' ? null : {
      slug: state.intent.slug, reserved_for: problem === 'foreign' ? 'other-intent' : state.intent.id,
      status: problem === 'active' ? 'active' : 'checkout_pending',
    }, error: null })
    const response = await checkoutPost(state.request({ replacePreviousCheckout: true }))
    expect(await response.json()).toMatchObject({ code: 'checkout_creation_uncertain' })
    expect(state.expireSession).not.toHaveBeenCalled()
    expect(state.deleteSlug).not.toHaveBeenCalled()
    expect(response.cookies.get(CHECKOUT_ATTEMPT_COOKIE)).toBeUndefined()
  })

  it.each([
    { client_reference_id: 'foreign' }, { livemode: true }, { mode: 'payment' },
    { payment_status: 'paid' }, { metadata: null },
  ])('never expires a mismatched session: %j', async mismatch => {
    const state = await preparedAttempt()
    state.retrieveSession.mockResolvedValue({ ...state.session, ...mismatch })
    const response = await checkoutPost(state.request({ replacePreviousCheckout: true }))
    expect(await response.json()).toMatchObject({ code: 'checkout_creation_uncertain' })
    expect(state.expireSession).not.toHaveBeenCalled()
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it('routes a purchase completed during expiration to its original success page', async () => {
    const state = await preparedAttempt()
    state.expireSession.mockRejectedValue(new Error('Session already completed'))
    state.retrieveSession.mockResolvedValueOnce(state.session)
      .mockResolvedValueOnce({ ...state.session, status: 'complete', payment_status: 'paid', url: null })
    const response = await checkoutPost(state.request({ replacePreviousCheckout: true }))
    expect(await response.json()).toEqual({ url: 'https://dailyclarity.org/success?session_id=cs_lifecycle' })
    expect(state.deleteSlug).not.toHaveBeenCalled()
    expect(state.createSession).toHaveBeenCalledTimes(1)
  })

  it.each(['expired', 'open', 'unreadable'])('reconciles a lost expiration response from independent %s state', async outcome => {
    const state = await preparedAttempt()
    state.expireSession.mockRejectedValue(new Error('Network response lost'))
    state.retrieveSession.mockResolvedValueOnce(state.session)
    if (outcome === 'unreadable') state.retrieveSession.mockRejectedValueOnce(new Error('Readback unavailable'))
    else state.retrieveSession.mockResolvedValueOnce({ ...state.session, status: outcome })
    const response = await checkoutPost(state.request({ replacePreviousCheckout: true }))
    expect(await response.json()).toMatchObject({ code: outcome === 'expired' ? 'checkout_replaced' : 'checkout_creation_uncertain' })
    expect(state.deleteSlug.mock.calls.length).toBe(outcome === 'expired' ? 1 : 0)
    expect(state.createSession).toHaveBeenCalledTimes(1)
  })

  it.each(['intent', 'reservation'])('retains the cookie after partial %s cleanup and safely reconciles a retry', async failure => {
    const state = await preparedAttempt()
    state.retrieveSession.mockResolvedValue({ ...state.session, status: 'expired', url: null })
    if (failure === 'intent') state.intentStatusFilter.mockResolvedValueOnce({ error: { message: 'Unavailable' } })
    else state.releaseResult.mockResolvedValueOnce({ error: { message: 'Unavailable' } })
    const first = await checkoutPost(state.request({ replacePreviousCheckout: true }))
    expect(await first.json()).toMatchObject({ code: 'checkout_creation_uncertain' })
    expect(first.cookies.get(CHECKOUT_ATTEMPT_COOKIE)).toBeUndefined()
    state.loadIntent.mockResolvedValue({ data: { ...state.intent, status: 'checkout_failed' }, error: null })
    const second = await checkoutPost(state.request({ replacePreviousCheckout: true }))
    expect(await second.json()).toMatchObject({ code: 'checkout_replaced', retrySafe: true })
    expect(second.cookies.get(CHECKOUT_ATTEMPT_COOKIE)?.maxAge).toBe(0)
    expect(state.expireSession).not.toHaveBeenCalled()
    expect(state.createSession).toHaveBeenCalledTimes(1)
  })

  it('does not clean up a completed intent even if provider metadata is inconsistent', async () => {
    const state = await preparedAttempt()
    state.loadIntent.mockResolvedValue({ data: { ...state.intent, status: 'completed' }, error: null })
    state.retrieveSession.mockResolvedValue({ ...state.session, status: 'expired', url: null })
    const response = await checkoutPost(state.request({ replacePreviousCheckout: true }))
    expect(await response.json()).toMatchObject({ code: 'checkout_creation_uncertain' })
    expect(state.deleteSlug).not.toHaveBeenCalled()
    expect(state.expireSession).not.toHaveBeenCalled()
  })

  it.each(['completed', 'fulfillment_failed'])('preserves an intent that advances to %s during cleanup', async status => {
    const state = await preparedAttempt()
    state.retrieveSession.mockResolvedValue({ ...state.session, status: 'expired', url: null })
    state.loadCleanupIntent.mockResolvedValue({ data: { ...state.intent, status, last_error: 'checkout_expired' }, error: null })
    const response = await checkoutPost(state.request({ replacePreviousCheckout: true }))
    expect(await response.json()).toMatchObject({ code: 'checkout_creation_uncertain' })
    expect(response.cookies.get(CHECKOUT_ATTEMPT_COOKIE)).toBeUndefined()
    expect(state.deleteSlug).not.toHaveBeenCalled()
  })

  it.each([
    { origin: 'https://customer.dailyclarity.org', type: 'text/plain', site: 'same-site' },
    { origin: 'https://attacker.example', type: 'text/plain', site: 'cross-site' },
    { origin: 'null', type: 'application/json', site: 'cross-site' },
    { origin: '', type: 'application/json', site: '' },
    { origin: 'https://dailyclarity.org', type: 'application/json', site: 'same-site' },
  ])('rejects cross-origin cookie-selected cancellation before provider reads: %j', async headers => {
    const state = await preparedAttempt()
    const request = state.request({ replacePreviousCheckout: true })
    if (headers.origin) request.headers.set('origin', headers.origin)
    else request.headers.delete('origin')
    request.headers.set('content-type', headers.type)
    if (headers.site) request.headers.set('sec-fetch-site', headers.site)
    const response = await checkoutPost(request)
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ code: 'checkout_origin_invalid' })
    expect(state.loadIntent).not.toHaveBeenCalled()
    expect(state.retrieveSession).not.toHaveBeenCalled()
    expect(state.expireSession).not.toHaveBeenCalled()
    expect(state.deleteSlug).not.toHaveBeenCalled()
    expect(state.createSession).toHaveBeenCalledTimes(1)
  })

})
