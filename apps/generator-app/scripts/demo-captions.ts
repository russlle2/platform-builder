/** Burn-in caption segments for demo walkthroughs (times in raw recording seconds). */

import fs from 'fs'

export type CaptionSegment = {
  startSec: number
  endSec: number
  text: string
}

export const PLATFORM_CAPTIONS: CaptionSegment[] = [
  { startSec: 2, endSec: 8, text: 'Start with your business details — one guided flow' },
  { startSec: 12, endSec: 22, text: 'Pick your niche and enter your practice info' },
  { startSec: 28, endSec: 40, text: 'Choose the style that fits your brand' },
  { startSec: 48, endSec: 58, text: 'We match you with a layout for your niche' },
  { startSec: 62, endSec: 95, text: 'Every page fills in with your real business info' },
  { startSec: 98, endSec: 115, text: 'Browse personalized layouts — already populated for you' },
]

export const NICHE_WALKTHROUGH_CAPTIONS: CaptionSegment[] = [
  { startSec: 2, endSec: 10, text: 'Add your details once — we personalize every page' },
  { startSec: 14, endSec: 26, text: 'Your niche shapes the templates you see' },
  { startSec: 32, endSec: 44, text: 'Match a layout, then preview your live site' },
  { startSec: 50, endSec: 88, text: 'Scroll through pages filled with your business info' },
  { startSec: 92, endSec: 105, text: 'Edit copy and images, then checkout when ready' },
]

export function captionsForScenario(scenarioId: string): CaptionSegment[] {
  if (scenarioId === 'platform-builder') return PLATFORM_CAPTIONS
  return NICHE_WALKTHROUGH_CAPTIONS
}

/** Write ASS subtitles file for ffmpeg burn-in */
export function writeAssCaptions(segments: CaptionSegment[], outPath: string, speed = 1.35): string {
  const toTime = (sec: number) => {
    const t = sec / speed
    const h = Math.floor(t / 3600)
    const m = Math.floor((t % 3600) / 60)
    const s = t % 60
    return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`
  }

  const lines = [
    '[Script Info]',
    'Title: DailyClarity Demo',
    'ScriptType: v4.00+',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,Arial,28,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,40,40,60,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]

  for (const seg of segments) {
    const text = seg.text.replace(/,/g, '\\,')
    lines.push(
      `Dialogue: 0,${toTime(seg.startSec)},${toTime(seg.endSec)},Default,,0,0,0,,${text}`,
    )
  }

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
  return outPath
}
