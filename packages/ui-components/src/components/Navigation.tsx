import React from 'react';

export interface NavigationProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'demo', label: 'Live Demo', href: '/demo' },
  { id: 'editor', label: 'Editor', href: '/editor' },
  { id: 'pricing', label: 'Pricing', href: '/pricing' },
  { id: 'proof', label: 'Proof', href: '/proof' },
  { id: 'archive', label: 'Archive', href: '/archive' },
  { id: 'builds', label: 'Builds', href: '/builds' },
];

export function Navigation({ currentPage = 'home', onNavigate }: NavigationProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-amber-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <span className="text-xl font-bold text-white tracking-wide">
              Platform<span className="text-amber-500">Builder</span>
            </span>
          </div>
          <div className="flex space-x-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(item.id);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    currentPage === item.id
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
