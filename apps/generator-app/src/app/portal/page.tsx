import { Suspense } from 'react'
import PortalClient from './PortalClient'

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-20" />}>
      <PortalClient />
    </Suspense>
  )
}
