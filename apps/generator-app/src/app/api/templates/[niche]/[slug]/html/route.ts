import { NextRequest, NextResponse } from 'next/server'
import { readTemplateFile, hydrateTemplate, getTemplate } from '@/lib/templates/niche-registry'

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

  const template = getTemplate(niche, slug)
  if (!template) {
    return new NextResponse('Template not found', { status: 404 })
  }

  const html = readTemplateFile(niche, slug, page)
  if (!html) {
    return new NextResponse('Page not found', { status: 404 })
  }

  // Hydrate with empty values (placeholders cleared) for gallery view
  const hydrated = hydrateTemplate(html, {})

  // Rewrite asset paths
  const assetBase = `/api/templates/${niche}/${slug}/assets`
  let output = hydrated.replace(
    /(href|src)="(?!https?:\/\/|\/\/|data:|mailto:|tel:|#|\/api\/)([^"]+)"/g,
    (match: string, attr: string, path: string) => {
      if (path.endsWith('.html')) {
        return match
      }
      return `${attr}="${assetBase}/${path}"`
    }
  )

  // Inline the CSS if available
  const cssFile = readTemplateFile(niche, slug, 'assets/css/styles.css')
  if (cssFile) {
    output = output.replace('</head>', `<style>${cssFile}</style></head>`)
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
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
