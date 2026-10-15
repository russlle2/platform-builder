import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  capturePayPalSandboxOrder,
  createPayPalSandboxOrder,
  createPayPalSandboxSession,
  getPayPalSandboxConfig,
  getPayPalSandboxOrigin,
  PAYPAL_SANDBOX_COOKIE,
  PAYPAL_SANDBOX_MAX_AGE,
  readPayPalSandboxSession,
  requirePayPalSandbox,
  signPayPalSandboxSession,
  verifyPayPalSandboxSession,
  type PayPalSandboxSession,
} from './paypal-sandbox'
import { GET as configGet } from '@/app/api/paypal/sandbox/config/route'
import { POST as orderPost } from '@/app/api/paypal/sandbox/order/route'
import { POST as capturePost } from '@/app/api/paypal/sandbox/capture/route'
import { GET as receiptGet } from '@/app/api/paypal/sandbox/receipt/route'
import { POST as resetPost } from '@/app/api/paypal/sandbox/reset/route'

const ORIGIN = 'https://dailyclarity.org'
const ORDER_ID = '1AB23456CD789012E'
const CAPTURE_ID = '9FG87654HI321098J'
const APPROVAL_URL = `https://www.sandbox.paypal.com/checkoutnow?token=${ORDER_ID}`
const fetchMock = vi.fn<typeof fetch>()

function request(path: string, options: { method?: string; cookie?: string; body?: unknown; origin?: string | null } = {}): Request {
  const headers = new Headers()
  if (options.cookie) headers.set('cookie', options.cookie)
  if (options.origin !== null) headers.set('origin', options.origin ?? ORIGIN)
  if (options.body !== undefined) headers.set('content-type', 'application/json')
  return new Request(`${ORIGIN}/api/paypal/sandbox/${path}`, {
    method: options.method || 'GET',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
}

function cookie(session: PayPalSandboxSession): string {
  return `${PAYPAL_SANDBOX_COOKIE}=${signPayPalSandboxSession(session)}`
}

function sessionWithOrder(): PayPalSandboxSession {
  return { ...createPayPalSandboxSession(), order: { id: ORDER_ID, approvalUrl: APPROVAL_URL } }
}

function providerOrder(session: PayPalSandboxSession, status = 'APPROVED') {
  return {
    id: ORDER_ID,
    intent: 'CAPTURE',
    status,
    purchase_units: [{
      reference_id: 'dailyclarity-sandbox-trial',
      custom_id: session.id,
      amount: { currency_code: 'USD', value: '1.00' },
      ...(status === 'COMPLETED' ? {
        payments: {
          captures: [{
            id: CAPTURE_ID,
            status: 'COMPLETED',
            amount: { currency_code: 'USD', value: '1.00' },
            create_time: '2026-10-14T00:00:00Z',
          }],
        },
      } : {}),
    }],
  }
}

function respond(...bodies: unknown[]) {
  for (const body of bodies) fetchMock.mockResolvedValueOnce(Response.json(body))
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', ORIGIN)
  vi.stubEnv('PAYPAL_SANDBOX_SITE_URL', '')
  vi.stubEnv('PAYPAL_SANDBOX_ENABLED', 'true')
  vi.stubEnv('PAYPAL_SANDBOX_CLIENT_ID', 'sandbox-client-id')
  vi.stubEnv('PAYPAL_SANDBOX_CLIENT_SECRET', 'sandbox-client-secret')
  vi.stubEnv('PAYPAL_SANDBOX_SESSION_SECRET', 'test-session-signing-secret-with-at-least-32-characters')
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('sandbox configuration and request boundaries', () => {
  it('fails closed unless explicitly enabled and never falls back to live credentials', async () => {
    vi.stubEnv('PAYPAL_SANDBOX_ENABLED', 'false')
    expect(getPayPalSandboxConfig().configured).toBe(false)
    expect((await orderPost(request('order', { method: 'POST' }))).status).toBe(503)
    vi.stubEnv('PAYPAL_SANDBOX_ENABLED', 'true')
    vi.stubEnv('PAYPAL_SANDBOX_CLIENT_SECRET', '')
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'a-live-secret-must-never-work')
    expect(getPayPalSandboxConfig().configured).toBe(false)
    expect((await orderPost(request('order', { method: 'POST' }))).status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires a dedicated sufficiently long signing secret', () => {
    vi.stubEnv('PAYPAL_SANDBOX_SESSION_SECRET', 'too-short')
    vi.stubEnv('PORTAL_TOKEN_SECRET', 'shared-production-secret-must-never-work')
    expect(getPayPalSandboxConfig().configured).toBe(false)
  })

  it('supports a dedicated preview origin and fails closed on an unconfigured production host', () => {
    vi.stubEnv('PAYPAL_SANDBOX_SITE_URL', 'https://sandbox-preview.netlify.app/path')
    expect(getPayPalSandboxOrigin('https://attacker.example')).toBe('https://sandbox-preview.netlify.app')
    vi.stubEnv('PAYPAL_SANDBOX_SITE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(getPayPalSandboxOrigin('https://attacker.example')).toBeNull()
    expect(getPayPalSandboxConfig('https://attacker.example').configured).toBe(false)
  })

  it('only permits local HTTP in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(getPayPalSandboxOrigin('http://localhost:3000/api')).toBe('http://localhost:3000')
    expect(getPayPalSandboxOrigin('https://untrusted.example')).toBeNull()
    vi.stubEnv('PAYPAL_SANDBOX_SITE_URL', 'http://unsafe.example')
    expect(getPayPalSandboxOrigin()).toBeNull()
    vi.stubEnv('PAYPAL_SANDBOX_SITE_URL', 'https://user:password@example.com')
    expect(getPayPalSandboxOrigin()).toBeNull()
  })

  it.each([null, 'https://attacker.example', 'null', `${ORIGIN}.attacker.example`])('rejects mutation Origin %s', async (origin) => {
    const response = await orderPost(request('order', { method: 'POST', origin }))
    expect(response.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a forged request host even with a trusted Origin', () => {
    expect(() => requirePayPalSandbox(new Request('https://attacker.example/api/paypal/sandbox/order', {
      method: 'POST', headers: { Origin: ORIGIN },
    }), true)).toThrow('configured website')
  })

  it('rejects explicit cross-site fetch metadata', () => {
    expect(() => requirePayPalSandbox(new Request(`${ORIGIN}/api/paypal/sandbox/order`, {
      method: 'POST', headers: { Origin: ORIGIN, 'Sec-Fetch-Site': 'cross-site' },
    }), true)).toThrow('configured website')
  })

  it('exposes only public readiness and creates a secure HttpOnly retry cookie', async () => {
    const response = await configGet(request('config'))
    expect(await response.json()).toEqual({ enabled: true, configured: true, environment: 'sandbox', amount: '1.00', currency: 'USD' })
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('set-cookie')).toMatch(/Path=\/api\/paypal\/sandbox; Max-Age=1800; HttpOnly; SameSite=Lax; Secure/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the active order identity on the return-page configuration fetch', async () => {
    const session = sessionWithOrder()
    const response = await configGet(request('config', { cookie: cookie(session) }))
    expect(response.headers.get('set-cookie')?.split(';')[0]).toBe(cookie(session))
  })
})

describe('signed browser session', () => {
  it('rejects tampering, expired sessions, future sessions, and duplicate cookies', () => {
    const session = sessionWithOrder()
    const value = signPayPalSandboxSession(session)
    expect(verifyPayPalSandboxSession(value)).toEqual(session)
    expect(verifyPayPalSandboxSession(`${value}tampered`)).toBeNull()
    const [, signature] = value.split('.')
    const altered = Buffer.from(JSON.stringify({ ...session, id: createPayPalSandboxSession().id })).toString('base64url')
    expect(verifyPayPalSandboxSession(`${altered}.${signature}`)).toBeNull()
    expect(verifyPayPalSandboxSession(signPayPalSandboxSession({ ...session, issuedAt: session.issuedAt - PAYPAL_SANDBOX_MAX_AGE }))).toBeNull()
    expect(verifyPayPalSandboxSession(signPayPalSandboxSession({ ...session, issuedAt: session.issuedAt + 61 }))).toBeNull()
    expect(readPayPalSandboxSession(request('receipt', { cookie: `${cookie(session)}; ${cookie(session)}` }))).toBeNull()
  })

  it('never accepts a signed live approval URL as a sandbox order', () => {
    const session = sessionWithOrder()
    session.order!.approvalUrl = `https://www.paypal.com/checkoutnow?token=${ORDER_ID}`
    expect(verifyPayPalSandboxSession(signPayPalSandboxSession(session))).toBeNull()
  })

  it('clears only the sandbox browser session with a same-origin reset', async () => {
    const denied = await resetPost(request('reset', { method: 'POST', origin: 'https://attacker.example' }))
    expect(denied.status).toBe(403)
    expect(denied.headers.get('set-cookie')).toBeNull()
    const response = await resetPost(request('reset', { method: 'POST' }))
    expect(await response.json()).toEqual({ ok: true })
    expect(response.headers.get('set-cookie')).toContain(`${PAYPAL_SANDBOX_COOKIE}=; Path=/api/paypal/sandbox; Max-Age=0`)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('sandbox order creation', () => {
  it('fixes the sandbox host, amount, intent, ownership, and trusted redirect URLs server-side', async () => {
    const session = createPayPalSandboxSession()
    respond({ access_token: 'sandbox-access-token' }, { id: ORDER_ID, links: [{ rel: 'payer-action', href: APPROVAL_URL }] })
    const response = await orderPost(request('order', {
      method: 'POST', cookie: cookie(session),
      body: { amount: '0.00', currency: 'EUR', returnUrl: 'https://attacker.example', fulfillment: true },
    }))
    expect(await response.json()).toEqual({ orderId: ORDER_ID, approvalUrl: APPROVAL_URL })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
    ])
    const options = fetchMock.mock.calls[1][1]!
    const body = JSON.parse(options.body as string)
    expect(body.intent).toBe('CAPTURE')
    expect(body.purchase_units).toEqual([expect.objectContaining({
      custom_id: session.id,
      reference_id: 'dailyclarity-sandbox-trial',
      amount: { currency_code: 'USD', value: '1.00' },
    })])
    expect(body.payment_source.paypal.experience_context).toMatchObject({
      return_url: `${ORIGIN}/paypal-test`, cancel_url: `${ORIGIN}/paypal-test?cancelled=1`, shipping_preference: 'NO_SHIPPING',
      landing_page: 'GUEST_CHECKOUT', user_action: 'PAY_NOW',
    })
    expect(body.payment_source.paypal).not.toHaveProperty('phone')
    expect(body.purchase_units[0]).not.toHaveProperty('shipping')
    expect(body).not.toHaveProperty('application_context')
    expect(options.redirect).toBe('error')
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it('returns the active order on retry without another provider call', async () => {
    const session = sessionWithOrder()
    const response = await orderPost(request('order', { method: 'POST', cookie: cookie(session) }))
    expect(await response.json()).toEqual({ orderId: ORDER_ID, approvalUrl: APPROVAL_URL })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the same create idempotency key after a timeout and keeps the cookie on failure', async () => {
    const session = createPayPalSandboxSession()
    respond({ access_token: 'token' })
    fetchMock.mockRejectedValueOnce(new Error('ETIMEDOUT private details'))
    const first = await orderPost(request('order', { method: 'POST', cookie: cookie(session) }))
    expect(first.status).toBe(502)
    expect(first.headers.get('set-cookie')?.split(';')[0]).toBe(cookie(session))
    respond({ access_token: 'token' }, { id: ORDER_ID, links: [{ rel: 'approve', href: APPROVAL_URL }] })
    const second = await orderPost(request('order', { method: 'POST', cookie: cookie(session) }))
    expect(second.status).toBe(200)
    const firstHeaders = fetchMock.mock.calls[1][1]!.headers as Record<string, string>
    const secondHeaders = fetchMock.mock.calls[3][1]!.headers as Record<string, string>
    expect(firstHeaders['PayPal-Request-Id']).toBe(secondHeaders['PayPal-Request-Id'])
    expect(firstHeaders['PayPal-Request-Id'].length).toBeLessThanOrEqual(38)
    expect(JSON.stringify(await first.json())).not.toContain('private details')
  })

  it.each([
    `https://www.paypal.com/checkoutnow?token=${ORDER_ID}`,
    `https://www.sandbox.paypal.com.attacker.example/checkoutnow?token=${ORDER_ID}`,
    `https://www.sandbox.paypal.com/checkoutnow?token=OTHERORDER`,
    `http://www.sandbox.paypal.com/checkoutnow?token=${ORDER_ID}`,
    `https://attacker@www.sandbox.paypal.com/checkoutnow?token=${ORDER_ID}`,
  ])('rejects an unsafe approval URL %s', async (href) => {
    respond({ access_token: 'token' }, { id: ORDER_ID, links: [{ rel: 'approve', href }] })
    await expect(createPayPalSandboxOrder(createPayPalSandboxSession(), ORIGIN)).rejects.toThrow('valid test checkout link')
  })

  it('does not return or log provider errors or secrets', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error_description: 'private-provider-secret' }, { status: 401 }))
    const response = await orderPost(request('order', { method: 'POST' }))
    expect(response.status).toBe(502)
    expect(JSON.stringify(await response.json())).not.toContain('private-provider-secret')
    expect(console.error).toHaveBeenCalledWith('[paypal-sandbox]', 'sandbox_authentication_failed')
  })
})

describe('capture verification and receipt recovery', () => {
  it('requires the cookie-bound order, even if a browser reports a successful payment', async () => {
    const noSession = await capturePost(request('capture?token=anything&PayerID=anything&status=COMPLETED', {
      method: 'POST', body: { orderId: ORDER_ID, status: 'COMPLETED' },
    }))
    expect(noSession.status).toBe(409)
    const wrongOrder = await capturePost(request('capture', {
      method: 'POST', cookie: cookie(sessionWithOrder()), body: { orderId: 'DIFFERENTORDER123' },
    }))
    expect(wrongOrder.status).toBe(409)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects oversized and invalid capture bodies before contacting PayPal', async () => {
    const session = sessionWithOrder()
    const oversized = await capturePost(request('capture', { method: 'POST', cookie: cookie(session), body: { orderId: 'x'.repeat(1_025) } }))
    expect(oversized.status).toBe(413)
    const invalid = await capturePost(request('capture', { method: 'POST', cookie: cookie(session), body: [] }))
    expect(invalid.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('captures only the approved server-verified order and stores a receipt after reading its completed capture', async () => {
    const session = sessionWithOrder()
    respond({ access_token: 'token' }, providerOrder(session), { id: ORDER_ID, status: 'COMPLETED' }, providerOrder(session, 'COMPLETED'))
    const response = await capturePost(request('capture', { method: 'POST', cookie: cookie(session), body: { orderId: ORDER_ID } }))
    expect(response.status).toBe(200)
    const receipt = (await response.json()).receipt
    expect(receipt).toEqual({
      orderId: ORDER_ID, captureId: CAPTURE_ID, status: 'COMPLETED', amount: '1.00', currency: 'USD', environment: 'sandbox', capturedAt: '2026-10-14T00:00:00.000Z',
    })
    const storedCookie = response.headers.get('set-cookie')!.split(';')[0]
    const restored = await receiptGet(request('receipt', { cookie: storedCookie }))
    expect(await restored.json()).toEqual({ receipt, orderId: ORDER_ID })
    const retry = await capturePost(request('capture', { method: 'POST', cookie: storedCookie, body: { orderId: ORDER_ID } }))
    expect(await retry.json()).toEqual({ receipt })
    expect(fetchMock).toHaveBeenCalledTimes(4)
    const captureRequest = fetchMock.mock.calls[2]
    expect(captureRequest[0]).toBe(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${ORDER_ID}/capture`)
    expect(captureRequest[1]!.method).toBe('POST')
    expect((captureRequest[1]!.headers as Record<string, string>)['PayPal-Request-Id'].length).toBeLessThanOrEqual(38)
  })

  it('recovers a lost capture response from PayPal without a second capture', async () => {
    const session = sessionWithOrder()
    respond({ access_token: 'token' }, providerOrder(session, 'COMPLETED'))
    expect(await capturePayPalSandboxOrder(session, ORDER_ID)).toMatchObject({ captureId: CAPTURE_ID, status: 'COMPLETED' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/capture'))).toBe(false)
  })

  it('reuses the capture idempotency key on a safe retry after a network failure', async () => {
    const session = sessionWithOrder()
    respond({ access_token: 'token' }, providerOrder(session))
    fetchMock.mockRejectedValueOnce(new Error('timeout'))
    await expect(capturePayPalSandboxOrder(session, ORDER_ID)).rejects.toThrow('safely retry')
    respond({ access_token: 'token' }, providerOrder(session), { id: ORDER_ID }, providerOrder(session, 'COMPLETED'))
    await capturePayPalSandboxOrder(session, ORDER_ID)
    const keys = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/capture'))
      .map(([, init]) => (init!.headers as Record<string, string>)['PayPal-Request-Id'])
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
  })

  it.each(['CREATED', 'PAYER_ACTION_REQUIRED', 'VOIDED'])('does not capture an order with status %s', async (status) => {
    const session = sessionWithOrder()
    respond({ access_token: 'token' }, providerOrder(session, status))
    await expect(capturePayPalSandboxOrder(session, ORDER_ID)).rejects.toThrow('Approve this test order')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each(['order-id', 'intent', 'custom-id', 'reference-id', 'amount', 'currency', 'extra-unit'])('rejects a mismatched provider %s before capture', async (kind) => {
    const session = sessionWithOrder()
    const order = providerOrder(session)
    if (kind === 'order-id') order.id = 'OTHERORDER123456'
    if (kind === 'intent') order.intent = 'AUTHORIZE'
    if (kind === 'custom-id') order.purchase_units[0].custom_id = createPayPalSandboxSession().id
    if (kind === 'reference-id') order.purchase_units[0].reference_id = 'real-checkout'
    if (kind === 'amount') order.purchase_units[0].amount.value = '100.00'
    if (kind === 'currency') order.purchase_units[0].amount.currency_code = 'EUR'
    if (kind === 'extra-unit') order.purchase_units.push({ ...order.purchase_units[0] })
    respond({ access_token: 'token' }, order)
    await expect(capturePayPalSandboxOrder(session, ORDER_ID)).rejects.toThrow('does not match the test session')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each(['pending', 'refunded', 'amount', 'currency', 'missing-capture', 'extra-capture'])('does not issue a receipt for a %s capture', async (kind) => {
    const session = sessionWithOrder()
    const order = providerOrder(session, 'COMPLETED')
    const captures = order.purchase_units[0].payments!.captures
    if (kind === 'pending') captures[0].status = 'PENDING'
    if (kind === 'refunded') captures[0].status = 'REFUNDED'
    if (kind === 'amount') captures[0].amount.value = '0.01'
    if (kind === 'currency') captures[0].amount.currency_code = 'CAD'
    if (kind === 'missing-capture') captures.splice(0)
    if (kind === 'extra-capture') captures.push({ ...captures[0] })
    respond({ access_token: 'token' }, order)
    const response = await capturePost(request('capture', { method: 'POST', cookie: cookie(session), body: { orderId: ORDER_ID } }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'sandbox_capture_not_completed' })
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('returns no receipt from browser parameters or an absent cookie', async () => {
    const response = await receiptGet(request(`receipt?token=${ORDER_ID}&status=COMPLETED`))
    expect(await response.json()).toEqual({ receipt: null, orderId: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('offers only the signed active order ID for interrupted-return recovery', async () => {
    const session = sessionWithOrder()
    const response = await receiptGet(request('receipt', { cookie: cookie(session) }))
    expect(await response.json()).toEqual({ receipt: null, orderId: ORDER_ID })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
