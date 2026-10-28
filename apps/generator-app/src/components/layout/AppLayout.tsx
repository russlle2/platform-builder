'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LeadCaptureModal from '@/components/LeadCaptureModal';
import { getNicheNavLinks, NICHE_SLUGS } from '@/lib/templates/niche-meta';

const nicheLinks = getNicheNavLinks();
const daylightRoutes = new Set([
  '/', '/pricing', '/contact', '/privacy', '/terms', '/refund-policy',
  '/custom-build', '/wellness-experiences', '/wellness-website-checklist',
  '/website-builder-for-therapists', '/website-builder-for-wellness-coaches',
  '/aromatherapy-website-builder', '/sound-bath-website-template',
  '/dailyclarity-vs-wix', '/proof', '/builds', '/archive',
]);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const daylight = daylightRoutes.has(pathname)
    || pathname === '/demo' || pathname.startsWith('/demo/')
    || pathname === '/help' || pathname.startsWith('/help/')
    || NICHE_SLUGS.some((slug) => pathname === `/${slug}`);
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
      <div className={`site-shell${daylight ? ' public-daylight' : ''}`}>
      <a
        href="#main-content"
        className="skip-link"
        onClick={() => {
          setTemplatesOpen(false);
          setMobileOpen(false);
        }}
      >
        Skip to main content
      </a>
      {/* Persistent Navigation */}
      <nav
        aria-label="Primary navigation"
        className="fixed top-0 left-0 right-0 z-50 site-header backdrop-blur-xl border-b"
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
                  <span className="text-lg sm:text-xl font-semibold dc-text-heading tracking-tight">
                    Daily<span className="dc-text-accent">Clarity</span>
                  </span>
                  <span className="hidden sm:block text-[0.65rem] font-medium tracking-[0.04em] dc-text-muted">
                    For a practice like yours
                  </span>
                </span>
              </Link>
            </div>
            {/* Desktop nav */}
            <div className="hidden xl:flex space-x-1 items-center">
              <Link
                href="/"
                className="site-nav-link px-3 py-2 rounded-lg text-xs font-semibold tracking-[0.02em] dc-text-body hover:dc-text-heading hover:dc-surface-soft transition-all duration-200"
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
                  className="site-nav-link px-3 py-2 rounded-lg text-xs font-semibold tracking-[0.02em] dc-text-body hover:dc-text-heading hover:dc-surface-soft transition-all duration-200 flex items-center gap-1"
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
                    className="absolute top-full left-0 mt-1 w-56 dc-surface backdrop-blur-xl border dc-border rounded-xl shadow-2xl py-2 z-50"
                  >
                    {nicheLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setTemplatesOpen(false)}
                        className="block px-4 py-2.5 text-sm dc-text-body hover:dc-text-heading hover:dc-surface-soft transition-all"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href="/preview-your-business"
                className="site-nav-link px-3 py-2 rounded-lg text-xs font-semibold tracking-[0.02em] dc-text-accent hover:dc-text-heading hover:dc-bg-accent-soft transition-all duration-200 border dc-border"
              >
                Preview Your Business
              </Link>
              {[
                { label: 'Watch Demo', href: '/demo/platform-builder' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'My websites', href: '/dashboard' },
                { label: 'Contact', href: '/contact' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="site-nav-link px-3 py-2 rounded-lg text-xs font-semibold tracking-[0.02em] dc-text-body hover:dc-text-heading hover:dc-surface-soft transition-all duration-200"
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
              className="xl:hidden dc-text-heading p-2.5 rounded-lg hover:dc-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
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
            className="xl:hidden max-h-[calc(100vh-4rem)] overflow-y-auto dc-surface backdrop-blur-xl border-t dc-border pb-4"
            onKeyDown={handleMobileKeyDown}
          >
            <div className="px-4 py-2 space-y-1">
              <Link href="/" onClick={() => setMobileOpen(false)} className="block min-h-11 px-4 py-3 text-sm dc-text-body hover:dc-text-heading">Home</Link>
              <div className="px-4 py-2 text-xs uppercase tracking-[0.2em] dc-text-muted font-semibold">Templates</div>
              {nicheLinks.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block min-h-11 px-6 py-3 text-sm dc-text-body hover:dc-text-heading">
                  {item.label}
                </Link>
              ))}
              <Link href="/demo/platform-builder" onClick={() => setMobileOpen(false)} className="block min-h-11 px-4 py-3 text-sm dc-text-body hover:dc-text-heading">Watch Demo</Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block min-h-11 px-4 py-3 text-sm dc-text-body hover:dc-text-heading">Pricing</Link>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block min-h-11 px-4 py-3 text-sm dc-text-body hover:dc-text-heading">My websites</Link>
              <Link href="/contact" onClick={() => setMobileOpen(false)} className="block min-h-11 px-4 py-3 text-sm dc-text-body hover:dc-text-heading">Contact</Link>
              <Link href="/preview-your-business" onClick={() => setMobileOpen(false)} className="block min-h-11 px-4 py-3 text-sm font-semibold dc-text-accent hover:dc-text-heading">Preview Your Business</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>

      <footer className="site-footer border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] dc-text-heading">
              Daily<span className="dc-text-accent">Clarity</span>
            </Link>
            <p className="mt-2 max-w-md text-xs leading-5 dc-text-muted">
              Websites for independent businesses and wellness experiences from Palatka, Florida.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-5 gap-y-3 text-sm dc-text-muted">
              <li><Link href="/pricing" className="hover:dc-text-heading">Pricing</Link></li>
              <li><Link href="/wellness-experiences" className="hover:dc-text-heading">Wellness experiences</Link></li>
              <li><Link href="/help" className="hover:dc-text-heading">Help</Link></li>
              <li><Link href="/contact" className="hover:dc-text-heading">Contact</Link></li>
              <li><Link href="/privacy" className="hover:dc-text-heading">Privacy</Link></li>
              <li><Link href="/terms" className="hover:dc-text-heading">Terms</Link></li>
              <li><Link href="/refund-policy" className="hover:dc-text-heading">Refunds</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t dc-border px-4 py-4 text-center text-xs dc-text-muted">
          &copy; {new Date().getFullYear()} DailyClarity. All rights reserved.
        </div>
      </footer>
      </div>
      <LeadCaptureModal />
    </>
  );
}
