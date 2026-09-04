'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics'
import { PLAN_LIST, AUTOMATED_FEATURES, MANAGED_FEATURES } from '@/lib/plans'
import {
  CUSTOM_THEME_STORAGE_KEY,
  sanitizeCustomTheme,
  type CustomTheme,
} from '@/lib/custom-theme'

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
  const [checkoutRecoveryUrl, setCheckoutRecoveryUrl] = useState<string | null>(null)
  const [trialDays, setTrialDays] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
  const [checkoutReady, setCheckoutReady] = useState(false)
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
      setCheckoutRecoveryUrl(null)

      // Retrieve saved customer values + inline edits from sessionStorage
      let customerValues: Record<string, string> = {}
      let inlineEdits: Record<string, unknown> = {}
      let imageSwaps: Record<string, unknown> = {}
      let imageOwner = ''
      let customTheme: CustomTheme | null = null
      try {
        const saved = sessionStorage.getItem('pb_template_values')
        if (saved) customerValues = JSON.parse(saved)
        const savedEdits = sessionStorage.getItem('pb_inline_edits')
        if (savedEdits) inlineEdits = JSON.parse(savedEdits)
        const savedImages = sessionStorage.getItem('pb_image_swaps')
        if (savedImages) imageSwaps = JSON.parse(savedImages)
        imageOwner = sessionStorage.getItem('pb_image_owner') || ''
        customTheme = sanitizeCustomTheme(
          JSON.parse(sessionStorage.getItem(CUSTOM_THEME_STORAGE_KEY) || 'null'),
        )
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
          customTheme,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const failure = data as { error?: string; code?: string; recoveryUrl?: string }
        if (failure.code?.startsWith('image_upload_')) {
          const base = failure.recoveryUrl || '/preview-your-business'
          setCheckoutRecoveryUrl(`${base}?plan=${encodeURIComponent(planKey)}`)
        }
        throw new Error(
          failure.error || 'Checkout failed. Please try again.'
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
        if (typeof data?.trialDays === 'number' && data.trialDays >= 0) {
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
                See the product first. Then choose the plan that fits.
              </h1>
              <p className="text-xl text-slate-200 max-w-xl">
                Explore the platform, build an editable preview with your own details, and compare
                the published scope of each plan before checkout.
                {trialDays > 0 && (
                  <span className="block mt-2 text-cyan-200">
                    {trialDays}-day free trial — card required, cancel anytime before billing starts.
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-6 text-sm text-slate-300">
                <span>Preview before payment</span>
                <span>Plan scope shown side by side</span>
                <span>Secure Stripe checkout</span>
              </div>
            </div>
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <h2 className="text-2xl font-bold text-white">What you can check before checkout</h2>
              <ul className="space-y-3 text-slate-200">
                <li>Interactive platform walkthrough</li>
                <li>A template preview populated with your business details</li>
                <li>Included features and managed services compared side by side</li>
                <li>Current price and trial terms before Stripe opens</li>
              </ul>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>No sales call required</span>
                <span className="text-cyan-200">Start with a preview</span>
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
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Try first</p>
              <p className="text-3xl font-bold text-white">Your preview</p>
              <p className="text-sm text-slate-300">Review your content and template before choosing</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Compare clearly</p>
              <p className="text-3xl font-bold text-white">Published scope</p>
              <p className="text-sm text-slate-300">Current prices, inclusions, and billing terms</p>
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
            <div className="text-center text-red-200 mt-6" role="alert">
              <p>{checkoutError}</p>
              {checkoutRecoveryUrl && (
                <Link
                  href={checkoutRecoveryUrl}
                  className="inline-block mt-3 font-semibold text-cyan-200 underline hover:text-cyan-100"
                >
                  Return to your preview to re-upload images
                </Link>
              )}
            </div>
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

        <section id="custom-build" className="container-hvac pb-16">
          <div className="rounded-3xl border border-amber-300/35 bg-gradient-to-br from-amber-500/15 via-slate-900/80 to-cyan-500/10 p-8 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <span className="inline-flex px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-bold uppercase tracking-[0.2em]">
                  One-time custom build
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mt-5">
                  Want a website designed around your exact instructions?
                </h2>
                <p className="text-slate-200 mt-4 max-w-3xl leading-relaxed">
                  Describe how your site should look and function in detail. Your brief is saved,
                  you make one immediate $500 Stripe payment, and the request is delivered to our
                  manual custom-build queue.
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-sm text-slate-300">
                  <span>Detailed design brief</span>
                  <span>Custom functionality request</span>
                  <span>No monthly plan required</span>
                </div>
              </div>
              <div className="lg:text-right min-w-[230px]">
                <div className="flex lg:justify-end items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">$500</span>
                  <span className="text-slate-300">one time</span>
                </div>
                <p className="text-sm text-amber-200 mt-2 mb-5">Charged immediately</p>
                <Link href="/custom-build" className="cta-button inline-flex justify-center">
                  Start my custom build
                </Link>
              </div>
            </div>
          </div>
        </section>

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
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                Evidence, not theater
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                What we can substantiate today
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                DailyClarity is in early access. We are keeping customer outcome claims off this
                page until they are permissioned, measured, and useful enough to evaluate fairly.
                In the meantime, you can inspect the product directly.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Interactive walkthrough',
                  copy: 'See the platform workflow, page structure, and customer editing path in the product demo.',
                },
                {
                  title: 'Your content in context',
                  copy: 'Build a preview with your own business details and explore compatible templates before payment.',
                },
                {
                  title: 'A clear proof standard',
                  copy: 'Future case studies will include customer permission, defined measurements, and enough context to interpret the result.',
                },
              ].map((item) => (
                <div key={item.title} className="card-mahogany mt-6 space-y-3">
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="leading-relaxed text-slate-300">{item.copy}</p>
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
                answer="Basic is the automated platform: we launch your selected template on a hosted subdomain with SSL and configure contact-form email notifications, secure storage, and a Stripe-secured DailyClarity billing portal. From there you can edit supported text and images in the current template and republish through your portal. Any free-trial terms are shown before checkout."
              />
              <FAQItem
                question="What does Security + Ads ($80) add?"
                answer="Security + Ads includes the self-serve Basic platform plus manually delivered campaign and security/operations work. We confirm goals, scope, and cadence by email before managed work begins."
              />
              <FAQItem
                question="How does the $500 custom website build work?"
                answer="Choose Custom Website Build, submit a detailed description of the appearance and functionality you want, and complete one immediate $500 Stripe payment. Your full brief is saved before checkout and delivered to our manual build queue after Stripe confirms payment. We then review the scope and contact you by email with next steps."
              />
              <FAQItem
                question="How fast can I launch?"
                answer="Launch timing depends on the completeness of your intake, the template you choose, and any domain or integration work required. We confirm the applicable next steps after checkout rather than promise one universal turnaround."
              />
              <FAQItem
                question="Is there a free trial?"
                answer={
                  trialDays > 0
                    ? `Yes — both monthly plans include a ${trialDays}-day trial. We collect your card at checkout, but you are not charged until the trial ends. The one-time custom build does not include a trial.`
                    : 'Subscriptions start billing when you complete checkout.'
                }
              />
              <FAQItem
                question="How do I change plans?"
                answer="Contact DailyClarity support to change plans. Self-service plan switching stays disabled until we can reconcile the service scope and billing adjustment safely."
              />
              <FAQItem
                question="Why don't you show customer results or testimonials yet?"
                answer="DailyClarity is in early access. We will publish customer stories only after receiving permission and documenting the work, measurement window, and relevant context. Until then, the demo and editable preview are the most honest ways to evaluate the product."
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
                answer="Contact us before or after checkout through the contact page. Include the plan or workflow you're considering so we can respond with specific next steps."
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container-hvac py-20">
          <div className="glass-panel rounded-3xl p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-bright-white mb-6">
              See your business in the product before you choose
            </h2>
            <p className="text-xl text-pure-white mb-8 max-w-2xl mx-auto">
              Build an editable preview, explore compatible templates, and return here when the
              product and plan scope feel right.
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
