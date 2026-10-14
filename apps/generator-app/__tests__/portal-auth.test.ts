import { describe, it, expect, afterEach } from 'vitest'
import {
  createPortalAccessCredentials,
  buildPortalMagicLink,
  hashPortalToken,
  verifyPortalTokenHash,
  toPublicPortalSite,
} from '@/lib/portal-auth'

describe('portal-auth', () => {
  afterEach(() => {
    delete process.env.PORTAL_TOKEN_SECRET
  })

  it('createPortalAccessCredentials returns null without secret', () => {
    expect(createPortalAccessCredentials()).toBeNull()
  })

  it('hashes and verifies tokens with PORTAL_TOKEN_SECRET', () => {
    process.env.PORTAL_TOKEN_SECRET = 'test-portal-secret'
    const creds = createPortalAccessCredentials()
    expect(creds).not.toBeNull()
    expect(creds!.token.length).toBeGreaterThan(20)
    expect(verifyPortalTokenHash(creds!.token, creds!.hash)).toBe(true)
    expect(verifyPortalTokenHash('wrong', creds!.hash)).toBe(false)
    expect(verifyPortalTokenHash(
      creds!.token,
      creds!.hash,
      new Date(Date.now() - 1_000).toISOString(),
    )).toBe(false)
    expect(verifyPortalTokenHash(
      creds!.token,
      creds!.hash,
      new Date(Date.now() + 60_000).toISOString(),
    )).toBe(true)
  })

  it('hashPortalToken is stable for the same input', () => {
    process.env.PORTAL_TOKEN_SECRET = 'stable'
    const a = hashPortalToken('abc')
    const b = hashPortalToken('abc')
    expect(a).toBe(b)
  })

  it('creates stable checkout-bound credentials without exposing the secret', () => {
    process.env.PORTAL_TOKEN_SECRET = 'stable'
    const first = createPortalAccessCredentials('cs_test_123')
    const retry = createPortalAccessCredentials('cs_test_123')
    const other = createPortalAccessCredentials('cs_test_456')

    expect(first).toEqual(retry)
    expect(first?.token).not.toContain('stable')
    expect(other?.token).not.toBe(first?.token)
    expect(verifyPortalTokenHash(first!.token, first!.hash)).toBe(true)
  })

  it('keeps portal bearer credentials out of the request query string', () => {
    process.env.PORTAL_TOKEN_SECRET = 'stable'
    const link = new URL(buildPortalMagicLink('demo-site', 'private-token'))
    expect(link.searchParams.get('slug')).toBe('demo-site')
    expect(link.searchParams.has('token')).toBe(false)
    expect(new URLSearchParams(link.hash.slice(1)).get('token')).toBe('private-token')
  })

  it('toPublicPortalSite omits sensitive data fields', () => {
    const pub = toPublicPortalSite({
      slug: 'demo',
      status: 'active',
      updated_at: '2026-01-01',
      data: {
        site_url: 'https://demo.example.com',
        plan: 'basic',
        niche: 'wellness_coach',
        template: 'foo',
        customerValues: { EMAIL: 'secret@example.com' },
        netlify_site_id: 'nid',
      },
    })
    expect(pub.public.siteUrl).toBe('https://demo.example.com')
    expect(pub).not.toHaveProperty('data')
    expect(pub).not.toHaveProperty('status')
    expect(pub).not.toHaveProperty('updated_at')
    expect(pub.public).not.toHaveProperty('plan')
    expect(JSON.stringify(pub)).not.toContain('secret@example.com')
  })
})
