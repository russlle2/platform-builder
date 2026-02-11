import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <main className="relative min-h-screen pt-16">
      {/* Aerial HVAC condenser background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/hvac-condenser.jpg)' }}
        />
        <div className="absolute inset-0 bg-slate-50/80" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-5">
          <div
            className="w-full h-full rounded-full border-4 border-gray-400 animate-spin"
            style={{ animationDuration: '20s' }}
          />
        </div>
      </div>
      <div className="relative z-10">
      {/* Hero Section */}
      <section className="container-hvac py-20">
        <div className="mahogany-surface rounded-3xl p-12 md:p-16 lg:p-20">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="text-bright-white block mb-4">
                Skip the learning curve
              </span>
              <span className="text-bright-white block">
                Build Your HVAC And Plumbing
              </span>
              <span className="text-bright-white block">
                Services Presence Like A Pro
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-pure-white text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
              Instantly see, shape, and understand your website without learning tools, 
              without confusion, and without committing until you approve.
            </p>

            {/* Primary CTA */}
            <div className="pt-8 space-y-4">
              <Link href="/live-demo" className="cta-button inline-block">
                Reserve your spot
              </Link>
              
              <p className="scarcity-message">
                ⚡ Limited to 30 active monthly members nationwide
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo Preview Section */}
      <section className="container-hvac py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-bright-white mb-4">
            See It In Action
          </h2>
          <p className="text-xl text-gray-300">
            Click the preview below to start building your site instantly
          </p>
        </div>

        {/* Live Demo Button/Preview */}
        <Link href="/wizard" className="block">
          <div className="live-demo-container p-8 cursor-pointer hover:scale-[1.02] transition-transform duration-300">
            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden relative">
              {/* Desktop-like Preview */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="text-6xl">🏗️</div>
                  <p className="text-2xl font-semibold text-bright-white">
                    Click to Launch Live Build Wizard
                  </p>
                  <p className="text-gray-400">
                    Real-time preview • No commitment required
                  </p>
                </div>
              </div>

              {/* Placeholder for actual preview */}
              <div className="relative opacity-20">
                <Image
                  src="/images/template-bg-1.jpg"
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 70vw"
                />
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* Features Grid */}
      <section className="container-hvac py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon="⚡"
            title="Instant Preview"
            description="See every change in real-time as you build. No waiting, no guessing."
          />
          <FeatureCard
            icon="🎨"
            title="Template Switching"
            description="Switch between HVAC-optimized templates without losing your content."
          />
          <FeatureCard
            icon="📸"
            title="Upload Your Media"
            description="Add your own images, logos, and backgrounds. Full control over your brand."
          />
          <FeatureCard
            icon="✨"
            title="Auto-Fill Smart Fields"
            description="Let our system suggest professional content while you keep full control."
          />
          <FeatureCard
            icon="🔒"
            title="No Commitment"
            description="Build and preview completely free. Only pay when you're 100% satisfied."
          />
          <FeatureCard
            icon="🚀"
            title="Launch Ready"
            description="Every site is optimized, mobile-ready, and SEO-friendly from day one."
          />
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="container-hvac py-20">
        <div className="mahogany-surface rounded-3xl p-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-bright-white mb-6">
            Ready to Build Your Presence?
          </h2>
          <p className="text-xl text-pure-white mb-8 max-w-2xl mx-auto">
            Join the elite HVAC and Plumbing professionals who build like pros
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/pricing" className="cta-button">
              See Transparent Pricing & Reserve Your Spot
            </Link>
            <Link 
              href="/wizard" 
              className="px-8 py-4 text-lg font-bold text-white border-2 border-white rounded-lg hover:bg-white/10 transition-all"
            >
              Continue to Build Wizard
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
      <div className="text-5xl">{icon}</div>
      <h3 className="text-2xl font-bold text-bright-white">{title}</h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
  )
}
