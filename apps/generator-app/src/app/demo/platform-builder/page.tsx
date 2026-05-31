import Link from 'next/link'
import type { Metadata } from 'next'
import { LiveDemoPreview } from '@/components/demo/LiveDemoPreview'

export const metadata: Metadata = {
  title: 'Watch the Platform Builder Demo',
  description:
    'See how DailyClarity Platform Builder turns your business details into a client-ready website preview — then edit, checkout, and launch in one guided flow.',
}

export default function PlatformBuilderDemoPage() {
  return (
    <main className="relative min-h-screen pt-24 pb-24 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 900px 700px at 12% 10%, rgba(34,211,238,0.12), transparent)',
              'radial-gradient(ellipse 700px 900px at 88% 20%, rgba(139,92,246,0.10), transparent)',
            ].join(', '),
          }}
        />
      </div>

      <div className="relative z-10 space-y-16">
        {/* Demo hero */}
        <section className="container-hvac">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <span className="signal-chip">Platform Builder demo</span>
            <h1 className="text-4xl md:text-5xl font-bold text-bright-white">
              Watch your business become a client-ready website.
            </h1>
            <p className="text-lg text-slate-200">
              A short walkthrough of the guided flow: enter your details, preview a complete site
              with your real business info, edit copy and images live, then checkout and launch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/preview-your-business" className="cta-button">
                Build My Client-Ready Preview
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Demo video placeholder — honest until the recorded walkthrough is published */}
        <section className="container-hvac">
          <div className="glass-panel rounded-3xl p-4 md:p-6 max-w-4xl mx-auto">
            <div className="aspect-video w-full rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col items-center justify-center text-center px-6 space-y-3">
              <span className="text-5xl">▶</span>
              <p className="text-lg font-semibold text-white">Full walkthrough video coming soon</p>
              <p className="text-sm text-slate-300 max-w-md">
                A recorded end-to-end demo is being produced. In the meantime, the live preview
                below shows exactly how a finished build looks and behaves.
              </p>
            </div>
          </div>
        </section>

        {/* Live, interactive preview */}
        <LiveDemoPreview />
      </div>
    </main>
  )
}
