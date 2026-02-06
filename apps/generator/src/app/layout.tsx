import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Website Builder - Generator',
  description: 'Create beautiful websites with our generator platform',
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
