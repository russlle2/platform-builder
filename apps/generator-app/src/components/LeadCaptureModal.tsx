'use client'

import { useEffect, useState } from 'react'
import { track } from '@/lib/analytics'
import { usePathname } from 'next/navigation'

export default function LeadCaptureModal() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (pathname?.startsWith('/preview') || pathname?.startsWith('/__site')) {
      return
    }

    const hasSeen = sessionStorage.getItem('lead_modal_seen')
    if (hasSeen) {
      return
    }

    const timer = setTimeout(() => {
      setIsOpen(true)
      sessionStorage.setItem('lead_modal_seen', 'true')
    }, 25000)

    const handleExit = (event: MouseEvent) => {
      if (event.clientY <= 0 && !sessionStorage.getItem('lead_modal_seen')) {
        setIsOpen(true)
        sessionStorage.setItem('lead_modal_seen', 'true')
      }
    }

    window.addEventListener('mouseout', handleExit)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('mouseout', handleExit)
    }
  }, [pathname])

  const trimmedEmail = email.trim()
  const trimmedPhone = phone.trim()
  const canSubmit = trimmedEmail.length > 0 || trimmedPhone.length > 0

  const submitLead = async () => {
    if (!canSubmit) {
      setStatus('error')
      return
    }
    try {
      setStatus('submitting')
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, phone: trimmedPhone, source: 'modal' }),
      })
      if (!response.ok) {
        throw new Error('Failed')
      }
      setStatus('success')
      track('lead_capture_submitted', { source: 'modal' })
    } catch (error) {
      setStatus('error')
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="glass-panel rounded-3xl p-8 max-w-xl w-full relative">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 text-slate-300 hover:text-white"
        >
          ✕
        </button>
        <span className="signal-chip">Early access</span>
        <h3 className="text-3xl font-bold text-white mt-4">
          Get your 15% launch discount
        </h3>
        <p className="text-slate-200 mt-3">
          Join the early-access list and get notified when new website builds, niche demos, and launch slots open.
        </p>
        <div className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone (optional)"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>
        {status === 'error' && (
          <p className="text-sm text-red-200 mt-4">
            {canSubmit ? 'Unable to save. Try again.' : 'Enter your email or phone to continue.'}
          </p>
        )}
        {status === 'success' ? (
          <div className="mt-6 p-4 bg-cyan-400/20 text-cyan-100 rounded-xl">
            Thanks! We will reach out with next steps.
          </div>
        ) : (
          <button
            type="button"
            onClick={submitLead}
            disabled={status === 'submitting' || !canSubmit}
            className="cta-button mt-6 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? 'Submitting...' : 'Claim 15% Off'}
          </button>
        )}
      </div>
    </div>
  )
}
