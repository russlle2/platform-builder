'use client'

import Link from 'next/link'

export default function LiveDemoPage() {
  return (
    <main className="min-h-screen pt-16">
      <section className="container-hvac py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-bright-white mb-6">
            Live Demo
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Experience the platform in action. Click below to start building your site with our guided wizard.
          </p>
        </div>

        <div className="live-demo-container p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-bright-white">
                Build Your Site in Minutes
              </h2>
              <ul className="space-y-4">
                <DemoFeature 
                  icon="⚡" 
                  text="Real-time preview as you build"
                />
                <DemoFeature 
                  icon="🎨" 
                  text="Switch templates without losing content"
                />
                <DemoFeature 
                  icon="📸" 
                  text="Upload your own images and branding"
                />
                <DemoFeature 
                  icon="✨" 
                  text="Auto-fill suggestions for professional content"
                />
                <DemoFeature 
                  icon="🔒" 
                  text="No commitment until you're 100% satisfied"
                />
              </ul>
              <Link 
                href="/wizard"
                className="cta-button inline-block"
              >
                Launch Live Build Wizard
              </Link>
            </div>

            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden relative border-4 border-blue-500/30">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="text-6xl animate-pulse">🚀</div>
                  <p className="text-2xl font-semibold text-bright-white">
                    Click to Start
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function DemoFeature({ icon, text }: { icon: string; text: string }) {
  return (
    <li className="flex items-center gap-4 text-lg">
      <span className="text-3xl">{icon}</span>
      <span className="text-gray-300">{text}</span>
    </li>
  )
}
