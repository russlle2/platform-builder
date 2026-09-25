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

export default function PreviewYourBusinessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PreviewYourBusinessClient />
    </Suspense>
  )
}
