import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCustomDomainInstructions,
  getDomainDnsRecords,
  provisionSite,
  setCustomDomain,
  verifyPublishedSite,
} from './netlify'

describe('published Netlify site verification', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns the promised branded hostname instead of Netlify fallback SSL', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    vi.stubEnv('PLATFORM_DOMAIN', 'dailyclarity.org')
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: 'site-123',
      name: 'platform-calm-co',
      ssl_url: 'https://platform-calm-co.netlify.app',
      url: 'http://platform-calm-co.netlify.app',
      custom_domain: 'calm-co.dailyclarity.org',
      default_domain: 'platform-calm-co.netlify.app',
      admin_url: 'https://app.netlify.com/sites/platform-calm-co',
    }), { status: 201 })))

    await expect(provisionSite('calm-co')).resolves.toMatchObject({
      siteUrl: 'https://calm-co.dailyclarity.org',
      subdomain: 'calm-co.dailyclarity.org',
      defaultDomain: 'platform-calm-co.netlify.app',
    })
  })

  it('creates a deterministic site only after confirming no reusable site exists', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    vi.stubEnv('PLATFORM_DOMAIN', 'dailyclarity.org')
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'site-created',
        name: 'platform-calm-co',
        ssl_url: 'https://platform-calm-co.netlify.app',
        url: 'http://platform-calm-co.netlify.app',
        custom_domain: 'calm-co.dailyclarity.org',
        default_domain: 'platform-calm-co.netlify.app',
        admin_url: 'https://app.netlify.com/sites/platform-calm-co',
      }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(provisionSite('calm-co')).resolves.toMatchObject({ siteId: 'site-created' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      name: 'platform-calm-co',
      custom_domain: 'calm-co.dailyclarity.org',
    })
  })

  it('keeps staging test sites on Netlify-owned DNS', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'site-created',
        name: 'platform-e2e-calm-co',
        ssl_url: 'https://platform-e2e-calm-co.netlify.app',
        url: 'http://platform-e2e-calm-co.netlify.app',
        custom_domain: null,
        default_domain: 'platform-e2e-calm-co.netlify.app',
        admin_url: 'https://app.netlify.com/sites/platform-e2e-calm-co',
      }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(provisionSite('e2e-calm-co', { useNetlifyDefaultDomain: true }))
      .resolves.toMatchObject({
        siteUrl: 'https://platform-e2e-calm-co.netlify.app',
        subdomain: 'platform-e2e-calm-co.netlify.app',
        defaultDomain: 'platform-e2e-calm-co.netlify.app',
      })
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      name: 'platform-e2e-calm-co',
    })
  })

  it('safely reuses an existing Netlify-only staging test site', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: 'site-existing',
      name: 'platform-e2e-calm-co',
      ssl_url: 'https://platform-e2e-calm-co.netlify.app',
      url: 'http://platform-e2e-calm-co.netlify.app',
      custom_domain: null,
      domain_aliases: [],
      default_domain: 'platform-e2e-calm-co.netlify.app',
      admin_url: 'https://app.netlify.com/sites/platform-e2e-calm-co',
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(provisionSite('e2e-calm-co', { useNetlifyDefaultDomain: true }))
      .resolves.toMatchObject({
        siteId: 'site-existing',
        siteUrl: 'https://platform-e2e-calm-co.netlify.app',
      })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('derives the documented Netlify hostname when default_domain is omitted', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'site-created',
        name: 'platform-e2e-calm-co',
        ssl_url: 'https://platform-e2e-calm-co.netlify.app',
        url: 'http://platform-e2e-calm-co.netlify.app',
        custom_domain: null,
        domain_aliases: [],
        admin_url: 'https://app.netlify.com/sites/platform-e2e-calm-co',
      }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(provisionSite('e2e-calm-co', { useNetlifyDefaultDomain: true }))
      .resolves.toMatchObject({
        siteId: 'site-created',
        siteUrl: 'https://platform-e2e-calm-co.netlify.app',
        defaultDomain: 'platform-e2e-calm-co.netlify.app',
      })
  })

  it('refuses to reuse a staging test site with a custom alias or wrong default domain', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    const aliasedSite = {
      id: 'site-existing',
      name: 'platform-e2e-calm-co',
      ssl_url: 'https://platform-e2e-calm-co.netlify.app',
      url: 'http://platform-e2e-calm-co.netlify.app',
      custom_domain: null,
      domain_aliases: ['customer.example'],
      default_domain: 'platform-e2e-calm-co.netlify.app',
      admin_url: 'https://app.netlify.com/sites/platform-e2e-calm-co',
    }
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(aliasedSite), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ...aliasedSite,
        domain_aliases: [],
        default_domain: 'different-site.netlify.app',
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(provisionSite('e2e-calm-co', { useNetlifyDefaultDomain: true }))
      .rejects.toThrow(/another domain/)
    await expect(provisionSite('e2e-calm-co', { useNetlifyDefaultDomain: true }))
      .rejects.toThrow(/another domain/)
  })

  it('deletes a newly created site when its returned domain boundary is invalid', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'site-created',
        name: 'platform-e2e-calm-co',
        ssl_url: 'https://customer.example',
        url: 'http://platform-e2e-calm-co.netlify.app',
        custom_domain: 'customer.example',
        domain_aliases: [],
        admin_url: 'https://app.netlify.com/sites/platform-e2e-calm-co',
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(provisionSite('e2e-calm-co', { useNetlifyDefaultDomain: true }))
      .rejects.toThrow(/outside the requested domain boundary/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[2][0])).toContain('/sites/site-created')
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'DELETE' })
  })

  it('retries the branded HTTPS endpoint until deployed HTML is served', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('not ready', { status: 503 }))
      .mockResolvedValueOnce(new Response('<!doctype html><html></html>', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(verifyPublishedSite('https://calm-co.dailyclarity.org', {
      attempts: 2,
      delayMs: 0,
      timeoutMs: 1_000,
      cacheKey: 'deploy-123',
    })).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0][0])).toContain('__dc_verify=deploy-123')
  })

  it('rejects fallback HTTP URLs and non-HTML success responses', async () => {
    await expect(verifyPublishedSite('http://platform-calm-co.netlify.app'))
      .rejects.toThrow(/HTTPS/)

    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    ))
    await expect(verifyPublishedSite('https://calm-co.dailyclarity.org', {
      attempts: 1,
      timeoutMs: 1_000,
    })).rejects.toThrow(/non-HTML/)
  })
})

describe('custom-domain DNS records', () => {
  it('promotes a customer domain while retaining the branded hostname alias', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ssl_url: 'https://www.customer.example',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await setCustomDomain('site-123', 'www.customer.example', ['calm-co.dailyclarity.org'])

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      custom_domain: 'www.customer.example',
      domain_aliases: ['calm-co.dailyclarity.org'],
    })
  })

  it('replaces aliases instead of retaining a superseded customer domain', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ssl_url: 'https://new.customer.example',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await setCustomDomain('site-123', 'new.customer.example', ['calm-co.dailyclarity.org'])

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      custom_domain: 'new.customer.example',
      domain_aliases: ['calm-co.dailyclarity.org'],
    })
  })

  it('distinguishes root domains from arbitrary subdomains using the public suffix list', () => {
    const dotCom = getDomainDnsRecords('example.com', 'https://site.netlify.app')
    expect(dotCom.isApexDomain).toBe(true)
    expect(dotCom.records).toContainEqual(expect.objectContaining({ type: 'A', name: '@' }))

    const dotUk = getDomainDnsRecords('example.co.uk', 'https://site.netlify.app')
    expect(dotUk.isApexDomain).toBe(true)
    expect(dotUk.records).toContainEqual(expect.objectContaining({ type: 'A', name: '@' }))

    expect(getDomainDnsRecords('shop.example.com', 'https://site.netlify.app')).toMatchObject({
      isApexDomain: false,
      records: [expect.objectContaining({ type: 'CNAME', name: 'shop' })],
    })
  })

  it('emits a bare CNAME target rather than an unusable URL', () => {
    expect(getCustomDomainInstructions('shop.example.com', 'https://site.netlify.app'))
      .toContain('Value: site.netlify.app')
  })
})
