'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BOOKING_KIT_ACCESS_DAYS, BOOKING_KIT_NICHES, BOOKING_KIT_PRICE_CENTS, parseBookingKitFacts, type BookingKitFacts } from '@/lib/booking-kit-content'
import { NICHE_META } from '@/lib/templates/niche-meta'
import { BOOKING_KIT_ACCESS_STORAGE_KEY } from '@/lib/analytics-privacy'

const fields = [
  { key: 'businessName', label: 'Business name (optional)', max: 160 },
  { key: 'ownerName', label: 'Contact name (optional)', max: 120 },
  { key: 'service', label: 'One service you offer', max: 160, required: true, placeholder: 'For example, a one-to-one coaching session' },
  { key: 'audience', label: 'Who the service is for', max: 200, required: true },
  { key: 'format', label: 'Service format', max: 120, required: true, placeholder: 'For example, online one-to-one or in-person group' },
  { key: 'duration', label: 'Service duration', max: 80, required: true, placeholder: 'For example, 60 minutes' },
  { key: 'bookingMethod', label: 'How someone books', max: 350, required: true, placeholder: 'Your booking URL, email, phone, or booking instructions' },
  { key: 'locationDetails', label: 'Location or access details (optional)', max: 350 },
  { key: 'cancellationPolicy', label: 'Cancellation and rescheduling policy (optional)', max: 600 },
  { key: 'preparation', label: 'Preparation instructions (optional)', max: 600 },
] as const
const inputClass = 'mt-2 w-full rounded-lg border border-slate-500 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300'
const draftKey = 'dailyclarity_booking_kit_draft_v1'

export default function BookingKitForm({ enabled }: { enabled: boolean }) {
  const [draft, setDraft] = useState<Record<string, string>>({ niche: '', pricingChoice: '' })
  const [email, setEmail] = useState('')
  const [review, setReview] = useState<BookingKitFacts | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || 'null')
      const parsed = parseBookingKitFacts(saved)
      if (parsed.success) setDraft({ ...parsed.facts })
    } catch { /* Storage is optional. */ }
  }, [])
  useEffect(() => { if (review) reviewHeading.current?.focus() }, [review])

  function prepare(event: FormEvent) {
    event.preventDefault()
    const parsed = parseBookingKitFacts(draft)
    if (!parsed.success) { setErrors(parsed.errors); return }
    setErrors({})
    setStatus('')
    setReview(parsed.facts)
    try { sessionStorage.setItem(draftKey, JSON.stringify(parsed.facts)) } catch { /* Keep working without storage. */ }
  }
  async function checkout() {
    if (!enabled || busy || !review) return
    setBusy(true)
    setStatus('Preparing your kit and secure checkout…')
    try {
      const response = await fetch('/api/stripe/booking-kit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facts: review, purchaseEmail: email }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Checkout is unavailable. Your facts are saved in this tab.')
      const checkoutUrl = new URL(result.url)
      if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.stripe.com') throw new Error('Checkout could not be opened. Please try again.')
      if (typeof result.accessToken !== 'string' || result.accessToken.length < 16) throw new Error('Private delivery could not be prepared. Please try again.')
      // The bearer credential stays in this tab, never in Stripe metadata or a URL query.
      try { sessionStorage.setItem(BOOKING_KIT_ACCESS_STORAGE_KEY, result.accessToken) }
      catch { throw new Error('Enable session storage in this browser before continuing to payment, so you can access your kit even if delivery email is delayed.') }
      window.location.assign(checkoutUrl.href)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Checkout could not be opened. Please try again.')
      setBusy(false)
    }
  }

  return <section className="mt-10 rounded-2xl border border-white/20 bg-slate-900/60 p-5 sm:p-8">
    {review ? <div>
      <h2 ref={reviewHeading} tabIndex={-1} className="text-2xl font-semibold">Review your facts before payment</h2>
      <dl className="mt-6 space-y-4 break-words">
        <div><dt className="text-sm text-slate-400">Niche</dt><dd>{NICHE_META[review.niche].label}</dd></div>
        {fields.map(({ key, label }) => <div key={key}><dt className="text-sm text-slate-400">{label}</dt><dd>{review[key] || <span className="text-amber-200">Unfinished — not supplied</span>}</dd></div>)}
        <div><dt className="text-sm text-slate-400">Pricing</dt><dd>{review.pricingChoice === 'published' ? review.priceDetails : review.pricingChoice === 'free' ? 'No charge' : 'Ask for a quote'}</dd></div>
        <div><dt className="text-sm text-slate-400">Purchase email</dt><dd>{email}</dd></div>
      </dl>
      <p className="mt-6 rounded-lg border border-white/20 p-4 text-slate-200">${BOOKING_KIT_PRICE_CENTS / 100} USD, one payment. {BOOKING_KIT_ACCESS_DAYS}-day hosted access after payment, with one-hour private links recoverable by purchase email. Download editable copies to keep. Missing policies stay visibly unfinished. This purchase does not start a website subscription.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => setReview(null)} className="rounded-lg border border-slate-400 px-5 py-3 focus-visible:ring-2 focus-visible:ring-cyan-300">Correct my facts</button>
        <button type="button" disabled={!enabled || busy} onClick={checkout} className="rounded-lg bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white">{busy ? 'Preparing checkout…' : enabled ? `Pay $${BOOKING_KIT_PRICE_CENTS / 100} once` : 'Checkout is not open yet'}</button>
      </div>
    </div> : <form onSubmit={prepare}>
      <h2 className="text-2xl font-semibold">Tell us about one service</h2>
      <p className="mt-3 text-slate-300">Use your actual business facts. Leave unknown policies blank; we will flag them. Do not include client records or private health information. Fields without “optional” are required.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">Your niche<select required value={draft.niche} onChange={(event) => setDraft({ ...draft, niche: event.target.value })} className={inputClass}><option value="">Choose a niche</option>{BOOKING_KIT_NICHES.map((niche) => <option key={niche} value={niche}>{NICHE_META[niche].label}</option>)}</select></label>
        {fields.map((field) => <label key={field.key} className={`block ${field.max > 200 ? 'sm:col-span-2' : ''}`}>{field.label}
          <input value={draft[field.key] || ''} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} maxLength={field.max} required={'required' in field && field.required} placeholder={'placeholder' in field ? field.placeholder : undefined} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `${field.key}-error` : undefined} className={inputClass} />
          {errors[field.key] && <span id={`${field.key}-error`} className="mt-1 block text-rose-200">{errors[field.key]}</span>}
        </label>)}
        <label className="block">Pricing choice<select required value={draft.pricingChoice} onChange={(event) => setDraft({ ...draft, pricingChoice: event.target.value })} className={inputClass}><option value="">Choose pricing wording</option><option value="published">Publish my price</option><option value="quote">Ask for a quote</option><option value="free">This service is free</option></select></label>
        {draft.pricingChoice === 'published' && <label className="block">Your service price<input required maxLength={160} value={draft.priceDetails || ''} onChange={(event) => setDraft({ ...draft, priceDetails: event.target.value })} placeholder="For example, $75 USD per session" className={inputClass} /></label>}
        <label className="block sm:col-span-2">Purchase email<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /><span className="mt-2 block text-sm text-slate-300">Used for kit delivery and private access recovery. No automatic marketing sequence.</span></label>
      </div>
      {!!Object.keys(errors).length && <p role="alert" className="mt-5 text-rose-200">Check the marked facts. {errors.niche || errors.pricingChoice || errors.priceDetails || ''}</p>}
      <button className="mt-6 rounded-lg bg-cyan-300 px-5 py-3 font-bold text-slate-950 focus-visible:ring-2 focus-visible:ring-white">Review my facts</button>
    </form>}
    <p role="status" aria-live="polite" className="mt-4 text-slate-200">{status}</p>
  </section>
}
