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
    getTemplateAtCatalogRevision: registry.getTemplate,
    hydrateTemplate: hydration.hydrateTemplate,
  }
})

import {
  buildCheckoutTemplateState,
  mergePortalSiteData,
  preparePortalCustomizationUpdate,
} from './customer-site-state'
import { COMPILER_V3_ROUTE_FIXTURE } from './fixtures/compiler-v3-customer-route.fixture'
import {
  applyImageSwapsToHtml,
  extractRelativeAssetPath,
  mergeCoordinatedImageSwaps,
  mergeImageSwap,
} from './image-swaps'
import { composeCustomerPreviewDocument } from './customer-preview-document'
import { buildPageSeoInlineEdit } from './page-seo-settings'
import {
  buildDeployFiles,
  applyPageCustomizationsForDeploy,
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

const pageSeoEdits = [
  buildPageSeoInlineEdit(
    COMPILER_V3_ROUTE_FIXTURE.files['index.html'],
    'title',
    'Harbor & Pine Coaching | Wellness support',
  ),
  buildPageSeoInlineEdit(
    COMPILER_V3_ROUTE_FIXTURE.files['index.html'],
    'description',
    'Personalized "coaching" description',
  ),
].filter((edit): edit is NonNullable<typeof edit> => edit !== null)

const inlineEdits = {
  'index.html': [
    ...pageSeoEdits,
    {
      nodeId: 'txt_111111111111111111',
      original: 'Original introduction',
      updated: 'Practical guidance <tailored> to you',
    },
    {
      nodeId: 'txt_333333333333333333',
      original: 'Original hero description',
      updated: 'Owner standing beside a sunlit window',
    },
    {
      nodeId: 'txt_444444444444444444',
      original: 'Contact',
      updated: 'Contact us',
    },
    {
      nodeId: 'txt_555555555555555555',
      original: 'Name',
      updated: 'Preferred name',
    },
    {
      nodeId: 'txt_666666666666666666',
      original: 'Your name',
      updated: 'Enter your name',
    },
    {
      nodeId: 'txt_777777777777777777',
      original: 'Send',
      updated: 'Send inquiry',
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

  it('coordinates a clicked responsive picture through customer preview and deployment', () => {
    const fallbackSlot = 'img_111111111111111111'
    const sourceSlot = 'img_222222222222222222'
    const updated = 'https://images.example.test/customer/responsive.webp'
    const html = [
      '<!doctype html><html><head></head><body><picture>',
      `<source media="(min-width: 600px)" srcset="assets/img/old-wide.webp 1x, assets/img/old-wide-2x.webp 2x" data-dc-image-id="${sourceSlot}">`,
      `<img src="assets/img/old-fallback.webp" srcset="assets/img/old-fallback-2x.webp 2x" data-dc-image-id="${fallbackSlot}" alt="">`,
      '</picture></body></html>',
    ].join('')
    const swaps = mergeCoordinatedImageSwaps(
      [],
      'assets/img/old-fallback.webp',
      updated,
      'img/old-fallback.webp',
      fallbackSlot,
      [sourceSlot, fallbackSlot],
    )
    const page = 'pages/gallery/detail.html'
    const checkout = buildCheckoutTemplateState({
      template: COMPILER_V3_ROUTE_FIXTURE.meta.slug,
      niche: COMPILER_V3_ROUTE_FIXTURE.meta.nicheSlug,
      templateRevision: COMPILER_V3_ROUTE_FIXTURE.meta,
      imageSwaps: { [page]: swaps },
      inlineEdits: {},
      customerValues: {},
      imageOwner: 'draft-123e4567-e89b-42d3-a456-426614174000',
    })
    const portalUpdate = preparePortalCustomizationUpdate(checkout, 'responsive-site')
    expect(portalUpdate.ok).toBe(true)
    if (!portalUpdate.ok) throw new Error(portalUpdate.error)
    const persisted = mergePortalSiteData({ ...checkout }, portalUpdate)
    const persistedSwaps = persisted.imageSwaps?.[page]

    expect(swaps.map((swap) => swap.slotId)).toEqual([fallbackSlot, sourceSlot])
    expect(persistedSwaps).toEqual(swaps)
    const preview = composeCustomerPreviewDocument({
      html,
      assetBase: '/api/templates/wellness_coach/responsive/assets',
      page,
      imageSwaps: persistedSwaps,
    })
    const deployed = applyPageCustomizationsForDeploy(
      html,
      undefined,
      persistedSwaps,
      page,
    )

    for (const output of [preview, deployed]) {
      expect(output).toMatch(new RegExp(`<source\\b(?=[^>]*data-dc-image-id="${sourceSlot}")(?=[^>]*srcset="${updated}")[^>]*>`))
      expect(output).toMatch(new RegExp(`<img\\b(?=[^>]*data-dc-image-id="${fallbackSlot}")(?=[^>]*src="${updated}")[^>]*>`))
      expect(output).not.toContain('old-wide.webp')
      expect(output).not.toContain('old-fallback-2x.webp')
    }
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
    const previewDocument = composeCustomerPreviewDocument({
      html: preview.html,
      css: preview.css,
      variationCSS: preview.variationCSS,
      assetBase,
      page: 'index.html',
      inlineEdits: inlineEdits['index.html'],
      imageSwaps: imageSwaps['index.html'],
    })

    expect(previewDocument).toContain('Harbor &amp; Pine Coaching')
    expect(previewDocument).toContain('<title data-dc-edit-id="txt_888888888888888888">Harbor &amp; Pine Coaching | Wellness support</title>')
    expect(previewDocument).toContain('Practical guidance &lt;tailored&gt; to you')
    expect(previewDocument).toContain('content="Personalized &quot;coaching&quot; description"')
    expect(previewDocument).toContain('alt="Owner standing beside a sunlit window"')
    expect(previewDocument).toContain('src="https://images.example.test/customer/hero.webp"')
    expect(previewDocument).toContain('<nav><a href="#contact"><span data-dc-edit-id="txt_444444444444444444">Contact us</span></a></nav>')
    expect(previewDocument).toContain('<form id="contact" action="/" method="post" data-dc-standard-form="safe">')
    expect(previewDocument).toContain('name="name" aria-label="Customer name" placeholder="Enter your name"')
    expect(previewDocument).toContain('<button type="submit"><span data-dc-edit-id="txt_777777777777777777">Send inquiry</span></button>')
    expect(previewDocument).toContain('name="viewport" content="width=device-width,initial-scale=1"')
    expect(previewDocument).not.toMatch(/<meta\b[^>]*name="viewport"[^>]*data-dc-edit-id/i)
    expect(previewDocument).not.toMatch(/<(?:main|nav|a|form|label|button)\b[^>]*data-dc-edit-id="dc-edit-/)
    expect(preview.variationCSS).toContain('--dc-theme-color_bg: #f7f1e8 !important')
    expect(preview.variationCSS).toContain('--dc-theme-color_text: #263238 !important')
    expect(preview.variationCSS).toContain('--dc-theme-color_primary: #7a315c !important')
    expect(preview.variationCSS).toContain('--dc-theme-font_body: Verdana, sans-serif !important')
    expect(preview.variationCSS).toContain('--dc-theme-font_heading: "Trebuchet MS", sans-serif !important')
    expect(preview.variationCSS).toContain('--dc-theme-color_secondary:')
    expect(preview.variationCSS).toContain('--dc-theme-font_secondary: Verdana, sans-serif !important')
    expect(previewDocument).toContain('<style id="variation-overrides">')
    expect(previewDocument).toContain('--dc-theme-color_primary: #7a315c !important')
    expect(previewDocument).toContain('--dc-theme-font_body: Verdana, sans-serif !important')

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
      catalogHash: 'a'.repeat(64),
      manifestHash: 'b'.repeat(64),
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
    expect(deployedHtml).toContain('<title data-dc-edit-id="txt_888888888888888888">Harbor &amp; Pine Coaching | Wellness support</title>')
    expect(deployedHtml).toContain('Practical guidance &lt;tailored&gt; to you')
    expect(deployedHtml).toContain('content="Personalized &quot;coaching&quot; description"')
    expect(deployedHtml).toContain('alt="Owner standing beside a sunlit window"')
    expect(deployedHtml).toContain('src="https://images.example.test/customer/hero.webp"')
    expect(deployedHtml).toContain('<nav><a href="#contact"><span data-dc-edit-id="txt_444444444444444444">Contact us</span></a></nav>')
    expect(deployedHtml).toContain('<form id="contact" action="/" method="post" data-dc-standard-form="safe">')
    expect(deployedHtml).toContain('name="name" aria-label="Customer name" placeholder="Enter your name"')
    expect(deployedHtml).toContain('<button type="submit"><span data-dc-edit-id="txt_777777777777777777">Send inquiry</span></button>')
    expect(deployedHtml).toContain('name="viewport" content="width=device-width,initial-scale=1"')
    expect(deployedHtml).not.toMatch(/<meta\b[^>]*name="viewport"[^>]*data-dc-edit-id/i)
    expect(deployedHtml).not.toMatch(/<(?:main|nav|a|form|label|button)\b[^>]*data-dc-edit-id="dc-edit-/)
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

  it('keeps a v2 proxy-captured image intact through preview, checkout, portal, and deploy', async () => {
    const assetBase = '/api/templates/wellness_coach/legacy-route-fixture/assets'
    let previewDocument = sanitizeTemplatePreviewHtml(
      COMPILER_V3_ROUTE_FIXTURE.files['index.html'],
    )
    previewDocument = rewriteTemplateAssetReferences(previewDocument, assetBase, 'index.html')

    const rewrittenSource = `${assetBase}/assets/img/hero.svg`
    const proxySource = `/.netlify/images?url=${encodeURIComponent(rewrittenSource)}&w=1200&q=72`
    previewDocument = previewDocument.replace(
      `src="${rewrittenSource}"`,
      `src="${proxySource}"`,
    )

    // Browser currentSrc is absolute even though the serialized preview src is
    // relative. This was the source mismatch in pre-v3 saved image swaps.
    const browserCurrentSrc = new URL(proxySource, 'https://dailyclarity.org').href
    const originalRelative = extractRelativeAssetPath(browserCurrentSrc)
    expect(originalRelative).toBe('assets/img/hero.svg')

    const updated = 'https://images.example.test/customer/v2-hero.webp'
    const capturedSwaps = mergeImageSwap(
      [],
      browserCurrentSrc,
      updated,
      originalRelative,
    )
    expect(capturedSwaps).toEqual([{
      original: browserCurrentSrc,
      originalRelative: 'assets/img/hero.svg',
      updated,
    }])

    // Exercise the harder compatibility case: records already persisted before
    // proxy decoding was fixed have no originalRelative field to carry forward.
    const legacyImageSwaps = {
      'index.html': [{ original: browserCurrentSrc, updated }],
    }

    const previewApplied = applyImageSwapsToHtml(
      previewDocument,
      legacyImageSwaps['index.html'],
      'index.html',
    )
    expect(previewApplied).toContain(`src="${updated}"`)
    expect(previewApplied).not.toContain('/.netlify/images?')

    const checkoutState = buildCheckoutTemplateState({
      template: COMPILER_V3_ROUTE_FIXTURE.meta.slug,
      niche: COMPILER_V3_ROUTE_FIXTURE.meta.nicheSlug,
      templateRevision: COMPILER_V3_ROUTE_FIXTURE.meta,
      customerValues,
      inlineEdits: {},
      imageSwaps: legacyImageSwaps,
      imageOwner: 'draft-123e4567-e89b-42d3-a456-426614174000',
      colorScheme: 'original',
      fontVariation: 'original',
      structureVariation: 'original',
    })

    const checkoutRoundTrip = JSON.parse(JSON.stringify(checkoutState))
    const portalUpdate = preparePortalCustomizationUpdate(checkoutRoundTrip, 'v2-image-site')
    expect(portalUpdate.ok).toBe(true)
    if (!portalUpdate.ok) throw new Error(portalUpdate.error)
    const persisted = mergePortalSiteData({
      ...checkoutRoundTrip,
      site_url: 'https://v2-image.example.test',
      plan: 'basic',
    }, portalUpdate)
    expect(persisted.imageSwaps).toEqual(legacyImageSwaps)

    const deployFiles = await buildDeployFiles({
      niche: String(persisted.niche),
      templateSlug: String(persisted.template),
      customerValues: persisted.customerValues || {},
      catalogRevision: persisted.catalogRevision,
      inlineEdits: persisted.inlineEdits,
      imageSwaps: persisted.imageSwaps,
      slug: 'v2-image-site',
      siteUrl: String(persisted.site_url),
    })
    expect(String(deployFiles?.['index.html'])).toContain(`src="${updated}"`)
    expect(String(deployFiles?.['index.html'])).not.toContain('src="assets/img/hero.svg"')
  })
})
