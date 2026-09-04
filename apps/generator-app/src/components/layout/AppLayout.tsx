'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LeadCaptureModal from '@/components/LeadCaptureModal';
import { getNicheNavLinks } from '@/lib/templates/niche-meta';

const nicheLinks = getNicheNavLinks();

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const templatesMenuRef = useRef<HTMLDivElement>(null);
  const templatesButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  function closeTemplatesOnBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setTemplatesOpen(false);
    }
  }

  function handleTemplatesKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setTemplatesOpen(false);
      templatesButtonRef.current?.focus();
    }
  }

  function handleMobileKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setMobileOpen(false);
      mobileMenuButtonRef.current?.focus();
    }
  }

  return (
    <>
      {/* Persistent Navigation */}
      <nav
        aria-label="Primary navigation"
        className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center gap-2 sm:gap-3 leading-none">
                <Image
                  src="/logo.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-8 w-8 sm:h-10 sm:w-10"
                  priority
                />
                <span className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-bold text-white tracking-[0.1em] sm:tracking-[0.15em] uppercase">
                    Daily<span className="text-cyan-300">Clarity</span>
                  </span>
                  <span className="hidden sm:block text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Platform Builder
                  </span>
                </span>
              </Link>
            </div>
            {/* Desktop nav */}
            <div className="hidden xl:flex space-x-1 items-center">
              <Link
                href="/"
                className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                Home
              </Link>
              {/* Templates dropdown */}
              <div
                ref={templatesMenuRef}
                className="relative"
                onBlur={closeTemplatesOnBlur}
                onKeyDown={handleTemplatesKeyDown}
              >
                <button
                  ref={templatesButtonRef}
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={templatesOpen}
                  aria-controls="desktop-templates-menu"
                  onClick={() => setTemplatesOpen((open) => !open)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center gap-1"
                >
                  Templates
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    className={`w-3 h-3 transition-transform ${templatesOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {templatesOpen && (
                  <div
                    id="desktop-templates-menu"
                    role="group"
                    aria-label="Website template categories"
                    className="absolute top-full left-0 mt-1 w-56 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 z-50"
                  >
                    {nicheLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setTemplatesOpen(false)}
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
                { label: 'My Dashboard', href: '/dashboard' },
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
              ref={mobileMenuButtonRef}
              type="button"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation-menu"
              className="xl:hidden text-white p-2.5 rounded-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              onClick={() => setMobileOpen((open) => !open)}
              onKeyDown={handleMobileKeyDown}
            >
              <svg aria-hidden="true" focusable="false" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div
            id="mobile-navigation-menu"
            className="xl:hidden max-h-[calc(100vh-4rem)] overflow-y-auto bg-slate-950/95 backdrop-blur-xl border-t border-white/10 pb-4"
            onKeyDown={handleMobileKeyDown}
          >
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
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block px-4 py-2 text-sm text-slate-200 hover:text-white">My Dashboard</Link>
              <Link href="/contact" onClick={() => setMobileOpen(false)} className="block px-4 py-2 text-sm text-slate-200 hover:text-white">Contact</Link>
              <Link href="/preview-your-business" onClick={() => setMobileOpen(false)} className="block px-4 py-2 text-sm font-semibold text-cyan-300 hover:text-white">Preview Your Business</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      {children}

      <footer className="border-t border-white/10 bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              Daily<span className="text-cyan-300">Clarity</span>
            </Link>
            <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
              Professional websites and practical tools for independent service businesses.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-400">
              <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white">Refunds</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-white/5 px-4 py-4 text-center text-xs text-slate-600">
          &copy; {new Date().getFullYear()} DailyClarity. All rights reserved.
        </div>
      </footer>
      <LeadCaptureModal />
    </>
  );
}
