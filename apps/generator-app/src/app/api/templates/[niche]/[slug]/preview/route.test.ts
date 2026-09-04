import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getTemplate: vi.fn(),
  readTemplateFile: vi.fn(),
}))

vi.mock('@/lib/templates/niche-registry', () => ({
  getTemplate: mocks.getTemplate,
  readTemplateFile: mocks.readTemplateFile,
  hydrateTemplate: (html: string) => html,
}))

import { POST } from './route'

const compiledCss = ':root{--dc-theme-color_bg:#fff;--dc-theme-color_cta:#f00}body{background:var(--dc-theme-color_bg)}.btn{background:var(--dc-theme-color_cta)}'

describe('template preview compiler theme CSS', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTemplate.mockResolvedValue({ pages: ['index.html'], fields: [] })
    mocks.readTemplateFile.mockImplementation(async (
      _niche: string,
      _template: string,
      file: string,
    ) => file === 'index.html' ? '<html><body>Preview</body></html>' : compiledCss)
  })

  it('returns compiler-token overrides for the customer palette', async () => {
    const request = new NextRequest('https://dailyclarity.org/api/templates/wellness/compiled/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ colorScheme: 'ocean-breeze' }),
    })
    const response = await POST(request, {
      params: Promise.resolve({ niche: 'wellness', slug: 'compiled' }),
    })
    const body = await response.json()
    expect(body.css).toBe(compiledCss)
    expect(body.variationCSS).toContain('--dc-theme-color_bg: #0B1628 !important')
    expect(body.variationCSS).toContain('--dc-theme-color_cta: #0EA5E9 !important')
  })
})
