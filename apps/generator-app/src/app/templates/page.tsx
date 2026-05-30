import Link from 'next/link'
import { getNiches } from '@/lib/templates/niche-registry'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse Website Templates',
  description: 'Browse 500+ unique website templates across aromatherapy, holistic medicine, therapy, sound bath, and wellness coaching.',
}

const accentMap: Record<string, { border: string; text: string; bg: string }> = {
  emerald: { border: 'border-emerald-400/30', text: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  violet: { border: 'border-violet-400/30', text: 'text-violet-300', bg: 'bg-violet-500/10' },
  cyan: { border: 'border-cyan-400/30', text: 'text-cyan-300', bg: 'bg-cyan-500/10' },
  amber: { border: 'border-amber-400/30', text: 'text-amber-300', bg: 'bg-amber-500/10' },
  indigo: { border: 'border-indigo-400/30', text: 'text-indigo-300', bg: 'bg-indigo-500/10' },
  rose: { border: 'border-rose-400/30', text: 'text-rose-300', bg: 'bg-rose-500/10' },
}

export default function TemplatesPage() {
  const niches = getNiches()
  const total = niches.reduce((sum, n) => sum + n.templateCount, 0)

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="container-wide">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-12">
          <div className="space-y-6">
            <span className="signal-chip">Templates</span>
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              {total}+ unique templates across {niches.length} industries
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl">
              Every template is professionally designed, mobile-first, and SEO-ready.
              Pick your industry to start browsing.
            </p>
            <Link
              href="/preview-your-business"
              className="inline-block px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40"
            >
              Preview Your Business
            </Link>
          </div>
          <div className="glass-panel rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white">What&apos;s included</h2>
            <ul className="mt-4 space-y-3 text-slate-200">
              <li>Multi-page website (6-8 pages each)</li>
              <li>Mobile-first responsive design</li>
              <li>SEO meta tags + sitemaps</li>
              <li>Instant live preview with your info</li>
              <li>Managed hosting + integrations</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {niches.map((niche) => {
            const accent = accentMap[niche.accent] || accentMap.cyan
            return (
              <Link
                key={niche.slug}
                href={`/templates/${niche.slug}`}
                className="card-mahogany space-y-4 hover:scale-[1.03] transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{niche.icon}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${accent.bg} ${accent.text} border ${accent.border}`}>
                    {niche.templateCount} templates
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-bright-white">{niche.label}</h3>
                <p className="text-gray-300 leading-relaxed text-sm">{niche.description}</p>
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${accent.text} group-hover:gap-2 transition-all`}>
                  Browse templates <span aria-hidden="true">→</span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
