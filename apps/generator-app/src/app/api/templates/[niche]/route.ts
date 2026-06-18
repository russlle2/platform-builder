import { NextResponse } from 'next/server'
import { getNiches, getTemplatesForNiche } from '@/lib/templates/niche-registry'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ niche: string }> }
) {
  const { niche } = await params
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12')))
  const seed = parseInt(searchParams.get('seed') || '0')
  const all = searchParams.get('all') === 'true'

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

  if (all) {
    return NextResponse.json({ niche: nicheInfo, templates, total: templates.length })
  }

  // Seeded Fisher-Yates shuffle for consistent pagination within a session
  const shuffled = [...templates]
  for (let i = shuffled.length - 1; i > 0; i--) {
    let x = Math.sin(seed + i) * 10000
    x = x - Math.floor(x)
    const j = Math.floor(x * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const start = (page - 1) * limit
  const paginated = shuffled.slice(start, start + limit)

  return NextResponse.json({
    niche: nicheInfo,
    templates: paginated,
    total: templates.length,
    page,
    limit,
    hasMore: start + limit < templates.length,
  })
}
