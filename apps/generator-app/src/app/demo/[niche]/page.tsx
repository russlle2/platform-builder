import { NICHE_DEMO_VIDEO, NICHE_DEMO_POSTER, NICHE_DEMO_CAPTIONS, NICHE_DEMO_TRANSCRIPT, ACTIVE_DEMO_NICHES, DEMO_HUB_ITEMS } from '@/lib/demo-videos'
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
  if (!meta) return { title: 'Demo', robots: { index: false, follow: false } }
  const title = `${meta.label} Build Walkthrough`
  const description = `See a ${meta.label.toLowerCase()} website take shape with your business details, design choices, and a live preview. Watch with captions or read the transcript.`
  return {
    title,
    description,
    alternates: { canonical: `/demo/${niche}` },
    openGraph: {
      title: `${title} | DailyClarity`,
      description,
      url: `/demo/${niche}`,
      type: 'website',
      images: [NICHE_DEMO_POSTER[niche] || '/og-image.png'],
    },
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
  const demo = DEMO_HUB_ITEMS.find((item) => item.id === niche)
  if (!meta || !videoSrc) {
    notFound()
  }

  return (
    <main className="relative min-h-screen pt-24 pb-20">
      <div className="container-hvac max-w-4xl space-y-8">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/demo" className="dc-text-muted hover:dc-text-heading transition-colors">
              ← All demos
            </Link>
            <Link href={`/${niche}`} className="dc-text-muted hover:dc-text-heading transition-colors">
              {meta.label} landing →
            </Link>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold dc-text-heading">
            {meta.label} build walkthrough
          </h1>
          <p className="text-lg dc-text-body max-w-2xl">
            {demo?.description || `See how a ${meta.label.toLowerCase()} site comes together with your business details and a live preview.`}
          </p>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border dc-border">
          <DemoVideoPlayer
            src={videoSrc}
            title={`${meta.label} build walkthrough`}
            poster={NICHE_DEMO_POSTER[niche]}
            captionsSrc={NICHE_DEMO_CAPTIONS[niche]}
            transcriptSrc={NICHE_DEMO_TRANSCRIPT[niche]}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={`/preview-your-business?niche=${encodeURIComponent(niche)}`}
            className="px-8 py-4 text-lg font-bold rounded-lg dc-button-primary shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40 text-center"
          >
            Build My Preview
          </Link>
          <Link
            href={`/${niche}`}
            className="px-8 py-4 text-lg font-bold dc-text-heading border dc-border rounded-lg hover:dc-surface-soft transition-all text-center"
          >
            See {meta.label} Examples
          </Link>
        </div>
      </div>
    </main>
  )
}
