import { NextRequest, NextResponse } from 'next/server'
import { assertBookingKitArtifact, bookingKitDatabase, hashBookingKitToken, BOOKING_KIT_PRIVATE_HEADERS, type BookingKitOrder } from '@/lib/booking-kit-server'
import { rateLimitByIp } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: BOOKING_KIT_PRIVATE_HEADERS })
  if (!rateLimitByIp(req, 'booking-kit-result', 120, 10 * 60 * 1000)) return json({ error: 'Please try again later.' }, 429)
  const token = req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1]
  if (!token) return json({ error: 'This private link is invalid or expired. Recover access using your purchase email.' }, 401)
  try {
    const db = bookingKitDatabase()
    const { data, error } = await db.rpc('read_booking_kit_result', { p_token_hash: hashBookingKitToken(token) })
    if (error) throw new Error('booking_kit_result_unavailable')
    const order = (Array.isArray(data) ? data[0] : data) as BookingKitOrder | undefined
    if (!order) return json({ error: 'This private link is invalid or expired. Recover access using your purchase email.' }, 401)
    if (order.state === 'checkout_pending' || order.state === 'payment_pending') return json({ status: 'payment_pending' }, 202)
    if (order.state !== 'paid' || !order.access_expires_at || Date.parse(order.access_expires_at) <= Date.now()) {
      return json({ error: 'Hosted access is unavailable for this order.' }, 403)
    }
    assertBookingKitArtifact(order)
    return json({ artifact: order.artifact, accessExpiresAt: order.access_expires_at })
  } catch {
    return json({ error: 'Your kit is temporarily unavailable. Please try again.' }, 503)
  }
}
