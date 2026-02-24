import { NextRequest, NextResponse } from 'next/server'
import { readTemplateFile, hydrateTemplate } from '@/lib/templates/niche-registry'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ niche: string; slug: string }> }
) {
  const { niche, slug } = await params
  const body = await req.json()
  const { page = 'index.html', values = {} } = body as {
    page?: string
    values?: Record<string, string>
  }

  const html = readTemplateFile(niche, slug, page)
  if (!html) {
    return NextResponse.json({ error: 'Template file not found' }, { status: 404 })
  }

  const hydrated = hydrateTemplate(html, values)

  // Also hydrate linked CSS/JS if in the same template
  const cssFile = readTemplateFile(niche, slug, 'assets/css/styles.css')

  return NextResponse.json({
    html: hydrated,
    css: cssFile || null,
    page,
  })
}
