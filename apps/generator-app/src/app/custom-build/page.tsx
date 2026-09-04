import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbSchema, SITE_URL } from '@/lib/seo'
import CustomBuildForm from './CustomBuildForm'

export const metadata: Metadata = {
  title: 'Custom Website Build — $500 One-Time Payment',
  description:
    'Submit your detailed website design and functionality brief, then purchase a custom DailyClarity website build for a one-time $500 payment.',
  alternates: { canonical: '/custom-build' },
  openGraph: {
    title: 'Custom Website Build — $500 | DailyClarity',
    description:
      'Describe the website you want and submit your project brief with a secure one-time $500 Stripe payment.',
    url: '/custom-build',
    type: 'website',
  },
}

export default async function CustomBuildPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>
}) {
  const { canceled } = await searchParams

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Custom Website Build',
            serviceType: 'Custom website design and development',
            provider: { '@type': 'Organization', name: 'DailyClarity', url: SITE_URL },
            url: `${SITE_URL}/custom-build`,
            offers: {
              '@type': 'Offer',
              price: '500.00',
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
            },
          },
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
            { name: 'Custom Website Build', path: '/custom-build' },
          ]),
        ]}
      />
      <CustomBuildForm wasCanceled={canceled === '1'} />
    </>
  )
}
