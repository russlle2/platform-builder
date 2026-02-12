import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="relative min-h-screen pt-24 pb-20 overflow-hidden">
      <div className="absolute inset-0">
        <div className="floating-orb w-40 h-40 bg-cyan-400/40 top-24 left-10" />
        <div className="floating-orb w-56 h-56 bg-amber-400/20 top-40 right-16" />
        <div className="floating-orb w-24 h-24 bg-orange-500/30 bottom-32 left-1/3" />
      </div>
      <div className="relative z-10">
        <section className="container-hvac py-20">
          <div className="hero-grid">
            <div className="space-y-8">
              <span className="signal-chip">HVAC Platform Studio</span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-bright-white">
                Custom built platforms for HVAC professionals.
                <span className="block text-cyan-200">Never the same website twice.</span>
              </h1>
              <p className="text-lg md:text-2xl text-slate-200 max-w-2xl">
                Collect your business details, select a template with content already filled in,
                then subscribe and launch with Postmark, Supabase, Stripe, and hosting connected.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/wizard" className="cta-button">
                  Start the Build
                </Link>
                <Link
                  href="/pricing"
                  className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
                >
                  View Plans
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-slate-300">
                <span>⚡ 30-member cap</span>
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
                  'Business intake synced',
                  'Template mapped to your services',
                  'Subdomain reserved',
                  'Payments and email connected',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Avg Launch</p>
                  <p className="text-3xl font-bold text-white">48 hrs</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Templates</p>
                  <p className="text-3xl font-bold text-white">10+</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-hvac py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-panel rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
              <p className="text-slate-300 mb-6">
                A guided flow that turns your details into a launch-ready HVAC platform.
              </p>
              <Link href="/wizard" className="text-cyan-300 font-semibold">
                Start in minutes →
              </Link>
            </div>
            {[
              {
                step: '01',
                title: 'Enter your info',
                copy: 'Add services, brand direction, and a preferred subdomain.',
              },
              {
                step: '02',
                title: 'Pick a template',
                copy: 'Your content fills in instantly and stays editable.',
              },
              {
                step: '03',
                title: 'Subscribe & launch',
                copy: 'We connect Postmark, Supabase, Stripe, and hosting for you.',
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

        <section className="container-hvac py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon="🧭"
              title="Guided Intake"
              description="A focused workflow that captures everything your site needs."
            />
            <FeatureCard
              icon="🧱"
              title="Template DNA"
              description="Layouts tuned for HVAC conversion and trust signals."
            />
            <FeatureCard
              icon="🛰️"
              title="Integrations Live"
              description="Postmark, Supabase, and Stripe come online before launch."
            />
            <FeatureCard
              icon="🛠️"
              title="Portal Control"
              description="Edit pages, media, and services any time you need."
            />
          </div>
        </section>

        <section className="container-hvac py-20">
          <div className="glass-panel rounded-3xl p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Build once. Launch fast. Scale with confidence.
            </h2>
            <p className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto">
              You focus on the installs and service calls. We handle platform delivery,
              integrations, and ongoing updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/pricing" className="cta-button">
                Reserve Your Spot
              </Link>
              <Link
                href="/wizard"
                className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
              >
                Start the Wizard
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
