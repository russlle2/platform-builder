#!/usr/bin/env node
/**
 * upload-templates-to-blobs.mjs
 *
 * Walks ../../platform-builder/<niche>/<slug>/ directories and uploads every
 * template file to the Netlify Blobs "templates" store, keyed as
 * "<niche>/<slug>/<filename>". Also builds and uploads the manifest JSON.
 *
 * Designed to run in GitHub Actions where platform-builder/ is checked out.
 * Auth is read from NETLIFY_AUTH_TOKEN + NETLIFY_SITE_ID env vars.
 *
 * Usage:
 *   node scripts/upload-templates-to-blobs.mjs [--force]
 *
 *   --force   Re-upload all files even if they already exist in Blobs.
 */
import { getStore } from '@netlify/blobs'
import { promises as fsp, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..')
const PLATFORM_BUILDER_ROOT = path.resolve(APP_ROOT, '..', '..', 'platform-builder')

const FORCE = process.argv.includes('--force')

// ---------- field parsing (mirrors build-template-manifest.mjs) ----------

const TYPE_KEYWORDS = new Set([
  'string', 'text', 'textarea', 'email', 'tel', 'phone', 'url', 'number',
  'int', 'integer', 'boolean', 'bool', 'date', 'datetime', 'time', 'json', 'array', 'object',
])

function stripBraces(key) {
  return String(key).replace(/^\{\{/, '').replace(/\}\}$/, '')
}

function inferType(name) {
  const n = name.toLowerCase()
  if (n.includes('email')) return 'email'
  if (n.includes('phone')) return 'tel'
  if (n.includes('url') || n.includes('link') || n.includes('website')) return 'url'
  return 'text'
}

function normalizeField(f) {
  const rawKey = f.key || f.name || ''
  const name = stripBraces(rawKey)
  return {
    name,
    label: f.label || name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    type: f.type || inferType(name),
    required: f.required ?? true,
    default: f.default ?? f.placeholder ?? f.example ?? undefined,
  }
}

function fieldFromMapEntry(key, val) {
  const name = stripBraces(key)
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return normalizeField({ key: name, ...val })
  }
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase()
    if (TYPE_KEYWORDS.has(lower)) {
      return normalizeField({ key: name, type: lower === 'string' ? inferType(name) : lower })
    }
    if (!val.startsWith('{{') && !val.startsWith('[')) {
      return normalizeField({ key: name, default: val })
    }
  }
  return normalizeField({ key: name })
}

function dedupeFields(fields) {
  const seen = new Set()
  const out = []
  for (const f of fields) {
    if (!f.name || seen.has(f.name)) continue
    seen.add(f.name)
    out.push(f)
  }
  return out
}

function fieldsFromPlaceholders(placeholders) {
  return placeholders.map((p) => normalizeField({ key: stripBraces(p) }))
}

function fieldsFromHtml(htmlPath) {
  try {
    const html = readFileSync(htmlPath, 'utf-8')
    const tokens = new Set()
    const re = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g
    let m
    while ((m = re.exec(html)) !== null) tokens.add(m[1])
    return fieldsFromPlaceholders([...tokens])
  } catch {
    return []
  }
}

function parseFields(fieldsPath) {
  try {
    const raw = JSON.parse(readFileSync(fieldsPath, 'utf-8'))
    if (Array.isArray(raw)) return raw.map(normalizeField)
    if (raw.groups && Array.isArray(raw.groups)) {
      const all = []
      for (const group of raw.groups) {
        if (Array.isArray(group.fields)) all.push(...group.fields.map(normalizeField))
      }
      return all
    }
    if (Array.isArray(raw.fields)) return raw.fields.map(normalizeField)
    if (raw.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields)) {
      return Object.entries(raw.fields).map(([key, val]) => fieldFromMapEntry(key, val))
    }
    if (raw.placeholders && typeof raw.placeholders === 'object') {
      return Object.entries(raw.placeholders).map(([key, val]) => {
        const name = stripBraces(key)
        return {
          name,
          label: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          type: name.toLowerCase().includes('email')
            ? 'email'
            : name.toLowerCase().includes('phone')
              ? 'tel'
              : 'text',
          required: Array.isArray(raw.required) ? raw.required.includes(key) : true,
          default: typeof val === 'string' && !val.startsWith('{{') ? val : undefined,
        }
      })
    }
    if (typeof raw === 'object' && (raw.BUSINESS_NAME !== undefined || raw.business_name !== undefined)) {
      return Object.entries(raw)
        .filter(([k]) => k !== 'notes')
        .map(([key, val]) => {
          const name = stripBraces(key)
          return {
            name,
            label: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            type: name.toLowerCase().includes('email')
              ? 'email'
              : name.toLowerCase().includes('phone')
                ? 'tel'
                : 'text',
            required: true,
            default:
              typeof val === 'string' && !val.startsWith('[') && !val.startsWith('{{') ? val : undefined,
          }
        })
    }
    return []
  } catch {
    return []
  }
}

function extractSnippet(htmlPath) {
  try {
    const html = readFileSync(htmlPath, 'utf-8')
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160)
  } catch {
    return ''
  }
}

function parseTemplateMeta(templateDir, nicheSlug, relDir) {
  const indexPath = path.join(templateDir, 'index.html')
  if (!existsSync(indexPath)) return null

  const templateJsonPath = path.join(templateDir, 'template.json')
  const fieldsJsonPath = path.join(templateDir, 'fields.json')

  let meta = {}
  if (existsSync(templateJsonPath)) {
    try {
      meta = JSON.parse(readFileSync(templateJsonPath, 'utf-8'))
    } catch { /* ignore */ }
  }

  const slug = meta.slug || path.basename(templateDir)
  const pages = meta.pages || readdirSync(templateDir).filter((f) => f.endsWith('.html'))

  let fields = existsSync(fieldsJsonPath) ? parseFields(fieldsJsonPath) : []
  if (fields.length === 0 && Array.isArray(meta.placeholders)) {
    fields = fieldsFromPlaceholders(meta.placeholders)
  }
  if (fields.length === 0) {
    fields = fieldsFromHtml(indexPath)
  }
  fields = dedupeFields(fields)

  return {
    slug,
    name: meta.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    niche: nicheSlug,
    nicheSlug,
    layoutFamily: meta.layoutFamily,
    voiceFamily: meta.voiceFamily,
    order: typeof meta.order === 'number' ? meta.order : undefined,
    featured: meta.featured === true,
    showcaseOrder: typeof meta.showcaseOrder === 'number' ? meta.showcaseOrder : undefined,
    pages,
    dir: relDir.split(path.sep).join('/'),
    fields,
    snippet: extractSnippet(indexPath),
  }
}

// ---------- collect all files to upload ----------

async function collectFiles(dir, relBase) {
  const results = []
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const full = path.join(dir, entry)
    const rel = relBase ? `${relBase}/${entry}` : entry
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...await collectFiles(full, rel))
    } else {
      results.push({ full, key: rel })
    }
  }
  return results
}

// ---------- load niche slugs from niche-meta.ts ----------

function loadNicheSlugs() {
  const metaPath = path.join(APP_ROOT, 'src', 'lib', 'templates', 'niche-meta.ts')
  const src = readFileSync(metaPath, 'utf-8')
  const match = src.match(/NICHE_META\s*:\s*Record<[^>]+>\s*=\s*\{([\s\S]*?)\n\}/)
  if (!match) throw new Error('Could not parse NICHE_META from niche-meta.ts')
  const body = match[1]
  const keys = []
  for (const m of body.matchAll(/^\s*([a-z_][a-z0-9_]*)\s*:\s*\{/gim)) {
    keys.push(m[1])
  }
  return keys
}

// ---------- main ----------

if (!existsSync(PLATFORM_BUILDER_ROOT)) {
  console.error(`[upload-templates] platform-builder directory not found: ${PLATFORM_BUILDER_ROOT}`)
  console.error('This script must run in an environment where platform-builder/ is checked out.')
  process.exit(1)
}

if (!process.env.NETLIFY_AUTH_TOKEN || !process.env.NETLIFY_SITE_ID) {
  console.error('[upload-templates] NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID must be set.')
  process.exit(1)
}

const store = getStore({
  name: 'templates',
  consistency: 'strong',
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_AUTH_TOKEN,
})
const nicheSlugs = loadNicheSlugs()

// Build manifest
const manifest = {}
let totalTemplates = 0

for (const nicheSlug of nicheSlugs) {
  const nicheDir = path.join(PLATFORM_BUILDER_ROOT, nicheSlug)
  if (!existsSync(nicheDir)) {
    manifest[nicheSlug] = []
    continue
  }
  const templates = []
  for (const entry of readdirSync(nicheDir)) {
    const templateDir = path.join(nicheDir, entry)
    if (!statSync(templateDir).isDirectory()) continue
    const t = parseTemplateMeta(templateDir, nicheSlug, path.join(nicheSlug, entry))
    if (t) templates.push(t)
  }
  templates.sort((a, b) => {
    const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY
    const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name)
  })
  manifest[nicheSlug] = templates
  totalTemplates += templates.length
}

console.log(`[upload-templates] Found ${nicheSlugs.length} niches, ${totalTemplates} templates.`)

// Collect all template files
const allFiles = []
for (const nicheSlug of nicheSlugs) {
  const nicheDir = path.join(PLATFORM_BUILDER_ROOT, nicheSlug)
  if (!existsSync(nicheDir)) continue
  const files = await collectFiles(nicheDir, nicheSlug)
  allFiles.push(...files)
}

console.log(`[upload-templates] ${allFiles.length} files to process (force=${FORCE}).`)

let uploaded = 0
let skipped = 0
let errors = 0
const total = allFiles.length

for (let i = 0; i < allFiles.length; i++) {
  const { full, key } = allFiles[i]
  try {
    if (!FORCE) {
      const meta = await store.getMetadata(key)
      if (meta !== null) {
        skipped++
        if ((i + 1) % 500 === 0) {
          console.log(`[upload-templates] Progress: ${i + 1} / ${total} (uploaded=${uploaded} skipped=${skipped} errors=${errors})`)
        }
        continue
      }
    }
    const content = await fsp.readFile(full)
    await store.set(key, content)
    uploaded++
    if ((uploaded + skipped) % 100 === 0 || (i + 1) % 500 === 0) {
      console.log(`[upload-templates] Progress: ${i + 1} / ${total} (uploaded=${uploaded} skipped=${skipped} errors=${errors})`)
    }
  } catch (err) {
    errors++
    console.error(`[upload-templates] Error uploading ${key}:`, err.message)
  }
}

// Upload manifest
try {
  await store.setJSON('_manifest.json', manifest)
  console.log(`[upload-templates] Uploaded _manifest.json (niches=${nicheSlugs.length} templates=${totalTemplates})`)
} catch (err) {
  console.error('[upload-templates] Failed to upload manifest:', err)
  process.exit(1)
}

console.log(`[upload-templates] Done. uploaded=${uploaded} skipped=${skipped} errors=${errors} total=${total}`)
if (errors > 0) {
  console.error(`[upload-templates] ${errors} files failed to upload.`)
  process.exit(1)
}
