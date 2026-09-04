/**
 * Capture static homepage screenshots for niche example galleries.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/capture-niche-examples.ts
 */
import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { NICHE_EXAMPLE_SHOTS } from '../src/lib/niche-example-screenshots'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const OUT_ROOT = path.join(__dirname, '..', 'public', 'images', 'niche-examples')
const VIEWPORT = { width: 1280, height: 800 }

async function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: VIEWPORT })

  for (const [niche, shots] of Object.entries(NICHE_EXAMPLE_SHOTS)) {
    const nicheDir = path.join(OUT_ROOT, niche)
    fs.mkdirSync(nicheDir, { recursive: true })

    for (const shot of shots) {
      const fileName = path.basename(shot.imagePath)
      const outPath = path.join(nicheDir, fileName)
      const url = `${BASE_URL}/api/templates/${niche}/${shot.slug}/html?page=index.html`

      console.log(`Capturing ${niche} / ${shot.label}…`)
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
        await page.waitForTimeout(800)
        const png = await page.screenshot({ type: 'png' })
        await sharp(png).webp({ quality: 82 }).toFile(outPath)
        console.log(`  ✓ ${outPath}`)
      } catch (err) {
        console.warn(`  ✗ Failed ${shot.slug}:`, err)
      }
    }
  }

  await browser.close()
  console.log('\nDone → public/images/niche-examples/')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
