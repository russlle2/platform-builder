'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { track } from '@/lib/analytics'

const pricingTiers = [
  {
    name: 'Basic Services',
    price: 20,
    period: 'monthly',
    planKey: 'basic',
    description: 'Launch fast with core integrations included',
    features: [
      'Template-driven site launch',
      'Hosted subdomain included',
      'Postmark email setup',
      'Supabase storage & database',
      'Stripe payments connected',
      'Portal edits anytime',
      'Email support',
    ],
    highlight: false,
    badge: 'Starter',
  },
  {
    name: 'Growth Partner',
    price: 80,
    period: 'monthly',
    planKey: 'growth',
    description: 'Weekly optimization and promotional support',
    features: [
      'Everything in Basic Services',
      'Weekly website reviews',
      'SEO guidance and fixes',
      'Free advertising management',
      'Priority support',
    ],
    highlight: true,
    badge: 'Most Popular',
  },
]

export default function PricingClient() {
  const billingPeriod: 'monthly' | 'annual' = 'monthly'
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const slug = useMemo(() => searchParams.get('slug'), [searchParams])

  const startCheckout = async (planKey: string) => {
    try {
      track('checkout_started', { planKey })
      setCheckoutError(null)
      setIsSubmitting(planKey)
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, slug }),
      })
      if (!response.ok) {
        throw new Error('Checkout failed')
      }
      const data = await response.json()
      if (data?.url) {
        window.location.assign(data.url)
      } else {
        throw new Error('Missing checkout URL')
      }
    } catch (error) {
      setCheckoutError('Unable to start checkout. Please try again.')
    } finally {
      setIsSubmitting(null)
    }
  }

  return (
    <main className="relative min-h-screen pt-24 pb-20">
      <div className="relative z-10">
        {/* Header */}
        <section className="container-hvac py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <span className="signal-chip">Pricing</span>
              <h1 className="text-5xl md:text-6xl font-bold text-bright-white">
                Choose the plan that launches your HVAC platform
              </h1>
              <p className="text-xl text-slate-200 max-w-xl">
                Every plan includes hosting, integrations, and portal access. Upgrade anytime
                when you want ongoing optimization and ad support.
              </p>
              <div className="flex flex-wrap gap-6 text-sm text-slate-300">
                <span>⚡ 30-member cap</span>
                <span>🔐 Portal edits included</span>
                <span>📈 Weekly optimization on Growth</span>
              </div>
            </div>
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <h2 className="text-2xl font-bold text-white">What you get on day one</h2>
              <ul className="space-y-3 text-slate-200">
                <li>Hosted platform + subdomain reservation</li>
                <li>Postmark email + Supabase storage connected</li>
                <li>Stripe payments ready for online bookings</li>
                <li>Portal access to edit and publish updates</li>
              </ul>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Setup timeline</span>
                <span className="text-cyan-200">48 hours or less</span>
              </div>
            </div>
          </div>
        </section>

        <section className="container-hvac pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Customer rating</p>
              <p className="text-3xl font-bold text-white">4.9 / 5</p>
              <p className="text-sm text-slate-300">Based on early HVAC client pilots</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Avg launch time</p>
              <p className="text-3xl font-bold text-white">48 hrs</p>
              <p className="text-sm text-slate-300">From intake to hosted platform</p>
            </div>
            <div className="stat-card">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Support response</p>
              <p className="text-3xl font-bold text-white">Under 2 hrs</p>
              <p className="text-sm text-slate-300">Priority response on Growth</p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container-hvac pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pricingTiers.map((tier) => (
              <PricingCard
                key={tier.name}
                tier={tier}
                billingPeriod={billingPeriod}
                onCheckout={() => startCheckout(tier.planKey)}
                isSubmitting={isSubmitting === tier.planKey}
              />
            ))}
          </div>
          {checkoutError && (
            <p className="text-center text-red-200 mt-6">{checkoutError}</p>
          )}
          {!slug && (
            <p className="text-center text-gray-300 mt-4">
              Tip: add a preferred slug in the wizard to reserve your subdomain sooner.
            </p>
          )}
        </section>

        <section className="container-hvac pb-20">
          <div className="glass-panel rounded-3xl p-10">
            <h2 className="text-3xl font-bold text-white mb-6">Compare plans</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm text-slate-200">
              <div className="space-y-3">
                <p className="text-slate-400 uppercase tracking-[0.3em] text-xs">Included</p>
                <p>Hosted HVAC platform</p>
                <p>Postmark email + Supabase</p>
                <p>Stripe payments connected</p>
                <p>Portal edits anytime</p>
                <p>Template switching</p>
                <p>Support response</p>
              </div>
              <div className="space-y-3">
                <p className="text-cyan-200 uppercase tracking-[0.3em] text-xs">Basic</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Standard</p>
              </div>
              <div className="space-y-3">
                <p className="text-amber-200 uppercase tracking-[0.3em] text-xs">Growth</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Included</p>
                <p>Priority + weekly reviews</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container-hvac pb-20">
          <div className="glass-panel rounded-3xl p-10">
            <h2 className="text-3xl font-bold text-white mb-6">What HVAC owners say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: 'Booked five new service calls in week one after launch.',
                  name: 'Jordan M.',
                  company: 'Phoenix HVAC Group',
                },
                {
                  quote: 'The platform made our ads and booking flow feel premium overnight.',
                  name: 'Renee K.',
                  company: 'Blue Ridge Mechanical',
                },
                {
                  quote: 'Finally a site that matches our brand and converts on mobile.',
                  name: 'Carlos D.',
                  company: 'Summit Air Pros',
                },
              ].map((item) => (
                <div key={item.name} className="card-mahogany space-y-4">
                  <p className="text-slate-200">&ldquo;{item.quote}&rdquo;</p>
                  <div>
                    <p className="text-white font-semibold">{item.name}</p>
                    <p className="text-sm text-slate-400">{item.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container-hvac py-16">
          <div className="glass-panel rounded-3xl p-12">
            <h2 className="text-4xl font-bold text-bright-white mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <FAQItem
                question="What's included in Basic Services?"
                answer="We launch your site on a hosted subdomain and connect Postmark for email, Supabase for storage, and Stripe for payments. You can edit anytime through your portal."
              />
              <FAQItem
                question="How fast can I launch?"
                answer="Most builds go live within 48 hours once your intake is complete and your subscription is active."
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
                answer="None at all. Our guided intake collects your details, and we handle setup, integrations, hosting, and launch."
              />
              <FAQItem
                question="What if I want to cancel?"
                answer="No long-term contracts. Cancel anytime and keep access through the end of your billing period."
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container-hvac py-20">
          <div className="glass-panel rounded-3xl p-12 text-center">
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
      </div>
    </main>
  )
}

function PricingCard({
  tier,
  billingPeriod,
  onCheckout,
  isSubmitting,
}: {
  tier: (typeof pricingTiers)[0]
  billingPeriod: 'monthly' | 'annual'
  onCheckout: () => void
  isSubmitting: boolean
}) {
  const displayPrice = tier.price
  const isPeriodic = tier.period !== 'one-time'

  return (
    <div
      className={`card-mahogany relative ${
        tier.highlight ? 'ring-2 ring-cyan-400/80 scale-105' : ''
      } hover:scale-105 transition-all`}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-500 text-slate-900 text-sm font-bold rounded-full">
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
            {isPeriodic && <span className="text-gray-400 text-lg">/month</span>}
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
      <button
        type="button"
        onClick={onCheckout}
        disabled={isSubmitting}
        className={`block w-full text-center px-6 py-3 rounded-lg font-bold transition-all ${
          tier.highlight
            ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-900 shadow-lg hover:shadow-xl'
            : 'bg-white/10 hover:bg-white/20 text-white'
        } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isSubmitting ? 'Redirecting…' : 'Choose Plan'}
      </button>
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
      {isOpen && <p className="mt-4 text-gray-300 leading-relaxed">{answer}</p>}
    </div>
  )
}
