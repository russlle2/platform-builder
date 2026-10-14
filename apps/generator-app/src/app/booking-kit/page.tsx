import type { Metadata } from 'next'
import BookingKitPublicLink from '@/components/booking-kit/BookingKitPublicLink'
import BookingKitForm from './BookingKitForm'
import { BOOKING_KIT_ACCESS_DAYS, BOOKING_KIT_PRICE_CENTS } from '@/lib/booking-kit-content'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Booking Clarity Kit',
  description: 'Turn the facts about one service into reusable website and booking copy.',
  alternates: { canonical: '/booking-kit' },
}

export default function BookingKitPage() {
  const enabled = process.env.BOOKING_KIT_ENABLED === 'true'
  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-28">
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">DailyClarity · One service, one consistent message</p>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Booking Clarity Kit</h1>
      <p className="mt-5 text-xl text-slate-200">Clear copy for your website, your inbox, and the next booking.</p>
      <p className="mt-4 text-slate-300">${BOOKING_KIT_PRICE_CENTS / 100} USD once. Get a homepage headline and introduction, service description, booking call to action, five FAQs, short bio, inquiry reply, and confirmation/preparation reply, composed from the facts you supply.</p>
      <p className="mt-4 text-slate-300">Copy each asset, download editable text, print your kit, or choose to transfer your website copy into our free preview. Hosted access lasts {BOOKING_KIT_ACCESS_DAYS} days after payment. Private access links expire after one hour; recover a new link through your purchase email while hosted access is active. Your downloaded copies remain yours to edit.</p>
      <p className="mt-4 text-slate-300">No subscription is included. Review and correct your facts before payment. Add any unfinished policies before using your copy.</p>
      <BookingKitPublicLink href="/preview-your-business" className="mt-5 inline-block font-semibold text-cyan-300 underline underline-offset-4">Try the free website preview</BookingKitPublicLink>
      {!enabled && <p role="status" className="mt-7 rounded-xl border border-amber-300/40 bg-amber-950/30 p-4 text-amber-100">Kit sales are not open yet. You can prepare and review your facts below; checkout is unavailable.</p>}
      <BookingKitForm enabled={enabled} />
    </main>
  )
}
