import crypto from 'node:crypto'

// The host-only prefix prevents a customer-controlled sibling subdomain from
// planting a checkout capability on the platform. Local HTTP development uses
// a separate name; deployed cookies always use Secure and Path=/ as required.
export const CHECKOUT_ATTEMPT_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Host-dc_checkout_attempt' : 'dc_checkout_attempt_dev'
export const CHECKOUT_ATTEMPT_MAX_AGE = 24 * 60 * 60
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const DOMAIN = 'dailyclarity:checkout-resume:v1:'

function signature(payload: string): string | null {
  const secret = process.env.PORTAL_TOKEN_SECRET
  return secret ? crypto.createHmac('sha256', secret).update(DOMAIN + payload).digest('base64url') : null
}

export function createCheckoutAttempt(intentId: string, now = Date.now()): string | null {
  if (!UUID.test(intentId)) return null
  const payload = `v1.${intentId}.${Math.floor(now / 1000)}`
  const signed = signature(payload)
  return signed ? `${payload}.${signed}` : null
}

export function verifyCheckoutAttempt(value: string | undefined, now = Date.now()): string | null {
  if (!value || value.length > 160) return null
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const [version, id, issued, provided] = parts
  if (version !== 'v1' || !UUID.test(id) || !/^\d{10}$/.test(issued)) return null
  const age = Math.floor(now / 1000) - Number(issued)
  if (age < -60 || age >= CHECKOUT_ATTEMPT_MAX_AGE) return null
  const expected = signature(parts.slice(0, 3).join('.'))
  if (!expected) return null
  const a = Buffer.from(provided), b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? id : null
}

export interface ExistingCheckoutIntent {
  id: string
  slug: string
  plan: string
  email: string
  payload: unknown
  status: string
  stripe_session_id: string | null
}

export interface ResumableStripeSession {
  id: string
  status: string | null
  mode: string
  livemode: boolean
  payment_status: string
  url: string | null
  client_reference_id: string | null
  metadata: Record<string, string> | null
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]),
  )
  return value
}

export function inspectCheckoutAttempt(
  intent: ExistingCheckoutIntent,
  session: ResumableStripeSession,
  requested: { plan: string; accountEmail: string; explicitSlug: string | null; payload: unknown },
  expectedLivemode: boolean | null,
): 'open' | 'complete' | 'expired' | 'changed' | 'uncertain' {
  if (expectedLivemode === null || session.id !== intent.stripe_session_id || session.mode !== 'subscription'
    || session.livemode !== expectedLivemode || session.client_reference_id !== intent.id
    || session.metadata?.checkoutType !== 'template_subscription'
    || session.metadata.checkoutIntentId !== intent.id || session.metadata.slug !== intent.slug
    || session.metadata.planKey !== intent.plan) return 'uncertain'
  // A completed zero-dollar trial is already a subscription, not another
  // opportunity to create one. Resolve it before comparing edited draft data.
  if (session.status === 'complete') return 'complete'
  if (session.status === 'expired' && session.payment_status !== 'paid') return 'expired'
  if (session.status !== 'open' || session.payment_status === 'paid'
    || !['pending', 'session_created'].includes(intent.status)) return 'uncertain'
  if (intent.plan !== requested.plan || intent.email !== requested.accountEmail
    || (requested.explicitSlug !== null && intent.slug !== requested.explicitSlug)
    || JSON.stringify(canonical(intent.payload)) !== JSON.stringify(canonical(requested.payload))) return 'changed'
  try {
    const url = new URL(session.url || '')
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) return 'uncertain'
  } catch { return 'uncertain' }
  return 'open'
}
