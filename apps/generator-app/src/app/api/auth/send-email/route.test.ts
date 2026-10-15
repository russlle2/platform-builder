import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
const mocks = vi.hoisted(() => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/email', () => ({ sendEmail: mocks.sendEmail }))
const secret = Buffer.alloc(32, 17)

function request(body = JSON.stringify({ user: { email: 'member@example.com' }, email_data: {
  email_action_type: 'magiclink', token_hash: 'a'.repeat(56),
  redirect_to: 'https://dailyclarity-staging.netlify.app/auth/callback?next=%2Fdashboard',
} }), signed = true) {
  const id = 'msg_route_test'
  const timestamp = String(Math.floor(Date.now() / 1000))
  return new Request('https://dailyclarity-staging.netlify.app/api/auth/send-email', { method: 'POST', body, headers: {
    'webhook-id': id, 'webhook-timestamp': timestamp,
    'webhook-signature': signed ? `v1,${createHmac('sha256', secret).update(`${id}.${timestamp}.${body}`).digest('base64')}` : 'v1,AAAA',
  } })
}
beforeEach(() => {
  vi.clearAllMocks()
  const env = {
    SUPABASE_AUTH_EMAIL_HOOK_ENABLED: 'true', SUPABASE_AUTH_EMAIL_HOOK_SECRET: `v1,whsec_${secret.toString('base64')}`,
    DAILYCLARITY_ENVIRONMENT: 'staging', DAILYCLARITY_SUPABASE_PROJECT_REF: 'yuviqftugmasjypkhrpo',
    NEXT_PUBLIC_SUPABASE_URL: 'https://yuviqftugmasjypkhrpo.supabase.co', NEXT_PUBLIC_SITE_URL: 'https://dailyclarity-staging.netlify.app',
    POSTMARK_SERVER_TOKEN: 'fixture-token', EMAIL_FROM_ADDRESS: 'sender@example.com',
  }
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  mocks.sendEmail.mockResolvedValue({ ErrorCode: 0 })
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('Supabase Send Email hook', () => {
  it('accepts a valid raw signed request only after the provider accepts the email', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({})
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@example.com', timeoutMs: 2500, disableTracking: true }))
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('content-type')).toContain('application/json')
  })
  it('verifies the signature before parsing or sending', async () => {
    const response = await POST(request('invalid json with private credential', false))
    expect(response.status).toBe(401)
    expect(await response.text()).not.toContain('private credential')
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })
  it('cannot activate on the shared production project', async () => {
    vi.stubEnv('DAILYCLARITY_ENVIRONMENT', 'production')
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })
  it('does not leak provider-reflected links, tokens, or errors into responses or logs', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnLog = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const infoLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    mocks.sendEmail.mockRejectedValue(new Error('secret-OTP private-token https://private-link.example'))
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('1')
    expect(await response.json()).toEqual({ error: { http_code: 503, message: 'Authentication email delivery failed. Please retry.' } })
    expect(errorLog).not.toHaveBeenCalled()
    expect(warnLog).not.toHaveBeenCalled()
    expect(infoLog).not.toHaveBeenCalled()
  })
  it('returns a JSON client error for signed malformed input without sending', async () => {
    const response = await POST(request('{'))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: { http_code: 400, message: 'Invalid authentication email request.' } })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })
})
