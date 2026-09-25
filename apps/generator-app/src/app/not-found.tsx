import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="container-hvac flex min-h-[72vh] items-center justify-center px-4 pb-20 pt-32">
      <section className="glass-panel w-full max-w-3xl rounded-3xl p-8 text-center md:p-14">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
          Error 404
        </p>
        <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">
          This page is not here.
        </h1>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-slate-300">
          The link may be outdated, or the page may have moved. You can return home, explore the
          available templates, or contact us if you expected to find something here.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="cta-button px-7 py-3">
            Return home
          </Link>
          <Link
            href="/preview-your-business"
            className="rounded-xl border border-cyan-300/30 px-7 py-3 font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
          >
            Preview your business
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-white/15 px-7 py-3 font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
          >
            Contact support
          </Link>
        </div>
      </section>
    </main>
  )
}
