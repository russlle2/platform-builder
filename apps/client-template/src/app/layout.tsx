import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Generated Website',
  description: 'Website created with platform-builder',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
