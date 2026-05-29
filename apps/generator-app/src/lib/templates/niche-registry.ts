import fs from 'fs'
import path from 'path'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TemplateField {
  name: string
  label: string
  type: string
  required?: boolean
  default?: string
}

export interface TemplateMeta {
  slug: string
  name: string
  niche: string
  nicheSlug: string
  layoutFamily?: string
  voiceFamily?: string
  /** Gallery ordering key (lower = earlier). Undefined sorts last. */
  order?: number
  pages: string[]
  dir: string          // absolute path on disk
  fields: TemplateField[]
  /** First 160 chars of visible text from index.html (for card preview) */
  snippet: string
}

export interface NicheInfo {
  slug: string
  label: string
  description: string
  icon: string
  accent: string
  templateCount: number
}

/* ------------------------------------------------------------------ */
/* Niche metadata – one entry per qualifying niche (20+ templates)      */
/* ------------------------------------------------------------------ */

export const NICHE_META: Record<string, Omit<NicheInfo, 'slug' | 'templateCount'>> = {
  aromatherapy: {
    label: 'Aromatherapy',
    description: 'Premium websites for aromatherapy practices, essential oil studios, and holistic scent healing businesses.',
    icon: '🌿',
    accent: 'emerald',
  },
  holistic_medicine: {
    label: 'Holistic Medicine',
    description: 'Professional websites for integrative health practitioners, naturopathic doctors, and holistic healing centers.',
    icon: '🧘',
    accent: 'violet',
  },
  // NOTE: Deactivated categories. A niche only becomes browsable when present in
  // NICHE_META — removing/omitting an entry hides it from the gallery, landing pages,
  // niche API, and static generation (its template folder stays on disk, untouched).
  // Re-add an entry to reactivate. Currently deactivated: hvac, dental, injury_law (legal).
  // hvac: {
  //   label: 'HVAC',
  //   description: 'Conversion-focused websites for heating, cooling, and air quality professionals.',
  //   icon: '❄️',
  //   accent: 'cyan',
  // },
  // dental: {
  //   label: 'Dental',
  //   description: 'Patient-focused websites for dental practices and orthodontic clinics.',
  //   icon: '🦷',
  //   accent: 'cyan',
  // },
  // injury_law: {
  //   label: 'Personal Injury Law',
  //   description: 'Conversion-focused websites for personal injury and accident law firms.',
  //   icon: '⚖️',
  //   accent: 'amber',
  // },
  private_practice_therapist: {
    label: 'Private Practice Therapist',
    description: 'Warm, trust-building websites for therapists, counselors, and mental health professionals in private practice.',
    icon: '💬',
    accent: 'amber',
  },
  sound_bath: {
    label: 'Sound Bath',
    description: 'Immersive, beautifully designed websites for sound healing practitioners and meditation studios.',
    icon: '🔔',
    accent: 'indigo',
  },
  wellness_coach: {
    label: 'Wellness Coach',
    description: 'Results-driven websites for health coaches, wellness consultants, and lifestyle transformation experts.',
    icon: '✨',
    accent: 'rose',
  },
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const TEMPLATES_ROOT = path.join(process.cwd(), '..', '..', 'platform-builder')

function extractSnippet(htmlPath: string): string {
  try {
    const html = fs.readFileSync(htmlPath, 'utf-8')
    // strip tags, collapse whitespace, take first 160 chars
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, 160)
  } catch {
    return ''
  }
}

/** Strip leading/trailing {{ }} from a key string */
function stripBraces(key: string): string {
  return key.replace(/^\{\{/, '').replace(/\}\}$/, '')
}

/** Type-name keywords that should be treated as a field *type*, not a default value */
const TYPE_KEYWORDS = new Set([
  'string', 'text', 'textarea', 'email', 'tel', 'phone', 'url', 'number',
  'int', 'integer', 'boolean', 'bool', 'date', 'datetime', 'time', 'json', 'array', 'object',
])

/** Infer an input type from a field name */
function inferType(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('email')) return 'email'
  if (n.includes('phone')) return 'tel'
  if (n.includes('url') || n.includes('link') || n.includes('website')) return 'url'
  return 'text'
}

/** Normalize a single raw field object into a TemplateField */
function normalizeField(f: any): TemplateField {
  const rawKey = f.key || f.name || ''
  const name = stripBraces(rawKey)
  return {
    name,
    label: f.label || name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    type: f.type || inferType(name),
    required: f.required ?? true,
    default: f.default ?? f.placeholder ?? f.example ?? undefined,
  }
}

/** Build a field from an object-map entry: value may be a type keyword, a default, or a config object */
function fieldFromMapEntry(key: string, val: unknown): TemplateField {
  const name = stripBraces(key)
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return normalizeField({ key: name, ...(val as Record<string, unknown>) })
  }
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase()
    // e.g. { "BUSINESS_NAME": "string" } → type hint, no default
    if (TYPE_KEYWORDS.has(lower)) {
      return normalizeField({ key: name, type: lower === 'string' ? inferType(name) : lower })
    }
    // a real default value (skip unresolved placeholder tokens)
    if (!val.startsWith('{{') && !val.startsWith('[')) {
      return normalizeField({ key: name, default: val })
    }
  }
  return normalizeField({ key: name })
}

/** Dedupe fields by name, keeping the first occurrence (which carries richest metadata) */
function dedupeFields(fields: TemplateField[]): TemplateField[] {
  const seen = new Set<string>()
  const out: TemplateField[] = []
  for (const f of fields) {
    if (!f.name || seen.has(f.name)) continue
    seen.add(f.name)
    out.push(f)
  }
  return out
}

/** Derive fields from a list of {{PLACEHOLDER}} tokens (from template.json or raw HTML) */
function fieldsFromPlaceholders(placeholders: string[]): TemplateField[] {
  return placeholders.map((p) => normalizeField({ key: stripBraces(p) }))
}

/** Scan raw HTML for {{TOKEN}} placeholders and build fields from them */
function fieldsFromHtml(htmlPath: string): TemplateField[] {
  try {
    const html = fs.readFileSync(htmlPath, 'utf-8')
    const tokens = new Set<string>()
    const re = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) tokens.add(m[1])
    return fieldsFromPlaceholders([...tokens])
  } catch {
    return []
  }
}

function parseFields(fieldsPath: string): TemplateField[] {
  try {
    const raw = JSON.parse(fs.readFileSync(fieldsPath, 'utf-8'))

    // Format A: Top-level array of field objects  [{ key, label, type }]
    if (Array.isArray(raw)) {
      return raw.map(normalizeField)
    }

    // Format B: { groups: [{ label, fields: [...] }] }  (grouped / premium style)
    if (raw.groups && Array.isArray(raw.groups)) {
      const all: TemplateField[] = []
      for (const group of raw.groups) {
        if (Array.isArray(group.fields)) {
          all.push(...group.fields.map(normalizeField))
        }
      }
      return all
    }

    // Format C: { fields: [{ key/name, label, type }] }
    if (Array.isArray(raw.fields)) {
      return raw.fields.map(normalizeField)
    }

    // Format C2: { fields: { KEY: "string" | "default" | { type, label, ... } } }
    // (object map — the most common shape across the template library; previously
    // unhandled, which caused those templates to show ZERO customizable fields)
    if (raw.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields)) {
      return Object.entries(raw.fields).map(([key, val]) => fieldFromMapEntry(key, val))
    }

    // Format D: { placeholders: { KEY: "default" } }
    if (raw.placeholders && typeof raw.placeholders === 'object') {
      return Object.entries(raw.placeholders).map(([key, val]) => {
        const name = stripBraces(key)
        return {
          name,
          label: name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          type: name.toLowerCase().includes('email') ? 'email' : name.toLowerCase().includes('phone') ? 'tel' : 'text',
          required: Array.isArray(raw.required) ? raw.required.includes(key) : true,
          default: typeof val === 'string' && !val.startsWith('{{') ? val : undefined,
        }
      })
    }

    // Format E: flat object with keys = field names, values = defaults (therapist style)
    if (typeof raw === 'object' && (raw.BUSINESS_NAME !== undefined || raw.business_name !== undefined)) {
      return Object.entries(raw)
        .filter(([k]) => k !== 'notes')
        .map(([key, val]) => {
          const name = stripBraces(key)
          return {
            name,
            label: name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            type: name.toLowerCase().includes('email') ? 'email' : name.toLowerCase().includes('phone') ? 'tel' : 'text',
            required: true,
            default: typeof val === 'string' && !val.startsWith('[') && !val.startsWith('{{') ? val : undefined,
          }
        })
    }

    return []
  } catch {
    return []
  }
}

function parseTemplateMeta(templateDir: string, niche: string): TemplateMeta | null {
  const indexPath = path.join(templateDir, 'index.html')
  if (!fs.existsSync(indexPath)) return null

  const templateJsonPath = path.join(templateDir, 'template.json')
  const fieldsJsonPath = path.join(templateDir, 'fields.json')

  let meta: any = {}
  if (fs.existsSync(templateJsonPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(templateJsonPath, 'utf-8'))
    } catch { /* ignore */ }
  }

  const slug = meta.slug || path.basename(templateDir)
  const pages = meta.pages || fs.readdirSync(templateDir).filter((f: string) => f.endsWith('.html'))

  // Resolve customizable fields with a robust fallback chain so that EVERY
  // template with any placeholders becomes editable:
  //   1. fields.json (all supported shapes)
  //   2. template.json "placeholders" array
  //   3. {{TOKENS}} scanned directly from index.html
  let fields = fs.existsSync(fieldsJsonPath) ? parseFields(fieldsJsonPath) : []
  if (fields.length === 0 && Array.isArray(meta.placeholders)) {
    fields = fieldsFromPlaceholders(meta.placeholders as string[])
  }
  if (fields.length === 0) {
    fields = fieldsFromHtml(indexPath)
  }
  fields = dedupeFields(fields)

  return {
    slug,
    name: meta.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    niche,
    nicheSlug: niche,
    layoutFamily: meta.layoutFamily,
    voiceFamily: meta.voiceFamily,
    order: typeof meta.order === 'number' ? meta.order : undefined,
    pages,
    dir: templateDir,
    fields,
    snippet: extractSnippet(indexPath),
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

let _cache: Map<string, TemplateMeta[]> | null = null

function ensureCache(): Map<string, TemplateMeta[]> {
  if (_cache) return _cache

  _cache = new Map()

  for (const nicheSlug of Object.keys(NICHE_META)) {
    const nicheDir = path.join(TEMPLATES_ROOT, nicheSlug)
    if (!fs.existsSync(nicheDir)) continue

    const templates: TemplateMeta[] = []
    for (const entry of fs.readdirSync(nicheDir)) {
      const templateDir = path.join(nicheDir, entry)
      if (!fs.statSync(templateDir).isDirectory()) continue
      const t = parseTemplateMeta(templateDir, nicheSlug)
      if (t) templates.push(t)
    }

    // Order by the explicit numeric `order` from template.json (ascending).
    // Templates without an order sort last, then alphabetically by name.
    templates.sort((a, b) => {
      const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY
      const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY
      if (ao !== bo) return ao - bo
      return a.name.localeCompare(b.name)
    })

    _cache.set(nicheSlug, templates)
  }

  return _cache
}

/** Get all niches with their metadata and counts */
export function getNiches(): NicheInfo[] {
  const cache = ensureCache()
  return Object.entries(NICHE_META).map(([slug, meta]) => ({
    slug,
    ...meta,
    templateCount: cache.get(slug)?.length || 0,
  }))
}

/** Get all templates for a niche */
export function getTemplatesForNiche(nicheSlug: string): TemplateMeta[] {
  const cache = ensureCache()
  return cache.get(nicheSlug) || []
}

/** Get a single template by niche + slug */
export function getTemplate(nicheSlug: string, templateSlug: string): TemplateMeta | null {
  const templates = getTemplatesForNiche(nicheSlug)
  return templates.find((t) => t.slug === templateSlug) || null
}

/** Read a template file (html, css, js, etc.) and return contents */
export function readTemplateFile(nicheSlug: string, templateSlug: string, filePath: string): string | null {
  const template = getTemplate(nicheSlug, templateSlug)
  if (!template) return null
  const fullPath = path.join(template.dir, filePath)
  // safety: must stay within the template dir
  if (!fullPath.startsWith(template.dir)) return null
  try {
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    return null
  }
}

/** Replace all {{PLACEHOLDER}} tokens with provided values */
export function hydrateTemplate(html: string, values: Record<string, string>): string {
  let result = html
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value)
  }
  // Clear any remaining placeholders
  result = result.replace(/\{\{[A-Z_]+\}\}/g, '')
  return result
}
