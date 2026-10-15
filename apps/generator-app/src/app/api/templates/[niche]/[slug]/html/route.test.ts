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

  it('does not read an undeclared page', async () => {
    const response = await GET(new NextRequest('https://dailyclarity.test/html?page=missing.html'), params)
    expect(response.status).toBe(404)
    expect(registry.readTemplateFile).not.toHaveBeenCalled()
  })
})
