import { createHash, createHmac, randomBytes } from 'node:crypto'
import { isIP } from 'node:net'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { BOOKING_KIT_ACCESS_DAYS, BOOKING_KIT_PRICE_CENTS, type BookingKitArtifact } from './booking-kit-content'
import { isDedicatedSupabaseProjectConfigured } from './stripe-runtime'
import { getTrustedSiteOrigin } from './site-origin'
import { sendEmail } from './email'

export const BOOKING_KIT_LINK_MS = 60 * 60 * 1000
export const BOOKING_KIT_CURRENCY = 'usd'
export const BOOKING_KIT_PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
}

export interface BookingKitOrder {
  id: string
  state: 'checkout_pending' | 'payment_pending' | 'checkout_failed' | 'paid' | 'refunded'
  purchase_email: string
  artifact: BookingKitArtifact
  artifact_version: string
  artifact_hash: string
  stripe_price_id: string
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  amount_cents: number
  currency: string
  paid_at: string | null
  access_expires_at: string | null
  delivery_sent_at: string | null
}

export function bookingKitSalesEnabled(): boolean {
  return process.env.BOOKING_KIT_ENABLED === 'true'
}

export function bookingKitStripeModeAllowed(key: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const mode = /^(?:sk|rk)_(test|live)_/.exec(key)?.[1]
  if (!mode) return false
  if (env.DAILYCLARITY_ENVIRONMENT === 'staging') return mode === 'test'
  if (env.DAILYCLARITY_ENVIRONMENT === 'production' && env.NODE_ENV === 'production') return mode === 'live'
  return env.NODE_ENV !== 'production' && env.DAILYCLARITY_ENVIRONMENT !== 'production' && mode === 'test'
}

export function bookingKitDatabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !isDedicatedSupabaseProjectConfigured()) throw new Error('booking_kit_database_unavailable')
  return createClient(url, key, { auth: { persistSession: false } })
}

export function normalizeBookingKitEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const email = input.trim().toLowerCase()
  return email.length <= 254 && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email) ? email : null
}

export function bookingKitArtifactHash(artifact: unknown): string {
  // Postgres jsonb canonicalizes object key order. Hash recursively sorted keys
  // so a DB round trip cannot invalidate a legitimately saved artifact.
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical)
    if (value && typeof value === 'object') return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]),
    )
    return value
  }
  return createHash('sha256').update(JSON.stringify(canonical(artifact))).digest('hex')
}

export function hashBookingKitToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function bookingKitCredential(now = Date.now()) {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashBookingKitToken(token), expiresAt: new Date(now + BOOKING_KIT_LINK_MS).toISOString() }
}

export function bookingKitLink(token: string, requestUrl?: string): string {
  const origin = getTrustedSiteOrigin(requestUrl)
  if (!origin) throw new Error('booking_kit_origin_unavailable')
  const link = new URL('/booking-kit/result', origin)
  link.hash = new URLSearchParams({ access_token: token }).toString()
  return link.toString()
}

export async function resolveBookingKitPrice(stripe: Stripe): Promise<string> {
  const priceId = process.env.STRIPE_PRICE_BOOKING_KIT?.trim()
  if (!priceId) throw new Error('booking_kit_price_unavailable')
  const price = await stripe.prices.retrieve(priceId)
  if (price.id !== priceId || !price.active || price.type !== 'one_time' || price.currency !== BOOKING_KIT_CURRENCY || price.unit_amount !== BOOKING_KIT_PRICE_CENTS) {
    throw new Error('booking_kit_price_invalid')
  }
  return price.id
}

export function assertBookingKitArtifact(order: BookingKitOrder): void {
  if (!order.artifact || order.artifact.version !== order.artifact_version || bookingKitArtifactHash(order.artifact) !== order.artifact_hash) {
    throw new Error('booking_kit_artifact_integrity')
  }
}

export async function loadBookingKitOrder(db: SupabaseClient, orderId: string): Promise<BookingKitOrder> {
  const { data, error } = await db.from('booking_kit_orders').select('*').eq('id', orderId).maybeSingle()
  if (error || !data) throw new Error('booking_kit_order_unavailable')
  return data as BookingKitOrder
}

export async function issueBookingKitLink(db: SupabaseClient, orderId: string): Promise<string> {
  const credential = bookingKitCredential()
  const { error } = await db.from('booking_kit_access_tokens').insert({
    order_id: orderId, token_hash: credential.hash, expires_at: credential.expiresAt,
  })
  if (error) throw new Error('booking_kit_credential_save_failed')
  return bookingKitLink(credential.token)
}

export async function emailBookingKitLink(email: string, link: string, accessExpiresAt: string): Promise<void> {
  await sendEmail({
    to: email,
    disableTracking: true,
    subject: 'Your DailyClarity Booking Clarity Kit',
    htmlBody: `<p>Your Booking Clarity Kit is ready.</p><p><a href="${link.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">Open your private kit</a></p><p>This private link expires in one hour. Hosted access ends ${accessExpiresAt.slice(0, 10)} (${BOOKING_KIT_ACCESS_DAYS} days after purchase). Request a fresh link from the Booking Kit page using your purchase email. Downloaded copies remain yours to edit.</p>`,
    textBody: `Your Booking Clarity Kit is ready.\n${link}\n\nThis private link expires in one hour. Hosted access ends ${accessExpiresAt.slice(0, 10)}. Request a fresh link from the Booking Kit page using your purchase email. Downloaded copies remain yours to edit.`,
  })
}

/** Atomic database rate limits survive cold starts and parallel instances. */
export async function consumeBookingKitLimit(db: SupabaseClient, key: string, max: number): Promise<boolean> {
  const secret = process.env.PORTAL_TOKEN_SECRET
  if (!secret || secret.length < 32) throw new Error('booking_kit_limit_secret_unavailable')
  const hash = createHmac('sha256', secret).update(`booking-kit:${key}`).digest('hex')
  const { data, error } = await db.rpc('consume_booking_kit_rate_limit', { p_key: hash, p_max: max })
  if (error) throw new Error('booking_kit_rate_limit_unavailable')
  return data === true
}

export function bookingKitClientIp(req: Request): string {
  const value = req.headers.get('x-nf-client-connection-ip') || (
    process.env.NETLIFY !== 'true' ? req.headers.get('x-forwarded-for')?.split(',')[0] : null
  )
  return value && value.length <= 64 && isIP(value.trim()) ? value.trim() : 'unknown'
}

export async function readBookingKitJson(req: Request): Promise<unknown> {
  // Do not allocate an unbounded body before validation.
  const reader = req.body?.getReader()
  if (!reader) throw new Error('invalid_json')
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const next = await reader.read()
    if (next.done) break
    size += next.value.length
    if (size > 16_384) { await reader.cancel(); throw new Error('body_too_large') }
    chunks.push(next.value)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
