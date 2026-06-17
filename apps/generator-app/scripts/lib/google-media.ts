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

function apiKey(): string | null {
  return (
    process.env.GOOGLE_CLOUD_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    null
  )
}

/** Cloud Text-to-Speech — returns path to WAV file. */
export async function synthesizeVoiceover(
  text: string,
  outPath: string,
  voice = 'en-US-Chirp3-HD-Charon',
): Promise<MediaResult<string>> {
  const key = apiKey()
  if (!key) return { ok: false, error: 'No GOOGLE_CLOUD_API_KEY set' }

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

/** Motion-graphic bookend when Veo is unavailable (plan fallback). */
export function renderFfmpegBookend(
  ffmpeg: string,
  _title: string,
  accentHex: string,
  outPath: string,
  durationSec = 3,
): boolean {
  const fadeOut = Math.max(durationSec - 0.5, 0.1)
  // Solid brand wash + vignette — no drawtext (avoids fontconfig issues on Windows CI)
  const filter = [
    `color=c=0x${accentHex}:s=1920x1080:d=${durationSec}`,
    `vignette=angle=PI/4`,
    `fade=t=in:st=0:d=0.4`,
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
