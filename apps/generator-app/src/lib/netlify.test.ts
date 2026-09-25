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

  it.each(['existing', 'new'])('accepts a %s branded site whose URL fields advertise its custom domain', async (mode) => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    vi.stubEnv('PLATFORM_DOMAIN', 'dailyclarity.org')
    const response = {
      id: 'site-branded',
      name: 'platform-calm-co',
      url: 'http://calm-co.dailyclarity.org',
      ssl_url: 'https://calm-co.dailyclarity.org',
      custom_domain: 'calm-co.dailyclarity.org',
      domain_aliases: [],
      default_domain: 'platform-calm-co.netlify.app',
      admin_url: 'https://app.netlify.com/projects/platform-calm-co',
    }
    const fetchMock = vi.fn<typeof fetch>()
    if (mode === 'new') fetchMock.mockResolvedValueOnce(new Response('not found', { status: 404 }))
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(response), { status: mode === 'new' ? 201 : 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(provisionSite('calm-co')).resolves.toMatchObject({
      siteId: 'site-branded', siteUrl: 'https://calm-co.dailyclarity.org', defaultDomain: 'platform-calm-co.netlify.app',
    })
    expect(fetchMock).toHaveBeenCalledTimes(mode === 'new' ? 2 : 1)
  })

  it.each([
    { label: 'wrong name', changed: { name: 'another-site' } },
    { label: 'wrong default domain', changed: { default_domain: 'another-site.netlify.app' } },
    { label: 'missing default identity', changed: { default_domain: undefined } },
    { label: 'unknown advertised URL', changed: { ssl_url: 'https://other-customer.example' } },
    { label: 'wrong branded binding', changed: { custom_domain: 'other-customer.example' } },
    { label: 'no advertised URL', changed: { url: undefined, ssl_url: undefined } },
  ])('rejects $label on existing and newly created branded sites', async ({ changed }) => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    vi.stubEnv('PLATFORM_DOMAIN', 'dailyclarity.org')
    const response = {
      id: 'site-invalid', name: 'platform-calm-co',
      url: 'http://calm-co.dailyclarity.org', ssl_url: 'https://calm-co.dailyclarity.org',
      custom_domain: 'calm-co.dailyclarity.org', domain_aliases: [],
      default_domain: 'platform-calm-co.netlify.app', admin_url: 'https://app.netlify.com/projects/platform-calm-co',
      ...changed,
    }
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 200 }))
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(provisionSite('calm-co')).rejects.toThrow(/already bound to another domain/)
    await expect(provisionSite('calm-co')).rejects.toThrow(/outside the requested domain boundary/)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(String(fetchMock.mock.calls[3][0])).toContain('/sites/site-invalid')
    expect(fetchMock.mock.calls[3][1]).toMatchObject({ method: 'DELETE' })
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

  it.each([
    { status: 200, certificate: null },
    { status: 404, certificate: null },
    { status: 200, certificate: { state: 'issued', domains: ['calm-co.dailyclarity.org'] } },
  ])('requests only missing branded certificates before strict HTTPS verification (%j)', async ({ status, certificate }) => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'site-123', custom_domain: 'calm-co.dailyclarity.org', domain_aliases: [] })))
      .mockResolvedValueOnce(new Response(status === 404 ? 'not found' : JSON.stringify(certificate), { status }))
    if (certificate === null) fetchMock.mockResolvedValueOnce(new Response('null', { status: 200 }))
    fetchMock.mockResolvedValueOnce(new Response('<!doctype html><html>Customer site</html>'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyPublishedSite('https://calm-co.dailyclarity.org', { netlifySiteId: 'site-123', attempts: 1 })).resolves.toBeUndefined()
    const calls = fetchMock.mock.calls
    expect(String(calls[0][0])).toBe('https://api.netlify.com/api/v1/sites/site-123')
    expect(String(calls[1][0])).toBe('https://api.netlify.com/api/v1/sites/site-123/ssl')
    if (certificate === null) expect(calls[2][1]).toMatchObject({ method: 'POST' })
    expect(calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(certificate === null ? 1 : 0)
    expect(String(calls.at(-1)?.[0])).toBe('https://calm-co.dailyclarity.org/')
  })

  it('does not request a certificate for isolated Netlify-owned HTTPS sites', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('<!doctype html><html>Isolated site</html>'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyPublishedSite('https://platform-e2e-calm-co.netlify.app', { netlifySiteId: 'site-123', attempts: 1 })).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refuses certificate requests when the site identity or branded binding differs', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    for (const site of [{ id: 'other-site', custom_domain: 'calm-co.dailyclarity.org' }, { id: 'site-123', custom_domain: 'another.example', domain_aliases: [] }]) {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify(site)))
      vi.stubGlobal('fetch', fetchMock)
      await expect(verifyPublishedSite('https://calm-co.dailyclarity.org', { netlifySiteId: 'site-123', attempts: 1 })).rejects.toThrow(/not bound/)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  })

  it('propagates certificate provisioning failure without declaring the site ready', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'site-123', custom_domain: 'calm-co.dailyclarity.org' })))
      .mockResolvedValueOnce(new Response('null'))
      .mockResolvedValueOnce(new Response('certificate pending', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyPublishedSite('https://calm-co.dailyclarity.org', { netlifySiteId: 'site-123', attempts: 1 })).rejects.toThrow(/provisioning failed \(503\)/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('keeps certificate-pending TLS errors on the retry path', async () => {
    vi.stubEnv('NETLIFY_ACCESS_TOKEN', 'netlify-test-token')
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'site-123', custom_domain: 'calm-co.dailyclarity.org' })))
      .mockResolvedValueOnce(new Response('null'))
      .mockResolvedValueOnce(new Response('null', { status: 200 }))
      .mockRejectedValueOnce(new Error('TLS certificate hostname mismatch'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyPublishedSite('https://calm-co.dailyclarity.org', { netlifySiteId: 'site-123', attempts: 1 })).rejects.toThrow(/did not become reachable over HTTPS/)
    expect(fetchMock).toHaveBeenCalledTimes(4)
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
