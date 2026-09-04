import { NextResponse } from 'next/server'
import { getTemplate } from '@/lib/templates/niche-registry'
import { snapshotCatalogRevision } from '@/lib/catalog-revision'

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
