/**
 * Centralized SEO constants and JSON-LD structured data builders.
 *
 * Structured data is emitted as <script type="application/ld+json"> — it is
 * invisible to visitors but read by Google to power rich results and improve
 * how the site is understood and ranked. No visible keyword stuffing required.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_PLATFORM_URL ||
  'https://dailyclarity.org'
).replace(/\/$/, '')

export const SITE_NAME = 'DailyClarity'

export const SITE_DESCRIPTION =
  'Choose from 500+ unique website templates for wellness coaches, therapists, sound bath facilitators, aromatherapy, and holistic medicine. Preview live, customize, and launch with hosting, email, and payments included.'

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/icon.png`,
  },
}

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: { '@id': `${SITE_URL}/#organization` },
}

export const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${SITE_URL}/#service`,
  name: 'Done-for-you business website launch',
  serviceType: 'Website design and hosting',
  provider: { '@id': `${SITE_URL}/#organization` },
  areaServed: 'US',
  description: SITE_DESCRIPTION,
}

export const pricingSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'DailyClarity website plans',
  description:
    'Launch a hosted business website from a professional template, with email, database, and Stripe payments connected. Includes a 7-day free trial.',
  brand: { '@type': 'Brand', name: SITE_NAME },
  url: `${SITE_URL}/pricing`,
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '20.00',
    highPrice: '500.00',
    offerCount: 3,
    offers: [
      {
        '@type': 'Offer',
        name: 'Basic Services',
        price: '20.00',
        priceCurrency: 'USD',
        url: `${SITE_URL}/pricing`,
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Growth Partner',
        price: '80.00',
        priceCurrency: 'USD',
        url: `${SITE_URL}/pricing`,
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Custom Website Build',
        price: '500.00',
        priceCurrency: 'USD',
        url: `${SITE_URL}/custom-build`,
        availability: 'https://schema.org/InStock',
      },
    ],
  },
}

const pricingFaq: Array<{ q: string; a: string }> = [
  {
    q: "What's included in Basic Services?",
    a: 'We launch your site on a hosted subdomain and connect Postmark for email, Supabase for storage, and Stripe for payments. You can edit anytime through your portal.',
  },
  {
    q: 'How fast can I launch?',
    a: 'Most builds go live within 48 hours once your intake is complete and your subscription is active.',
  },
  {
    q: 'How does the $500 custom website build work?',
    a: 'Submit a detailed design and functionality brief, then complete one immediate $500 Stripe payment. DailyClarity securely saves the brief before checkout and manually reviews it after payment is confirmed.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes — every plan includes a 7-day trial. We collect your card at checkout, but you are not charged until the trial ends. Cancel anytime in Stripe before then.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Absolutely. You can upgrade or downgrade at any time. Changes take effect immediately, and we prorate any differences.',
  },
  {
    q: 'Do I need technical skills?',
    a: 'None at all. Our guided intake collects your details, and we handle setup, integrations, hosting, and launch.',
  },
  {
    q: 'What if I want to cancel?',
    a: 'No long-term contracts. Cancel anytime and keep access through the end of your billing period.',
  },
]

export const pricingFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: pricingFaq.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}
