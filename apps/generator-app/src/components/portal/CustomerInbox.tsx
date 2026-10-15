'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type ContactMessage = {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  createdAt: string
  notificationStatus: string
}

const notificationLabels: Record<string, string> = {
  sent: 'Email accepted by provider',
  failed: 'Email notification failed',
  not_attempted: 'Email notification not sent',
  not_configured: 'Email notifications not configured',
  no_recipient: 'Email recipient unavailable',
  unknown: 'Email delivery unconfirmed',
}
const buttonClass =
  'rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:opacity-50'

export function CustomerInbox({
  slug,
  portalToken,
}: {
  slug: string
  portalToken?: string
}) {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryOffset, setRetryOffset] = useState(0)
  const sequence = useRef(0)

  const load = useCallback(
    async (offset: number) => {
      const current = ++sequence.current
      setLoading(true)
      setError('')
      setRetryOffset(offset)
      try {
        const response = await fetch(
          `/api/portal/contacts?slug=${encodeURIComponent(slug)}&offset=${offset}&limit=20`,
          {
            cache: 'no-store',
            headers: portalToken ? { 'x-portal-token': portalToken } : {},
          },
        )
        const result = await response.json().catch(() => ({}))
        if (response.status === 401 && current === sequence.current) {
          setMessages([])
          setNextOffset(null)
        }
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? 'Access to this inbox has expired. Sign in again or reopen your private website link.'
              : 'Your enquiries could not be loaded. Please try again.',
          )
        if (!Array.isArray(result.messages))
          throw new Error(
            'Your enquiries could not be loaded. Please try again.',
          )
        if (current !== sequence.current) return
        const received = result.messages as ContactMessage[]
        setMessages((previous) =>
          offset === 0
            ? received
            : [
                ...previous,
                ...received.filter(
                  (message) => !previous.some((item) => item.id === message.id),
                ),
              ],
        )
        setNextOffset(
          typeof result.nextOffset === 'number' && result.nextOffset > offset
            ? result.nextOffset
            : null,
        )
        setLimitReached(result.paginationLimitReached === true)
      } catch (problem) {
        if (current === sequence.current)
          setError(
            problem instanceof Error
              ? problem.message
              : 'Your enquiries could not be loaded.',
          )
      } finally {
        if (current === sequence.current) setLoading(false)
      }
    },
    [slug, portalToken],
  )

  useEffect(() => {
    setMessages([])
    setNextOffset(null)
    void load(0)
    return () => {
      sequence.current += 1
    }
  }, [load])

  return (
    <section
      aria-labelledby="customer-inbox-title"
      aria-busy={loading}
      className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="customer-inbox-title" className="text-2xl font-bold">
            Website enquiries
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
            Messages saved from your website contact form, including those whose
            email notification failed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(0)}
          disabled={loading}
          className={buttonClass}
        >
          Refresh inbox
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load(retryOffset)}
            disabled={loading}
            className={`${buttonClass} mt-3`}
          >
            Retry loading enquiries
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="mt-5 text-sm text-slate-300">
          Loading enquiries…
        </p>
      )}
      {!loading && !error && messages.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-slate-600 p-6">
          <p className="font-semibold text-slate-200">No enquiries yet</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Send a test message through your live website, then refresh this
            inbox. A successful test here confirms the message was saved.
          </p>
        </div>
      )}
      <ol className="mt-5 space-y-4">
        {messages.map((message) => (
          <li
            key={message.id}
            className="min-w-0 rounded-xl border border-white/10 bg-slate-950/40 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="break-words font-semibold text-white">
                {message.name || 'Website visitor'}
              </h3>
              <time
                dateTime={message.createdAt}
                className="text-xs text-slate-400"
              >
                {Number.isFinite(Date.parse(message.createdAt))
                  ? new Date(message.createdAt).toLocaleString()
                  : 'Date unavailable'}
              </time>
            </div>
            <p className="mt-2 break-all text-sm text-cyan-200">
              {message.email}
            </p>
            {message.phone && (
              <p className="mt-1 break-all text-sm text-slate-300">
                {message.phone}
              </p>
            )}
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
              {message.message}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs ${message.notificationStatus === 'sent' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}
              >
                {notificationLabels[message.notificationStatus] ||
                  notificationLabels.unknown}
              </span>
              {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email) && (
                <a
                  href={`mailto:${encodeURIComponent(message.email)}`}
                  className="text-sm font-semibold text-cyan-200 underline underline-offset-4"
                >
                  Reply in your email app
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
      {nextOffset !== null && !error && (
        <button
          type="button"
          onClick={() => void load(nextOffset)}
          disabled={loading}
          className={`${buttonClass} mt-5`}
        >
          Load older enquiries
        </button>
      )}
      {limitReached && (
        <p className="mt-4 text-xs text-slate-400">
          More archived enquiries are available. Contact support to retrieve
          older messages beyond this view.
        </p>
      )}
      {messages.length > 0 && (
        <p className="mt-5 text-xs leading-relaxed text-slate-400">
          Email notification status is separate from this saved message. Check
          your email inbox before relying on notifications. Replies open your
          own email app.
        </p>
      )}
    </section>
  )
}
