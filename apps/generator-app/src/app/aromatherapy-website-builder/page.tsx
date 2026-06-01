import Link from 'next/link'
import type { Metadata } from 'next'
import { SeoPageShell } from '@/components/seo/SeoPageShell'
import { SeoCtaGroup } from '@/components/seo/SeoCtaGroup'

export const metadata: Metadata = {
  title: 'Aromatherapy Website Builder | DailyClarity',
  description:
    'Guided aromatherapy website builder with blend menus, safety guidance, workshop paths, and consultation CTAs for scent-based practices.',
}

export default function AromatherapyWebsiteBuilderPage() {
  return (
    <SeoPageShell>
      <section className="container-hvac py-12 max-w-4xl mx-auto space-y-12">
        <div className="space-y-6">
          <span className="signal-chip">Aromatherapy</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Aromatherapy website builder for studios, blend makers, and scent practitioners
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            DailyClarity is narrower than a general-purpose builder — focused on wellness businesses that need
            to explain offerings, build sensory trust, and guide visitors toward consults, workshops, or packages.
          </p>
          <SeoCtaGroup demoHref="/demo/aromatherapy" demoLabel="Watch Aromatherapy Demo" accent="emerald" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Explain your blends',
              body: 'Service and product sections designed for scent profiles, rituals, and custom formulation — not generic “services.”',
            },
            {
              title: 'Safety and credibility',
              body: 'Room for dilution guidance, contraindications, and practitioner story so clients feel informed.',
            },
            {
              title: 'Clear next steps',
              body: 'Consultation, workshop, and package CTAs with email or phone capture for early-stage leads.',
            },
          ].map((item) => (
            <div key={item.title} className="card-mahogany space-y-3">
              <h2 className="text-xl font-bold text-white">{item.title}</h2>
              <p className="text-slate-300 text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Compared to a DIY site builder</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Flexible builders excel when you already know every section you need. DailyClarity starts with
            aromatherapy-specific page flow — so you spend less time deciding structure and more time refining
            copy and imagery.
          </p>
          <Link href="/aromatherapy" className="text-emerald-300 font-semibold hover:underline">
            View aromatherapy templates →
          </Link>
        </div>

        <div className="glass-panel rounded-3xl p-10 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">Build your aromatherapy preview</h2>
          <SeoCtaGroup
            demoHref="/demo/aromatherapy"
            demoLabel="Watch Aromatherapy Demo"
            accent="emerald"
            centered
          />
        </div>
      </section>
    </SeoPageShell>
  )
}
