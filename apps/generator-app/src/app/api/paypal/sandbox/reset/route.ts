import {
  payPalSandboxErrorResponse,
  payPalSandboxResponse,
  requirePayPalSandbox,
} from '@/lib/paypal-sandbox'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const origin = requirePayPalSandbox(request, true)
    return payPalSandboxResponse({ ok: true }, 200, null, origin)
  } catch (error) {
    return payPalSandboxErrorResponse(error)
  }
}
