import { NextResponse } from 'next/server'
import { getTemplateAtCatalogRevision } from '@/lib/templates/niche-registry'
import { snapshotCatalogRevision } from '@/lib/catalog-revision'

async function templateResponse(
  params: Promise<{ niche: string; slug: string }>,
  catalogRevision?: unknown,
) {
  const { niche, slug } = await params
  let template
  try {
    template = await getTemplateAtCatalogRevision(niche, slug, catalogRevision)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Saved catalogue revision is unavailable',
    }, { status: 409 })
  }

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
    editable: template.editable,
    validation: template.validation,
    ...(template.validation?.contractVersion === 3 ? {
      legacySlug: template.legacySlug,
      designId: template.designId,
      contentPresetId: template.contentPresetId,
      themePresetId: template.themePresetId,
      qualityReceipt: template.qualityReceipt,
      canonicalLegacySlug: template.canonicalLegacySlug,
      disposition: template.disposition,
      catalogRevision: snapshotCatalogRevision(template),
    } : {}),
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ niche: string; slug: string }> },
) {
  return templateResponse(params)
}

/** Portal editors POST their server-issued pin so metadata cannot drift. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ niche: string; slug: string }> },
) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }
  const catalogRevision = body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>).catalogRevision
    : undefined
  if (catalogRevision === undefined || catalogRevision === null) {
    return NextResponse.json({ error: 'Catalogue revision pin is required' }, { status: 400 })
  }
  return templateResponse(params, catalogRevision)
}
