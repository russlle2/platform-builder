#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../package.json', import.meta.url))
const SHA = /^[a-f0-9]{40}$/
const HASH = /^[a-f0-9]{64}$/
const PUBLIC_PREFIX = 'apps/generator-app/public'
const VIDEO_SPECS = [
  ['platform-builder', 'platform-builder'],
  ['aromatherapy', 'aromatherapy'],
  ['holistic_medicine', 'holistic-medicine'],
  ['private_practice_therapist', 'private-practice-therapist'],
  ['sound_bath', 'sound-bath'],
  ['wellness_coach', 'wellness-coach'],
].map(([id, stem]) => ({ id, stem, route: `/demo/${id}` }))
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]
const ROUTES = ['/', '/demo', ...VIDEO_SPECS.map(video => video.route)]
const MIME = { mp4: 'video/mp4', jpg: 'image/jpeg', vtt: 'text/vtt', txt: 'text/plain' }
const must = (condition, message) => { if (!condition) throw new Error(message) }
const digest = value => createHash('sha256').update(value).digest('hex')
const versioned = (path, version) => `${path}?v=${encodeURIComponent(version)}`

export function mediaSpecification(manifest) {
  must(manifest?.version === 1 && SHA.test(manifest.sourceSha ?? '') && /^[a-z0-9-]{1,80}$/.test(manifest.mediaVersion ?? ''), 'Invalid fixed media manifest identity')
  const expected = VIDEO_SPECS.flatMap(({ stem }) => [
    ...['mp4', 'vtt', 'txt'].map(ext => `${PUBLIC_PREFIX}/demo-videos/${stem}-walkthrough.${ext}`),
    `${PUBLIC_PREFIX}/demo-videos/posters/${stem}-walkthrough.jpg`,
  ])
  const files = manifest.files?.filter(file => file.path?.startsWith(`${PUBLIC_PREFIX}/demo-videos/`))
  must(Array.isArray(files) && files.length === expected.length && new Set(files.map(file => file.path)).size === expected.length, 'Exactly 24 distinct demo assets are required')
  for (const file of files) {
    must(expected.includes(file.path) && HASH.test(file.sha256 ?? '') && Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= 20_000_000, 'Unexpected or unsealed demo asset')
  }
  return files.map(file => ({ ...file, path: file.path.slice(PUBLIC_PREFIX.length), contentType: MIME[file.path.split('.').at(-1)] }))
}

export function assertDraftOrigin(origin, deploymentId) {
  must(/^[a-f0-9]{24}$/.test(deploymentId ?? ''), 'An exact Netlify deployment ID is required')
  const url = new URL(origin)
  must(url.protocol === 'https:' && !url.port && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash && url.origin === origin && new RegExp(`^${deploymentId}--[a-z0-9-]+\\.netlify\\.app$`).test(url.hostname), 'Only the independently verified immutable draft origin is allowed')
  return url.origin
}

export function assertMediaOrigin(origin, deploymentId, mode = 'draft') {
  must(['draft', 'published'].includes(mode), 'Unknown media verification mode')
  if (mode === 'draft') return assertDraftOrigin(origin, deploymentId)
  must(/^[a-f0-9]{24}$/.test(deploymentId ?? '') && origin === 'https://dailyclarity.org', 'Published media verification requires the exact production origin and deployment identity')
  return origin
}

export function browserReadAllowed(requestUrl, method, origin) {
  try { return ['GET', 'HEAD'].includes(method) && new URL(requestUrl).origin === origin }
  catch { return false }
}

export async function readMediaAsset(origin, file, mediaVersion, fetchImpl = fetch) {
  const response = await fetchImpl(new URL(versioned(file.path, mediaVersion), origin), {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(60_000),
    headers: { 'cache-control': 'no-cache' },
  })
  must(response.status === 200 && !response.redirected, `Media fetch failed: ${file.path}`)
  const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  must(contentType === file.contentType, `Incorrect media content type: ${file.path}`)
  const declared = response.headers.get('content-length')
  const encoding = (response.headers.get('content-encoding') ?? 'identity').trim().toLowerCase()
  must(['identity', 'gzip', 'deflate', 'br'].includes(encoding), `Unsupported media content encoding: ${file.path}`)
  // Fetch decodes supported compression, but Content-Length describes the coded
  // transfer. Always verify the decoded stream's exact sealed length and hash.
  must(declared === null || (/^[0-9]+$/.test(declared) && Number.isSafeInteger(Number(declared)) && Number(declared) > 0 && Number(declared) <= 20_000_000), `Invalid declared media size: ${file.path}`)
  must(declared === null || encoding !== 'identity' || Number(declared) === file.bytes, `Incorrect declared media size: ${file.path}`)
  must(response.body, `Media response has no body: ${file.path}`)
  const reader = response.body.getReader(), chunks = []
  let bytes = 0
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      bytes += next.value.byteLength
      must(bytes <= file.bytes, `Media response exceeds its sealed size: ${file.path}`)
      chunks.push(Buffer.from(next.value))
    }
  } finally { await reader.cancel().catch(() => {}) }
  const body = Buffer.concat(chunks)
  const sha256 = digest(body)
  must(bytes === file.bytes && sha256 === file.sha256, `Media bytes differ from the reviewed source: ${file.path}`)
  return { path: file.path, status: response.status, bytes, sha256, contentType }
}

export function assertMediaReport(report, { manifest, origin, sourceSha, recordHash, deploymentId, mode = 'draft' }) {
  assertMediaOrigin(origin, deploymentId, mode)
  const files = mediaSpecification(manifest)
  must(report?.version === 1 && report.passed === true && report.origin === origin && report.sourceSha === sourceSha && sourceSha === manifest.sourceSha && report.recordHash === recordHash && HASH.test(recordHash ?? '') && report.deploymentId === deploymentId && report.mediaVersion === manifest.mediaVersion && Number.isFinite(Date.parse(report.checkedAt)), 'Media report identity is invalid')
  must(Array.isArray(report.assetChecks) && report.assetChecks.length === 24 && new Set(report.assetChecks.map(item => item.path)).size === 24, 'Media report must contain every asset exactly once')
  for (const file of files) {
    const actual = report.assetChecks.find(item => item.path === file.path)
    must(actual?.status === 200 && actual.bytes === file.bytes && actual.sha256 === file.sha256 && actual.contentType === file.contentType, 'Media report has incomplete or mismatched asset evidence')
  }
  must(Array.isArray(report.routeChecks) && report.routeChecks.length === 16 && new Set(report.routeChecks.map(item => `${item.viewport}:${item.path}`)).size === 16, 'Media report must cover all eight routes on both viewports')
  for (const viewport of VIEWPORTS) for (const route of ROUTES) {
    const actual = report.routeChecks.find(item => item.path === route && item.viewport === viewport.name)
    must(actual?.status === 200 && actual.headingVisible === true && actual.videoVisible === true && actual.controls === true && actual.playsInline === true && actual.sourceMatched === true && actual.posterMatched === true && actual.captionsMatched === true && actual.transcriptMatched === true && actual.noHorizontalOverflow === true, 'Media report has an incomplete route observation')
  }
  must(Array.isArray(report.playbackChecks) && report.playbackChecks.length === 12 && new Set(report.playbackChecks.map(item => `${item.viewport}:${item.path}`)).size === 12, 'Media report must cover all six videos on both viewports')
  for (const viewport of VIEWPORTS) for (const video of VIDEO_SPECS) {
    const actual = report.playbackChecks.find(item => item.path === video.route && item.viewport === viewport.name)
    must(actual?.played === true && actual.seeked === true && actual.captionsLoaded === true && actual.transcriptMatched === true && Number.isFinite(actual.duration) && actual.duration > 10 && Number.isFinite(actual.playedSeconds) && actual.playedSeconds >= 0.15 && Number.isFinite(actual.seekTarget) && actual.seekTarget > 0 && actual.seekTarget < actual.duration && Number.isFinite(actual.seekTime) && Math.abs(actual.seekTime - actual.seekTarget) <= 0.5 && Number.isSafeInteger(actual.captionCues) && actual.captionCues > 0 && actual.videoWidth > 0 && actual.videoHeight > 0, 'Media report has incomplete playback evidence')
  }
  return report
}

export async function verifyDemoMaintenanceMedia({ manifest, origin, sourceSha, recordHash, deploymentId, mode = 'draft', clock = () => new Date(), fetchImpl = fetch, browserType }) {
  assertMediaOrigin(origin, deploymentId, mode)
  must(sourceSha === manifest.sourceSha && HASH.test(recordHash ?? ''), 'Media review must bind the prepared source and record')
  const files = mediaSpecification(manifest)
  const assetChecks = []
  for (const file of files) assetChecks.push(await readMediaAsset(origin, file, manifest.mediaVersion, fetchImpl))
  const chromium = browserType ?? require('@playwright/test').chromium
  const browser = await chromium.launch({ headless: true })
  const routeChecks = [], playbackChecks = []
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, serviceWorkers: 'block' })
      try {
        await context.route('**/*', route => browserReadAllowed(route.request().url(), route.request().method(), origin) ? route.continue() : route.abort('blockedbyclient'))
        const page = await context.newPage()
        page.setDefaultTimeout(30_000)
        for (const routePath of ROUTES) {
          const video = VIDEO_SPECS.find(item => item.route === routePath) ?? VIDEO_SPECS[0]
          const stem = `/demo-videos/${video.stem}-walkthrough`
          const expected = {
            src: new URL(versioned(`${stem}.mp4`, manifest.mediaVersion), origin).href,
            poster: new URL(versioned(`/demo-videos/posters/${video.stem}-walkthrough.jpg`, manifest.mediaVersion), origin).href,
            captions: new URL(versioned(`${stem}.vtt`, manifest.mediaVersion), origin).href,
            transcript: new URL(versioned(`${stem}.txt`, manifest.mediaVersion), origin).href,
          }
          const response = await page.goto(new URL(routePath, origin).href, { waitUntil: 'domcontentloaded', timeout: 60_000 })
          must(response?.status() === 200 && new URL(page.url()).origin === origin && new URL(page.url()).pathname === routePath, `Demo route failed: ${routePath}`)
          const player = page.locator('video').first()
          await player.scrollIntoViewIfNeeded()
          await player.waitFor({ state: 'visible' })
          await page.waitForFunction(() => { const video = document.querySelector('video'); return Boolean(video && video.readyState >= 1 && !video.error && Number.isFinite(video.duration)) }, null, { timeout: 60_000 })
          const observed = await player.evaluate((element, expected) => {
            const track = element.querySelector('track[kind="captions"]')
            const transcript = element.closest('figure')?.querySelector('a[href]')
            return {
              controls: element.controls, playsInline: element.playsInline,
              sourceMatched: element.currentSrc === expected.src,
              posterMatched: element.poster === expected.poster,
              captionsMatched: track?.src === expected.captions && track.srclang === 'en',
              transcriptMatched: transcript?.href === expected.transcript,
              noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
            }
          }, expected)
          const headingVisible = await page.locator('h1').first().isVisible()
          const videoVisible = await player.isVisible()
          must(headingVisible && videoVisible && Object.values(observed).every(value => value === true), `Demo player or accessibility companions do not match: ${routePath}`)
          routeChecks.push({ path: routePath, viewport: viewport.name, status: response.status(), headingVisible, videoVisible, ...observed })
          if (!VIDEO_SPECS.some(item => item.route === routePath)) continue
          const playback = await player.evaluate(async element => {
            element.muted = true
            if (element.textTracks[0]) element.textTracks[0].mode = 'showing'
            const before = element.currentTime
            await element.play()
            await new Promise((resolve, reject) => {
              const deadline = Date.now() + 20_000
              const check = () => {
                if (element.error) return reject(new Error('Playback failed'))
                if (element.currentTime - before >= 0.2) return resolve()
                if (Date.now() >= deadline) return reject(new Error('Playback did not advance'))
                setTimeout(check, 40)
              }
              check()
            })
            element.pause()
            const playedSeconds = element.currentTime - before
            const seekTarget = Math.min(element.duration * 0.55, element.duration - 1)
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => { element.removeEventListener('seeked', done); reject(new Error('Seek timed out')) }, 20_000)
              const done = () => { clearTimeout(timeout); resolve() }
              element.addEventListener('seeked', done, { once: true })
              element.currentTime = seekTarget
            })
            const track = element.querySelector('track[kind="captions"]')
            await new Promise((resolve, reject) => {
              const deadline = Date.now() + 20_000
              const check = () => {
                if (track?.readyState === 2 && track.track.cues?.length > 0) return resolve()
                if (track?.readyState === 3 || Date.now() >= deadline) return reject(new Error('Captions did not load'))
                setTimeout(check, 40)
              }
              check()
            })
            return {
              duration: element.duration, played: playedSeconds >= 0.15, playedSeconds,
              seekTarget, seekTime: element.currentTime, seeked: Math.abs(element.currentTime - seekTarget) <= 0.5,
              captionsLoaded: track.readyState === 2, captionCues: track.track.cues.length,
              videoWidth: element.videoWidth, videoHeight: element.videoHeight,
            }
          })
          const transcriptLink = page.getByRole('link', { name: 'Read the transcript', exact: true })
          must(await transcriptLink.isVisible(), 'Transcript link is not visible')
          await transcriptLink.click()
          await page.waitForURL(expected.transcript)
          const body = (await page.locator('body').innerText()).replace(/\r\n/g, '\n').trim()
          must(body.length > 100, 'Browser did not render a readable transcript')
          playbackChecks.push({ path: routePath, viewport: viewport.name, ...playback, transcriptMatched: page.url() === expected.transcript })
        }
      } finally { await context.close() }
    }
  } finally { await browser.close() }
  const report = { version: 1, checkedAt: clock().toISOString(), origin, deploymentId, sourceSha, recordHash, mediaVersion: manifest.mediaVersion, assetChecks, routeChecks, playbackChecks, passed: true }
  return assertMediaReport(report, { manifest, origin, sourceSha, recordHash, deploymentId, mode })
}
