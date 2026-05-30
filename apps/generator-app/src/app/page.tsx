import Link from 'next/link'
import { getNiches } from '@/lib/templates/niche-registry'

const nicheAccentClasses: Record<string, { border: string; text: string; bg: string; glow: string }> = {
  emerald: { border: 'border-emerald-400/30', text: 'text-emerald-300', bg: 'bg-emerald-500/10', glow: 'hover:shadow-emerald-500/20' },
  violet: { border: 'border-violet-400/30', text: 'text-violet-300', bg: 'bg-violet-500/10', glow: 'hover:shadow-violet-500/20' },
  cyan: { border: 'border-cyan-400/30', text: 'text-cyan-300', bg: 'bg-cyan-500/10', glow: 'hover:shadow-cyan-500/20' },
  amber: { border: 'border-amber-400/30', text: 'text-amber-300', bg: 'bg-amber-500/10', glow: 'hover:shadow-amber-500/20' },
  indigo: { border: 'border-indigo-400/30', text: 'text-indigo-300', bg: 'bg-indigo-500/10', glow: 'hover:shadow-indigo-500/20' },
  rose: { border: 'border-rose-400/30', text: 'text-rose-300', bg: 'bg-rose-500/10', glow: 'hover:shadow-rose-500/20' },
}

export default function HomePage() {
  const niches = getNiches()
  const totalTemplates = niches.reduce((sum, n) => sum + n.templateCount, 0)

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
        <section className="container-wide py-20">
          <div className="hero-grid">
            <div className="space-y-8">
              <span className="signal-chip">DailyClarity Platform Builder</span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-bright-white">
                Launch a premium website for your wellness or professional brand.
                <span className="block text-cyan-200">One guided flow. Live preview. No designer needed.</span>
              </h1>
              <p className="text-lg md:text-2xl text-slate-200 max-w-2xl">
                Choose your niche, preview a polished site, customize the details, and launch without hiring a designer or waiting weeks.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/preview-your-business" className="cta-button">
                  Preview Your Business
                </Link>
                <Link
                  href="/preview-your-business"
                  className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
                >
                  See Live Demo
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-slate-300">
                <span>No code. No generic templates. Built for service businesses that need leads.</span>
              </div>
            </div>
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-[0.3em] text-slate-400">Launch Console</span>
                <span className="text-xs text-cyan-300">Live pipeline</span>
              </div>
              <div className="space-y-4">
                {[
                  'Browse templates in your niche',
                  'Enter your info — it fills every page',
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
                  <p className="text-3xl font-bold text-white">{totalTemplates}+</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Niche Cards — main CTA section */}
        <section id="niches" className="container-wide py-16">
          <div className="text-center mb-12 space-y-4">
            <span className="signal-chip">Choose Your Industry</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Templates built for your business
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Every niche has dozens of unique, professionally designed templates.
              Pick your industry to start browsing.
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
                      {niche.templateCount} templates
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-bright-white group-hover:scale-[1.01] transition-transform">
                    {niche.label}
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm">
                    {niche.description}
                  </p>
                  <span className={`inline-flex items-center gap-1 text-sm font-semibold ${accent.text} group-hover:gap-2 transition-all`}>
                    View Custom Templates <span aria-hidden="true">→</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="container-wide py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-panel rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
              <p className="text-slate-300 mb-6">
                A streamlined flow from template selection to a launched website with integrations.
              </p>
              <Link href="#niches" className="text-cyan-300 font-semibold">
                Start browsing →
              </Link>
            </div>
            {[
              {
                step: '01',
                title: 'Browse & pick',
                copy: 'Choose from hundreds of unique templates in your industry.',
              },
              {
                step: '02',
                title: 'Enter your info',
                copy: 'Your content fills in across every page instantly.',
              },
              {
                step: '03',
                title: 'Preview & purchase',
                copy: 'See your real site live, then buy and launch when ready.',
              },
            ].map((item) => (
              <div key={item.step} className="card-mahogany space-y-3">
                <span className="text-sm text-cyan-200">{item.step}</span>
                <h3 className="text-2xl font-bold text-white">{item.title}</h3>
                <p className="text-slate-200">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature cards */}
        <section className="container-wide py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon="🎨"
              title="Unique Designs"
              description={`${totalTemplates}+ templates — each with its own layout, voice, and content structure.`}
            />
            <FeatureCard
              icon="📱"
              title="Mobile-First"
              description="Every template is responsive and optimized for conversions on any device."
            />
            <FeatureCard
              icon="⚡"
              title="Instant Preview"
              description="See your real info in the template before you purchase. No surprises."
            />
            <FeatureCard
              icon="🛠️"
              title="Managed Launch"
              description="Hosting, domain, email, and integrations — all set up and managed for you."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="container-wide py-20">
          <div className="glass-panel rounded-3xl p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your new website is one guided flow away.
            </h2>
            <p className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto">
              Browse {totalTemplates}+ professionally designed templates, enter your details,
              preview it live, and launch. No coding. No hassle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/preview-your-business" className="cta-button">
                Preview Your Business
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

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: string
  title: string
  description: string 
}) {
  return (
    <div className="card-mahogany text-center space-y-4 hover:scale-105 transition-transform">
      <div className="text-4xl">{icon}</div>
      <h3 className="text-2xl font-bold text-bright-white">{title}</h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
  )
}
