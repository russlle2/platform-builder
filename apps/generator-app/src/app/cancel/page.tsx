import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Checkout Canceled',
  description: 'Return to DailyClarity pricing or update your website preview after canceling checkout.',
  alternates: { canonical: '/cancel' },
  openGraph: {
    title: 'Checkout Canceled | DailyClarity',
    description: 'Return to DailyClarity pricing or update your website preview after canceling checkout.',
    url: '/cancel',
    type: 'website',
    images: ['/og-image.png'],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function CancelPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 container-hvac">
      <div className="mahogany-surface rounded-3xl p-12 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-bright-white mb-4">
          Checkout canceled
        </h1>
        <p className="text-gray-300 text-lg mb-8">
          You returned from checkout. You can review your plan or update your preview before continuing.
        </p>
        <p className="text-slate-300 mb-8">
          If you submitted payment or see a pending bank entry, check your account and email before
          trying again. Returning to this page does not confirm a payment or cancel an existing subscription.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/pricing" className="cta-button">
            Back to pricing
          </Link>
          <Link
            href="/preview-your-business"
            className="px-8 py-4 text-lg font-bold text-white border-2 border-white rounded-lg hover:bg-white/10 transition-all"
          >
            Update details
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-cyan-200">
          <Link href="/dashboard" className="underline underline-offset-4">Check My websites</Link>
          <Link href="/contact" className="underline underline-offset-4">Contact support</Link>
        </div>
      </div>
    </main>
  )
}
