<<<<<<< HEAD
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
=======
import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Professional HVAC & Plumbing Services',
  description: 'Expert HVAC and plumbing services for residential and commercial clients.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
>>>>>>> origin/main
}
