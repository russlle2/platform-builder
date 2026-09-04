import { NICHE_DEMO_VIDEO, NICHE_DEMO_POSTER, ACTIVE_DEMO_NICHES } from '@/lib/demo-videos'
import { NICHE_META } from '@/lib/templates/niche-registry'
import { DemoVideoPlayer } from '@/components/demo/DemoVideoPlayer'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return ACTIVE_DEMO_NICHES.map((niche) => ({ niche }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ niche: string }>
}): Promise<Metadata> {
  const { niche } = await params
  const meta = NICHE_META[niche]
  if (!meta) return { title: 'Demo' }
  return {
    title: `${meta.label} Build Walkthrough | DailyClarity`,
    description: `Watch a full ${meta.label.toLowerCase()} website build and customization walkthrough.`,
  }
}

export default async function NicheDemoPage({
  params,
}: {
  params: Promise<{ niche: string }>
}) {
  const { niche } = await params
  const meta = NICHE_META[niche]
  const videoSrc = NICHE_DEMO_VIDEO[niche]
  if (!meta || !videoSrc) {
    notFound()
  }

  return (
    <main className="relative min-h-screen pt-24 pb-20">
      <div className="container-wide max-w-4xl space-y-8">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/demo" className="text-slate-400 hover:text-white transition-colors">
              ← All demos
            </Link>
            <Link href={`/${niche}`} className="text-slate-400 hover:text-white transition-colors">
              {meta.label} landing →
            </Link>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            {meta.icon} {meta.label} build walkthrough
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            See how a {meta.label.toLowerCase()} site comes together — template selection, your business
            details, live preview, and launch-ready pages.
          </p>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <DemoVideoPlayer
            src={videoSrc}
            title={`${meta.label} build walkthrough`}
            poster={NICHE_DEMO_POSTER[niche]}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={`/preview-your-business?niche=${encodeURIComponent(niche)}`}
            className="px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40 text-center"
          >
            Build My Preview
          </Link>
          <Link
            href={`/${niche}`}
            className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all text-center"
          >
            See {meta.label} Examples
          </Link>
        </div>
      </div>
    </main>
  )
}
