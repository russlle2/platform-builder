import { getNiches, NICHE_META } from '@/lib/templates/niche-registry'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

/* ---------- Accent color lookup for Tailwind classes ---------- */
const accentMap: Record<string, { badge: string; heading: string; btn: string; glow: string; border: string; chip: string }> = {
  emerald: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35',
    heading: 'text-emerald-200',
    btn: 'from-emerald-500 to-green-600 border-emerald-200/40 hover:from-emerald-400 hover:to-green-500',
    glow: 'rgba(16,185,129,0.4)',
    border: 'border-emerald-400/20',
    chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30',
  },
  violet: {
    badge: 'bg-violet-500/15 text-violet-300 border-violet-400/35',
    heading: 'text-violet-200',
    btn: 'from-violet-500 to-purple-600 border-violet-200/40 hover:from-violet-400 hover:to-purple-500',
    glow: 'rgba(139,92,246,0.4)',
    border: 'border-violet-400/20',
    chip: 'bg-violet-500/10 text-violet-300 border-violet-400/30',
  },
  cyan: {
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/35',
    heading: 'text-cyan-200',
    btn: 'from-cyan-500 to-blue-600 border-cyan-200/40 hover:from-cyan-400 hover:to-blue-500',
    glow: 'rgba(34,211,238,0.4)',
    border: 'border-cyan-400/20',
    chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30',
  },
  amber: {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-400/35',
    heading: 'text-amber-200',
    btn: 'from-amber-500 to-orange-600 border-amber-200/40 hover:from-amber-400 hover:to-orange-500',
    glow: 'rgba(245,158,11,0.4)',
    border: 'border-amber-400/20',
    chip: 'bg-amber-500/10 text-amber-300 border-amber-400/30',
  },
  indigo: {
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/35',
    heading: 'text-indigo-200',
    btn: 'from-indigo-500 to-blue-600 border-indigo-200/40 hover:from-indigo-400 hover:to-blue-500',
    glow: 'rgba(99,102,241,0.4)',
    border: 'border-indigo-400/20',
    chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-400/30',
  },
  rose: {
    badge: 'bg-rose-500/15 text-rose-300 border-rose-400/35',
    heading: 'text-rose-200',
    btn: 'from-rose-500 to-pink-600 border-rose-200/40 hover:from-rose-400 hover:to-pink-500',
    glow: 'rgba(244,63,94,0.4)',
    border: 'border-rose-400/20',
    chip: 'bg-rose-500/10 text-rose-300 border-rose-400/30',
  },
}

/* ---------- Sales copy per niche ---------- */
const nicheSalesCopy: Record<string, { headline: string; subheadline: string; benefits: string[]; objection: string; proof: string }> = {
  aromatherapy: {
    headline: 'A website as refined as your blends.',
    subheadline: 'Custom-designed aromatherapy websites that attract clients, book sessions, and build memberships — without lifting a finger.',
    benefits: [
      'Membership and package booking built in',
      'Service menus with scent profiles and pricing',
      'SEO-optimized for "aromatherapy near me" searches',
      'Mobile-first design for on-the-go bookings',
    ],
    objection: 'Most aromatherapy practitioners lose clients to poor websites. Not anymore.',
    proof: '99 professionally designed templates ready to customize.',
  },
  holistic_medicine: {
    headline: 'Your healing practice deserves a professional presence.',
    subheadline: 'Beautifully crafted websites for integrative health practitioners — designed to build trust, educate patients, and fill your schedule.',
    benefits: [
      'Patient intake and booking flow integration',
      'Treatment approach and conditions pages',
      'HIPAA-conscious design patterns',
      'Trust signals and testimonial blocks built in',
    ],
    objection: 'Patients research online before booking. Make their first impression count.',
    proof: '100 unique templates for holistic medicine practices.',
  },
  hvac: {
    headline: 'Websites that turn searches into service calls.',
    subheadline: 'Conversion-focused HVAC websites built for trust, speed, and emergency bookings. Your business info fills in instantly.',
    benefits: [
      'Emergency CTA placement on every page',
      'Service area and financing pages included',
      'Review and trust badge sections built in',
      'Optimized for "HVAC repair near me" searches',
    ],
    objection: 'Homeowners choose the first HVAC company they trust online. Be that company.',
    proof: '15 battle-tested HVAC templates ready for launch.',
  },
  private_practice_therapist: {
    headline: "Your practice's online home should feel as welcoming as your office.",
    subheadline: 'Warm, professional websites for therapists and counselors — designed to reduce client anxiety and increase bookings.',
    benefits: [
      'Specialties and approach pages that build trust',
      'Secure booking integration ready',
      'Insurance and fee transparency sections',
      'Calming, professional design language',
    ],
    objection: 'Potential clients decide in seconds whether to call. Your website tips the scale.',
    proof: '100 therapist-specific templates, each unique.',
  },
  sound_bath: {
    headline: 'An online experience as immersive as your sessions.',
    subheadline: 'Stunning websites for sound healing practitioners — designed to convey the transformative nature of your work and fill group sessions.',
    benefits: [
      'Session booking and package pricing built in',
      'Event calendar and group session sections',
      'Rich visual design that mirrors the experience',
      'Contraindication and FAQ sections included',
    ],
    objection: 'Sound healing is experiential. Your website should give a taste of it.',
    proof: '100 beautifully designed sound bath templates.',
  },
  wellness_coach: {
    headline: 'The website your coaching business actually deserves.',
    subheadline: 'Results-driven websites for wellness coaches — built to convert visitors into clients with clear programs, pricing, and social proof.',
    benefits: [
      'Program and package showcase pages',
      'VIP day and intensive booking flows',
      'Testimonial and transformation sections',
      'SEO-optimized for coaching-related searches',
    ],
    objection: 'Your coaching transforms lives. Your website should communicate that instantly.',
    proof: '155 premium coaching website templates.',
  },
}

/* ---------- Static generation ---------- */

export async function generateStaticParams() {
  return Object.keys(NICHE_META).map((slug) => ({ niche: slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ niche: string }>
}): Promise<Metadata> {
  const { niche } = await params
  const meta = NICHE_META[niche]
  if (!meta) return { title: 'Templates' }
  return {
    title: `${meta.label} Website Templates | Platform Builder`,
    description: meta.description,
  }
}

/* ---------- Page component ---------- */

export default async function NicheLandingPage({
  params,
}: {
  params: Promise<{ niche: string }>
}) {
  const { niche } = await params
  const meta = NICHE_META[niche]
  if (!meta) {
    notFound()
  }

  const niches = getNiches()
  const nicheInfo = niches.find((n) => n.slug === niche)
  const templateCount = nicheInfo?.templateCount || 0
  const copy = nicheSalesCopy[niche]
  const colors = accentMap[meta.accent] || accentMap.cyan

  return (
    <main className="relative min-h-screen pt-24 pb-20 overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="floating-orb w-48 h-48 bg-white/5 top-24 left-10" />
        <div className="floating-orb w-64 h-64 bg-white/5 top-40 right-16" />
        <div className="floating-orb w-32 h-32 bg-white/5 bottom-32 left-1/3" />
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <section className="container-hvac py-20">
          <div className="hero-grid">
            <div className="space-y-8">
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] border ${colors.chip}`}>
                {meta.icon} {meta.label} Templates
              </span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-bright-white">
                {copy.headline}
                <span className={`block ${colors.heading}`}>
                  {templateCount} templates. Zero hassle.
                </span>
              </h1>
              <p className="text-lg md:text-2xl text-slate-200 max-w-2xl">
                {copy.subheadline}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={`/templates/${niche}`}
                  className={`px-8 py-4 text-lg font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border text-center ${colors.btn}`}
                  style={{ boxShadow: `0 0 30px ${colors.glow}` }}
                >
                  View Custom Templates
                </Link>
                <Link
                  href="/pricing"
                  className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all text-center"
                >
                  See Pricing
                </Link>
              </div>
            </div>

            {/* Stats panel */}
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-[0.3em] text-slate-400">{meta.label} Studio</span>
                <span className={`text-xs ${colors.heading}`}>Live templates</span>
              </div>
              <div className="space-y-4">
                {copy.benefits.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-slate-200">
                    <span className={`w-2 h-2 rounded-full ${colors.badge.split(' ')[0].replace('/15', '/60')}`} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Templates</p>
                  <p className="text-3xl font-bold text-white">{templateCount}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Avg Launch</p>
                  <p className="text-3xl font-bold text-white">48 hrs</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container-hvac py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-panel rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
              <p className="text-slate-300 mb-6">
                Browse, customize, preview, and launch — all in one streamlined flow.
              </p>
              <Link href={`/templates/${niche}`} className={`font-semibold ${colors.heading}`}>
                Browse templates →
              </Link>
            </div>
            {[
              {
                step: '01',
                title: 'Browse & pick',
                copy: `Choose from ${templateCount} unique ${meta.label.toLowerCase()} templates, each with its own design DNA.`,
              },
              {
                step: '02',
                title: 'Enter your info',
                copy: 'Fill in your business details and watch content populate across every page instantly.',
              },
              {
                step: '03',
                title: 'Preview & purchase',
                copy: 'See your fully customized site live in preview, then purchase when you love it.',
              },
            ].map((item) => (
              <div key={item.step} className="card-mahogany space-y-3">
                <span className={`text-sm ${colors.heading}`}>{item.step}</span>
                <h3 className="text-2xl font-bold text-white">{item.title}</h3>
                <p className="text-slate-200">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Objection + Proof */}
        <section className="container-hvac py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-panel rounded-2xl p-10 space-y-6">
              <div className="text-5xl">{meta.icon}</div>
              <h2 className="text-3xl font-bold text-white">{copy.objection}</h2>
              <p className="text-slate-300 text-lg">
                Every template is professionally designed, mobile-first, SEO-ready, and
                built to convert visitors into paying clients. No coding required.
              </p>
            </div>
            <div className="card-mahogany space-y-6 flex flex-col justify-center">
              <p className="text-6xl font-bold text-white">{templateCount}+</p>
              <p className="text-xl text-slate-200">{copy.proof}</p>
              <p className="text-slate-400">
                Each template features unique layout families, voice styles, and page structures.
                Pick one, personalize it in minutes, preview it live, and launch.
              </p>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section className="container-hvac py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🎨', title: 'Unique Designs', description: `Every template has a distinct layout, color palette, and content strategy tailored for ${meta.label.toLowerCase()}.` },
              { icon: '📱', title: 'Mobile-First', description: 'Responsive on every device. Your clients can find and book you from anywhere.' },
              { icon: '🔍', title: 'SEO Built In', description: 'Meta tags, structured headings, sitemaps, and robots.txt — all included out of the box.' },
              { icon: '⚡', title: 'Instant Preview', description: 'See your real content in the template before purchasing. No surprises.' },
            ].map((card) => (
              <div key={card.title} className="card-mahogany text-center space-y-4 hover:scale-105 transition-transform">
                <div className="text-4xl">{card.icon}</div>
                <h3 className="text-2xl font-bold text-bright-white">{card.title}</h3>
                <p className="text-gray-300 leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container-hvac py-20">
          <div className="glass-panel rounded-3xl p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to see your {meta.label.toLowerCase()} website?
            </h2>
            <p className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto">
              Browse {templateCount} professional templates, fill in your info,
              and preview your fully customized site in minutes. No commitment until you purchase.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href={`/templates/${niche}`}
                className={`px-8 py-4 text-lg font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border ${colors.btn}`}
                style={{ boxShadow: `0 0 30px ${colors.glow}` }}
              >
                View Custom Templates
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
