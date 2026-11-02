import { Suspense } from 'react'
import type { Metadata } from 'next'
import PreviewYourBusinessClient, { PreviewIntakeShell } from './PreviewYourBusinessClient'

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
    <Suspense fallback={<PreviewIntakeShell />}>
      <PreviewYourBusinessClient />
    </Suspense>
  )
}
