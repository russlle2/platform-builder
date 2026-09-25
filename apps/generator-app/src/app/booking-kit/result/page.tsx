import type { Metadata } from 'next'
import BookingKitResult from './BookingKitResult'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Your private Booking Clarity Kit',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default function BookingKitResultPage() {
  return <BookingKitResult />
}
