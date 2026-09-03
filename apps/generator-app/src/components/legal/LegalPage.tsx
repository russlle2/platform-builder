import type { ReactNode } from 'react'
import Link from 'next/link'

export function LegalPage({
  title,
  summary,
  children,
}: {
  title: string
  summary: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <header className="border-b border-white/10 px-6 py-10 sm:px-10 sm:py-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
            DailyClarity legal
          </p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">{summary}</p>
          <p className="mt-4 text-sm text-slate-400">
            Effective <time dateTime="2026-09-03">September 3, 2026</time>
          </p>
        </header>

        <div className="space-y-10 px-6 py-10 text-slate-300 sm:px-10 sm:py-12">
          {children}
        </div>

        <footer className="border-t border-white/10 bg-slate-950/40 px-6 py-6 text-sm text-slate-400 sm:px-10">
          Questions about this policy? Email{' '}
          <a
            href="mailto:support@dailyclarity.org"
            className="font-medium text-cyan-300 underline decoration-cyan-400/40 underline-offset-4 hover:text-cyan-200"
          >
            support@dailyclarity.org
          </a>{' '}
          or use our{' '}
          <Link
            href="/contact"
            className="font-medium text-cyan-300 underline decoration-cyan-400/40 underline-offset-4 hover:text-cyan-200"
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
      <h2 className="mb-3 text-2xl font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-7 sm:text-base">{children}</div>
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="ml-5 list-disc space-y-2 marker:text-cyan-400">{children}</ul>
}
