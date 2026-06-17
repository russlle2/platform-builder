/**
 * Generate TTS voiceover WAV files for demo videos.
 *
 * Usage:
 *   GOOGLE_CLOUD_API_KEY=... npx tsx scripts/generate-demo-voiceover.ts
 *   DEMO_ONLY=aromatherapy npx tsx scripts/generate-demo-voiceover.ts
 */
import fs from 'fs'
import path from 'path'
import { NARRATION_SCRIPTS, fullNarrationText } from './demo-narration'
import { synthesizeVoiceover } from './lib/google-media'

const OUT_DIR = path.join(__dirname, '..', 'test-results', 'demo-recordings', 'voiceover')
const only = process.env.DEMO_ONLY?.split(',').map((s) => s.trim()).filter(Boolean)

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const scripts = only?.length
    ? NARRATION_SCRIPTS.filter((s) => only.includes(s.scenarioId))
    : NARRATION_SCRIPTS

  let ok = 0
  let skipped = 0

  for (const script of scripts) {
    const outPath = path.join(OUT_DIR, `${script.scenarioId}.wav`)
    const text = fullNarrationText(script)
    console.log(`\n→ ${script.scenarioId} (${text.length} chars)`)
    const result = await synthesizeVoiceover(text, outPath)
    if (result.ok) {
      console.log(`  ✓ ${outPath}`)
      ok++
    } else {
      console.warn(`  ⚠ skipped: ${result.error}`)
      skipped++
    }
  }

  console.log(`\nDone: ${ok} generated, ${skipped} skipped → ${OUT_DIR}`)
  if (ok === 0 && skipped > 0) process.exitCode = 0 // fallback pipeline still valid
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
