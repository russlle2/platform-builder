import Link from 'next/link'
import type { Metadata } from 'next'
import { PLATFORM_DEMO_VIDEO, PLATFORM_DEMO_POSTER, PLATFORM_DEMO_CAPTIONS, PLATFORM_DEMO_TRANSCRIPT } from '@/lib/demo-videos'
import { DemoVideoPlayer } from '@/components/demo/DemoVideoPlayer'

export const metadata: Metadata = {
  title: 'Platform Build Walkthrough',
  description:
    'Watch your wellness website take shape: choose your practice, personalize a design, and explore the live preview. Includes captions and a transcript.',
  alternates: { canonical: '/demo/platform-builder' },
  openGraph: {
    title: 'Platform Build Walkthrough | DailyClarity',
    description:
      'Choose your practice, personalize a design, and see your website before you commit.',
    url: '/demo/platform-builder',
    type: 'website',
    images: [PLATFORM_DEMO_POSTER],
  },
}

export default function PlatformBuilderDemoPage() {
  return (
    <main className="relative min-h-screen pt-24 pb-20">
      <div className="container-hvac max-w-4xl space-y-8">
        <div className="space-y-4">
          <Link href="/demo" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← All demos
          </Link>
          <span className="signal-chip block w-fit">DailyClarity Platform Builder</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white">Platform build walkthrough</h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            From your first design choice to a website that feels like your practice. See how your
            details, style, and services come together in a real preview before you commit.
          </p>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <DemoVideoPlayer
            src={PLATFORM_DEMO_VIDEO}
            title="DailyClarity Platform Builder walkthrough"
            poster={PLATFORM_DEMO_POSTER}
            captionsSrc={PLATFORM_DEMO_CAPTIONS}
            transcriptSrc={PLATFORM_DEMO_TRANSCRIPT}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/preview-your-business"
            className="px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40 text-center"
          >
            Build My Preview
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all text-center"
          >
            See Pricing
          </Link>
        </div>
      </div>
    </main>
  )
}
