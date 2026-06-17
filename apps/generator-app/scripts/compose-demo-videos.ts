/**
 * Composite intro bookend + product footage + outro + optional voiceover.
 * Re-encodes web-optimized H.264 for public/demo-videos/.
 *
 * Usage:
 *   npx tsx scripts/compose-demo-videos.ts
 *   DEMO_ONLY=platform-builder npx tsx scripts/compose-demo-videos.ts
 *   SKIP_VOICEOVER=1 npx tsx scripts/compose-demo-videos.ts
 */
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { SCENARIOS } from './demo-scenarios'
import { narrationForScenario } from './demo-narration'
import { findFfmpeg } from './lib/google-media'

const APP_ROOT = path.join(__dirname, '..')
const FOOTAGE_DIR = path.join(APP_ROOT, 'public', 'demo-videos')
const BROLL_DIR = path.join(APP_ROOT, 'test-results', 'demo-recordings', 'broll')
const VOICE_DIR = path.join(APP_ROOT, 'test-results', 'demo-recordings', 'voiceover')
const OUT_DIR = path.join(APP_ROOT, 'public', 'demo-videos')
const WORK_DIR = path.join(APP_ROOT, 'test-results', 'demo-recordings', 'composed')
const CRF = 22

const only = process.env.DEMO_ONLY?.split(',').map((s) => s.trim()).filter(Boolean)
const skipVoice = process.env.SKIP_VOICEOVER === '1'

function scalePadFilter(): string {
  return 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1'
}

function concatVideos(ffmpeg: string, parts: string[], outPath: string): boolean {
  const listPath = path.join(WORK_DIR, `concat-${path.basename(outPath)}.txt`)
  const list = parts.map((p) => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n')
  fs.writeFileSync(listPath, list, 'utf8')
  const r = spawnSync(
    ffmpeg,
    ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath],
    { stdio: 'inherit' },
  )
  return r.status === 0
}

function addVoiceover(ffmpeg: string, videoPath: string, audioPath: string, outPath: string): boolean {
  const r = spawnSync(
    ffmpeg,
    [
      '-y',
      '-i',
      videoPath,
      '-i',
      audioPath,
      '-filter_complex',
      '[1:a]volume=0.92[a];[0:a][a]amix=inputs=2:duration=first:dropout_transition=2[aout]',
      '-map',
      '0:v',
      '-map',
      '[aout]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-shortest',
      outPath,
    ],
    { stdio: 'inherit' },
  )
  if (r.status !== 0) {
    // Video may have no audio track — map voiceover only
    const r2 = spawnSync(
      ffmpeg,
      [
        '-y',
        '-i',
        videoPath,
        '-i',
        audioPath,
        '-map',
        '0:v',
        '-map',
        '1:a',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-shortest',
        outPath,
      ],
      { stdio: 'inherit' },
    )
    return r2.status === 0
  }
  return true
}

function reencode(ffmpeg: string, inPath: string, outPath: string): boolean {
  const r = spawnSync(
    ffmpeg,
    [
      '-y',
      '-i',
      inPath,
      '-vf',
      scalePadFilter(),
      '-r',
      '30',
      '-c:v',
      'libx264',
      '-profile:v',
      'baseline',
      '-pix_fmt',
      'yuv420p',
      '-colorspace',
      'bt709',
      '-crf',
      String(CRF),
      '-movflags',
      '+faststart',
      '-an',
      outPath,
    ],
    { stdio: 'inherit' },
  )
  return r.status === 0
}

function composeOne(
  ffmpeg: string,
  scenarioId: string,
  outputName: string,
): { ok: boolean; note: string } {
  const footage = path.join(FOOTAGE_DIR, `${outputName}.mp4`)
  const intro = path.join(BROLL_DIR, `${scenarioId}-intro.mp4`)
  const outro = path.join(BROLL_DIR, `${scenarioId}-outro.mp4`)
  const voice = path.join(VOICE_DIR, `${scenarioId}.wav`)
  const scaledFootage = path.join(WORK_DIR, `${scenarioId}-footage-scaled.mp4`)
  const concatPath = path.join(WORK_DIR, `${scenarioId}-concat.mp4`)
  const voicedPath = path.join(WORK_DIR, `${scenarioId}-voiced.mp4`)
  const finalPath = path.join(OUT_DIR, `${outputName}.mp4`)

  if (!fs.existsSync(footage)) return { ok: false, note: `missing footage ${footage}` }
  if (!fs.existsSync(intro) || !fs.existsSync(outro)) {
    return { ok: false, note: 'missing bookends — run generate-demo-broll.ts first' }
  }

  fs.mkdirSync(WORK_DIR, { recursive: true })
  if (!reencode(ffmpeg, footage, scaledFootage)) return { ok: false, note: 'footage reencode failed' }
  if (!concatVideos(ffmpeg, [intro, scaledFootage, outro], concatPath)) {
    return { ok: false, note: 'concat failed' }
  }

  let publishSource = concatPath
  if (!skipVoice && fs.existsSync(voice)) {
    if (addVoiceover(ffmpeg, concatPath, voice, voicedPath)) publishSource = voicedPath
  }

  const r = spawnSync(
    ffmpeg,
    [
      '-y',
      '-i',
      publishSource,
      '-vf',
      scalePadFilter(),
      '-r',
      '30',
      '-c:v',
      'libx264',
      '-profile:v',
      'baseline',
      '-pix_fmt',
      'yuv420p',
      '-colorspace',
      'bt709',
      '-crf',
      String(CRF),
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      finalPath,
    ],
    { stdio: 'inherit' },
  )
  if (r.status !== 0) return { ok: false, note: 'final encode failed' }

  const mb = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(1)
  return { ok: true, note: `${mb} MB → ${finalPath}` }
}

function main() {
  const ffmpeg = findFfmpeg()
  if (!ffmpeg) throw new Error('ffmpeg not found — set FFMPEG_PATH')

  const scenarios = only?.length
    ? SCENARIOS.filter((s) => only.includes(s.id) || only.includes(s.outputName))
    : SCENARIOS

  console.log(`Composing ${scenarios.length} demo video(s)...`)
  console.log(`Footage: ${FOOTAGE_DIR}`)
  console.log(`Bookends: ${BROLL_DIR}`)
  console.log(`Voice: ${skipVoice ? 'skipped' : VOICE_DIR}\n`)

  const results: { name: string; ok: boolean; note: string }[] = []
  for (const s of scenarios) {
    if (!narrationForScenario(s.id)) {
      results.push({ name: s.outputName, ok: false, note: 'no narration script' })
      continue
    }
    const r = composeOne(ffmpeg, s.id, s.outputName)
    console.log(`${r.ok ? '✓' : '✗'} ${s.outputName}: ${r.note}`)
    results.push({ name: s.outputName, ok: r.ok, note: r.note })
  }

  const okCount = results.filter((r) => r.ok).length
  console.log(`\nDone: ${okCount}/${results.length} composed`)
  if (okCount === 0) process.exit(1)
}

main()
