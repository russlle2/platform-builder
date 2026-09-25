import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getTemplate: vi.fn(),
  readTemplateFile: vi.fn(),
  readTemplateFileBuffer: vi.fn(),
}))

vi.mock('@/lib/templates/niche-registry', () => ({
  getTemplate: mocks.getTemplate,
  getTemplateAtCatalogRevision: mocks.getTemplate,
  readTemplateFile: mocks.readTemplateFile,
  readTemplateFileBuffer: mocks.readTemplateFileBuffer,
  hydrateTemplate: (html: string) => html,
}))

import { buildDeployFiles } from './site-deploy'

const compiledCss = ':root{--dc-theme-color_bg:#fff;--dc-theme-color_cta:#f00}body{background:var(--dc-theme-color_bg)}.btn{background:var(--dc-theme-color_cta)}'

describe('deployed compiler theme CSS', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTemplate.mockResolvedValue({
      pages: ['index.html'],
      files: ['index.html', 'assets/css/styles.css'],
      fields: [],
    })
    mocks.readTemplateFile.mockImplementation(async (
      _niche: string,
      _template: string,
      file: string,
    ) => file === 'index.html'
      ? '<html><head></head><body><a class="btn">Book</a></body></html>'
      : compiledCss)
    mocks.readTemplateFileBuffer.mockResolvedValue(Buffer.from(compiledCss))
  })

  it('places customer palette overrides after compiler defaults in deploy output', async () => {
    const files = await buildDeployFiles({
      niche: 'wellness',
      templateSlug: 'compiled',
      customerValues: {},
      colorScheme: 'ocean-breeze',
      fontVariation: 'original',
      structureVariation: 'original',
      slug: 'customer-site',
      siteUrl: 'https://customer-site.example.com',
    })
    const html = String(files?.['index.html'])
    expect(html.indexOf('--dc-theme-color_bg:#fff')).toBeLessThan(
      html.indexOf('--dc-theme-color_bg: #0B1628 !important'),
    )
    expect(html).toContain('--dc-theme-color_cta: #0EA5E9 !important')
  })

  it('does not inject an unlinked base stylesheet into compiler-v3 pages', async () => {
    const collidingCss = `${compiledCss}.pattern{position:absolute;inset:0;opacity:.12;pointer-events:none}`
    const pageCss = 'body{min-height:100vh}.card{display:block}'
    mocks.getTemplate.mockResolvedValue({
      pages: ['index.html'],
      files: ['index.html', 'assets/css/styles.css', 'assets/css/page.css'],
      fields: [],
      validation: { contractVersion: 3 },
      designId: 'design_compiled_v3',
      contentPresetId: 'content_compiled_v3',
      themePresetId: 'theme_compiled_v3',
      qualityReceipt: 'receipt_compiled_v3',
      catalogHash: 'c'.repeat(64),
      manifestHash: 'd'.repeat(64),
    })
    mocks.readTemplateFile.mockImplementation(async (
      _niche: string,
      _template: string,
      file: string,
    ) => file === 'index.html'
      ? '<!doctype html><html data-dc-catalog-version="3"><head><link rel="stylesheet" href="assets/css/page.css"></head><body class="pattern"><main>Reachable page</main></body></html>'
      : file === 'assets/css/styles.css'
        ? collidingCss
        : pageCss)
    mocks.readTemplateFileBuffer.mockImplementation(async (
      _niche: string,
      _template: string,
      file: string,
    ) => Buffer.from(file === 'assets/css/styles.css' ? collidingCss : pageCss))

    const files = await buildDeployFiles({
      niche: 'wellness',
      templateSlug: 'compiled-v3',
      customerValues: {},
      colorScheme: 'ocean-breeze',
      fontVariation: 'original',
      structureVariation: 'original',
      slug: 'customer-site',
      siteUrl: 'https://customer-site.example.com',
    })
    const html = String(files?.['index.html'])

    expect(html).toContain('href="assets/css/page.css"')
    expect(html).not.toContain('.pattern{position:absolute')
    expect(html).toContain('--dc-theme-color_bg: #0B1628 !important')
    expect(String(files?.['assets/css/styles.css'])).toBe(collidingCss)
    expect(String(files?.['assets/css/page.css'])).toBe(pageCss)
  })

  it('fails closed when an alias no longer resolves to its purchased preset receipt', async () => {
    mocks.getTemplate.mockResolvedValue({
      pages: ['index.html'],
      files: ['index.html', 'assets/css/styles.css'],
      fields: [],
      validation: { contractVersion: 3 },
      designId: 'design_shared',
      contentPresetId: 'content_alias_now',
      themePresetId: 'theme_alias',
      qualityReceipt: 'receipt_current',
    })

    await expect(buildDeployFiles({
      niche: 'wellness',
      templateSlug: 'legacy-alias',
      catalogRevision: {
        contractVersion: 3,
        designId: 'design_shared',
        contentPresetId: 'content_alias_at_checkout',
        themePresetId: 'theme_alias',
        qualityReceipt: 'receipt_purchased',
      },
      customerValues: {},
      slug: 'customer-site',
      siteUrl: 'https://customer-site.example.com',
    })).rejects.toThrow('Catalogue revision mismatch')
    expect(mocks.readTemplateFile).not.toHaveBeenCalled()
  })

  it('reads every deploy page and asset from the purchased immutable snapshot', async () => {
    const catalogRevision = {
      contractVersion: 3 as const,
      designId: 'design_purchased',
      contentPresetId: 'content_purchased',
      themePresetId: 'theme_purchased',
      qualityReceipt: 'receipt_purchased',
      catalogHash: 'a'.repeat(64),
      manifestHash: 'b'.repeat(64),
    }
    mocks.getTemplate.mockResolvedValue({
      pages: ['index.html'],
      files: ['index.html', 'assets/css/styles.css'],
      fields: [],
      validation: { contractVersion: 3 },
      ...catalogRevision,
    })

    const files = await buildDeployFiles({
      niche: 'wellness',
      templateSlug: 'historical',
      catalogRevision,
      customerValues: {},
      slug: 'customer-site',
      siteUrl: 'https://customer-site.example.com',
    })
    expect(files?.['index.html']).toBeTruthy()
    expect(mocks.getTemplate).toHaveBeenCalledWith('wellness', 'historical', catalogRevision)
    expect(mocks.readTemplateFile).toHaveBeenCalledWith(
      'wellness',
      'historical',
      'index.html',
      catalogRevision,
    )
    expect(mocks.readTemplateFileBuffer).toHaveBeenCalledWith(
      'wellness',
      'historical',
      'assets/css/styles.css',
      catalogRevision,
    )
  })
})
