/**
 * Demo walkthrough MP4 paths (public/demo-videos/).
 * See apps/generator-app/scripts/README-demo-videos.md
 */

export const PLATFORM_DEMO_VIDEO = '/demo-videos/platform-builder-walkthrough.mp4'

/** Niche slug → walkthrough MP4 */
export const NICHE_DEMO_VIDEO: Record<string, string> = {
  aromatherapy: '/demo-videos/aromatherapy-walkthrough.mp4',
  holistic_medicine: '/demo-videos/holistic-medicine-walkthrough.mp4',
  private_practice_therapist: '/demo-videos/private-practice-therapist-walkthrough.mp4',
  sound_bath: '/demo-videos/sound-bath-walkthrough.mp4',
  wellness_coach: '/demo-videos/wellness-coach-walkthrough.mp4',
}

export const ACTIVE_DEMO_NICHES = Object.keys(NICHE_DEMO_VIDEO)

export type DemoHubItem = {
  id: string
  title: string
  description: string
  href: string
  videoSrc: string
  icon?: string
}

/** Demo hub cards — keep in sync with NICHE_META active niches */
export const DEMO_HUB_ITEMS: DemoHubItem[] = [
  {
    id: 'platform-builder',
    title: 'Platform overview',
    description:
      'Full guided flow: business info, style match, live preview, and launch-ready pages.',
    href: '/demo/platform-builder',
    videoSrc: PLATFORM_DEMO_VIDEO,
    icon: '✨',
  },
  {
    id: 'aromatherapy',
    title: 'Aromatherapy',
    description: 'Boutique scent studio — blends, safety guidance, and booking paths.',
    href: '/demo/aromatherapy',
    videoSrc: NICHE_DEMO_VIDEO.aromatherapy,
    icon: '🌿',
  },
  {
    id: 'holistic_medicine',
    title: 'Holistic Medicine',
    description: 'Integrative practice — trust, modalities, and consult booking.',
    href: '/demo/holistic_medicine',
    videoSrc: NICHE_DEMO_VIDEO.holistic_medicine,
    icon: '🧘',
  },
  {
    id: 'private_practice_therapist',
    title: 'Private Practice Therapist',
    description: 'Warm therapy site — specialties, fees, and consult request flow.',
    href: '/demo/private_practice_therapist',
    videoSrc: NICHE_DEMO_VIDEO.private_practice_therapist,
    icon: '💬',
  },
  {
    id: 'sound_bath',
    title: 'Sound Bath',
    description: 'Immersive sound healing — sessions, FAQ, and event inquiries.',
    href: '/demo/sound_bath',
    videoSrc: NICHE_DEMO_VIDEO.sound_bath,
    icon: '🔔',
  },
  {
    id: 'wellness_coach',
    title: 'Wellness Coach',
    description: 'Coaching programs, proof, and discovery-call structure.',
    href: '/demo/wellness_coach',
    videoSrc: NICHE_DEMO_VIDEO.wellness_coach,
    icon: '✨',
  },
]
