import { NextResponse } from 'next/server'
import { getNiches, getTemplatesForNiche } from '@/lib/templates/niche-registry'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ niche: string }> }
) {
  const { niche } = await params
  const niches = getNiches()
  const nicheInfo = niches.find((n) => n.slug === niche)

  if (!nicheInfo) {
    return NextResponse.json({ error: 'Niche not found' }, { status: 404 })
  }

  const templates = getTemplatesForNiche(niche).map((t) => ({
    slug: t.slug,
    name: t.name,
    nicheSlug: niche,
    layoutFamily: t.layoutFamily,
    voiceFamily: t.voiceFamily,
    pages: t.pages,
    snippet: t.snippet,
    fieldCount: t.fields.length,
  }))

  return NextResponse.json({ niche: nicheInfo, templates })
}
