'use client';

import React from 'react';

const PRICING_TIERS = [
  {
    name: 'Entrepreneur',
    price: 99,
    period: '/mo',
    description: 'Perfect for getting started',
    features: [
      'Professional website template',
      'Basic customization',
      'Mobile responsive',
      'Contact form',
      'SEO basics',
    ],
  },
  {
    name: 'Custom Build',
    price: 499,
    period: '/one-time',
    description: 'Full custom build — 50/50 split, refund before approval',
    note: '50/50 payment split — full refund available before you approve',
    highlighted: true,
    features: [
      'Fully custom design',
      'Live Build Wizard access',
      'Unlimited revisions before approval',
      'Premium templates',
      'Advanced SEO',
      'Image optimization',
      'Priority support',
    ],
  },
  {
    name: 'Executive',
    price: 399,
    period: '/mo',
    description: 'For growing businesses',
    features: [
      'Everything in Custom Build',
      'Monthly content updates',
      'Performance monitoring',
      'Analytics dashboard',
      'Dedicated support',
      'A/B testing',
    ],
  },
  {
    name: 'CEO',
    price: 999,
    period: '/mo',
    description: 'Enterprise-level presence',
    features: [
      'Everything in Executive',
      'Multi-location support',
      'Custom integrations',
      'White-glove onboarding',
      'Quarterly strategy reviews',
      'Priority feature requests',
      'Dedicated account manager',
    ],
  },
];

export function PricingSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-16" id="pricing">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">
          Transparent Pricing
        </h2>
        <p className="text-white text-xl max-w-2xl mx-auto">
          See Transparent Pricing &amp; Reserve Your Spot
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-2xl p-8 flex flex-col ${
              tier.highlighted
                ? 'bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 border-2 border-amber-500 shadow-2xl lg:scale-105'
                : 'bg-gray-900/90 border border-gray-700/50 shadow-xl'
            }`}
          >
            {tier.highlighted && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 text-white text-sm font-bold rounded-full">
                Most Popular
              </div>
            )}

            <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
            <p className="text-white text-sm mb-4">{tier.description}</p>

            <div className="mb-6">
              <span className="text-5xl font-bold text-white">${tier.price}</span>
              <span className="text-white text-lg ml-1">{tier.period}</span>
            </div>

            {tier.note && (
              <p className="text-amber-300 text-sm mb-4 font-medium">{tier.note}</p>
            )}

            <ul className="space-y-3 mb-8 flex-grow">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-start text-white">
                  <svg className="w-5 h-5 text-amber-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="/editor"
              className={`block w-full py-3 rounded-xl font-bold text-lg text-center transition-all duration-200 ${
                tier.highlighted
                  ? 'bg-white text-amber-900 hover:bg-gray-100 shadow-lg'
                  : 'bg-amber-600 text-white hover:bg-amber-700 shadow-md'
              }`}
            >
              Get Started
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
