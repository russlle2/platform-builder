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
}
