import React from 'react';

export interface PricingCardProps {
  name: string;
  price: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel?: string;
  onSelect?: () => void;
  note?: string;
}

export function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false,
  ctaLabel = 'Get Started',
  onSelect,
  note,
}: PricingCardProps) {
  return (
    <div
      className={`relative rounded-2xl p-8 flex flex-col ${
        highlighted
          ? 'bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 border-2 border-amber-500 shadow-2xl scale-105'
          : 'bg-gray-900/90 border border-gray-700/50 shadow-xl'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 text-white text-sm font-bold rounded-full">
          Most Popular
        </div>
      )}

      <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
      <p className="text-white text-sm mb-4">{description}</p>

      <div className="mb-6">
        <span className="text-5xl font-bold text-white">${price}</span>
        {price > 99 && <span className="text-white text-lg ml-1">/one-time</span>}
        {price <= 99 && <span className="text-white text-lg ml-1">/mo</span>}
      </div>

      {note && (
        <p className="text-amber-300 text-sm mb-4 font-medium">{note}</p>
      )}

      <ul className="space-y-3 mb-8 flex-grow">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start text-white">
            <svg className="w-5 h-5 text-amber-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        className={`w-full py-3 rounded-xl font-bold text-lg transition-all duration-200 ${
          highlighted
            ? 'bg-white text-amber-900 hover:bg-gray-100 shadow-lg'
            : 'bg-amber-600 text-white hover:bg-amber-700 shadow-md'
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
