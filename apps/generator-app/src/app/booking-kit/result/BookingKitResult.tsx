'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import BookingKitPublicLink from '@/components/booking-kit/BookingKitPublicLink'
import { BOOKING_KIT_ACCESS_STORAGE_KEY } from '@/lib/analytics-privacy'
import { artifactToText, bookingKitSections, type BookingKitArtifact } from '@/lib/booking-kit-content'
import { bookingKitPreviewTransfer, clearReplacedPreviewCustomizations, hasPopulatedPreview, hasSavedPreviewCustomizations } from '@/lib/booking-kit-preview'
import { usePreviewStore } from '@/store/previewStore'
import { PLANS } from '@/lib/plans'
import { CUSTOM_BUILD_AMOUNT_CENTS } from '@/lib/custom-build'

const tokenKey = BOOKING_KIT_ACCESS_STORAGE_KEY
const buttonClass = 'rounded-lg border border-cyan-300 px-4 py-3 font-semibold text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300'
const printStyles = `@media print {
  body { background: white !important; }
  body * { visibility: hidden; }
  #booking-kit-print, #booking-kit-print * { visibility: visible; color: black !important; background: white !important; }
  #booking-kit-print { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 1cm; }
  #booking-kit-print button { display: none; }
  #booking-kit-print section { border: 0; padding: 0; margin: 0 0 1cm; break-inside: avoid; }
}`

export default function BookingKitResult() {
  const token = useRef('')
  const [artifact, setArtifact] = useState<BookingKitArtifact | null>(null)
  const [expiresAt, setExpiresAt] = useState('')
  const [accessStatus, setAccessStatus] = useState('Checking your private access…')
  const [actionStatus, setActionStatus] = useState('')
  const [retry, setRetry] = useState(0)
  const [email, setEmail] = useState('')
  const [recovering, setRecovering] = useState(false)
  const [recoveryStatus, setRecoveryStatus] = useState('')

  useEffect(() => {
    const refreshFromLink = () => setRetry((value) => value + 1)
    window.addEventListener('hashchange', refreshFromLink)
    return () => window.removeEventListener('hashchange', refreshFromLink)
  }, [])

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const incoming = fragment.get('access_token')
    if (incoming) {
      token.current = incoming
      window.history.replaceState(null, '', window.location.pathname)
      try { sessionStorage.setItem(tokenKey, incoming) } catch { /* In-memory access still works. */ }
    } else if (!token.current) {
      try { token.current = sessionStorage.getItem(tokenKey) || '' } catch { /* Recovery remains available. */ }
    }
    if (!token.current) { setAccessStatus('Open your private access link, or request a fresh link using your purchase email.'); return }
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    async function checkAccess() {
      try {
        const response = await fetch('/api/booking-kit/result', { headers: { Authorization: `Bearer ${token.current}` }, cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (controller.signal.aborted) return
        if (response.status === 202) {
          attempts += 1
          setAccessStatus(attempts < 10 ? 'Waiting for verified payment. Your kit will appear when payment is confirmed…' : 'Payment confirmation is still pending. Check again shortly, or use the private link in your delivery email.')
          if (attempts < 10) timer = setTimeout(checkAccess, 3000)
          return
        }
        if (response.status === 429 || response.status >= 500) {
          setAccessStatus('Private access is temporarily unavailable. Please wait and check again; your purchase is not lost.')
          return
        }
        if (!response.ok) {
          setArtifact(null)
          setAccessStatus('This private link is invalid, expired, or no longer active. Request a fresh link below if your hosted access is still active.')
          return
        }
        setArtifact(result.artifact)
        setExpiresAt(result.accessExpiresAt)
        setAccessStatus('Your private kit is ready.')
      } catch {
        if (!controller.signal.aborted) setAccessStatus('We could not check access right now. Try again; your purchase is not lost.')
      }
    }
    void checkAccess()
    return () => { controller.abort(); if (timer) clearTimeout(timer) }
  }, [retry])

  async function recover(event: FormEvent) {
    event.preventDefault()
    if (recovering) return
    setRecovering(true)
    setRecoveryStatus('')
    try {
      const response = await fetch('/api/booking-kit/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      if (response.status === 429) setRecoveryStatus('Too many requests. Please wait before trying again.')
      else if (!response.ok) setRecoveryStatus('Recovery is temporarily unavailable. Please try again shortly.')
      else setRecoveryStatus('If that email has an eligible purchase, a private access link will be sent. Check your inbox and spam folder.')
    } catch { setRecoveryStatus('Recovery is temporarily unavailable. Please try again shortly.') }
    finally { setRecovering(false) }
  }

  async function copy(title: string, text: string) {
    try { await navigator.clipboard.writeText(text); setActionStatus(`${title} copied.`) }
    catch { setActionStatus('Clipboard access is unavailable. Select the text to copy it, or download the kit.') }
  }
  function download() {
    if (!artifact) return
    const url = URL.createObjectURL(new Blob([artifactToText(artifact)], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'booking-clarity-kit.txt'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setActionStatus('Your editable text download is ready.')
  }
  function transfer() {
    if (!artifact) return
    const store = usePreviewStore.getState()
    let populated = hasPopulatedPreview(store.businessInfo)
    try { populated ||= hasSavedPreviewCustomizations(sessionStorage) } catch { /* In-memory draft remains available. */ }
    const confirmed = !populated || window.confirm('Replace your existing website draft with this kit? This replaces its business name, contact name, niche, headline, description, and service, and resets the selected template, text edits, image placements, and style. Your email, phone, address, and website will stay. You can review the transferred facts before choosing a template.')
    if (!confirmed) { setActionStatus('Your existing website draft was kept.'); return }
    const next = bookingKitPreviewTransfer(artifact, store.businessInfo, confirmed)
    if (!next) return
    try { clearReplacedPreviewCustomizations(sessionStorage) } catch { setActionStatus('Your browser could not reset the saved preview. Allow session storage and try again.'); return }
    store.replaceBusinessInfo(next)
    void fetch('/api/booking-kit/transfer', { method: 'POST', headers: { Authorization: `Bearer ${token.current}` }, keepalive: true }).catch(() => {})
    window.location.assign('/preview-your-business?from=booking-kit&transferred=1')
  }

  return <main className="mx-auto max-w-4xl px-5 pb-20 pt-28">
    <style>{printStyles}</style>
    <h1 className="text-4xl font-bold">Your Booking Clarity Kit</h1>
    <p role="status" aria-live="polite" className="mt-5 text-slate-200">{accessStatus}</p>
    {!artifact && <button onClick={() => setRetry((value) => value + 1)} className={`${buttonClass} mt-5`}>Check access again</button>}
    {artifact && <>
      <p className="mt-3 text-slate-300">Hosted access ends {new Date(expiresAt).toLocaleDateString()}. Download editable text to keep your own copy. Private links expire after one hour; use purchase email recovery for a fresh link.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => copy('Full kit', artifactToText(artifact))} className={buttonClass}>Copy full kit</button>
        <button onClick={download} className={buttonClass}>Download text</button>
        <button onClick={() => window.print()} className={buttonClass}>Print kit</button>
      </div>
      <p role="status" aria-live="polite" className="mt-4 text-cyan-200">{actionStatus}</p>
      <article id="booking-kit-print" className="mt-8 break-words">
        <h2 className="mb-6 text-2xl font-semibold">Your reusable copy</h2>
        {bookingKitSections(artifact).map(({ title, text }) => <section key={title} className="mb-5 rounded-xl border border-white/20 bg-slate-900/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">{title}</h3><button onClick={() => copy(title, text)} aria-label={`Copy ${title.toLowerCase()}`} className={buttonClass}>Copy</button></div>
          <p className="mt-4 whitespace-pre-wrap leading-relaxed text-slate-200">{text}</p>
        </section>)}
        <section className="rounded-xl border border-amber-300/50 bg-amber-950/30 p-5">
          <h3 className="text-xl font-semibold text-amber-100">Unfinished items — complete before use</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-amber-100">{artifact.unfinishedItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="mt-4 text-sm text-slate-300">Composition version: {artifact.version}. Review all wording before publishing or sending.</p>
        </section>
      </article>
      <section className="mt-10 rounded-xl border border-cyan-300/50 p-6">
        <h2 className="text-2xl font-semibold">Put your copy to work</h2>
        <p className="mt-3 text-slate-200">Transfer your business name, contact name, niche, headline, service description, and booking instructions to the website builder. You choose when to transfer; the preview remains free.</p>
        <button onClick={transfer} className={`${buttonClass} mt-5`}>Use this in my website preview</button>
        <p className="mt-6 text-slate-300">When you are ready, a hosted website is ${PLANS.basic.price}/month. Prefer a custom build? The existing custom-build option is ${CUSTOM_BUILD_AMOUNT_CENTS / 100} once. Each is a separate purchase.</p>
        <div className="mt-4 flex flex-wrap gap-5"><BookingKitPublicLink href="/preview-your-business?from=booking-kit" className="text-cyan-300 underline">Explore the ${PLANS.basic.price}/month website</BookingKitPublicLink><BookingKitPublicLink href="/custom-build" className="text-cyan-300 underline">Explore the ${CUSTOM_BUILD_AMOUNT_CENTS / 100} custom build</BookingKitPublicLink></div>
      </section>
    </>}
    <section className="mt-10 rounded-xl border border-white/20 p-5">
      <h2 className="text-2xl font-semibold">Recover private access</h2>
      <p className="mt-3 text-slate-300">Use the email entered at checkout. Recovery works during your 90-day hosted access period. Confirmed refunds revoke hosted access.</p>
      <form onSubmit={recover} className="mt-5 space-y-4">
        <label className="block">Purchase email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-900 p-3 focus-visible:outline-cyan-300" /></label>
        <button disabled={recovering} className={`${buttonClass} disabled:opacity-50`}>{recovering ? 'Requesting link…' : 'Email me an access link'}</button>
      </form>
      <p role="status" aria-live="polite" className="mt-4 text-slate-200">{recoveryStatus}</p>
    </section>
  </main>
}
