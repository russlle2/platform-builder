/**
 * Analyze demo walkthrough MP4s with Gemini 2.5 Pro on Vertex AI.
 * Uploads to GCS, returns chapter timestamps + caption drafts as JSON.
 *
 * Usage:
 *   GOOGLE_CLOUD_PROJECT=my-project GCS_DEMO_BUCKET=dailyclarity-demo-work \
 *     npx tsx scripts/analyze-demo-videos.ts public/demo-videos/aromatherapy-walkthrough.mp4
 *
 * Requires: gcloud CLI authenticated, Vertex AI + Cloud Storage APIs enabled.
 */
import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT
const BUCKET = process.env.GCS_DEMO_BUCKET || 'dailyclarity-demo-work'
const LOCATION = process.env.VERTEX_LOCATION || 'us-central1'
const MODEL = process.env.VERTEX_GEMINI_MODEL || 'gemini-2.5-pro'

type Chapter = {
  start: string
  end: string
  caption: string
  note?: string
}

type AnalysisResult = {
  chapters: Chapter[]
  fastSections: string[]
  suggestedTone: string
}

function getAccessToken(): string {
  if (process.env.GCLOUD_ACCESS_TOKEN) return process.env.GCLOUD_ACCESS_TOKEN.trim()
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      return execSync('gcloud auth application-default print-access-token', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim()
    } catch {
      // fall through
    }
  }
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim()
}

function uploadToGcs(localPath: string, objectName: string): string {
  const dest = `gs://${BUCKET}/${objectName}`
  console.log(`Uploading ${localPath} → ${dest}`)
  const r = spawnSync('gcloud', ['storage', 'cp', localPath, dest], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`gcloud storage cp failed (${r.status})`)
  return `gs://${BUCKET}/${objectName}`
}

async function analyzeWithVertex(gcsUri: string): Promise<AnalysisResult> {
  if (!PROJECT) {
    throw new Error('Set GOOGLE_CLOUD_PROJECT (or GCP_PROJECT) for Vertex AI calls')
  }

  const token = getAccessToken()
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`

  const prompt = `You are reviewing a product walkthrough screen recording for DailyClarity, a wellness website builder.

Watch the video and return ONLY valid JSON (no markdown fences) with this shape:
{
  "chapters": [
    { "start": "MM:SS", "end": "MM:SS", "caption": "one concise lower-third line", "note": "optional editor note" }
  ],
  "fastSections": ["MM:SS–MM:SS sections where UI changes too quickly for viewers"],
  "suggestedTone": "one sentence on overall caption voice"
}

Rules:
- 5–8 chapters covering intake → style → match → preview → checkout/portal if shown
- Captions should be benefit-led, plain language, max ~12 words each
- Timestamps must match the video as uploaded (post-speed-up if already encoded)
- Flag fast sections where text is unreadable or transitions are jarring`

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { fileData: { mimeType: 'video/mp4', fileUri: gcsUri } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Vertex generateContent failed (${res.status}): ${errText.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty Vertex response')

  return JSON.parse(text) as AnalysisResult
}

function toCaptionSegments(chapters: Chapter[]) {
  const parseTs = (ts: string) => {
    const [m, s] = ts.split(':').map(Number)
    return (m || 0) * 60 + (s || 0)
  }
  return chapters.map((c) => ({
    startSec: parseTs(c.start),
    endSec: parseTs(c.end),
    text: c.caption,
  }))
}

async function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('Usage: npx tsx scripts/analyze-demo-videos.ts <path-to-mp4>')
    process.exit(1)
  }

  const localPath = path.resolve(input)
  if (!fs.existsSync(localPath)) {
    console.error(`File not found: ${localPath}`)
    process.exit(1)
  }

  const baseName = path.basename(localPath)
  const objectName = `analysis/${Date.now()}-${baseName}`
  const gcsUri = uploadToGcs(localPath, objectName)

  console.log('\nCalling Vertex Gemini…')
  const analysis = await analyzeWithVertex(gcsUri)

  const outDir = path.join(path.dirname(localPath), '..', '..', 'test-results', 'demo-analysis')
  fs.mkdirSync(outDir, { recursive: true })
  const stem = baseName.replace(/\.mp4$/i, '')
  const jsonPath = path.join(outDir, `${stem}.analysis.json`)
  const segmentsPath = path.join(outDir, `${stem}.segments.json`)

  fs.writeFileSync(jsonPath, JSON.stringify(analysis, null, 2), 'utf8')
  fs.writeFileSync(segmentsPath, JSON.stringify(toCaptionSegments(analysis.chapters), null, 2), 'utf8')

  console.log(`\n✓ Analysis → ${jsonPath}`)
  console.log(`✓ Caption segments → ${segmentsPath}`)
  console.log('\nReview JSON, then merge segments into scripts/demo-captions.ts and re-run record:demos (ffmpeg only) if needed.')
  if (analysis.fastSections.length) {
    console.log('\nFast sections flagged:', analysis.fastSections.join(', '))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
