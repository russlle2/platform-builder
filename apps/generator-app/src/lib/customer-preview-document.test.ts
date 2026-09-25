import { describe, expect, it } from 'vitest'
import { composeCustomerPreviewDocument } from './customer-preview-document'
import { CUSTOMER_PREVIEW_DOCUMENT_FIXTURE as fixture } from './fixtures/customer-preview-document.fixture'

describe('composeCustomerPreviewDocument', () => {
  it('composes nested compiler-v3 pages through the shared customer preview sequence', () => {
    const document = composeCustomerPreviewDocument(fixture)

    expect(document).not.toContain('template-script')
    expect(document).not.toMatch(/\son(?:click|error)=/i)
    expect(document).not.toContain('javascript:alert')
    expect(document).toContain(
      `href="${fixture.assetBase}/assets/css/styles.css"`,
    )
    expect(document).toContain(
      `url('${fixture.assetBase}/assets/img/pattern.webp')`,
    )
    expect(document).toContain(
      `src="${fixture.assetBase}/assets/img/logo.webp"`,
    )
    expect(document).toContain(
      `srcset="${fixture.assetBase}/assets/img/hero-small.webp?fit=crop 480w, ${fixture.assetBase}/assets/img/hero-large.webp?v=2 960w"`,
    )
    expect(document).toContain(
      `poster="${fixture.assetBase}/assets/img/poster.webp?frame=1"`,
    )
    expect(document).toContain('href="../about.html"')

    expect(document).toContain(
      'data-dc-edit-id="txt_1234567890abcdef12">Updated nested &lt;copy&gt;</p>',
    )
    expect(document).toMatch(
      /<img\b(?=[^>]*data-dc-image-id="img_nested_hero")(?=[^>]*src="https:\/\/cdn\.example\.test\/customer\/hero\.webp")[^>]*>/,
    )
    expect(document).toContain('<style id="variation-overrides">')
    expect(document).toContain('--dc-theme-color_primary:#7a315c')
    expect(document).toContain('--dc-theme-font_body:Verdana,sans-serif')
    expect(document).toContain('body { margin: 0; }')
    expect(document).toContain(
      `<script defer src="${fixture.assetBase}/assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script>`,
    )
    expect(document).toContain(fixture.trustedEditorScript)

    const baseCss = document.indexOf('.card{')
    const variationCss = document.indexOf('id="variation-overrides"')
    const previewBase = document.indexOf('body { margin: 0; }')
    const trustedScript = document.indexOf('id="trusted-customer-editor"')
    expect(baseCss).toBeGreaterThan(-1)
    expect(variationCss).toBeGreaterThan(baseCss)
    expect(previewBase).toBeGreaterThan(variationCss)
    expect(trustedScript).toBeGreaterThan(previewBase)
  })

  it('rejects late CSS markup/script escapes and omits the editor when it is not explicitly trusted', () => {
    const document = composeCustomerPreviewDocument({
      html: fixture.html,
      css: 'body{color:#f00}</style data-breakout><script id="late-css-script">alert(1)</script>',
      variationCSS: '.unsafe{background:url(blob:https://example.test/id)}',
      assetBase: fixture.assetBase,
      page: fixture.page,
    })

    expect(document).not.toContain('template-script')
    expect(document).not.toContain('late-css-script')
    expect(document).not.toContain('color:#f00')
    expect(document).not.toContain('variation-overrides')
    expect(document).not.toContain('trusted-customer-editor')
    expect(document.match(/<script\b/gi)).toHaveLength(1)
    expect(document).toContain('data-dc-runtime="compatibility-v1"')
    expect(document).toContain('body { margin: 0; }')
  })
})
