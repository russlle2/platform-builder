import type { Metadata } from 'next'
import Link from 'next/link'

const description =
  'Guided meditations with crystal sound bowls, sound baths for charity, and wellness courses and experiences from DailyClarity in Palatka, Florida.'

export const metadata: Metadata = {
  title: 'Sound Bowls & Wellness Experiences in Florida',
  description,
  alternates: { canonical: '/wellness-experiences' },
  keywords: ['crystal sound bowls', 'guided meditation', 'sound baths', 'wellness experiences', 'Palatka'],
  openGraph: {
    title: 'Sound Bowls & Wellness Experiences | DailyClarity',
    description,
    url: '/wellness-experiences',
    type: 'website',
    siteName: 'DailyClarity',
    images: [{ url: '/logo.png', width: 1536, height: 1024, alt: 'DailyClarity' }],
  },
  twitter: {
    card: 'summary',
    title: 'Sound Bowls & Wellness Experiences | DailyClarity',
    description,
    images: [{ url: '/logo.png', alt: 'DailyClarity' }],
  },
}

const experiences = [
  {
    number: '01',
    title: 'Guided meditation & crystal sound bowls',
    description: 'Guided meditations using crystal sound bowls. Tell us about the experience you have in mind and where you would like to gather.',
  },
  {
    number: '02',
    title: 'Sound baths for charity',
    description: 'Planning a charity event? Share the cause, location, and proposed date so we can discuss a sound bath for your event.',
  },
  {
    number: '03',
    title: 'Wellness courses & experiences',
    description: 'Ask about wellness courses and other experiences. We’ll discuss the format, content, and arrangements with you.',
  },
] as const

const linkClass = 'font-semibold text-cyan-200 underline underline-offset-4 hover:text-white'

export default function WellnessExperiencesPage() {
  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-10 sm:space-y-14">
        <header className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Wellness experiences · Palatka, Florida
            </p>
            <h1 className="text-5xl font-bold text-white sm:text-6xl">
              Guided meditation.<br />
              Crystal sound bowls.<br />
              Time to come together.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
              DailyClarity offers guided meditations, sound baths for charity, and wellness
              courses and experiences. Based in Palatka, we travel to customers across
              Florida’s east coast, Tampa, and surrounding areas.
            </p>
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-200 px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-cyan-100"
            >
              Ask about an experience
            </Link>
          </div>

          <aside aria-labelledby="visit-heading" className="mahogany-surface rounded-3xl p-7 sm:p-9">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 240 120" fill="none" className="mb-7 h-28 w-full text-cyan-200">
              <ellipse cx="120" cy="43" rx="69" ry="15" stroke="currentColor" strokeWidth="2" />
              <path d="M51 43c4 38 25 60 69 60s65-22 69-60M98 109h44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M33 20C17 34 17 53 33 67M207 20c16 14 16 33 0 47M20 7C-3 29-3 58 20 80M220 7c23 22 23 51 0 73" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            </svg>
            <h2 id="visit-heading" className="text-3xl font-semibold text-white">Let’s plan the details together.</h2>
            <p className="mt-4 leading-relaxed text-slate-300">
              Share your city, preferred date, and the experience you’re interested in.
              We’ll confirm travel arrangements, timing, and the details of your enquiry with you.
            </p>
          </aside>
        </header>

        <section aria-labelledby="experiences-heading">
          <h2 id="experiences-heading" className="text-3xl font-bold text-white sm:text-4xl">Explore the experiences</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {experiences.map((experience) => (
              <article key={experience.number} className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 sm:p-7">
                <span aria-hidden="true" className="text-sm font-semibold tracking-[0.2em] text-cyan-200">{experience.number}</span>
                <h3 className="mt-4 text-2xl font-semibold text-white">{experience.title}</h3>
                <p className="mt-4 leading-relaxed text-slate-300">{experience.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="enquiry-heading" className="grid gap-7 rounded-3xl border border-cyan-200/20 bg-cyan-950/20 p-7 sm:p-9 md:grid-cols-2 md:items-center">
          <div>
            <h2 id="enquiry-heading" className="text-3xl font-bold text-white">Tell us what you’re planning</h2>
            <p className="mt-4 leading-relaxed text-slate-300">
              For an event, include the approximate group size and venue if you have one.
              For a course, let us know what you’d like to explore.
            </p>
          </div>
          <div className="space-y-4 md:border-l md:border-white/10 md:pl-8">
            <Link href="/contact" className={linkClass}>Send a wellness enquiry</Link>
            <p className="text-sm leading-relaxed text-slate-300">
              Use our contact form to start the conversation. Arrangements are confirmed
              directly after we discuss your request.
            </p>
          </div>
        </section>

        <aside aria-labelledby="websites-heading" className="border-t border-white/10 pt-8">
          <h2 id="websites-heading" className="text-2xl font-semibold text-white">DailyClarity also builds websites</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-300">
            Our digital services include website templates, hosted website plans, and custom
            website builds. If that’s what you’re looking for,{' '}
            <Link href="/preview-your-business" className={linkClass}>explore the website builder</Link>{' '}
            or <Link href="/custom-build" className={linkClass}>discuss a custom website</Link>.
          </p>
        </aside>
      </div>
    </main>
  )
}
