import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_ROOT = path.join(__dirname, '..', 'platform-builder')

const LAYOUT_FAMILIES = ['hero-left', 'hero-center', 'hero-split', 'minimal-nav', 'sidebar-nav']
const VOICE_FAMILIES = ['professional', 'conversational', 'storytelling', 'minimal', 'authoritative']

function slugHashInt(slug) {
  let h = 5381
  for (let i = 0; i < slug.length; i++) {
    h = (((h << 5) + h) ^ slug.charCodeAt(i)) >>> 0
  }
  return h
}

async function backfill() {
  const niches = await fs.readdir(TEMPLATES_ROOT)
  let updated = 0
  let skipped = 0

  for (const niche of niches) {
    const nicheDir = path.join(TEMPLATES_ROOT, niche)
    const stat = await fs.stat(nicheDir).catch(() => null)
    if (!stat?.isDirectory()) continue

    const templates = await fs.readdir(nicheDir).catch(() => [])
    for (const slug of templates) {
      const templateDir = path.join(nicheDir, slug)
      const jsonPath = path.join(templateDir, 'template.json')
      try {
        const raw = JSON.parse(await fs.readFile(jsonPath, 'utf-8'))
        if (!raw.layoutFamily || !raw.voiceFamily) {
          const h = slugHashInt(slug)
          raw.layoutFamily = raw.layoutFamily || LAYOUT_FAMILIES[h % LAYOUT_FAMILIES.length]
          raw.voiceFamily = raw.voiceFamily || VOICE_FAMILIES[(h >> 3) % VOICE_FAMILIES.length]
          await fs.writeFile(jsonPath, JSON.stringify(raw, null, 2))
          updated++
        } else {
          skipped++
        }
      } catch { /* skip missing or malformed files */ }
    }
  }
  console.log(`Backfilled ${updated} template.json files (${skipped} already had metadata)`)
}

backfill()
