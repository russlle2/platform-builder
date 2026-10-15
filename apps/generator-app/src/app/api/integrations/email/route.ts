import { NextRequest, NextResponse } from 'next/server'
import { requireInternalAdminOrThrow } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

/** Read-only credential/server check. This does not verify email delivery. */
export async function GET(req: NextRequest) {
  const denied = requireInternalAdminOrThrow(req)
  if (denied) {
    denied.headers.set('Cache-Control', 'private, no-store, max-age=0')
    return denied
  }
  const unavailable = {
    authenticated: false,
    deliveryType: null,
    smtpEnabled: null,
    serverId: null,
    configuredSenderPresent: Boolean(process.env.EMAIL_FROM_ADDRESS?.trim()),
  }
  const headers = { 'Cache-Control': 'private, no-store, max-age=0' }
  const token = process.env.POSTMARK_SERVER_TOKEN?.trim()
  if (!token) return NextResponse.json(unavailable, { status: 503, headers })
  try {
    // GET /server includes ApiTokens. Never return, persist, or log its body.
    const response = await fetch('https://api.postmarkapp.com/server', {
      headers: { Accept: 'application/json', 'X-Postmark-Server-Token': token },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(2_500),
    })
    if (!response.ok) return NextResponse.json(unavailable, { status: 502, headers })
    const server: unknown = await response.json()
    if (!server || typeof server !== 'object' || Array.isArray(server)) {
      return NextResponse.json(unavailable, { status: 502, headers })
    }
    const fields = server as Record<string, unknown>
    if (!Number.isSafeInteger(fields.ID) || (fields.ID as number) <= 0
      || !['Live', 'Sandbox'].includes(String(fields.DeliveryType))
      || typeof fields.DeliveryType !== 'string' || typeof fields.SmtpApiActivated !== 'boolean') {
      return NextResponse.json(unavailable, { status: 502, headers })
    }
    return NextResponse.json({
      authenticated: true, deliveryType: fields.DeliveryType,
      smtpEnabled: fields.SmtpApiActivated, serverId: fields.ID,
      configuredSenderPresent: unavailable.configuredSenderPresent,
    }, { headers })
  } catch {
    return NextResponse.json(unavailable, { status: 502, headers })
  }
}
