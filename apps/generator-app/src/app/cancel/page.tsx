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
          No charges were made. You can pick a plan whenever you are ready.
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
      </div>
    </main>
  )
}
