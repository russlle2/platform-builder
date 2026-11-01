import { Suspense } from 'react'
import type { Metadata } from 'next'
import PreviewYourBusinessClient from './PreviewYourBusinessClient'

const description =
  'Add your business details, choose your preferred style, and preview a client-ready DailyClarity website before you purchase.'

export const metadata: Metadata = {
  title: 'Build Your Website Preview',
  description,
  alternates: { canonical: '/preview-your-business' },
  openGraph: {
    title: 'Build Your Website Preview | DailyClarity',
    description,
    url: '/preview-your-business',
    type: 'website',
    images: ['/og-image.png'],
  },
}

function PreviewLoadingShell() {
  return (
    <main className="min-h-screen pt-28 pb-20 container-hvac">
      <div className="max-w-3xl mx-auto glass-panel rounded-3xl p-8 md:p-12 space-y-6">
        <span className="signal-chip">DailyClarity Preview Studio</span>
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Build Your Website Preview
        </h1>
        <p className="text-slate-300 leading-relaxed">
          Loading the interactive practice preview studio so you can test a sample website or
          enter your business details before choosing a plan.
        </p>
        <div className="flex items-center gap-3 pt-2 text-sm text-amber-200" role="status" aria-live="polite">
          <div className="w-5 h-5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <span>Preparing template styles and preview controls…</span>
        </div>
      </div>
    </main>
  )
}

export default function PreviewYourBusinessPage() {
  return (
    <Suspense fallback={<PreviewLoadingShell />}>
      <PreviewYourBusinessClient />
    </Suspense>
  )
}
