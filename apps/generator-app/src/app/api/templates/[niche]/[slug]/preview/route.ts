import { NextRequest, NextResponse } from 'next/server'
import { readTemplateFile, getTemplate } from '@/lib/templates/niche-registry'
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

  const stylesheetPaths = [...new Set(template.files.filter((file) => /\.css$/i.test(file)))].sort()
  const [html, ...stylesheetValues] = await Promise.all([
    readTemplateFile(niche, slug, page),
    ...stylesheetPaths.map((file) => readTemplateFile(niche, slug, file)),
  ])
  if (!html) {
    return NextResponse.json({ error: 'Template file not found' }, { status: 404 })
  }

  const stylesheets = stylesheetPaths.map((path, index) => ({
    path,
    css: stylesheetValues[index],
  }))
  const cssFile = stylesheets.find((entry) => entry.path === 'assets/css/styles.css')?.css || null
  const res = NextResponse.json(composeTemplatePreview({
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
  }))
  // Personalized HTML can contain contact details and must never enter a shared cache.
  res.headers.set('Cache-Control', 'private, no-store')
  res.headers.set('Netlify-CDN-Cache-Control', 'no-store')
  return res
}
