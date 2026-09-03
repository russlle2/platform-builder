import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTrustedSiteOrigin } from './site-origin'

describe('getTrustedSiteOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses only the configured origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dailyclarity.org/some/path')
    expect(getTrustedSiteOrigin('https://attacker.test')).toBe('https://dailyclarity.org')
  })

  it('fails closed without a production URL', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(getTrustedSiteOrigin('https://attacker.test')).toBeNull()
  })

  it('allows the request URL only during local development', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(getTrustedSiteOrigin('http://localhost:3000/api/checkout')).toBe('http://localhost:3000')
  })
})
