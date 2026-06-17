import './globals.css'
import type { Metadata } from 'next'
import { Barlow_Condensed, Sora } from 'next/font/google'
import Script from 'next/script'
import Chatbot from '@/components/Chatbot'
import { AppLayout } from '@/components/layout/AppLayout'
import { JsonLd } from '@/components/JsonLd'
import { organizationSchema, websiteSchema, serviceSchema } from '@/lib/seo'
import type { ReactNode } from 'react'

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-display',
})
const body = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyclarity.org'),
  title: {
    default: 'DailyClarity — Professional Website Templates for Service Businesses',
    template: '%s | DailyClarity',
  },
  description:
    'Choose from 500+ unique website templates for wellness coaches, therapists, sound bath facilitators, aromatherapy, and holistic medicine. Preview live, customize, launch.',
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
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'DailyClarity',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyclarity.org',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
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
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
