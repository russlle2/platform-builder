import {
  createPayPalSandboxSession,
  getPayPalSandboxConfig,
  getPayPalSandboxOrigin,
  payPalSandboxResponse,
  readPayPalSandboxSession,
} from '@/lib/paypal-sandbox'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Expose readiness, never credentials. Seed the retry identity before checkout. */
export async function GET(request: Request) {
  const config = getPayPalSandboxConfig(request.url)
  const session = config.configured
    ? readPayPalSandboxSession(request) || createPayPalSandboxSession()
    : undefined
  return payPalSandboxResponse(config, 200, session, getPayPalSandboxOrigin(request.url) || undefined)
}
