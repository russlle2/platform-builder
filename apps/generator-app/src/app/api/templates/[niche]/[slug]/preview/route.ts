import { NextRequest, NextResponse } from 'next/server'
import { readTemplateFile, hydrateTemplate, getTemplate } from '@/lib/templates/niche-registry'
import { buildVariationCSS } from '@/lib/templates/variations'
import { buildCustomThemeCss, type CustomTheme } from '@/lib/custom-theme'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ niche: string; slug: string }> }
) {
  const { niche, slug } = await params
  const body = await req.json()
  const {
    page = 'index.html',
    values = {},
    colorScheme = 'original',
    fontVariation = 'original',
    structureVariation = 'original',
    customTheme = null,
  } = body as {
    page?: string
    values?: Record<string, string>
    colorScheme?: string
    fontVariation?: string
    structureVariation?: string
    customTheme?: CustomTheme | null
  }

  const template = await getTemplate(niche, slug)
  if (!template || typeof page !== 'string' || !template.pages.includes(page)) {
    return NextResponse.json({ error: 'Template page not found' }, { status: 404 })
  }

  const [html, cssFile] = await Promise.all([
    readTemplateFile(niche, slug, page),
    readTemplateFile(niche, slug, 'assets/css/styles.css'),
  ])
  if (!html) {
    return NextResponse.json({ error: 'Template file not found' }, { status: 404 })
  }

  const hydrated = hydrateTemplate(
    html,
    values && typeof values === 'object' && !Array.isArray(values) ? values : {},
    template.fields,
  )

  // Build variation CSS overrides
  const variationCSS = [
    buildVariationCSS(colorScheme, fontVariation, structureVariation, cssFile || ''),
    buildCustomThemeCss(customTheme, cssFile || ''),
  ].filter(Boolean).join('\n')

  const res = NextResponse.json({
    html: hydrated,
    css: cssFile || null,
    variationCSS: variationCSS || null,
    page,
  })
  // Personalized HTML can contain contact details and must never enter a shared cache.
  res.headers.set('Cache-Control', 'private, no-store')
  res.headers.set('Netlify-CDN-Cache-Control', 'no-store')
  return res
}
