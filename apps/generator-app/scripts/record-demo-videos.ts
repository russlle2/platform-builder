/**
 * Record all DailyClarity demo walkthroughs.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/record-demo-videos.ts
 * Output: apps/generator-app/public/demo-videos/
 */
import { chromium } from '@playwright/test'
import type { Page, BrowserContext } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { spawnSync } from 'child_process'
import { SCENARIOS, type DemoScenario } from './demo-scenarios'
import { captionsForScenario, writeAssCaptions } from './demo-captions'

const BASE_URL = process.env.BASE_URL || 'https://dailyclarity.org'
const PREVIEW_URL = `${BASE_URL}/preview-your-business?demoRecord=1`
const VIEWPORT = { width: 1920, height: 1080 }
const HEADLESS = process.env.HEADLESS === '1' || process.env.HEADLESS === 'true'
const APP_ROOT = path.resolve(__dirname, '..')
const RAW_DIR = path.join(APP_ROOT, 'test-results', 'demo-recordings', 'raw')
const OUT_DIR = path.join(APP_ROOT, 'public', 'demo-videos')
const CAPTION_DIR = path.join(APP_ROOT, 'test-results', 'demo-recordings', 'captions')
const SPEED = 1.35
const CRF = 22

function findFfmpeg(): string | null {
  const fromEnv = process.env.FFMPEG_PATH?.trim()
  const candidates = fromEnv ? [fromEnv, 'ffmpeg', 'ffmpeg.exe'] : ['ffmpeg', 'ffmpeg.exe']
  for (const c of candidates) {
    try {
      if (path.isAbsolute(c)) fs.accessSync(c)
    } catch {
      /* try PATH lookup below */
    }
    const res = spawnSync(c, ['-version'], { stdio: 'pipe' })
    if (res.status === 0) return c
  }
  return null
}

const FFMPEG = findFfmpeg()

async function pause(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function waitAndPause(page: Page, ms = 1200) {
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await pause(ms)
}

async function safeClick(page: Page, selector: string, timeout = 8000): Promise<boolean> {
  try {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout })
    await page.locator(selector).first().click()
    return true
  } catch {
    console.warn(`  [skip] safeClick not found: ${selector}`)
    return false
  }
}

async function clickByText(page: Page, text: string, tag = '*', timeout = 8000): Promise<boolean> {
  try {
    const loc = page.locator(`${tag}:has-text("${text}")`).first()
    await loc.waitFor({ state: 'visible', timeout })
    await loc.click()
    return true
  } catch {
    console.warn(`  [skip] clickByText not found: "${text}"`)
    return false
  }
}

async function fillByLabelOrPlaceholder(
  page: Page,
  label: string,
  value: string,
): Promise<boolean> {
  const byLabel = page.getByLabel(label, { exact: false })
  if ((await byLabel.count()) > 0) {
    await byLabel.first().waitFor({ state: 'visible', timeout: 12000 })
    await byLabel.first().click()
    await byLabel.first().fill(value)
    return true
  }
  const byPH = page.getByPlaceholder(label, { exact: false })
  if ((await byPH.count()) > 0) {
    await byPH.first().waitFor({ state: 'visible', timeout: 12000 })
    await byPH.first().click()
    await byPH.first().fill(value)
    return true
  }
  console.warn(`  [skip] fill not found: "${label}"`)
  return false
}

async function selectNiche(page: Page, niche: string) {
  const nicheLabel: Record<string, string> = {
    wellness_coach: 'Wellness Coach',
    aromatherapy: 'Aromatherapy',
    holistic_medicine: 'Holistic Medicine',
    private_practice_therapist: 'Private Practice Therapist',
    sound_bath: 'Sound Bath',
  }
  await clickByText(page, nicheLabel[niche] || niche, 'button')
  await pause(400)
}

async function selectVibes(page: Page, vibes: string[]) {
  for (const v of vibes) {
    await clickByText(page, v, 'button')
    await pause(400)
  }
}

async function completeInfoStep(page: Page, s: DemoScenario) {
  console.log('  → Filling business info...')
  await selectNiche(page, s.niche)

  const fields: [string, string][] = [
    ['Business Name', s.businessName],
    ['Owner / Contact Name', s.ownerName],
    ['Email', s.email],
    ['Phone', s.phone],
    ['Address / Service Area', s.address],
    ['Tagline', s.tagline],
    ['Services (comma-separated)', s.services],
  ]
  for (const [label, val] of fields) {
    await fillByLabelOrPlaceholder(page, label, val)
    await pause(180)
  }

  const ta = page.locator('textarea').first()
  if (await ta.isVisible().catch(() => false)) {
    await ta.click()
    await ta.fill('')
    for (const ch of s.description) {
      await page.keyboard.type(ch)
      await pause(26)
    }
    await pause(200)
  }

  await pause(500)
  const continued =
    (await clickByText(page, 'Continue to Style Preferences', 'button')) ||
    (await safeClick(page, 'button:has-text("Continue to Style")'))
  if (!continued) await safeClick(page, 'button:has-text("Continue")')
  await pause(1000)
}

async function completeStyleStep(page: Page, s: DemoScenario) {
  console.log('  → Selecting style preferences...')
  await selectVibes(page, s.vibes)

  const toneLabel = s.writingTone
  if (!(await clickByText(page, toneLabel, 'button'))) {
    await clickByText(page, toneLabel, '*')
  }
  await pause(400)

  const colorPick = s.vibes.includes('Earthy')
    ? 'Nature & Organic'
    : s.vibes.includes('Clean')
      ? 'Cool & Modern'
      : s.vibes.includes('Luxurious')
        ? 'Dark & Elegant'
        : 'Nature & Organic'
  await clickByText(page, colorPick, 'button')
  await pause(400)
  await clickByText(page, 'Serif', 'button')
  await pause(300)
  await clickByText(page, 'Spacious', 'button')
  await pause(300)
  await pause(400)
  const found =
    (await clickByText(page, 'Find My Perfect Template', 'button')) ||
    (await safeClick(page, 'button:has-text("Find My")'))
  if (!found) await safeClick(page, 'button:has-text("Template")')
  await pause(500)
}

async function showMatchedTemplate(page: Page) {
  console.log('  → Waiting for template match...')
  await page.locator('.animate-spin').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {})
  await page.locator('button:has-text("Customize")').waitFor({ timeout: 30000 }).catch(() => {})
  await pause(1500)
}

/** Pin the preview iframe to the top of the viewport (demoRecord layout). */
async function pinPreviewToViewport(page: Page) {
  await page.evaluate(() => {
    const iframe = document.querySelector('iframe[title="Template preview"]') as HTMLElement | null
    if (!iframe) return
    const top = window.scrollY + iframe.getBoundingClientRect().top - 56
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
  })
  await pause(600)
}

/** Scroll inside the template iframe so the recording shows real page content. */
async function scrollInsidePreview(page: Page, steps: number, fraction = 0.42) {
  await page.evaluate(() => {
    const win = (document.querySelector('iframe[title="Template preview"]') as HTMLIFrameElement)
      ?.contentWindow
    win?.scrollTo({ top: 0, behavior: 'instant' })
  })
  await pause(400)
  for (let i = 0; i < steps; i++) {
    await page.evaluate((frac) => {
      const win = (document.querySelector('iframe[title="Template preview"]') as HTMLIFrameElement)
        ?.contentWindow
      if (!win) return
      const step = Math.max(180, win.innerHeight * frac)
      win.scrollBy({ top: step, behavior: 'instant' })
    }, fraction)
    await pause(1100)
  }
}

async function hoverPreviewCenter(page: Page) {
  const preview = page.locator('iframe[title="Template preview"]')
  try {
    const box = await preview.boundingBox({ timeout: 8000 })
    if (!box) return
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.45)
  } catch {
    console.warn('  [skip] preview iframe not visible for hover')
  }
}

/** Maximize visible preview area: tall iframe, in-frame scroll, multi-page tour. */
async function showcaseWebsitePreview(page: Page) {
  const preview = page.locator('iframe[title="Template preview"]')
  await preview.waitFor({ state: 'visible', timeout: 35000 })
  await pause(2000)

  await pinPreviewToViewport(page)
  await hoverPreviewCenter(page)
  await pause(1200)

  console.log('  → Showcasing website (scroll through live template)...')
  await scrollInsidePreview(page, 5, 0.38)
  await pause(1800)
  await scrollInsidePreview(page, 6, 0.45)
  await pause(2000)

  await page.evaluate(() => {
    const win = (document.querySelector('iframe[title="Template preview"]') as HTMLIFrameElement)
      ?.contentWindow
    if (!win) return
    const max = win.document.documentElement.scrollHeight - win.innerHeight
    win.scrollTo({ top: Math.max(0, max * 0.35), behavior: 'instant' })
  })
  await pause(2500)

  const templatePages = ['index', 'about', 'services', 'contact']
  for (const pageName of templatePages) {
    const tab = page.getByRole('button', { name: new RegExp(`^${pageName}$`, 'i') })
    if (!(await tab.isVisible().catch(() => false))) continue
    console.log(`  → Preview page: ${pageName}`)
    await tab.click()
    await pause(4500)
    await pinPreviewToViewport(page)
    await hoverPreviewCenter(page)
    await scrollInsidePreview(page, 5, 0.4)
    await pause(2000)
    await scrollInsidePreview(page, 4, 0.35)
    await pause(1500)
    await page.evaluate(() => {
      const win = (document.querySelector('iframe[title="Template preview"]') as HTMLIFrameElement)
        ?.contentWindow
      win?.scrollTo({ top: 0, behavior: 'instant' })
    })
    await pause(1000)
  }

  await pinPreviewToViewport(page)
  await hoverPreviewCenter(page)
  await scrollInsidePreview(page, 3, 0.3)
  await pause(2500)
}

async function openEditor(page: Page) {
  console.log('  → Opening editor...')
  const customize = page.getByRole('button', { name: /Customize This Template/i })
  if (await customize.isVisible({ timeout: 8000 }).catch(() => false)) {
    await customize.click()
  } else {
    await clickByText(page, 'Customize', 'button')
  }
  await pause(1000)
  try {
    await showcaseWebsitePreview(page)
  } catch (err) {
    console.warn('  [warn] preview showcase partial:', err instanceof Error ? err.message : err)
  }
}

async function showPricingAndWelcomeFlow(page: Page, slug: string) {
  console.log('  → Showing pricing (Basic vs Security + Ads)...')
  const purchaseLink = page.locator('a:has-text("Purchase"), a:has-text("Launch")').first()
  if (await purchaseLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await purchaseLink.click()
    await page.waitForURL('**/pricing**', { timeout: 15000 }).catch(() => {})
  } else {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' })
  }
  await pause(2000)
  // Scroll through both plan cards so viewers see the $20 / $80 divide.
  const basicCard = page.getByRole('heading', { name: /^Basic$/i }).first()
  if (await basicCard.isVisible({ timeout: 4000 }).catch(() => false)) {
    await basicCard.scrollIntoViewIfNeeded()
    await pause(1500)
  }
  await page.mouse.wheel(0, 500)
  await pause(1500)
  const premiumCard = page.getByRole('heading', { name: /Security \+ Ads/i }).first()
  if (await premiumCard.isVisible({ timeout: 4000 }).catch(() => false)) {
    await premiumCard.scrollIntoViewIfNeeded()
    await pause(2000)
  }
  await page.mouse.wheel(0, -300)
  await pause(1000)

  console.log('  → Success page...')
  await page.goto(`${BASE_URL}/success`, { waitUntil: 'domcontentloaded' })
  await pause(2200)

  console.log('  → Portal...')
  await page.goto(`${BASE_URL}/portal?slug=${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded' })
  await pause(2200)
}

function convertWithFfmpegIfAvailable(rawPath: string, outPath: string, scenarioId: string): boolean {
  if (!FFMPEG) {
    console.log(`\n  [ffmpeg not found] Manual convert:\n  ffmpeg -y -i "${rawPath}" ... "${outPath}"\n`)
    const webmOut = outPath.replace(/\.mp4$/, '.webm')
    fs.copyFileSync(rawPath, webmOut)
    return false
  }

  fs.mkdirSync(CAPTION_DIR, { recursive: true })
  const assPath = path.join(CAPTION_DIR, `${scenarioId}.ass`)
  writeAssCaptions(captionsForScenario(scenarioId), assPath, SPEED)
  const assEscaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')

  let durationSec = 90
  try {
    const probe = spawnSync(FFMPEG, ['-i', rawPath], { encoding: 'utf8', stdio: 'pipe' })
    const combined = (probe.stdout || '') + (probe.stderr || '')
    const m = combined.match(/Duration: (\d+):(\d+):([\d.]+)/)
    if (m) durationSec = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])
  } catch {}

  const outDuration = durationSec / SPEED
  const fadeStart = Math.max(outDuration - 1.5, outDuration * 0.93)
  const filter = [
    `setpts=${(1 / SPEED).toFixed(4)}*PTS`,
    `fade=t=in:st=0:d=0.5:color=black`,
    `fade=t=out:st=${fadeStart.toFixed(1)}:d=1.0:color=black`,
    `subtitles='${assEscaped}'`,
  ].join(',')

  const args = [
    '-y',
    '-i',
    rawPath,
    '-vf',
    filter,
    '-r',
    '30',
    '-c:v',
    'libx264',
    '-profile:v',
    'baseline',
    '-level:v',
    '4.0',
    '-pix_fmt',
    'yuv420p',
    '-colorspace',
    'bt709',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-crf',
    String(CRF),
    '-movflags',
    '+faststart',
    outPath,
  ]

  console.log(`  Converting (${SPEED}x)...`)
  const result = spawnSync(FFMPEG, args, { stdio: 'inherit' })
  if (result.status === 0) {
    const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1)
    console.log(`  ✓ ${path.basename(outPath)} (${mb} MB, ~${Math.round(outDuration)}s)`)
    return true
  }
  return false
}

async function recordScenario(s: DemoScenario, scenarioRawDir: string): Promise<string> {
  console.log(`\n${'─'.repeat(60)}\nRecording: ${s.outputName} (${new Date().toLocaleTimeString()})\n${'─'.repeat(60)}`)

  const browser = await chromium.launch({ headless: HEADLESS })
  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: scenarioRawDir, size: VIEWPORT },
  })
  const page = await context.newPage()

  try {
    if (s.id === 'platform-builder') {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await waitAndPause(page, 2000)
      await page.mouse.wheel(0, 300)
      await pause(800)
      await page.mouse.wheel(0, -300)
      await pause(1000)
      const cta = page.getByRole('link', { name: /Preview Your Business/i }).first()
      if (await cta.isVisible().catch(() => false)) {
        await cta.click()
        await page.waitForURL('**/preview-your-business**', { timeout: 15000 }).catch(() => {})
      } else {
        await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded' })
      }
      await waitAndPause(page, 1200)
    } else {
      await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded' })
      await waitAndPause(page, 1200)
    }

    await page.getByLabel('Business Name', { exact: false }).first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})

    await completeInfoStep(page, s)
    await completeStyleStep(page, s)
    await showMatchedTemplate(page)
    await openEditor(page)
    await showPricingAndWelcomeFlow(page, s.sampleSlug)
  } catch (err) {
    console.error(`  [error]`, err)
  }

  const video = page.video()
  await context.close()
  await browser.close()

  const rawPath = await video?.path()
  if (!rawPath || !fs.existsSync(rawPath)) throw new Error(`No video for ${s.id}`)
  return rawPath
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const only = process.env.DEMO_ONLY?.split(',').map((s) => s.trim()).filter(Boolean)
  const toRun = only?.length
    ? SCENARIOS.filter((s) => only.includes(s.id) || only.includes(s.outputName))
    : SCENARIOS

  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Preview:  ${PREVIEW_URL}`)
  console.log(`Output:   ${OUT_DIR}`)
  console.log(`Headless: ${HEADLESS} (set HEADLESS=0 to show browser)`)
  console.log(`FFmpeg:   ${FFMPEG || 'NOT FOUND — set FFMPEG_PATH'}`)
  console.log(`Scenarios: ${toRun.length} (~${toRun.length * 2}–${toRun.length * 3} min total)\n`)

  const results: { name: string; ok: boolean }[] = []

  for (const scenario of toRun) {
    const scenarioRawDir = path.join(RAW_DIR, scenario.id)
    fs.mkdirSync(scenarioRawDir, { recursive: true })
    try {
      const rawPath = await recordScenario(scenario, scenarioRawDir)
      const outPath = path.join(OUT_DIR, `${scenario.outputName}.mp4`)
      const ok = convertWithFfmpegIfAvailable(rawPath, outPath, scenario.id)
      results.push({ name: scenario.outputName, ok })
    } catch (err) {
      console.error(`FAILED ${scenario.id}:`, err)
      results.push({ name: scenario.outputName, ok: false })
    }
  }

  console.log('\n' + '═'.repeat(50))
  for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}`)
  console.log(`\nDone → ${OUT_DIR}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
