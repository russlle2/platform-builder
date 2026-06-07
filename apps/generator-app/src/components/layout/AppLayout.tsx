'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import LeadCaptureModal from '@/components/LeadCaptureModal';

const nicheLinks = [
  { label: '🌿 Aromatherapy', href: '/aromatherapy' },
  { label: '🧘 Holistic Medicine', href: '/holistic_medicine' },
  { label: '💬 Therapist', href: '/private_practice_therapist' },
  { label: '🔔 Sound Bath', href: '/sound_bath' },
  { label: '✨ Wellness Coach', href: '/wellness_coach' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Persistent Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <Link href="/" className="flex flex-col leading-none">
                <span className="text-2xl font-bold text-white tracking-[0.15em] uppercase">
                  Daily<span className="text-cyan-300">Clarity</span>
                </span>
                <span className="hidden sm:block text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Platform Builder
                </span>
              </Link>
            </div>
            {/* Desktop nav */}
            <div className="hidden md:flex space-x-1 items-center">
              <Link
                href="/"
                className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                Home
              </Link>
              {/* Templates dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setTemplatesOpen(true)}
                onMouseLeave={() => setTemplatesOpen(false)}
              >
                <button className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-1">
                  Templates
                  <svg className={`w-3 h-3 transition-transform ${templatesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {templatesOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 z-50">
                    {nicheLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2.5 text-sm text-slate-200 hover:text-white hover:bg-white/10 transition-all"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href="/preview-your-business"
                className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 hover:text-white hover:bg-cyan-500/20 transition-all duration-200 border border-cyan-400/30"
              >
                Preview Your Business
              </Link>
              {[
                { label: 'Watch Demo', href: '/demo/platform-builder' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Portal', href: '/portal' },
                { label: 'Contact', href: '/contact' },
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
            {/* Mobile menu button */}
            <button
              className="md:hidden text-white p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/10 pb-4">
            <div className="px-4 py-2 space-y-1">
              <Link href="/" onClick={() => setMobileOpen(false)} className="block px-4 py-2 text-sm text-slate-200 hover:text-white">Home</Link>
              <div className="px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Templates</div>
              {nicheLinks.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block px-6 py-2 text-sm text-slate-200 hover:text-white">
                  {item.label}
                </Link>
              ))}
              <Link href="/demo/platform-builder" onClick={() => setMobileOpen(false)} className="block px-4 py-2 text-sm text-slate-200 hover:text-white">Watch Demo</Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block px-4 py-2 text-sm text-slate-200 hover:text-white">Pricing</Link>
              <Link href="/portal" onClick={() => setMobileOpen(false)} className="block px-4 py-2 text-sm text-slate-200 hover:text-white">Portal</Link>
              <Link href="/contact" onClick={() => setMobileOpen(false)} className="block px-4 py-2 text-sm text-slate-200 hover:text-white">Contact</Link>
              <Link href="/preview-your-business" onClick={() => setMobileOpen(false)} className="block px-4 py-2 text-sm font-semibold text-cyan-300 hover:text-white">Preview Your Business</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      {children}
      <LeadCaptureModal />
    </>
  );
}
