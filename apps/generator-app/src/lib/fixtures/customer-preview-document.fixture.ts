import type { ImageSwap } from '../image-swaps'
import type { InlineTextEdit } from '../inline-edits'

export const CUSTOMER_PREVIEW_DOCUMENT_FIXTURE = {
  page: 'pages/services/detail.html',
  assetBase: '/api/templates/wellness_coach/nested-v3/assets',
  html: [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<link rel="stylesheet" href="../../assets/css/styles.css">',
    '<script id="template-script">window.templateCodeRan=true</script>',
    '</head><body>',
    '<main><p data-dc-edit-id="txt_1234567890abcdef12" onclick="alert(1)">Original nested copy</p>',
    '<a href="../about.html">About</a>',
    '<picture><source srcset="../../assets/img/hero-small.webp?fit=crop 480w, ../../assets/img/hero-large.webp?v=2 960w">',
    '<img data-dc-image-id="img_nested_hero" src="../../assets/img/hero.webp" onerror="alert(2)" alt="Hero"></picture>',
    '<img data-dc-image-id="img_nested_logo" src="../../assets/img/logo.webp" alt="Logo">',
    '<video poster="../../assets/img/poster.webp?frame=1"></video>',
    '<div style="background:url(javascript:alert(3))">Unsafe style removed</div>',
    '</main><script defer src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script></body></html>',
  ].join(''),
  css: '.card{background-image:url(\'../img/pattern.webp\');color:#123456}',
  variationCSS: ':root{--dc-theme-color_primary:#7a315c;--dc-theme-font_body:Verdana,sans-serif}',
  inlineEdits: [{
    nodeId: 'txt_1234567890abcdef12',
    updated: 'Updated nested <copy>',
  }] satisfies InlineTextEdit[],
  imageSwaps: [{
    slotId: 'img_nested_hero',
    updated: 'https://cdn.example.test/customer/hero.webp',
  }] satisfies ImageSwap[],
  trustedEditorScript: '<script id="trusted-customer-editor">window.customerEditor=true</script>',
} as const
