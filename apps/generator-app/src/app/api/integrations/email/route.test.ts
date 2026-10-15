import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

const secret = 'test-admin-secret-for-health-only'
const providerSecret = 'private-postmark-test-token'
let fetchMock: ReturnType<typeof vi.fn>
const request = (token = secret) => new NextRequest('https://dailyclarity-staging.netlify.app/api/integrations/email', {
  headers: token ? { authorization: `Bearer ${token}` } : {},
})
const valid = { ID: 123, DeliveryType: 'Live', SmtpApiActivated: false }

beforeEach(() => {
  vi.stubEnv('INTERNAL_ADMIN_TOKEN', secret)
  vi.stubEnv('POSTMARK_SERVER_TOKEN', providerSecret)
  vi.stubEnv('EMAIL_FROM_ADDRESS', 'sender@example.test')
  fetchMock = vi.fn().mockResolvedValue(Response.json(valid))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('requires the actual internal bearer authentication before any provider call', async () => {
  expect((await GET(request(''))).status).toBe(401)
  expect((await GET(request('wrong-token'))).status).toBe(403)
  vi.stubEnv('INTERNAL_ADMIN_TOKEN', '')
  expect((await GET(request())).status).toBe(403)
  expect(fetchMock).not.toHaveBeenCalled()
})

it('returns only validated scalar health fields and never the provider token or response extras', async () => {
  const log = vi.spyOn(console, 'log'), error = vi.spyOn(console, 'error')
  fetchMock.mockResolvedValueOnce(Response.json({ ...valid, ApiTokens: [providerSecret], Name: 'PRIVATE-SERVER', unexpected: { secret } }))
  const result = await GET(request())
  expect(result.status).toBe(200)
  expect(result.headers.get('cache-control')).toContain('no-store')
  expect(await result.json()).toEqual({ authenticated: true, deliveryType: 'Live', smtpEnabled: false, serverId: 123, configuredSenderPresent: true })
  expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled()
  expect(fetchMock).toHaveBeenCalledWith('https://api.postmarkapp.com/server', expect.objectContaining({
    headers: { Accept: 'application/json', 'X-Postmark-Server-Token': providerSecret },
    redirect: 'error', cache: 'no-store', signal: expect.any(AbortSignal),
  }))
})

it('distinguishes sandbox mode and missing sender without claiming delivery', async () => {
  vi.stubEnv('EMAIL_FROM_ADDRESS', ' ')
  fetchMock.mockResolvedValueOnce(Response.json({ ...valid, DeliveryType: 'Sandbox' }))
  expect(await (await GET(request())).json()).toEqual({ authenticated: true, deliveryType: 'Sandbox', smtpEnabled: false, serverId: 123, configuredSenderPresent: false })
})

it('does not contact Postmark when its token is absent', async () => {
  vi.stubEnv('POSTMARK_SERVER_TOKEN', ' ')
  const result = await GET(request())
  expect(result.status).toBe(503)
  expect(await result.json()).toMatchObject({ authenticated: false, deliveryType: null, smtpEnabled: null, serverId: null })
  expect(fetchMock).not.toHaveBeenCalled()
})

it.each([null, [], {}, { ...valid, ID: '123' }, { ...valid, ID: -1 }, { ...valid, ID: 1.5 },
  { ...valid, DeliveryType: 'PRIVATE-UNEXPECTED' }, { ...valid, SmtpApiActivated: 'true' }])(
  'fails closed on a malformed successful provider response %#', async (body) => {
    fetchMock.mockResolvedValueOnce(Response.json(body))
    const result = await GET(request())
    expect(result.status).toBe(502)
    expect(await result.json()).toEqual({ authenticated: false, deliveryType: null, smtpEnabled: null, serverId: null, configuredSenderPresent: true })
  },
)

it('does not parse a rejected provider response or expose raw parse/transport errors', async () => {
  const parse = vi.fn().mockRejectedValue(new Error(providerSecret))
  fetchMock.mockResolvedValueOnce({ ok: false, json: parse })
  expect((await GET(request())).status).toBe(502)
  expect(parse).not.toHaveBeenCalled()
  fetchMock.mockResolvedValueOnce({ ok: true, json: parse })
  expect(await (await GET(request())).text()).not.toContain(providerSecret)
  fetchMock.mockRejectedValueOnce(new Error(providerSecret))
  expect(await (await GET(request())).text()).not.toContain(providerSecret)
})

it('uses a 2.5-second abort deadline and returns only coarse failure on timeout', async () => {
  const controller = new AbortController()
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
  fetchMock.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error(providerSecret)), { once: true })
  }))
  const pending = GET(request())
  controller.abort()
  const result = await pending
  expect(timeout).toHaveBeenCalledWith(2_500)
  expect(result.status).toBe(502)
  expect(await result.json()).toMatchObject({ authenticated: false, deliveryType: null, smtpEnabled: null, serverId: null })
})
