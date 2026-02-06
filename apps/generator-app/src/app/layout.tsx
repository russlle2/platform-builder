import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AppLayout } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Platform Builder — Build Your HVAC & Plumbing Web Presence',
  description:
    'The industrial-premium platform where HVAC and Plumbing professionals can instantly see, shape, and understand their website.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
