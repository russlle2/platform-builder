import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildDeployFiles: vi.fn(), deploySiteFiles: vi.fn(), verifyPublishedSite: vi.fn(), provisionSite: vi.fn(),
  sendOrderConfirmationEmail: vi.fn(), sendWebsiteLiveEmail: vi.fn(), sendManualServiceAlert: vi.fn(),
}))
vi.mock('@/lib/site-deploy', async (original) => ({
  ...(await original<typeof import('@/lib/site-deploy')>()), buildDeployFiles: mocks.buildDeployFiles,
}))
vi.mock('@/lib/netlify', () => ({
  provisionSite: mocks.provisionSite, deploySiteFiles: mocks.deploySiteFiles, verifyPublishedSite: mocks.verifyPublishedSite,
}))
vi.mock('@/lib/portal-auth', () => ({ createPortalAccessCredentials: () => ({ token: 'portal-token', hash: 'portal-hash' }) }))
vi.mock('@/lib/customer-images', () => ({ migrateImagesToSiteSlug: vi.fn(), rewriteImageSwapUrls: (value: unknown) => value }))
vi.mock('@/lib/email', () => ({
  sendOrderConfirmationEmail: mocks.sendOrderConfirmationEmail,
  sendWebsiteLiveEmail: mocks.sendWebsiteLiveEmail,
  sendManualServiceAlert: mocks.sendManualServiceAlert,
  sendCustomBuildCustomerConfirmation: vi.fn(), sendCustomBuildOwnerAlert: vi.fn(),
}))

import { handleCheckoutCompleted, processStripeEvent } from './stripe-fulfillment-worker'

const SLUG = 'e2e-checkout-site'
const DEFAULT_DOMAIN = `platform-${SLUG}.netlify.app`

function database(
  plan = 'basic',
  initialPortal: Record<string, unknown> | null = null,
  options: { accountEmail?: unknown; publicEmail?: string; legacy?: boolean } = {},
) {
  let portal = initialPortal
  let task: Record<string, unknown> | null = null
  let slugStatus = 'checkout_pending'
  const intent = {
    id: 'intent-1', slug: SLUG, plan,
    email: Object.prototype.hasOwnProperty.call(options, 'accountEmail') ? options.accountEmail : 'buyer@example.com',
    stripe_session_id: 'cs_test_paid',
    payload: {
      niche: 'wellness', template: 'serene',
      customerValues: { BUSINESS_NAME: 'Original Business', EMAIL: options.publicEmail ?? 'buyer@example.com' },
    },
  }
  const builder = (data: () => unknown, apply?: () => void) => {
    const read = async () => { apply?.(); return { data: data(), error: null } }
    const query = {
      eq: vi.fn(() => query), select: vi.fn(() => query),
      maybeSingle: read, single: read,
      then: (resolve: (value: unknown) => unknown) => read().then(resolve),
    }
    return query
  }
  const from = vi.fn((table: string) => {
    if (table === 'checkout_intents') return {
      select: () => builder(() => intent), update: () => builder(() => intent),
    }
    if (table === 'site_slugs') return {
      select: () => builder(() => ({ slug: SLUG, status: slugStatus, reserved_for: options.legacy ? 'cs_test_paid' : intent.id })),
      update: (values: { status: string }) => builder(() => ({ slug: SLUG }), () => { slugStatus = values.status }),
    }
    if (table === 'portal_sites') return { select: () => builder(() => portal ? { data: portal } : null) }
    if (table === 'manual_service_tasks') return {
      upsert: async (values: Record<string, unknown>) => {
        if (!task) task = { id: 'task-1', ...values }
        return { error: null }
      },
      select: () => builder(() => task),
      update: (values: Record<string, unknown>) => builder(() => task, () => { task = { ...task, ...values } }),
    }
    throw new Error(`Unexpected table ${table}`)
  })
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === 'upsert_portal_checkout_state' || name === 'merge_portal_site_data') {
      portal = { ...portal, ...(args.p_data_patch as Record<string, unknown>) }
    }
    return { data: true, error: null }
  })
  return {
    db: { from, rpc } as never, rpc, portal: () => portal, task: () => task, slugStatus: () => slugStatus,
    edit: (patch: Record<string, unknown>) => { portal = { ...portal, ...patch } },
  }
}

function session(plan = 'basic', paymentStatus = 'paid', metadata: Record<string, string> = {}) {
  return {
    id: 'cs_test_paid', created: 1_788_465_600,
    metadata: { checkoutType: 'template_subscription', slug: SLUG, checkoutIntentId: 'intent-1', planKey: plan, ...metadata },
    customer: 'cus_test', subscription: 'sub_test', customer_details: { email: 'buyer@example.com' },
    payment_status: paymentStatus,
    amount_total: paymentStatus === 'no_payment_required' ? 0 : plan === 'basic' ? 2_000 : 8_000,
    currency: 'usd', livemode: false,
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'staging')
  vi.stubEnv('PLATFORM_DOMAIN', 'dailyclarity.org')
  vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
  vi.stubEnv('PLATFORM_OWNER_EMAIL', 'operations@example.com')
  mocks.provisionSite.mockImplementation(async (_slug: string, options: { useNetlifyDefaultDomain: boolean }) => ({
    siteId: 'netlify-site', defaultDomain: DEFAULT_DOMAIN,
    siteUrl: options.useNetlifyDefaultDomain ? `https://${DEFAULT_DOMAIN}` : `https://${SLUG}.dailyclarity.org`,
  }))
  mocks.buildDeployFiles.mockResolvedValue({ 'index.html': '<html></html>' })
  mocks.deploySiteFiles.mockResolvedValue({ deployId: 'deploy-1' })
  mocks.verifyPublishedSite.mockResolvedValue(undefined)
  mocks.sendOrderConfirmationEmail.mockResolvedValue(undefined)
  mocks.sendWebsiteLiveEmail.mockResolvedValue(undefined)
  mocks.sendManualServiceAlert.mockResolvedValue(undefined)
})
afterEach(() => vi.unstubAllEnvs())

describe('real Stripe test-mode fulfillment isolation and delivery retry', () => {
  it('uses the durable private recipient for ownership, orders and delivery while deploying the public address', async () => {
    const state = database('security_ads', null, {
      accountEmail: '  Private.Owner@Example.com  ', publicEmail: 'Public.Contact@Example.com',
    })
    await handleCheckoutCompleted(state.db, session('security_ads'))

    const privateEmail = 'private.owner@example.com'
    expect(mocks.buildDeployFiles).toHaveBeenCalledWith(expect.objectContaining({
      customerValues: { BUSINESS_NAME: 'Original Business', EMAIL: 'Public.Contact@Example.com' },
    }))
    expect(JSON.stringify(mocks.buildDeployFiles.mock.calls)).not.toContain(privateEmail)
    expect(state.portal()).toMatchObject({
      email: privateEmail,
      customerValues: { EMAIL: 'Public.Contact@Example.com' },
    })
    const ownershipWrites = state.rpc.mock.calls.filter(([name]) => name === 'upsert_portal_checkout_state')
    expect(ownershipWrites.length).toBeGreaterThan(0)
    for (const [, args] of ownershipWrites) expect(args.p_owner_email).toBe(privateEmail)
    expect(state.rpc).toHaveBeenCalledWith('upsert_checkout_order', expect.objectContaining({ p_email: privateEmail }))
    expect(state.task()).toMatchObject({ email: privateEmail })
    expect(mocks.sendOrderConfirmationEmail).toHaveBeenCalledWith(privateEmail, 'Original Business', SLUG, 'portal-token', 'wellness')
    expect(mocks.sendWebsiteLiveEmail).toHaveBeenCalledWith(privateEmail, 'Original Business', SLUG, 'portal-token', `https://${DEFAULT_DOMAIN}`)
    expect(mocks.sendManualServiceAlert).toHaveBeenCalledWith(expect.objectContaining({ customerEmail: privateEmail }))
  })

  it('retries customer delivery to the private inbox after a public contact edit without redeploying', async () => {
    const state = database('basic', null, { accountEmail: 'private@example.com', publicEmail: 'public@example.com' })
    mocks.sendWebsiteLiveEmail.mockRejectedValueOnce(new Error('Postmark outage'))
    await expect(handleCheckoutCompleted(state.db, session())).rejects.toThrow('Postmark outage')
    state.edit({ customerValues: { BUSINESS_NAME: 'Edited Business', EMAIL: 'changed-public@example.com' } })
    await handleCheckoutCompleted(state.db, session())

    expect(mocks.buildDeployFiles).toHaveBeenCalledOnce()
    expect(mocks.sendOrderConfirmationEmail).toHaveBeenCalledOnce()
    expect(mocks.sendWebsiteLiveEmail).toHaveBeenCalledTimes(2)
    for (const call of mocks.sendWebsiteLiveEmail.mock.calls) expect(call[0]).toBe('private@example.com')
    expect(state.portal()).toMatchObject({ email: 'private@example.com', customerValues: { EMAIL: 'changed-public@example.com' } })
    expect(state.rpc).toHaveBeenLastCalledWith('merge_portal_site_data', expect.objectContaining({
      p_data_patch: { website_live_sent_at: expect.any(String) },
    }))
    for (const [name, args] of state.rpc.mock.calls) {
      if (name === 'upsert_portal_checkout_state') expect(args.p_owner_email).toBe('private@example.com')
      if (name === 'upsert_checkout_order') expect(args.p_email).toBe('private@example.com')
    }
  })

  it('uses saved public edits during deployment recovery without changing the private recipient', async () => {
    const state = database('basic', null, { accountEmail: 'private@example.com', publicEmail: 'public@example.com' })
    mocks.deploySiteFiles.mockRejectedValueOnce(new Error('Temporary deploy failure'))
    await expect(handleCheckoutCompleted(state.db, session())).rejects.toThrow('Temporary deploy failure')
    state.edit({ customerValues: { BUSINESS_NAME: 'Edited Business', EMAIL: 'changed-public@example.com' } })
    await handleCheckoutCompleted(state.db, session())

    expect(mocks.provisionSite).toHaveBeenCalledOnce()
    expect(mocks.buildDeployFiles).toHaveBeenLastCalledWith(expect.objectContaining({
      customerValues: { BUSINESS_NAME: 'Edited Business', EMAIL: 'changed-public@example.com' },
    }))
    expect(state.portal()).toMatchObject({ email: 'private@example.com', customerValues: { EMAIL: 'changed-public@example.com' } })
    expect(mocks.sendWebsiteLiveEmail.mock.calls[0][0]).toBe('private@example.com')
    expect(mocks.sendOrderConfirmationEmail.mock.calls[0][0]).toBe('private@example.com')
  })

  it.each(['', null, 123, 'invalid'])('fails closed for invalid durable account email %j', async (accountEmail) => {
    const state = database('basic', null, { accountEmail, publicEmail: 'valid-public@example.com' })
    await expect(handleCheckoutCompleted(state.db, session())).rejects.toThrow('Checkout intent account email is invalid.')
    expect(state.rpc).not.toHaveBeenCalled()
    expect(mocks.provisionSite).not.toHaveBeenCalled()
    expect(mocks.buildDeployFiles).not.toHaveBeenCalled()
    expect(mocks.sendOrderConfirmationEmail).not.toHaveBeenCalled()
    expect(mocks.sendWebsiteLiveEmail).not.toHaveBeenCalled()
  })

  it.each([
    ['public@example.com', 'public@example.com'],
    ['', 'buyer@example.com'],
  ])('retains no-intent legacy recipient fallback for public email %j', async (publicEmail, expectedEmail) => {
    const state = database('basic', null, { legacy: true })
    await handleCheckoutCompleted(state.db, session('basic', 'paid', {
      checkoutIntentId: '', template: 'serene', niche: 'wellness',
      customerValues_n: '1',
      customerValues_0: JSON.stringify({ BUSINESS_NAME: 'Legacy Business', EMAIL: publicEmail }),
    }))
    expect(state.portal()).toMatchObject({ email: expectedEmail, customerValues: { EMAIL: publicEmail } })
    expect(state.rpc).toHaveBeenCalledWith('upsert_checkout_order', expect.objectContaining({ p_email: expectedEmail }))
    expect(mocks.sendOrderConfirmationEmail.mock.calls[0][0]).toBe(expectedEmail)
  })

  it('opens managed work and alerts the operator at trial start without inventing a paid invoice', async () => {
    const state = database('security_ads')
    await processStripeEvent(state.db, {} as never, {
      id: 'evt_trial_started', type: 'checkout.session.completed', created: 1_788_465_600,
      livemode: false, data: { object: session('security_ads', 'no_payment_required') },
    } as never)
    expect(state.task()).toMatchObject({ stripe_session_id: 'cs_test_paid', plan: 'security_ads', status: 'open' })
    expect(mocks.sendManualServiceAlert).toHaveBeenCalledOnce()
    expect(mocks.sendOrderConfirmationEmail).toHaveBeenCalledOnce()
    expect(state.rpc).toHaveBeenCalledWith('upsert_checkout_order', expect.objectContaining({ p_amount_cents: 0, p_status: 'trialing' }))
    expect(state.rpc.mock.calls.some(([name]) => name === 'record_order_payment')).toBe(false)
  })

  it('does not provision or open managed work for a still-unpaid checkout', async () => {
    const state = database('security_ads')
    await processStripeEvent(state.db, {} as never, {
      id: 'evt_payment_pending', type: 'checkout.session.completed', created: 1_788_465_600,
      livemode: false, data: { object: session('security_ads', 'unpaid') },
    } as never)
    expect(state.task()).toBeNull()
    expect(state.rpc).not.toHaveBeenCalled()
    expect(mocks.provisionSite).not.toHaveBeenCalled()
    expect(mocks.sendManualServiceAlert).not.toHaveBeenCalled()
  })

  it('provisions staging on Netlify-owned DNS and carries noindex into later portal republishes', async () => {
    const state = database()
    await handleCheckoutCompleted(state.db, session())
    expect(mocks.provisionSite).toHaveBeenCalledWith(SLUG, { useNetlifyDefaultDomain: true })
    expect(mocks.buildDeployFiles).toHaveBeenCalledWith(expect.objectContaining({
      siteUrl: `https://${DEFAULT_DOMAIN}`, allowSearchIndexing: false,
    }))
    expect(state.portal()).toMatchObject({ site_url: `https://${DEFAULT_DOMAIN}`, allowSearchIndexing: false, provisioning_succeeded: true })
    expect(mocks.sendWebsiteLiveEmail).toHaveBeenCalledWith('buyer@example.com', 'Original Business', SLUG, 'portal-token', `https://${DEFAULT_DOMAIN}`)
    expect(mocks.verifyPublishedSite.mock.invocationCallOrder[0]).toBeLessThan(mocks.sendWebsiteLiveEmail.mock.invocationCallOrder[0])
  })

  it('retries a failed owner alert without redeploying, duplicating customer delivery, or losing customer edits', async () => {
    const state = database('security_ads')
    mocks.sendManualServiceAlert.mockRejectedValueOnce(new Error('Postmark outage'))
    await expect(handleCheckoutCompleted(state.db, session('security_ads'))).rejects.toThrow('Postmark outage')
    expect(state.portal()).toMatchObject({ provisioning_succeeded: true, order_confirmation_sent_at: expect.any(String), website_live_sent_at: expect.any(String) })
    expect(state.task()?.id).toBe('task-1')
    state.edit({ customerValues: { BUSINESS_NAME: 'Customer Edited Name' }, inlineEdits: { title: 'Customer edit' } })

    await handleCheckoutCompleted(state.db, session('security_ads'))
    expect(mocks.provisionSite).toHaveBeenCalledOnce()
    expect(mocks.buildDeployFiles).toHaveBeenCalledOnce()
    expect(mocks.deploySiteFiles).toHaveBeenCalledOnce()
    expect(mocks.sendOrderConfirmationEmail).toHaveBeenCalledOnce()
    expect(mocks.sendWebsiteLiveEmail).toHaveBeenCalledOnce()
    expect(mocks.sendManualServiceAlert).toHaveBeenCalledTimes(2)
    expect(state.task()).toMatchObject({ id: 'task-1', details: { owner_alert_sent_at: expect.any(String) } })
    expect(state.slugStatus()).toBe('provisioned')
    expect(state.portal()).toMatchObject({
      customerValues: { BUSINESS_NAME: 'Customer Edited Name' }, inlineEdits: { title: 'Customer edit' },
      allowSearchIndexing: false,
    })
  })

  it('refuses to reuse an existing branded deployment for a staging test', async () => {
    const state = database('basic', {
      stripe_session_id: 'cs_test_paid', checkout_intent_id: 'intent-1',
      netlify_site_id: 'old-site', site_url: 'https://customer.dailyclarity.org',
    })
    await expect(handleCheckoutCompleted(state.db, session())).rejects.toThrow('isolated Netlify default domain')
    expect(mocks.deploySiteFiles).not.toHaveBeenCalled()
    expect(mocks.provisionSite).not.toHaveBeenCalled()
    expect(mocks.sendWebsiteLiveEmail).not.toHaveBeenCalled()
  })

  it('uses saved customer edits when recovering an unsuccessful initial deployment', async () => {
    const state = database('basic', {
      stripe_session_id: 'cs_test_paid', checkout_intent_id: 'intent-1',
      netlify_site_id: 'existing-test-site', site_url: `https://${DEFAULT_DOMAIN}`, netlify_default_domain: DEFAULT_DOMAIN,
      provisioning_succeeded: false, provisioning_error: 'Earlier deploy failed',
      customerValues: { BUSINESS_NAME: 'Edited While Recovering' },
      template: 'untrusted-different-template',
    })
    await handleCheckoutCompleted(state.db, session())
    expect(mocks.provisionSite).not.toHaveBeenCalled()
    expect(mocks.buildDeployFiles).toHaveBeenCalledWith(expect.objectContaining({
      templateSlug: 'serene',
      customerValues: { BUSINESS_NAME: 'Edited While Recovering', EMAIL: 'buyer@example.com' },
      siteUrl: `https://${DEFAULT_DOMAIN}`, allowSearchIndexing: false,
    }))
    expect(state.portal()).toMatchObject({ provisioning_succeeded: true, provisioning_error: null })
    expect(state.slugStatus()).toBe('provisioned')
  })

  it('retains branded DNS and normal indexing for production fulfillment', async () => {
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'production')
    const state = database()
    await handleCheckoutCompleted(state.db, session())
    expect(mocks.provisionSite).toHaveBeenCalledWith(SLUG, { useNetlifyDefaultDomain: false })
    expect(mocks.buildDeployFiles).toHaveBeenCalledWith(expect.objectContaining({
      siteUrl: `https://${SLUG}.dailyclarity.org`, allowSearchIndexing: true,
    }))
  })
})
