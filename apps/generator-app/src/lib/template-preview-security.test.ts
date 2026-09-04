import { describe, expect, it } from 'vitest'
import {
  isSafePreviewImageUrl,
  isSafePreviewPage,
  isSafePreviewText,
  rewriteTemplateAssetReferences,
  sanitizeTemplatePreviewHtml,
} from './template-preview-security'

describe('sanitizeTemplatePreviewHtml', () => {
  it('removes active content while preserving page markup', () => {
    const html = `
      <html><head><meta http-equiv="refresh" content="0;url=https://evil.test"></head>
      <body onload="steal()"><h1>Hello</h1>
      <script>fetch('https://evil.test')</script>
      <iframe src="https://evil.test"></iframe>
      <img src="hero.jpg" onerror="steal()"></body></html>`

    const clean = sanitizeTemplatePreviewHtml(html)
    expect(clean).toContain('<h1>Hello</h1>')
    expect(clean).toContain('src="hero.jpg"')
    expect(clean).not.toMatch(/script|iframe|http-equiv="refresh"|onload|onerror/i)
  })

  it('neutralizes script URL attributes', () => {
    expect(sanitizeTemplatePreviewHtml('<a href=" javascript:alert(1)">go</a>')).toBe(
      '<a href="#">go</a>',
    )
    expect(sanitizeTemplatePreviewHtml('<a href=javascript:alert(1)>go</a>')).toBe(
      '<a href="#">go</a>',
    )
    expect(sanitizeTemplatePreviewHtml('<a href="java&#x73;cript:alert(1)">go</a>')).toBe(
      '<a href="#">go</a>',
    )
  })

  it('removes slash-delimited event handlers', () => {
    const clean = sanitizeTemplatePreviewHtml('<img/onerror="parent.postMessage(1,\'*\')" src="hero.jpg">')
    expect(clean).toContain('<img src="hero.jpg">')
    expect(clean).not.toMatch(/onerror|postMessage/i)
  })
})

describe('rewriteTemplateAssetReferences', () => {
  it('rewrites single- and double-quoted assets while preserving page links', () => {
    const html = `<a href='about.html'>About</a><img src="assets/hero.webp"><link href='assets/site.css'>`
    const rewritten = rewriteTemplateAssetReferences(html, '/api/template/assets')
    expect(rewritten).toContain("href='about.html'")
    expect(rewritten).toContain('src="/api/template/assets/assets/hero.webp"')
    expect(rewritten).toContain("href='/api/template/assets/assets/site.css'")
  })

  it('resolves CSS url paths relative to the stylesheet', () => {
    const css = `.hero{background:url('../images/hero.webp')} @font-face{src:url(../fonts/site.woff2)}`
    const rewritten = rewriteTemplateAssetReferences(
      css,
      '/api/template/assets',
      'assets/css/styles.css',
    )
    expect(rewritten).toContain("url('/api/template/assets/assets/images/hero.webp')")
    expect(rewritten).toContain('url(/api/template/assets/assets/fonts/site.woff2)')
  })
})

describe('preview message validation', () => {
  it('allows only bounded internal html page names', () => {
    expect(isSafePreviewPage('about/team.html')).toBe(true)
    expect(isSafePreviewPage('../admin.html')).toBe(false)
    expect(isSafePreviewPage('https://evil.test/x.html')).toBe(false)
  })

  it('allows only bounded image URL schemes and text', () => {
    expect(isSafePreviewImageUrl('/uploads/image.webp')).toBe(true)
    expect(isSafePreviewImageUrl('javascript:alert(1)')).toBe(false)
    expect(isSafePreviewText('hello')).toBe(true)
    expect(isSafePreviewText('x'.repeat(10_001))).toBe(false)
  })
})
