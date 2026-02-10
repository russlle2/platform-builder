'use client'

import Link from 'next/link'
import { useState } from 'react'

const pricingTiers = [
  {
    name: 'Custom Build',
    price: 499,
    period: 'one-time',
    description: 'Work directly with us to build your perfect site',
    features: [
      '50/50 payment split',
      'Full refund before final approval',
      'Direct collaboration',
      'Unlimited revisions until approval',
      'Custom design elements',
      'Priority support',
      'Free hosting for 1 year',
    ],
    highlight: false,
    badge: 'Most Flexible',
  },
  {
    name: 'Entrepreneur',
    price: 99,
    period: 'monthly',
    description: 'Perfect for getting started quickly',
    features: [
      'Access to all templates',
      'Live Build Wizard',
      'Basic customization',
      'Image upload & optimization',
      'Mobile-responsive design',
      'SEO-friendly structure',
      'Email support',
    ],
    highlight: false,
    badge: null,
  },
  {
    name: 'Executive',
    price: 399,
    period: 'monthly',
    description: 'For established businesses ready to dominate',
    features: [
      'Everything in Entrepreneur',
      'Advanced customization options',
      'Priority template access',
      'Custom domain setup',
      'Advanced analytics',
      'Priority email support',
      'Monthly strategy call',
      'A/B testing tools',
    ],
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'CEO',
    price: 999,
    period: 'monthly',
    description: 'Elite-level service for market leaders',
    features: [
      'Everything in Executive',
      'White-glove service',
      'Dedicated account manager',
      'Multi-site management',
      'Custom integrations',
      'Phone & video support',
      'Weekly strategy calls',
      'Advanced conversion optimization',
      'Competitor analysis',
    ],
    highlight: false,
    badge: 'Premium',
  },
]

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  return (
    <main className="min-h-screen pt-16">
      {/* Header */}
      <section className="container-hvac py-16">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-bright-white">
            Transparent Pricing
          </h1>
          <p className="text-xl md:text-2xl text-pure-white max-w-3xl mx-auto">
            Choose the plan that fits your business. No hidden fees. No surprises.
          </p>
          <p className="scarcity-message text-lg">
            ⚡ Limited to 30 active monthly members nationwide
          </p>
        </div>
      </section>
    <main className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/hvac-condenser.jpg)' }}
        />
        <div className="absolute inset-0 bg-slate-50/80" />
      </div>

      {/* Pricing Cards */}
      <section className="container-hvac pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pricingTiers.map((tier) => (
            <PricingCard key={tier.name} tier={tier} billingPeriod={billingPeriod} />
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container-hvac py-16">
        <div className="mahogany-surface rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-bright-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <FAQItem
              question="What's included in the Custom Build?"
              answer="You pay 50% upfront, and we start building. You can request unlimited revisions. When you're 100% satisfied, you pay the remaining 50%. If you're not happy before final approval, we refund everything—no questions asked."
            />
            <FAQItem
              question="Can I switch plans later?"
              answer="Absolutely! You can upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate any differences."
            />
            <FAQItem
              question="What happens after the 30-member limit?"
              answer="Once we reach 30 active monthly members, new sign-ups will be added to a waitlist. This ensures we maintain premium quality and personal attention for all members."
            />
            <FAQItem
              question="Do I need technical skills?"
              answer="None at all. Our Live Build Wizard guides you through everything with simple questions and instant visual feedback. You describe what you want in plain English, and we handle the technical implementation."
            />
            <FAQItem
              question="What if I want to cancel?"
              answer="No long-term contracts. Cancel anytime. For monthly plans, you keep access through the end of your billing period. For Custom Build, get a full refund before final approval."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-hvac py-20">
        <div className="mahogany-surface rounded-3xl p-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-bright-white mb-6">
            Ready to Claim Your Spot?
          </h2>
          <p className="text-xl text-pure-white mb-8 max-w-2xl mx-auto">
            Join the elite professionals who build like pros
          </p>
          <Link href="/wizard" className="cta-button">
            Start Building Now
          </Link>
        </div>
      </section>
    </main>
  )
}

function PricingCard({ 
  tier, 
  billingPeriod 
}: { 
  tier: typeof pricingTiers[0]
  billingPeriod: 'monthly' | 'annual'
}) {
  const displayPrice = tier.price
  const isPeriodic = tier.period !== 'one-time'

  return (
    <div
      className={`card-mahogany relative ${
        tier.highlight ? 'ring-4 ring-blue-500 scale-105' : ''
      } hover:scale-105 transition-all`}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-bold rounded-full">
          {tier.badge}
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-4 mb-6">
        <h3 className="text-2xl font-bold text-bright-white">{tier.name}</h3>
        <div className="space-y-1">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold text-bright-white">
              ${displayPrice}
            </span>
            {isPeriodic && (
              <span className="text-gray-400 text-lg">/month</span>
            )}
          </div>
          {!isPeriodic && (
            <p className="text-sm text-gray-400">One-time payment</p>
          )}
        </div>
        <p className="text-gray-300">{tier.description}</p>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-300 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Link
        href="/wizard"
        className={`block w-full text-center px-6 py-3 rounded-lg font-bold transition-all ${
          tier.highlight
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
            : 'bg-white/10 hover:bg-white/20 text-white'
        }`}
      >
        {tier.period === 'one-time' ? 'Get Started' : 'Choose Plan'}
      </Link>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-white/10 pb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <h3 className="text-xl font-semibold text-bright-white group-hover:text-blue-400 transition-colors">
          {question}
        </h3>
        <svg
          className={`w-6 h-6 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <p className="mt-4 text-gray-300 leading-relaxed">{answer}</p>
      )}
    </div>
  )
}
