import { NextRequest, NextResponse } from 'next/server'
import { readTemplateFile, hydrateTemplate, getTemplate } from '@/lib/templates/niche-registry'
import { buildVariationCSS } from '@/lib/templates/variations'
import { buildCustomThemeCss, type CustomTheme } from '@/lib/custom-theme'
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
    sanitizeCustomerValues(values),
    template.fields,
  )

  // Build variation CSS overrides
  const variationCSS = [
    buildVariationCSS(colorScheme, fontVariation, structureVariation),
    buildCustomThemeCss(customTheme),
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
