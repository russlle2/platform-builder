import {
  payPalSandboxErrorResponse,
  payPalSandboxResponse,
  readPayPalSandboxSession,
  requirePayPalSandbox,
} from '@/lib/paypal-sandbox'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    requirePayPalSandbox(request)
    const session = readPayPalSandboxSession(request)
    return payPalSandboxResponse({ receipt: session?.receipt || null, orderId: session?.order?.id || null })
  } catch (error) {
    return payPalSandboxErrorResponse(error)
  }
}
