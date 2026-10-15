import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

// This diagnostic must never share live PayPal credentials, orders, fulfillment,
// or a configurable API base URL. All money below is sandbox money.
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'
const REQUEST_TIMEOUT_MS = 8_000
const REFERENCE_ID = 'dailyclarity-sandbox-trial'
export const PAYPAL_SANDBOX_AMOUNT = '1.00'
export const PAYPAL_SANDBOX_CURRENCY = 'USD'
export const PAYPAL_SANDBOX_COOKIE = 'dc_paypal_sandbox'
export const PAYPAL_SANDBOX_MAX_AGE = 30 * 60
const COOKIE_PATH = '/api/paypal/sandbox'
const ID_PATTERN = /^[A-Z0-9]{1,36}$/
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export interface PayPalSandboxReceipt {
  orderId: string
  captureId: string
  status: 'COMPLETED'
  amount: '1.00'
  currency: 'USD'
  environment: 'sandbox'
  capturedAt: string
}

export interface PayPalSandboxSession {
  version: 1
  id: string
  issuedAt: number
  order?: { id: string; approvalUrl: string }
  receipt?: PayPalSandboxReceipt
}

export class PayPalSandboxError extends Error {
  constructor(public code: string, message: string, public status = 502) {
    super(message)
    this.name = 'PayPalSandboxError'
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

/** Production redirects require an explicit server-controlled origin. */
export function getPayPalSandboxOrigin(requestUrl?: string): string | null {
  const configured = process.env.PAYPAL_SANDBOX_SITE_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const candidate = configured || (process.env.NODE_ENV !== 'production' ? requestUrl : undefined)
  if (!candidate) return null
  try {
    const url = new URL(candidate)
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (!configured && !loopback) return null
    const localHttp = process.env.NODE_ENV !== 'production'
      && url.protocol === 'http:'
      && loopback
    if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) return null
    return url.origin
  } catch {
    return null
  }
}

function sessionSecret(): string | null {
  const secret = process.env.PAYPAL_SANDBOX_SESSION_SECRET?.trim()
  return secret && secret.length >= 32 ? secret : null
}

export function getPayPalSandboxConfig(requestUrl?: string) {
  const enabled = process.env.PAYPAL_SANDBOX_ENABLED === 'true'
  const configured = Boolean(
    enabled
    && process.env.PAYPAL_SANDBOX_CLIENT_ID?.trim()
    && process.env.PAYPAL_SANDBOX_CLIENT_SECRET?.trim()
    && sessionSecret()
    && getPayPalSandboxOrigin(requestUrl),
  )
  return {
    enabled,
    configured,
    amount: PAYPAL_SANDBOX_AMOUNT,
    currency: PAYPAL_SANDBOX_CURRENCY,
    environment: 'sandbox' as const,
  }
}

export function requirePayPalSandbox(request: Request, mutation = false): string {
  const config = getPayPalSandboxConfig(request.url)
  if (!config.enabled) {
    throw new PayPalSandboxError('sandbox_disabled', 'PayPal Sandbox testing is not enabled.', 503)
  }
  const origin = getPayPalSandboxOrigin(request.url)
  if (!config.configured || !origin) {
    throw new PayPalSandboxError('sandbox_not_configured', 'PayPal Sandbox testing needs server configuration.', 503)
  }
  if (mutation && (
    request.headers.get('origin') !== origin
    || new URL(request.url).origin !== origin
    || request.headers.get('sec-fetch-site') === 'cross-site'
  )) {
    throw new PayPalSandboxError('origin_mismatch', 'Open the sandbox test on its configured website and try again.', 403)
  }
  return origin
}

export function createPayPalSandboxSession(): PayPalSandboxSession {
  return { version: 1, id: randomUUID(), issuedAt: Math.floor(Date.now() / 1_000) }
}

export function signPayPalSandboxSession(session: PayPalSandboxSession): string {
  const secret = sessionSecret()
  if (!secret) throw new PayPalSandboxError('sandbox_not_configured', 'PayPal Sandbox testing needs server configuration.', 503)
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function validApprovalUrl(value: unknown, orderId: string): value is string {
  if (typeof value !== 'string' || value.length > 2_048) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && ['www.sandbox.paypal.com', 'sandbox.paypal.com'].includes(url.hostname)
      && !url.username && !url.password && !url.port && !url.hash
      && ['/checkoutnow', '/webapps/hermes'].includes(url.pathname)
      && url.searchParams.get('token') === orderId
  } catch {
    return false
  }
}

function validReceipt(value: unknown, orderId: string): value is PayPalSandboxReceipt {
  const receipt = record(value)
  return Boolean(receipt
    && receipt.orderId === orderId
    && typeof receipt.captureId === 'string' && ID_PATTERN.test(receipt.captureId)
    && receipt.status === 'COMPLETED'
    && receipt.amount === PAYPAL_SANDBOX_AMOUNT
    && receipt.currency === PAYPAL_SANDBOX_CURRENCY
    && receipt.environment === 'sandbox'
    && typeof receipt.capturedAt === 'string' && Number.isFinite(Date.parse(receipt.capturedAt)))
}

export function verifyPayPalSandboxSession(value: string | undefined | null): PayPalSandboxSession | null {
  const secret = sessionSecret()
  if (!value || value.length > 6_000 || !secret) return null
  const parts = value.split('.')
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0])) return null
  const expected = createHmac('sha256', secret).update(parts[0]).digest('base64url')
  const provided = Buffer.from(parts[1])
  if (provided.length !== expected.length || !timingSafeEqual(provided, Buffer.from(expected))) return null
  try {
    const session = record(JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')))
    const now = Math.floor(Date.now() / 1_000)
    if (!session || session.version !== 1
      || typeof session.id !== 'string' || !SESSION_ID_PATTERN.test(session.id)
      || typeof session.issuedAt !== 'number' || !Number.isSafeInteger(session.issuedAt)
      || session.issuedAt > now + 60 || now - session.issuedAt >= PAYPAL_SANDBOX_MAX_AGE) return null
    const order = record(session.order)
    if (session.order !== undefined && (!order || typeof order.id !== 'string'
      || !ID_PATTERN.test(order.id) || !validApprovalUrl(order.approvalUrl, order.id))) return null
    if (session.receipt !== undefined && (!order || !validReceipt(session.receipt, order.id as string))) return null
    return session as unknown as PayPalSandboxSession
  } catch {
    return null
  }
}

export function readPayPalSandboxSession(request: Request): PayPalSandboxSession | null {
  const matches = (request.headers.get('cookie') || '').split(';')
    .map((part) => part.trim()).filter((part) => part.startsWith(`${PAYPAL_SANDBOX_COOKIE}=`))
  // Reject ambiguous duplicate cookies instead of choosing an attacker-controlled path.
  if (matches.length !== 1) return null
  return verifyPayPalSandboxSession(matches[0].slice(PAYPAL_SANDBOX_COOKIE.length + 1))
}

export function payPalSandboxResponse(
  body: unknown,
  status = 200,
  session?: PayPalSandboxSession | null,
  origin?: string,
): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' })
  if (session !== undefined) {
    const value = session ? signPayPalSandboxSession(session) : ''
    const remaining = session
      ? Math.max(0, PAYPAL_SANDBOX_MAX_AGE - (Math.floor(Date.now() / 1_000) - session.issuedAt))
      : 0
    headers.set('Set-Cookie', `${PAYPAL_SANDBOX_COOKIE}=${value}; Path=${COOKIE_PATH}; Max-Age=${remaining}; HttpOnly; SameSite=Lax${origin?.startsWith('https:') ? '; Secure' : ''}`)
  }
  return Response.json(body, { status, headers })
}

export function payPalSandboxErrorResponse(error: unknown, session?: PayPalSandboxSession, origin?: string): Response {
  const safeError = error instanceof PayPalSandboxError
    ? error
    : new PayPalSandboxError('sandbox_unavailable', 'The sandbox test could not finish. Please try again.')
  // Do not log provider bodies, payer details, cookies, tokens, or environment values.
  if (safeError.status >= 500) console.error('[paypal-sandbox]', safeError.code)
  return payPalSandboxResponse({ error: safeError.message, code: safeError.code }, safeError.status, session, origin)
}

async function paypalRequest(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${PAYPAL_API}${path}`, {
      ...init,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      if (path === '/v1/oauth2/token') {
        throw new PayPalSandboxError('sandbox_authentication_failed', 'PayPal Sandbox could not authenticate. Check the server sandbox credentials.')
      }
      if (response.status === 422 || response.status === 409) {
        throw new PayPalSandboxError('sandbox_order_not_ready', 'PayPal has not completed this sandbox payment. Approve it in PayPal Sandbox, then retry.', 409)
      }
      throw new PayPalSandboxError('sandbox_provider_error', 'PayPal Sandbox is unavailable. Retry this test in a moment.')
    }
    const data = record(await response.json())
    if (!data) throw new Error('Invalid provider response')
    return data
  } catch (error) {
    if (error instanceof PayPalSandboxError) throw error
    throw new PayPalSandboxError('sandbox_network_error', 'PayPal Sandbox did not respond. You can safely retry this test.')
  }
}

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_SANDBOX_CLIENT_ID?.trim()
  const secret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET?.trim()
  if (!id || !secret) throw new PayPalSandboxError('sandbox_not_configured', 'PayPal Sandbox testing needs server configuration.', 503)
  const data = await paypalRequest('/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (typeof data.access_token !== 'string' || !data.access_token) {
    throw new PayPalSandboxError('sandbox_authentication_failed', 'PayPal Sandbox could not authenticate. Check the server sandbox credentials.')
  }
  return data.access_token
}

function requestId(session: PayPalSandboxSession, action: 'create' | 'capture'): string {
  // 34 characters, within PayPal's 38-character idempotency-key budget.
  return `${action === 'create' ? 'cr' : 'ca'}${createHash('sha256').update(`${session.id}:${action}`).digest('hex').slice(0, 32)}`
}

export async function createPayPalSandboxOrder(
  session: PayPalSandboxSession,
  origin: string,
): Promise<NonNullable<PayPalSandboxSession['order']>> {
  if (session.order) return session.order
  const token = await accessToken()
  const data = await paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': requestId(session, 'create'),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: REFERENCE_ID,
        custom_id: session.id,
        description: 'DailyClarity sandbox checkout test - no real money or website purchase',
        amount: { currency_code: PAYPAL_SANDBOX_CURRENCY, value: PAYPAL_SANDBOX_AMOUNT },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'DailyClarity Sandbox Test',
            // A preference only: PayPal still determines guest-card eligibility.
            landing_page: 'GUEST_CHECKOUT',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: `${origin}/paypal-test`,
            cancel_url: `${origin}/paypal-test?cancelled=1`,
          },
        },
      },
    }),
  })
  const links = Array.isArray(data.links) ? data.links.map(record) : []
  const approval = links.find((link) => link?.rel === 'payer-action' || link?.rel === 'approve')
  if (typeof data.id !== 'string' || !ID_PATTERN.test(data.id)
    || !approval || !validApprovalUrl(approval.href, data.id)) {
    throw new PayPalSandboxError('sandbox_invalid_order', 'PayPal Sandbox did not return a valid test checkout link.')
  }
  return { id: data.id, approvalUrl: approval.href }
}

function validatedPurchaseUnit(data: Record<string, unknown>, session: PayPalSandboxSession): Record<string, unknown> {
  const units = Array.isArray(data.purchase_units) ? data.purchase_units : []
  const unit = record(units[0])
  const amount = record(unit?.amount)
  if (data.id !== session.order?.id || data.intent !== 'CAPTURE'
    || units.length !== 1 || !unit || unit.custom_id !== session.id
    || unit.reference_id !== REFERENCE_ID
    || !amount || amount.currency_code !== PAYPAL_SANDBOX_CURRENCY || amount.value !== PAYPAL_SANDBOX_AMOUNT) {
    throw new PayPalSandboxError('sandbox_order_mismatch', 'This sandbox order does not match the test session.', 409)
  }
  return unit
}

function receiptFromOrder(data: Record<string, unknown>, session: PayPalSandboxSession): PayPalSandboxReceipt {
  const unit = validatedPurchaseUnit(data, session)
  const payments = record(unit.payments)
  const captures = Array.isArray(payments?.captures) ? payments.captures : []
  const capture = record(captures[0])
  const amount = record(capture?.amount)
  if (data.status !== 'COMPLETED' || captures.length !== 1 || !capture
    || capture.status !== 'COMPLETED'
    || typeof capture.id !== 'string' || !ID_PATTERN.test(capture.id)
    || !amount || amount.currency_code !== PAYPAL_SANDBOX_CURRENCY || amount.value !== PAYPAL_SANDBOX_AMOUNT) {
    throw new PayPalSandboxError('sandbox_capture_not_completed', 'PayPal has not confirmed a completed USD 1.00 sandbox capture. You can safely retry.', 409)
  }
  return {
    orderId: session.order!.id,
    captureId: capture.id,
    status: 'COMPLETED',
    amount: PAYPAL_SANDBOX_AMOUNT,
    currency: PAYPAL_SANDBOX_CURRENCY,
    environment: 'sandbox',
    capturedAt: typeof capture.create_time === 'string' && Number.isFinite(Date.parse(capture.create_time))
      ? new Date(capture.create_time).toISOString() : new Date().toISOString(),
  }
}

export async function capturePayPalSandboxOrder(session: PayPalSandboxSession, orderId: string): Promise<PayPalSandboxReceipt> {
  if (!session.order || !ID_PATTERN.test(orderId) || orderId !== session.order.id) {
    throw new PayPalSandboxError('sandbox_session_mismatch', 'That order does not belong to this browser test. Start a new sandbox test.', 409)
  }
  if (session.receipt) return session.receipt
  const token = await accessToken()
  const path = `/v2/checkout/orders/${session.order.id}`
  const order = await paypalRequest(path, { headers: { Authorization: `Bearer ${token}` } })
  validatedPurchaseUnit(order, session)
  // Recover a capture whose response was lost without submitting another payment.
  if (order.status === 'COMPLETED') return receiptFromOrder(order, session)
  if (order.status !== 'APPROVED') {
    throw new PayPalSandboxError('sandbox_order_not_approved', 'Approve this test order in PayPal Sandbox before completing it.', 409)
  }
  await paypalRequest(`${path}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': requestId(session, 'capture'),
      Prefer: 'return=representation',
    },
    body: '{}',
  })
  // Read the canonical order after capture: capture response representations can
  // omit intent or purchase-unit amount. No browser parameter proves payment.
  const completed = await paypalRequest(path, { headers: { Authorization: `Bearer ${token}` } })
  return receiptFromOrder(completed, session)
}
