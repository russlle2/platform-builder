'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics'
import { PLAN_LIST, AUTOMATED_FEATURES, MANAGED_FEATURES } from '@/lib/plans'

const pricingTiers = PLAN_LIST

const CHECKOUT_CONTEXT_KEY = 'pb_checkout_context'

type CheckoutContext = {
  slug: string | null
  template: string | null
  niche: string | null
  colorScheme: string
  fontVariation: string
  structureVariation: string
}

export default function PricingClient() {
  const billingPeriod: 'monthly' | 'annual' = 'monthly'
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [trialDays, setTrialDays] = useState(7)
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
  const [checkoutReady, setCheckoutReady] = useState(false)
  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; slug: string; siteUrl: string | null; log: string[] } | null>(null)
  const searchParams = useSearchParams()
  const slug = useMemo(() => searchParams.get('slug'), [searchParams])
  const template = useMemo(() => searchParams.get('template'), [searchParams])
  const niche = useMemo(() => searchParams.get('niche'), [searchParams])
  const colorScheme = useMemo(() => searchParams.get('color') || 'original', [searchParams])
  const fontVariation = useMemo(() => searchParams.get('font') || 'original', [searchParams])
  const structureVariation = useMemo(() => searchParams.get('structure') || 'original', [searchParams])

  // The wizard/template pages pass slug/template/niche/style via URL. Persist
  // that context so a customer can revisit pricing without losing their build.
  const readCheckoutContext = useCallback((): CheckoutContext => {
    let stored: Partial<CheckoutContext> = {}
    try {
      const raw = sessionStorage.getItem(CHECKOUT_CONTEXT_KEY)
      if (raw) stored = JSON.parse(raw)
    } catch { /* ignore */ }
    return {
      slug: slug ?? stored.slug ?? null,
      template: template ?? stored.template ?? null,
      niche: niche ?? stored.niche ?? null,
      colorScheme: searchParams.get('color') || stored.colorScheme || 'original',
      fontVariation: searchParams.get('font') || stored.fontVariation || 'original',
      structureVariation: searchParams.get('structure') || stored.structureVariation || 'original',
    }
  }, [slug, template, niche, searchParams])

  const startCheckout = useCallback(async (planKey: string) => {
    try {
      track('checkout_start', { planKey })
      setCheckoutError(null)

      // Retrieve saved customer values + inline edits from sessionStorage
      let customerValues: Record<string, string> = {}
      let inlineEdits: Record<string, unknown> = {}
      let imageSwaps: Record<string, unknown> = {}
      let imageOwner = ''
      try {
        const saved = sessionStorage.getItem('pb_template_values')
        if (saved) customerValues = JSON.parse(saved)
        const savedEdits = sessionStorage.getItem('pb_inline_edits')
        if (savedEdits) inlineEdits = JSON.parse(savedEdits)
        const savedImages = sessionStorage.getItem('pb_image_swaps')
        if (savedImages) imageSwaps = JSON.parse(savedImages)
        imageOwner = sessionStorage.getItem('pb_image_owner') || ''
      } catch { /* ignore */ }

      const ctx = readCheckoutContext()

      // A paid order must include enough information to provision a real site.
      // Send direct pricing visitors into the preview flow instead of failing
      // after they click a button that appears to start checkout.
      const businessName = (customerValues.BUSINESS_NAME || '').trim()
      const email = (customerValues.EMAIL || '').trim()
      if (!businessName || !email || !ctx.template || !ctx.niche) {
        sessionStorage.setItem('pb_selected_plan', planKey)
        track('checkout_prerequisite_redirect', {
          planKey,
          hasBusinessName: Boolean(businessName),
          hasEmail: Boolean(email),
          hasTemplate: Boolean(ctx.template),
          hasNiche: Boolean(ctx.niche),
        })
        window.location.assign(`/preview-your-business?plan=${encodeURIComponent(planKey)}`)
        return
      }

      // The customer already reviewed these details in the live preview. Go
      // directly to Stripe instead of inserting another confirmation page.
      setIsSubmitting(planKey)
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          slug: ctx.slug,
          template: ctx.template,
          niche: ctx.niche,
          colorScheme: ctx.colorScheme,
          fontVariation: ctx.fontVariation,
          structureVariation: ctx.structureVariation,
          customerValues,
          inlineEdits,
          imageSwaps,
          imageOwner,
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
  }, [readCheckoutContext])

  useEffect(() => {
    track('pricing_view', {})

    // Persist any wizard context that arrived via URL.
    if (template || niche || slug) {
      try {
        sessionStorage.setItem(
          CHECKOUT_CONTEXT_KEY,
          JSON.stringify({
            slug,
            template,
            niche,
            colorScheme,
            fontVariation,
            structureVariation,
          }),
        )
      } catch { /* ignore */ }
    }

    try {
      const saved = sessionStorage.getItem('pb_template_values')
      const customerValues = saved ? JSON.parse(saved) as Record<string, string> : {}
      const ctx = readCheckoutContext()
      setCheckoutReady(Boolean(
        customerValues.BUSINESS_NAME?.trim() &&
        customerValues.EMAIL?.trim() &&
        ctx.template &&
        ctx.niche
      ))
    } catch {
      setCheckoutReady(false)
    }

    fetch('/api/platform/config')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.trialDays === 'number' && data.trialDays > 0) {
          setTrialDays(data.trialDays)
        }
      })
      .catch(() => {})
  }, [template, niche, slug, colorScheme, fontVariation, structureVariation, readCheckoutContext])

  return (
    <main className="relative min-h-screen pt-24 pb-20">
      <div className="relative z-10">
        {/* Header */}
        <section className="container-hvac py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <span className="signal-chip">Pricing</span>
              <h1 className="text-5xl md:text-6xl font-bold text-bright-white">
                Choose the plan that launches your website platform
              </h1>
              <p className="text-xl text-slate-200 max-w-xl">
                Every plan includes hosting, integrations, and portal access.
                {trialDays > 0 && (
                  <span className="block mt-2 text-cyan-200">
                    {trialDays}-day free trial — card required, cancel anytime before billing starts.
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-6 text-sm text-slate-300">
                <span>Fully automated setup</span>
                <span>Portal edits included</span>
                <span>Done-for-you ads + security on the $80 plan</span>
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
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Built for</p>
              <p className="text-3xl font-bold text-white">Wellness</p>
              <p className="text-sm text-slate-300">Therapy, coaching, sound, scent &amp; integrative care</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Avg launch time</p>
              <p className="text-3xl font-bold text-white">48 hrs</p>
              <p className="text-sm text-slate-300">From intake to hosted platform</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Platform uptime</p>
              <p className="text-3xl font-bold text-white">Hosted 24/7</p>
              <p className="text-sm text-slate-300">Managed security on the $80 plan</p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container-hvac pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pricingTiers.map((tier) => (
              <PricingCard
                key={tier.name}
                tier={tier}
                billingPeriod={billingPeriod}
                trialDays={trialDays}
                onCheckout={() => startCheckout(tier.key)}
                isSubmitting={isSubmitting === tier.key}
                checkoutReady={checkoutReady}
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
          <p className="text-center text-slate-400 text-sm mt-6">
            Need help choosing?{' '}
            <Link href="/contact" className="text-cyan-300 hover:text-cyan-200 underline">
              Contact us before checkout
            </Link>
          </p>
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
                      let inlineEdits: Record<string, unknown> = {}
                      let imageSwaps: Record<string, unknown> = {}
                      let imageOwner = ''
                      try {
                        const saved = sessionStorage.getItem('pb_template_values')
                        if (saved) customerValues = JSON.parse(saved)
                        const savedEdits = sessionStorage.getItem('pb_inline_edits')
                        if (savedEdits) inlineEdits = JSON.parse(savedEdits)
                        const savedImages = sessionStorage.getItem('pb_image_swaps')
                        if (savedImages) imageSwaps = JSON.parse(savedImages)
                        imageOwner = sessionStorage.getItem('pb_image_owner') || ''
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
                          inlineEdits,
                          imageSwaps,
                          imageOwner,
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
            <h2 className="text-3xl font-bold text-white mb-2">Compare plans</h2>
            <p className="text-slate-300 mb-8 max-w-2xl">
              Everything in the platform is automated and included in both plans. The
              <strong className="text-white"> Security + Ads</strong> plan adds one done-for-you
              service we run for you by hand.
            </p>
            <div className="grid grid-cols-[1.6fr_repeat(2,1fr)] gap-x-6 gap-y-3 text-sm text-slate-200">
              <p className="text-slate-400 uppercase tracking-[0.3em] text-xs">Feature</p>
              <p className="text-cyan-200 uppercase tracking-[0.3em] text-xs">Basic · $20</p>
              <p className="text-amber-200 uppercase tracking-[0.3em] text-xs">Security + Ads · $80</p>

              {AUTOMATED_FEATURES.map((feature) => (
                <FragmentRow key={feature} label={feature} basic="Included" premium="Included" />
              ))}

              <p className="col-span-3 pt-3 text-slate-400 uppercase tracking-[0.3em] text-xs">
                Done for you (managed by our team)
              </p>
              {MANAGED_FEATURES.map((feature) => (
                <FragmentRow key={feature} label={feature} basic="—" premium="Managed by us" />
              ))}
            </div>
          </div>
        </section>

        <section className="container-hvac pb-20">
          <div className="glass-panel rounded-3xl p-10">
            <h2 className="text-3xl font-bold text-white mb-6">What practitioners say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: 'Booked five new discovery calls in week one after launch.',
                  name: 'Jordan M.',
                  company: 'Lumen Wellness Studio',
                },
                {
                  quote: 'The platform made our booking flow feel premium overnight.',
                  name: 'Renee K.',
                  company: 'Stillwater Holistic',
                },
                {
                  quote: 'Finally a site that matches our brand and converts on mobile.',
                  name: 'Carlos D.',
                  company: 'Harmony Sound Bath',
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
                question="What's included in Basic ($20)?"
                answer="Basic is the fully automated platform: we build and launch your site on a hosted subdomain with SSL, and connect email notifications, secure storage, and online payments. From there it's self-serve — switch templates and styles, edit, and publish anytime through your portal, with a 7-day free trial to start."
              />
              <FAQItem
                question="What does Security + Ads ($80) add?"
                answer="Everything in Basic is still fully automated. On top of that, we personally run one done-for-you service: we set up and manage your ad and promo campaigns, and we harden and monitor your site's security and uptime. It's hands-on work delivered by our team — the rest of the platform stays self-serve."
              />
              <FAQItem
                question="How fast can I launch?"
                answer="Most builds go live within 48 hours once your intake is complete and your subscription is active."
              />
              <FAQItem
                question="Is there a free trial?"
                answer={
                  trialDays > 0
                    ? `Yes — every plan includes a ${trialDays}-day trial. We collect your card at checkout, but you are not charged until the trial ends. Cancel anytime in Stripe before then.`
                    : 'Subscriptions start billing when you complete checkout.'
                }
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
              <FAQItem
                question="Can I edit my site after launch?"
                answer="Yes — through your portal anytime. Update your business name, tagline, phone, email, services, and images without touching code. Changes publish to your live site automatically."
              />
              <FAQItem
                question="What if I need help?"
                answer="Contact us before or after checkout — we're here to help. Reach us through the contact page and we'll get back to you within one business day."
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
            <Link href="/preview-your-business" className="cta-button">
              Preview Your Business
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

function FragmentRow({ label, basic, premium }: { label: string; basic: string; premium: string }) {
  return (
    <>
      <p className="text-slate-300">{label}</p>
      <p className={basic === '—' ? 'text-slate-500' : 'text-slate-100'}>{basic}</p>
      <p className={premium === '—' ? 'text-slate-500' : 'text-emerald-200'}>{premium}</p>
    </>
  )
}

function PricingCard({
  tier,
  billingPeriod,
  trialDays,
  onCheckout,
  isSubmitting,
  checkoutReady,
}: {
  tier: (typeof pricingTiers)[0]
  billingPeriod: 'monthly' | 'annual'
  trialDays: number
  onCheckout: () => void
  isSubmitting: boolean
  checkoutReady: boolean
}) {
  const displayPrice = tier.price
  const isPeriodic = true

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
        {trialDays > 0 && (
          <p className="text-sm text-cyan-300">{trialDays}-day free trial, then billed monthly</p>
        )}
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
        disabled={isSubmitting}
        className={`block w-full text-center px-6 py-3 rounded-lg font-bold transition-all ${
          tier.highlight
            ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-900 shadow-lg hover:shadow-xl'
            : 'bg-white/10 hover:bg-white/20 text-white'
        } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isSubmitting
          ? 'Redirecting…'
          : !checkoutReady
            ? 'Build preview to start trial'
          : trialDays > 0
            ? `Start ${trialDays}-day trial`
            : 'Choose Plan'}
      </button>
      <p className="text-center text-xs text-slate-300 mt-3">
        {checkoutReady
          ? 'Secure Stripe checkout. Pay by card without creating a Stripe Link account.'
          : 'Choose a template and add your business details before payment.'}
      </p>
      <p className="text-center text-xs text-slate-400 mt-3">
        Need help choosing?{' '}
        <Link href="/contact" className="text-cyan-300 hover:text-cyan-200 underline">
          Contact us before checkout
        </Link>
      </p>
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
