import type { ReactNode } from 'react'
import Link from 'next/link'

export function LegalPage({
  title,
  summary,
  children,
  effectiveDate = { dateTime: '2026-09-03', label: 'September 3, 2026' },
}: {
  title: string
  summary: string
  children: ReactNode
  effectiveDate?: { dateTime: string; label: string }
}) {
  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border dc-border dc-surface shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <header className="border-b dc-border px-6 py-10 sm:px-10 sm:py-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] dc-text-accent">
            DailyClarity legal
          </p>
          <h1 className="text-4xl font-bold dc-text-heading sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 dc-text-body">{summary}</p>
          <p className="mt-4 text-sm dc-text-muted">
            Effective <time dateTime={effectiveDate.dateTime}>{effectiveDate.label}</time>
          </p>
        </header>

        <div className="space-y-10 px-6 py-10 dc-text-body sm:px-10 sm:py-12">
          {children}
        </div>

        <footer className="border-t dc-border dc-surface-soft px-6 py-6 text-sm dc-text-muted sm:px-10">
          Questions about this policy? Use our{' '}
          <Link
            href="/contact"
            className="font-medium dc-text-accent underline decoration-cyan-400/40 underline-offset-4 hover:dc-text-accent"
          >
            contact form
          </Link>
          .
        </footer>
      </article>
    </main>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 text-2xl font-semibold dc-text-heading">{title}</h2>
      <div className="space-y-3 text-sm leading-7 sm:text-base">{children}</div>
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="ml-5 list-disc space-y-2 marker:dc-text-accent">{children}</ul>
}
