/**
 * Demo recorder — captures the full intake → editor → pricing → welcome flow.
 * Uses Playwright video recording + FFmpeg post-processing.
 *
 * Run: npx tsx scripts/record-demo.ts
 * Output: C:\Users\chris\Desktop\dailyclarity-demo.mp4
 */
import { chromium } from '@playwright/test'
import path from 'path'
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'

const BASE_URL = 'https://dailyclarity.org'
const RAW_DIR = path.join(os.tmpdir(), 'dc-demo-raw')
const OUT_PATH = path.join(os.homedir(), 'Desktop', 'dailyclarity-demo.mp4')
const VIEWPORT = { width: 1440, height: 900 }

const DEMO = {
  businessName: 'Serene Mind Wellness',
  ownerName: 'Sarah Chen',
  email: 'hello@serenemind.com',
  phone: '(720) 555-0182',
  address: '2210 Pearl St, Boulder, CO 80302',
  tagline: 'Clarity begins within.',
  services: 'Wellness Coaching, Mindfulness Sessions, Life Coaching',
  description: 'We help busy professionals find calm, purpose, and renewed energy through personalized wellness coaching.',
}

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function typeField(page: import('@playwright/test').Page, placeholder: string, text: string) {
  const loc = page.getByPlaceholder(placeholder, { exact: false })
  await loc.waitFor({ state: 'visible', timeout: 10000 })
  await loc.click()
  await loc.fill('')
  for (const ch of text) {
    await page.keyboard.type(ch)
    await sleep(45)
  }
}

async function main() {
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true })

  console.log('Launching browser with video recording...')
  const browser = await chromium.launch({ headless: false })

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: RAW_DIR, size: VIEWPORT },
  })

  const page = await context.newPage()

  // ─── 1. HOMEPAGE ────────────────────────────────────────────────
  console.log('[1/7] Homepage...')
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await sleep(2500)

  // Scroll down to reveal features, then back up
  await page.mouse.wheel(0, 400)
  await sleep(1000)
  await page.mouse.wheel(0, 400)
  await sleep(1000)
  await page.mouse.wheel(0, 500)
  await sleep(1200)
  await page.mouse.wheel(0, -1400)
  await sleep(1500)

  // Click the hero CTA
  await page.getByRole('link', { name: 'Preview Your Business' }).first().click()
  await page.waitForURL('**/preview-your-business', { timeout: 15000 })
  await sleep(1500)

  // ─── 2. STEP 1 — BUSINESS INFO ──────────────────────────────────
  console.log('[2/7] Business info...')

  // Select niche: Wellness Coach
  await page.getByRole('button', { name: /Wellness Coach/i }).first().click()
  await sleep(600)

  await typeField(page, 'Acme Heating', DEMO.businessName)
  await sleep(300)

  await typeField(page, 'Jane Smith', DEMO.ownerName)
  await sleep(300)

  await typeField(page, 'hello@yourbusiness.com', DEMO.email)
  await sleep(300)

  await typeField(page, '(555) 123', DEMO.phone)
  await sleep(300)

  await typeField(page, '123 Main', DEMO.address)
  await sleep(300)

  await typeField(page, 'Your comfort', DEMO.tagline)
  await sleep(300)

  // Description textarea
  const textarea = page.getByPlaceholder('Tell us what makes your business unique')
  await textarea.waitFor({ state: 'visible', timeout: 8000 })
  await textarea.click()
  await textarea.fill('')
  for (const ch of DEMO.description) {
    await page.keyboard.type(ch)
    await sleep(30)
  }
  await sleep(300)

  await typeField(page, 'AC Repair', DEMO.services)
  await sleep(500)

  // Continue to Step 2
  await page.getByRole('button', { name: /Continue to Style/i }).click()
  await sleep(1500)

  // ─── 3. STEP 2 — STYLE & VIBE ───────────────────────────────────
  console.log('[3/7] Style & vibe...')

  // Vibes — use unique description text inside each button
  await page.locator('button:has-text("Inviting, cozy, human")').click()  // Warm
  await sleep(500)
  await page.locator('button:has-text("Natural, grounded, organic")').click()  // Earthy
  await sleep(500)

  // Conversational writing tone — unique description text
  await page.locator('button:has-text("Friendly tone, like talking to a friend")').click()
  await sleep(500)

  // Nature & Organic color mood
  await page.locator('button:has-text("Nature & Organic")').click()
  await sleep(500)

  // Serif fonts — button containing "Aa" with serif style label
  await page.locator('button:has-text("Serif")').first().click()
  await sleep(400)

  // Spacious layout
  await page.locator('button:has-text("Spacious")').click()
  await sleep(400)

  await sleep(600)

  // Find My Perfect Template
  await page.getByRole('button', { name: /Find My Perfect Template/i }).click()
  await sleep(400)

  // ─── 4. STEP 3 — MATCHING ───────────────────────────────────────
  console.log('[4/7] Template matching...')

  // Wait for spinner to disappear
  await page.locator('.animate-spin').waitFor({ state: 'hidden', timeout: 25000 }).catch(() => {})
  // Wait for the Customize button to appear
  await page.getByRole('button', { name: /Customize This Template/i }).waitFor({ timeout: 25000 })
  await sleep(2500)

  await page.getByRole('button', { name: /Customize This Template/i }).click()
  await sleep(800)

  // ─── 5. STEP 4 — EDITOR ─────────────────────────────────────────
  console.log('[5/7] Template editor...')

  // Wait for iframe
  await page.locator('iframe[title="Template preview"]').waitFor({ timeout: 25000 }).catch(() => {})
  await sleep(3500)

  // Scroll to show the preview
  await page.mouse.wheel(0, 350)
  await sleep(1200)
  await page.mouse.wheel(0, 350)
  await sleep(1500)
  await page.mouse.wheel(0, -700)
  await sleep(1000)

  // Open colors panel, pick Forest preset
  const colorBtn = page.getByRole('button', { name: /Colors/i }).first()
  await colorBtn.click()
  await sleep(1200)
  await page.getByRole('button', { name: /Forest/i }).first().click()
  await sleep(900)
  await colorBtn.click()
  await sleep(700)

  // Click Purchase & Launch link
  const purchaseLink = page.getByRole('link', { name: /Purchase.*Launch/i }).first()
  const hasPurchase = await purchaseLink.isVisible().catch(() => false)
  if (hasPurchase) {
    await purchaseLink.click()
    await page.waitForURL('**/pricing**', { timeout: 15000 })
    await sleep(2000)
  } else {
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle' })
    await sleep(2000)
  }

  // ─── 6. PRICING PAGE ────────────────────────────────────────────
  console.log('[6/7] Pricing page...')

  await sleep(1000)
  await page.mouse.wheel(0, 450)
  await sleep(1200)
  await page.mouse.wheel(0, 450)
  await sleep(1200)
  await page.mouse.wheel(0, -900)
  await sleep(1000)

  // Hover over a plan CTA to show intent
  const planBtn = page.getByRole('button', { name: /Get Started|Subscribe|Start/i }).first()
  if (await planBtn.isVisible().catch(() => false)) {
    await planBtn.hover()
    await sleep(1800)
  }

  await sleep(800)

  // Navigate to success page to show the welcome message (skips live Stripe)
  await page.goto(`${BASE_URL}/success`, { waitUntil: 'networkidle' })
  await sleep(500)

  // ─── 7. SUCCESS / WELCOME PAGE ──────────────────────────────────
  console.log('[7/7] Welcome / success page...')
  await sleep(3500)

  await page.mouse.wheel(0, 300)
  await sleep(1200)
  await page.mouse.wheel(0, -300)
  await sleep(2000)

  // ─── FLUSH VIDEO ────────────────────────────────────────────────
  console.log('Closing browser and flushing video...')
  const video = page.video()
  await context.close()
  await browser.close()

  const videoPath = await video?.path()
  console.log(`Raw video: ${videoPath}`)

  if (!videoPath || !fs.existsSync(videoPath)) {
    console.error('No video file found.')
    process.exit(1)
  }

  // ─── FFMPEG POST-PROCESSING ──────────────────────────────────────
  console.log('Post-processing with FFmpeg (1.6x speed, fade in/out, H.264)...')

  const ffmpegExe = [
    'C:\\Users\\chris\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe',
    'ffmpeg',
  ].find((p) => { try { fs.accessSync(p); return true } catch { return false } }) ?? 'ffmpeg'

  // Get duration so we can set the fade-out start correctly
  let durationSec = 90
  try {
    const probeOut = execSync(
      `"${ffmpegExe}" -i "${videoPath}" 2>&1`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString()
    const m = probeOut.match(/Duration: (\d+):(\d+):([\d.]+)/)
    if (m) durationSec = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])
  } catch {
    // ffprobe will exit non-zero because there's no output arg; parse stderr
    try {
      const probeErr = execSync(
        `"${ffmpegExe}" -i "${videoPath}" 2>&1 || true`,
        { encoding: 'utf8', shell: 'cmd.exe' }
      )
      const m = probeErr.match(/Duration: (\d+):(\d+):([\d.]+)/)
      if (m) durationSec = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])
    } catch {}
  }

  const speedFactor = 1.6
  const outDuration = durationSec / speedFactor
  const fadeOutStart = Math.max(outDuration - 1.5, outDuration * 0.92)

  const filterComplex = [
    `setpts=${(1 / speedFactor).toFixed(4)}*PTS`,
    `fade=t=in:st=0:d=0.6:color=black`,
    `fade=t=out:st=${fadeOutStart.toFixed(1)}:d=1.2:color=black`,
  ].join(',')

  const cmd = `"${ffmpegExe}" -y -i "${videoPath}" -vf "${filterComplex}" -r 30 -c:v libx264 -preset slow -crf 22 -movflags +faststart "${OUT_PATH}"`
  console.log('FFmpeg command:', cmd)

  try {
    execSync(cmd, { stdio: 'inherit', shell: 'cmd.exe' })
    const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1)
    console.log(`\n✅ Demo video saved: ${OUT_PATH} (${sizeMB} MB)`)
    console.log(`   Duration: ~${Math.round(outDuration)}s at ${speedFactor}x speed`)
  } catch (e) {
    console.error('FFmpeg failed:', e)
    console.log(`Raw .webm is at: ${videoPath}`)
  }
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
