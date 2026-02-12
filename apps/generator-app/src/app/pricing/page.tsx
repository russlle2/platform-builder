import { Suspense } from 'react'
import PricingClient from './PricingClient'

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-20" />}>
      <PricingClient />
    </Suspense>
  )
}
