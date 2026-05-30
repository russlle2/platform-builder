import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTemplate, NICHE_META } from '@/lib/templates/niche-registry'
import { TemplateFullSiteViewer } from '@/components/TemplateFullSiteViewer'

const accentMap: Record<string, { chip: string; btn: string }> = {
  emerald: { chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30', btn: 'from-emerald-500 to-green-600 border-emerald-200/40' },
  violet: { chip: 'bg-violet-500/10 text-violet-300 border-violet-400/30', btn: 'from-violet-500 to-purple-600 border-violet-200/40' },
  cyan: { chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30', btn: 'from-cyan-500 to-blue-600 border-cyan-200/40' },
  amber: { chip: 'bg-amber-500/10 text-amber-300 border-amber-400/30', btn: 'from-amber-500 to-orange-600 border-amber-200/40' },
  indigo: { chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-400/30', btn: 'from-indigo-500 to-blue-600 border-indigo-200/40' },
  rose: { chip: 'bg-rose-500/10 text-rose-300 border-rose-400/30', btn: 'from-rose-500 to-pink-600 border-rose-200/40' },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ niche: string; slug: string }>
}): Promise<Metadata> {
  const { niche, slug } = await params
  const template = getTemplate(niche, slug)
  const meta = NICHE_META[niche]
  if (!template || !meta) return { title: 'Template preview' }
  return {
    title: `Preview ${template.name} | ${meta.label}`,
    description: `Browse all ${template.pages.length} pages of the ${template.name} website template.`,
  }
}

export default async function TemplateViewPage({
  params,
}: {
  params: Promise<{ niche: string; slug: string }>
}) {
  const { niche, slug } = await params
  const meta = NICHE_META[niche]
  const template = getTemplate(niche, slug)

  if (!meta || !template) {
    notFound()
  }

  const colors = accentMap[meta.accent] || accentMap.cyan

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="container-wide">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
          <Link href={`/${niche}`} className="hover:text-white transition-colors">
            {meta.label}
          </Link>
          <span>/</span>
          <Link href={`/templates/${niche}`} className="hover:text-white transition-colors">
            Templates
          </Link>
          <span>/</span>
          <span className="text-white">{template.name}</span>
        </div>

        <TemplateFullSiteViewer
          niche={niche}
          slug={slug}
          templateName={template.name}
          pages={template.pages}
          nicheLabel={meta.label}
          accentBtn={colors.btn}
          accentChip={colors.chip}
        />
      </div>
    </main>
  )
}
