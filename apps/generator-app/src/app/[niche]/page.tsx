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

/* ---------- Niche background visuals ---------- */

/* High-quality Unsplash background images per niche — royalty-free */
const NICHE_BG_IMAGES: Record<string, { url: string; credit: string }> = {
  aromatherapy: {
    url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1920&q=80',
    credit: 'Unsplash — essential oil bottles and herbs',
  },
  holistic_medicine: {
    url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1920&q=80',
    credit: 'Unsplash — meditation at sunrise',
  },
  hvac: {
    url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1920&q=80',
    credit: 'Unsplash — industrial building ventilation',
  },
  private_practice_therapist: {
    url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1920&q=80',
    credit: 'Unsplash — serene nature path',
  },
  sound_bath: {
    url: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?auto=format&fit=crop&w=1920&q=80',
    credit: 'Unsplash — tibetan singing bowls',
  },
  wellness_coach: {
    url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1920&q=80',
    credit: 'Unsplash — yoga and wellness',
  },
}

function NicheBackground({ niche }: { niche: string }) {
  const gradients: Record<string, string> = {
    aromatherapy: 'radial-gradient(ellipse 800px 600px at 20% 15%,rgba(16,185,129,0.15),transparent),radial-gradient(ellipse 600px 800px at 80% 70%,rgba(20,184,166,0.12),transparent),radial-gradient(ellipse 400px 400px at 50% 40%,rgba(52,211,153,0.06),transparent)',
    holistic_medicine: 'radial-gradient(ellipse 800px 600px at 20% 15%,rgba(139,92,246,0.15),transparent),radial-gradient(ellipse 600px 800px at 80% 70%,rgba(167,139,250,0.10),transparent),radial-gradient(ellipse 400px 400px at 50% 40%,rgba(192,132,252,0.06),transparent)',
    hvac: 'radial-gradient(ellipse 800px 600px at 20% 15%,rgba(34,211,238,0.15),transparent),radial-gradient(ellipse 600px 800px at 80% 70%,rgba(56,189,248,0.12),transparent),radial-gradient(ellipse 400px 400px at 50% 40%,rgba(14,165,233,0.06),transparent)',
    private_practice_therapist: 'radial-gradient(ellipse 800px 600px at 20% 15%,rgba(245,158,11,0.12),transparent),radial-gradient(ellipse 600px 800px at 80% 70%,rgba(251,191,36,0.08),transparent),radial-gradient(ellipse 400px 400px at 50% 40%,rgba(252,211,77,0.05),transparent)',
    sound_bath: 'radial-gradient(ellipse 800px 600px at 20% 15%,rgba(99,102,241,0.15),transparent),radial-gradient(ellipse 600px 800px at 80% 70%,rgba(129,140,248,0.10),transparent),radial-gradient(ellipse 400px 400px at 50% 40%,rgba(165,180,252,0.06),transparent)',
    wellness_coach: 'radial-gradient(ellipse 800px 600px at 20% 15%,rgba(244,63,94,0.12),transparent),radial-gradient(ellipse 600px 800px at 80% 70%,rgba(251,113,133,0.08),transparent),radial-gradient(ellipse 400px 400px at 50% 40%,rgba(253,164,175,0.05),transparent)',
  }
  const orbColors: Record<string, string[]> = {
    aromatherapy: ['bg-emerald-400/20','bg-teal-400/15','bg-green-400/10'],
    holistic_medicine: ['bg-violet-400/20','bg-purple-400/15','bg-fuchsia-400/10'],
    hvac: ['bg-cyan-400/20','bg-sky-400/15','bg-blue-400/10'],
    private_practice_therapist: ['bg-amber-400/15','bg-yellow-400/10','bg-orange-300/8'],
    sound_bath: ['bg-indigo-400/20','bg-blue-400/15','bg-violet-400/10'],
    wellness_coach: ['bg-rose-400/15','bg-pink-400/10','bg-red-300/8'],
  }
  const gradient = gradients[niche]
  const orbs = orbColors[niche]
  const bgImage = NICHE_BG_IMAGES[niche]
  if (!gradient || !orbs) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Real photographic background — subtle overlay */}
      {bgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${bgImage.url})` }}
          />
          <div className="absolute inset-0 bg-slate-900/85" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-transparent to-slate-900/90" />
        </>
      )}
      <div className="absolute inset-0" style={{ background: gradient }} />
      <div className={`floating-orb w-[320px] h-[320px] ${orbs[0]} top-20 left-[8%]`} />
      <div className={`floating-orb w-[450px] h-[450px] ${orbs[1]} top-[35%] right-[10%]`} />
      <div className={`floating-orb w-[250px] h-[250px] ${orbs[2]} bottom-[20%] left-[30%]`} />
      <NicheSymbols niche={niche} />
    </div>
  )
}

function NicheSymbols({ niche }: { niche: string }) {
  switch (niche) {
    case 'aromatherapy': return (
      <>
        {/* Essential oil bottle silhouette */}
        <svg className="absolute -top-10 -right-20 w-[500px] h-[500px] text-emerald-400/[0.07] rotate-12" viewBox="0 0 200 200" fill="currentColor">
          <rect x="88" y="10" width="24" height="16" rx="3" opacity="0.5"/>
          <rect x="92" y="26" width="16" height="8" rx="1" opacity="0.4"/>
          <path d="M82 34 Q82 34 78 55 Q72 85 72 120 Q72 175 100 180 Q128 175 128 120 Q128 85 122 55 Q118 34 118 34Z" opacity="0.8"/>
          <ellipse cx="100" cy="120" rx="20" ry="30" opacity="0.15"/>
        </svg>
        {/* Botanical leaf branch */}
        <svg className="absolute bottom-[15%] -left-10 w-[350px] h-[350px] text-teal-400/[0.06] -rotate-12" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M100 180 Q98 140 95 100 Q92 60 100 20" strokeWidth="2" fill="none"/>
          <path d="M95 140 Q60 130 45 110" fill="none"/><ellipse cx="48" cy="112" rx="22" ry="12" transform="rotate(-25 48 112)" fill="currentColor" opacity="0.3"/>
          <path d="M96 110 Q65 95 50 75" fill="none"/><ellipse cx="55" cy="80" rx="20" ry="11" transform="rotate(-30 55 80)" fill="currentColor" opacity="0.25"/>
          <path d="M97 80 Q70 68 60 48" fill="none"/><ellipse cx="63" cy="52" rx="18" ry="10" transform="rotate(-35 63 52)" fill="currentColor" opacity="0.2"/>
          <path d="M98 130 Q130 118 148 100" fill="none"/><ellipse cx="145" cy="103" rx="22" ry="12" transform="rotate(25 145 103)" fill="currentColor" opacity="0.3"/>
          <path d="M97 95 Q128 82 145 62" fill="none"/><ellipse cx="140" cy="66" rx="20" ry="11" transform="rotate(30 140 66)" fill="currentColor" opacity="0.25"/>
        </svg>
        {/* Diffuser mist waves */}
        <svg className="absolute top-[45%] right-[5%] w-[200px] h-[200px] text-emerald-300/[0.05]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M80 180 Q80 180 80 160 Q80 140 90 130 Q100 120 100 100 Q100 80 90 70 Q80 60 80 40"/>
          <path d="M100 180 Q100 180 100 160 Q100 140 110 130 Q120 120 120 100 Q120 80 110 70 Q100 60 100 40"/>
          <path d="M120 180 Q120 180 120 160 Q120 140 130 130 Q140 120 140 100 Q140 80 130 70 Q120 60 120 40"/>
        </svg>
        {/* Small lavender sprigs */}
        <svg className="absolute bottom-[40%] left-[15%] w-[120px] h-[120px] text-emerald-400/[0.04]" viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="15" r="5"/><circle cx="42" cy="25" r="4"/><circle cx="58" cy="25" r="4"/>
          <circle cx="45" cy="35" r="3.5"/><circle cx="55" cy="35" r="3.5"/>
          <line x1="50" y1="20" x2="50" y2="90" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </>
    )
    case 'holistic_medicine': return (
      <>
        {/* Lotus flower — multi-petal */}
        <svg className="absolute -top-5 -right-16 w-[500px] h-[500px] text-violet-400/[0.06]" viewBox="0 0 200 200" fill="currentColor">
          <path d="M100 175 Q70 125 82 72 Q92 35 100 20 Q108 35 118 72 Q130 125 100 175Z"/>
          <path d="M100 175 Q50 135 38 92 Q30 60 52 42 Q72 68 100 175Z" opacity="0.7"/>
          <path d="M100 175 Q150 135 162 92 Q170 60 148 42 Q128 68 100 175Z" opacity="0.7"/>
          <path d="M100 175 Q30 148 18 108 Q8 78 32 62 Q58 88 100 175Z" opacity="0.4"/>
          <path d="M100 175 Q170 148 182 108 Q192 78 168 62 Q142 88 100 175Z" opacity="0.4"/>
        </svg>
        {/* Caduceus-inspired staff */}
        <svg className="absolute bottom-[10%] -left-8 w-[300px] h-[300px] text-purple-400/[0.05]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="100" y1="20" x2="100" y2="180" strokeWidth="3"/>
          <circle cx="100" cy="20" r="8" fill="currentColor" opacity="0.3"/>
          <path d="M100 40 Q140 55 140 75 Q140 95 100 100 Q60 105 60 125 Q60 145 100 150"/>
          <path d="M100 40 Q60 55 60 75 Q60 95 100 100 Q140 105 140 125 Q140 145 100 150"/>
          <path d="M85 155 L115 155" strokeWidth="2"/>
          <path d="M80 165 L120 165" strokeWidth="2"/>
        </svg>
        {/* Healing energy ripples */}
        <svg className="absolute top-[40%] right-[3%] w-[250px] h-[250px] text-violet-300/[0.04]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="100" cy="100" r="15"/><circle cx="100" cy="100" r="32"/><circle cx="100" cy="100" r="50"/><circle cx="100" cy="100" r="68"/><circle cx="100" cy="100" r="86"/>
          {/* Chi / energy dots at cardinal points */}
          <circle cx="100" cy="32" r="3" fill="currentColor" opacity="0.3"/>
          <circle cx="168" cy="100" r="3" fill="currentColor" opacity="0.3"/>
          <circle cx="100" cy="168" r="3" fill="currentColor" opacity="0.3"/>
          <circle cx="32" cy="100" r="3" fill="currentColor" opacity="0.3"/>
        </svg>
        {/* Yin-yang small accent */}
        <svg className="absolute bottom-[35%] left-[12%] w-[100px] h-[100px] text-violet-400/[0.04]" viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2"/>
          <path d="M50 5 A45 45 0 0 1 50 95 A22.5 22.5 0 0 1 50 50 A22.5 22.5 0 0 0 50 5Z" opacity="0.5"/>
          <circle cx="50" cy="27.5" r="5" opacity="0.3"/><circle cx="50" cy="72.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </>
    )
    case 'hvac': return (
      <>
        {/* Large snowflake — detailed */}
        <svg className="absolute -top-8 -right-12 w-[450px] h-[450px] text-cyan-400/[0.06]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="100" y1="15" x2="100" y2="185"/><line x1="26" y1="57" x2="174" y2="143"/><line x1="26" y1="143" x2="174" y2="57"/>
          <line x1="100" y1="40" x2="82" y2="55"/><line x1="100" y1="40" x2="118" y2="55"/>
          <line x1="100" y1="160" x2="82" y2="145"/><line x1="100" y1="160" x2="118" y2="145"/>
          <line x1="50" y1="71" x2="48" y2="92"/><line x1="50" y1="71" x2="68" y2="62"/>
          <line x1="150" y1="129" x2="152" y2="108"/><line x1="150" y1="129" x2="132" y2="138"/>
          {/* Crystal details */}
          <line x1="50" y1="129" x2="48" y2="108"/><line x1="50" y1="129" x2="68" y2="138"/>
          <line x1="150" y1="71" x2="152" y2="92"/><line x1="150" y1="71" x2="132" y2="62"/>
        </svg>
        {/* Gear / compressor icon */}
        <svg className="absolute bottom-[12%] -left-12 w-[350px] h-[350px] text-cyan-400/[0.05]" viewBox="0 0 200 200" fill="currentColor">
          <circle cx="100" cy="100" r="35" fill="none" stroke="currentColor" strokeWidth="3"/>
          <circle cx="100" cy="100" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
          {/* Gear teeth */}
          <rect x="94" y="55" width="12" height="18" rx="2" opacity="0.5"/>
          <rect x="94" y="127" width="12" height="18" rx="2" opacity="0.5"/>
          <rect x="55" y="94" width="18" height="12" rx="2" opacity="0.5"/>
          <rect x="127" y="94" width="18" height="12" rx="2" opacity="0.5"/>
          <rect x="67" y="67" width="14" height="14" rx="2" transform="rotate(45 74 74)" opacity="0.4"/>
          <rect x="119" y="67" width="14" height="14" rx="2" transform="rotate(45 126 74)" opacity="0.4"/>
          <rect x="67" y="119" width="14" height="14" rx="2" transform="rotate(45 74 126)" opacity="0.4"/>
          <rect x="119" y="119" width="14" height="14" rx="2" transform="rotate(45 126 126)" opacity="0.4"/>
        </svg>
        {/* Thermometer */}
        <svg className="absolute top-[50%] right-[8%] w-[140px] h-[200px] text-sky-300/[0.05]" viewBox="0 0 80 200" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="28" y="10" width="24" height="140" rx="12"/>
          <circle cx="40" cy="165" r="25"/>
          <circle cx="40" cy="165" r="14" fill="currentColor" opacity="0.3"/>
          <rect x="36" y="60" width="8" height="95" rx="4" fill="currentColor" opacity="0.3"/>
          {/* Tick marks */}
          <line x1="52" y1="40" x2="62" y2="40" strokeWidth="1.5"/><line x1="52" y1="60" x2="60" y2="60" strokeWidth="1"/>
          <line x1="52" y1="80" x2="62" y2="80" strokeWidth="1.5"/><line x1="52" y1="100" x2="60" y2="100" strokeWidth="1"/>
          <line x1="52" y1="120" x2="62" y2="120" strokeWidth="1.5"/>
        </svg>
        {/* Air flow lines */}
        <svg className="absolute bottom-[30%] left-[20%] w-[200px] h-[60px] text-cyan-300/[0.04]" viewBox="0 0 200 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M0 30 Q30 10 60 30 Q90 50 120 30 Q150 10 180 30"/>
          <path d="M0 15 Q30 0 60 15 Q90 30 120 15 Q150 0 180 15" opacity="0.5"/>
          <path d="M0 45 Q30 25 60 45 Q90 60 120 45 Q150 25 180 45" opacity="0.5"/>
        </svg>
      </>
    )
    case 'private_practice_therapist': return (
      <>
        {/* Warm hand / embrace outline */}
        <svg className="absolute -top-6 -right-16 w-[420px] h-[420px] text-amber-400/[0.05]" viewBox="0 0 200 200" fill="currentColor">
          <path d="M100 175 C100 175 25 125 25 70 C25 30 55 15 100 55 C145 15 175 30 175 70 C175 125 100 175 100 175Z"/>
        </svg>
        {/* Two heads / connection silhouette */}
        <svg className="absolute bottom-[8%] -left-12 w-[380px] h-[380px] text-amber-300/[0.04]" viewBox="0 0 200 200" fill="currentColor" opacity="0.6">
          <circle cx="70" cy="65" r="28"/><path d="M42 93 Q42 130 55 150 L85 150 Q98 130 98 93Z"/>
          <circle cx="130" cy="65" r="28"/><path d="M102 93 Q102 130 115 150 L145 150 Q158 130 158 93Z"/>
          {/* Connection bridge */}
          <ellipse cx="100" cy="110" rx="30" ry="8" opacity="0.3"/>
        </svg>
        {/* Peaceful ripple circles */}
        <svg className="absolute top-[45%] right-[5%] w-[220px] h-[220px] text-amber-300/[0.04]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="100" cy="100" r="20"/><circle cx="100" cy="100" r="45"/><circle cx="100" cy="100" r="70"/><circle cx="100" cy="100" r="90"/>
        </svg>
        {/* Small butterfly — transformation symbol */}
        <svg className="absolute bottom-[45%] left-[10%] w-[120px] h-[120px] text-amber-400/[0.04]" viewBox="0 0 100 100" fill="currentColor">
          <path d="M50 50 Q25 20 15 35 Q5 50 20 60 Q35 70 50 50Z" opacity="0.6"/>
          <path d="M50 50 Q75 20 85 35 Q95 50 80 60 Q65 70 50 50Z" opacity="0.6"/>
          <path d="M50 50 Q30 65 25 80 Q20 90 40 85 Q50 80 50 50Z" opacity="0.4"/>
          <path d="M50 50 Q70 65 75 80 Q80 90 60 85 Q50 80 50 50Z" opacity="0.4"/>
          <ellipse cx="50" cy="55" rx="2" ry="15" opacity="0.3"/>
        </svg>
      </>
    )
    case 'sound_bath': return (
      <>
        {/* Concentric sound waves — detailed */}
        <svg className="absolute -top-12 -right-16 w-[500px] h-[500px] text-indigo-400/[0.06]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="100" cy="100" r="12"/><circle cx="100" cy="100" r="28"/><circle cx="100" cy="100" r="44"/><circle cx="100" cy="100" r="62"/><circle cx="100" cy="100" r="80"/><circle cx="100" cy="100" r="95"/>
          {/* Vibration dots */}
          <circle cx="100" cy="12" r="3" fill="currentColor" opacity="0.3"/>
          <circle cx="100" cy="188" r="3" fill="currentColor" opacity="0.3"/>
          <circle cx="12" cy="100" r="3" fill="currentColor" opacity="0.3"/>
          <circle cx="188" cy="100" r="3" fill="currentColor" opacity="0.3"/>
        </svg>
        {/* Singing bowl — detailed cross-section */}
        <svg className="absolute bottom-[10%] -left-8 w-[340px] h-[340px] text-indigo-400/[0.05]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M25 85 Q25 170 100 170 Q175 170 175 85"/><ellipse cx="100" cy="85" rx="75" ry="18"/>
          {/* Mallet */}
          <line x1="100" y1="67" x2="100" y2="35" strokeWidth="3"/><circle cx="100" cy="30" r="10" fill="currentColor" opacity="0.3"/>
          {/* Vibration arcs from bowl rim */}
          <path d="M30 75 Q25 60 30 45" opacity="0.3"/><path d="M20 75 Q12 55 20 35" opacity="0.2"/>
          <path d="M170 75 Q175 60 170 45" opacity="0.3"/><path d="M180 75 Q188 55 180 35" opacity="0.2"/>
        </svg>
        {/* Sanskrit Om symbol — simplified */}
        <svg className="absolute top-[35%] right-[6%] w-[150px] h-[150px] text-indigo-300/[0.04]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M25 70 Q25 85 40 85 Q55 85 55 70 Q55 55 40 50 Q25 45 25 30 Q25 15 45 15 Q65 15 65 35 Q65 55 50 60 Q80 55 80 35 Q80 20 70 15"/>
          <circle cx="75" cy="10" r="3" fill="currentColor" opacity="0.5"/>
          <path d="M60 75 Q55 80 60 85 Q65 80 60 75" fill="currentColor" opacity="0.4"/>
        </svg>
        {/* Sound wave line — full width */}
        <svg className="absolute bottom-[30%] left-0 w-full h-[80px] text-indigo-300/[0.04]" viewBox="0 0 800 100" fill="none" stroke="currentColor" strokeWidth="2" preserveAspectRatio="none">
          <path d="M0 50 Q50 20 100 50 Q150 80 200 50 Q250 20 300 50 Q350 80 400 50 Q450 20 500 50 Q550 80 600 50 Q650 20 700 50 Q750 80 800 50"/>
        </svg>
        {/* Tuning fork accent */}
        <svg className="absolute bottom-[55%] left-[8%] w-[80px] h-[140px] text-indigo-400/[0.03]" viewBox="0 0 60 120" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 10 L20 65 Q20 80 30 80 Q40 80 40 65 L40 10"/><line x1="30" y1="80" x2="30" y2="115"/>
        </svg>
      </>
    )
    case 'wellness_coach': return (
      <>
        {/* Upward transformation arrows */}
        <svg className="absolute -top-10 -right-14 w-[420px] h-[420px] text-rose-400/[0.06]" viewBox="0 0 200 200" fill="currentColor">
          <polygon points="100,10 118,72 185,78 132,118 150,185 100,148 50,185 68,118 15,78 82,72"/>
        </svg>
        {/* Mountain peak — growth symbol */}
        <svg className="absolute bottom-[12%] -left-8 w-[350px] h-[350px] text-rose-400/[0.05]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 170 L70 50 L90 90 L100 70 L130 170Z" fill="currentColor" opacity="0.15"/>
          <path d="M60 170 L120 30 L140 80 L155 55 L190 170Z" fill="currentColor" opacity="0.1"/>
          {/* Flag on peak */}
          <line x1="120" y1="30" x2="120" y2="10"/><path d="M120 10 L140 17 L120 24" fill="currentColor" opacity="0.3"/>
        </svg>
        {/* Heartbeat / vitality line */}
        <svg className="absolute top-[55%] left-0 w-full h-[60px] text-rose-300/[0.04]" viewBox="0 0 800 100" fill="none" stroke="currentColor" strokeWidth="2" preserveAspectRatio="none">
          <path d="M0 50 L200 50 L250 50 L270 20 L290 80 L310 30 L330 70 L350 50 L600 50 L650 50 L670 15 L690 85 L710 25 L730 75 L750 50 L800 50"/>
        </svg>
        {/* Sunrise / horizon — new beginnings */}
        <svg className="absolute top-[30%] right-[5%] w-[200px] h-[120px] text-rose-400/[0.04]" viewBox="0 0 200 120" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="10" y1="100" x2="190" y2="100"/>
          <path d="M100 100 A60 60 0 0 1 40 100" fill="currentColor" opacity="0.15"/>
          <path d="M100 100 A60 60 0 0 0 160 100" fill="currentColor" opacity="0.15"/>
          {/* Sun rays */}
          <line x1="100" y1="40" x2="100" y2="20"/><line x1="60" y1="55" x2="48" y2="42"/>
          <line x1="140" y1="55" x2="152" y2="42"/><line x1="45" y1="80" x2="28" y2="75"/>
          <line x1="155" y1="80" x2="172" y2="75"/>
        </svg>
        {/* Person in yoga pose — small accent */}
        <svg className="absolute bottom-[45%] left-[12%] w-[100px] h-[100px] text-rose-300/[0.03]" viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="18" r="8"/>{/* head */}
          <path d="M50 26 L50 60" stroke="currentColor" strokeWidth="3" fill="none"/>{/* body */}
          <path d="M50 36 L25 50 L20 45" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>{/* left arm up */}
          <path d="M50 36 L75 50 L80 45" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>{/* right arm up */}
          <path d="M50 60 L30 85" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>{/* legs */}
          <path d="M50 60 L70 85" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </svg>
      </>
    )
    default: return null
  }
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
      <NicheBackground niche={niche} />

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
                  href="/preview-your-business"
                  className="px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40 text-center"
                >
                  Preview Your Business
                </Link>
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
                href="/preview-your-business"
                className="px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40"
              >
                Preview Your Business
              </Link>
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
