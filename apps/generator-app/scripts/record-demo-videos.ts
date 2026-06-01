/**
 * Record all DailyClarity demo walkthroughs.
 * Usage: npx tsx scripts/record-demo-videos.ts
 * Output: apps/generator-app/public/demo-videos/
 */
import { chromium } from '@playwright/test'
import type { Page, BrowserContext } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { execSync, spawnSync } from 'child_process'
import { SCENARIOS, type DemoScenario } from './demo-scenarios'

const BASE_URL = process.env.BASE_URL || 'https://dailyclarity.org'
const VIEWPORT = { width: 1440, height: 1000 }
const APP_ROOT = path.resolve(__dirname, '..')
const RAW_DIR = path.join(APP_ROOT, 'test-results', 'demo-recordings', 'raw')
const OUT_DIR = path.join(APP_ROOT, 'public', 'demo-videos')
const SPEED = 1.7
const CRF = 28

// ─── FFmpeg detection ──────────────────────────────────────────────────────

function findFfmpeg(): string | null {
  const candidates = [
    'C:\\Users\\chris\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe',
    'ffmpeg',
    'ffmpeg.exe',
  ]
  for (const c of candidates) {
    try {
      fs.accessSync(c)
      return c
    } catch {
      const res = spawnSync(c, ['-version'], { stdio: 'pipe' })
      if (res.status === 0) return c
    }
  }
  return null
}

const FFMPEG = findFfmpeg()

// ─── Helpers ───────────────────────────────────────────────────────────────

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
  slow = true,
): Promise<boolean> {
  // Try by label text first
  const byLabel = page.getByLabel(label, { exact: false })
  if (await byLabel.count() > 0) {
    await byLabel.first().click()
    await byLabel.first().fill('')
    if (slow) {
      for (const ch of value) { await page.keyboard.type(ch); await pause(40) }
    } else {
      await byLabel.first().fill(value)
    }
    return true
  }
  // Try by placeholder
  const byPH = page.getByPlaceholder(label, { exact: false })
  if (await byPH.count() > 0) {
    await byPH.first().click()
    await byPH.first().fill('')
    if (slow) {
      for (const ch of value) { await page.keyboard.type(ch); await pause(40) }
    } else {
      await byPH.first().fill(value)
    }
    return true
  }
  console.warn(`  [skip] fillByLabelOrPlaceholder not found: "${label}"`)
  return false
}

async function selectNiche(page: Page, niche: string) {
  // Niche buttons use the label text (e.g. "Wellness Coach", "Aromatherapy")
  const nicheLabel: Record<string, string> = {
    wellness_coach: 'Wellness Coach',
    aromatherapy: 'Aromatherapy',
    holistic_medicine: 'Holistic Medicine',
    private_practice_therapist: 'Private Practice Therapist',
    sound_bath: 'Sound Bath',
  }
  const label = nicheLabel[niche] || niche
  await clickByText(page, label, 'button')
  await pause(400)
}

async function selectVibes(page: Page, vibes: string[]) {
  // Description text is unique per vibe button — use that to avoid emoji+label ambiguity
  const vibeDesc: Record<string, string> = {
    Warm: 'Inviting, cozy, human',
    Bold: 'Strong, assertive, high-impact',
    Clean: 'Minimal, organized, crisp',
    Luxurious: 'Premium, sophisticated, refined',
    Earthy: 'Natural, grounded, organic',
    Playful: 'Creative, fun, approachable',
  }
  for (const v of vibes) {
    const desc = vibeDesc[v]
    if (desc) {
      await clickByText(page, desc, 'button')
    } else {
      await clickByText(page, v, 'button')
    }
    await pause(400)
  }
}

async function completeInfoStep(page: Page, s: DemoScenario) {
  console.log('  → Filling business info...')
  await selectNiche(page, s.niche)

  // Fields ordered by placeholder as they appear in InfoStep
  const fields: [string, string][] = [
    ['Acme Heating', s.businessName],
    ['Jane Smith', s.ownerName],
    ['hello@yourbusiness.com', s.email],
    ['(555) 123', s.phone],
    ['123 Main', s.address],
    ['Your comfort', s.tagline],
    ['AC Repair', s.services],
  ]
  for (const [ph, val] of fields) {
    await fillByLabelOrPlaceholder(page, ph, val)
    await pause(200)
  }

  // Textarea description
  const ta = page.locator('textarea').first()
  if (await ta.isVisible().catch(() => false)) {
    await ta.click()
    await ta.fill('')
    for (const ch of s.description) { await page.keyboard.type(ch); await pause(28) }
    await pause(200)
  }

  await pause(600)
  // Continue button
  const continued = await clickByText(page, 'Continue to Style', 'button')
  if (!continued) await safeClick(page, 'button:has-text("Continue")')
  await pause(1200)
}

async function completeStyleStep(page: Page, s: DemoScenario) {
  console.log('  → Selecting style preferences...')
  await selectVibes(page, s.vibes)

  // Writing tone — use description text to avoid ambiguity
  const toneDesc: Record<string, string> = {
    Professional: 'Polished, industry-standard language',
    Conversational: 'Friendly tone, like talking to a friend',
    Storytelling: 'Narrative-driven, brand-story focused',
    Minimal: 'Short, punchy, to-the-point',
    Authoritative: 'Expert voice, data-driven confidence',
  }
  const tDesc = toneDesc[s.writingTone]
  if (tDesc) {
    await clickByText(page, tDesc, 'button')
  } else {
    await clickByText(page, s.writingTone, 'button')
  }
  await pause(400)

  // Color mood — pick Nature & Organic for earthy/warm, Cool & Modern for clean, Dark & Elegant default
  const colorPick = s.vibes.includes('Earthy') ? 'Nature & Organic'
    : s.vibes.includes('Clean') ? 'Cool & Modern'
    : s.vibes.includes('Luxurious') ? 'Dark & Elegant'
    : 'Nature & Organic'
  await clickByText(page, colorPick, 'button')
  await pause(400)

  // Font & layout
  await clickByText(page, 'Serif', 'button')
  await pause(300)
  await clickByText(page, 'Spacious', 'button')
  await pause(300)

  await pause(400)
  const found = await clickByText(page, 'Find My Perfect Template', 'button')
  if (!found) await safeClick(page, 'button:has-text("Find My")')
  await pause(600)
}

async function showMatchedTemplate(page: Page) {
  console.log('  → Waiting for template match...')
  await page.locator('.animate-spin').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {})
  await page.locator('button:has-text("Customize")').waitFor({ timeout: 30000 }).catch(() => {})
  await pause(2500)
}

async function openEditor(page: Page) {
  console.log('  → Opening editor...')
  const clicked = await clickByText(page, 'Customize This Template', 'button')
  if (!clicked) await clickByText(page, 'Customize', 'button')
  await pause(800)

  // Wait for iframe
  await page.locator('iframe[title="Template preview"]').waitFor({ timeout: 25000 }).catch(() => {})
  await pause(3500)

  // Scroll to show preview
  await page.mouse.wheel(0, 350)
  await pause(1000)
  await page.mouse.wheel(0, 350)
  await pause(1200)
  await page.mouse.wheel(0, -700)
  await pause(900)

  // Open colors panel and pick a preset
  const colorBtn = page.locator('button:has-text("Colors")').first()
  if (await colorBtn.isVisible().catch(() => false)) {
    await colorBtn.click()
    await pause(1000)
    const forestBtn = page.locator('button:has-text("Forest")').first()
    if (await forestBtn.isVisible().catch(() => false)) {
      await forestBtn.click()
      await pause(800)
    }
    await colorBtn.click()
    await pause(600)
  }

  await pause(1000)
}

async function showPricingAndWelcomeFlow(page: Page, slug: string) {
  console.log('  → Showing pricing...')
  // Click Purchase & Launch if visible, else navigate directly
  const purchaseLink = page.locator('a:has-text("Purchase"), a:has-text("Launch")').first()
  if (await purchaseLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await purchaseLink.click()
    await page.waitForURL('**/pricing**', { timeout: 15000 }).catch(() => {})
  } else {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' })
  }
  await pause(2000)

  // Scroll pricing cards
  await page.mouse.wheel(0, 450)
  await pause(1200)
  await page.mouse.wheel(0, -450)
  await pause(1000)

  // Hover on a plan CTA without clicking
  const planBtn = page.locator('button:has-text("Get Started"), a:has-text("Get Started")').first()
  if (await planBtn.isVisible().catch(() => false)) {
    await planBtn.hover()
    await pause(1500)
  }

  // Success page
  console.log('  → Showing success/welcome page...')
  await page.goto(`${BASE_URL}/success`, { waitUntil: 'domcontentloaded' })
  await pause(3000)
  await page.mouse.wheel(0, 300)
  await pause(1000)
  await page.mouse.wheel(0, -300)
  await pause(1200)

  // Portal page with slug
  console.log('  → Showing portal...')
  await page.goto(`${BASE_URL}/portal?slug=${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded' })
  await pause(3000)
  await page.mouse.wheel(0, 400)
  await pause(1000)
  await page.mouse.wheel(0, -400)
  await pause(1500)
}

// ─── FFmpeg conversion ─────────────────────────────────────────────────────

function convertWithFfmpegIfAvailable(rawPath: string, outPath: string): boolean {
  if (!FFMPEG) {
    console.log(`\n  [ffmpeg not found] To convert manually:\n`)
    console.log(`  ffmpeg -y -i "${rawPath}" \\`)
    console.log(`    -vf "setpts=${(1 / SPEED).toFixed(4)}*PTS,fade=t=in:st=0:d=0.5:color=black" \\`)
    console.log(`    -r 30 -c:v libx264 -profile:v baseline -level:v 4.0 \\`)
    console.log(`    -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \\`)
    console.log(`    -crf ${CRF} -movflags +faststart "${outPath}"\n`)
    // Copy webm to output dir as fallback
    const webmOut = outPath.replace(/\.mp4$/, '.webm')
    fs.copyFileSync(rawPath, webmOut)
    console.log(`  Saved raw .webm to: ${webmOut}`)
    return false
  }

  // Get duration for fade-out timing
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
  ].join(',')

  const args = [
    '-y', '-i', rawPath,
    '-vf', filter,
    '-r', '30',
    '-c:v', 'libx264',
    '-profile:v', 'baseline',
    '-level:v', '4.0',
    '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-crf', String(CRF),
    '-movflags', '+faststart',
    outPath,
  ]

  console.log(`  Converting with FFmpeg (${SPEED}x speed, CRF ${CRF})...`)
  const result = spawnSync(FFMPEG, args, { stdio: 'inherit' })
  if (result.status === 0) {
    const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1)
    console.log(`  ✓ ${path.basename(outPath)} (${mb} MB, ~${Math.round(outDuration)}s)`)
    return true
  } else {
    console.error(`  ✗ FFmpeg failed for ${path.basename(outPath)}`)
    return false
  }
}

// ─── Record one scenario ───────────────────────────────────────────────────

async function recordScenario(s: DemoScenario, scenarioRawDir: string): Promise<string> {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Recording: ${s.outputName}`)
  console.log(`${'─'.repeat(60)}`)

  const browser = await chromium.launch({ headless: false })
  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: scenarioRawDir, size: VIEWPORT },
  })

  const page = await context.newPage()

  try {
    // Homepage
    console.log('  → Homepage...')
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
      page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    )
    await waitAndPause(page, 2500)
    await page.mouse.wheel(0, 350)
    await pause(1000)
    await page.mouse.wheel(0, 400)
    await pause(1000)
    await page.mouse.wheel(0, -800)
    await pause(1500)

    // Navigate to intake wizard
    console.log('  → Navigating to intake...')
    await page.goto(`${BASE_URL}/preview-your-business`, { waitUntil: 'domcontentloaded' })
    await waitAndPause(page, 1500)

    await completeInfoStep(page, s)
    await completeStyleStep(page, s)
    await showMatchedTemplate(page)
    await openEditor(page)
    await showPricingAndWelcomeFlow(page, s.sampleSlug)
  } catch (err) {
    console.error(`  [error] ${err}`)
  }

  const video = page.video()
  await context.close()
  await browser.close()

  const rawPath = await video?.path()
  if (!rawPath || !fs.existsSync(rawPath)) throw new Error(`No video file produced for ${s.id}`)
  return rawPath
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log(`Base URL:    ${BASE_URL}`)
  console.log(`Raw output:  ${RAW_DIR}`)
  console.log(`Final output:${OUT_DIR}`)
  console.log(`FFmpeg:      ${FFMPEG ?? 'NOT FOUND — will save .webm fallback'}`)
  console.log(`Speed:       ${SPEED}x | CRF: ${CRF}`)

  const results: { name: string; path: string; ok: boolean }[] = []

  for (const scenario of SCENARIOS) {
    const scenarioRawDir = path.join(RAW_DIR, scenario.id)
    fs.mkdirSync(scenarioRawDir, { recursive: true })

    let rawPath: string
    try {
      rawPath = await recordScenario(scenario, scenarioRawDir)
    } catch (err) {
      console.error(`FAILED to record ${scenario.id}:`, err)
      results.push({ name: scenario.outputName, path: '', ok: false })
      continue
    }

    const outPath = path.join(OUT_DIR, `${scenario.outputName}.mp4`)
    const ok = convertWithFfmpegIfAvailable(rawPath, outPath)
    results.push({ name: scenario.outputName, path: ok ? outPath : rawPath, ok })
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log('SUMMARY')
  console.log('═'.repeat(60))
  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}`)
    if (r.path) console.log(`    ${r.path}`)
  }

  const allOk = results.every((r) => r.ok)
  console.log(`\n${allOk ? '✅ All videos ready.' : '⚠️  Some videos need manual ffmpeg conversion — see logs above.'}`)
  console.log(`Final directory: ${OUT_DIR}\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
