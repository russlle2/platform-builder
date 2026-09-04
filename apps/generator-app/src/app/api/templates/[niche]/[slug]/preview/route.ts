import { NextRequest, NextResponse } from 'next/server'
import { readTemplateFile, getTemplateAtCatalogRevision } from '@/lib/templates/niche-registry'
import {
  snapshotCatalogRevision,
  type CatalogRevisionPin,
} from '@/lib/catalog-revision'
import { type CustomTheme } from '@/lib/custom-theme'
import {
  combineTemplateThemeStylesheets,
  composeTemplatePreview,
} from '@/lib/template-preview-composition'

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
    catalogRevision = null,
  } = body as {
    page?: string
    values?: Record<string, string>
    colorScheme?: string
    fontVariation?: string
    structureVariation?: string
    customTheme?: CustomTheme | null
    catalogRevision?: CatalogRevisionPin | null
  }

  let template
  try {
    template = await getTemplateAtCatalogRevision(niche, slug, catalogRevision)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Saved catalogue revision is unavailable',
    }, { status: 409 })
  }
  if (!template || typeof page !== 'string' || !template.pages.includes(page)) {
    return NextResponse.json({ error: 'Template page not found' }, { status: 404 })
  }
  const resolvedCatalogRevision = snapshotCatalogRevision(template)

  const stylesheetPaths = [...new Set(template.files.filter((file) => /\.css$/i.test(file)))].sort()
  const [html, ...stylesheetValues] = await Promise.all([
    readTemplateFile(niche, slug, page, resolvedCatalogRevision),
    ...stylesheetPaths.map((file) => readTemplateFile(niche, slug, file, resolvedCatalogRevision)),
  ])
  if (!html) {
    return NextResponse.json({ error: 'Template file not found' }, { status: 404 })
  }

  const stylesheets = stylesheetPaths.map((path, index) => ({
    path,
    css: stylesheetValues[index],
  }))
  const cssFile = stylesheets.find((entry) => entry.path === 'assets/css/styles.css')?.css || null
  const res = NextResponse.json({
    ...composeTemplatePreview({
      html,
      css: cssFile,
      themeStylesheet: combineTemplateThemeStylesheets(stylesheets),
      page,
      fields: template.fields,
      values: values && typeof values === 'object' && !Array.isArray(values) ? values : {},
      colorScheme,
      fontVariation,
      structureVariation,
      customTheme,
    }),
    catalogRevision: resolvedCatalogRevision,
  })
  // Personalized HTML can contain contact details and must never enter a shared cache.
  res.headers.set('Cache-Control', 'private, no-store')
  res.headers.set('Netlify-CDN-Cache-Control', 'no-store')
  return res
}
