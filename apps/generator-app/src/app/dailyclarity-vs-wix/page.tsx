import Link from 'next/link'
import type { Metadata } from 'next'
import { SeoPageShell } from '@/components/seo/SeoPageShell'
import { SeoCtaGroup } from '@/components/seo/SeoCtaGroup'

export const metadata: Metadata = {
  title: 'DailyClarity vs Wix for Wellness Websites',
  description:
    'Compare DailyClarity and Wix for therapy, coaching, and wellness practices — flexibility vs guided, conversion-focused site structure.',
}

const COMPARISON_ROWS: { topic: string; wix: string; dailyclarity: string }[] = [
  {
    topic: 'Primary strength',
    wix: 'Broad design freedom across industries',
    dailyclarity: 'Guided launch for wellness and service practices',
  },
  {
    topic: 'Template starting point',
    wix: 'Large library; you shape the structure',
    dailyclarity: 'Niche templates with booking-oriented sections',
  },
  {
    topic: 'Content setup',
    wix: 'You build page by page',
    dailyclarity: 'Business info populates across pages in one flow',
  },
  {
    topic: 'Best when you want',
    wix: 'Maximum layout control and many integrations',
    dailyclarity: 'Faster path to a client-ready wellness site',
  },
  {
    topic: 'Conversion focus',
    wix: 'Depends on how you design it',
    dailyclarity: 'Built around consult, booking, and inquiry paths',
  },
]

export default function DailyClarityVsWixPage() {
  return (
    <SeoPageShell>
      <section className="container-hvac py-12 max-w-4xl mx-auto space-y-12">
        <div className="space-y-6">
          <span className="signal-chip">Comparison</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            DailyClarity vs Wix for wellness and service businesses
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Wix is a capable, broad platform. DailyClarity is intentionally narrower — built for practitioners
            who need a site that guides visitors toward contact, not just a polished homepage.
          </p>
          <SeoCtaGroup demoHref="/demo/platform-builder" demoLabel="Watch Demo" accent="cyan" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-8 space-y-4">
            <h2 className="text-2xl font-bold text-white">Who Wix is best for</h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex gap-2">
                <span className="text-slate-500 shrink-0">•</span>
                Businesses that want deep design control and a wide app marketplace
              </li>
              <li className="flex gap-2">
                <span className="text-slate-500 shrink-0">•</span>
                Teams comfortable planning site architecture from scratch
              </li>
              <li className="flex gap-2">
                <span className="text-slate-500 shrink-0">•</span>
                Stores, portfolios, and multi-purpose sites beyond wellness services
              </li>
            </ul>
          </div>
          <div className="glass-panel rounded-2xl p-8 space-y-4 border border-cyan-400/20">
            <h2 className="text-2xl font-bold text-cyan-200">Who DailyClarity is best for</h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex gap-2">
                <span className="text-cyan-400 shrink-0">•</span>
                Therapists, coaches, sound healers, aromatherapists, and integrative practitioners
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 shrink-0">•</span>
                Owners who want guided templates instead of an open canvas
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 shrink-0">•</span>
                Practices prioritizing consult booking, clarity, and mobile contact paths
              </li>
            </ul>
          </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 font-semibold text-slate-300">Topic</th>
                  <th className="px-6 py-4 font-semibold text-slate-300">Wix</th>
                  <th className="px-6 py-4 font-semibold text-cyan-200">DailyClarity</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.topic} className="border-b border-white/5">
                    <td className="px-6 py-4 font-medium text-white">{row.topic}</td>
                    <td className="px-6 py-4 text-slate-300">{row.wix}</td>
                    <td className="px-6 py-4 text-slate-200">{row.dailyclarity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-mahogany space-y-4">
          <h2 className="text-2xl font-bold text-white">Why wellness sites need more than a pretty design</h2>
          <p className="text-slate-300 leading-relaxed">
            Visitors to therapy, coaching, or healing practice sites are often cautious. They need to understand
            your offer, trust your credentials, see how booking works, and feel safe reaching out — especially on
            mobile. A beautiful layout helps, but structure does the conversion work: specialties, session
            expectations, programs, FAQ, local presence, and a clear contact path.
          </p>
          <p className="text-slate-300 leading-relaxed">
            DailyClarity starts from that structure. Wix can absolutely support it — with the time and planning
            you put in. The difference is focus: breadth and flexibility versus a guided, wellness-specific path.
          </p>
          <Link href="/wellness-website-checklist" className="text-cyan-300 font-semibold hover:underline">
            Use our wellness website checklist →
          </Link>
        </div>

        <div className="glass-panel rounded-3xl p-10 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">See the guided preview flow</h2>
          <p className="text-slate-300 max-w-xl mx-auto">
            Build a live preview with your business details, or watch the platform walkthrough first.
          </p>
          <SeoCtaGroup demoHref="/demo/platform-builder" demoLabel="Watch Demo" accent="cyan" centered />
        </div>
      </section>
    </SeoPageShell>
  )
}
