/**
 * Professional composite: branded bookends + clean product footage + Chirp3 voiceover + captions.
 *
 * Usage:
 *   FFMPEG_PATH=... GOOGLE_CLOUD_TTS_API_KEY=... npx tsx scripts/compose-demo-videos.ts
 */
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { SCENARIOS } from './demo-scenarios'
import { narrationForScenario } from './demo-narration'
import { captionsForScenario, writeAssCaptions, type CaptionSegment } from './demo-captions'
import { findFfmpeg } from './lib/google-media'

const APP_ROOT = path.join(__dirname, '..')
const SOURCE_DIR =
  process.env.DEMO_SOURCE_DIR ||
  path.join(APP_ROOT, 'test-results', 'demo-recordings', 'source-footage')
const BROLL_DIR = path.join(APP_ROOT, 'test-results', 'demo-recordings', 'broll')
const VOICE_DIR = path.join(APP_ROOT, 'test-results', 'demo-recordings', 'voiceover')
const CAPTION_DIR = path.join(APP_ROOT, 'test-results', 'demo-recordings', 'captions')
const OUT_DIR = path.join(APP_ROOT, 'public', 'demo-videos')
const POSTER_DIR = path.join(OUT_DIR, 'posters')
const WORK_DIR = path.join(APP_ROOT, 'test-results', 'demo-recordings', 'composed')

const BOOKEND_SEC = Number(process.env.BOOKEND_SEC || '3')
const FOOTAGE_SPEED = 1.35 // matches record-demo-videos.ts export timing
const CRF = 23
const only = process.env.DEMO_ONLY?.split(',').map((s) => s.trim()).filter(Boolean)
const skipVoice = process.env.SKIP_VOICEOVER === '1'

function escAssPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
}

function offsetCaptions(segments: CaptionSegment[], introSec: number): CaptionSegment[] {
  return segments.map((s) => ({
    startSec: introSec + s.startSec / FOOTAGE_SPEED,
    endSec: introSec + s.endSec / FOOTAGE_SPEED,
    text: s.text,
  }))
}

function scalePadFilter(extra = ''): string {
  const base = 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0f172a,setsar=1'
  return extra ? `${base},${extra}` : base
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

function encodeFootage(ffmpeg: string, inPath: string, assPath: string, outPath: string): boolean {
  const subs = escAssPath(assPath)
  const r = spawnSync(
    ffmpeg,
    [
      '-y',
      '-i',
      inPath,
      '-vf',
      scalePadFilter(`subtitles='${subs}'`),
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

function mixVoiceover(
  ffmpeg: string,
  videoPath: string,
  audioPath: string,
  outPath: string,
  delayMs: number,
): boolean {
  const delay = Math.max(0, delayMs)
  const filter = `[1:a]adelay=${delay}|${delay},loudnorm=I=-16:TP=-1.5:LRA=11[vox]`
  const r = spawnSync(
    ffmpeg,
    [
      '-y',
      '-i',
      videoPath,
      '-i',
      audioPath,
      '-filter_complex',
      filter,
      '-map',
      '0:v',
      '-map',
      '[vox]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-shortest',
      outPath,
    ],
    { stdio: 'inherit' },
  )
  return r.status === 0
}

function finalEncode(ffmpeg: string, inPath: string, outPath: string): boolean {
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
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      outPath,
    ],
    { stdio: 'inherit' },
  )
  return r.status === 0
}

function writePoster(ffmpeg: string, videoPath: string, posterPath: string): void {
  fs.mkdirSync(path.dirname(posterPath), { recursive: true })
  spawnSync(
    ffmpeg,
    ['-y', '-ss', String(BOOKEND_SEC + 2), '-i', videoPath, '-vframes', '1', '-q:v', '2', posterPath],
    { stdio: 'pipe' },
  )
}

function composeOne(
  ffmpeg: string,
  scenarioId: string,
  outputName: string,
): { ok: boolean; note: string } {
  const source = path.join(SOURCE_DIR, `${outputName}.mp4`)
  const intro = path.join(BROLL_DIR, `${scenarioId}-intro.mp4`)
  const outro = path.join(BROLL_DIR, `${scenarioId}-outro.mp4`)
  const voice = path.join(VOICE_DIR, `${scenarioId}.wav`)
  const assPath = path.join(CAPTION_DIR, `${scenarioId}-composed.ass`)
  const captionedFootage = path.join(WORK_DIR, `${scenarioId}-footage-captioned.mp4`)
  const concatPath = path.join(WORK_DIR, `${scenarioId}-concat.mp4`)
  const voicedPath = path.join(WORK_DIR, `${scenarioId}-voiced.mp4`)
  const finalPath = path.join(OUT_DIR, `${outputName}.mp4`)
  const posterPath = path.join(POSTER_DIR, `${outputName}.jpg`)

  if (!fs.existsSync(source)) return { ok: false, note: `missing source ${source}` }
  if (!fs.existsSync(intro) || !fs.existsSync(outro)) {
    return { ok: false, note: 'missing bookends — run broll:demos first' }
  }

  fs.mkdirSync(WORK_DIR, { recursive: true })
  fs.mkdirSync(CAPTION_DIR, { recursive: true })

  const caps = offsetCaptions(captionsForScenario(scenarioId), BOOKEND_SEC)
  writeAssCaptions(caps, assPath, 1) // times already adjusted; speed=1

  if (!encodeFootage(ffmpeg, source, assPath, captionedFootage)) {
    return { ok: false, note: 'captioned footage encode failed' }
  }
  if (!concatVideos(ffmpeg, [intro, captionedFootage, outro], concatPath)) {
    return { ok: false, note: 'concat failed' }
  }

  let publishSource = concatPath
  if (!skipVoice && fs.existsSync(voice)) {
    const delayMs = BOOKEND_SEC * 1000
    if (mixVoiceover(ffmpeg, concatPath, voice, voicedPath, delayMs)) publishSource = voicedPath
  }

  if (!finalEncode(ffmpeg, publishSource, finalPath)) {
    return { ok: false, note: 'final encode failed' }
  }

  writePoster(ffmpeg, finalPath, posterPath)

  const mb = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(1)
  return { ok: true, note: `${mb} MB + poster → ${finalPath}` }
}

function main() {
  const ffmpeg = findFfmpeg()
  if (!ffmpeg) throw new Error('ffmpeg not found — set FFMPEG_PATH')

  const scenarios = only?.length
    ? SCENARIOS.filter((s) => only.includes(s.id) || only.includes(s.outputName))
    : SCENARIOS

  console.log(`Professional compose: ${scenarios.length} video(s)`)
  console.log(`Source footage: ${SOURCE_DIR}`)
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
  console.log(`\nDone: ${okCount}/${results.length}`)
  if (okCount === 0) process.exit(1)
}

main()
