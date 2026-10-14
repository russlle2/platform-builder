import { NextRequest, NextResponse } from 'next/server'
import { bookingKitClientIp, bookingKitDatabase, consumeBookingKitLimit, emailBookingKitLink, issueBookingKitLink, normalizeBookingKitEmail, readBookingKitJson, BOOKING_KIT_PRIVATE_HEADERS } from '@/lib/booking-kit-server'
import { rateLimitByIp } from '@/lib/server-auth'

export const runtime = 'nodejs'
const accepted = { message: 'If an eligible purchase matches that email, a private access link will be sent.' }

export async function POST(req: NextRequest) {
  const json = (body: unknown, status = 202) => NextResponse.json(body, { status, headers: BOOKING_KIT_PRIVATE_HEADERS })
  if (!rateLimitByIp(req, 'booking-kit-recovery', 5, 60 * 60 * 1000)) return json({ error: 'Please try again later.' }, 429)
  let input: unknown
  try { input = await readBookingKitJson(req) } catch { return json(accepted) }
  const email = normalizeBookingKitEmail(input && typeof input === 'object' && 'email' in input ? input.email : null)
  if (!email) return json(accepted)
  try {
    const db = bookingKitDatabase()
    if (!await consumeBookingKitLimit(db, `recover-ip:${bookingKitClientIp(req)}`, 5)) return json({ error: 'Please try again later.' }, 429)
    if (!await consumeBookingKitLimit(db, `recover-email:${email}`, 3)) return json(accepted)
    const { data: orders, error } = await db.from('booking_kit_orders')
      .select('id,purchase_email,access_expires_at').eq('purchase_email', email).eq('state', 'paid')
      .gt('access_expires_at', new Date().toISOString()).order('paid_at', { ascending: false }).limit(25)
    if (error) throw new Error('booking_kit_recovery_lookup_failed')
    for (const order of orders || []) {
      const link = await issueBookingKitLink(db, order.id)
      await emailBookingKitLink(order.purchase_email, link, order.access_expires_at)
    }
  } catch {
    // Do not leak purchase membership, credentials, or email into logs/responses.
    console.error('[booking-kit] recovery delivery unavailable')
  }
  return json(accepted)
}
