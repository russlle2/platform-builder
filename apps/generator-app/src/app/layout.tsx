import './globals.css'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Analytics from '@/components/Analytics'
import Chatbot from '@/components/Chatbot'
import { AppLayout } from '@/components/layout/AppLayout'
import { JsonLd } from '@/components/JsonLd'
import { organizationSchema, websiteSchema, serviceSchema } from '@/lib/seo'
import { shouldIndexDeployment } from '@/lib/deployment-environment'
import type { ReactNode } from 'react'

const display = localFont({
  src: [
    { path: './fonts/barlow-condensed-regular.woff2', weight: '400' },
    { path: './fonts/barlow-condensed-semibold.woff2', weight: '600' },
    { path: './fonts/barlow-condensed-bold.woff2', weight: '700' },
  ],
  style: 'normal',
  display: 'swap',
  variable: '--font-display',
})
const body = localFont({
  src: [
    { path: './fonts/sora-variable.woff2', weight: '300' },
    { path: './fonts/sora-variable.woff2', weight: '400' },
    { path: './fonts/sora-variable.woff2', weight: '600' },
    { path: './fonts/sora-variable.woff2', weight: '700' },
  ],
  style: 'normal',
  display: 'swap',
  variable: '--font-body',
})

const configuredGaId = process.env.NEXT_PUBLIC_GA_ID?.trim()
const googleAnalyticsId = configuredGaId && /^G-[A-Z0-9]+$/i.test(configuredGaId)
  ? configuredGaId
  : null
const allowSearchIndexing = shouldIndexDeployment()

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyclarity.org'),
  title: {
    default: 'DailyClarity — Professional Website Templates for Service Businesses',
    template: '%s | DailyClarity',
  },
  description:
    'Explore published website templates for wellness coaches, therapists, sound bath facilitators, aromatherapy, and holistic medicine. Preview supported fields with your content, customize, and launch.',
  keywords: [
    'website builder',
    'website templates',
    'professional website',
    'wellness website',
    'therapist website',
    'wellness coach website',
    'aromatherapy website',
    'holistic medicine website',
    'sound bath website',
    'DailyClarity',
  ],
  openGraph: {
    type: 'website',
    siteName: 'DailyClarity',
    images: [
      {
        url: '/og-image.png',
        width: 1536,
        height: 1024,
        alt: 'DailyClarity — Professional Website Templates for Service Businesses',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [{ url: '/favicon-64.png', sizes: '64x64', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  robots: {
    index: allowSearchIndexing,
    follow: allowSearchIndexing,
    googleBot: { index: allowSearchIndexing, follow: allowSearchIndexing },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  category: 'business',
  formatDetection: { telephone: false },
}

export const viewport = {
  themeColor: '#0b1220',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable} bg-slate-950 text-white antialiased`}>
        <JsonLd data={[organizationSchema, websiteSchema, serviceSchema]} />
        <AppLayout>
          {children}
        </AppLayout>
        <Chatbot />
        <Analytics plausibleDomain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN} googleAnalyticsId={googleAnalyticsId} />
      </body>
    </html>
  )
}
