/**
 * Google Cloud TTS + Veo helpers with graceful fallback when APIs are unavailable.
 * Credentials via env only — never commit secrets.
 *
 *   GOOGLE_CLOUD_API_KEY or GOOGLE_APPLICATION_CREDENTIALS
 *   GOOGLE_CLOUD_PROJECT (for Vertex Veo)
 *   VERTEX_LOCATION (default us-central1)
 */

import fs from 'fs'
import { spawnSync } from 'child_process'

export type MediaResult<T> = { ok: true; data: T } | { ok: false; error: string }

function ttsApiKey(): string | null {
  return process.env.GOOGLE_CLOUD_TTS_API_KEY?.trim() || null
}

/** Service-bound key (AQ.…) — Gemini OR Agent Platform, one per key. */
function geminiApiKey(): string | null {
  return (
    process.env.GOOGLE_GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_CLOUD_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    null
  )
}

/** Service-bound key (AQ.…) — use the key restricted to Agent Platform API. */
function vertexApiKey(): string | null {
  return (
    process.env.GOOGLE_VERTEX_API_KEY?.trim() ||
    process.env.GOOGLE_CLOUD_VERTEX_API_KEY?.trim() ||
    null
  )
}

/** Cloud Text-to-Speech — returns path to WAV file. */
export async function synthesizeVoiceover(
  text: string,
  outPath: string,
  voice = 'en-US-Chirp3-HD-Charon',
): Promise<MediaResult<string>> {
  const key = ttsApiKey()
  if (!key) return { ok: false, error: 'Set GOOGLE_CLOUD_TTS_API_KEY (standard AIza key, TTS-only)' }

  const body = {
    input: { text },
    voice: { languageCode: 'en-US', name: voice },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
  }

  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: `TTS HTTP ${res.status}: ${errText.slice(0, 200)}` }
    }
    const json = (await res.json()) as { audioContent?: string }
    if (!json.audioContent) return { ok: false, error: 'TTS returned no audioContent' }
    fs.writeFileSync(outPath, Buffer.from(json.audioContent, 'base64'))
    return { ok: true, data: outPath }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Veo video generation via Vertex AI (optional). Returns MP4 path on success.
 * Falls back gracefully — callers should use ffmpeg bookends when this fails.
 */
export async function generateVeoClip(
  prompt: string,
  outPath: string,
  durationSec = 4,
): Promise<MediaResult<string>> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  const model = process.env.VEO_MODEL || 'veo-2.0-generate-001'

  let token = process.env.GCLOUD_ACCESS_TOKEN?.trim()
  const vertexKey = vertexApiKey()
  if (!token && vertexKey) {
    // Agent Platform–bound API keys authenticate Vertex calls via key= param on some endpoints
    token = vertexKey
  }
  if (!token && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const r = spawnSync(
      'gcloud',
      ['auth', 'application-default', 'print-access-token'],
      { encoding: 'utf8' },
    )
    if (r.status === 0) token = r.stdout.trim()
  }
  if (!project || !token) {
    return { ok: false, error: 'Vertex Veo requires GOOGLE_CLOUD_PROJECT + gcloud auth' }
  }

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predictLongRunning`

  try {
    const start = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, durationSeconds: durationSec, aspectRatio: '16:9' },
      }),
    })
    if (!start.ok) {
      const errText = await start.text()
      return { ok: false, error: `Veo start HTTP ${start.status}: ${errText.slice(0, 200)}` }
    }
    // Long-running ops need polling — for pipeline simplicity, report as unavailable
    // unless a completed operation URL is returned synchronously (rare).
    return { ok: false, error: 'Veo long-running job started — use ffmpeg bookend fallback for now' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function findFfmpeg(): string | null {
  const fromEnv = process.env.FFMPEG_PATH?.trim()
  const candidates = fromEnv ? [fromEnv, 'ffmpeg', 'ffmpeg.exe'] : ['ffmpeg', 'ffmpeg.exe']
  for (const c of candidates) {
    const r = spawnSync(c, ['-version'], { stdio: 'pipe' })
    if (r.status === 0) return c
  }
  return null
}

function defaultFontFile(): string {
  if (process.env.DEMO_FONT_FILE) return process.env.DEMO_FONT_FILE.replace(/\\/g, '/').replace(/:/g, '\\:')
  const candidates = [
    'C:/Windows/Fonts/segoeuib.ttf',
    'C:/Windows/Fonts/segoeui.ttf',
    'C:/Windows/Fonts/arial.ttf',
  ]
  for (const c of candidates) {
    if (fs.existsSync(c.replace(/\//g, '\\'))) return c.replace(/\\/g, '/').replace(/:/g, '\\:')
  }
  return 'Arial'
}

/** Motion-graphic bookend when Veo is unavailable (plan fallback). */
export function renderFfmpegBookend(
  ffmpeg: string,
  title: string,
  accentHex: string,
  outPath: string,
  durationSec = 3,
): boolean {
  const fadeOut = Math.max(durationSec - 0.5, 0.1)
  const font = defaultFontFile()
  const safeTitle = title.replace(/'/g, "\\'").replace(/:/g, '\\:').slice(0, 48)
  const filter = [
    `color=c=0x0f172a:s=1920x1080:d=${durationSec}`,
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x${accentHex}@0.42:t=fill`,
    `vignette=angle=PI/5`,
    `drawtext=fontfile='${font}':text='DailyClarity':fontcolor=white@0.35:fontsize=36:x=(w-text_w)/2:y=h*0.38`,
    `drawtext=fontfile='${font}':text='${safeTitle}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=h*0.46`,
    `fade=t=in:st=0:d=0.5`,
    `fade=t=out:st=${fadeOut.toFixed(2)}:d=0.5`,
  ].join(',')

  const r = spawnSync(
    ffmpeg,
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      filter,
      '-t',
      String(durationSec),
      '-r',
      '30',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outPath,
    ],
    { stdio: 'pipe', encoding: 'utf8' },
  )
  if (r.status !== 0) {
    console.error(r.stderr?.slice(-400) || 'ffmpeg bookend failed')
  }
  return r.status === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000
}
