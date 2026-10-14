'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { validateLeadContact } from '@/lib/lead-validation'
import { usePathname } from 'next/navigation'

function isVideoPlaying(): boolean {
  const videos = document.querySelectorAll('video')
  return Array.from(videos).some(v => !v.paused && !v.ended)
}

export default function LeadCaptureModal() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const emailId = useId()
  const phoneId = useId()
  const errorId = useId()

  useEffect(() => {
    const suppressOnHighIntentPath = [
      '/preview',
      '/__site',
      '/pricing',
      '/custom-build',
      '/success',
      '/cancel',
      '/portal',
      '/dashboard',
      '/login',
    ].some((path) => pathname?.startsWith(path))

    if (suppressOnHighIntentPath) {
      return
    }

    const hasSeen = sessionStorage.getItem('lead_modal_seen')
    if (hasSeen) {
      return
    }

    function tryOpen() {
      if (sessionStorage.getItem('lead_modal_seen')) return
      if (isVideoPlaying()) return 25_000
      return 0
    }

    let timerId: ReturnType<typeof setTimeout>
    function scheduleCheck() {
      timerId = setTimeout(() => {
        const delay = tryOpen()
        if (delay === undefined) return
        if (delay > 0) { scheduleCheck(); return }
        setIsOpen(true)
        sessionStorage.setItem('lead_modal_seen', 'true')
      }, 25_000)
    }
    scheduleCheck()

    const handleExit = (event: MouseEvent) => {
      if (event.clientY <= 0 && !sessionStorage.getItem('lead_modal_seen') && !isVideoPlaying()) {
        setIsOpen(true)
        sessionStorage.setItem('lead_modal_seen', 'true')
      }
    }

    window.addEventListener('mouseout', handleExit)

    return () => {
      clearTimeout(timerId)
      window.removeEventListener('mouseout', handleExit)
    }
  }, [pathname])

  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    emailInputRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [isOpen])

  const submitLead = async () => {
    const validationError = validateLeadContact(email.trim(), phone.trim())
    if (validationError) {
      setFieldError(validationError)
      setStatus('error')
      return
    }
    setFieldError(null)
    try {
      setStatus('submitting')
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim(), source: 'modal' }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setFieldError((data as { error?: string }).error || 'Unable to save. Try again.')
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
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-panel rounded-3xl p-8 max-w-xl w-full relative"
      >
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close updates form"
          className="absolute right-4 top-4 text-slate-300 hover:text-white"
        >
          ✕
        </button>
        <span className="signal-chip">Early access</span>
        <h3 id={titleId} className="text-3xl font-bold text-white mt-4">
          Get DailyClarity launch updates
        </h3>
        <p className="text-slate-200 mt-3">
          Join the early-access list for new website templates, niche demos, and product updates.
        </p>
        <div className="mt-6 space-y-4">
          <label htmlFor={emailId} className="sr-only">Email address</label>
          <input
            ref={emailInputRef}
            id={emailId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            autoComplete="email"
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? errorId : undefined}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <label htmlFor={phoneId} className="sr-only">Phone number (optional)</label>
          <input
            id={phoneId}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone (optional)"
            autoComplete="tel"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>
        {(fieldError || status === 'error') && (
          <p id={errorId} role="alert" className="text-sm text-red-200 mt-4">{fieldError || 'Unable to save. Try again.'}</p>
        )}
        {status === 'success' ? (
          <div className="mt-6 p-4 bg-cyan-400/20 text-cyan-100 rounded-xl">
            Thanks! We will reach out with next steps.
          </div>
        ) : (
          <button
            type="button"
            onClick={submitLead}
            disabled={status === 'submitting'}
            className="cta-button mt-6 w-full"
          >
            {status === 'submitting' ? 'Submitting...' : 'Join the update list'}
          </button>
        )}
      </div>
    </div>
  )
}
