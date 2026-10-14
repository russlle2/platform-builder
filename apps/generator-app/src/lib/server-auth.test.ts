import { afterEach, describe, expect, it } from 'vitest'
import { rateLimitByIp } from './server-auth'

describe('server-auth rate-limit identity', () => {
  afterEach(() => {
    delete process.env.NETLIFY
  })

  it('prefers Netlify trusted client IP over spoofable forwarding headers', () => {
    process.env.NETLIFY = 'true'
    const key = `netlify-trust-${crypto.randomUUID()}`
    const first = new Request('https://dailyclarity.org/api/chat', {
      headers: {
        'x-nf-client-connection-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.1',
      },
    })
    const spoofed = new Request('https://dailyclarity.org/api/chat', {
      headers: {
        'x-nf-client-connection-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.2',
      },
    })

    expect(rateLimitByIp(first, key, 1, 60_000)).toBe(true)
    expect(rateLimitByIp(spoofed, key, 1, 60_000)).toBe(false)
  })

  it('collapses invalid Netlify client headers to the fail-closed bucket', () => {
    process.env.NETLIFY = 'true'
    const key = `netlify-invalid-${crypto.randomUUID()}`
    const first = new Request('https://dailyclarity.org/api/chat', {
      headers: { 'x-forwarded-for': 'attacker-controlled-a' },
    })
    const second = new Request('https://dailyclarity.org/api/chat', {
      headers: { 'x-forwarded-for': 'attacker-controlled-b' },
    })

    expect(rateLimitByIp(first, key, 1, 60_000)).toBe(true)
    expect(rateLimitByIp(second, key, 1, 60_000)).toBe(false)
  })
})
