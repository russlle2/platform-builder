export const ACTIVE_NICHES = [
  'aromatherapy',
  'holistic_medicine',
  'private_practice_therapist',
  'sound_bath',
  'wellness_coach',
] as const;

export type Niche = (typeof ACTIVE_NICHES)[number];

export const LAYOUT_FAMILIES = [
  'hero-left',
  'hero-centered',
  'editorial',
  'split-screen',
  'magazine',
  'minimal',
  'bold-statement',
  'luxury-gallery',
  'nature-immersive',
  'clinical-modern',
  'community-warm',
  'conversion-focused',
] as const;

export type LayoutFamily = (typeof LAYOUT_FAMILIES)[number];
