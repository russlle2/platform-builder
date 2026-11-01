import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const description = 'Contact DailyClarity for help with website previews, plans, launches, or an existing account.'

export const metadata: Metadata = {
  title: 'Contact',
  description,
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact | DailyClarity',
    description,
    url: '/contact',
    type: 'website',
    images: ['/og-image.png'],
  },
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children
}
