import { NextRequest, NextResponse } from 'next/server'
import { readTemplateFile, hydrateTemplate, getTemplate } from '@/lib/templates/niche-registry'
import {
  rewriteTemplateAssetReferences,
  sanitizeTemplatePreviewHtml,
} from '@/lib/template-preview-security'

/**
 * GET endpoint that returns hydrated HTML for a template page.
 * Used by gallery thumbnail iframes and live preview navigation.
 * Query params: ?page=index.html
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ niche: string; slug: string }> }
) {
  const { niche, slug } = await params
  const url = new URL(req.url)
  const page = url.searchParams.get('page') || 'index.html'
  const browse = url.searchParams.get('browse') === '1'

  const template = await getTemplate(niche, slug)
  if (!template) {
    return new NextResponse('Template not found', { status: 404 })
  }
  if (!template.pages.includes(page)) {
    return new NextResponse('Page not found', { status: 404 })
  }

  const [html, cssFile] = await Promise.all([
    readTemplateFile(niche, slug, page),
    readTemplateFile(niche, slug, 'assets/css/styles.css'),
  ])
  if (!html) {
    return new NextResponse('Page not found', { status: 404 })
  }

  // Hydrate with empty values (placeholders cleared) for gallery view
  const hydrated = sanitizeTemplatePreviewHtml(hydrateTemplate(html, {}, template.fields))

  // Rewrite asset paths
  const assetBase = `/api/templates/${niche}/${slug}/assets`
  let output = rewriteTemplateAssetReferences(hydrated, assetBase, page)

  if (cssFile) {
    const rewrittenCss = rewriteTemplateAssetReferences(
      cssFile,
      assetBase,
      'assets/css/styles.css',
    )
    output = output.replace('</head>', `<style>${rewrittenCss}</style></head>`)
  }

  if (browse) {
    const browseNavScript = `<script>
(function(){
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href) return;
    if (href.endsWith('.html') || href === '/' || href === './') {
      e.preventDefault();
      e.stopPropagation();
      var page = href;
      if (page === '/' || page === './') page = 'index.html';
      if (!page.endsWith('.html')) page = page + '.html';
      page = page.replace(/^\\.?\\//, '');
      window.parent.postMessage({ type: 'templateBrowseNav', page: page }, '*');
    }
  });
})();
</script>`
    output = output.replace('</body>', `${browseNavScript}</body>`)
  }

  return new NextResponse(output, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Content-Security-Policy': "sandbox allow-scripts; default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline' https:; font-src 'self' data: https:; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
