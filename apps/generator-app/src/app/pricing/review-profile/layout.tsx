import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Review Your Website Profile',
  description: 'Review your saved website details before continuing to checkout.',
  alternates: { canonical: '/pricing/review-profile' },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function ReviewProfileLayout({ children }: { children: ReactNode }) {
  return children
}
