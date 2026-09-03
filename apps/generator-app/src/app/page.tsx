import Link from 'next/link'
import type { Metadata } from 'next'
import { getNiches } from '@/lib/templates/niche-registry'

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

const nicheAccentClasses: Record<string, { border: string; text: string; bg: string; glow: string }> = {
  emerald: { border: 'border-emerald-400/30', text: 'text-emerald-300', bg: 'bg-emerald-500/10', glow: 'hover:shadow-emerald-500/20' },
  violet: { border: 'border-violet-400/30', text: 'text-violet-300', bg: 'bg-violet-500/10', glow: 'hover:shadow-violet-500/20' },
  cyan: { border: 'border-cyan-400/30', text: 'text-cyan-300', bg: 'bg-cyan-500/10', glow: 'hover:shadow-cyan-500/20' },
  amber: { border: 'border-amber-400/30', text: 'text-amber-300', bg: 'bg-amber-500/10', glow: 'hover:shadow-amber-500/20' },
  indigo: { border: 'border-indigo-400/30', text: 'text-indigo-300', bg: 'bg-indigo-500/10', glow: 'hover:shadow-indigo-500/20' },
  rose: { border: 'border-rose-400/30', text: 'text-rose-300', bg: 'bg-rose-500/10', glow: 'hover:shadow-rose-500/20' },
}

export default async function HomePage() {
  const niches = await getNiches()
  const totalTemplates = niches.reduce((sum, n) => sum + n.templateCount, 0)
  const hasTemplateCounts = totalTemplates > 0

  return (
    <main className="relative min-h-screen pt-24 pb-20 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {/* Multi-industry gradient mesh */}
        <div className="absolute inset-0" style={{
          background: [
            'radial-gradient(ellipse 900px 700px at 8% 8%, rgba(34,211,238,0.14), transparent)',
            'radial-gradient(ellipse 700px 900px at 92% 15%, rgba(139,92,246,0.11), transparent)',
            'radial-gradient(ellipse 800px 500px at 50% 90%, rgba(244,63,94,0.08), transparent)',
            'radial-gradient(ellipse 500px 700px at 75% 55%, rgba(245,158,11,0.07), transparent)',
            'radial-gradient(ellipse 600px 600px at 25% 50%, rgba(16,185,129,0.07), transparent)',
          ].join(', '),
        }} />
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        {/* Pentagon */}
        <svg className="absolute -top-32 -left-24 w-[550px] h-[550px] text-cyan-400/[0.03]" viewBox="0 0 500 500" fill="none" stroke="currentColor" strokeWidth="1">
          <polygon points="250,30 470,190 390,440 110,440 30,190" />
          <polygon points="250,80 420,210 360,400 140,400 80,210" />
        </svg>
        {/* Concentric circles */}
        <svg className="absolute top-[30%] -right-24 w-[400px] h-[400px] text-violet-400/[0.04]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.8">
          <circle cx="100" cy="100" r="90" /><circle cx="100" cy="100" r="70" /><circle cx="100" cy="100" r="50" /><circle cx="100" cy="100" r="30" />
        </svg>
        {/* Star */}
        <svg className="absolute bottom-24 left-[18%] w-[280px] h-[280px] text-amber-400/[0.04]" viewBox="0 0 200 200" fill="currentColor">
          <polygon points="100,10 118,72 185,78 132,118 150,185 100,148 50,185 68,118 15,78 82,72" />
        </svg>
        {/* Diamond */}
        <svg className="absolute top-[60%] right-[18%] w-[200px] h-[200px] text-rose-400/[0.04]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="45" y="45" width="110" height="110" rx="8" transform="rotate(45 100 100)" />
        </svg>
        {/* Leaf hint */}
        <svg className="absolute bottom-[12%] right-[6%] w-[220px] h-[220px] text-emerald-400/[0.03]" viewBox="0 0 200 200" fill="currentColor">
          <path d="M100 10 Q30 55 30 120 Q30 185 100 190 Q170 185 170 120 Q170 55 100 10Z"/>
        </svg>
      </div>
      <div className="relative z-10">
        {/* Hero */}
        <section className="container-hvac py-20">
          <div className="hero-grid">
            <div className="space-y-8">
              <span className="signal-chip">DailyClarity Platform Builder</span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-bright-white">
                Turn your wellness offer into a client-booking website.
                <span className="block text-cyan-200">One guided flow. Live preview. Launch support built in.</span>
              </h1>
              <p className="text-lg md:text-2xl text-slate-200 max-w-2xl">
                Preview a complete website with your real business info, edit the copy and images
                live, then launch with hosting, contact forms, SEO structure, booking-ready pages,
                and a customer portal.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/preview-your-business" className="cta-button">
                  Build My Client-Ready Preview
                </Link>
                <Link
                  href="/demo/platform-builder"
                  className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
                >
                  Watch Demo
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-slate-300">
                <span>Not a blank-canvas builder — a client-conversion launch system for wellness and service businesses.</span>
              </div>
            </div>
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-[0.3em] text-slate-400">Launch Console</span>
                <span className="text-xs text-cyan-300">Live pipeline</span>
              </div>
              <div className="space-y-4">
                {[
                  'Share your business details once',
                  'Supported fields populate across the preview',
                  'Preview your complete site live',
                  'Purchase & launch with integrations',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Industries</p>
                  <p className="text-3xl font-bold text-white">{niches.length}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Templates</p>
                  <p className="text-3xl font-bold text-white">
                    {hasTemplateCounts ? totalTemplates : 'In review'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why this is different */}
        <section className="container-hvac py-16">
          <div className="text-center mb-12 space-y-4">
            <span className="signal-chip">Why this is different</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white max-w-4xl mx-auto">
              Most website builders give you a blank canvas. DailyClarity gives you a business-ready funnel.
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
                title: 'Offer clarity',
                copy: 'Helps visitors understand what you sell and why it matters within seconds.',
              },
              {
                icon: (
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12l1.8 1.8L15 10" />
                  </svg>
                ),
                title: 'Trust structure',
                copy: 'Sections for credentials, testimonials, approach, FAQs, and what to expect.',
              },
              {
                icon: (
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <rect x="3.5" y="5" width="17" height="15" rx="2" /><path strokeLinecap="round" d="M3.5 9.5h17M8 3.5v3M16 3.5v3" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14l2 2 4-4" />
                  </svg>
                ),
                title: 'Booking path',
                copy: 'Page structures are designed to guide visitors toward calling, booking, messaging, or joining.',
              },
              {
                icon: (
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15c0-5 3-10 7-12 4 2 7 7 7 12l-3.5-1.5L12 19l-3.5-5.5L5 15z" /><circle cx="12" cy="9" r="1.6" />
                  </svg>
                ),
                title: 'Launch system',
                copy: 'Preview, edit, checkout, portal, and publish support are part of one flow.',
              },
            ].map((item) => (
              <div key={item.title} className="card-mahogany space-y-4">
                <span className="feature-icon">{item.icon}</span>
                <h3 className="text-2xl font-bold text-bright-white">{item.title}</h3>
                <p className="text-gray-300 leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Niche Cards — main CTA section */}
        <section id="niches" className="container-hvac py-16">
          <div className="text-center mb-12 space-y-4">
            <span className="signal-chip">Built for real wellness businesses</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Templates shaped around how your clients decide
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Pick your practice to see conversion-focused templates designed for the way your
              clients research, build trust, and book.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {niches.map((niche) => {
              const accent = nicheAccentClasses[niche.accent] || nicheAccentClasses.cyan
              return (
                <Link
                  key={niche.slug}
                  href={`/${niche.slug}`}
                  className={`card-mahogany space-y-4 hover:scale-[1.03] transition-all duration-300 group ${accent.glow} hover:shadow-2xl`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-4xl">{niche.icon}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${accent.bg} ${accent.text} border ${accent.border}`}>
                      {niche.templateCount > 0 ? `${niche.templateCount} templates` : 'Multiple styles'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-bright-white group-hover:scale-[1.01] transition-transform">
                    {niche.label}
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm">
                    {niche.description}
                  </p>
                  <span className={`inline-flex items-center gap-1 text-sm font-semibold ${accent.text} group-hover:gap-2 transition-all`}>
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
            <span className="signal-chip">What happens after checkout</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              From details to a live site, one step at a time
            </h2>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { step: '01', title: 'Choose your niche', copy: 'Pick your practice and fill in your business details.' },
              { step: '02', title: 'Match & customize', copy: 'Match with a template and customize it live.' },
              { step: '03', title: 'Checkout', copy: 'Check out with the plan that fits your launch.' },
              { step: '04', title: 'We provision', copy: 'We provision your site and subdomain for you.' },
              { step: '05', title: 'Manage in portal', copy: 'Manage future edits through your customer portal.' },
            ].map((item) => (
              <div key={item.step} className="glass-panel rounded-2xl p-6 space-y-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/15 text-cyan-200 font-bold border border-cyan-400/30">
                  {item.step}
                </span>
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="text-slate-200 text-sm leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Proof / trust — honest, no fabricated claims */}
        <section className="container-hvac py-16">
          <div className="text-center mb-12 space-y-4">
            <span className="signal-chip">Early access</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Pilot builds are going live now
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              DailyClarity is in early access. Pilot client screenshots and case studies will be
              added here as builds go live — real proof only, no inflated numbers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Pilot builds', copy: 'Launch examples coming soon as early-access sites go live.' },
              { title: 'Case studies', copy: 'Real before-and-after results will be published here.' },
              { title: 'Product updates', copy: 'Join the early-access list for new templates and launch updates.' },
            ].map((item) => (
              <div key={item.title} className="card-mahogany space-y-3">
                <div className="h-32 rounded-xl border border-dashed border-white/15 bg-white/5 flex items-center justify-center text-sm text-slate-400">
                  Coming soon
                </div>
                <h3 className="text-xl font-bold text-bright-white">{item.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container-hvac py-20">
          <div className="glass-panel rounded-3xl p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your website should do more than look good.
            </h2>
            <p className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto">
              It should explain your offer, build trust, and move people toward the next step.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/preview-your-business" className="cta-button">
                Build My Preview
              </Link>
              <Link
                href="/demo/platform-builder"
                className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </section>
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
                  'Generate, preview, customize, and launch premium websites for wellness and professional service businesses.',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                offers: {
                  '@type': 'Offer',
                  price: '20',
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
