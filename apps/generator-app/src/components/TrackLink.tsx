'use client'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import type { ComponentProps } from 'react'

interface Props extends ComponentProps<typeof Link> {
  event: string
  properties?: Record<string, string | number | boolean>
}

export function TrackLink({ event, properties, onClick, ...props }: Props) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(event, properties)
        onClick?.(e)
      }}
    />
  )
}
