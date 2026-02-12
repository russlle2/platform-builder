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
    default: 'Platform Builder for HVAC Pros',
    template: '%s | Platform Builder',
  },
  description:
    'Launch a premium HVAC platform with guided intake, instant templates, and managed integrations.',
  keywords: [
    'HVAC website builder',
    'plumbing website',
    'HVAC marketing platform',
    'service business website',
    'local service marketing',
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