'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function CheckPaymentAgain() {
  const router = useRouter()
  const [checking, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={checking}
      aria-busy={checking}
      className="cta-button disabled:cursor-wait disabled:opacity-60"
    >
      {checking ? 'Checking payment…' : 'Check payment again'}
    </button>
  )
}
