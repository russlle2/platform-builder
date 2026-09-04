import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getTemplate: vi.fn(),
  readTemplateFile: vi.fn(),
}))

vi.mock('@/lib/templates/niche-registry', () => ({
  getTemplateAtCatalogRevision: mocks.getTemplate,
  readTemplateFile: mocks.readTemplateFile,
  hydrateTemplate: (html: string) => html,
}))

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

describe('template preview compiler theme CSS', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTemplate.mockResolvedValue({
      pages: ['index.html'],
      files: ['index.html', 'assets/css/styles.css', 'assets/css/.dc-inline-component.css'],
      fields: [],
      validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] },
      ...catalogRevision,
    })
    mocks.readTemplateFile.mockImplementation(async (
      _niche: string,
      _template: string,
      file: string,
    ) => file === 'index.html'
      ? '<html><body>Preview</body></html>'
      : file === 'assets/css/styles.css'
        ? compiledCss
        : componentCss)
  })

  it('returns compiler-token overrides for the customer palette', async () => {
    const request = new NextRequest('https://dailyclarity.org/api/templates/wellness/compiled/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ colorScheme: 'ocean-breeze', catalogRevision }),
    })
    const response = await POST(request, {
      params: Promise.resolve({ niche: 'wellness', slug: 'compiled' }),
    })
    const body = await response.json()
    expect(body.css).toBe(compiledCss)
    expect(body.themeStylesheet).toContain(compiledCss)
    expect(body.themeStylesheet).toContain(componentCss)
    expect(body.variationCSS).toContain('--dc-theme-color_bg: #0B1628 !important')
    expect(body.variationCSS).toContain('--dc-theme-color_cta: #0EA5E9 !important')
    expect(body.catalogRevision).toEqual(catalogRevision)
    expect(mocks.getTemplate).toHaveBeenCalledWith('wellness', 'compiled', catalogRevision)
    expect(mocks.readTemplateFile).toHaveBeenCalledWith(
      'wellness',
      'compiled',
      'index.html',
      catalogRevision,
    )
  })
})
