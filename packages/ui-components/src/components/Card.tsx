<<<<<<< HEAD
import React from 'react'

interface CardProps {
  children: React.ReactNode
  title?: string
  footer?: React.ReactNode
  className?: string
}

export function Card({ children, title, footer, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  )
=======
import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'mahogany' | 'glass' | 'dark';
  className?: string;
}

export function Card({ children, variant = 'mahogany', className = '' }: CardProps) {
  const variants: Record<string, string> = {
    mahogany:
      'bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 shadow-2xl border border-amber-700/30',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20 shadow-xl',
    dark: 'bg-gray-900/90 border border-gray-700/50 shadow-xl',
  };

  return (
    <div className={`rounded-2xl p-6 ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
>>>>>>> origin/main
}
