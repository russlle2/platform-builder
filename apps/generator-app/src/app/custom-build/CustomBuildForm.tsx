'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'

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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY)
      if (saved) setForm({ ...EMPTY_FORM, ...JSON.parse(saved), acceptedTerms: false })
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
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    track('custom_build_checkout_start', {})

    try {
      const response = await fetch('/api/stripe/custom-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Unable to open secure checkout. Please try again.')
      }
      window.location.assign(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open secure checkout.')
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400'

  return (
    <main className="relative min-h-screen pt-24 pb-20">
      <section className="container-hvac py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 items-start">
          <aside className="lg:sticky lg:top-24 space-y-6">
            <div>
              <span className="signal-chip">One-time custom build</span>
              <h1 className="text-4xl md:text-5xl font-bold text-bright-white mt-5">
                Tell us exactly what you want built.
              </h1>
              <p className="text-lg text-slate-300 mt-5 leading-relaxed">
                Describe the appearance, pages, interactions, and functionality you need. Your
                complete brief is saved before Stripe opens, then released to our build queue
                after successful payment.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-8 space-y-5 border border-cyan-400/30">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Custom Website Build</p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-5xl font-bold text-white">$500</span>
                  <span className="text-slate-300 pb-1">one time</span>
                </div>
                <p className="text-sm text-cyan-200 mt-2">Charged immediately at secure checkout.</p>
              </div>
              <ul className="space-y-3 text-sm text-slate-200">
                <li>✓ Detailed design and functionality brief</li>
                <li>✓ Manual review by DailyClarity</li>
                <li>✓ Responsive custom website build</li>
                <li>✓ Written next steps sent to your email</li>
              </ul>
              <p className="text-xs text-slate-400 leading-relaxed">
                The $500 covers the custom website build described in the accepted project scope.
                Domains, paid plugins, third-party subscriptions, and materially expanded app
                functionality are not included unless confirmed separately in writing.
              </p>
              <div className="pt-4 border-t border-white/10 text-xs text-slate-300 space-y-2">
                <p>Secure Stripe Checkout</p>
                <p>Card, Apple Pay, Stripe Link, and Cash App where available</p>
                <p>No DailyClarity account required before payment</p>
              </div>
            </div>
          </aside>

          <div className="glass-panel rounded-3xl p-6 md:p-10">
            {wasCanceled && (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-100">
                Checkout was canceled. Your project brief is still saved on this device.
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white">Your project brief</h2>
              <p className="text-slate-300 mt-2">
                Be specific—the more detail you provide, the more accurately we can scope and build your site.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Business name" required>
                  <input
                    required
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
                  maxLength={500}
                  value={form.existingWebsite}
                  onChange={(e) => update('existingWebsite', e.target.value)}
                  className={inputClass}
                  placeholder="https://your-current-site.com"
                />
              </Field>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-white/15 bg-white/5 text-sm text-slate-200">
                <input
                  required
                  type="checkbox"
                  checked={form.acceptedTerms}
                  onChange={(e) => update('acceptedTerms', e.target.checked)}
                  className="mt-1 h-4 w-4 accent-cyan-400"
                />
                <span>
                  I confirm that my brief is accurate, authorize an immediate one-time $500 charge,
                  and agree to the <Link href="/terms" className="text-cyan-300 underline">Terms of Service</Link>{' '}
                  and <Link href="/privacy" className="text-cyan-300 underline">Privacy Policy</Link>.
                </span>
              </label>

              {error && (
                <p role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-400/30 text-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="cta-button w-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Opening secure checkout…' : 'Continue to secure $500 payment'}
              </button>
              <p className="text-center text-xs text-slate-400">
                Your card details are entered on Stripe and never pass through DailyClarity.
              </p>
            </form>
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
      <span className="flex items-center justify-between gap-3 mb-2 text-sm font-semibold text-slate-200">
        <span>{label}{required ? <span className="text-red-300"> *</span> : null}</span>
        {hint ? <span className="text-xs font-normal text-slate-500">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}
