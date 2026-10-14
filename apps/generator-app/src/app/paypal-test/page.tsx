import type { Metadata } from 'next'
import PayPalSandbox from './PayPalSandbox'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Free PayPal Sandbox Test',
  description: 'Try a PayPal Sandbox checkout with pretend money and receive a verified test receipt.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  referrer: 'no-referrer',
}

export default function PayPalTestPage() {
  return <PayPalSandbox />
}
