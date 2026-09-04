import { beforeEach, describe, expect, it, vi } from 'vitest'

const registry = vi.hoisted(() => ({
  getTemplate: vi.fn(),
  readTemplateFile: vi.fn(),
  readTemplateFileBuffer: vi.fn(),
}))

vi.mock('@/lib/templates/niche-registry', async () => {
  const hydration = await vi.importActual<typeof import('@/lib/templates/template-hydration')>(
    '@/lib/templates/template-hydration',
  )
  return {
    ...registry,
    hydrateTemplate: hydration.hydrateTemplate,
  }
})

import {
  buildCheckoutTemplateState,
  mergePortalSiteData,
  preparePortalCustomizationUpdate,
} from './customer-site-state'
import { COMPILER_V3_ROUTE_FIXTURE } from './fixtures/compiler-v3-customer-route.fixture'
import { applyImageSwapsToHtml } from './image-swaps'
import { applyInlineEditsToHtml } from './inline-edits'
import {
  buildDeployFiles,
  chunkJsonToMetadata,
  unchunkJsonFromMetadata,
} from './site-deploy'
import {
  combineTemplateThemeStylesheets,
  composeTemplatePreview,
} from './template-preview-composition'
import {
  rewriteTemplateAssetReferences,
  sanitizeTemplatePreviewHtml,
} from './template-preview-security'

const customerValues = {
  BUSINESS_NAME: 'Harbor & Pine Coaching',
  EMAIL: 'hello@harborpine.example',
}

const inlineEdits = {
  'index.html': [
    {
      nodeId: 'txt_intro',
      original: 'Original introduction',
      updated: 'Practical guidance <tailored> to you',
    },
    {
      nodeId: 'txt_meta_description',
      original: 'Original description',
      updated: 'Personalized "coaching" description',
    },
    {
      nodeId: 'txt_hero_alt',
      original: 'Original hero description',
      updated: 'Owner standing beside a sunlit window',
    },
  ],
}

const imageSwaps = {
  'index.html': [{
    slotId: 'img_hero',
    original: 'assets/img/hero.svg',
    originalRelative: 'img/hero.svg',
    updated: 'https://images.example.test/customer/hero.webp',
  }],
}

const customTheme = {
  primary: '#7a315c',
  background: '#f7f1e8',
  text: '#263238',
  headingFont: '"Trebuchet MS", sans-serif',
  bodyFont: 'Verdana, sans-serif',
}

describe('compiler-v3 customer route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registry.getTemplate.mockResolvedValue(COMPILER_V3_ROUTE_FIXTURE.meta)
    registry.readTemplateFile.mockImplementation(async (
      _niche: string,
      _slug: string,
      file: string,
    ) => COMPILER_V3_ROUTE_FIXTURE.files[file] || null)
    registry.readTemplateFileBuffer.mockImplementation(async (
      _niche: string,
      _slug: string,
      file: string,
    ) => {
      const value = COMPILER_V3_ROUTE_FIXTURE.files[file]
      return value === undefined ? null : Buffer.from(value)
    })
  })

  it('keeps one customization and revision intact from preview through checkout, portal persistence, and deploy', async () => {
    const sourceHtml = COMPILER_V3_ROUTE_FIXTURE.files['index.html']
    const sourceCss = COMPILER_V3_ROUTE_FIXTURE.files['assets/css/styles.css']
    const secondaryCss = COMPILER_V3_ROUTE_FIXTURE.files['assets/css/secondary.css']
    const preview = composeTemplatePreview({
      html: sourceHtml,
      css: sourceCss,
      themeStylesheet: combineTemplateThemeStylesheets([
        { path: 'assets/css/styles.css', css: sourceCss },
        { path: 'assets/css/secondary.css', css: secondaryCss },
      ]),
      page: 'index.html',
      fields: COMPILER_V3_ROUTE_FIXTURE.meta.fields,
      values: customerValues,
      colorScheme: 'original',
      fontVariation: 'original',
      structureVariation: 'original',
      customTheme,
    })

    const assetBase = '/api/templates/wellness_coach/legacy-route-fixture/assets'
    let previewDocument = sanitizeTemplatePreviewHtml(preview.html)
    previewDocument = rewriteTemplateAssetReferences(previewDocument, assetBase, 'index.html')
    previewDocument = applyInlineEditsToHtml(previewDocument, inlineEdits['index.html'], 'index.html')
    previewDocument = applyImageSwapsToHtml(previewDocument, imageSwaps['index.html'], 'index.html')

    expect(previewDocument).toContain('Harbor &amp; Pine Coaching')
    expect(previewDocument).toContain('Practical guidance &lt;tailored&gt; to you')
    expect(previewDocument).toContain('content="Personalized &quot;coaching&quot; description"')
    expect(previewDocument).toContain('alt="Owner standing beside a sunlit window"')
    expect(previewDocument).toContain('src="https://images.example.test/customer/hero.webp"')
    expect(preview.variationCSS).toContain('--dc-theme-color_bg: #f7f1e8 !important')
    expect(preview.variationCSS).toContain('--dc-theme-color_text: #263238 !important')
    expect(preview.variationCSS).toContain('--dc-theme-color_primary: #7a315c !important')
    expect(preview.variationCSS).toContain('--dc-theme-font_body: Verdana, sans-serif !important')
    expect(preview.variationCSS).toContain('--dc-theme-font_heading: "Trebuchet MS", sans-serif !important')
    expect(preview.variationCSS).toContain('--dc-theme-color_secondary:')
    expect(preview.variationCSS).toContain('--dc-theme-font_secondary: Verdana, sans-serif !important')

    const checkoutState = buildCheckoutTemplateState({
      template: COMPILER_V3_ROUTE_FIXTURE.meta.slug,
      niche: COMPILER_V3_ROUTE_FIXTURE.meta.nicheSlug,
      templateRevision: COMPILER_V3_ROUTE_FIXTURE.meta,
      customerValues,
      inlineEdits,
      imageSwaps,
      imageOwner: 'draft-123e4567-e89b-42d3-a456-426614174000',
      colorScheme: 'original',
      fontVariation: 'original',
      structureVariation: 'original',
      customTheme,
    })
    expect(checkoutState.catalogRevision).toEqual({
      contractVersion: 3,
      designId: 'design_route_fixture',
      contentPresetId: 'content_route_fixture',
      themePresetId: 'theme_route_fixture',
      qualityReceipt: 'receipt_route_fixture',
    })

    const revisionMetadata = chunkJsonToMetadata('catalogRevision', checkoutState.catalogRevision, 2)
    expect(unchunkJsonFromMetadata('catalogRevision', revisionMetadata, null)).toEqual(
      checkoutState.catalogRevision,
    )

    // JSON round-trip mirrors checkout_intents -> fulfillment -> portal_sites.
    const checkoutRoundTrip = JSON.parse(JSON.stringify(checkoutState))
    const portalUpdate = preparePortalCustomizationUpdate(checkoutRoundTrip, 'harbor-pine-site')
    expect(portalUpdate.ok).toBe(true)
    if (!portalUpdate.ok) throw new Error(portalUpdate.error)
    const persisted = mergePortalSiteData({
      ...checkoutRoundTrip,
      netlify_site_id: 'offline-no-publish',
      site_url: 'https://harbor-pine.example.test',
      plan: 'basic',
    }, portalUpdate)
    expect(persisted.catalogRevision).toEqual(checkoutState.catalogRevision)
    expect(persisted.inlineEdits).toEqual(checkoutState.inlineEdits)
    expect(persisted.imageSwaps).toEqual(checkoutState.imageSwaps)
    expect(persisted.customTheme).toEqual(checkoutState.customTheme)
    expect(persisted.imageOwner).toBe('harbor-pine-site')

    const deployFiles = await buildDeployFiles({
      niche: String(persisted.niche),
      templateSlug: String(persisted.template),
      customerValues: persisted.customerValues || {},
      colorScheme: persisted.colorScheme,
      fontVariation: persisted.fontVariation,
      structureVariation: persisted.structureVariation,
      customTheme: persisted.customTheme,
      catalogRevision: persisted.catalogRevision,
      inlineEdits: persisted.inlineEdits,
      imageSwaps: persisted.imageSwaps,
      slug: 'harbor-pine-site',
      siteUrl: String(persisted.site_url),
    })

    const deployedHtml = String(deployFiles?.['index.html'])
    expect(deployedHtml).toContain('Harbor &amp; Pine Coaching')
    expect(deployedHtml).toContain('Practical guidance &lt;tailored&gt; to you')
    expect(deployedHtml).toContain('content="Personalized &quot;coaching&quot; description"')
    expect(deployedHtml).toContain('alt="Owner standing beside a sunlit window"')
    expect(deployedHtml).toContain('src="https://images.example.test/customer/hero.webp"')
    expect(deployedHtml).toContain(preview.variationCSS)
    expect(deployedHtml).toContain('--dc-theme-color_secondary:')
    expect(deployedHtml).toContain('--dc-theme-font_secondary: Verdana, sans-serif !important')
    expect(deployedHtml).toContain('data-dailyclarity-contact')
    expect(String(deployFiles?.['robots.txt'])).toContain('https://harbor-pine.example.test/sitemap.xml')
    expect(String(deployFiles?.['sitemap.xml'])).toContain('https://harbor-pine.example.test/')
    expect(Buffer.isBuffer(deployFiles?.['assets/img/hero.svg'])).toBe(true)

    registry.getTemplate.mockResolvedValue({
      ...COMPILER_V3_ROUTE_FIXTURE.meta,
      qualityReceipt: 'receipt_changed_after_checkout',
    })
    await expect(buildDeployFiles({
      niche: String(persisted.niche),
      templateSlug: String(persisted.template),
      customerValues: persisted.customerValues || {},
      catalogRevision: persisted.catalogRevision,
      inlineEdits: persisted.inlineEdits,
      imageSwaps: persisted.imageSwaps,
      slug: 'harbor-pine-site',
      siteUrl: String(persisted.site_url),
    })).rejects.toThrow('Catalogue revision mismatch')
  })
})
