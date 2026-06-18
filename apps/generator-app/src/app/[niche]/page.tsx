import { getFeaturedTemplatesForNiche, getNiches, NICHE_META } from '@/lib/templates/niche-registry'

export const revalidate = 3600
import { LiveTemplateShowcase } from '@/components/niche/LiveTemplateShowcase'
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

/* ---------- Landing content per active niche ---------- */

type FunnelStep = { title: string; description: string }

type NicheLandingContent = {
  headline: string
  subheadline: string
  painPoints: string[]
  trustBuilders: string[]
  ctaHeadline: string
  ctaUrgency: string
  benefits: string[]
  objection: string
  proof: string
  conversionJob: { title: string; body: string }
  funnelSteps: FunnelStep[]
  sectionsIncluded: string[]
  demoBlurb: string
}

const BASE_SECTIONS = [
  'Hero and CTA',
  'About/practitioner story',
  'Services/programs',
  'Testimonials/proof',
  'FAQ',
  'Contact/booking',
  'Local SEO structure',
]

const nicheLandingContent: Record<string, NicheLandingContent> = {
  aromatherapy: {
    headline: 'Your aromatherapy practice deserves a website that smells as good as it feels.',
    subheadline:
      'Stop losing clients to generic wellness pages. DailyClarity builds aromatherapy sites that explain your blends, earn scent-based trust, and guide visitors toward consultations, workshops, or product packages.',
    painPoints: [
      'Clients searching for aromatherapy near you land on competitors with clearer, more professional sites',
      'Generic templates cannot capture your blend philosophy, safety guidance, or ritual language',
      'Booking paths are buried — visitors leave before they understand how to work with you',
    ],
    trustBuilders: [
      'Blend menus with notes, benefits, and use context built into every template',
      'Safety and dilution guidance sections that show you take client care seriously',
      'Workshop and consultation booking paths designed for scent-curious first-timers',
    ],
    ctaHeadline: 'See your aromatherapy site live in the next 10 minutes',
    ctaUrgency: 'Your next client is searching right now — preview your site before they book elsewhere.',
    benefits: [
      'Blend menus with notes, benefits, and use context',
      'Workshop and consultation booking paths',
      'Safety, dilution, and ritual guidance sections',
      'Lead capture built to guide visitors toward booking/contact',
    ],
    objection: 'Clients choose practitioners who feel credible before the first inhale.',
    proof: 'Professionally designed aromatherapy templates ready to customize.',
    conversionJob: {
      title: 'What your aromatherapy website needs to do',
      body: 'Visitors often arrive curious but cautious about essential oils. Your site should translate scent expertise into clarity — what you offer, who it helps, how to use it safely — then make the next step (consult, workshop, or package) obvious without pressure.',
    },
    funnelSteps: [
      { title: 'Explain the blends', description: 'Show how custom or signature blends are crafted, what each supports, and who they are for.' },
      { title: 'Build sensory trust', description: 'Use imagery, practitioner story, and ritual language so the experience feels intentional, not generic retail.' },
      { title: 'Show safety and use guidance', description: 'Address dilution, contraindications, and at-home use so clients feel informed and cared for.' },
      { title: 'Sell consultations, workshops, or packages', description: 'Present sessions, classes, and product tiers with clear outcomes and booking paths.' },
      { title: 'Capture email/phone leads', description: 'Offer a low-friction way to ask questions or join your list before they are ready to book.' },
    ],
    sectionsIncluded: [...BASE_SECTIONS, 'Blend menu & scent profiles', 'Safety & use guidance'],
    demoBlurb: 'Watch a Sol Botanica–style aromatherapy site get selected, filled with real business details, and previewed live.',
  },
  holistic_medicine: {
    headline: 'Your integrative practice needs a website that earns trust before the first consult.',
    subheadline:
      'Patients compare practitioners online long before they call. Build a holistic medicine site that balances clinical credibility with warmth — and routes ready visitors into consult booking.',
    painPoints: [
      'Prospective patients cannot tell what you treat or how your approach differs from conventional care',
      'Skepticism spikes when your site looks like a generic wellness blog instead of a real practice',
      'Intake and booking details are missing, so interested patients never make the leap to schedule',
    ],
    trustBuilders: [
      'Conditions and modality pages written in plain language patients actually understand',
      'Practitioner credentials presented without cold, corporate clinical tone',
      'Consult booking blocks with clear first-visit expectations and intake guidance',
    ],
    ctaHeadline: 'Build the site that converts curious visitors into consult bookings',
    ctaUrgency: 'Every day without a clear online presence, another patient chooses a competitor they found first.',
    benefits: [
      'Conditions and modality pages in plain language',
      'Consult booking and intake expectation blocks',
      'Practitioner credentials without cold clinical tone',
      'Built to guide visitors toward booking/contact',
    ],
    objection: 'Patients compare practitioners online long before they call.',
    proof: 'Holistic medicine templates tuned for integrative practices.',
    conversionJob: {
      title: 'What your holistic medicine website needs to do',
      body: 'Prospective patients need to understand how you work, what you treat, and whether you are a fit — without wading through jargon or skepticism triggers. The site should build dual trust (clinical + holistic), then route ready visitors into consult booking with intake clarity.',
    },
    funnelSteps: [
      { title: 'Build clinical and holistic trust', description: 'Credentials, philosophy, and care approach presented as one coherent story.' },
      { title: 'Explain conditions/modalities clearly', description: 'Help visitors map symptoms and goals to the services you actually provide.' },
      { title: 'Reduce skepticism', description: 'Answer common doubts with FAQs, process transparency, and realistic outcome framing.' },
      { title: 'Guide visitors toward consult booking', description: 'Prominent consult CTAs with what happens on the first visit.' },
      { title: 'Provide intake expectations', description: 'Forms, timing, what to bring, and how follow-up works — before they commit.' },
    ],
    sectionsIncluded: [...BASE_SECTIONS, 'Conditions & modalities', 'Intake expectations'],
    demoBlurb: 'See Root & Radiance–style integrative health content populate across pages in one guided build.',
  },
  private_practice_therapist: {
    headline: "Your therapy practice deserves a website as welcoming as your office.",
    subheadline:
      'Many potential clients leave sites that feel cold, vague, or overwhelming. Build a therapy website designed for emotional safety first — then specialties, session expectations, and a clear consult path.',
    painPoints: [
      'Clients cannot find you when searching for therapists in your specialty and location',
      'Your current site (or lack of one) does not convey the warmth and safety you provide in session',
      'Fees, insurance, and telehealth details are unclear — so inquiries stall before they start',
    ],
    trustBuilders: [
      'Calm, trust-forward layouts built specifically for private practice therapists',
      'Specialty and approach pages that help the right clients self-select with confidence',
      'First-session, fees, and telehealth blocks that reduce back-and-forth before booking',
    ],
    ctaHeadline: 'Give potential clients the clarity they need to reach out',
    ctaUrgency: 'Someone in your area is looking for a therapist today — make sure they find you, not a directory listing.',
    benefits: [
      'Specialty and approach pages that reduce uncertainty',
      'First-session and telehealth expectation copy',
      'Fees, insurance, and sliding-scale transparency blocks',
      'Built to guide visitors toward booking/contact',
    ],
    objection: 'Many potential clients leave sites that feel cold, vague, or overwhelming.',
    proof: 'Therapist-specific templates with calm, trust-forward layouts.',
    conversionJob: {
      title: 'What your therapy website needs to do',
      body: 'Therapy is a high-trust decision. Your site should help someone feel emotionally safe, understand your specialties, know what the first session looks like, and see practical details (fees, insurance, telehealth) — then offer a low-pressure consult request.',
    },
    funnelSteps: [
      { title: 'Create emotional safety', description: 'Warm tone, inclusive language, and visuals that feel grounding — not corporate.' },
      { title: 'Clarify specialties', description: 'Anxiety, trauma, couples, life transitions — stated plainly so the right clients self-select.' },
      { title: 'Explain first-session expectations', description: 'What happens, how long, and what preparation looks like.' },
      { title: 'Show fees/insurance/telehealth', description: 'Reduce back-and-forth by answering practical questions upfront.' },
      { title: 'Guide toward consult request', description: 'A clear, compassionate CTA for a brief call or intake form — not a hard sell.' },
    ],
    sectionsIncluded: [...BASE_SECTIONS, 'Specialties & approach', 'Fees, insurance & telehealth'],
    demoBlurb: 'Follow a Safe Harbor–style private practice site from template pick through consult-ready preview.',
  },
  sound_bath: {
    headline: 'Your sound healing practice deserves an online experience as immersive as your sessions.',
    subheadline:
      'Most visitors have never attended a sound bath. Your site must make the experience tangible, answer honest questions, and fill group sessions, privates, and event inquiries.',
    painPoints: [
      'People curious about sound healing cannot picture what happens in the room from your current online presence',
      'Schedules, pricing, and what-to-expect details are hard to find — so interest fades before booking',
      'Event and private inquiry paths are missing, leaving corporate and retreat organizers without a clear next step',
    ],
    trustBuilders: [
      'Immersive visual language that helps visitors feel the atmosphere before they arrive',
      'Contraindications and FAQ sections that show responsible, nervous-system-aware care',
      'Group session, private event, and inquiry forms structured for organizers and first-timers alike',
    ],
    ctaHeadline: 'Fill your next sound bath before you announce it',
    ctaUrgency: 'Workshops and private events book weeks ahead — get your site live while slots are still open.',
    benefits: [
      'Session types, pricing, and what-to-expect sections',
      'Contraindications and FAQ for nervous-system care',
      'Event and private booking inquiry paths',
      'Built to guide visitors toward booking/contact',
    ],
    objection: 'Sound work is felt in the room — your site still has to earn the first yes.',
    proof: 'Sound bath templates with immersive visual language.',
    conversionJob: {
      title: 'What your sound bath website needs to do',
      body: 'Most visitors have never attended a sound bath. Your site should help them picture the room, understand benefits and limits, see schedules and pricing, and inquire about group or private events — without overselling mystical claims.',
    },
    funnelSteps: [
      { title: 'Make the experience feel tangible online', description: 'Atmosphere, instruments, and session flow described so the body can imagine being there.' },
      { title: 'Show what to expect', description: 'Duration, setting, what to bring, and how people typically feel during and after.' },
      { title: 'Show contraindications/FAQ', description: 'Honest guidance for pregnancy, sound sensitivity, trauma, and other considerations.' },
      { title: 'Sell group sessions/private events', description: 'Public schedule plus corporate, retreat, and private event pathways.' },
      { title: 'Capture event inquiries', description: 'Simple forms for organizers who are not ready for instant checkout.' },
    ],
    sectionsIncluded: [...BASE_SECTIONS, 'What to expect & contraindications', 'Group & private event inquiry'],
    demoBlurb: 'Watch a Resonance Room–style sound healing site come together with session and event pages.',
  },
  wellness_coach: {
    headline: 'Your coaching business deserves a website that sells the transformation — not just the sessions.',
    subheadline:
      'Coaching is crowded online. Build a site that clarifies the outcome you deliver, showcases programs with credibility, and moves visitors toward a discovery call.',
    painPoints: [
      'Potential clients cannot tell what transformation you deliver or who you are best suited to coach',
      'Generic wellness templates make you look like every other coach on Instagram',
      'Discovery call and program booking paths are unclear — so interested leads never take the next step',
    ],
    trustBuilders: [
      'Program and package pages with clear outcomes and container details (1:1, group, intensive)',
      'Testimonial and transformation story blocks that reinforce realistic results',
      'Discovery call CTAs designed for fit-checking, not hard-sell pressure',
    ],
    ctaHeadline: 'Launch the site that turns browsers into discovery calls',
    ctaUrgency: 'Your ideal client is comparing coaches right now — show them why you are the right fit.',
    benefits: [
      'Program and package pages with clear outcomes',
      'Testimonial and transformation story blocks',
      'Discovery call booking paths',
      'Built to guide visitors toward booking/contact',
    ],
    objection: 'Coaching is crowded online — clarity and proof separate you from generic wellness pages.',
    proof: 'Wellness coaching templates built for program-led practices.',
    conversionJob: {
      title: 'What your wellness coaching website needs to do',
      body: 'Coaching buyers want to know the outcome, the container (1:1, group, intensive), and why you are credible. Your site should articulate transformation, show programs and social proof, then invite a discovery call for fit — not push a purchase on first visit.',
    },
    funnelSteps: [
      { title: 'Clarify transformation outcome', description: 'Name the before/after in language your ideal client already uses.' },
      { title: 'Show programs/packages', description: '8-week reset, VIP day, membership — structured so buyers can compare paths.' },
      { title: 'Establish credibility', description: 'Training, methodology, and who you are best suited to coach.' },
      { title: 'Display social proof/testimonials', description: 'Stories and quotes that reinforce realistic results.' },
      { title: 'Move visitors toward discovery call', description: 'A warm CTA to explore fit before committing to a package.' },
    ],
    sectionsIncluded: [...BASE_SECTIONS, 'Programs & packages', 'Discovery call CTA'],
    demoBlurb: 'See Vital Path–style coaching content flow into programs, proof, and discovery-call pages.',
  },
}

function NicheActionLinks({
  niche,
  metaLabel,
  colors,
  layout = 'hero',
}: {
  niche: string
  metaLabel: string
  colors: (typeof accentMap)[string]
  layout?: 'hero' | 'center'
}) {
  const wrap = layout === 'center' ? 'justify-center items-center' : ''
  return (
    <div className={`space-y-4 ${wrap}`}>
      <div className={`flex flex-col sm:flex-row gap-4 ${wrap}`}>
        <Link
          href={`/preview-your-business?niche=${encodeURIComponent(niche)}`}
          className="px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-cyan-200/40 text-center"
        >
          Build My Preview
        </Link>
        <Link
          href={`/demo/${niche}`}
          className={`px-8 py-4 text-lg font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border text-center ${colors.btn}`}
          style={{ boxShadow: `0 0 30px ${colors.glow}` }}
        >
          Watch {metaLabel} Demo
        </Link>
        <Link
          href="/pricing"
          className="px-8 py-4 text-lg font-bold text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all text-center"
        >
          See Pricing
        </Link>
      </div>
    </div>
  )
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
    private_practice_therapist: 'radial-gradient(ellipse 800px 600px at 20% 15%,rgba(245,158,11,0.12),transparent),radial-gradient(ellipse 600px 800px at 80% 70%,rgba(251,191,36,0.08),transparent),radial-gradient(ellipse 400px 400px at 50% 40%,rgba(252,211,77,0.05),transparent)',
    sound_bath: 'radial-gradient(ellipse 800px 600px at 20% 15%,rgba(99,102,241,0.15),transparent),radial-gradient(ellipse 600px 800px at 80% 70%,rgba(129,140,248,0.10),transparent),radial-gradient(ellipse 400px 400px at 50% 40%,rgba(165,180,252,0.06),transparent)',
    wellness_coach: 'radial-gradient(ellipse 800px 600px at 20% 15%,rgba(244,63,94,0.12),transparent),radial-gradient(ellipse 600px 800px at 80% 70%,rgba(251,113,133,0.08),transparent),radial-gradient(ellipse 400px 400px at 50% 40%,rgba(253,164,175,0.05),transparent)',
  }
  const orbColors: Record<string, string[]> = {
    aromatherapy: ['bg-emerald-400/20','bg-teal-400/15','bg-green-400/10'],
    holistic_medicine: ['bg-violet-400/20','bg-purple-400/15','bg-fuchsia-400/10'],
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
  const builderLabel: Record<string, string> = {
    aromatherapy: 'Aromatherapy Website Builder',
    holistic_medicine: 'Holistic Medicine Website Builder',
    private_practice_therapist: 'Therapist Website Builder',
    sound_bath: 'Sound Bath Website Builder',
    wellness_coach: 'Wellness Coach Website Builder',
  }
  const title = `${builderLabel[niche] || `${meta.label} Website Builder`} | DailyClarity`
  return {
    title,
    description: `${meta.description} Preview real templates with your business details — no coding required.`,
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

  const [niches, featuredRaw] = await Promise.all([
    getNiches(),
    getFeaturedTemplatesForNiche(niche),
  ])
  const nicheInfo = niches.find((n) => n.slug === niche)
  const templateCount = nicheInfo?.templateCount || 0
  const copy = nicheLandingContent[niche]
  const colors = accentMap[meta.accent] || accentMap.cyan
  const featuredTemplates = featuredRaw.map((t) => ({
    slug: t.slug,
    name: t.name,
    layoutFamily: t.layoutFamily,
    snippet: t.snippet,
  }))
  if (!copy) {
    notFound()
  }

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
              <NicheActionLinks niche={niche} metaLabel={meta.label} colors={colors} />
            </div>

            {/* Stats panel */}
            <div className="glass-panel rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-[0.3em] text-slate-400">{meta.label} Studio</span>
                <span className={`text-xs ${colors.heading}`}>Example styles</span>
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

        {/* Pain points */}
        <section className="container-hvac py-12">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Sound familiar?</h2>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {copy.painPoints.map((point) => (
              <li
                key={point}
                className={`rounded-xl px-5 py-4 border ${colors.border} bg-white/5 text-slate-300 text-sm leading-relaxed`}
              >
                {point}
              </li>
            ))}
          </ul>
        </section>

        <LiveTemplateShowcase
          niche={niche}
          nicheLabel={meta.label}
          templates={featuredTemplates}
          totalCount={templateCount}
          headingClass={colors.heading}
        />

        {/* Trust builders */}
        <section className="container-hvac py-12">
          <div className="glass-panel rounded-3xl p-8 md:p-10 max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Built for {meta.label.toLowerCase()} professionals like you</h2>
            <ul className="space-y-4">
              {copy.trustBuilders.map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-200">
                  <span className={`mt-2 w-2 h-2 shrink-0 rounded-full ${colors.badge.split(' ')[0].replace('/15', '/60')}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Conversion job */}
        <section className="container-hvac py-16">
          <div className="glass-panel rounded-3xl p-10 md:p-12 space-y-6 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white">{copy.conversionJob.title}</h2>
            <p className="text-lg text-slate-300 leading-relaxed">{copy.conversionJob.body}</p>
          </div>
        </section>

        {/* Funnel cards */}
        <section className="container-hvac py-16">
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Your {meta.label.toLowerCase()} client funnel</h2>
            <p className="text-slate-300 text-lg max-w-2xl">
              Each section of your site plays a role — built to guide visitors toward booking or contact, step by step.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {copy.funnelSteps.map((step, index) => (
              <div key={step.title} className={`card-mahogany space-y-3 ${index === copy.funnelSteps.length - 1 && copy.funnelSteps.length % 3 !== 0 ? 'lg:col-span-1' : ''}`}>
                <span className={`text-sm font-semibold ${colors.heading}`}>Step {index + 1}</span>
                <h3 className="text-xl font-bold text-white">{step.title}</h3>
                <p className="text-slate-300 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Demo CTA */}
        <section className="container-hvac py-16">
          <div className={`glass-panel rounded-3xl p-10 md:p-12 border ${colors.border} space-y-6`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border ${colors.chip}`}>
                Walkthrough
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Watch this niche build happen</h2>
            </div>
            <p className="text-lg text-slate-300 max-w-2xl">{copy.demoBlurb}</p>
            <Link
              href={`/demo/${niche}`}
              className={`inline-flex px-8 py-4 text-lg font-bold rounded-lg transition-all duration-300 text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-105 border ${colors.btn}`}
              style={{ boxShadow: `0 0 30px ${colors.glow}` }}
            >
              Watch {meta.label} Demo →
            </Link>
          </div>
        </section>

        {/* Sections included */}
        <section className="container-hvac py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Sections included in your site</h2>
              <p className="text-slate-300 text-lg">
                Templates are structured for {meta.label.toLowerCase()} practices — core pages and blocks you can customize in the preview wizard.
              </p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {copy.sectionsIncluded.map((item) => (
                <li
                  key={item}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${colors.border} bg-white/5 text-slate-200`}
                >
                  <span className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${colors.badge.split(' ')[0].replace('/15', '/60')}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section className="container-hvac py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-panel rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
              <p className="text-slate-300 mb-6">
                Enter your details, match a layout, preview live, and launch — one guided flow.
              </p>
              <Link
                href={`/preview-your-business?niche=${encodeURIComponent(niche)}`}
                className={`font-semibold ${colors.heading}`}
              >
                Start your preview →
              </Link>
            </div>
            {[
              {
                step: '01',
                title: 'Share your details',
                copy: `Tell us about your ${meta.label.toLowerCase()} practice — content fills every page automatically.`,
              },
              {
                step: '02',
                title: 'Match a layout',
                copy: 'Browse pre-populated designs tuned for your niche and pick the one that fits.',
              },
              {
                step: '03',
                title: 'Preview & launch',
                copy: 'Edit live, purchase when ready, and manage updates from your portal.',
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
                Every template is professionally designed, mobile-first, and SEO-ready —
                built to guide visitors toward booking and contact. No coding required.
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
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {copy.ctaHeadline}
            </h2>
            <p className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto">
              {copy.ctaUrgency} Add your business details once, preview {templateCount}+ layouts filled with your real info,
              and launch when you are ready. No commitment until you purchase.
            </p>
            <NicheActionLinks niche={niche} metaLabel={meta.label} colors={colors} layout="center" />
          </div>
        </section>
      </div>
    </main>
  )
}
