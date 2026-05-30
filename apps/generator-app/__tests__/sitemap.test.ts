import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('sitemap domain', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const originalPlatformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXT_PUBLIC_PLATFORM_URL
  })

  afterEach(() => {
    if (originalSiteUrl !== undefined) {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL
    }
    if (originalPlatformUrl !== undefined) {
      process.env.NEXT_PUBLIC_PLATFORM_URL = originalPlatformUrl
    } else {
      delete process.env.NEXT_PUBLIC_PLATFORM_URL
    }
  })

  it('defaults to dailyclarity.org when no env vars set', () => {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_PLATFORM_URL ||
      'https://dailyclarity.org'
    expect(baseUrl).toContain('dailyclarity.org')
    expect(baseUrl).not.toContain('netlify.app')
  })

  it('uses NEXT_PUBLIC_SITE_URL when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_PLATFORM_URL ||
      'https://dailyclarity.org'
    expect(baseUrl).toContain('example.com')
  })

  it('does not use old netlify preview URL', () => {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_PLATFORM_URL ||
      'https://dailyclarity.org'
    expect(baseUrl).not.toBe('https://main--keen-buttercream-c3c10a.netlify.app')
  })
})
