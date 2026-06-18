'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        window.location.href = next
      }
    })
  }, [next])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMessage('')

    const supabase = createClient()
    const origin = window.location.origin

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
    } else {
      setStatus('success')
    }
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
      {status === 'success' ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            We sent a magic link to <span className="text-cyan-300 font-medium">{email}</span>.
            Click it to sign in &mdash; no password needed.
          </p>
          <p className="text-slate-500 text-xs mt-4">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button
              onClick={() => setStatus('idle')}
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-slate-400 text-sm">
              Get a magic link emailed to you &mdash; no password needed.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition-all"
              />
            </div>

            {status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
                {errorMessage || 'Something went wrong. Please try again.'}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold py-3 px-6 rounded-xl text-sm uppercase tracking-[0.15em] transition-all duration-200 flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                'Send magic link'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-slate-500 text-xs">
              New to DailyClarity?{' '}
              <Link href="/preview-your-business" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Preview your business website &rarr;
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-10">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="DailyClarity" width={40} height={40} className="h-10 w-10" />
            <span className="text-2xl font-bold text-white tracking-[0.15em] uppercase">
              Daily<span className="text-cyan-300">Clarity</span>
            </span>
          </Link>
        </div>

        <Suspense fallback={
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-slate-600 text-xs mt-6">
          &copy; {new Date().getFullYear()} DailyClarity. All rights reserved.
        </p>
      </div>
    </div>
  )
}