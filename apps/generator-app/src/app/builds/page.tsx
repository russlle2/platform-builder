'use client'

export default function BuildsPage() {
  return (
    <main className="min-h-screen pt-16">
      <section className="container-hvac py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-bright-white mb-6">
            Your Builds
          </h1>
          <p className="text-xl text-gray-300">
            Manage and deploy your websites
          </p>
        </div>

        <div className="mahogany-surface rounded-3xl p-12">
          <div className="text-center space-y-6">
            <div className="text-6xl">🏗️</div>
            <h2 className="text-3xl font-bold text-bright-white">
              No builds yet
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Start building your first website with our Live Build Wizard. Your projects will appear here.
            </p>
            <a 
              href="/wizard"
              className="cta-button inline-block"
            >
              Create Your First Build
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
