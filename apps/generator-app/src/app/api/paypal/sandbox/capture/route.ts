import { readBoundedJson } from '@/lib/bounded-json'
import {
  capturePayPalSandboxOrder,
  PayPalSandboxError,
  payPalSandboxErrorResponse,
  payPalSandboxResponse,
  readPayPalSandboxSession,
  requirePayPalSandbox,
} from '@/lib/paypal-sandbox'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const origin = requirePayPalSandbox(request, true)
    const session = readPayPalSandboxSession(request)
    if (!session?.order) {
      throw new PayPalSandboxError('sandbox_session_expired', 'This browser test has expired. Start a new sandbox test.', 409)
    }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      throw new PayPalSandboxError('invalid_request', 'Send the sandbox order as JSON.', 415)
    }
    const parsed = await readBoundedJson(request, 1_024)
    if (!parsed.ok) {
      throw new PayPalSandboxError('invalid_request', 'Invalid sandbox order request.', parsed.reason === 'too_large' ? 413 : 400)
    }
    const body = parsed.value
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || !('orderId' in body) || typeof body.orderId !== 'string') {
      throw new PayPalSandboxError('invalid_request', 'A sandbox order ID is required.', 400)
    }
    const receipt = await capturePayPalSandboxOrder(session, body.orderId)
    session.receipt = receipt
    return payPalSandboxResponse({ receipt }, 200, session, origin)
  } catch (error) {
    return payPalSandboxErrorResponse(error)
  }
}
