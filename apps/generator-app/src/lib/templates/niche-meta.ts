/* Client-safe niche metadata — shared by server registry and client components.
 * NOTE: Deactivated categories are omitted here. A niche only becomes browsable when
 * present in NICHE_META — re-add an entry to reactivate (hvac, dental, injury_law). */

export interface NicheMetaEntry {
  label: string
  description: string
  icon: string
  accent: string
}

export const NICHE_META: Record<string, NicheMetaEntry> = {
  aromatherapy: {
    label: 'Aromatherapy',
    description: 'Premium websites for aromatherapy practices, essential oil studios, and holistic scent healing businesses.',
    icon: '🌿',
    accent: 'emerald',
  },
  holistic_medicine: {
    label: 'Holistic Medicine',
    description: 'Professional websites for integrative health practitioners, naturopathic doctors, and holistic healing centers.',
    icon: '🧘',
    accent: 'violet',
  },
  private_practice_therapist: {
    label: 'Private Practice Therapist',
    description: 'Warm, trust-building websites for therapists, counselors, and mental health professionals in private practice.',
    icon: '💬',
    accent: 'amber',
  },
  sound_bath: {
    label: 'Sound Bath',
    description: 'Immersive, beautifully designed websites for sound healing practitioners and meditation studios.',
    icon: '🔔',
    accent: 'indigo',
  },
  wellness_coach: {
    label: 'Wellness Coach',
    description: 'Results-driven websites for health coaches, wellness consultants, and lifestyle transformation experts.',
    icon: '✨',
    accent: 'rose',
  },
}

export const NICHE_SLUGS = Object.keys(NICHE_META)

export function getNicheSlugs(): string[] {
  return NICHE_SLUGS
}

export type NicheOption = { slug: string; label: string; icon: string }

export function getNicheOptions(): NicheOption[] {
  return Object.entries(NICHE_META).map(([slug, meta]) => ({
    slug,
    label: meta.label,
    icon: meta.icon,
  }))
}

export function getNicheNavLinks(): { label: string; href: string }[] {
  return getNicheOptions().map((n) => ({
    label: `${n.icon} ${n.label === 'Private Practice Therapist' ? 'Therapist' : n.label}`,
    href: `/preview-your-business?niche=${encodeURIComponent(n.slug)}`,
  }))
}
