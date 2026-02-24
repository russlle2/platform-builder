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
  hvac: {
    label: 'HVAC',
    description: 'Conversion-focused websites for heating, cooling, and air quality professionals.',
    icon: '❄️',
    accent: 'cyan',
  },
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

function parseFields(fieldsPath: string): TemplateField[] {
  try {
    const raw = JSON.parse(fs.readFileSync(fieldsPath, 'utf-8'))

    // Format 1: { fields: [{ key/name, label, type }] }
    if (Array.isArray(raw.fields)) {
      return raw.fields.map((f: any) => ({
        name: f.key || f.name,
        label: f.label || f.key || f.name,
        type: f.type || 'text',
        required: f.required ?? true,
        default: f.default,
      }))
    }

    // Format 2: { title, fields: [{ name, label, type, default }] }
    if (raw.title && Array.isArray(raw.fields)) {
      return raw.fields.map((f: any) => ({
        name: f.name,
        label: f.label || f.name,
        type: f.type || 'text',
        required: true,
        default: f.default,
      }))
    }

    // Format 3: { placeholders: { KEY: "default" } }
    if (raw.placeholders && typeof raw.placeholders === 'object') {
      return Object.entries(raw.placeholders).map(([key, val]) => ({
        name: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        type: key.toLowerCase().includes('email') ? 'email' : key.toLowerCase().includes('phone') ? 'tel' : 'text',
        required: Array.isArray(raw.required) ? raw.required.includes(key) : true,
        default: typeof val === 'string' && !val.startsWith('{{') ? val : undefined,
      }))
    }

    // Format 4: flat object with keys = field names, values = defaults (therapist style)
    if (typeof raw === 'object' && !Array.isArray(raw) && raw.BUSINESS_NAME !== undefined) {
      return Object.entries(raw).map(([key, val]) => ({
        name: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        type: key.toLowerCase().includes('email') ? 'email' : key.toLowerCase().includes('phone') ? 'tel' : 'text',
        required: true,
        default: typeof val === 'string' && !val.startsWith('[') && !val.startsWith('{{') ? val : undefined,
      }))
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

  return {
    slug,
    name: meta.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    niche,
    nicheSlug: niche,
    layoutFamily: meta.layoutFamily,
    voiceFamily: meta.voiceFamily,
    pages,
    dir: templateDir,
    fields: fs.existsSync(fieldsJsonPath) ? parseFields(fieldsJsonPath) : [],
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
