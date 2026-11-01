'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import { CUSTOM_BUILD_REVIEW_MESSAGE_LIMIT, customBuildReviewMessage, validateCustomBuildBrief } from '@/lib/custom-build'

const DRAFT_KEY = 'dailyclarity_custom_build_draft'

type FormState = {
  businessName: string
  contactName: string
  email: string
  phone: string
  siteVision: string
  requiredFunctionality: string
  inspirationLinks: string
  existingWebsite: string
  acceptedTerms: boolean
}

const EMPTY_FORM: FormState = {
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  siteVision: '',
  requiredFunctionality: '',
  inspirationLinks: '',
  existingWebsite: '',
  acceptedTerms: false,
}

export default function CustomBuildForm({ wasCanceled }: { wasCanceled: boolean }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [hydrated, setHydrated] = useState(false)
  const [restoredDraft, setRestoredDraft] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [checkoutUncertain, setCheckoutUncertain] = useState(false)
  const [checkoutReference, setCheckoutReference] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'review' | 'payment'>('review')
  const [saved, setSaved] = useState<'sent' | 'stored_for_review' | null>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const restored = { ...EMPTY_FORM }
        for (const key of Object.keys(EMPTY_FORM) as (keyof FormState)[]) {
          if (key !== 'acceptedTerms' && typeof parsed?.[key] === 'string') restored[key] = parsed[key]
        }
        setForm(restored)
        setRestoredDraft(Object.values(restored).some((value) => typeof value === 'string' && value.trim().length > 0))
      }
    } catch { /* ignore invalid drafts */ }
    setHydrated(true)
    track('custom_build_view', {})
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, acceptedTerms: false }))
    } catch { /* ignore unavailable storage */ }
  }, [form, hydrated])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, acceptedTerms: false, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    setError(null)
    setSaved(null)
    const brief = validateCustomBuildBrief(form)
    if (!brief.ok) {
      setError(brief.error)
      return
    }
    const message = customBuildReviewMessage(brief.data)
    if (mode === 'review' && message.length > CUSTOM_BUILD_REVIEW_MESSAGE_LIMIT) {
      setError('Your combined brief is too long to send. Please shorten the descriptions or references by at least ' + (message.length - CUSTOM_BUILD_REVIEW_MESSAGE_LIMIT).toLocaleString() + ' characters. Your draft is still in this form.')
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setCheckoutUncertain(false)
    setCheckoutReference(null)
    let definiteFailure = false
    track(mode === 'review' ? 'custom_build_review_start' : 'custom_build_checkout_start', {})

    try {
      const response = await fetch(mode === 'review' ? '/api/forms/contact' : '/api/stripe/custom-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'review' ? {
          name: brief.data.contactName || brief.data.businessName,
          email: brief.data.email,
          phone: brief.data.phone || '',
          message,
        } : form),
      })
      const data = await response.json().catch(() => null)
      if (mode === 'review') {
        if (!response.ok || data?.ok !== true) {
          throw new Error(data?.error || 'Unable to save your brief. Please try again.')
        }
        setSaved(data.deliveryStatus === 'sent' ? 'sent' : 'stored_for_review')
        submittingRef.current = false
        setSubmitting(false)
        track('custom_build_review_saved', {})
        return
      }
      if (data?.code === 'checkout_creation_uncertain') {
        setCheckoutUncertain(true)
        setCheckoutReference(typeof data.reference === 'string' ? data.reference : null)
        setError("We couldn't confirm this checkout attempt. Please don't start another payment yet. Contact support so we can check it.")
        return
      }
      if (!response.ok || !data?.url) {
        definiteFailure = !response.ok && typeof data?.error === 'string' && (
          (response.status >= 400 && response.status < 500) || data.retrySafe === true
        )
        throw new Error(data?.error || 'Unable to open secure checkout. Please try again.')
      }
      window.location.assign(data.url)
    } catch (err) {
      if (mode === 'payment' && !definiteFailure) {
        setCheckoutUncertain(true)
        setError("We couldn't confirm this checkout attempt. Please don't start another payment yet. Contact support so we can check it.")
        return
      }
      setError(err instanceof Error ? err.message : 'Unable to submit your brief. Please try again.')
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 dc-field rounded-lg placeholder:dc-text-muted focus:outline-none focus:ring-2 focus:ring-teal-700'

  return (
    <main className="relative min-h-screen pt-24 pb-20">
      <section className="container-hvac py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 items-start">
          <div className="lg:sticky lg:top-24 space-y-6">
            <div>
              <span className="signal-chip">One-time custom build</span>
              <h1 className="text-4xl md:text-5xl font-bold dc-text-heading mt-5">
                Tell us exactly what you want built.
              </h1>
              <p className="text-lg dc-text-body mt-5 leading-relaxed">
                Describe the appearance, pages, interactions, and functionality you need. Your
                brief goes to DailyClarity for a scope discussion before you decide to pay.
                Agree the inclusions, hosting, revisions, and timing before starting a build.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-8 space-y-5 border border-cyan-400/30">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] dc-text-accent">Custom Website Build</p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-5xl font-bold dc-text-heading">$500</span>
                  <span className="dc-text-body pb-1">one time</span>
                </div>
                <p className="text-sm dc-text-accent mt-2">Request a scope review first. No payment details needed.</p>
              </div>
              <ul className="space-y-3 text-sm dc-text-body">
                <li>✓ Detailed design and functionality brief</li>
                <li>✓ Manual review by DailyClarity</li>
                <li>✓ Responsive custom website build</li>
                <li>✓ Scope and next steps discussed by email</li>
              </ul>
              <p className="text-xs dc-text-muted leading-relaxed">
                The $500 covers the custom website build described in the accepted project scope.
                Domains, paid plugins, third-party subscriptions, and materially expanded app
                functionality are not included unless confirmed separately in writing.
              </p>
              <div className="pt-4 border-t dc-border text-xs dc-text-body space-y-2">
                <p>If you choose to proceed: $500 charged immediately through Stripe Checkout</p>
                <p>Pay by card or an eligible wallet. Available methods are shown in Stripe Checkout.</p>
                <p>No DailyClarity account required before payment</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 md:p-10">
            {wasCanceled && hydrated && (
              <div role="status" className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 dc-text-warm">
                {restoredDraft
                  ? 'You returned from checkout. Your project brief was restored from this tab. Review it before continuing.'
                  : 'You returned from checkout. No saved brief was found in this tab.'}
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-3xl font-bold dc-text-heading">Your project brief</h2>
              <p className="dc-text-body mt-2">
                Be specific—the more detail you provide, the more accurately we can scope and build your site.
              </p>
            </div>

            {saved ? (
              <div role="status" className="rounded-xl border border-cyan-400/30 dc-bg-accent-soft p-6 space-y-4 dc-text-body">
                <h3 className="text-xl font-semibold dc-text-heading">Brief saved for review. No payment taken.</h3>
                <p>We’ll use your contact details to discuss the project. A submitted brief does not confirm the scope or a start date.</p>
                {saved === 'stored_for_review' && <p>Your brief is stored, but we could not confirm delivery of the notification email. You do not need to submit it again.</p>}
                <Link href="/contact" className="block dc-text-accent underline underline-offset-4">Contact DailyClarity about your brief</Link>
                <button type="button" className="text-sm dc-text-accent underline underline-offset-4" onClick={() => setSaved(null)}>Return to my draft</button>
              </div>
            ) : <form onSubmit={submit} className="space-y-7">
              <fieldset disabled={submitting} className="space-y-7 disabled:opacity-70">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Business name" required>
                  <input
                    required
                    name="businessName"
                    autoComplete="organization"
                    minLength={2}
                    maxLength={120}
                    value={form.businessName}
                    onChange={(e) => update('businessName', e.target.value)}
                    className={inputClass}
                    placeholder="Your business or project name"
                  />
                </Field>
                <Field label="Contact name">
                  <input
                    name="contactName"
                    autoComplete="name"
                    maxLength={120}
                    value={form.contactName}
                    onChange={(e) => update('contactName', e.target.value)}
                    className={inputClass}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    required
                    type="email"
                    name="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={254}
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    maxLength={40}
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    className={inputClass}
                    placeholder="Optional"
                  />
                </Field>
              </div>

              <Field
                label="Describe how you want the website to look"
                required
                hint={`${form.siteVision.length}/5,000 · minimum 100 characters`}
              >
                <textarea
                  required
                  minLength={100}
                  maxLength={5_000}
                  rows={9}
                  value={form.siteVision}
                  onChange={(e) => update('siteVision', e.target.value)}
                  className={inputClass}
                  placeholder="Describe the visual style, colors, mood, target audience, pages, content, brand personality, and anything else you want us to understand."
                />
              </Field>

              <Field
                label="Describe the required features and functionality"
                required
                hint={`${form.requiredFunctionality.length}/4,000 · minimum 50 characters`}
              >
                <textarea
                  required
                  minLength={50}
                  maxLength={4_000}
                  rows={7}
                  value={form.requiredFunctionality}
                  onChange={(e) => update('requiredFunctionality', e.target.value)}
                  className={inputClass}
                  placeholder="Examples: booking, payments, forms, galleries, memberships, customer logins, animations, integrations, or special mobile behavior."
                />
              </Field>

              <Field label="Websites or visual references you like" hint="Optional · up to 2,000 characters">
                <textarea
                  maxLength={2_000}
                  rows={4}
                  value={form.inspirationLinks}
                  onChange={(e) => update('inspirationLinks', e.target.value)}
                  className={inputClass}
                  placeholder="Paste links and explain what you like about each one."
                />
              </Field>

              <Field label="Existing website" hint="Optional">
                <input
                  name="existingWebsite"
                  autoComplete="url"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={500}
                  value={form.existingWebsite}
                  onChange={(e) => update('existingWebsite', e.target.value)}
                  className={inputClass}
                  placeholder="https://your-current-site.com"
                />
              </Field>

              {mode === 'payment' && <label className="flex items-start gap-3 p-4 rounded-xl border dc-border dc-surface-soft text-sm dc-text-body">
                <input
                  required
                  type="checkbox"
                  checked={form.acceptedTerms}
                  onChange={(e) => update('acceptedTerms', e.target.checked)}
                  className="mt-1 h-4 w-4 accent-cyan-400"
                />
                <span>
                  I have discussed this scope with DailyClarity, confirm that my brief is accurate, authorize an immediate one-time $500 charge,
                  and agree to the <Link href="/terms" className="dc-text-accent underline">Terms of Service</Link>{' '}
                  and <Link href="/privacy" className="dc-text-accent underline">Privacy Policy</Link>.
                </span>
              </label>}

              {mode === 'review' && <p className="text-sm dc-text-body">We’ll save your brief and use these details to discuss your project. See our <Link href="/privacy" className="dc-text-accent underline">Privacy Policy</Link>.</p>}

              {error && (
                <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-400/30 dc-text-error space-y-3">
                  <p>{error}</p>
                  {checkoutUncertain && <>
                    {checkoutReference && <p className="break-all text-sm">Reference: {checkoutReference}</p>}
                    <p><Link href="/contact" className="dc-text-accent underline">Contact support about this attempt</Link></p>
                  </>}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting && !checkoutUncertain}
                className="cta-button w-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutUncertain ? 'Checkout needs review' : submitting ? (mode === 'review' ? 'Saving your brief…' : 'Opening secure checkout…') : (mode === 'review' ? 'Request a scope review — no payment' : 'Continue to secure $500 payment')}
              </button>
              <p className="text-center text-xs dc-text-muted">
                {mode === 'review' ? 'No card required. This request does not place a paid order.' : 'Your card details are entered on Stripe and never pass through DailyClarity.'}
              </p>
              <button type="button" className="w-full text-center text-sm dc-text-body underline underline-offset-4" onClick={() => {
                setMode(mode === 'review' ? 'payment' : 'review')
                update('acceptedTerms', false)
                setError(null)
              }}>
                {mode === 'review' ? 'Already discussed your scope? Continue to payment' : 'Request a scope review first instead'}
              </button>
              </fieldset>
            </form>}
          </div>
        </div>
      </section>
    </main>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 mb-2 text-sm font-semibold dc-text-body">
        <span>{label}{required ? <span className="dc-text-error"> *</span> : null}</span>
        {hint ? <span className="text-xs font-normal dc-text-muted">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}
