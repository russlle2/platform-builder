import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'
import Chatbot from '@/components/Chatbot'
import type { ReactNode } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HVAC & Plumbing Platform Builder - Build Like A Pro',
  description: 'Skip the learning curve. Build your HVAC and Plumbing services presence instantly, without confusion, without learning tools.',
  keywords: 'HVAC website builder, plumbing website, professional services, no-code platform',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        {children}
        <Chatbot />
      </body>
    </html>
  )
}
