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
  title: 'Pricing — Plans from $20/month or a $500 custom website',
  description:
    'Choose a hosted website plan at $20 or $80 per month, review current trial terms before checkout, or request a scope review before a one-time $500 custom website build. ' +
    SITE_DESCRIPTION,
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | DailyClarity',
    description:
      'Launch from $20/month or discuss your scope before a one-time $500 custom website build. Request a custom-build review with no payment.',
    url: '/pricing',
    type: 'website',
    images: ['/og-image.png'],
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
