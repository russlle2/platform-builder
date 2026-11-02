import Link from 'next/link'
import Image from 'next/image'
import LaunchUpdatesSignup from '@/components/LaunchUpdatesSignup'
import type { Metadata } from 'next'
import { getNichesWithSampleAvailability } from '@/lib/templates/niche-registry'
import { DemoVideoPlayer } from '@/components/demo/DemoVideoPlayer'
import { PLATFORM_DEMO_VIDEO, PLATFORM_DEMO_POSTER, PLATFORM_DEMO_CAPTIONS, PLATFORM_DEMO_TRANSCRIPT } from '@/lib/demo-videos'
import { PLANS } from '@/lib/plans'

// The launch catalog lives in a site-wide Netlify Blobs store. Reading it at
// request time prevents a credential-less CI build from permanently baking an
// empty catalog into the homepage.
export const dynamic = 'force-dynamic'

const homeDescription =
  'Explore published website templates for wellness coaches, therapists, sound bath facilitators, aromatherapy, and holistic medicine. Preview supported fields with your content, customize, and launch.'

export const metadata: Metadata = {
  title: { absolute: 'DailyClarity — Professional Website Templates for Service Businesses' },
  description: homeDescription,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'DailyClarity — Professional Website Templates for Service Businesses',
    description: homeDescription,
    url: '/',
    type: 'website',
    images: ['/og-image.png'],
  },
}

export default async function HomePage() {
  const niches = await getNichesWithSampleAvailability()
  const sampleNiches = niches.filter((niche) => niche.sampleAvailable)
  const defaultSampleNiche = sampleNiches.find((niche) => niche.slug === 'wellness_coach')?.slug || sampleNiches[0]?.slug
  const sampleHref = defaultSampleNiche ? `/preview-your-business?sample=1&niche=${encodeURIComponent(defaultSampleNiche)}` : '/preview-your-business'
  const totalTemplates = niches.reduce((sum, n) => sum + n.templateCount, 0)
  const hasTemplateCounts = totalTemplates > 0

  return (
    <main className="public-daylight wellness-home relative min-h-screen pb-12">
      <div>
        <section className="home-hero" aria-labelledby="home-heading">
          <div className="container-hvac hero-grid relative">
            <div className="space-y-8">
              <span className="signal-chip home-wordmark">DailyClarity Platform Builder</span>
              <h1 id="home-heading" className="home-hero-heading">
                Turn your wellness offer into a client-booking website.
              </h1>
              <p className="max-w-xl text-lg md:text-xl dc-text-body leading-relaxed">
                Choose a design for your practice and see how your services, photos, and booking
                details look together. Your first preview is free.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/preview-your-business" className="cta-button">
                  Build My Client-Ready Preview
                </Link>
                <Link
                  href="/demo/platform-builder"
                  className="dc-button-secondary"
                >
                  Watch Demo
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm dc-text-body">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-700" aria-hidden="true" />
                  No card needed to preview.
                </span>
                <Link href="/pricing" className="font-semibold dc-text-accent underline underline-offset-4">
                  Hosted plans from $20/month
                </Link>
                <Link href="/custom-build" className="dc-text-body underline underline-offset-4">
                  $500 custom build scope review
                </Link>
              </div>
            </div>

            <figure className="home-example">
              <div className="home-example-bar">
                <span aria-hidden="true" className="home-example-dots" />
                Finished website preview
              </div>
              <Image
                src="/images/examples/willow-and-coast.webp"
                alt="Willow and Coast Wellness website showing its coaching headline and Get in touch button."
                width={1280}
                height={800}
                sizes="(min-width: 1280px) 570px, (min-width: 1024px) 46vw, 94vw"
                priority
                className="block h-auto w-full"
              />
              <figcaption className="home-example-caption">
                <span><strong>Willow and Coast Wellness</strong><br />Example coaching practice</span>
                <a href="#customer-walkthrough" className="dc-text-accent font-semibold underline underline-offset-4">See how it was built</a>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Interactive Sample Selector */}
        <section className="container-hvac py-10 md:py-16" aria-labelledby="overview-heading">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="space-y-5">
              <span className="signal-chip">See it come together</span>
              <h2 id="overview-heading" className="text-3xl md:text-4xl font-bold dc-text-heading">Your practice. Your style. Your website.</h2>
              <p className="text-lg leading-relaxed dc-text-body">
                Explore a demo made for your type of practice, then try a sample website.
                Add your own business details, services, and photos when you are ready.
              </p>
              <Link href="/demo" className="inline-flex min-h-11 items-center font-semibold dc-text-warm underline underline-offset-4">
                Explore all five practice demos →
              </Link>
            </div>
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] dc-text-warm">Explore before you commit</span>
              <h2 className="text-3xl font-bold dc-text-heading">See a website for a practice like yours.</h2>
              <p className="dc-text-body">{sampleNiches.length > 0 ? 'Open an available sample with clearly labeled example details. No account or contact information needed.' : 'No sample is available right now. You can still start with your own business details.'}</p>
              {sampleNiches.length > 0 ? (
              <form action="/preview-your-business" method="get" className="space-y-4">
                <input type="hidden" name="sample" value="1" />
                <label htmlFor="sample-practice" className="block text-sm font-semibold dc-text-body">Available sample practices</label>
                <select id="sample-practice" name="niche" defaultValue={defaultSampleNiche} className="w-full rounded-xl dc-field px-4 py-3">
                  {sampleNiches.map((niche) => <option key={niche.slug} value={niche.slug}>{niche.label}</option>)}
                </select>
                <button type="submit" className="cta-button w-full">Try a sample website</button>
              </form>
              ) : <Link href="/preview-your-business" className="cta-button block text-center">Start with my business details</Link>}
              <p className="text-sm dc-text-muted">Then use your own details when you are ready. Your existing preview stays separate.</p>
              {hasTemplateCounts && <p className="border-t dc-border pt-4 text-xs dc-text-muted">{totalTemplates.toLocaleString('en-US')} published templates across {niches.length} practice types.</p>}
            </div>
          </div>
        </section>

        <section id="customer-walkthrough" className="container-hvac scroll-mt-20 pb-12" aria-labelledby="walkthrough-heading">
          <div className="home-walkthrough glass-panel">
            <div className="space-y-4 p-6 sm:p-8">
              <span className="signal-chip">Full walkthrough · 3:47</span>
              <h2 id="walkthrough-heading" className="text-3xl sm:text-4xl dc-text-heading">How Willow and Coast built its website.</h2>
              <p className="dc-text-body">Follow this example practice from its first preview through checkout, publishing, and its first photo update.</p>
              <p className="text-sm dc-text-muted">The demonstration uses a test checkout.</p>
            </div>
            <DemoVideoPlayer
              src={PLATFORM_DEMO_VIDEO}
              title="DailyClarity complete customer walkthrough — 3 minutes 47 seconds"
              poster={PLATFORM_DEMO_POSTER}
              captionsSrc={PLATFORM_DEMO_CAPTIONS}
              transcriptSrc={PLATFORM_DEMO_TRANSCRIPT}
            />
          </div>
        </section>

        {/* Why this is different */}
        <section className="container-hvac py-16">
          <div className="text-center mb-12 space-y-4">
            <span className="signal-chip">Why this is different</span>
            <h2 className="text-4xl md:text-5xl font-bold dc-text-heading max-w-4xl mx-auto">
              Built around the questions your next client will ask.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: (
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
                  </svg>
                ),
                title: 'Explain your services',
                copy: 'Give your services, approach, and next step a clear place in the design.',
              },
              {
                icon: (
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12l1.8 1.8L15 10" />
                  </svg>
                ),
                title: 'Show your experience',
                copy: 'Use your real qualifications, approach, and what-to-expect details to help visitors decide.',
              },
              {
                icon: (
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <rect x="3.5" y="5" width="17" height="15" rx="2" /><path strokeLinecap="round" d="M3.5 9.5h17M8 3.5v3M16 3.5v3" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14l2 2 4-4" />
                  </svg>
                ),
                title: 'Make booking easy',
                copy: 'Review how a visitor will call, book, or ask a question before you publish.',
              },
              {
                icon: (
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15c0-5 3-10 7-12 4 2 7 7 7 12l-3.5-1.5L12 19l-3.5-5.5L5 15z" /><circle cx="12" cy="9" r="1.6" />
                  </svg>
                ),
                title: 'Manage your website',
                copy: 'Preview your design, check your details, choose a plan, and manage your website in one place.',
              },
            ].map((item) => (
              <div key={item.title} className="card-mahogany space-y-4">
                <span className="feature-icon">{item.icon}</span>
                <h3 className="text-2xl font-bold dc-text-heading">{item.title}</h3>
                <p className="dc-text-body leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Niche Cards — with curated visual previews for each practice */}
        <section id="niches" className="container-hvac py-16">
          <div className="text-center mb-12 space-y-4">
            <span className="signal-chip">Built for real wellness businesses</span>
            <h2 className="text-4xl md:text-5xl font-bold dc-text-heading">
              Templates shaped around how your clients decide
            </h2>
            <p className="text-lg dc-text-body max-w-2xl mx-auto">
              Choose your practice to see example layouts for your services, credentials, and booking information.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {niches.map((niche) => {
              return (
                <Link
                  key={niche.slug}
                  href={`/${niche.slug}`}
                  className="card-mahogany home-gallery-card flex flex-col justify-between space-y-5 group"
                >
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/80 aspect-[16/10]">
                      <Image
                        src={`/images/niche-examples/${niche.slug}/poster-hero.webp`}
                        alt={`${niche.label} example website screenshot`}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500 motion-reduce:transform-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <span className="home-image-caption rounded-full px-3 py-1 text-xs font-semibold">
                          {niche.templateCount > 0 ? `${niche.templateCount.toLocaleString('en-US')} templates` : 'Explore this practice'}
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1.5">
                        {(['earthy-warm', 'clinic-modern', 'bold-playful'] as const).map((styleSlug) => (
                          <Image
                            key={styleSlug}
                            src={`/images/niche-examples/${niche.slug}/${styleSlug}.webp`}
                            alt=""
                            aria-hidden="true"
                            width={44}
                            height={28}
                            className="h-7 w-11 rounded border border-white/25 object-cover shadow-sm"
                          />
                        ))}
                        <span className="home-image-caption ml-auto text-[11px] font-medium px-2 py-0.5 rounded">
                          Example website styles
                        </span>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold dc-text-heading">
                      {niche.label}
                    </h3>
                    <p className="dc-text-body leading-relaxed text-sm">
                      {niche.description}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 text-sm font-semibold dc-text-accent pt-1">
                    View example styles →
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* What happens after checkout */}
        <section className="container-hvac py-16">
          <div className="text-center mb-12 space-y-4">
            <span className="signal-chip">Your path to launch</span>
            <h2 className="text-4xl md:text-5xl font-bold dc-text-heading">
              From details to a live site, one step at a time
            </h2>
          </div>
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { step: '01', title: 'Choose your niche', copy: 'Pick your practice and fill in your business details.' },
              { step: '02', title: 'Match & customize', copy: 'Match with a template and customize it live.' },
              { step: '03', title: 'Checkout', copy: 'Check out with the plan that fits your launch.' },
              { step: '04', title: 'Go live', copy: 'We publish your website at its own web address.' },
              { step: '05', title: 'Manage in portal', copy: 'Manage future edits through your customer portal.' },
            ].map((item) => (
              <div key={item.step} className="glass-panel rounded-2xl p-6 space-y-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/15 dc-text-warm font-bold border border-amber-400/30">
                  {item.step}
                </span>
                <h3 className="text-xl font-bold dc-text-heading">{item.title}</h3>
                <p className="dc-text-body text-sm leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Transparent Pricing & Scope Overview */}
        <section className="container-hvac py-16" aria-labelledby="home-pricing-heading">
          <div className="text-center mb-12 space-y-4">
            <span className="signal-chip">Straightforward plans</span>
            <h2 id="home-pricing-heading" className="text-4xl md:text-5xl font-bold dc-text-heading">
              Clear pricing after you preview your website.
            </h2>
            <p className="text-lg dc-text-body max-w-2xl mx-auto">
              Generating and editing your preview is free. Choose a hosted monthly plan only when
              you are ready to publish, or request a written scope review for a custom build.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card-mahogany flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] dc-text-success">Basic Plan</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold dc-text-heading">${PLANS.basic.price}</span>
                  <span className="text-sm dc-text-muted">/month · billed monthly</span>
                </div>
                <p className="text-sm dc-text-body leading-relaxed">
                  Hosted website on your DailyClarity subdomain or connected custom domain, with
                  ongoing text, photo, and color edits in your customer portal.
                </p>
              </div>
              <Link
                href="/preview-your-business?plan=basic"
                className="dc-button-secondary text-sm"
              >
                Preview with Basic →
              </Link>
            </div>

            <div className="card-mahogany flex flex-col justify-between space-y-6 border-amber-300/40">
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] dc-text-warm">Security + Ads Plan</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold dc-text-heading">${PLANS.security_ads.price}</span>
                  <span className="text-sm dc-text-muted">/month · billed monthly</span>
                </div>
                <p className="text-sm dc-text-body leading-relaxed">
                  Includes everything in Basic plus agreed ads, promotional work, and security
                  reviews delivered by us. Scope and cadence are confirmed by email before work
                  begins; advertising spend is separate.
                </p>
              </div>
              <Link
                href="/preview-your-business?plan=security_ads"
                className="cta-button w-full py-3 text-sm"
              >
                Preview with Security + Ads →
              </Link>
            </div>

            <div className="card-mahogany flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] dc-text-accent">Custom Build Scope Review</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold dc-text-heading">$500</span>
                  <span className="text-sm dc-text-muted">one-time · after written scope approval</span>
                </div>
                <p className="text-sm dc-text-body leading-relaxed">
                  Need bespoke layouts or custom workflow setup? Send your project scope first with
                  no upfront card charge—payment is requested only after mutual written sign-off.
                </p>
              </div>
              <Link
                href="/custom-build"
                className="dc-button-secondary text-sm"
              >
                Request Scope Review →
              </Link>
            </div>
          </div>
        </section>

        <section className="container-hvac py-16" aria-labelledby="design-studies-heading">
          <div className="mb-8 max-w-3xl space-y-4">
            <span className="signal-chip">Featured design studies</span>
            <h2 id="design-studies-heading" className="text-4xl md:text-5xl dc-text-heading">Two different ways to introduce a practice.</h2>
            <p className="text-lg dc-text-body">See how a retreat and a therapist use photography, copy, and a clear invitation to help a visitor take the next step.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <figure className="glass-panel overflow-hidden rounded-2xl">
              <video controls playsInline loop preload="none" width={800} height={428}
                poster="/images/examples/the-reminder-experience.webp"
                aria-label="The Reminder Experience, five-second silent design study showing the retreat photo gallery"
                aria-describedby="retreat-study-caption"
                className="block h-auto w-full bg-slate-950">
                <source src="/demo-videos/the-reminder-experience.webm" type="video/webm" />
                <source src="/demo-videos/the-reminder-experience.mp4" type="video/mp4" />
              </video>
              <figcaption id="retreat-study-caption" className="space-y-2 p-5">
                <h3 className="text-2xl dc-text-heading">The Reminder Experience</h3>
                <p className="dc-text-body">Play the five-second silent loop to see the retreat gallery change while the event details and reservation buttons stay in place.</p>
              </figcaption>
            </figure>
            <figure className="glass-panel overflow-hidden rounded-2xl">
              <a href="/images/examples/michael-ansley.webp" className="block" aria-label="Open Michael Ansley’s website screenshot at full size">
                <Image src="/images/examples/michael-ansley.webp" width={1200} height={643}
                  sizes="(min-width: 1280px) 570px, (min-width: 768px) 46vw, 94vw"
                  alt="Therapy website with a trauma-informed headline, a consultation button, and a portrait of Michael Ansley."
                  className="block h-auto w-full" />
              </a>
              <figcaption className="space-y-2 p-5">
                <h3 className="text-2xl dc-text-heading">Michael Ansley’s therapy practice</h3>
                <p className="dc-text-body">A portrait sits beside the practice introduction, with a consultation button directly below the offer.</p>
              </figcaption>
            </figure>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold dc-text-accent">
            <Link href={sampleHref} className="inline-flex min-h-11 items-center underline underline-offset-4">{defaultSampleNiche ? 'Open a sample website' : 'Start with my business details'}</Link>
            <Link href="/wellness-website-checklist" className="inline-flex min-h-11 items-center underline underline-offset-4">Use the launch checklist</Link>
            <Link href="/pricing" className="inline-flex min-h-11 items-center underline underline-offset-4">Compare the plans</Link>
          </div>
        </section>

        {/* CTA */}
        <section className="container-hvac py-20">
          <div className="glass-panel rounded-3xl px-5 py-10 sm:p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold dc-text-heading mb-6">
              Your website should do more than look good.
            </h2>
            <p className="text-lg dc-text-body mb-8 max-w-2xl mx-auto">
              It should explain your offer, build trust, and move people toward the next step.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/preview-your-business" className="cta-button">
                Build My Preview
              </Link>
              <Link
                href="/demo/platform-builder"
                className="dc-button-secondary"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </section>
        <LaunchUpdatesSignup />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebApplication',
                name: 'DailyClarity Platform Builder',
                url: 'https://dailyclarity.org',
                description:
                  'Generate, preview, customize, and launch websites for wellness and professional service businesses.',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                offers: {
                  '@type': 'AggregateOffer',
                  lowPrice: String(PLANS.basic.price),
                  highPrice: String(PLANS.security_ads.price),
                  offerCount: 2,
                  priceCurrency: 'USD',
                },
              },
              {
                '@type': 'Organization',
                name: 'DailyClarity',
                url: 'https://dailyclarity.org',
                contactPoint: {
                  '@type': 'ContactPoint',
                  contactType: 'customer support',
                  url: 'https://dailyclarity.org/contact',
                },
              },
            ],
          }),
        }}
      />
    </main>
  )
}
