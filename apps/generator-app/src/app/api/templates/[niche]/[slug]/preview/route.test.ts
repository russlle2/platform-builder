import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const registry = vi.hoisted(() => ({
  getTemplate: vi.fn(),
  hydrateTemplate: vi.fn(),
  readTemplateFile: vi.fn(),
}))

vi.mock('@/lib/templates/niche-registry', () => registry)

import { POST } from './route'

const params = { params: Promise.resolve({ niche: 'aromatherapy', slug: 'calm' }) }

function request(body: BodyInit | null, ip: string, headers: HeadersInit = {}): NextRequest {
  return new NextRequest('https://dailyclarity.test/api/templates/aromatherapy/calm/preview', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
      ...headers,
    },
    body,
  })
}

describe('template preview route', () => {
  beforeEach(() => {
    vi.stubEnv('NETLIFY', '')
    registry.getTemplate.mockResolvedValue({
      pages: ['index.html'],
      fields: ['BUSINESS_NAME', 'TAGLINE'],
    })
    registry.readTemplateFile.mockImplementation(
      async (_niche: string, _slug: string, page: string) => (
        page === 'index.html' ? '<h1>{{BUSINESS_NAME}}</h1>' : 'body {}'
      ),
    )
    registry.hydrateTemplate.mockImplementation(
      (html: string, values: Record<string, string>) => `${html}:${JSON.stringify(values)}`,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('sanitizes values and marks personalized output private', async () => {
    const response = await POST(request(JSON.stringify({
      values: {
        BUSINESS_NAME: 'Daily\0Clarity',
        TAGLINE: 'x'.repeat(6_000),
        'unsafe-key!': 'discard me',
        NOT_A_STRING: 42,
      },
    }), '198.51.100.10'), params)

    expect(response.status).toBe(200)
    expect(registry.hydrateTemplate).toHaveBeenCalledWith(
      '<h1>{{BUSINESS_NAME}}</h1>',
      {
        BUSINESS_NAME: 'DailyClarity',
        TAGLINE: 'x'.repeat(5_000),
      },
      ['BUSINESS_NAME', 'TAGLINE'],
    )
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('netlify-cdn-cache-control')).toBe('no-store')
  })

  it('rejects declared and actually oversized bodies', async () => {
    const declared = await POST(request('{}', '198.51.100.11', {
      'content-length': '256001',
    }), params)
    const actual = await POST(request(JSON.stringify({
      values: { TAGLINE: 'x'.repeat(256_000) },
    }), '198.51.100.12'), params)

    expect(declared.status).toBe(413)
    expect(actual.status).toBe(413)
    expect(registry.getTemplate).not.toHaveBeenCalled()
  })

  it('rejects malformed and non-object JSON', async () => {
    const malformed = await POST(request('{', '198.51.100.13'), params)
    const array = await POST(request('[]', '198.51.100.14'), params)

    expect(malformed.status).toBe(400)
    expect(array.status).toBe(400)
  })

  it('applies the local fallback rate limit', async () => {
    const responses = []
    for (let index = 0; index < 61; index += 1) {
      responses.push(await POST(request('{}', '198.51.100.15'), params))
    }

    expect(responses.slice(0, 60).every((response) => response.status === 200)).toBe(true)
    expect(responses[60].status).toBe(429)
  })
})
