import Link from 'next/link'

export default function SuccessPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 container-hvac">
      <div className="glass-panel rounded-3xl p-12 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-bright-white mb-4">
            Payment confirmed
          </h1>
          <p className="text-gray-300 text-lg">
            Your subscription is active. We are provisioning your platform now.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {[
            {
              title: 'Provisioning',
              copy: 'We are connecting Postmark, Supabase, and Stripe.',
            },
            {
              title: 'Template build',
              copy: 'Your chosen layout is being populated with your data.',
            },
            {
              title: 'Launch ready',
              copy: 'We will confirm your subdomain and go live with you.',
            },
          ].map((step) => (
            <div key={step.title} className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{step.title}</p>
              <p className="text-slate-200 mt-2 text-sm">{step.copy}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link href="/portal" className="cta-button">
            Go to portal
          </Link>
          <Link
            href="/preview-your-business"
            className="px-8 py-4 text-lg font-bold text-white border-2 border-white rounded-lg hover:bg-white/10 transition-all"
          >
            Review your details
          </Link>
        </div>
      </div>
    </main>
  )
}
