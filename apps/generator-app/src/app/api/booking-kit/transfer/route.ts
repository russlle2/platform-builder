import { NextRequest, NextResponse } from 'next/server'
import { bookingKitDatabase, hashBookingKitToken, BOOKING_KIT_PRIVATE_HEADERS } from '@/lib/booking-kit-server'
import { rateLimitByIp } from '@/lib/server-auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: BOOKING_KIT_PRIVATE_HEADERS })
  if (!rateLimitByIp(req, 'booking-kit-transfer', 30, 60 * 60 * 1000)) return json({ error: 'Please try again later.' }, 429)
  const token = req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1]
  if (!token) return json({ error: 'Private access is required.' }, 401)
  try {
    const { data, error } = await bookingKitDatabase().rpc('record_booking_kit_transfer', { p_token_hash: hashBookingKitToken(token) })
    if (error) return json({ error: 'Measurement temporarily unavailable.' }, 503)
    return data === true ? json({ recorded: true }, 200) : json({ error: 'Private access is required.' }, 401)
  } catch {
    return json({ error: 'Measurement temporarily unavailable.' }, 503)
  }
}
