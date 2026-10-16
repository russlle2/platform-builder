import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const registry = vi.hoisted(() => ({ getTemplate: vi.fn(), readTemplateFile: vi.fn() }))
vi.mock('@/lib/templates/niche-registry', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/templates/niche-registry')>()
  return { ...original, ...registry }
})

import { GET } from './route'

const params = { params: Promise.resolve({ niche: 'wellness_coach', slug: 'example' }) }
const base = '/api/templates/wellness_coach/example/assets'

function setFiles(html: string, css: string) {
  registry.readTemplateFile.mockImplementation(async (_niche, _slug, file) => (
    file === 'index.html' ? html : css
  ))
}

describe('gallery template HTML', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registry.getTemplate.mockResolvedValue({
      pages: ['index.html'],
      fields: [{ name: 'BUSINESS_NAME', type: 'text', default: 'Preview Studio' }],
    })
  })

  it('preserves the authored v3 stylesheet graph without injecting unrelated global CSS', async () => {
    setFiles(
      '<!doctype html><html data-dc-catalog-version="3"><head><link rel="stylesheet" href="assets/css/component.css"></head><body class="pattern"><h1>{{BUSINESS_NAME}}</h1></body></html>',
      '.pattern{position:absolute;inset:0;opacity:.12;pointer-events:none}',
    )
    const response = await GET(new NextRequest('https://dailyclarity.test/html'), params)
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain(`href="${base}/assets/css/component.css"`)
    expect(html).toContain('Preview Studio')
    expect(html).not.toContain('pointer-events:none')
  })

  it('keeps v2 base styles and resolves their relative asset paths', async () => {
    setFiles(
      '<html><HEAD></HEAD><body><h1>{{BUSINESS_NAME}}</h1></body></html>',
      '.hero{background-image:url("../img/hero.png")}',
    )
    const response = await GET(new NextRequest('https://dailyclarity.test/html'), params)
    expect(await response.text()).toContain(`${base}/assets/img/hero.png`)
  })

  it('rejects stylesheet content that could escape its style element', async () => {
    setFiles('<html><head></head><body>Safe</body></html>', '</style><script>alert(1)</script>')
    const response = await GET(new NextRequest('https://dailyclarity.test/html'), params)
    expect(await response.text()).not.toContain('<script>')
  })

  it('fills missing neutral sample fields only on request and preserves authored defaults', async () => {
    registry.getTemplate.mockResolvedValue({
      pages: ['index.html'],
      fields: [
        { name: 'BUSINESS_NAME', type: 'text' },
        { name: 'PRACTITIONER_NAME', type: 'text', default: 'Authored example' },
        { name: 'EMAIL', type: 'email' },
        { name: 'PRIMARY_CTA_LABEL', type: 'text' },
        { name: 'CTA_LABEL', type: 'text', default: 'Ask about a visit' },
        { name: 'TAGLINE', type: 'text' },
      ],
    })
    setFiles('<html><head></head><body><h1>{{BUSINESS_NAME}}</h1><p>{{PRACTITIONER_NAME}}</p><p>{{EMAIL}}</p><p>{{TAGLINE}}</p><a>{{PRIMARY_CTA_LABEL}}</a><a>{{CTA_LABEL}}</a></body></html>', '')
    const sampleResponse = await GET(new NextRequest('https://dailyclarity.test/html?sample=1'), params)
    const sample = await sampleResponse.text()
    expect(sample).toContain('<h1>Example Practice</h1>')
    expect(sample).toContain('Authored example')
    expect(sample).not.toContain('Example Practitioner')
    expect(sample).not.toContain('@')
    expect(sample).toContain('<a>Get in touch</a>')
    expect(sample).toContain('<a>Ask about a visit</a>')
    expect(sample).toContain('An introduction to your practice.')
    const normalResponse = await GET(new NextRequest('https://dailyclarity.test/html'), params)
    const normal = await normalResponse.text()
    expect(normal).not.toContain('Example Practice')
    expect(normal).not.toContain('Get in touch')
    expect(normal).not.toContain('An introduction to your practice.')
    expect(normal).toContain('Ask about a visit')
  })

  it('does not read an undeclared page', async () => {
    const response = await GET(new NextRequest('https://dailyclarity.test/html?page=missing.html'), params)
    expect(response.status).toBe(404)
    expect(registry.readTemplateFile).not.toHaveBeenCalled()
  })
})
