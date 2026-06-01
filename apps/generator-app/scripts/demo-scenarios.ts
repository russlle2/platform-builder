export interface DemoScenario {
  id: string
  outputName: string
  niche: string
  vibes: string[]
  writingTone: string
  businessName: string
  ownerName: string
  email: string
  phone: string
  address: string
  tagline: string
  services: string
  description: string
  sampleSlug: string
}

export const SCENARIOS: DemoScenario[] = [
  {
    id: 'platform-builder',
    outputName: 'platform-builder-walkthrough',
    niche: 'wellness_coach',
    vibes: ['Warm', 'Clean'],
    writingTone: 'Conversational',
    businessName: 'Clarity Wellness Studio',
    ownerName: 'Christopher Lake',
    email: 'hello@claritywellness.com',
    phone: '(904) 555-0101',
    address: 'Jacksonville, FL',
    tagline: 'A calmer way to launch your wellness brand online.',
    services: 'Website Preview, Live Editing, Launch Support, Client Portal',
    description:
      'A guided website launch system that helps service businesses preview, customize, and launch a client-ready website.',
    sampleSlug: 'clarity-wellness-studio',
  },
  {
    id: 'aromatherapy',
    outputName: 'aromatherapy-walkthrough',
    niche: 'aromatherapy',
    vibes: ['Earthy', 'Warm'],
    writingTone: 'Conversational',
    businessName: 'Sol Botanica Aromatherapy',
    ownerName: 'Maya Rose',
    email: 'hello@solbotanica.com',
    phone: '(904) 555-0184',
    address: 'Jacksonville, FL',
    tagline: 'Custom botanical blends for calm, clarity, and ritual.',
    services: 'Custom Aromatherapy Blends, Scent Consultations, Ritual Sprays, Private Workshops',
    description:
      'A boutique aromatherapy studio helping clients turn scent into a daily wellness ritual.',
    sampleSlug: 'sol-botanica',
  },
  {
    id: 'holistic-medicine',
    outputName: 'holistic-medicine-walkthrough',
    niche: 'holistic_medicine',
    vibes: ['Clean', 'Earthy'],
    writingTone: 'Professional',
    businessName: 'Root & Radiance Integrative Health',
    ownerName: 'Dr. Elena Hart',
    email: 'care@rootradiancehealth.com',
    phone: '(904) 555-0127',
    address: 'Jacksonville Beach, FL',
    tagline: 'Whole-person care for energy, digestion, hormones, and resilience.',
    services: 'Integrative Consultations, Herbal Support, Lab Review, Wellness Plans',
    description:
      'An integrative health practice blending modern insight with natural healing systems.',
    sampleSlug: 'root-radiance-health',
  },
  {
    id: 'private-practice-therapist',
    outputName: 'private-practice-therapist-walkthrough',
    niche: 'private_practice_therapist',
    vibes: ['Warm', 'Clean'],
    writingTone: 'Conversational',
    businessName: 'Safe Harbor Therapy Collective',
    ownerName: 'Jordan Ellis, LMHC',
    email: 'intake@safeharbortherapy.com',
    phone: '(904) 555-0149',
    address: 'Jacksonville, FL + Telehealth',
    tagline: 'Grounded therapy for anxiety, trauma, relationships, and life transitions.',
    services: 'Individual Therapy, Trauma Support, Anxiety Counseling, Couples Sessions',
    description:
      'A warm private practice helping clients feel safe, understood, and supported.',
    sampleSlug: 'safe-harbor-therapy',
  },
  {
    id: 'sound-bath',
    outputName: 'sound-bath-walkthrough',
    niche: 'sound_bath',
    vibes: ['Earthy', 'Luxurious'],
    writingTone: 'Storytelling',
    businessName: 'Resonance Room Sound Healing',
    ownerName: 'Sol Lake',
    email: 'hello@resonanceroom.com',
    phone: '(904) 555-0196',
    address: 'Jacksonville Beach, FL',
    tagline: 'Immersive sound baths for nervous system reset and deep inner stillness.',
    services: 'Group Sound Baths, Private Sessions, Corporate Wellness, Guided Meditation',
    description:
      'A sound healing studio using crystal bowls, guided meditation, and grounding practices.',
    sampleSlug: 'resonance-room',
  },
  {
    id: 'wellness-coach',
    outputName: 'wellness-coach-walkthrough',
    niche: 'wellness_coach',
    vibes: ['Warm', 'Earthy'],
    writingTone: 'Conversational',
    businessName: 'Vital Path Wellness Coaching',
    ownerName: 'Alina Brooks',
    email: 'hello@vitalpathcoaching.com',
    phone: '(904) 555-0173',
    address: 'Online + Jacksonville, FL',
    tagline: 'Build habits, energy, and self-trust one grounded step at a time.',
    services: '1:1 Coaching, 8-Week Reset, Habit Strategy, Nervous System Support',
    description:
      'A coaching practice helping clients create sustainable routines and real-life wellness changes.',
    sampleSlug: 'vital-path-coaching',
  },
]
