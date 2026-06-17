/**
 * Benefit-driven narration scripts for demo walkthrough videos.
 * Mapped to SCENARIOS in demo-scenarios.ts — used by voiceover + compose pipeline.
 */

export type NarrationLine = {
  /** Seconds into the final composed video (post intro bookend). */
  atSec: number
  text: string
}

export type NarrationScript = {
  scenarioId: string
  introTitle: string
  outroTitle: string
  /** Brand accent for ffmpeg motion bookends (hex without #). */
  accentColor: string
  lines: NarrationLine[]
}

export const NARRATION_SCRIPTS: NarrationScript[] = [
  {
    scenarioId: 'platform-builder',
    introTitle: 'DailyClarity Platform Builder',
    outroTitle: 'Launch your site in minutes',
    accentColor: '0ea5e9',
    lines: [
      { atSec: 2, text: 'Start with one guided flow — your business details, your brand.' },
      { atSec: 12, text: 'Pick your niche and style. We match a layout built for wellness pros.' },
      { atSec: 28, text: 'Every page fills in with your real info — no blank templates.' },
      { atSec: 48, text: 'Preview home, about, services, and contact before you pay.' },
      { atSec: 62, text: 'Basic is twenty dollars — fully automated. Security plus Ads adds done-for-you campaigns and hardening.' },
      { atSec: 78, text: 'Review your profile, start your trial, and manage everything from your portal.' },
    ],
  },
  {
    scenarioId: 'aromatherapy',
    introTitle: 'Aromatherapy Websites',
    outroTitle: 'Built for scent-led wellness brands',
    accentColor: 'a16207',
    lines: [
      { atSec: 2, text: 'Your aromatherapy studio deserves a site as intentional as your blends.' },
      { atSec: 14, text: 'Enter your practice once — we personalize every page for your niche.' },
      { atSec: 32, text: 'Match a layout, then scroll through a live preview filled with your copy.' },
      { atSec: 50, text: 'Basic launches and runs itself. Security plus Ads adds campaigns and security we manage for you.' },
      { atSec: 68, text: 'Start your seven-day trial when you are ready.' },
    ],
  },
  {
    scenarioId: 'holistic-medicine',
    introTitle: 'Holistic Medicine Websites',
    outroTitle: 'Professional care, polished online presence',
    accentColor: '059669',
    lines: [
      { atSec: 2, text: 'Integrative health practices need clarity and trust — built in from the start.' },
      { atSec: 14, text: 'Your niche shapes the templates and tone of your site.' },
      { atSec: 32, text: 'Preview every page with your services, story, and contact details.' },
      { atSec: 50, text: 'Twenty dollars for full automation — or eighty with hands-on ads and security.' },
      { atSec: 68, text: 'Review, checkout, and edit anytime from your client portal.' },
    ],
  },
  {
    scenarioId: 'private-practice-therapist',
    introTitle: 'Therapist Websites',
    outroTitle: 'A calm, credible home for your practice',
    accentColor: '6366f1',
    lines: [
      { atSec: 2, text: 'Private practice therapists need a site that feels safe and professional.' },
      { atSec: 14, text: 'One intake flow — your credentials, approach, and booking details.' },
      { atSec: 32, text: 'See your live preview across every page before you commit.' },
      { atSec: 50, text: 'Basic is self-serve automation. Security plus Ads adds managed campaigns and uptime.' },
      { atSec: 65, text: 'Launch with a free trial — no technical setup required.' },
    ],
  },
  {
    scenarioId: 'sound-bath',
    introTitle: 'Sound Bath Websites',
    outroTitle: 'Share your sessions with a site that resonates',
    accentColor: '7c3aed',
    lines: [
      { atSec: 2, text: 'Sound healers deserve a digital space as immersive as their sessions.' },
      { atSec: 14, text: 'We tailor layouts and copy to your sound-bath niche automatically.' },
      { atSec: 32, text: 'Scroll through your personalized preview — events, offerings, contact.' },
      { atSec: 50, text: 'Choose Basic for automation or Security plus Ads for done-for-you growth.' },
      { atSec: 65, text: 'Start your trial and update your site anytime.' },
    ],
  },
  {
    scenarioId: 'wellness-coach',
    introTitle: 'Wellness Coach Websites',
    outroTitle: 'Grow your coaching brand online',
    accentColor: '14b8a6',
    lines: [
      { atSec: 2, text: 'Wellness coaches launch faster with a site built around their offers.' },
      { atSec: 14, text: 'Add your details once — coaching packages, story, and contact info.' },
      { atSec: 32, text: 'Preview a complete site matched to your brand style.' },
      { atSec: 50, text: 'Basic runs on autopilot. Security plus Ads adds managed ads and security.' },
      { atSec: 68, text: 'Review your profile and start your seven-day trial.' },
    ],
  },
]

export function narrationForScenario(scenarioId: string): NarrationScript | undefined {
  return NARRATION_SCRIPTS.find((s) => s.scenarioId === scenarioId)
}

/** Full script text for TTS (single utterance per video). */
export function fullNarrationText(script: NarrationScript): string {
  return script.lines.map((l) => l.text).join(' ')
}
