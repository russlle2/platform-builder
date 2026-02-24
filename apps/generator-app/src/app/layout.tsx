import './globals.css'
import type { Metadata } from 'next'
import { Barlow_Condensed, Sora } from 'next/font/google'
import Chatbot from '@/components/Chatbot'
import { AppLayout } from '@/components/layout/AppLayout'
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
  title: {
    default: 'Platform Builder — Professional Website Templates',
    template: '%s | Platform Builder',
  },
  description:
    'Browse 500+ unique website templates across multiple industries. Pick a design, enter your details, preview it live, and launch.',
  keywords: [
    'website builder',
    'website templates',
    'professional website',
    'small business website',
    'HVAC website',
    'therapist website',
    'wellness website',
    'aromatherapy website',
    'holistic medicine website',
  ],
  robots: 'index, follow',
  category: 'business',
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
        <AppLayout>
          {children}
        </AppLayout>
        <Chatbot />
      </body>
    </html>
  )
}