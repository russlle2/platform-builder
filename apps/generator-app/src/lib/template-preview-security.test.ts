import { describe, expect, it } from 'vitest'
import {
  isSafePreviewImageUrl,
  isSafePreviewPage,
  isSafePreviewText,
  rewriteTemplateAssetReferences,
  sanitizeTemplatePreviewCss,
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

  it('preserves only the exact compiler compatibility runtime when explicitly requested', () => {
    const exact = '<script data-dc-runtime="compatibility-v1" defer src="assets/js/dc-compat.js"></script>'
    expect(sanitizeTemplatePreviewHtml(exact)).toBe('')

    const preserved = sanitizeTemplatePreviewHtml(`<body>${exact}</body>`, {
      preserveCompilerCompatibilityRuntime: true,
    })
    expect(preserved).toBe(
      '<body><script defer src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script></body>',
    )
    const serializedBoolean = sanitizeTemplatePreviewHtml(
      '<body><script defer="" src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script></body>',
      { preserveCompilerCompatibilityRuntime: true },
    )
    expect(serializedBoolean).toBe(
      '<body><script defer src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script></body>',
    )
    expect(rewriteTemplateAssetReferences(
      preserved,
      '/api/templates/niche/slug/assets',
      'pages/services/detail.html',
    )).toContain(
      'src="/api/templates/niche/slug/assets/assets/js/dc-compat.js"',
    )

    const nearMisses = [
      '<script defer src="assets/js/dc-compat.js"></script>',
      '<script defer src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v2"></script>',
      '<script defer src="assets/js/dc-compat.js?v=1" data-dc-runtime="compatibility-v1"></script>',
      '<script defer src="assets/js/dc-compat.js#x" data-dc-runtime="compatibility-v1"></script>',
      '<script defer="yes" src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script>',
      '<script defer defer="" src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script>',
      '<script defer src="/assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script>',
      '<script defer src="../assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script>',
      '<script defer src="assets/js/dc-compat.js\n" data-dc-runtime="compatibility-v1"></script>',
      '<script defer src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1" onload="alert(1)"></script>',
      '<script defer src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1">alert(1)</script>',
    ]
    for (const candidate of nearMisses) {
      expect(sanitizeTemplatePreviewHtml(`<body>${candidate}</body>`, {
        preserveCompilerCompatibilityRuntime: true,
      })).not.toContain('<script')
    }
  })

  it('enforces contextual data/blob policy for HTML, CSS, and candidate sets', () => {
    const raster = 'data:image/png;base64,AAAA'
    const padding = '\t'.repeat(300)
    const html = `<html><head>
      <link id="data-sheet" rel="stylesheet" href="data:text/css,body%7Bdisplay:none%7D">
      <style id="safe-style">.safe{background:url("${raster}")}</style>
      <style id="data-import">@import url("${raster}");</style>
      </head><body>
      <img id="safe-raster" src="${raster}">
      <video id="safe-poster" poster="${raster}"></video>
      <a id="raster-link" href="${raster}">download</a>
      <img id="svg-data" src="data:image/svg+xml,%3Csvg%20onload%3Dalert(1)%3E">
      <img id="blob-image" src="blob:https://example.test/transient">
      <img id="candidate-set" src="hero.webp" srcset="hero.webp 1x, blob:https://example.test/id 2x">
      <div id="escaped-css" style="background:url(d\\61 ta:text/html,blocked)"></div>
      <a id="long-obfuscation" href="${padding}j${padding}a${padding}v${padding}a${padding}s${padding}c${padding}r${padding}i${padding}p${padding}t:alert(1)">go</a>
      <a id="entity-vb" href="vbscript&colon;msgbox(1)">go</a>
      </body></html>`

    const clean = sanitizeTemplatePreviewHtml(html)
    expect(clean).toContain(`id="safe-raster" src="${raster}"`)
    expect(clean).toContain(`id="safe-poster" poster="${raster}"`)
    expect(clean).toContain(`<style id="safe-style">.safe{background:url("${raster}")}</style>`)
    expect(clean).toMatch(/id="(?:data-sheet|raster-link|svg-data|blob-image|long-obfuscation|entity-vb)"[^>]+(?:href|src)="#"/g)
    expect(clean).toContain('id="candidate-set" src="hero.webp"')
    expect(clean).not.toMatch(/id="candidate-set"[^>]+srcset=/)
    expect(clean).toContain('<div id="escaped-css"></div>')
    expect(clean).not.toContain('id="data-import"')
  })

  it('rejects unsafe standalone CSS including imports and CSS-escaped schemes', () => {
    const raster = 'data:image/png;base64,AAAA'
    expect(sanitizeTemplatePreviewCss(`.hero{background:url("${raster}")}`))
      .toBe(`.hero{background:url("${raster}")}`)
    expect(sanitizeTemplatePreviewCss(`@import url("${raster}");body{color:red}`)).toBe('')
    expect(sanitizeTemplatePreviewCss('.hero{background:url(d\\61 ta:text/html,blocked)}')).toBe('')
    expect(sanitizeTemplatePreviewCss('.hero{background:url(blob:https://example.test/id)}')).toBe('')
    expect(sanitizeTemplatePreviewCss('/* url(data:text/html,ignored) */ body{color:red}'))
      .toBe('/* url(data:text/html,ignored) */ body{color:red}')
  })

  it('blocks template blob URLs while retaining the trusted image-swap message allowance', () => {
    expect(sanitizeTemplatePreviewHtml('<img src="blob:https://example.test/customer-upload">'))
      .toBe('<img src="#">')
    expect(isSafePreviewImageUrl('blob:https://example.test/customer-upload')).toBe(true)
    expect(isSafePreviewImageUrl('data:image/png;base64,AAAA')).toBe(true)
    expect(isSafePreviewImageUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe(false)
    expect(isSafePreviewImageUrl('data:image/png;base64,')).toBe(false)
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

  it('rewrites nested responsive candidates and posters while preserving descriptors and suffixes', () => {
    const html = [
      '<picture>',
      '<source srcset="../../assets/img/hero-small.webp?fit=crop 480w, ../../assets/img/hero-large.webp?v=2#focus 960w">',
      '<img src="../../assets/img/hero.webp" srcset="../../assets/img/hero.webp?dpr=1 1x, https://cdn.example.test/hero.webp?dpr=2 2x">',
      '</picture>',
      '<video poster="../../assets/img/poster.webp?frame=1#preview"></video>',
    ].join('')
    const rewritten = rewriteTemplateAssetReferences(
      html,
      '/api/templates/niche/slug/assets/',
      'pages/services/detail.html',
    )

    expect(rewritten).toContain(
      'srcset="/api/templates/niche/slug/assets/assets/img/hero-small.webp?fit=crop 480w, /api/templates/niche/slug/assets/assets/img/hero-large.webp?v=2#focus 960w"',
    )
    expect(rewritten).toContain(
      'srcset="/api/templates/niche/slug/assets/assets/img/hero.webp?dpr=1 1x, https://cdn.example.test/hero.webp?dpr=2 2x"',
    )
    expect(rewritten).toContain(
      'poster="/api/templates/niche/slug/assets/assets/img/poster.webp?frame=1#preview"',
    )
  })

  it('preserves safe raster data and fragments in srcset but fails closed on unsafe candidates', () => {
    const raster = 'data:image/png;base64,AAAA'
    const safe = `<img srcset="${raster} 1x, #local-preview 2x, assets/img/local.webp 3x">`
    const rewritten = rewriteTemplateAssetReferences(safe, '/api/template/assets')
    expect(rewritten).toContain(`${raster} 1x`)
    expect(rewritten).toContain('#local-preview 2x')
    expect(rewritten).toContain('/api/template/assets/assets/img/local.webp 3x')
    expect(sanitizeTemplatePreviewHtml(safe)).toContain('srcset=')

    for (const candidate of [
      'javascript:alert(1) 1x, assets/img/safe.webp 2x',
      'blob:https://example.test/id 1x',
      'data:image/svg+xml;base64,AAAA 1x',
      'assets/img/a.webp nonsense',
    ]) {
      const source = `<source srcset="${candidate}">`
      expect(sanitizeTemplatePreviewHtml(source)).not.toContain('srcset=')
      expect(rewriteTemplateAssetReferences(source, '/api/template/assets')).not.toContain('srcset=')
    }
  })
})

describe('preview message validation', () => {
  it('allows only bounded internal html page names', () => {
    expect(isSafePreviewPage('about/team.html')).toBe(true)
    expect(isSafePreviewPage('../admin.html')).toBe(false)
    expect(isSafePreviewPage('/about/team.html')).toBe(false)
    expect(isSafePreviewPage('about//team.html')).toBe(false)
    expect(isSafePreviewPage('https://evil.test/x.html')).toBe(false)
  })

  it('allows only bounded image URL schemes and text', () => {
    expect(isSafePreviewImageUrl('/uploads/image.webp')).toBe(true)
    expect(isSafePreviewImageUrl('data:image/png;base64,AAAA')).toBe(true)
    expect(isSafePreviewImageUrl('data:image/svg+xml,<svg/>')).toBe(false)
    expect(isSafePreviewImageUrl('javascript:alert(1)')).toBe(false)
    expect(isSafePreviewText('hello')).toBe(true)
    expect(isSafePreviewText('x'.repeat(10_001))).toBe(false)
  })
})
