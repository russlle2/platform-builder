import Link from 'next/link'
import type { Metadata } from 'next'
import { SeoPageShell } from '@/components/seo/SeoPageShell'
import { SeoCtaGroup } from '@/components/seo/SeoCtaGroup'

export const metadata: Metadata = {
  title: 'Sound Bath Website Templates',
  description:
    'Immersive sound bath and sound healing website templates with session info, contraindications, event booking, and inquiry paths.',
  alternates: { canonical: '/sound-bath-website-template' },
  openGraph: {
    title: 'Sound Bath Website Templates | DailyClarity',
    description:
      'Immersive sound bath and sound healing website templates with session info, contraindications, event booking, and inquiry paths.',
    url: '/sound-bath-website-template',
    type: 'website',
    images: ['/og-image.png'],
  },
}

export default function SoundBathWebsiteTemplatePage() {
  return (
    <SeoPageShell>
      <section className="container-hvac py-12 max-w-4xl mx-auto space-y-12">
        <div className="space-y-6">
          <span className="signal-chip">Sound bath & sound healing</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Sound bath website templates that make the room feel real online
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Sound work is experiential. DailyClarity templates help you describe the session, set expectations,
            address contraindications, and guide visitors toward group sessions, privates, or event inquiries.
          </p>
          <SeoCtaGroup demoHref="/demo/sound_bath" demoLabel="Watch Sound Bath Demo" accent="indigo" />
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-6">
          <h2 className="text-2xl font-bold text-white">Why a generic template falls short</h2>
          <p className="text-slate-300 leading-relaxed">
            A standard business site can look polished but still leave visitors unsure what a sound bath is, who
            it is for, or how to book. Our templates include sections facilitators actually need — not just a
            hero and contact form.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'What to expect during a session',
              'Group schedule and private offerings',
              'Contraindications and FAQ',
              'Corporate and retreat inquiry paths',
              'Atmosphere-forward visual layouts',
              'Mobile CTAs for last-minute bookings',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-slate-200">
                <span className="text-indigo-400 shrink-0">→</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-mahogany space-y-3">
            <h2 className="text-xl font-bold text-white">Guided customization</h2>
            <p className="text-slate-300 text-sm">
              Add your studio name, session types, and location once. Preview supported fields in the available pages
              before launch.
            </p>
          </div>
          <div className="card-mahogany space-y-3">
            <h2 className="text-xl font-bold text-white">Built for conversion</h2>
            <p className="text-slate-300 text-sm">
              Structure visitors toward booking or inquiry — not endless scrolling without a next step.
            </p>
          </div>
        </div>

        <p className="text-slate-400 text-center text-sm">
          <Link href="/sound_bath" className="text-indigo-300 hover:underline">
            Explore sound bath templates
          </Link>
          {' · '}
          <Link href="/preview-your-business?niche=sound_bath" className="text-indigo-300 hover:underline">
            Start your preview
          </Link>
        </p>

        <div className="glass-panel rounded-3xl p-10 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">Preview your sound healing site</h2>
          <SeoCtaGroup demoHref="/demo/sound_bath" demoLabel="Watch Sound Bath Demo" accent="indigo" centered />
        </div>
      </section>
    </SeoPageShell>
  )
}
