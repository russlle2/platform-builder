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
  'Explore published website templates for wellness coaches, therapists, sound bath facilitators, aromatherapy, and holistic medicine. Preview supported fields with your content, customize, and launch with managed hosting.'

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
    'Launch a business website from a published professional template, with managed hosting, SSL, contact-form email notifications, and self-serve editing for supported fields. Any trial terms are shown before checkout.',
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
        name: 'Basic',
        price: '20.00',
        priceCurrency: 'USD',
        url: `${SITE_URL}/pricing`,
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Security + Ads',
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
    q: "What's included in Basic?",
    a: 'We launch your editable site on a hosted subdomain with SSL, contact-form email notifications, secure storage, and self-serve portal access. Stripe securely handles your DailyClarity subscription billing.',
  },
  {
    q: 'How fast can I launch?',
    a: 'Launch timing depends on the completeness of your intake, the template you choose, and any domain or integration work required. We confirm the applicable next steps after checkout.',
  },
  {
    q: 'How does the $500 custom website build work?',
    a: 'Send a detailed brief for a scope review with no payment. Discuss the inclusions, hosting, revisions, and timing before deciding to proceed. If you choose checkout after that discussion, the one-time $500 payment is charged immediately. Domains, paid plugins, third-party subscriptions, and expanded application work are separate unless agreed in writing.',
  },
  {
    q: 'Is there a free trial?',
    a: 'When a trial is offered, its length and billing start date are shown before checkout. A card is required for subscription checkout, and the one-time custom build does not include a trial.',
  },
  {
    q: 'How do I change plans?',
    a: 'Contact DailyClarity support to request a plan change. We confirm the service scope and any billing adjustment before making the change.',
  },
  {
    q: 'Do I need technical skills?',
    a: 'Edit supported text and images without code. Your selected template includes managed hosting and publishing. Confirm any particular booking service or integration requirement before paying.',
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
