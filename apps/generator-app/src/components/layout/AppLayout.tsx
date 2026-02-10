'use client';

import React from 'react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Persistent Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-amber-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <a href="/" className="text-xl font-bold text-white tracking-wide">
                Platform<span className="text-amber-500">Builder</span>
              </a>
            </div>
            <div className="flex space-x-1">
              {[
                { label: 'Home', href: '/' },
                { label: 'Live Demo', href: '/demo' },
                { label: 'Editor', href: '/editor' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Proof', href: '/proof' },
                { label: 'Archive', href: '/archive' },
                { label: 'Builds', href: '/builds' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      {children}
    </>
  );
}
