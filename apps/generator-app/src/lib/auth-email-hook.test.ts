import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  AUTH_EMAIL_BODY_LIMIT, AuthEmailHookError, authEmailHookConfig, buildAuthEmails,
  readAuthEmailBody, verifyAuthEmailSignature,
} from './auth-email-hook'

const secret = Buffer.alloc(32, 37)
const now = 1_614_265_330_000
const config = {
  secrets: [secret], appOrigin: 'https://dailyclarity-staging.netlify.app',
  supabaseOrigin: 'https://yuviqftugmasjypkhrpo.supabase.co',
}
const env = {
  SUPABASE_AUTH_EMAIL_HOOK_ENABLED: 'true',
  SUPABASE_AUTH_EMAIL_HOOK_SECRET: `v1,whsec_${secret.toString('base64')}`,
  DAILYCLARITY_ENVIRONMENT: 'staging', DAILYCLARITY_SUPABASE_PROJECT_REF: 'yuviqftugmasjypkhrpo',
  NEXT_PUBLIC_SUPABASE_URL: config.supabaseOrigin, NEXT_PUBLIC_SITE_URL: config.appOrigin,
  POSTMARK_SERVER_TOKEN: 'fixture-token', EMAIL_FROM_ADDRESS: 'sender@example.com',
}
function signed(body: string, timestamp = String(now / 1000), key = secret) {
  const id = 'msg_test-123'
  const signature = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
  return new Headers({ 'webhook-id': id, 'webhook-timestamp': timestamp, 'webhook-signature': `v1,${signature}` })
}
function payload(action = 'magiclink', changes: Record<string, unknown> = {}, user: Record<string, unknown> = {}) {
  return Buffer.from(JSON.stringify({
    user: { email: 'member@example.com', user_metadata: { email: 'attacker@example.com' }, ...user },
    email_data: {
      email_action_type: action, token: '123456', token_hash: 'a'.repeat(56),
      site_url: 'https://attacker.example',
      redirect_to: `${config.appOrigin}/auth/callback?next=${encodeURIComponent('/dashboard?site=example')}`,
      ...changes,
    },
  }))
}
function linkFrom(message: { textBody: string }) {
  return new URL(message.textBody.split('\n').find((line) => line.startsWith('https://'))!)
}

describe('Standard Webhooks signature boundary', () => {
  it('matches the independent official Standard Webhooks JavaScript golden vector', () => {
    // https://github.com/standard-webhooks/standard-webhooks/blob/main/libraries/javascript/src/webhook.test.ts
    const headers = new Headers({
      'webhook-id': 'msg_p5jXN8AQM9LWM0D4loKWxJek', 'webhook-timestamp': '1614265330',
      'webhook-signature': 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
    })
    expect(verifyAuthEmailSignature(Buffer.from('{"test": 2432232314}'), headers,
      [Buffer.from('MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw', 'base64')], now)).toBe(true)
  })
  it('authenticates exact raw bytes and all three signed components', () => {
    const body = '{"token":"secret"}'
    const headers = signed(body)
    expect(verifyAuthEmailSignature(Buffer.from(body), headers, [secret], now)).toBe(true)
    expect(verifyAuthEmailSignature(Buffer.from(`${body}\n`), headers, [secret], now)).toBe(false)
    headers.set('webhook-id', 'msg_different')
    expect(verifyAuthEmailSignature(Buffer.from(body), headers, [secret], now)).toBe(false)
  })
  it.each([-301, 301])('rejects a correctly signed timestamp %is outside the freshness window', (offset) => {
    expect(verifyAuthEmailSignature(Buffer.from('{}'), signed('{}', String(now / 1000 + offset)), [secret], now)).toBe(false)
  })
  it.each(['', '1614265330junk', 'Infinity', '-1'])('rejects malformed timestamp %s', (timestamp) => {
    expect(verifyAuthEmailSignature(Buffer.from('{}'), signed('{}', timestamp), [secret], now)).toBe(false)
  })
  it('supports signature and secret rotation without accepting partial or unknown-version signatures', () => {
    const headers = signed('{}')
    const valid = headers.get('webhook-signature')!
    headers.set('webhook-signature', `v2,${'a'.repeat(44)} v1,AAAA ${valid}`)
    expect(verifyAuthEmailSignature(Buffer.from('{}'), headers, [Buffer.alloc(32, 1), secret], now)).toBe(true)
    headers.set('webhook-signature', valid.slice(0, -4))
    expect(verifyAuthEmailSignature(Buffer.from('{}'), headers, [secret], now)).toBe(false)
    headers.set('webhook-signature', valid.replace('v1,', 'v2,'))
    expect(verifyAuthEmailSignature(Buffer.from('{}'), headers, [secret], now)).toBe(false)
  })
})

describe('staging configuration boundary', () => {
  it('accepts two full-length keys for an overlap rotation', () => {
    expect(authEmailHookConfig({ ...env, SUPABASE_AUTH_EMAIL_HOOK_SECRET: `${env.SUPABASE_AUTH_EMAIL_HOOK_SECRET}|v1,whsec_${Buffer.alloc(32, 1).toString('base64')}` })?.secrets).toHaveLength(2)
  })
  it.each([
    ['SUPABASE_AUTH_EMAIL_HOOK_ENABLED', 'false'], ['DAILYCLARITY_ENVIRONMENT', 'production'],
    ['DAILYCLARITY_SUPABASE_PROJECT_REF', 'psxmvaushwsboogfnyqi'],
    ['NEXT_PUBLIC_SUPABASE_URL', 'https://other.supabase.co'],
    ['NEXT_PUBLIC_SITE_URL', 'https://dailyclarity.org'],
    ['POSTMARK_SERVER_TOKEN', ''], ['EMAIL_FROM_ADDRESS', ''],
    ['SUPABASE_AUTH_EMAIL_HOOK_SECRET', 'v1,whsec_c2hvcnQ='],
  ])('fails closed when %s is invalid', (key, value) => {
    expect(authEmailHookConfig({ ...env, [key]: value })).toBeNull()
  })
})

describe('credential email composition', () => {
  it.each(['signup', 'invite', 'magiclink', 'recovery', 'email'])('constructs the %s link from pinned origins and trusted recipient fields', (action) => {
    const [message] = buildAuthEmails(payload(action), config)
    const link = linkFrom(message)
    expect(message.to).toBe('member@example.com')
    expect(message.disableTracking).toBe(true)
    expect(link.origin).toBe(config.supabaseOrigin)
    expect(link.pathname).toBe('/auth/v1/verify')
    expect(link.searchParams.get('type')).toBe(action)
    expect(link.searchParams.get('token')).toBe('a'.repeat(56))
    expect(new URL(link.searchParams.get('redirect_to')!).searchParams.get('next')).toBe('/dashboard?site=example')
    expect(message.htmlBody).not.toContain('attacker.example')
  })
  it('preserves the official asymmetric secure email-change hash mapping', () => {
    const messages = buildAuthEmails(payload('email_change', { token_hash_new: 'b'.repeat(56), token_new: '654321' }, { new_email: 'new@example.com' }), config)
    expect(messages.map((message) => message.to)).toEqual(['member@example.com', 'new@example.com'])
    expect(messages.map((message) => linkFrom(message).searchParams.get('token'))).toEqual(['b'.repeat(56), 'a'.repeat(56)])
  })
  it('sends nonsecure email change only to the new address', () => {
    const messages = buildAuthEmails(payload('email_change', {}, { new_email: 'new@example.com' }), config)
    expect(messages).toHaveLength(1)
    expect(messages[0].to).toBe('new@example.com')
    expect(linkFrom(messages[0]).searchParams.get('token')).toBe('a'.repeat(56))
  })
  it.each(['', undefined])('allows a phone-only account to verify its first email without inventing an old recipient', (currentEmail) => {
    const messages = buildAuthEmails(payload('email_change', { token_hash_new: '', token_hash: `pkce_${'a'.repeat(56)}` }, { email: currentEmail, new_email: 'first@example.com' }), config)
    expect(messages).toHaveLength(1)
    expect(messages[0].to).toBe('first@example.com')
    expect(linkFrom(messages[0]).searchParams.get('token')).toBe(`pkce_${'a'.repeat(56)}`)
    expect(linkFrom(messages[0]).searchParams.get('type')).toBe('email_change')
  })
  it.each(['', undefined, 'bad@example.com,other@example.com'])('rejects secure-change proof without a valid current recipient', (currentEmail) => {
    expect(() => buildAuthEmails(payload('email_change', { token_hash_new: 'b'.repeat(56) }, { email: currentEmail, new_email: 'new@example.com' }), config)).toThrow(AuthEmailHookError)
  })
  it('rejects a malformed current proof and retains notification recipient validation', () => {
    expect(() => buildAuthEmails(payload('email_change', { token_hash_new: false }, { email: '', new_email: 'new@example.com' }), config)).toThrow(AuthEmailHookError)
    expect(() => buildAuthEmails(payload('password_changed_notification', {}, { email: '' }), config)).toThrow(AuthEmailHookError)
    expect(() => buildAuthEmails(payload('email_changed_notification', { old_email: 'bad@example.com,other@example.com' }), config)).toThrow(AuthEmailHookError)
  })
  it('delivers reauthentication as an OTP without inventing a link', () => {
    const [message] = buildAuthEmails(payload('reauthentication'), config)
    expect(message.textBody).toContain('123456')
    expect(message.htmlBody).not.toContain('href=')
  })
  it.each([
    'https://attacker.example/auth/callback', `${config.appOrigin}/other`,
    `${config.appOrigin}/auth/callback?next=/dashboard&next=//evil.example`,
    `${config.appOrigin}/auth/callback?token=secret`, `${config.appOrigin}/auth/callback#credential`,
  ])('rejects an unapproved callback %s', (redirect_to) => {
    expect(() => buildAuthEmails(payload('magiclink', { redirect_to }), config)).toThrow(AuthEmailHookError)
  })
  it('normalizes an unsafe callback next path to the dashboard', () => {
    const [message] = buildAuthEmails(payload('magiclink', { redirect_to: `${config.appOrigin}/auth/callback?next=//evil.example` }), config)
    expect(new URL(linkFrom(message).searchParams.get('redirect_to')!).searchParams.get('next')).toBe('/dashboard')
  })
  it('escapes HTML attributes even when a legitimate internal redirect contains markup', () => {
    const [message] = buildAuthEmails(payload('magiclink', { redirect_to: `${config.appOrigin}/auth/callback?next=${encodeURIComponent('/dashboard?label=<script>"&x=1')}` }), config)
    expect(message.htmlBody).not.toContain('<script>')
    expect(message.htmlBody).toContain('&amp;')
  })
  it.each(['victim@example.com,attacker@example.com', 'Name <member@example.com>', 'member@example.com\r\nBcc:attacker@example.com'])('rejects recipient injection', (address) => {
    expect(() => buildAuthEmails(payload('magiclink', {}, { email: address }), config)).toThrow(AuthEmailHookError)
  })
  it('fails clearly for unknown actions and invalid UTF-8 rather than sending a wrong link', () => {
    expect(() => buildAuthEmails(payload('unknown_notification'), config)).toThrow('This authentication email type is not supported.')
    expect(() => buildAuthEmails(Buffer.from([0xff]), config)).toThrow('Invalid authentication email request.')
  })
})

describe('shared production Auth compatibility opt-in', () => {
  const productionEnv = {
    ...env, DAILYCLARITY_ENVIRONMENT: 'production', DAILYCLARITY_SUPABASE_PROJECT_REF: 'psxmvaushwsboogfnyqi',
    NEXT_PUBLIC_SUPABASE_URL: 'https://psxmvaushwsboogfnyqi.supabase.co', NEXT_PUBLIC_SITE_URL: 'https://dailyclarity.org',
  }
  const productionConfig = authEmailHookConfig({ ...productionEnv, SUPABASE_AUTH_EMAIL_HOOK_SHARED_PROJECT_REVIEWED: 'true' })!
  it('requires an explicit shared-consumer review independently of the enable flag', () => {
    expect(authEmailHookConfig(productionEnv)).toBeNull()
    expect(productionConfig).toMatchObject({ allowProductionCallbacks: true, supabaseOrigin: productionEnv.NEXT_PUBLIC_SUPABASE_URL })
  })
  it.each(['dailyclarity.org', 'hvac.dailyclarity.org', 'legal.dailyclarity.org', 'dental.dailyclarity.org', 'consumer-site.netlify.app'])('preserves the existing approved %s callback destination', (hostname) => {
    const redirect_to = `https://${hostname}/auth/callback?next=%2Fdashboard`
    const [message] = buildAuthEmails(payload('magiclink', { redirect_to }), productionConfig)
    const link = linkFrom(message)
    expect(link.origin).toBe(productionEnv.NEXT_PUBLIC_SUPABASE_URL)
    expect(link.searchParams.get('redirect_to')).toBe(redirect_to)
  })
  it.each([
    'http://localhost:3000', 'https://dailyclarity.org.evil.example/auth/callback',
    'https://other.dailyclarity.org/auth/callback', 'https://nested.site.netlify.app/auth/callback',
    'https://netlify.app/auth/callback', 'http://consumer.netlify.app/auth/callback',
    'https://consumer.netlify.app:8443/auth/callback', 'https://user:password@dailyclarity.org/auth/callback',
    'https://dailyclarity.org/other', 'https://dailyclarity.org/?next=/dashboard',
  ])('rejects a destination outside the reviewed boundary: %s', (redirect_to) => {
    expect(() => buildAuthEmails(payload('magiclink', { redirect_to }), productionConfig)).toThrow(AuthEmailHookError)
  })
  it.each(['https://dailyclarity.org', 'https://dailyclarity.org/'])('converts only the exact configured site base to its canonical callback', (redirect_to) => {
    const [message] = buildAuthEmails(payload('magiclink', { redirect_to }), productionConfig)
    expect(linkFrom(message).searchParams.get('redirect_to')).toBe('https://dailyclarity.org/auth/callback')
  })
  it.each(['password_changed_notification', 'phone_changed_notification', 'identity_linked_notification', 'identity_unlinked_notification', 'mfa_factor_enrolled_notification', 'mfa_factor_unenrolled_notification'])('sends a static %s notification without credential links or untrusted metadata', (action) => {
    const [message] = buildAuthEmails(payload(action, { provider: '<script>evil</script>' }), productionConfig)
    expect(message.to).toBe('member@example.com')
    expect(message.htmlBody).not.toContain('href=')
    expect(message.htmlBody).not.toContain('<script>')
    expect(message.textBody).not.toContain('123456')
    expect(message.textBody).toContain('contact support immediately')
    expect(message.textBody).not.toContain('ignore it')
  })
  it('sends email-changed security notification to the signed old address, as Supabase does', () => {
    const [message] = buildAuthEmails(payload('email_changed_notification', { old_email: 'old@example.com' }), productionConfig)
    expect(message.to).toBe('old@example.com')
    expect(() => buildAuthEmails(payload('email_changed_notification'), productionConfig)).toThrow(AuthEmailHookError)
  })
})

describe('raw request budget', () => {
  it('enforces the actual stream limit even without Content-Length', async () => {
    await expect(readAuthEmailBody(new Request('https://example.com', { method: 'POST', body: 'x'.repeat(AUTH_EMAIL_BODY_LIMIT + 1) }))).rejects.toMatchObject({ status: 413 })
  })
  it('preserves original whitespace bytes', async () => {
    expect(Buffer.from(await readAuthEmailBody(new Request('https://example.com', { method: 'POST', body: '{ "x": 1 }\n' }))).toString()).toBe('{ "x": 1 }\n')
  })
})
