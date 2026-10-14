'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type SandboxConfig = {
  enabled: boolean
  configured: boolean
  amount: '1.00'
  currency: 'USD'
  environment: 'sandbox'
}

type SandboxReceipt = {
  orderId: string
  captureId: string
  status: 'COMPLETED'
  amount: '1.00'
  currency: 'USD'
  environment: 'sandbox'
  capturedAt: string
}

type Stage = 'loading' | 'setup' | 'ready' | 'resume' | 'cancelled' | 'creating' | 'capturing' | 'complete' | 'resetting' | 'error'
type InitialResult = { stage: Stage; receipt?: SandboxReceipt; error?: string; orderId?: string }
const api = '/api/paypal/sandbox'
const primaryButton = 'w-full rounded-xl bg-cyan-300 px-5 py-4 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200'
const secondaryButton = 'rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200'
const printStyles = `@media print {
  body { background: white !important; }
  body * { visibility: hidden; }
  #paypal-test-receipt, #paypal-test-receipt * { visibility: visible; color: black !important; background: white !important; }
  #paypal-test-receipt { position: absolute; top: 0; left: 0; width: 100%; padding: 24px; border: 0; }
  #paypal-test-receipt .receipt-actions { display: none !important; }
}`

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

async function request(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(`${api}/${path}`, { ...init, cache: 'no-store', credentials: 'same-origin' })
  const payload = object(await response.json().catch(() => null))
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error.slice(0, 250) : 'The test service could not complete this request. Please try again.')
  }
  return payload
}

function verifiedReceipt(value: unknown): SandboxReceipt {
  const receipt = object(value)
  if (receipt.status !== 'COMPLETED' || receipt.environment !== 'sandbox' || receipt.amount !== '1.00' || receipt.currency !== 'USD'
    || typeof receipt.orderId !== 'string' || !/^[A-Z0-9]{1,36}$/.test(receipt.orderId)
    || typeof receipt.captureId !== 'string' || !/^[A-Z0-9]{1,36}$/.test(receipt.captureId)
    || typeof receipt.capturedAt !== 'string' || !Number.isFinite(Date.parse(receipt.capturedAt))) {
    throw new Error('PayPal has not confirmed a completed sandbox payment. Check the payment again before starting a new test.')
  }
  return receipt as SandboxReceipt
}

async function capture(orderId: string): Promise<SandboxReceipt> {
  const result = await request('capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  })
  const receipt = verifiedReceipt(result.receipt)
  if (receipt.orderId !== orderId) throw new Error('The receipt did not match this test order. Please check the payment again.')
  return receipt
}

async function initialize(orderId: string | null, cancelled: boolean): Promise<InitialResult> {
  try {
    const config = await request('config') as unknown as SandboxConfig
    if (config.enabled !== true || config.configured !== true) return { stage: 'setup' }
    if (config.environment !== 'sandbox' || config.amount !== '1.00' || config.currency !== 'USD') {
      throw new Error('Sandbox settings could not be verified. No checkout was started.')
    }
    if (orderId) return { stage: 'complete', receipt: await capture(orderId) }
    const result = await request('receipt')
    if (result.receipt) return { stage: 'complete', receipt: verifiedReceipt(result.receipt) }
    // Recover an interrupted return from the signed browser session. Do not
    // auto-capture: this may be an order the buyer has not approved yet.
    if (!cancelled && typeof result.orderId === 'string' && /^[A-Z0-9]{1,36}$/.test(result.orderId)) {
      return { stage: 'resume', orderId: result.orderId }
    }
    return { stage: cancelled ? 'cancelled' : 'ready' }
  } catch (error) {
    return { stage: 'error', error: error instanceof Error ? error.message : 'The test could not be loaded. Please try again.' }
  }
}

export default function PayPalSandbox() {
  const [stage, setStage] = useState<Stage>('loading')
  const [receipt, setReceipt] = useState<SandboxReceipt | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bootstrap = useRef<Promise<InitialResult> | null>(null)
  const operationInProgress = useRef(false)
  const statusHeading = useRef<HTMLHeadingElement>(null)

  function apply(result: InitialResult) {
    if (result.orderId) setOrderId(result.orderId)
    setReceipt(result.receipt ?? null)
    setError(result.error ?? null)
    setStage(result.stage)
  }

  useEffect(() => {
    let active = true
    if (!bootstrap.current) {
      const query = new URLSearchParams(window.location.search)
      const cancelled = query.get('cancelled') === '1'
      const token = cancelled ? null : query.get('token')
      // Retain the return token for a manual retry before removing payment IDs
      // from the address bar. PayerID is never treated as proof of payment.
      setOrderId(token)
      if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname)
      if (token) setStage('capturing')
      // React StrictMode replays effects. Share the promise so a return visit
      // sends one capture request, and let the active effect receive its result.
      bootstrap.current = initialize(token, cancelled)
    }
    void bootstrap.current.then((result) => { if (active) apply(result) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (stage === 'complete' || stage === 'error' || stage === 'cancelled' || stage === 'resume') statusHeading.current?.focus()
  }, [stage])

  async function retry() {
    if (operationInProgress.current) return
    operationInProgress.current = true
    setStage(orderId ? 'capturing' : 'loading')
    setError(null)
    try { apply(await initialize(orderId, false)) } finally { operationInProgress.current = false }
  }

  async function startCheckout() {
    if (operationInProgress.current) return
    operationInProgress.current = true
    setStage('creating')
    setError(null)
    try {
      const result = await request('order', { method: 'POST' })
      if (typeof result.orderId !== 'string' || !/^[A-Z0-9]{1,36}$/.test(result.orderId) || typeof result.approvalUrl !== 'string') {
        throw new Error('A sandbox checkout link was not returned. Please try again.')
      }
      const destination = new URL(result.approvalUrl)
      if (destination.protocol !== 'https:' || !['sandbox.paypal.com', 'www.sandbox.paypal.com'].includes(destination.hostname)
        || destination.port || destination.username || destination.password || destination.searchParams.get('token') !== result.orderId) {
        throw new Error('The checkout link was not a verified PayPal Sandbox address. No checkout was opened.')
      }
      window.location.assign(destination.href)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Checkout could not be opened. Please try again.')
      setStage('error')
    } finally { operationInProgress.current = false }
  }

  async function reset() {
    if (operationInProgress.current) return
    operationInProgress.current = true
    setStage('resetting')
    setError(null)
    try {
      await request('reset', { method: 'POST' })
      setReceipt(null)
      setOrderId(null)
      apply(await initialize(null, false))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The test session could not be reset. Please try again.')
      setStage('error')
    } finally { operationInProgress.current = false }
  }

  function downloadReceipt() {
    if (!receipt) return
    const file = new Blob([JSON.stringify({ ...receipt, testOnly: true, realMoneyCharged: '0.00', websitePurchased: false, subscriptionCreated: false }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `dailyclarity-paypal-sandbox-${receipt.orderId}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const busy = ['loading', 'creating', 'capturing', 'resetting'].includes(stage)

  return (
    <main className="relative min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <style>{printStyles}</style>
      <div className="mx-auto max-w-4xl">
        <div className="mb-9 max-w-2xl space-y-4">
          <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">PayPal Sandbox · test only</span>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">A real checkout rehearsal.<br />Zero real dollars.</h1>
          <p className="text-base leading-relaxed text-slate-300">Go through PayPal Sandbox, approve a mock purchase, and return here for a verified test receipt. No website purchase or subscription is created.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section aria-labelledby="test-steps" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-7">
            <h2 id="test-steps" className="text-2xl font-semibold">Your three-minute test</h2>
            <ol className="mt-6 space-y-6 text-sm leading-relaxed text-slate-300">
              <li><span className="mb-1 block font-semibold text-white">1. Have a sandbox buyer ready</span>Use a Personal sandbox account from your <a className="text-cyan-200 underline underline-offset-4" href="https://developer.paypal.com/dashboard/accounts" target="_blank" rel="noopener noreferrer">PayPal Developer dashboard</a>. Use that account&apos;s test email and password at checkout.</li>
              <li><span className="mb-1 block font-semibold text-white">2. Approve $1.00 in pretend money</span>The PayPal Sandbox balance is simulated. Your real PayPal balance, card, and bank account are never charged by this test.</li>
              <li><span className="mb-1 block font-semibold text-white">3. Return and save your receipt</span>We verify the payment with PayPal Sandbox before showing a successful result. Then download the receipt or run the test again.</li>
            </ol>
            <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-relaxed text-slate-400">Your regular PayPal account is not the sandbox buyer. Stay in the same browser with cookies enabled. The test session lasts 30 minutes; save your receipt before leaving.</p>
          </section>

          <section aria-label="Sandbox checkout" aria-busy={busy} className="min-w-0 rounded-2xl border border-cyan-300/20 bg-slate-900 p-6 sm:p-7">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-6">
              <div><p className="text-sm text-slate-400">Real money charged</p><p className="mt-1 text-4xl font-bold text-white">$0<span className="ml-1 text-sm font-normal text-slate-400">USD</span></p></div>
              <p className="rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-slate-300">Sandbox order<br /><strong className="text-white">$1.00 USD · pretend funds</strong></p>
            </div>

            {busy && <p role="status" className="py-8 text-center text-slate-200">{stage === 'capturing' ? 'Verifying your sandbox payment with PayPal…' : stage === 'creating' ? 'Opening PayPal Sandbox…' : stage === 'resetting' ? 'Starting a fresh test session…' : 'Checking sandbox availability…'}</p>}

            {stage === 'setup' && <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Sandbox setup is needed</h2>
              <p className="text-sm leading-relaxed text-slate-300">The site owner needs to enable this test and connect a PayPal Sandbox app. Once that setup is saved, check again here.</p>
              <button type="button" disabled className={primaryButton}>PayPal Sandbox is not ready</button>
              <button type="button" onClick={retry} className={secondaryButton}>Check setup again</button>
            </div>}

            {(stage === 'ready' || stage === 'cancelled') && <div className="space-y-4">
              <h2 ref={statusHeading} tabIndex={-1} className="text-2xl font-semibold outline-none">{stage === 'cancelled' ? 'Checkout cancelled' : 'Ready for your test purchase'}</h2>
              <p role={stage === 'cancelled' ? 'status' : undefined} className="text-sm leading-relaxed text-slate-300">{stage === 'cancelled' ? 'You returned without completing this test checkout. You can start again whenever you are ready.' : 'This button opens PayPal’s sandbox checkout. Sign in with your sandbox buyer and approve the test order.'}</p>
              <button type="button" onClick={startCheckout} className={primaryButton}>Continue to PayPal Sandbox</button>
              <p className="text-xs leading-relaxed text-slate-400">One mock payment. No recurring charges. No live purchase.</p>
              <button type="button" onClick={reset} className={secondaryButton}>Start a fresh test</button>
            </div>}

            {stage === 'resume' && <div className="space-y-4">
              <h2 ref={statusHeading} tabIndex={-1} className="text-2xl font-semibold outline-none">Resume your sandbox test</h2>
              <p className="text-sm leading-relaxed text-slate-300">This browser has an unfinished test order. If you already approved it in PayPal Sandbox, check its payment below. Otherwise, return to checkout to approve it.</p>
              <button type="button" onClick={retry} className={primaryButton}>Check test payment again</button>
              <button type="button" onClick={startCheckout} className={`${secondaryButton} w-full`}>Continue to PayPal Sandbox</button>
              <button type="button" onClick={reset} className={secondaryButton}>Start a fresh test</button>
            </div>}

            {stage === 'error' && <div className="space-y-4">
              <h2 ref={statusHeading} tabIndex={-1} className="text-2xl font-semibold outline-none">{orderId ? 'Payment is not confirmed yet' : 'The test needs another try'}</h2>
              <p role="alert" className="break-words rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-100">{error}</p>
              {orderId && <p className="text-xs leading-relaxed text-slate-400">A return from PayPal alone does not confirm payment. Checking again reuses this test order.</p>}
              <button type="button" onClick={retry} className={primaryButton}>{orderId ? 'Check test payment again' : 'Try again'}</button>
              {orderId && <button type="button" onClick={reset} className={secondaryButton}>Reset test session</button>}
            </div>}

            {stage === 'complete' && receipt && <div id="paypal-test-receipt" className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">Verified by PayPal Sandbox</p>
                <h2 ref={statusHeading} tabIndex={-1} className="text-3xl font-semibold outline-none">Test purchase complete</h2>
                <p role="status" className="mt-3 text-sm leading-relaxed text-slate-300">PayPal confirmed the sandbox capture. Real money charged: $0.00 USD. No website or subscription was purchased.</p>
              </div>
              <dl className="space-y-3 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm">
                {[
                  ['Environment', 'PayPal Sandbox — test only'],
                  ['Status', receipt.status],
                  ['Sandbox amount', `${receipt.amount} ${receipt.currency} (pretend funds)`],
                  ['Order ID', receipt.orderId],
                  ['Capture ID', receipt.captureId],
                  ['Verified at', new Date(receipt.capturedAt).toLocaleString()],
                ].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 break-all text-slate-100">{value}</dd></div>)}
              </dl>
              <p className="text-xs leading-relaxed text-slate-400">This receipt stays in this browser session for up to 30 minutes. Download or print a copy to keep it. Resetting removes the browser copy; it does not undo the sandbox transaction.</p>
              <div className="receipt-actions flex flex-wrap gap-3">
                <button type="button" onClick={downloadReceipt} className={secondaryButton}>Download receipt</button>
                <button type="button" onClick={() => window.print()} className={secondaryButton}>Print receipt</button>
                <button type="button" onClick={reset} className={`${secondaryButton} w-full`}>Run another test</button>
              </div>
            </div>}
          </section>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm">
          <p className="max-w-lg leading-relaxed text-slate-400">Want to try building a site too? Your website preview is free and separate from this checkout rehearsal.</p>
          <Link href="/preview-your-business" className="font-semibold text-cyan-200 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">Try the free website preview</Link>
        </div>
      </div>
    </main>
  )
}
