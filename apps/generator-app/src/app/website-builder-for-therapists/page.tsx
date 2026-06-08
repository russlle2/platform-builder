import Link from 'next/link'
import type { Metadata } from 'next'
import { SeoPageShell } from '@/components/seo/SeoPageShell'
import { SeoCtaGroup } from '@/components/seo/SeoCtaGroup'

export const metadata: Metadata = {
  title: 'Website Builder for Therapists | DailyClarity',
  description:
    'A guided website builder for private practice therapists — templates with specialties, session expectations, fees, and consult paths built in.',
}

const DIFFERENTIATORS = [
  {
    title: 'Built for therapy practices',
    body: 'Layouts emphasize emotional safety, specialties, and first-session clarity — not generic business blocks.',
  },
  {
    title: 'Guided, not wide open',
    body: 'Enter your practice details once; pages populate with structure visitors expect before they request a consult.',
  },
  {
    title: 'Conversion-focused sections',
    body: 'Fees, insurance, telehealth, FAQ, and contact paths are part of the template story — not afterthoughts.',
  },
]

export default function WebsiteBuilderForTherapistsPage() {
  return (
    <SeoPageShell>
      <section className="container-hvac py-12 max-w-4xl mx-auto space-y-12">
        <div className="space-y-6">
          <span className="signal-chip">Private practice therapists</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Website builder for therapists who need trust before the first call
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Generic website builders give you pages. DailyClarity gives you a guided launch for private practice
            therapy — with templates shaped around how clients actually choose a therapist online.
          </p>
          <SeoCtaGroup
            demoHref="/demo/private_practice_therapist"
            demoLabel="Watch Therapist Demo"
            accent="amber"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DIFFERENTIATORS.map((item) => (
            <div key={item.title} className="card-mahogany space-y-3">
              <h2 className="text-xl font-bold text-white">{item.title}</h2>
              <p className="text-slate-300 text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">What your therapy site should cover</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
            {[
              'Specialties and who you help',
              'Approach and therapeutic style',
              'First-session expectations',
              'Fees, insurance, and telehealth',
              'Consult or intake request CTA',
              'Local and mobile-friendly contact',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-slate-400 text-sm">
            Explore{' '}
            <Link href="/private_practice_therapist" className="text-amber-300 hover:underline">
              therapist landing page
            </Link>{' '}
            or{' '}
            <Link href="/preview-your-business?niche=private_practice_therapist" className="text-amber-300 hover:underline">
              start your preview
            </Link>
            .
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-10 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">Preview your practice site in minutes</h2>
          <p className="text-slate-300 max-w-xl mx-auto">
            Add your practice details, match a template, and see a live preview before you purchase.
          </p>
          <SeoCtaGroup
            demoHref="/demo/private_practice_therapist"
            demoLabel="Watch Therapist Demo"
            accent="amber"
            centered
          />
        </div>
      </section>
    </SeoPageShell>
  )
}
