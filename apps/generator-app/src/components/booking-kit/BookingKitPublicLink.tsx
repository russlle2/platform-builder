'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

/** Leave the private document explicitly; never carry its SPA state into a public page. */
export default function BookingKitPublicLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return <Link href={href} className={className} prefetch={false} onClick={(event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    window.location.assign(href)
  }}>{children}</Link>
}
