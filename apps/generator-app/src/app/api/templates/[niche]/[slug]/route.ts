import { NextResponse } from 'next/server'
import { getTemplate } from '@/lib/templates/niche-registry'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ niche: string; slug: string }> }
) {
  const { niche, slug } = await params
  const template = await getTemplate(niche, slug)

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  return NextResponse.json({
    slug: template.slug,
    name: template.name,
    niche: template.niche,
    nicheSlug: template.nicheSlug,
    layoutFamily: template.layoutFamily,
    voiceFamily: template.voiceFamily,
    pages: template.pages,
    fields: template.fields,
    snippet: template.snippet,
  })
}
