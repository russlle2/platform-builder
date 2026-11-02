'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import { validateLeadContact } from '@/lib/lead-validation'

export default function LaunchUpdatesSignup() {
  const id = useId()
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const submitting = useRef(false)

  useEffect(() => { setReady(true) }, [])

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email') || '').trim()
    const phone = String(fields.get('phone') || '').trim()
    const error = validateLeadContact(email, phone)
    if (error) {
      setMessage(error)
      setStatus('error')
      return
    }

    submitting.current = true
    setStatus('submitting')
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, source: 'homepage' }),
      })
      if (!response.ok) throw new Error('Signup failed')
      setStatus('success')
    } catch {
      setMessage('We couldn’t save your signup. Your details are still here. Please try again.')
      setStatus('error')
      return
    } finally {
      submitting.current = false
    }
    track('lead_capture_submitted', { source: 'homepage' })
  }

  return (
    <section aria-labelledby={id + '-title'} className="mx-auto max-w-4xl rounded-2xl border border-[#c6d2c5] bg-[#f4f5e9] p-6 text-[#223f32] sm:p-9">
      <h2 id={id + '-title'} className="text-3xl font-semibold text-[#223f32]">Get DailyClarity updates</h2>
      <p className="mt-2 max-w-2xl text-base text-[#405348]">
        Hear about new wellness website designs and tools. You can preview a website without signing up.
      </p>
      {status === 'success' ? (
        <p role="status" className="mt-5 font-semibold">Thanks. You’re on the updates list.</p>
      ) : (
        <form method="post" action="/api/leads" onSubmit={submitLead} className="mt-5">
          <fieldset disabled={!ready || status === 'submitting'} className="min-w-0">
            <legend className="mb-3 text-sm text-[#405348]">Enter an email address or a phone number.</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">Email address
                <input type="email" name="email" autoComplete="email" maxLength={320} className="min-w-0 rounded-lg border border-[#789081] bg-white p-3 text-[#223f32] focus-visible:outline-2 focus-visible:outline-[#24523b]" />
              </label>
              <label className="grid gap-1 text-sm font-semibold">Phone number
                <input type="tel" name="phone" autoComplete="tel" maxLength={20} className="min-w-0 rounded-lg border border-[#789081] bg-white p-3 text-[#223f32] focus-visible:outline-2 focus-visible:outline-[#24523b]" />
              </label>
            </div>
            <button type="submit" className="mt-4 rounded-lg bg-[#24523b] px-5 py-3 font-semibold text-white hover:bg-[#193d2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24523b] disabled:opacity-60">
              {status === 'submitting' ? 'Saving…' : 'Join the update list'}
            </button>
          </fieldset>
          {status === 'error' && <p role="alert" className="mt-3 text-sm text-[#8f2725]">{message}</p>}
          <noscript><p className="mt-3 text-sm">Enable JavaScript to join the update list.</p></noscript>
        </form>
      )}
      <Link href="/privacy" className="mt-4 inline-block text-sm text-[#24523b] underline underline-offset-4">Privacy policy</Link>
    </section>
  )
}
