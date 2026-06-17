import { Suspense } from 'react'
import type { Metadata } from 'next'
import PricingClient from './PricingClient'
import { JsonLd } from '@/components/JsonLd'
import {
  SITE_DESCRIPTION,
  pricingSchema,
  pricingFaqSchema,
  breadcrumbSchema,
} from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Pricing — Launch from $20/month with a 7-day free trial',
  description:
    'Simple monthly pricing for a fully hosted business website. Basic Services at $20/month or Growth Partner at $80/month, each with a 7-day free trial. ' +
    SITE_DESCRIPTION,
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | DailyClarity',
    description:
      'Launch a hosted business website from $20/month. Includes email, database, and Stripe payments, plus a 7-day free trial.',
    url: '/pricing',
    type: 'website',
  },
}

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={[
          pricingSchema,
          pricingFaqSchema,
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
          ]),
        ]}
      />
      <Suspense fallback={<div className="min-h-screen pt-24 pb-20" />}>
        <PricingClient />
      </Suspense>
    </>
  )
}
