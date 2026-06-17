/**
 * Generate intro/outro bookends per demo scenario.
 * Tries Veo when Vertex is configured; otherwise ffmpeg motion graphics (plan fallback).
 *
 * Usage:
 *   npx tsx scripts/generate-demo-broll.ts
 *   DEMO_ONLY=wellness-coach npx tsx scripts/generate-demo-broll.ts
 */
import fs from 'fs'
import path from 'path'
import { NARRATION_SCRIPTS } from './demo-narration'
import { findFfmpeg, generateVeoClip, renderFfmpegBookend } from './lib/google-media'

const OUT_DIR = path.join(__dirname, '..', 'test-results', 'demo-recordings', 'broll')
const only = process.env.DEMO_ONLY?.split(',').map((s) => s.trim()).filter(Boolean)
const BOOKEND_SEC = Number(process.env.BOOKEND_SEC || '3')

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const ffmpeg = findFfmpeg()
  if (!ffmpeg) throw new Error('ffmpeg not found — set FFMPEG_PATH')

  const scripts = only?.length
    ? NARRATION_SCRIPTS.filter((s) => only.includes(s.scenarioId))
    : NARRATION_SCRIPTS

  for (const script of scripts) {
    const introPath = path.join(OUT_DIR, `${script.scenarioId}-intro.mp4`)
    const outroPath = path.join(OUT_DIR, `${script.scenarioId}-outro.mp4`)

    console.log(`\n→ ${script.scenarioId}`)

    const veoIntro = await generateVeoClip(
      `Cinematic wellness brand intro, ${script.introTitle}, soft light, ${script.accentColor} accent, 16:9, no text overlay`,
      introPath,
      BOOKEND_SEC,
    )
    if (!veoIntro.ok) {
      console.warn(`  Veo intro: ${veoIntro.error} — using ffmpeg`)
      if (!renderFfmpegBookend(ffmpeg, script.introTitle, script.accentColor, introPath, BOOKEND_SEC)) {
        throw new Error(`ffmpeg intro failed for ${script.scenarioId}`)
      }
    }

    const veoOutro = await generateVeoClip(
      `Calm wellness outro, ${script.outroTitle}, minimal, brand colors, 16:9`,
      outroPath,
      BOOKEND_SEC,
    )
    if (!veoOutro.ok) {
      console.warn(`  Veo outro: ${veoOutro.error} — using ffmpeg`)
      if (!renderFfmpegBookend(ffmpeg, script.outroTitle, script.accentColor, outroPath, BOOKEND_SEC)) {
        throw new Error(`ffmpeg outro failed for ${script.scenarioId}`)
      }
    }

    console.log(`  ✓ intro ${introPath}`)
    console.log(`  ✓ outro ${outroPath}`)
  }

  console.log(`\nDone → ${OUT_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
