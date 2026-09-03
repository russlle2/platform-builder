import { Suspense } from 'react'
import type { Metadata } from 'next'
import PortalClient from './PortalClient'

export const metadata: Metadata = {
  title: 'Customer Portal',
  description: 'Open your DailyClarity customer portal.',
  alternates: { canonical: '/portal' },
  openGraph: {
    title: 'Customer Portal | DailyClarity',
    description: 'Open your DailyClarity customer portal.',
    url: '/portal',
    type: 'website',
    images: ['/og-image.png'],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-20" />}>
      <PortalClient />
    </Suspense>
  )
}
