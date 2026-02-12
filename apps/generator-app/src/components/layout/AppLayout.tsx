'use client';

import React from 'react';
import Link from 'next/link';
import LeadCaptureModal from '@/components/LeadCaptureModal';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Persistent Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <Link href="/" className="text-2xl font-bold text-white tracking-[0.2em] uppercase">
                Platform<span className="text-cyan-300">Builder</span>
              </Link>
            </div>
            <div className="flex space-x-1">
              {[
                { label: 'Home', href: '/' },
                { label: 'Live Demo', href: '/demo' },
                { label: 'Editor', href: '/editor' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Portal', href: '/portal' },
                { label: 'Proof', href: '/proof' },
                { label: 'Archive', href: '/archive' },
                { label: 'Builds', href: '/builds' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      {children}
      <LeadCaptureModal />
    </>
  );
}
