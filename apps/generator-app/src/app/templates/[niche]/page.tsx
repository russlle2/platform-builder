import { getTemplatesForNiche, NICHE_META } from '@/lib/templates/niche-registry'
import Link from 'next/link'
import type { Metadata } from 'next'
import { TemplateGalleryGrid } from './GalleryGrid'

export async function generateStaticParams() {
  return Object.keys(NICHE_META).map((slug) => ({ niche: slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ niche: string }>
}): Promise<Metadata> {
  const { niche } = await params
  const meta = NICHE_META[niche]
  if (!meta) return { title: 'Templates' }
  return {
    title: `Browse ${meta.label} Templates | Platform Builder`,
    description: `Browse ${meta.label} website templates. Pick one, customize it with your business info, preview it live, then purchase.`,
  }
}

/* ---------- Accent map ---------- */
const accentMap: Record<string, { chip: string; heading: string; btn: string; glow: string; card: string }> = {
  emerald: { chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30', heading: 'text-emerald-200', btn: 'from-emerald-500 to-green-600 border-emerald-200/40', glow: 'rgba(16,185,129,0.3)', card: 'hover:border-emerald-400/40' },
  violet: { chip: 'bg-violet-500/10 text-violet-300 border-violet-400/30', heading: 'text-violet-200', btn: 'from-violet-500 to-purple-600 border-violet-200/40', glow: 'rgba(139,92,246,0.3)', card: 'hover:border-violet-400/40' },
  cyan: { chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30', heading: 'text-cyan-200', btn: 'from-cyan-500 to-blue-600 border-cyan-200/40', glow: 'rgba(34,211,238,0.3)', card: 'hover:border-cyan-400/40' },
  amber: { chip: 'bg-amber-500/10 text-amber-300 border-amber-400/30', heading: 'text-amber-200', btn: 'from-amber-500 to-orange-600 border-amber-200/40', glow: 'rgba(245,158,11,0.3)', card: 'hover:border-amber-400/40' },
  indigo: { chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-400/30', heading: 'text-indigo-200', btn: 'from-indigo-500 to-blue-600 border-indigo-200/40', glow: 'rgba(99,102,241,0.3)', card: 'hover:border-indigo-400/40' },
  rose: { chip: 'bg-rose-500/10 text-rose-300 border-rose-400/30', heading: 'text-rose-200', btn: 'from-rose-500 to-pink-600 border-rose-200/40', glow: 'rgba(244,63,94,0.3)', card: 'hover:border-rose-400/40' },
}

export default async function TemplateGalleryPage({
  params,
}: {
  params: Promise<{ niche: string }>
}) {
  const { niche } = await params
  const meta = NICHE_META[niche]

  if (!meta) {
    return (
      <main className="min-h-screen pt-24 pb-20">
        <div className="container-hvac text-center py-20">
          <h1 className="text-4xl font-bold text-white">Niche not found</h1>
          <Link href="/" className="text-cyan-300 mt-4 inline-block">Go home</Link>
        </div>
      </main>
    )
  }

  const templates = getTemplatesForNiche(niche)
  const colors = accentMap[meta.accent] || accentMap.cyan

  // Serialize template data for the client component
  const templateCards = templates.map((t) => ({
    slug: t.slug,
    name: t.name,
    layoutFamily: t.layoutFamily,
    voiceFamily: t.voiceFamily,
    pages: t.pages,
    fieldCount: t.fields.length,
    snippet: t.snippet,
  }))

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="container-hvac">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Link href={`/${niche}`} className="text-slate-400 hover:text-white transition-colors text-sm">
                ← {meta.label}
              </Link>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] border ${colors.chip}`}>
              {meta.icon} {templates.length} Templates
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Browse {meta.label} Templates
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl">
              Each template is unique — different layouts, voice styles, and page structures.
              Click any template to browse the full multi-page site, then customize when you are ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/preview-your-business"
                className="px-6 py-3 text-base font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40 text-center"
              >
                Preview Your Business
              </Link>
            </div>
          </div>
          <div className="glass-panel rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white">What&apos;s included</h2>
            <ul className="mt-4 space-y-3 text-slate-200">
              <li className="flex items-center gap-3"><span className="text-lg">📄</span> Multi-page website (6-8 pages)</li>
              <li className="flex items-center gap-3"><span className="text-lg">📱</span> Mobile-first responsive design</li>
              <li className="flex items-center gap-3"><span className="text-lg">🎨</span> Custom CSS + JavaScript included</li>
              <li className="flex items-center gap-3"><span className="text-lg">🔍</span> SEO meta tags + sitemap</li>
              <li className="flex items-center gap-3"><span className="text-lg">⚡</span> Instant preview with your info</li>
            </ul>
          </div>
        </div>

        {/* Template grid — client component with live iframe previews */}
        <TemplateGalleryGrid
          niche={niche}
          templates={templateCards}
          accentBtn={colors.btn}
          accentGlow={colors.glow}
          accentHeading={colors.heading}
          accentCard={colors.card}
        />

        {templates.length === 0 && (
          <div className="text-center py-20">
            <p className="text-2xl text-slate-400">No templates available yet for this niche.</p>
            <Link href="/" className="text-cyan-300 mt-4 inline-block">Browse all niches</Link>
          </div>
        )}
      </div>
    </main>
  )
}
