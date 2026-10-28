import Link from 'next/link'
import type { Metadata } from 'next'
import { PLATFORM_DEMO_VIDEO, PLATFORM_DEMO_POSTER, PLATFORM_DEMO_CAPTIONS, PLATFORM_DEMO_TRANSCRIPT } from '@/lib/demo-videos'
import { DemoVideoPlayer } from '@/components/demo/DemoVideoPlayer'

export const metadata: Metadata = {
  title: 'Complete Customer Walkthrough',
  description:
    'Watch the complete 3:47 customer walkthrough: preview, test checkout, site provisioning, custom photos, editing, publishing, enquiries, and your portal. Includes captions and a transcript.',
  alternates: { canonical: '/demo/platform-builder' },
  openGraph: {
    title: 'Complete Customer Walkthrough | DailyClarity',
    description:
      'From the first preview to a published website, custom photos, enquiries, and your customer portal.',
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
          <Link href="/demo" className="text-sm dc-text-muted hover:dc-text-heading transition-colors">
            ← All demos
          </Link>
          <span className="signal-chip block w-fit">Full customer journey · 3:47</span>
          <h1 className="text-4xl md:text-5xl font-bold dc-text-heading">From preview to published website</h1>
          <p className="text-lg dc-text-body max-w-2xl">
            Follow Willow and Coast Wellness through the whole process: choose a design, complete
            a test checkout, upload custom photos, edit and publish the site, and manage enquiries
            and billing from the customer portal.
          </p>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border dc-border">
          <DemoVideoPlayer
            src={PLATFORM_DEMO_VIDEO}
            title="DailyClarity complete customer walkthrough — 3 minutes 47 seconds"
            poster={PLATFORM_DEMO_POSTER}
            captionsSrc={PLATFORM_DEMO_CAPTIONS}
            transcriptSrc={PLATFORM_DEMO_TRANSCRIPT}
          />
        </div>

        <p className="text-sm dc-text-muted">This walkthrough uses an example business and a test checkout with no real charge.</p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/preview-your-business"
            className="px-8 py-4 text-lg font-bold rounded-lg dc-button-primary shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40 text-center"
          >
            Build My Preview
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 text-lg font-bold dc-text-heading border dc-border rounded-lg hover:dc-surface-soft transition-all text-center"
          >
            See Pricing
          </Link>
        </div>
      </div>
    </main>
  )
}
