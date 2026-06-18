#!/usr/bin/env node
/**
 * Walks `public/_templates/<niche>/<template>/` and emits
 * `src/lib/templates/manifest.generated.json` containing all template
 * metadata (slug, name, fields, pages, snippet, etc.) keyed by niche.
 *
 * Why: niche-registry.ts used to walk the filesystem at module load to
 * build this in-memory. That works in dev/build but FAILS at runtime in
 * Netlify SSR functions because the template directory is excluded from
 * the function bundle (it's 302 MB → over the 250 MB hard limit). With a
 * precomputed manifest, the registry has all metadata without ever
 * touching disk at runtime; actual HTML/CSS bodies are fetched from the
 * CDN over HTTP when needed.
 *
 * Run via `prebuild` / `predev` in apps/generator-app/package.json.
 */
import { promises as fsp, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..')
const TEMPLATES_ROOT = path.join(APP_ROOT, 'public', '_templates')
const OUTPUT = path.join(APP_ROOT, 'src', 'lib', 'templates', 'manifest.generated.json')

// Keep this list in sync with src/lib/templates/niche-meta.ts NICHE_SLUGS.
// We import it lazily below so the script stays plain ESM with no TS deps.
async function loadNicheSlugs() {
  const metaPath = path.join(APP_ROOT, 'src', 'lib', 'templates', 'niche-meta.ts')
  const src = readFileSync(metaPath, 'utf-8')
  // Extract keys from NICHE_META = { foo: {...}, bar: {...} }
  const match = src.match(/NICHE_META\s*:\s*Record<[^>]+>\s*=\s*\{([\s\S]*?)\n\}/)
  if (!match) {
    throw new Error('Could not parse NICHE_META from niche-meta.ts')
  }
  const body = match[1]
  const keys = []
  for (const m of body.matchAll(/^\s*([a-z_][a-z0-9_]*)\s*:\s*\{/gim)) {
    keys.push(m[1])
  }
  return keys
}

// ---------- field parsing (mirror of niche-registry.ts) ----------

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
    // Relative POSIX path inside _templates/. The registry composes
    // both fs paths and CDN URLs from this.
    dir: relDir.split(path.sep).join('/'),
    fields,
    snippet: extractSnippet(indexPath),
  }
}

// ---------- main ----------

if (!existsSync(TEMPLATES_ROOT)) {
  console.error(`[build-template-manifest] Templates dir not found: ${TEMPLATES_ROOT}`)
  console.error('Run `node scripts/copy-templates.mjs` first.')
  process.exit(1)
}

const niches = await loadNicheSlugs()
const manifest = {}
let totalTemplates = 0

for (const nicheSlug of niches) {
  const nicheDir = path.join(TEMPLATES_ROOT, nicheSlug)
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

await fsp.mkdir(path.dirname(OUTPUT), { recursive: true })
await fsp.writeFile(OUTPUT, JSON.stringify(manifest), 'utf-8')

console.log(
  `[build-template-manifest] Wrote ${OUTPUT} (niches=${niches.length} templates=${totalTemplates})`,
)
