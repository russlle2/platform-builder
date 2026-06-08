/** Curated homepage examples per niche — images in public/images/niche-examples/ */

export type NicheExampleShot = {
  slug: string
  label: string
  imagePath: string
}

export const NICHE_EXAMPLE_SHOTS: Record<string, NicheExampleShot[]> = {
  aromatherapy: [
    {
      slug: 'aromatherapy-MORE-2026-02-17T13-02-35-822Z-001',
      label: 'Earthy warm',
      imagePath: '/images/niche-examples/aromatherapy/earthy-warm.webp',
    },
    {
      slug: 'aromatherapy-2026-02-16T16-21-06-818Z-017',
      label: 'Clinical modern',
      imagePath: '/images/niche-examples/aromatherapy/clinic-modern.webp',
    },
    {
      slug: 'aromatherapy-2026-02-16T16-06-06-296Z-014',
      label: 'Bold playful',
      imagePath: '/images/niche-examples/aromatherapy/bold-playful.webp',
    },
    {
      slug: 'aromatherapy-MORE-2026-02-17T15-03-20-125Z-024',
      label: 'Poster hero',
      imagePath: '/images/niche-examples/aromatherapy/poster-hero.webp',
    },
  ],
  holistic_medicine: [
    {
      slug: 'holistic_medicine-MORE-2026-02-17T19-34-25-813Z-021',
      label: 'Earthy warm',
      imagePath: '/images/niche-examples/holistic_medicine/earthy-warm.webp',
    },
    {
      slug: 'holistic_medicine-2026-02-16T19-08-26-139Z-002',
      label: 'Clinical modern',
      imagePath: '/images/niche-examples/holistic_medicine/clinic-modern.webp',
    },
    {
      slug: 'holistic_medicine-2026-02-16T20-51-41-687Z-026',
      label: 'Bold playful',
      imagePath: '/images/niche-examples/holistic_medicine/bold-playful.webp',
    },
    {
      slug: 'holistic_medicine-MORE-2026-02-17T22-20-03-226Z-049',
      label: 'Poster hero',
      imagePath: '/images/niche-examples/holistic_medicine/poster-hero.webp',
    },
  ],
  private_practice_therapist: [
    {
      slug: 'private_practice_therapist-MORE-2026-02-17T05-48-35-698Z-003',
      label: 'Earthy warm',
      imagePath: '/images/niche-examples/private_practice_therapist/earthy-warm.webp',
    },
    {
      slug: 'private_practice_therapist-2026-02-16T08-01-48-020Z-036',
      label: 'Clinical modern',
      imagePath: '/images/niche-examples/private_practice_therapist/clinic-modern.webp',
    },
    {
      slug: 'private_practice_therapist-2026-02-16T07-35-40-983Z-029',
      label: 'Bold playful',
      imagePath: '/images/niche-examples/private_practice_therapist/bold-playful.webp',
    },
    {
      slug: 'private_practice_therapist-MORE-2026-02-17T07-17-22-854Z-023',
      label: 'Poster hero',
      imagePath: '/images/niche-examples/private_practice_therapist/poster-hero.webp',
    },
  ],
  sound_bath: [
    {
      slug: 'sound_bath-MORE-2026-02-17T11-14-10-843Z-027',
      label: 'Earthy warm',
      imagePath: '/images/niche-examples/sound_bath/earthy-warm.webp',
    },
    {
      slug: 'sound_bath-2026-02-16T14-27-57-002Z-045',
      label: 'Clinical modern',
      imagePath: '/images/niche-examples/sound_bath/clinic-modern.webp',
    },
    {
      slug: 'sound_bath-2026-02-16T11-57-55-767Z-011',
      label: 'Bold playful',
      imagePath: '/images/niche-examples/sound_bath/bold-playful.webp',
    },
    {
      slug: 'sound_bath-MORE-2026-02-17T09-32-35-495Z-004',
      label: 'Poster hero',
      imagePath: '/images/niche-examples/sound_bath/poster-hero.webp',
    },
  ],
  wellness_coach: [
    {
      slug: 'wellness_coach-MORE-2026-02-17T02-16-08-919Z-002',
      label: 'Earthy warm',
      imagePath: '/images/niche-examples/wellness_coach/earthy-warm.webp',
    },
    {
      slug: 'wellness_coach-MORE-2026-02-17T02-28-24-787Z-005',
      label: 'Clinical modern',
      imagePath: '/images/niche-examples/wellness_coach/clinic-modern.webp',
    },
    {
      slug: 'wellness_coach-2026-02-16T04-43-29-827Z-028',
      label: 'Bold playful',
      imagePath: '/images/niche-examples/wellness_coach/bold-playful.webp',
    },
    {
      slug: 'wellness_coach-MORE-2026-02-17T04-21-47-948Z-032',
      label: 'Poster hero',
      imagePath: '/images/niche-examples/wellness_coach/poster-hero.webp',
    },
  ],
}

export function getNicheExampleShots(niche: string): NicheExampleShot[] {
  return NICHE_EXAMPLE_SHOTS[niche] ?? []
}
