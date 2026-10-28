'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics'
import { PLAN_LIST, AUTOMATED_FEATURES, MANAGED_FEATURES } from '@/lib/plans'
import {
  CUSTOM_THEME_STORAGE_KEY,
  sanitizeCustomTheme,
  type CustomTheme,
} from '@/lib/custom-theme'
import { sanitizeCatalogRevisionPin } from '@/lib/catalog-revision'
import { PREVIEW_SAMPLE_STORAGE_KEY } from '@/store/previewStore'
import { checkoutAccountEmail } from '@/lib/preview-intake'

const pricingTiers = PLAN_LIST

const CHECKOUT_CONTEXT_KEY = 'pb_checkout_context'
const CHECKOUT_CATALOG_REVISION_KEY = 'pb_catalog_revision'

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
  const [checkoutRecoveryLabel, setCheckoutRecoveryLabel] = useState('Return to your preview')
  const [checkoutUncertain, setCheckoutUncertain] = useState(false)
  const [checkoutReference, setCheckoutReference] = useState<string | null>(null)
  const checkoutInFlightRef = useRef(false)
  const [trialDays, setTrialDays] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
  const [checkoutReady, setCheckoutReady] = useState(false)
  const searchParams = useSearchParams()
  const bookingKitFunnel = searchParams.get('from') === 'booking-kit'
  const visiblePricingTiers = bookingKitFunnel ? pricingTiers.filter((tier) => tier.key === 'basic') : pricingTiers
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
    // React state alone cannot stop two clicks in the same event turn.
    if (checkoutInFlightRef.current) return
    checkoutInFlightRef.current = true
    setIsSubmitting(planKey)
    let requestSent = false
    let definiteFailure = false
    try {
      track('checkout_start', { planKey })
      setCheckoutError(null)
      setCheckoutRecoveryUrl(null)
      setCheckoutUncertain(false)
      setCheckoutReference(null)

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
      let catalogRevision: ReturnType<typeof sanitizeCatalogRevisionPin> = null
      try {
        const rawRevision = sessionStorage.getItem(CHECKOUT_CATALOG_REVISION_KEY)
        const savedRevision = rawRevision ? JSON.parse(rawRevision) as Record<string, unknown> : null
        if (savedRevision?.niche === ctx.niche && savedRevision.template === ctx.template) {
          catalogRevision = sanitizeCatalogRevisionPin(savedRevision.catalogRevision)
        }
      } catch { /* ignore malformed legacy state */ }

      // A paid order must include enough information to provision a real site.
      // Send direct pricing visitors into the preview flow instead of failing
      // after they click a button that appears to start checkout.
      const businessName = (customerValues.BUSINESS_NAME || '').trim()
      const email = (customerValues.EMAIL || '').trim()
      const accountEmail = checkoutAccountEmail(customerValues, sessionStorage.getItem('pb_biz_info'))
      if (sessionStorage.getItem(PREVIEW_SAMPLE_STORAGE_KEY) || !businessName || !email || !accountEmail || !ctx.template || !ctx.niche) {
        sessionStorage.setItem('pb_selected_plan', planKey)
        track('checkout_prerequisite_redirect', {
          planKey,
          hasBusinessName: Boolean(businessName),
          hasEmail: Boolean(email),
          hasTemplate: Boolean(ctx.template),
          hasNiche: Boolean(ctx.niche),
        })
        window.location.assign(`/preview-your-business?plan=${encodeURIComponent(planKey)}${bookingKitFunnel ? '&from=booking-kit' : ''}`)
        return
      }

      // The customer already reviewed these details in the live preview. Go
      // directly to Stripe instead of inserting another confirmation page.
      requestSent = true
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          accountEmail,
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
          catalogRevision,
        }),
      })
      const data = await response.json().catch(() => null)
      if (data?.code === 'checkout_creation_uncertain') {
        setCheckoutUncertain(true)
        setCheckoutReference(typeof data.reference === 'string' ? data.reference : null)
        setCheckoutError("We couldn't confirm this checkout attempt. Please don't start another payment yet. Contact support so we can check it.")
        return
      }
      if (!response.ok) {
        const failure = (data || {}) as { error?: string; code?: string; recoveryUrl?: string; retrySafe?: boolean }
        // A proxy timeout may follow a successful provider request. Only the
        // application can mark a server error as safe to retry.
        definiteFailure = typeof failure.error === 'string' && (
          (response.status >= 400 && response.status < 500) || failure.retrySafe === true
        )
        if (
          failure.code?.startsWith('image_upload_') ||
          failure.code === 'catalog_revision_unavailable'
        ) {
          if (failure.code === 'catalog_revision_unavailable') {
            // The recovery link intentionally starts a fresh preview. Without
            // clearing this unavailable pin, that page would immediately ask
            // for the same missing immutable snapshot and strand the customer.
            try { sessionStorage.removeItem(CHECKOUT_CATALOG_REVISION_KEY) } catch { /* ignore */ }
          }
          const base = failure.recoveryUrl || '/preview-your-business'
          setCheckoutRecoveryUrl(`${base}?plan=${encodeURIComponent(planKey)}${bookingKitFunnel ? '&from=booking-kit' : ''}`)
          setCheckoutRecoveryLabel(failure.code === 'catalog_revision_unavailable'
            ? 'Return to your preview to refresh this design'
            : 'Return to your preview to re-upload images')
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
      if (requestSent && !definiteFailure) {
        setCheckoutUncertain(true)
        setCheckoutError("We couldn't confirm this checkout attempt. Please don't start another payment yet. Contact support so we can check it.")
        return
      }
      setCheckoutError(
        error instanceof Error ? error.message : 'Unable to start checkout. Please try again.'
      )
      checkoutInFlightRef.current = false
      setIsSubmitting(null)
    }
  }, [readCheckoutContext, bookingKitFunnel])

  useEffect(() => {
    track('pricing_view', {})

    // Persist any wizard context that arrived via URL.
    if (template || niche || slug) {
      try {
        if (!sessionStorage.getItem(PREVIEW_SAMPLE_STORAGE_KEY)) sessionStorage.setItem(
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
        !sessionStorage.getItem(PREVIEW_SAMPLE_STORAGE_KEY) &&
        customerValues.BUSINESS_NAME?.trim() &&
        customerValues.EMAIL?.trim() &&
        checkoutAccountEmail(customerValues, sessionStorage.getItem('pb_biz_info')) &&
        ctx.template &&
        ctx.niche
      ))
    } catch {
      setCheckoutReady(false)
    }

    fetch('/api/platform/config')
      .then((res) => {
        if (!res.ok) throw new Error('Billing terms unavailable')
        return res.json()
      })
      .then((data) => {
        if (Number.isInteger(data?.trialDays) && data.trialDays >= 0) {
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
              <h1 className="text-4xl md:text-5xl font-semibold dc-text-heading">
                See the product first. Then choose the plan that fits.
              </h1>
              <p className="text-xl dc-text-body max-w-xl">
                Explore the platform, build an editable preview with your own details, and compare
                the published scope of each plan before checkout.
                {trialDays !== null && trialDays > 0 && (
                  <span className="block mt-2 dc-text-accent">
                    {trialDays}-day free trial — card required, cancel anytime before billing starts.
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-6 text-sm dc-text-body">
                <span>Preview before payment</span>
                <span>{bookingKitFunnel ? 'Website scope shown before checkout' : 'Plan scope shown side by side'}</span>
                <span>Secure Stripe checkout</span>
              </div>
            </div>
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <h2 className="text-2xl font-bold dc-text-heading">What you can check before checkout</h2>
              <ul className="space-y-3 dc-text-body">
                <li>A video walkthrough and a sample website you can explore</li>
                <li>A template preview populated with your business details</li>
                <li>{bookingKitFunnel ? 'Included website features and the separate custom-build option' : 'Included features and managed services compared side by side'}</li>
                <li>Current prices, plan scope, and where to review trial terms</li>
              </ul>
              <div className="flex items-center justify-between text-sm dc-text-body">
                <span>No sales call required</span>
                <span className="dc-text-accent">Start with a preview</span>
              </div>
            </div>
          </div>
        </section>

        <section className="container-hvac pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] dc-text-muted">Built for</p>
              <p className="text-3xl font-bold dc-text-heading">Wellness</p>
              <p className="text-sm dc-text-body">Therapy, coaching, sound, scent &amp; integrative care</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] dc-text-muted">Try first</p>
              <p className="text-3xl font-bold dc-text-heading">Your preview</p>
              <p className="text-sm dc-text-body">Review your content and template before choosing</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] dc-text-muted">Compare clearly</p>
              <p className="text-3xl font-bold dc-text-heading">Published scope</p>
              <p className="text-sm dc-text-body">Current prices, inclusions, and billing terms</p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container-hvac pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {visiblePricingTiers.map((tier) => (
              <PricingCard
                key={tier.name}
                tier={tier}
                billingPeriod={billingPeriod}
                trialDays={trialDays}
                onCheckout={() => startCheckout(tier.key)}
                isSubmitting={isSubmitting === tier.key}
                checkoutDisabled={isSubmitting !== null}
                checkoutUncertain={checkoutUncertain}
                checkoutReady={checkoutReady}
              />
            ))}
          </div>
          {checkoutError && (
            <div className="text-center dc-text-error mt-6" role="alert">
              <p>{checkoutError}</p>
              {checkoutRecoveryUrl && (
                <Link
                  href={checkoutRecoveryUrl}
                  className="inline-block mt-3 font-semibold dc-text-accent underline hover:dc-text-accent"
                >
                  {checkoutRecoveryLabel}
                </Link>
              )}
              {checkoutUncertain && (
                <div className="mt-3 space-y-3">
                  {checkoutReference && <p className="break-all text-sm">Reference: {checkoutReference}</p>}
                  <p><Link href="/contact" className="font-semibold dc-text-accent underline">Contact support about this attempt</Link></p>
                  <p><Link href="/dashboard" className="dc-text-accent underline">Check your account</Link></p>
                </div>
              )}
            </div>
          )}
          <p className="text-center dc-text-body mt-6 text-sm">
            Monthly plans renew until canceled. Cancel through your billing portal or contact support.{' '}
            <Link href="/refund-policy" className="dc-text-accent underline underline-offset-4">Cancellation and refund details</Link>
          </p>
          <p className="text-center dc-text-muted text-sm mt-6">
            Need help choosing?{' '}
            <Link href="/contact" className="dc-text-accent hover:dc-text-accent underline">
              Contact us before checkout
            </Link>
          </p>
        </section>

        <section id="custom-build" className="container-hvac pb-16">
          <div className="rounded-3xl border dc-border dc-pricing-highlight p-8 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <span className="inline-flex px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 dc-text-warm text-xs font-bold uppercase tracking-[0.2em]">
                  One-time custom build
                </span>
                <h2 className="text-3xl md:text-4xl font-bold dc-text-heading mt-5">
                  Want a website designed around your exact instructions?
                </h2>
                <p className="dc-text-body mt-4 max-w-3xl leading-relaxed">
                  Send a detailed brief with no payment. We agree the scope, inclusions and timing
                  before you choose whether to continue to the $500 checkout.
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-sm dc-text-body">
                  <span>Detailed design brief</span>
                  <span>Custom functionality request</span>
                  <span>No monthly plan required</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed dc-text-body">
                  The payment covers the accepted website scope. Domains, paid plugins,
                  third-party subscriptions, and expanded application work are separate.
                  Include specific functionality, hosting and revision needs in your scope review.
                </p>
              </div>
              <div className="lg:text-right min-w-[230px]">
                <div className="flex lg:justify-end items-baseline gap-2">
                  <span className="text-5xl font-bold dc-text-heading">$500</span>
                  <span className="dc-text-body">one time</span>
                </div>
                <p className="text-sm dc-text-warm mt-2 mb-5">Charged immediately only when you choose checkout</p>
                <Link href="/custom-build" className="cta-button inline-flex justify-center">
                  Request a scope review
                </Link>
              </div>
            </div>
          </div>
        </section>

        {!bookingKitFunnel && <section className="container-hvac pb-20">
          <div className="glass-panel rounded-3xl p-6 sm:p-10">
            <h2 className="text-3xl font-bold dc-text-heading mb-2">Compare plans</h2>
            <p className="dc-text-body mb-8 max-w-2xl">
              Both plans include the website tools shown below. The
              <strong className="dc-text-heading"> Security + Ads</strong> plan adds one done-for-you
              service bundle managed by our team. SSL and managed hosting are included in both plans.
            </p>
            <div className="grid grid-cols-[1.6fr_repeat(2,1fr)] gap-x-6 gap-y-3 text-sm dc-text-body">
              <p className="dc-text-muted uppercase tracking-[0.3em] text-xs">Feature</p>
              <p className="dc-text-accent uppercase tracking-[0.3em] text-xs">Basic · $20</p>
              <p className="dc-text-warm uppercase tracking-[0.3em] text-xs">Security + Ads · $80</p>

              {AUTOMATED_FEATURES.map((feature) => (
                <FragmentRow key={feature} label={feature} basic="Included" premium="Included" />
              ))}

              <p className="col-span-3 pt-3 dc-text-muted uppercase tracking-[0.3em] text-xs">
                Done for you (managed by our team)
              </p>
              {MANAGED_FEATURES.map((feature) => (
                <FragmentRow key={feature} label={feature} basic="—" premium="Managed by us" />
              ))}
            </div>
          </div>
        </section>}

        <section className="container-hvac pb-20">
          <div className="glass-panel rounded-3xl p-10">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] dc-text-accent">
                Explore the product
              </p>
              <h2 className="mt-3 text-3xl font-bold dc-text-heading">
                What we can substantiate today
              </h2>
              <p className="mt-4 leading-relaxed dc-text-body">
                DailyClarity is in early access. We are keeping customer outcome claims off this
                page until they are permissioned, measured, and useful enough to evaluate fairly.
                In the meantime, you can inspect the product directly.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Video walkthrough',
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
                  <h3 className="text-xl font-semibold dc-text-heading">{item.title}</h3>
                  <p className="leading-relaxed dc-text-body">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container-hvac py-16">
          <div className="glass-panel rounded-3xl p-6 sm:p-12">
            <h2 className="text-4xl font-bold dc-text-heading mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <FAQItem
                question="What's included in Basic ($20)?"
                answer="Basic is the automated platform: we launch your selected template on a hosted subdomain with SSL and configure contact-form email notifications, secure storage, and a Stripe-secured DailyClarity billing portal. From there you can edit supported text and images in the current template and republish through your portal. Any free-trial terms are shown before checkout."
              />
              {!bookingKitFunnel && <FAQItem
                question="What does Security + Ads ($80) add?"
                answer="Security + Ads includes the self-serve Basic platform plus manually delivered campaign and security/operations work. We confirm goals, scope, and cadence by email before managed work begins."
              />}
              <FAQItem
                question="How does the $500 custom website build work?"
                answer="Send a detailed brief for a scope review with no payment. We agree the scope, inclusions and timing before you choose whether to proceed. If the scope has already been discussed, the separate checkout charges $500 immediately. Domains, paid plugins, third-party subscriptions, and expanded application work are separate."
              />
              <FAQItem
                question="How fast can I launch?"
                answer="Launch timing depends on the completeness of your intake, the template you choose, and any domain or integration work required. We confirm the applicable next steps after checkout rather than promise one universal turnaround."
              />
              <FAQItem
                question="Is there a free trial?"
                answer={
                  trialDays === null
                    ? 'Current trial terms could not be confirmed on this page. Review the price, any trial, and the first billing date in checkout before you pay. The one-time custom build does not include a trial.'
                    : trialDays > 0
                    ? `Yes — ${bookingKitFunnel ? 'the Basic monthly plan includes' : 'both monthly plans include'} a ${trialDays}-day trial. We collect your card at checkout, but you are not charged until the trial ends. The one-time custom build does not include a trial.`
                    : 'Subscriptions start billing when you complete checkout.'
                }
              />
              <FAQItem
                question="How do I change plans?"
                answer="Contact DailyClarity support to request a plan change. We will confirm the service scope and any billing adjustment before making the change."
              />
              <FAQItem
                question="Why don't you show customer results or testimonials yet?"
                answer="DailyClarity is in early access. We will publish customer stories only after receiving permission and documenting the work, measurement window, and relevant context. Until then, the demo and editable preview are the most honest ways to evaluate the product."
              />
              <FAQItem
                question="Do I need technical skills?"
                answer="You can edit supported text and images without code. Your selected template includes managed hosting and publishing. If you need a particular booking service or other integration, confirm that requirement with us before paying."
              />
              <FAQItem
                question="What if I want to cancel?"
                answer="No long-term contracts. Cancel anytime and keep access through the end of your billing period."
              />
              <FAQItem
                question="Can I edit my site after launch?"
                answer="Use your website editing portal to update supported text and images in your selected template. Review your changes and publish them to your live site. This is the portal for managing your business website, not a patient or client-record system."
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
            <h2 className="text-4xl md:text-5xl font-bold dc-text-heading mb-6">
              See your business in the product before you choose
            </h2>
            <p className="text-xl dc-text-body mb-8 max-w-2xl mx-auto">
              Build an editable preview, explore compatible templates, and return here when the
              product and plan scope feel right.
            </p>
            <Link href={bookingKitFunnel ? '/preview-your-business?from=booking-kit' : '/preview-your-business'} className="cta-button">
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
      <p className="dc-text-body">{label}</p>
      <p className={basic === '—' ? 'dc-text-muted' : 'dc-text-heading'}>{basic}</p>
      <p className={premium === '—' ? 'dc-text-muted' : 'dc-text-success'}>{premium}</p>
    </>
  )
}

function PricingCard({
  tier,
  billingPeriod,
  trialDays,
  onCheckout,
  isSubmitting,
  checkoutDisabled,
  checkoutUncertain,
  checkoutReady,
}: {
  tier: (typeof pricingTiers)[0]
  billingPeriod: 'monthly' | 'annual'
  trialDays: number | null
  onCheckout: () => void
  isSubmitting: boolean
  checkoutDisabled: boolean
  checkoutUncertain: boolean
  checkoutReady: boolean
}) {
  const displayPrice = tier.price
  const isPeriodic = true

  return (
    <div
      className={`card-mahogany relative ${
        tier.highlight ? 'ring-2 ring-cyan-400/80' : ''
      } transition-all`}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="mx-auto mb-4 w-fit max-w-full px-4 py-1 dc-plan-badge dc-text-accent text-sm font-bold rounded-full text-center">
          {tier.badge}
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-4 mb-6">
        <h3 className="text-2xl font-bold dc-text-heading">{tier.name}</h3>
        <div className="space-y-1">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold dc-text-heading">
              ${displayPrice}
            </span>
            {isPeriodic && <span className="dc-text-muted text-lg">/month</span>}
          </div>
          {!isPeriodic && (
            <p className="text-sm dc-text-muted">One-time payment</p>
          )}
        </div>
        <p className="dc-text-body">{tier.description}</p>
        {trialDays !== null && trialDays > 0 && (
          <p className="text-sm dc-text-accent">{trialDays}-day free trial, then billed monthly</p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <svg
              className="w-5 h-5 dc-text-success flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="dc-text-body text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {tier.managedService && (
        <p className="mb-6 text-sm leading-relaxed dc-text-body">
          Advertising spend and third-party fees are separate unless agreed in writing.
          Contact us before checkout if you need a specific campaign scope or cadence.
        </p>
      )}

      {/* CTA Button */}
      <button
        type="button"
        onClick={onCheckout}
        disabled={checkoutDisabled}
        aria-busy={isSubmitting && !checkoutUncertain}
        className={`block w-full text-center px-6 py-3 rounded-lg font-bold transition-all ${
          tier.highlight
            ? 'dc-button-primary shadow-lg hover:shadow-xl'
            : 'dc-button-secondary'
        } ${checkoutDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isSubmitting
          ? checkoutUncertain ? 'Checkout needs review' : checkoutReady ? 'Opening secure checkout…' : 'Opening your preview…'
          : !checkoutReady
            ? 'Build preview to choose plan'
          : trialDays !== null && trialDays > 0
            ? `Start ${trialDays}-day trial`
            : 'Choose Plan'}
      </button>
      <p className="text-center text-xs dc-text-body mt-3">
        {checkoutReady
          ? 'Secure Stripe checkout. Available card and wallet options are shown there.'
          : 'Choose a template and add your business details before payment.'}
      </p>
      <p className="text-center text-xs dc-text-muted mt-3">
        Need help choosing?{' '}
        <Link href="/contact" className="dc-text-accent hover:dc-text-accent underline">
          Contact us before checkout
        </Link>
      </p>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const answerId = useId()

  return (
    <div className="border-b dc-border pb-6">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={answerId}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <h3 className="text-xl font-semibold dc-text-heading group-hover:dc-text-accent transition-colors">
          {question}
        </h3>
        <svg
          aria-hidden="true"
          className={`w-6 h-6 dc-text-muted transition-transform ${
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
      <p id={answerId} hidden={!isOpen} className="mt-4 dc-text-body leading-relaxed">{answer}</p>
    </div>
  )
}
