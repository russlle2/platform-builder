'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { track } from '@/lib/analytics'
import { getPlan, normalizePlanKey } from '@/lib/plans'

export default function ReviewProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-20" />}>
      <ReviewProfileInner />
    </Suspense>
  )
}

function ReviewProfileInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planKey = useMemo(() => normalizePlanKey(searchParams.get('plan')) || 'basic', [searchParams])
  const plan = useMemo(() => getPlan(planKey)!, [planKey])
  const [profileData, setProfileData] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    track('review_profile_view', { planKey })

    // Load profile from sessionStorage
    try {
      const saved = sessionStorage.getItem('pb_template_values')
      if (saved) {
        setProfileData(JSON.parse(saved))
      }
    } catch {
      /* ignore */
    }

    setIsLoading(false)
  }, [planKey])

  const handleConfirmCheckout = async () => {
    try {
      track('profile_review_confirmed', { planKey })
      // Store confirmation flag
      sessionStorage.setItem('pb_profile_reviewed', 'true')
      // Redirect to pricing page with plan selected
      router.push(`/pricing?plan=${planKey}&reviewed=true`)
    } catch (error) {
      console.error('Navigation error:', error)
    }
  }

  const handleEditProfile = () => {
    track('profile_review_edit', {})
    router.back()
  }

  if (isLoading) {
    return (
      <main className="min-h-screen pt-24 pb-20 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  const businessName = profileData.BUSINESS_NAME || ''
  const email = profileData.EMAIL || ''
  const phone = profileData.PHONE || profileData.PHONE_NUMBER || ''
  const address = profileData.ADDRESS || ''
  const services = profileData.SERVICES || ''
  const tagline = profileData.TAGLINE || ''

  const fields = [
    { label: 'Business Name', value: businessName, icon: '🏢' },
    { label: 'Email', value: email, icon: '📧' },
    { label: 'Phone', value: phone, icon: '📱' },
    { label: 'Address', value: address, icon: '📍' },
    { label: 'Tagline', value: tagline, icon: '✨' },
    { label: 'Services', value: services, icon: '🎯' },
  ].filter((f) => f.value)

  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="container-hvac max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-bright-white mb-4">
            Review your profile
          </h1>
          <p className="text-xl text-slate-300">
            This is how your site will be set up. Make sure everything looks right before checking out.
          </p>
        </div>

        {/* Profile Summary Card */}
        <div className="glass-panel rounded-3xl p-8 mb-8 space-y-6">
          {/* Business Name & Tagline */}
          <div className="border-b border-white/10 pb-6">
            <h2 className="text-3xl font-bold text-bright-white">{businessName}</h2>
            {tagline && (
              <p className="text-slate-300 mt-2 text-lg italic">&ldquo;{tagline}&rdquo;</p>
            )}
          </div>

          {/* Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map((field) => (
              <div key={field.label} className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                  {field.icon} {field.label}
                </p>
                <p className="text-slate-200">{field.value}</p>
              </div>
            ))}
          </div>

          {/* Services Section (full width if present) */}
          {services && fields.length > 0 && (
            <div className="border-t border-white/10 pt-6">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
                🎯 All Services
              </p>
              <p className="text-slate-200 leading-relaxed">{services}</p>
            </div>
          )}
        </div>

        {/* Plan Summary */}
        <div className="glass-panel rounded-3xl p-8 mb-8 border border-cyan-500/30">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">
                Plan Selected
              </p>
              <h3 className="text-2xl font-bold text-bright-white mt-1">{plan.name}</h3>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-cyan-400">${plan.price}</p>
              <p className="text-sm text-slate-400">per month</p>
            </div>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            {plan.features.map((feature) => (
              <li key={feature}>✓ {feature}</li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleEditProfile}
            className="px-8 py-4 text-lg font-bold text-white border-2 border-white/30 rounded-lg hover:bg-white/10 transition-all"
          >
            ← Edit profile
          </button>
          <button
            onClick={handleConfirmCheckout}
            className="cta-button text-lg font-bold px-8 py-4"
          >
            Continue to payment →
          </button>
        </div>

        {/* Info */}
        <div className="mt-12 text-center text-slate-400 text-sm">
          <p>
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 underline">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
