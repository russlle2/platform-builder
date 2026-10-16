import { NextRequest, NextResponse } from 'next/server'
import { readTemplateFile, hydrateTemplate, getTemplate } from '@/lib/templates/niche-registry'
import {
  rewriteTemplateAssetReferences,
  sanitizeTemplatePreviewCss,
  sanitizeTemplatePreviewHtml,
} from '@/lib/template-preview-security'
import { selectInjectableTemplateCss } from '@/lib/template-preview-composition'

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

  // Neutral examples make the public sample view readable without using a
  // real person's contact details or inventing credentials, services, or outcomes.
  // Preserve an authored field default when one exists.
  const sampleFallbacks: Record<string, string> = {
    BUSINESS_NAME: 'Example Practice',
    PRACTITIONER_NAME: 'Example Practitioner',
    TAGLINE: 'An introduction to your practice.',
    PRIMARY_CTA_LABEL: 'Get in touch',
    CTA_LABEL: 'Get in touch',
  }
  // Add defaults rather than customer values: a value for an aliased token
  // (for example PRIMARY_CTA_LABEL) must not replace an authored CTA_LABEL.
  const sampleFields = url.searchParams.get('sample') === '1'
    ? template.fields.map((field) => !field.default?.trim() && sampleFallbacks[field.name]
      ? { ...field, default: sampleFallbacks[field.name] }
      : field)
    : template.fields
  const hydrated = sanitizeTemplatePreviewHtml(hydrateTemplate(html, {}, sampleFields))

  // Rewrite asset paths
  const assetBase = `/api/templates/${niche}/${slug}/assets`
  let output = rewriteTemplateAssetReferences(hydrated, assetBase, page)

  const injectableCss = selectInjectableTemplateCss(html, cssFile)
  if (injectableCss) {
    const rewrittenCss = sanitizeTemplatePreviewCss(rewriteTemplateAssetReferences(
      injectableCss,
      assetBase,
      'assets/css/styles.css',
    ))
    if (rewrittenCss) output = output.replace(/<\/head\s*>/i, `<style>${rewrittenCss}</style></head>`)
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
