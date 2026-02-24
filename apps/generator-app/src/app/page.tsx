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
      <div className="absolute inset-0">
        <div className="floating-orb w-40 h-40 bg-cyan-400/40 top-24 left-10" />
        <div className="floating-orb w-56 h-56 bg-amber-400/20 top-40 right-16" />
        <div className="floating-orb w-24 h-24 bg-orange-500/30 bottom-32 left-1/3" />
      </div>
      <div className="relative z-10">
        {/* Hero */}
        <section className="container-hvac py-20">
          <div className="hero-grid">
            <div className="space-y-8">
              <span className="signal-chip">Platform Builder Studio</span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-bright-white">
                Professional websites for your business.
                <span className="block text-cyan-200">Never the same website twice.</span>
              </h1>
              <p className="text-lg md:text-2xl text-slate-200 max-w-2xl">
                {totalTemplates}+ unique templates across {niches.length} industries. Pick a design,
                enter your details, preview it live, and launch — all in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="#niches" className="cta-button">
                  View Custom Templates
                </Link>
                <Link
                  href="/pricing"
                  className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
                >
                  View Plans
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-slate-300">
                <span>⚡ {totalTemplates}+ templates</span>
                <span>🧰 Managed launch + hosting</span>
                <span>🔐 Portal edits anytime</span>
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
        <section id="niches" className="container-hvac py-16">
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
        <section className="container-hvac py-16">
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
        <section className="container-hvac py-16">
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
        <section className="container-hvac py-20">
          <div className="glass-panel rounded-3xl p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your new website is one click away.
            </h2>
            <p className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto">
              Browse {totalTemplates}+ professionally designed templates, enter your details,
              preview it live, and launch. No coding. No hassle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="#niches" className="cta-button">
                View Custom Templates
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
