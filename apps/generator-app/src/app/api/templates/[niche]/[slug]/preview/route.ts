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
import { sanitizeCustomerValues } from '@/lib/site-deploy'
import { jsonTooManyRequests, rateLimitByIp } from '@/lib/server-auth'
import { readBoundedJson } from '@/lib/bounded-json'

const MAX_PREVIEW_REQUEST_BYTES = 256_000

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ niche: string; slug: string }> }
) {
  if (!rateLimitByIp(req, 'template-preview', 60, 60_000)) {
    return jsonTooManyRequests()
  }
  const parsedBody = await readBoundedJson(req, MAX_PREVIEW_REQUEST_BYTES)
  if (!parsedBody.ok && parsedBody.reason === 'too_large') {
    return NextResponse.json({ error: 'Preview request is too large.' }, { status: 413 })
  }
  const { niche, slug } = await params
  const body = parsedBody.ok ? parsedBody.value : null
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid preview request.' }, { status: 400 })
  }
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
      values: sanitizeCustomerValues(values),
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
