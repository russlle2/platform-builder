/**
 * Demo walkthrough MP4 paths (public/demo-videos/).
 * See apps/generator-app/scripts/README-demo-videos.md
 */

// Reused public filenames receive a stable release version so existing visitors
// load the new picture, poster and accessible companions together.
const DEMO_MEDIA_VERSION = '20261019-liam-v2'
const versionedMedia = (path: string) => `${path}?v=${DEMO_MEDIA_VERSION}`

export const PLATFORM_DEMO_VIDEO = versionedMedia('/demo-videos/platform-builder-walkthrough.mp4')
export const PLATFORM_DEMO_POSTER = versionedMedia('/demo-videos/posters/platform-builder-walkthrough.jpg')
export const PLATFORM_DEMO_CAPTIONS = versionedMedia('/demo-videos/platform-builder-walkthrough.vtt')
export const PLATFORM_DEMO_TRANSCRIPT = versionedMedia('/demo-videos/platform-builder-walkthrough.txt')

/** Niche slug → walkthrough MP4 */
const NICHE_DEMO_BASE_PATH: Record<string, string> = {
  aromatherapy: '/demo-videos/aromatherapy-walkthrough.mp4',
  holistic_medicine: '/demo-videos/holistic-medicine-walkthrough.mp4',
  private_practice_therapist: '/demo-videos/private-practice-therapist-walkthrough.mp4',
  sound_bath: '/demo-videos/sound-bath-walkthrough.mp4',
  wellness_coach: '/demo-videos/wellness-coach-walkthrough.mp4',
}

export const NICHE_DEMO_VIDEO: Record<string, string> = Object.fromEntries(
  Object.entries(NICHE_DEMO_BASE_PATH).map(([niche, path]) => [niche, versionedMedia(path)]),
)

export const NICHE_DEMO_POSTER: Record<string, string> = Object.fromEntries(
  Object.entries(NICHE_DEMO_BASE_PATH).map(([niche, path]) => [
    niche,
    versionedMedia(path.replace('/demo-videos/', '/demo-videos/posters/').replace(/\.mp4$/, '.jpg')),
  ]),
)

export const ACTIVE_DEMO_NICHES = Object.keys(NICHE_DEMO_VIDEO)

export const NICHE_DEMO_CAPTIONS: Record<string, string> = Object.fromEntries(
  Object.entries(NICHE_DEMO_BASE_PATH).map(([niche, path]) => [niche, versionedMedia(path.replace(/\.mp4$/, '.vtt'))]),
)

export const NICHE_DEMO_TRANSCRIPT: Record<string, string> = Object.fromEntries(
  Object.entries(NICHE_DEMO_BASE_PATH).map(([niche, path]) => [niche, versionedMedia(path.replace(/\.mp4$/, '.txt'))]),
)

export type DemoHubItem = {
  id: string
  title: string
  description: string
  href: string
  videoSrc: string
  posterSrc?: string
  captionsSrc: string
  transcriptSrc: string
  icon?: string
}

/** Demo hub cards — keep in sync with NICHE_META active niches */
export const DEMO_HUB_ITEMS: DemoHubItem[] = [
  {
    id: 'platform-builder',
    title: 'Platform overview',
    description:
      'Choose your practice, personalize a design, and see your website before you commit.',
    href: '/demo/platform-builder',
    videoSrc: PLATFORM_DEMO_VIDEO,
    posterSrc: PLATFORM_DEMO_POSTER,
    captionsSrc: PLATFORM_DEMO_CAPTIONS,
    transcriptSrc: PLATFORM_DEMO_TRANSCRIPT,
    icon: '✨',
  },
  {
    id: 'aromatherapy',
    title: 'Aromatherapy',
    description: 'Bring your blends, workshops, and studio story together in a website that feels like your brand.',
    href: '/demo/aromatherapy',
    videoSrc: NICHE_DEMO_VIDEO.aromatherapy,
    posterSrc: NICHE_DEMO_POSTER.aromatherapy,
    captionsSrc: NICHE_DEMO_CAPTIONS.aromatherapy,
    transcriptSrc: NICHE_DEMO_TRANSCRIPT.aromatherapy,
    icon: '🌿',
  },
  {
    id: 'holistic_medicine',
    title: 'Holistic Medicine',
    description: 'Give visitors a clear introduction to your approach, services, and consultation options.',
    href: '/demo/holistic_medicine',
    videoSrc: NICHE_DEMO_VIDEO.holistic_medicine,
    posterSrc: NICHE_DEMO_POSTER.holistic_medicine,
    captionsSrc: NICHE_DEMO_CAPTIONS.holistic_medicine,
    transcriptSrc: NICHE_DEMO_TRANSCRIPT.holistic_medicine,
    icon: '🧘',
  },
  {
    id: 'private_practice_therapist',
    title: 'Private Practice Therapist',
    description: 'Create a welcoming introduction to your specialties, approach, and next steps for prospective clients.',
    href: '/demo/private_practice_therapist',
    videoSrc: NICHE_DEMO_VIDEO.private_practice_therapist,
    posterSrc: NICHE_DEMO_POSTER.private_practice_therapist,
    captionsSrc: NICHE_DEMO_CAPTIONS.private_practice_therapist,
    transcriptSrc: NICHE_DEMO_TRANSCRIPT.private_practice_therapist,
    icon: '💬',
  },
  {
    id: 'sound_bath',
    title: 'Sound Bath',
    description: 'Show your session atmosphere, explain what to expect, and make the next step easy to find.',
    href: '/demo/sound_bath',
    videoSrc: NICHE_DEMO_VIDEO.sound_bath,
    posterSrc: NICHE_DEMO_POSTER.sound_bath,
    captionsSrc: NICHE_DEMO_CAPTIONS.sound_bath,
    transcriptSrc: NICHE_DEMO_TRANSCRIPT.sound_bath,
    icon: '🔔',
  },
  {
    id: 'wellness_coach',
    title: 'Wellness Coach',
    description: 'Turn your coaching approach and programs into a clear, personal online presence.',
    href: '/demo/wellness_coach',
    videoSrc: NICHE_DEMO_VIDEO.wellness_coach,
    posterSrc: NICHE_DEMO_POSTER.wellness_coach,
    captionsSrc: NICHE_DEMO_CAPTIONS.wellness_coach,
    transcriptSrc: NICHE_DEMO_TRANSCRIPT.wellness_coach,
    icon: '✨',
  },
]
