/**
 * Marketing starting points reviewed at 1440px and 390px on 2026-10-16.
 * Exact IDs are resolved against the active publishable gallery; this does not
 * alter catalog artifacts, signatures, aliases, or purchase availability.
 * Keep this module browser-safe so the sample wizard can use the same choices.
 */
export const REVIEWED_SHOWCASE_SLUGS: Readonly<Record<string, readonly string[]>> = {
  aromatherapy: [
    'aromatherapy-2026-02-16T18-54-45-056Z-049',
    'aromatherapy-MORE-2026-02-17T13-26-31-190Z-006',
  ],
  holistic_medicine: [
    'holistic_medicine-2026-02-16T19-08-26-139Z-002',
    'holistic_medicine-2026-02-16T19-12-28-938Z-003',
    'holistic_medicine-2026-02-16T19-40-45-346Z-009',
  ],
  private_practice_therapist: [
    'private_practice_therapist-2026-02-16T06-31-06-120Z-010',
    'private_practice_therapist-MORE-2026-02-17T07-50-08-089Z-030',
    'private_practice_therapist-2026-02-16T06-14-10-990Z-005',
  ],
  sound_bath: [
    'sound_bath-2026-02-16T12-44-01-156Z-022',
    'sound_bath-MORE-2026-02-17T10-55-55-742Z-023',
  ],
  wellness_coach: [
    'wellness-spec-2026-02-16T01-20-21-384Z-026',
    'wellness-spec-2026-02-16T01-22-17-887Z-012',
    'wellness-spec-2026-02-16T01-25-40-222Z-017',
  ],
}

/**
 * Marketing-only hold: decorative layers obscure content in native renders,
 * or the main CTA has inadequate contrast (the aromatherapy design is 1.77:1).
 * These issues also exist with the approved runtime enabled. Reconsider after a
 * repaired, recertified artifact has been visually reviewed. The general
 * catalog and template access checks remain unchanged.
 */
const SHOWCASE_VISUAL_HOLDS = new Set([
  'aromatherapy-2026-02-16T14-59-46-083Z-001',
  'sound_bath-2026-02-16T11-24-27-037Z-003',
  'wellness_coach-2026-06-18T0600-095',
])

export function isShowcaseEligible(slug: string): boolean {
  return !SHOWCASE_VISUAL_HOLDS.has(slug)
}

export function getReviewedShowcaseTemplates<T extends { slug: string }>(
  niche: string,
  templates: readonly T[],
): T[] {
  const bySlug = new Map(templates.map((template) => [template.slug, template]))
  return (REVIEWED_SHOWCASE_SLUGS[niche] ?? []).flatMap((slug) => {
    const template = bySlug.get(slug)
    return template && isShowcaseEligible(slug) ? [template] : []
  })
}

export function getFirstReviewedShowcaseTemplate<T extends { slug: string }>(
  niche: string,
  templates: readonly T[],
): T | null {
  return getReviewedShowcaseTemplates(niche, templates)[0] ?? null
}
