import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const registry = vi.hoisted(() => ({
  getTemplateAtCatalogRevision: vi.fn(),
  readTemplateFile: vi.fn(),
}))

vi.mock('@/lib/templates/niche-registry', () => registry)

import { POST } from './route'

const compiledCss = ':root{--dc-theme-color_bg:#fff}body{background:var(--dc-theme-color_bg)}'
const componentCss = ':root{--dc-theme-color_cta:#f00}.btn{background:var(--dc-theme-color_cta)}'
const catalogRevision = {
  contractVersion: 3 as const,
  designId: 'design_saved',
  contentPresetId: 'content_saved',
  themePresetId: 'theme_saved',
  qualityReceipt: 'receipt_saved',
  catalogHash: 'a'.repeat(64),
  manifestHash: 'b'.repeat(64),
}
const params = { params: Promise.resolve({ niche: 'wellness', slug: 'compiled' }) }

function request(body: BodyInit | null, ip: string, headers: HeadersInit = {}): NextRequest {
  return new NextRequest('https://dailyclarity.test/api/templates/wellness/compiled/preview', {
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
    registry.getTemplateAtCatalogRevision.mockResolvedValue({
      pages: ['index.html'],
      files: ['index.html', 'assets/css/styles.css', 'assets/css/.dc-inline-component.css'],
      fields: [
        { name: 'BUSINESS_NAME', type: 'text' },
        { name: 'TAGLINE', type: 'text' },
      ],
      validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] },
      ...catalogRevision,
    })
    registry.readTemplateFile.mockImplementation(async (
      _niche: string,
      _template: string,
      file: string,
    ) => file === 'index.html'
      ? '<h1>{{BUSINESS_NAME}}</h1><p>{{TAGLINE}}</p>'
      : file === 'assets/css/styles.css'
        ? compiledCss
        : componentCss)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns compiler-token overrides and the immutable catalogue revision', async () => {
    const response = await POST(request(JSON.stringify({
      colorScheme: 'ocean-breeze',
      catalogRevision,
    }), '198.51.100.10'), params)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.css).toBe(compiledCss)
    expect(body.themeStylesheet).toContain(compiledCss)
    expect(body.themeStylesheet).toContain(componentCss)
    expect(body.variationCSS).toContain('--dc-theme-color_bg: #0B1628 !important')
    expect(body.variationCSS).toContain('--dc-theme-color_cta: #0EA5E9 !important')
    expect(body.catalogRevision).toEqual(catalogRevision)
    expect(registry.getTemplateAtCatalogRevision).toHaveBeenCalledWith(
      'wellness',
      'compiled',
      catalogRevision,
    )
    expect(registry.readTemplateFile).toHaveBeenCalledWith(
      'wellness',
      'compiled',
      'index.html',
      catalogRevision,
    )
  })

  it('keeps the authored v3 stylesheet graph without injecting an unrelated base stylesheet', async () => {
    registry.readTemplateFile.mockImplementation(async (
      _niche: string,
      _template: string,
      file: string,
    ) => file === 'index.html'
      ? '<!doctype html><html data-dc-catalog-version="3"><head><link rel="stylesheet" href="assets/css/.dc-inline-component.css"></head><body class="pattern"><h1>{{BUSINESS_NAME}}</h1></body></html>'
      : file === 'assets/css/styles.css'
        ? `${compiledCss}.pattern{position:absolute;inset:0;opacity:.12;pointer-events:none}`
        : componentCss)

    const response = await POST(request(JSON.stringify({
      values: { BUSINESS_NAME: 'Reachable Studio' },
      colorScheme: 'ocean-breeze',
    }), '198.51.100.17'), params)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.css).toBeNull()
    expect(body.html).toContain('Reachable Studio')
    expect(body.themeStylesheet).toContain('.pattern{position:absolute')
    expect(body.themeStylesheet).toContain(componentCss)
    expect(body.variationCSS).toContain('--dc-theme-color_bg: #0B1628 !important')
  })

  it('sanitizes values and marks personalized output private', async () => {
    const response = await POST(request(JSON.stringify({
      values: {
        BUSINESS_NAME: 'Daily\0Clarity',
        TAGLINE: 'x'.repeat(6_000),
        'unsafe-key!': 'discard me',
        NOT_A_STRING: 42,
      },
    }), '198.51.100.11'), params)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.html).toBe(`<h1>DailyClarity</h1><p>${'x'.repeat(5_000)}</p>`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('netlify-cdn-cache-control')).toBe('no-store')
  })

  it('rejects declared and actually oversized bodies before catalogue access', async () => {
    const declared = await POST(request('{}', '198.51.100.12', {
      'content-length': '256001',
    }), params)
    const actual = await POST(request(JSON.stringify({
      values: { TAGLINE: 'x'.repeat(256_000) },
    }), '198.51.100.13'), params)

    expect(declared.status).toBe(413)
    expect(actual.status).toBe(413)
    expect(registry.getTemplateAtCatalogRevision).not.toHaveBeenCalled()
  })

  it('rejects malformed and non-object JSON', async () => {
    const malformed = await POST(request('{', '198.51.100.14'), params)
    const array = await POST(request('[]', '198.51.100.16'), params)

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
