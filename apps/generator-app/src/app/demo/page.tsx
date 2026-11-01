import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { DEMO_HUB_ITEMS } from '@/lib/demo-videos'
import { DemoVideoPlayer } from '@/components/demo/DemoVideoPlayer'

export const metadata: Metadata = {
  title: 'Watch a Build Walkthrough',
  description:
    'Explore five practice-specific website demos and a DailyClarity overview. See real previews, design choices, and personalization, with captions and transcripts.',
  alternates: { canonical: '/demo' },
  openGraph: {
    title: 'Watch a Build Walkthrough | DailyClarity',
    description:
      'Find the demo for your practice and see your website take shape with DailyClarity.',
    url: '/demo',
    type: 'website',
    images: [DEMO_HUB_ITEMS[0].posterSrc || '/og-image.png'],
  },
}

export default function DemoHubPage() {
  const featured = DEMO_HUB_ITEMS[0]

  return (
    <main className="relative min-h-screen pt-24 pb-20 overflow-hidden">
      <div className="dc-background-art absolute inset-0 pointer-events-none overflow-hidden">
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
          <h1 className="text-4xl md:text-5xl font-bold dc-text-heading">Watch a build walkthrough</h1>
          <p className="text-lg dc-text-body max-w-2xl">
            Find your practice below, or start with the overview. See real website previews and the
            choices that make a design feel like your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/preview-your-business"
              className="px-8 py-4 text-lg font-bold rounded-lg dc-button-primary shadow-lg border border-cyan-200/40 text-center"
            >
              Build My Preview
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 text-lg font-bold dc-text-heading border dc-border rounded-lg hover:dc-surface-soft text-center"
            >
              See Pricing
            </Link>
          </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border dc-border">
          <DemoVideoPlayer src={featured.videoSrc} title={featured.title} poster={featured.posterSrc} captionsSrc={featured.captionsSrc} transcriptSrc={featured.transcriptSrc} />
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t dc-border">
            <p className="text-sm dc-text-body">{featured.description}</p>
            <Link href={featured.href} className="text-sm font-semibold dc-text-accent hover:dc-text-accent">
              Open full demo page →
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold dc-text-heading mb-6">All walkthroughs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DEMO_HUB_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="card-mahogany p-6 space-y-3 hover:scale-[1.02] transition-transform group"
              >
                {item.posterSrc && <div className="dc-practice-poster"><Image src={item.posterSrc} alt="" fill sizes="(min-width: 640px) 450px, 90vw" /></div>}
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold dc-text-heading group-hover:dc-text-accent transition-colors">
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm dc-text-muted">{item.description}</p>
                <span className="text-sm font-semibold dc-text-accent">Watch demo →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
