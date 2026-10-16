import { afterEach, expect, it, vi } from 'vitest'
import { sendContactConfirmation, sendEmail, sendOrderConfirmationEmail, sendWebsiteLiveEmail } from './email'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('delivers private account links without tracking redirects and includes usable plain-text links', async () => {
  vi.stubEnv('POSTMARK_SERVER_TOKEN', 'local-fixture')
  vi.stubEnv('EMAIL_FROM_ADDRESS', 'sender@example.test')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://platform.example.test')
  const fetch = vi.fn().mockImplementation(async () => Response.json({ ErrorCode: 0 }))
  vi.stubGlobal('fetch', fetch)
  await sendOrderConfirmationEmail('owner@example.test', 'A & B <Practice>', 'practice', 'private-fixture-token', 'wellness')
  await sendWebsiteLiveEmail('owner@example.test', 'A & B <Practice>', 'practice', 'private-fixture-token', 'https://practice.example.test')
  for (const [, request] of fetch.mock.calls) {
    const message = JSON.parse(request.body)
    expect(message).toMatchObject({ To: 'owner@example.test', TrackOpens: false, TrackLinks: 'None' })
    expect(message.HtmlBody).toContain('A &amp; B &lt;Practice&gt;')
    expect(message.HtmlBody).toContain('https://platform.example.test/help#domains')
    expect(message.HtmlBody).not.toContain('/help/custom-domain')
    expect(message.TextBody).toContain('https://platform.example.test/portal?slug=practice#token=private-fixture-token')
    expect(message.TextBody).toContain('https://platform.example.test/dashboard')
    expect(message.TextBody).toContain('Keep this link private')
  }
  const order = JSON.parse(fetch.mock.calls[0][1].body)
  expect(order.Subject).toBe('Your DailyClarity order and account access')
  expect(order.HtmlBody).not.toMatch(/being built|assembled now|within a few minutes/)
  expect(JSON.parse(fetch.mock.calls[1][1].body).TextBody).toContain('https://practice.example.test')
})

it('keeps the existing 10s timeout and permits a bounded short Auth-hook deadline', async () => {
  vi.stubEnv('POSTMARK_SERVER_TOKEN', 'local-fixture')
  vi.stubEnv('EMAIL_FROM_ADDRESS', 'sender@example.test')
  const timeout = vi.spyOn(AbortSignal, 'timeout')
  const fetch = vi.fn().mockImplementation(async () => Response.json({ ErrorCode: 0 }))
  vi.stubGlobal('fetch', fetch)
  const message = { to: 'recipient@example.test', subject: 'Fixture', htmlBody: '<p>Fixture</p>' }
  await sendEmail(message)
  expect(timeout).toHaveBeenLastCalledWith(10_000)
  await sendEmail({ ...message, timeoutMs: 2_500, disableTracking: true })
  expect(timeout).toHaveBeenLastCalledWith(2_500)
  expect(fetch).toHaveBeenLastCalledWith('https://api.postmarkapp.com/email', expect.objectContaining({ redirect: 'error' }))
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ TrackOpens: false, TrackLinks: 'None' })
  expect(JSON.parse(fetch.mock.calls[1][1].body)).not.toHaveProperty('timeoutMs')
  for (const timeoutMs of [0, -1, 10_001, NaN, Infinity, 2.5]) {
    await expect(sendEmail({ ...message, timeoutMs })).rejects.toThrow('Email timeout')
  }
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('routes replies to a configured mailbox while preserving explicit tenant addresses', async () => {
  vi.stubEnv('POSTMARK_SERVER_TOKEN', 'local-fixture')
  vi.stubEnv('EMAIL_FROM_ADDRESS', 'sender@example.test')
  vi.stubEnv('EMAIL_REPLY_TO_ADDRESS', ' support@example.test ')
  vi.stubEnv('PLATFORM_OWNER_EMAIL', 'owner@example.test')
  const fetch = vi.fn().mockImplementation(async () => Response.json({ ErrorCode: 0 }))
  vi.stubGlobal('fetch', fetch)
  const message = { to: 'recipient@example.test', subject: 'Fixture', htmlBody: '<p>Fixture</p>' }
  await sendEmail(message)
  expect(JSON.parse(fetch.mock.calls.at(-1)![1].body).ReplyTo).toBe('support@example.test')
  for (const invalid of ['********@example.test', 'bad\r\nBcc:other@example.test', 'one@example.test,two@example.test', '<owner@example.test>', 'missing-domain', 'owner@-example.test', 'owner..name@example.test', '.owner@example.test', 'owner@example-' + 'a'.repeat(64) + '.test']) {
    vi.stubEnv('EMAIL_REPLY_TO_ADDRESS', invalid)
    await sendEmail(message)
    expect(JSON.parse(fetch.mock.calls.at(-1)![1].body).ReplyTo).toBe('owner@example.test')
  }
  vi.stubEnv('PLATFORM_OWNER_EMAIL', '')
  await sendEmail(message)
  expect(JSON.parse(fetch.mock.calls.at(-1)![1].body)).not.toHaveProperty('ReplyTo')
  await sendContactConfirmation({ visitorEmail: message.to, visitorName: 'Customer', siteName: 'Tenant', replyTo: 'tenant@example.test' })
  expect(JSON.parse(fetch.mock.calls.at(-1)![1].body).ReplyTo).toBe('tenant@example.test')
})

it('never propagates provider bodies or transport errors into caller logs', async () => {
  vi.stubEnv('POSTMARK_SERVER_TOKEN', 'local-fixture')
  vi.stubEnv('EMAIL_FROM_ADDRESS', 'sender@example.test')
  const privateText = 'private-token https://example.test/auth?token=private-token'
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ ErrorCode: 422, Message: privateText }, { status: 422 }))
    .mockResolvedValueOnce({ ok: true, json: async () => { throw new Error(privateText) } })
    .mockRejectedValueOnce(new Error(privateText))
  vi.stubGlobal('fetch', fetch)
  const log = vi.spyOn(console, 'error')
  const message = { to: 'recipient@example.test', subject: 'Fixture', htmlBody: '<p>Fixture</p>' }
  for (let attempt = 0; attempt < 3; attempt++) {
    await expect(sendEmail(message)).rejects.toThrow(/^Email delivery request failed\.$/)
  }
  expect(log).not.toHaveBeenCalled()
})
