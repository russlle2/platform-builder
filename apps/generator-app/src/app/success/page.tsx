import Link from 'next/link'
import Stripe from 'stripe'
import { getPlan } from '@/lib/plans'

export const dynamic = 'force-dynamic'

type VerifiedSession = {
  ok: boolean
  businessName?: string
  slug?: string
  planName?: string
  managed?: boolean
}

async function verifySession(sessionId: string | undefined): Promise<VerifiedSession> {
  if (!sessionId) return { ok: false }
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return { ok: false }
  try {
    const stripe = new Stripe(secret, { apiVersion: '2023-10-16' })
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    // A completed Checkout Session means payment succeeded or a trial started.
    if (session.status !== 'complete') return { ok: false }
    const meta = session.metadata || {}
    const plan = getPlan(meta.planKey)
    return {
      ok: true,
      slug: meta.slug || undefined,
      planName: plan?.name,
      managed: plan?.managedService ?? false,
    }
  } catch {
    return { ok: false }
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  const result = await verifySession(session_id)

  if (!result.ok) {
    return (
      <main className="min-h-screen pt-24 pb-16 container-hvac">
        <div className="glass-panel rounded-3xl p-12 max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-bright-white mb-4">
            We couldn&rsquo;t confirm this payment
          </h1>
          <p className="text-gray-300 text-lg">
            If you just completed checkout, give it a moment and refresh. If you were charged but
            don&rsquo;t see your portal, contact us and we&rsquo;ll sort it out right away.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link href="/pricing" className="cta-button">
              Back to pricing
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 text-lg font-bold text-white border-2 border-white/30 rounded-lg hover:bg-white/10 transition-all"
            >
              Contact support
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const portalHref = result.slug ? `/portal?slug=${encodeURIComponent(result.slug)}` : '/portal'
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'dailyclarity.org'

  return (
    <main className="min-h-screen pt-24 pb-16 container-hvac">
      <div className="glass-panel rounded-3xl p-12 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-bright-white mb-4">
            Payment confirmed
          </h1>
          <p className="text-gray-300 text-lg">
            Your {result.planName ? <strong>{result.planName}</strong> : null} subscription is active.
            We&rsquo;re provisioning your website now and will email you when it&rsquo;s live.
          </p>

          {/* Email notice */}
          <div className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-100 text-sm">
            <svg className="w-5 h-5 flex-shrink-0 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>
              <strong className="text-cyan-200">Check your email</strong> — your private portal access link will arrive shortly.
            </span>
          </div>

          {/* Slug / site URL preview */}
          {result.slug && (
            <p className="mt-4 text-slate-300 text-sm">
              Your site will be at:{' '}
              <span className="font-mono text-cyan-200">
                {result.slug}.{platformDomain}
              </span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {[
            {
              title: 'Provisioning',
              copy: 'Your hosted subdomain and SSL are being set up automatically.',
            },
            {
              title: 'Template build',
              copy: 'Your chosen layout is being populated with your business details.',
            },
            result.managed
              ? {
                  title: 'Done-for-you setup',
                  copy: 'Our team will begin your ads and security setup and reach out shortly.',
                }
              : {
                  title: 'Launch ready',
                  copy: 'We will confirm your subdomain and go live — then it is yours to edit.',
                },
          ].map((step) => (
            <div key={step.title} className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{step.title}</p>
              <p className="text-slate-200 mt-2 text-sm">{step.copy}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link href={portalHref} className="cta-button">
            Go to My Dashboard
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
