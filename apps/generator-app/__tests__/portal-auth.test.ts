import { describe, it, expect, afterEach } from 'vitest'
import {
  createPortalAccessCredentials,
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
  })

  it('hashPortalToken is stable for the same input', () => {
    process.env.PORTAL_TOKEN_SECRET = 'stable'
    const a = hashPortalToken('abc')
    const b = hashPortalToken('abc')
    expect(a).toBe(b)
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
    expect(JSON.stringify(pub)).not.toContain('secret@example.com')
  })
})
