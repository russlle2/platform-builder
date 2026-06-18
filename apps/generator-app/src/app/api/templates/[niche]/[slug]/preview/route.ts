import { NextRequest, NextResponse } from 'next/server'
import { readTemplateFile, hydrateTemplate } from '@/lib/templates/niche-registry'
import { buildVariationCSS } from '@/lib/templates/variations'

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
  } = body as {
    page?: string
    values?: Record<string, string>
    colorScheme?: string
    fontVariation?: string
    structureVariation?: string
  }

  const [html, cssFile] = await Promise.all([
    readTemplateFile(niche, slug, page),
    readTemplateFile(niche, slug, 'assets/css/styles.css'),
  ])
  if (!html) {
    return NextResponse.json({ error: 'Template file not found' }, { status: 404 })
  }

  const hydrated = hydrateTemplate(html, values)

  // Build variation CSS overrides
  const variationCSS = buildVariationCSS(colorScheme, fontVariation, structureVariation)

  return NextResponse.json({
    html: hydrated,
    css: cssFile || null,
    variationCSS: variationCSS || null,
    page,
  })
}
