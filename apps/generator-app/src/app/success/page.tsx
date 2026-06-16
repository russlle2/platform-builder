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
