'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Live Demo', href: '/live-demo' },
  { label: 'Editor', href: '/editor' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Proof', href: '/proof' },
  { label: 'Archive', href: '/archive' },
  { label: 'Builds', href: '/builds' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-white/10">
      <div className="container-hvac">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-2xl font-bold text-bright-white hover:scale-105 transition-transform"
          >
            HVAC <span className="text-blue-500">Pro</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${
                  pathname === item.href 
                    ? 'bg-white/20 text-white' 
                    : 'text-gray-200'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <Link
            href="/pricing"
            className="hidden md:block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all hover:scale-105 shadow-lg"
          >
            Reserve Your Spot
          </Link>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}
