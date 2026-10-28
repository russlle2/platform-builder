import Link from 'next/link'
import type { Metadata } from 'next'
import { SeoPageShell } from '@/components/seo/SeoPageShell'
import { SeoCtaGroup } from '@/components/seo/SeoCtaGroup'

export const metadata: Metadata = {
  title: 'Website Builder for Wellness Coaches',
  description:
    'Launch a coaching website with clear programs, credibility blocks, and discovery-call paths — guided templates for wellness coaches.',
  alternates: { canonical: '/website-builder-for-wellness-coaches' },
  openGraph: {
    title: 'Website Builder for Wellness Coaches | DailyClarity',
    description:
      'Launch a coaching website with clear programs, credibility blocks, and discovery-call paths — guided templates for wellness coaches.',
    url: '/website-builder-for-wellness-coaches',
    type: 'website',
    images: ['/og-image.png'],
  },
}

const DIFFERENTIATORS = [
  {
    title: 'Program-led structure',
    body: 'Show 1:1 coaching, intensives, and packages so visitors understand the container before they book.',
  },
  {
    title: 'Outcome-first copy flow',
    body: 'Templates guide you toward transformation language, proof, and a discovery call — not a vague “about us.”',
  },
  {
    title: 'Faster than starting from scratch',
    body: 'Pick a coaching template, add your details, preview live, and refine — without designing every section yourself.',
  },
]

export default function WebsiteBuilderForWellnessCoachesPage() {
  return (
    <SeoPageShell>
      <section className="container-hvac py-12 max-w-4xl mx-auto space-y-12">
        <div className="space-y-6">
          <span className="signal-chip">Wellness coaches</span>
          <h1 className="text-4xl md:text-5xl font-bold dc-text-heading leading-tight">
            Website builder for wellness coaches who sell programs, not just inspiration
          </h1>
          <p className="text-lg dc-text-body max-w-2xl">
            Broad builders let you make something beautiful. DailyClarity is narrower: guided templates for
            coaches who need clarity, credibility, and a path to a discovery call.
          </p>
          <SeoCtaGroup
            demoHref="/demo/wellness_coach"
            demoLabel="Watch Coaching Demo"
            accent="rose"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DIFFERENTIATORS.map((item) => (
            <div key={item.title} className="card-mahogany space-y-3">
              <h2 className="text-xl font-bold dc-text-heading">{item.title}</h2>
              <p className="dc-text-body text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold dc-text-heading">Built for how coaching buyers decide</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 dc-text-body">
            {[
              'Clear transformation outcome on the hero',
              'Programs and package comparison',
              'Credentials and methodology',
              'Testimonials and client stories',
              'Discovery call CTA',
              'Mobile-friendly contact paths',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-rose-400 mt-1">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="dc-text-muted text-sm">
            See{' '}
            <Link href="/wellness_coach" className="dc-text-rose hover:underline">
              wellness coach templates
            </Link>{' '}
            or use our{' '}
            <Link href="/wellness-website-checklist" className="dc-text-rose hover:underline">
              wellness website checklist
            </Link>
            .
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-10 text-center space-y-6">
          <h2 className="text-3xl font-bold dc-text-heading">Build your coaching preview</h2>
          <SeoCtaGroup
            demoHref="/demo/wellness_coach"
            demoLabel="Watch Coaching Demo"
            accent="rose"
            centered
          />
        </div>
      </section>
    </SeoPageShell>
  )
}
