import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'

describe('sitemap domain', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const originalPlatformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL
  const originalEnvironment = process.env.DAILYCLARITY_ENVIRONMENT

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXT_PUBLIC_PLATFORM_URL
    delete process.env.DAILYCLARITY_ENVIRONMENT
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
    if (originalEnvironment !== undefined) {
      process.env.DAILYCLARITY_ENVIRONMENT = originalEnvironment
    } else {
      delete process.env.DAILYCLARITY_ENVIRONMENT
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

  it('includes the privacy, terms, and refund policy pages', () => {
    const urls = sitemap().map((entry) => entry.url)

    expect(urls).toContain('https://dailyclarity.org/privacy')
    expect(urls).toContain('https://dailyclarity.org/terms')
    expect(urls).toContain('https://dailyclarity.org/refund-policy')
  })

  it('blocks indexing and omits the sitemap in staging', () => {
    process.env.DAILYCLARITY_ENVIRONMENT = 'staging'

    expect(sitemap()).toEqual([])
    expect(robots()).toEqual({
      rules: [{ userAgent: '*', disallow: '/' }],
    })
  })
})
