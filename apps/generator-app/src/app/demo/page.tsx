import Link from 'next/link'
import type { Metadata } from 'next'
import { DEMO_HUB_ITEMS } from '@/lib/demo-videos'
import { DemoVideoPlayer } from '@/components/demo/DemoVideoPlayer'

export const metadata: Metadata = {
  title: 'Watch a Build Walkthrough',
  description:
    'See how DailyClarity Platform Builder guides wellness and practice owners from business info to a live, booking-ready website preview.',
}

export default function DemoHubPage() {
  const featured = DEMO_HUB_ITEMS[0]

  return (
    <main className="relative min-h-screen pt-24 pb-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 800px 600px at 15% 10%, rgba(34,211,238,0.12), transparent)',
              'radial-gradient(ellipse 600px 800px at 85% 20%, rgba(139,92,246,0.09), transparent)',
            ].join(', '),
          }}
        />
      </div>

      <div className="relative z-10 container-hvac max-w-5xl space-y-12">
        <div className="space-y-4">
          <span className="signal-chip">DailyClarity Platform Builder</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white">Watch a build walkthrough</h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            See how a guided site comes together — niche selection, your business details, live preview,
            and pages structured for trust and booking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/preview-your-business"
              className="px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg border border-cyan-200/40 text-center"
            >
              Build My Preview
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 text-center"
            >
              See Pricing
            </Link>
          </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <DemoVideoPlayer src={featured.videoSrc} title={featured.title} />
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
            <p className="text-sm text-slate-300">{featured.description}</p>
            <Link href={featured.href} className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
              Open full demo page →
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-6">All walkthroughs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DEMO_HUB_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="card-mahogany p-6 space-y-3 hover:scale-[1.02] transition-transform group"
              >
                <div className="flex items-center gap-3">
                  {item.icon && <span className="text-2xl">{item.icon}</span>}
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-400">{item.description}</p>
                <span className="text-sm font-semibold text-cyan-300">Watch demo →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
