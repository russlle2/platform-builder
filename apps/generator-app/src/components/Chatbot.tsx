'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Support links that work independently of conversational AI. */
export default function Chatbot() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
      firstLinkRef.current?.focus()
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false
      launcherRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  if (pathname === '/wellness-experiences') return null

  const close = () => setIsOpen(false)
  const linkClass = 'block rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-teal-700 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700'

  return (
    <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          id="platform-help-dialog"
          role="dialog"
          aria-labelledby="platform-help-title"
          aria-describedby="platform-help-description"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              close()
            }
          }}
          className="mb-3 max-h-[calc(100dvh-6rem)] w-[calc(100vw-1.5rem)] max-w-[380px] overflow-y-auto rounded-2xl border border-stone-200 bg-[#faf8f5] p-5 text-slate-800 shadow-xl sm:mb-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="platform-help-title" className="text-2xl font-semibold text-[#18221f]">How can we help?</h2>
            <button
              type="button"
              aria-label="Close help and support"
              onClick={close}
              className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-stone-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p id="platform-help-description" className="mt-2 text-sm leading-relaxed text-slate-600">
            Find website guidance, review plans, or send us a question.
          </p>
          <nav aria-label="Help and support" className="mt-5 space-y-2">
            <Link ref={firstLinkRef} href="/help" onClick={close} className={linkClass}>Website &amp; account help</Link>
            <Link href="/pricing" onClick={close} className={linkClass}>Plans &amp; pricing</Link>
            <Link href="/contact" onClick={close} className={linkClass}>Contact DailyClarity</Link>
          </nav>
          <div className="mt-5 border-t border-stone-200 pt-4 text-sm leading-relaxed">
            <p className="text-slate-600">Prefer email?</p>
            <a href="mailto:platformwizard@dailyclarity.org" className="mt-1 inline-block break-all py-1 font-semibold text-teal-800 underline decoration-teal-800/40 underline-offset-4 hover:text-teal-950">
              platformwizard@dailyclarity.org
            </a>
          </div>
        </section>
      )}
      <button
        ref={launcherRef}
        type="button"
        aria-label={isOpen ? 'Close help and support' : 'Open help and support'}
        aria-expanded={isOpen}
        aria-controls="platform-help-dialog"
        onClick={() => setIsOpen(open => !open)}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-teal-800 px-4 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-teal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.5 8.5a3.5 3.5 0 0 1 7 0c0 2-3.5 2-3.5 4M12 16.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        Help
      </button>
    </div>
  )
}
