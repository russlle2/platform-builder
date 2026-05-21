'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics'

const pricingTiers = [
  {
    name: 'Basic Services',
    price: 20,
    period: 'monthly',
    planKey: 'basic',
    description: 'Launch fast with core integrations included',
    features: [
      'Template-driven site launch',
      'Hosted subdomain included',
      'Postmark email setup',
      'Supabase storage & database',
      'Stripe payments connected',
      'Portal edits anytime',
      'Email support',
    ],
    highlight: false,
    badge: 'Starter',
  },
  {
    name: 'Growth Partner',
    price: 80,
    period: 'monthly',
    planKey: 'growth',
    description: 'Weekly optimization and promotional support',
    features: [
      'Everything in Basic Services',
      'Weekly website reviews',
      'SEO guidance and fixes',
      'Free advertising management',
      'Priority support',
    ],
    highlight: true,
    badge: 'Most Popular',
  },
]

export default function PricingClient() {
  const billingPeriod: 'monthly' | 'annual' = 'monthly'
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutReady, setCheckoutReady] = useState<boolean | null>(null)
  const [fulfillmentReady, setFulfillmentReady] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; slug: string; siteUrl: string | null; log: string[] } | null>(null)
  const searchParams = useSearchParams()
  const slug = useMemo(() => searchParams.get('slug'), [searchParams])
  const template = useMemo(() => searchParams.get('template'), [searchParams])
  const niche = useMemo(() => searchParams.get('niche'), [searchParams])
  const colorScheme = useMemo(() => searchParams.get('color') || 'original', [searchParams])
  const fontVariation = useMemo(() => searchParams.get('font') || 'original', [searchParams])
  const structureVariation = useMemo(() => searchParams.get('structure') || 'original', [searchParams])

  useEffect(() => {
    fetch('/api/integrations/status')
      .then((res) => res.json())
      .then((data) => {
        setCheckoutReady(!!data?.checkoutReady)
        setFulfillmentReady(!!data?.fulfillmentReady)
      })
      .catch(() => {
        setCheckoutReady(false)
        setFulfillmentReady(false)
      })
  }, [])

  const startCheckout = async (planKey: string) => {
    try {
      track('checkout_started', { planKey })
      setCheckoutError(null)
      setIsSubmitting(planKey)

      // Retrieve saved customer values from sessionStorage
      let customerValues: Record<string, string> = {}
      try {
        const saved = sessionStorage.getItem('pb_template_values')
        if (saved) customerValues = JSON.parse(saved)
      } catch { /* ignore */ }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          slug: slug || template,
          template,
          niche,
          colorScheme,
          fontVariation,
          structureVariation,
          customerValues,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          (data as { error?: string }).error || 'Checkout failed. Please try again.'
        )
      }
      if (data?.url) {
        window.location.assign(data.url)
      } else {
        throw new Error('Missing checkout URL')
      }
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : 'Unable to start checkout. Please try again.'
      )
    } finally {
      setIsSubmitting(null)
    }
  }

  return (
    <main className="relative min-h-screen pt-24 pb-20">
      <div className="relative z-10">
        {/* Header */}
        <section className="container-hvac py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <span className="signal-chip">Pricing</span>
              <h1 className="text-5xl md:text-6xl font-bold text-bright-white">
                Choose the plan that launches your website
              </h1>
              <p className="text-xl text-slate-200 max-w-xl">
                Every plan includes hosting, integrations, and portal access. Upgrade anytime
                when you want ongoing optimization and ad support.
              </p>
              <div className="flex flex-wrap gap-6 text-sm text-slate-300">
                <span>⚡ 30-member cap</span>
                <span>🔐 Portal edits included</span>
                <span>📈 Weekly optimization on Growth</span>
              </div>
            </div>
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <h2 className="text-2xl font-bold text-white">What you get on day one</h2>
              <ul className="space-y-3 text-slate-200">
                <li>Hosted platform + subdomain reservation</li>
                <li>Postmark email + Supabase storage connected</li>
                <li>Stripe payments ready for online bookings</li>
                <li>Portal access to edit and publish updates</li>
              </ul>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Setup timeline</span>
                <span className="text-cyan-200">48 hours or less</span>
              </div>
            </div>
          </div>
        </section>

        <section className="container-hvac pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Customer rating</p>
              <p className="text-3xl font-bold text-white">4.9 / 5</p>
              <p className="text-sm text-slate-300">Based on early client launches</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Avg launch time</p>
              <p className="text-3xl font-bold text-white">48 hrs</p>
              <p className="text-sm text-slate-300">From intake to hosted platform</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Support response</p>
              <p className="text-3xl font-bold text-white">Under 2 hrs</p>
              <p className="text-sm text-slate-300">Priority response on Growth</p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container-hvac pb-16">
          {checkoutReady === false && (
            <div className="mb-8 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6 text-amber-100">
              <p className="font-semibold text-amber-50">Checkout is not live yet</p>
              <p className="mt-2 text-sm text-amber-100/90">
                Stripe price IDs are missing in production. Add <code className="text-amber-200">STRIPE_PRICE_BASIC</code> and{' '}
                <code className="text-amber-200">STRIPE_PRICE_GROWTH</code> in Netlify, then redeploy.
                See <code className="text-amber-200">docs/PLATFORM_BUILDER_LAUNCH_AUDIT.md</code> in the repo.
              </p>
            </div>
          )}
          {checkoutReady && fulfillmentReady === false && (
            <div className="mb-8 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-6 text-cyan-50">
              <p className="font-semibold">Checkout works — auto-launch needs Netlify</p>
              <p className="mt-2 text-sm text-cyan-100/90">
                Payments can be taken, but customer sites will not deploy until{' '}
                <code className="text-cyan-200">NETLIFY_ACCESS_TOKEN</code> is set.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pricingTiers.map((tier) => (
              <PricingCard
                key={tier.name}
                tier={tier}
                billingPeriod={billingPeriod}
                onCheckout={() => startCheckout(tier.planKey)}
                isSubmitting={isSubmitting === tier.planKey}
                checkoutDisabled={checkoutReady === false}
              />
            ))}
          </div>
          {checkoutError && (
            <p className="text-center text-red-200 mt-6">{checkoutError}</p>
          )}
          {!slug && (
            <p className="text-center text-gray-300 mt-4">
              Tip: add a preferred slug in the wizard to reserve your subdomain sooner.
            </p>
          )}
        </section>

        {/* ═══ DEV-ONLY: Test Purchase ═══ */}
        {process.env.NEXT_PUBLIC_APP_STAGE !== 'production' && (
          <section className="container-hvac pb-12">
            <div className="rounded-2xl border-2 border-dashed border-yellow-500/40 bg-yellow-500/5 p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-yellow-500/20 text-yellow-300 text-[10px] font-bold uppercase tracking-widest">Dev Only</span>
                <h3 className="text-lg font-bold text-yellow-200">Simulate Purchase</h3>
              </div>
              <p className="text-sm text-yellow-100/70">
                Runs the full provisioning pipeline (slug reservation, Netlify deploy, Supabase records) without Stripe.
                {template && niche && (
                  <span className="block mt-1 text-yellow-200/90">
                    Template: <strong>{template}</strong> &middot; Niche: <strong>{niche}</strong> &middot; Color: <strong>{colorScheme}</strong> &middot; Font: <strong>{fontVariation}</strong> &middot; Layout: <strong>{structureVariation}</strong>
                  </span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={async () => {
                    setTestRunning(true)
                    setTestResult(null)
                    try {
                      let customerValues: Record<string, string> = {}
                      try {
                        const saved = sessionStorage.getItem('pb_template_values')
                        if (saved) customerValues = JSON.parse(saved)
                      } catch { /* ignore */ }

                      const res = await fetch('/api/test-purchase', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          slug: slug || template || 'test-site',
                          template,
                          niche,
                          planKey: 'basic',
                          colorScheme,
                          fontVariation,
                          structureVariation,
                          customerValues,
                        }),
                      })
                      const data = await res.json()
                      setTestResult(data)
                    } catch (err) {
                      setTestResult({ success: false, slug: '', siteUrl: null, log: [`Error: ${err}`] })
                    } finally {
                      setTestRunning(false)
                    }
                  }}
                  disabled={testRunning}
                  className="px-6 py-3 text-sm font-bold rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {testRunning ? 'Provisioning...' : 'Simulate Purchase (Free)'}
                </button>
                {testResult && (
                  <button
                    onClick={() => window.location.assign('/success')}
                    className="px-6 py-3 text-sm font-bold rounded-lg bg-green-500 hover:bg-green-400 text-slate-900 transition-all"
                  >
                    Go to Success Page &rarr;
                  </button>
                )}
              </div>
              {testResult && (
                <div className="mt-4 rounded-lg bg-slate-900/80 border border-white/10 p-4 space-y-2 text-sm font-mono">
                  <div className="flex items-center gap-2">
                    <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                      {testResult.success ? '\u2713' : '\u2717'}
                    </span>
                    <span className="text-white font-bold">
                      {testResult.success ? 'Purchase simulated successfully' : 'Simulation completed with issues'}
                    </span>
                  </div>
                  {testResult.slug && (
                    <p className="text-slate-300">Slug: <span className="text-cyan-300">{testResult.slug}</span></p>
                  )}
                  {testResult.siteUrl && (
                    <p className="text-slate-300">
                      Site: <a href={testResult.siteUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">{testResult.siteUrl}</a>
                    </p>
                  )}
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    <p className="text-slate-500 text-xs uppercase tracking-wider">Pipeline log</p>
                    {testResult.log.map((line, i) => (
                      <p key={i} className="text-slate-400 text-xs">{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="container-hvac pb-20">
          <div className="glass-panel rounded-3xl p-10">
            <h2 className="text-3xl font-bold text-white mb-6">Compare plans</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm text-slate-200">
              <div className="space-y-3">
                <p className="text-slate-400 uppercase tracking-[0.3em] text-xs">Included</p>
                <p>Hosted HVAC platform</p>
                <p>Postmark email + Supabase</p>
                <p>Stripe payments connected</p>
                <p>Portal edits anytime</p>
                <p>Template switching</p>
                <p>Support response</p>
              </div>
              <div className="space-y-3">
                <p className="text-cyan-200 uppercase tracking-[0.3em] text-xs">Basic</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Standard</p>
              </div>
              <div className="space-y-3">
                <p className="text-amber-200 uppercase tracking-[0.3em] text-xs">Growth</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Priority + weekly reviews</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container-hvac pb-20">
          <div className="glass-panel rounded-3xl p-10">
            <h2 className="text-3xl font-bold text-white mb-6">What HVAC owners say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: 'Booked five new service calls in week one after launch.',
                  name: 'Jordan M.',
                  company: 'Phoenix HVAC Group',
                },
                {
                  quote: 'The platform made our ads and booking flow feel premium overnight.',
                  name: 'Renee K.',
                  company: 'Blue Ridge Mechanical',
                },
                {
                  quote: 'Finally a site that matches our brand and converts on mobile.',
                  name: 'Carlos D.',
                  company: 'Summit Air Pros',
                },
              ].map((item) => (
                <div key={item.name} className="card-mahogany space-y-4">
                  <p className="text-slate-200">&ldquo;{item.quote}&rdquo;</p>
                  <div>
                    <p className="text-white font-semibold">{item.name}</p>
                    <p className="text-sm text-slate-400">{item.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container-hvac py-16">
          <div className="glass-panel rounded-3xl p-12">
            <h2 className="text-4xl font-bold text-bright-white mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <FAQItem
                question="What's included in Basic Services?"
                answer="We launch your site on a hosted subdomain and connect Postmark for email, Supabase for storage, and Stripe for payments. You can edit anytime through your portal."
              />
              <FAQItem
                question="How fast can I launch?"
                answer="Most builds go live within 48 hours once your intake is complete and your subscription is active."
              />
              <FAQItem
                question="Can I switch plans later?"
                answer="Absolutely! You can upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate any differences."
              />
              <FAQItem
                question="What happens after the 30-member limit?"
                answer="Once we reach 30 active monthly members, new sign-ups will be added to a waitlist. This ensures we maintain premium quality and personal attention for all members."
              />
              <FAQItem
                question="Do I need technical skills?"
                answer="None at all. Our guided intake collects your details, and we handle setup, integrations, hosting, and launch."
              />
              <FAQItem
                question="What if I want to cancel?"
                answer="No long-term contracts. Cancel anytime and keep access through the end of your billing period."
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container-hvac py-20">
          <div className="glass-panel rounded-3xl p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-bright-white mb-6">
              Ready to Claim Your Spot?
            </h2>
            <p className="text-xl text-pure-white mb-8 max-w-2xl mx-auto">
              Join the elite professionals who build like pros
            </p>
            <Link href="/wizard" className="cta-button">
              Start Building Now
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

function PricingCard({
  tier,
  billingPeriod,
  onCheckout,
  isSubmitting,
  checkoutDisabled = false,
}: {
  tier: (typeof pricingTiers)[0]
  billingPeriod: 'monthly' | 'annual'
  onCheckout: () => void
  isSubmitting: boolean
  checkoutDisabled?: boolean
}) {
  const displayPrice = tier.price
  const isPeriodic = tier.period !== 'one-time'

  return (
    <div
      className={`card-mahogany relative ${
        tier.highlight ? 'ring-2 ring-cyan-400/80 scale-105' : ''
      } hover:scale-105 transition-all`}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-500 text-slate-900 text-sm font-bold rounded-full">
          {tier.badge}
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-4 mb-6">
        <h3 className="text-2xl font-bold text-bright-white">{tier.name}</h3>
        <div className="space-y-1">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold text-bright-white">
              ${displayPrice}
            </span>
            {isPeriodic && <span className="text-gray-400 text-lg">/month</span>}
          </div>
          {!isPeriodic && (
            <p className="text-sm text-gray-400">One-time payment</p>
          )}
        </div>
        <p className="text-gray-300">{tier.description}</p>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-300 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        type="button"
        onClick={onCheckout}
        disabled={isSubmitting || checkoutDisabled}
        className={`block w-full text-center px-6 py-3 rounded-lg font-bold transition-all ${
          tier.highlight
            ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-900 shadow-lg hover:shadow-xl'
            : 'bg-white/10 hover:bg-white/20 text-white'
        } ${isSubmitting || checkoutDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isSubmitting ? 'Redirecting…' : checkoutDisabled ? 'Checkout unavailable' : 'Choose Plan'}
      </button>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-white/10 pb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <h3 className="text-xl font-semibold text-bright-white group-hover:text-blue-400 transition-colors">
          {question}
        </h3>
        <svg
          className={`w-6 h-6 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && <p className="mt-4 text-gray-300 leading-relaxed">{answer}</p>}
    </div>
  )
}
