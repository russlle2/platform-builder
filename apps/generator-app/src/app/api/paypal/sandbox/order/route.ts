import {
  createPayPalSandboxOrder,
  createPayPalSandboxSession,
  payPalSandboxErrorResponse,
  payPalSandboxResponse,
  readPayPalSandboxSession,
  requirePayPalSandbox,
  type PayPalSandboxSession,
} from '@/lib/paypal-sandbox'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  let session: PayPalSandboxSession | undefined
  let origin: string | undefined
  try {
    origin = requirePayPalSandbox(request, true)
    session = readPayPalSandboxSession(request) || createPayPalSandboxSession()
    // Deliberately ignore browser-supplied prices, products, and redirect URLs.
    const order = await createPayPalSandboxOrder(session, origin)
    session.order = order
    return payPalSandboxResponse({ orderId: order.id, approvalUrl: order.approvalUrl }, 200, session, origin)
  } catch (error) {
    // Preserve the idempotency identity even if PayPal times out creating an order.
    return payPalSandboxErrorResponse(error, session, origin)
  }
}
