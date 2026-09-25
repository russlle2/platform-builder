import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in securely to your DailyClarity customer dashboard.',
  alternates: { canonical: '/login' },
  openGraph: {
    title: 'Sign In | DailyClarity',
    description: 'Sign in securely to your DailyClarity customer dashboard.',
    url: '/login',
    type: 'website',
    images: ['/og-image.png'],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}
