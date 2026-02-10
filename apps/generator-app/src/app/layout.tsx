<<<<<<< HEAD
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
=======
import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AppLayout } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Platform Builder — Build Your HVAC & Plumbing Web Presence',
  description:
    'The industrial-premium platform where HVAC and Plumbing professionals can instantly see, shape, and understand their website.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
>>>>>>> origin/main
}
