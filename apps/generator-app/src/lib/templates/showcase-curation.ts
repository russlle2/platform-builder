/**
 * Marketing starting points retained after bounded homepage review at 1440px
 * and 390px on 2026-10-17, including long business-name/CTA test copy. Inclusion
 * is not a full-site, accessibility, or interaction certification.
 * Exact IDs are resolved against the active publishable gallery; this does not
 * alter catalog artifacts, signatures, aliases, or purchase availability.
 * Keep this module browser-safe so the sample wizard can use the same choices.
 */
export const REVIEWED_SHOWCASE_SLUGS: Readonly<Record<string, readonly string[]>> = {
  // Intentionally empty: do not fill these promotional/sample slots from the
  // general catalog until a supported replacement has been reviewed.
  aromatherapy: [],
  holistic_medicine: [],
  private_practice_therapist: [
    'private_practice_therapist-2026-02-16T06-31-06-120Z-010',
  ],
  sound_bath: [],
  wellness_coach: [
    'wellness-spec-2026-02-16T01-20-21-384Z-026',
    'wellness-spec-2026-02-16T01-22-17-887Z-012',
    'wellness-spec-2026-02-16T01-25-40-222Z-017',
  ],
}

/**
 * Marketing-only holds: native contrast, overlap or ineffective exposed controls
 * observed with the approved runtime enabled. Reconsider after a repaired,
 * recertified artifact has been visually reviewed. The general
 * catalog and template access checks remain unchanged.
 */
const SHOWCASE_VISUAL_HOLDS = new Set([
  'aromatherapy-2026-02-16T14-59-46-083Z-001',
  'sound_bath-2026-02-16T11-24-27-037Z-003',
  'wellness_coach-2026-06-18T0600-095',
  // Black heading over dark art; guided-exercise buttons leave the modal hidden.
  'aromatherapy-2026-02-16T18-54-45-056Z-049',
  'aromatherapy-MORE-2026-02-17T13-26-31-190Z-006',
  // Low-contrast gradient CTA/hidden menu; inert menu; inert menu/dark footer.
  'holistic_medicine-2026-02-16T19-08-26-139Z-002',
  'holistic_medicine-2026-02-16T19-12-28-938Z-003',
  'holistic_medicine-2026-02-16T19-40-45-346Z-009',
  // Mobile menu cannot close normally; long desktop CTA overlaps navigation.
  'sound_bath-2026-02-16T12-44-01-156Z-022',
  'sound_bath-MORE-2026-02-17T10-55-55-742Z-023',
  // Long CTA overlaps nearby links; exposed mobile menu is ineffective.
  'private_practice_therapist-MORE-2026-02-17T07-50-08-089Z-030',
  'private_practice_therapist-2026-02-16T06-14-10-990Z-005',
])

export function isShowcaseEligible(slug: string): boolean {
  return !SHOWCASE_VISUAL_HOLDS.has(slug)
}

/** An intentionally empty policy still excludes unreviewed fallback choices. */
export function hasShowcaseCuration(niche: string): boolean {
  return Object.prototype.hasOwnProperty.call(REVIEWED_SHOWCASE_SLUGS, niche)
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

/** Sample choices must come from the supplied active publishable catalog. */
export function getSampleTemplates<T extends { slug: string }>(
  niche: string,
  templates: readonly T[],
): T[] {
  return hasShowcaseCuration(niche)
    ? getReviewedShowcaseTemplates(niche, templates)
    : templates.filter((template) => isShowcaseEligible(template.slug))
}
