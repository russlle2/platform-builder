import { describe, it, expect, afterEach } from 'vitest'
import { requireInternalAdmin, getBearerToken, rateLimitByIp } from '@/lib/server-auth'

// Minimal NextRequest-like mock
function makeReq(headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as unknown as import('next/server').NextRequest
}

describe('server-auth', () => {
  afterEach(() => {
    delete process.env.INTERNAL_ADMIN_TOKEN
  })

  it('getBearerToken extracts from Authorization header', () => {
    const req = makeReq({ authorization: 'Bearer mytoken' })
    expect(getBearerToken(req)).toBe('mytoken')
  })

  it('getBearerToken extracts from x-internal-admin-token', () => {
    const req = makeReq({ 'x-internal-admin-token': 'admintoken' })
    expect(getBearerToken(req)).toBe('admintoken')
  })

  it('getBearerToken returns null when no token present', () => {
    const req = makeReq({})
    expect(getBearerToken(req)).toBeNull()
  })

  it('requireInternalAdmin returns false when env var missing', () => {
    delete process.env.INTERNAL_ADMIN_TOKEN
    expect(requireInternalAdmin(makeReq({ authorization: 'Bearer anything' }))).toBe(false)
  })

  it('requireInternalAdmin returns true with correct token', () => {
    process.env.INTERNAL_ADMIN_TOKEN = 'secret123'
    const req = makeReq({ authorization: 'Bearer secret123' })
    expect(requireInternalAdmin(req)).toBe(true)
  })

  it('requireInternalAdmin returns false with wrong token', () => {
    process.env.INTERNAL_ADMIN_TOKEN = 'secret123'
    const req = makeReq({ authorization: 'Bearer wrong' })
    expect(requireInternalAdmin(req)).toBe(false)
  })

  it('requireInternalAdmin returns false when token length differs', () => {
    process.env.INTERNAL_ADMIN_TOKEN = 'short'
    const req = makeReq({ authorization: 'Bearer toolongtoken' })
    expect(requireInternalAdmin(req)).toBe(false)
  })

  it('rateLimitByIp allows requests within limit', () => {
    const req = makeReq({ 'x-forwarded-for': '1.2.3.4' })
    for (let i = 0; i < 5; i++) {
      expect(rateLimitByIp(req, 'test-key-allow', 5, 60000)).toBe(true)
    }
  })

  it('rateLimitByIp blocks after limit exceeded', () => {
    const req = makeReq({ 'x-forwarded-for': '5.6.7.8' })
    for (let i = 0; i < 3; i++) {
      rateLimitByIp(req, 'test-key-block', 3, 60000)
    }
    expect(rateLimitByIp(req, 'test-key-block', 3, 60000)).toBe(false)
  })
})
