import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbSchema, SITE_URL } from '@/lib/seo'
import CustomBuildForm from './CustomBuildForm'

export const metadata: Metadata = {
  title: 'Custom Website Build — Request a Scope Review',
  description:
    'Describe your custom website and request a scope review with no payment. Discuss the inclusions, hosting, revisions, and timing before a one-time $500 build.',
  alternates: { canonical: '/custom-build' },
  openGraph: {
    title: 'Custom Website Build — $500 | DailyClarity',
    description:
      'Send your custom website brief for a scope discussion before deciding on a one-time $500 build. No card needed to request a review.',
    url: '/custom-build',
    type: 'website',
    siteName: 'DailyClarity',
    images: [
      {
        url: '/og-image.png',
        width: 1536,
        height: 1024,
        alt: 'DailyClarity — Custom Website Build',
      },
    ],
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
