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
 *   node scripts/upload-templates-to-blobs.mjs [--force] [--dry-run]
 *     [--only <niche[/slug]>]...
 *
 *   --force    Re-upload selected files even if they already exist in Blobs.
 *   --dry-run  Build and validate the plan without credentials or writes.
 *   --only     Restrict files by an exact key or directory prefix; repeatable.
 */
import { getStore } from '@netlify/blobs'
import {
  promises as fsp,
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..')
const DEFAULT_PLATFORM_BUILDER_ROOT = path.resolve(APP_ROOT, '..', '..', 'platform-builder')
let PLATFORM_BUILDER_ROOT = DEFAULT_PLATFORM_BUILDER_ROOT

function loadLaunchCatalogContract() {
  const contractPath = path.join(
    APP_ROOT,
    'src',
    'lib',
    'templates',
    'launch-catalog-contract.json',
  )
  const parsed = JSON.parse(readFileSync(contractPath, 'utf-8'))
  if (
    !parsed ||
    !Number.isInteger(parsed.contractVersion) ||
    !Number.isInteger(parsed.totalTemplates) ||
    parsed.totalTemplates < 1 ||
    !parsed.templatesByNiche ||
    typeof parsed.templatesByNiche !== 'object' ||
    Array.isArray(parsed.templatesByNiche)
  ) {
    throw new Error('Launch catalog contract is malformed')
  }

  const templatesByNiche = {}
  for (const [slug, count] of Object.entries(parsed.templatesByNiche)) {
    if (!/^[a-z_][a-z0-9_]*$/.test(slug) || !Number.isInteger(count) || count < 1) {
      throw new Error(`Launch catalog contract has an invalid niche entry: ${slug}`)
    }
    templatesByNiche[slug] = count
  }
  const calculatedTotal = Object.values(templatesByNiche).reduce((sum, count) => sum + count, 0)
  if (calculatedTotal !== parsed.totalTemplates) {
    throw new Error(
      `Launch catalog contract totals ${calculatedTotal} templates, not ${parsed.totalTemplates}`,
    )
  }

  return Object.freeze({
    contractVersion: parsed.contractVersion,
    totalTemplates: parsed.totalTemplates,
    templatesByNiche: Object.freeze(templatesByNiche),
  })
}

export const LAUNCH_CATALOG_CONTRACT = loadLaunchCatalogContract()

const SUPPORTED_CATALOG_CONTRACT_VERSIONS = new Set([2, 3])
const SHA256_RE = /^[a-f0-9]{64}$/
const SAFE_ARTIFACT_SEGMENT_RE = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/
const ARTIFACT_TREE_EXCLUSIONS = new Set([
  '.dailyclarity/artifact-tree.json',
  '.dailyclarity/final-quality-receipt.json',
])
const V3_ID_PATTERNS = Object.freeze({
  designId: /^design_[A-Za-z0-9_-]+$/,
  contentPresetId: /^content_[A-Za-z0-9_-]+$/,
  themePresetId: /^theme_[A-Za-z0-9_-]+$/,
  qualityReceipt: /^receipt_[A-Za-z0-9_-]+$/,
})

/** Require the exact launch distribution after template validation/quarantine. */
export function validateLaunchCatalogManifest(manifest) {
  const errors = []
  const countsByNiche = {}
  const isManifestObject = Boolean(manifest && typeof manifest === 'object' && !Array.isArray(manifest))
  const source = isManifestObject ? manifest : {}
  if (!isManifestObject) errors.push('manifest is missing or malformed')

  for (const [niche, expected] of Object.entries(LAUNCH_CATALOG_CONTRACT.templatesByNiche)) {
    const templates = source[niche]
    const actual = Array.isArray(templates) ? templates.length : 0
    countsByNiche[niche] = actual
    if (!Array.isArray(templates)) errors.push(`${niche}: manifest entry is missing or malformed`)
    if (actual !== expected) errors.push(`${niche}: expected ${expected}, found ${actual}`)
    if (Array.isArray(templates)) {
      templates.forEach((template, index) => {
        if (!hasValidationStamp(template)) {
          errors.push(`${niche}[${index}]: template validation stamp is missing or malformed`)
        }
      })
    }
  }

  for (const niche of Object.keys(source)) {
    if (!Object.hasOwn(LAUNCH_CATALOG_CONTRACT.templatesByNiche, niche)) {
      errors.push(`${niche}: unexpected launch niche`)
      countsByNiche[niche] = Array.isArray(source[niche]) ? source[niche].length : 0
    }
  }

  const totalTemplates = Object.values(countsByNiche).reduce((sum, count) => sum + count, 0)
  if (totalTemplates !== LAUNCH_CATALOG_CONTRACT.totalTemplates) {
    errors.push(`total: expected ${LAUNCH_CATALOG_CONTRACT.totalTemplates}, found ${totalTemplates}`)
  }

  return {
    pass: errors.length === 0,
    errors,
    totalTemplates,
    countsByNiche,
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function manifestDigest(manifest) {
  return createHash('sha256').update(canonicalJson(manifest)).digest('hex')
}

/** Validate both inventory and exact content after a strongly consistent readback. */
export function verifyPublishedManifest(expectedManifest, publishedManifest) {
  const expected = validateLaunchCatalogManifest(expectedManifest)
  const published = validateLaunchCatalogManifest(publishedManifest)
  const errors = [
    ...expected.errors.map((error) => `publish plan: ${error}`),
    ...published.errors.map((error) => `readback: ${error}`),
  ]
  const expectedDigest = expected.pass ? manifestDigest(expectedManifest) : null
  const publishedDigest = published.pass ? manifestDigest(publishedManifest) : null
  if (expectedDigest && publishedDigest && expectedDigest !== publishedDigest) {
    errors.push('readback content differs from the manifest that was published')
  }
  return {
    pass: errors.length === 0,
    errors,
    expectedDigest,
    publishedDigest,
  }
}

function assertLaunchCatalogManifest(manifest, label) {
  const result = validateLaunchCatalogManifest(manifest)
  if (!result.pass) {
    throw new Error(`${label} failed launch catalog integrity:\n  - ${result.errors.join('\n  - ')}`)
  }
  return result
}

export function normalizeOnlySelector(rawSelector) {
  if (typeof rawSelector !== 'string') throw new Error('--only requires a selector')
  const selector = rawSelector.trim().replace(/\/+$/, '')
  if (!selector || selector.startsWith('/') || selector.includes('\\') || /[\0-\x1f]/.test(selector)) {
    throw new Error(`Unsafe --only selector: ${JSON.stringify(rawSelector)}`)
  }

  const segments = selector.split('/')
  if (
    segments.length > 2 ||
    segments.some(
      (segment) =>
        segment === '.' ||
        segment === '..' ||
        !/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(segment),
    )
  ) {
    throw new Error(`Unsafe --only selector: ${JSON.stringify(rawSelector)}`)
  }
  return segments.join('/')
}

export function parseUploadArgs(argv) {
  const options = { force: false, dryRun: false, only: [], root: undefined, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--force') {
      options.force = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--only') {
      const value = argv[++i]
      if (!value || value.startsWith('--')) throw new Error('--only requires a selector')
      options.only.push(normalizeOnlySelector(value))
    } else if (arg.startsWith('--only=')) {
      options.only.push(normalizeOnlySelector(arg.slice('--only='.length)))
    } else if (arg === '--root') {
      const value = argv[++i]
      if (!value || value.startsWith('--')) throw new Error('--root requires a directory')
      options.root = path.resolve(value)
    } else if (arg.startsWith('--root=')) {
      const value = arg.slice('--root='.length).trim()
      if (!value) throw new Error('--root requires a directory')
      options.root = path.resolve(value)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  options.only = [...new Set(options.only)]
  return options
}

export function matchesOnlySelector(key, selectors) {
  return selectors.length === 0 || selectors.some(
    (selector) => key === selector || key.startsWith(`${selector}/`),
  )
}

const TOKEN_RE = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g
const ANY_MUSTACHE_RE = /\{\{[^{}]*\}\}/g
const IDENTITY_TOKENS = new Set([
  'BUSINESS_NAME', 'PRACTICE_NAME', 'BRAND_NAME', 'STUDIO_NAME',
  'PRACTITIONER_NAME', 'OWNER_NAME', 'COACH_NAME', 'FACILITATOR_NAME',
])
const CONTACT_TOKENS = new Set([
  'EMAIL', 'CONTACT_EMAIL', 'PHONE', 'PHONE_NUMBER', 'CONTACT_PHONE',
  'PRIMARY_CTA_URL', 'BOOKING_URL', 'WEBSITE',
])
const INTAKE_TOKENS = new Set([
  ...IDENTITY_TOKENS,
  ...CONTACT_TOKENS,
  'STREET_ADDRESS', 'TAGLINE', 'DESCRIPTION', 'SERVICES',
  'CTA_LABEL', 'PRIMARY_CTA_LABEL',
])
const PERSONAL_DATA_PATTERNS = [
  ['placeholder email', /\bhello@example\.com\b/i],
  ['placeholder practitioner name', /\bDr\.\s+Morgan\s+Ellis\b/i],
  ['placeholder phone', /\(?555\)?[\s.-]*555[\s.-]*0100\b/i],
  ['placeholder city', /\bYour City\b/i],
  ['placeholder state', /\bYour State\b/i],
  [
    'generated placeholder business name',
    /\b(?:Aromatherapy|Holistic Medicine|Private Practice Therapist|Sound Bath|Wellness Coach) Studio\b/i,
  ],
]
const PUBLICATION_RISK_PATTERNS = [
  [
    'unverified testimonial or review content',
    /\btestimonials?\b|\bclient (?:success )?stor(?:y|ies)\b|\bwhat (?:our )?(?:clients?|patients?) (?:say|share)\b|\bvoices? from (?:the )?(?:cohort|community|clients?)\b|class\s*=\s*["'][^"']*\b(?:testimonial|review|quote)\b/i,
  ],
  ['hard-coded offer price', />\s*[^<]{0,120}\$\s*\d/i],
  ['unverified percentage result', />\s*[^<]{0,120}\b\d{1,3}(?:\.\d+)?%\b/i],
  ['guaranteed outcome claim', /\bguaranteed?\s+(?:results?|outcomes?|bookings?|revenue|growth|healing)\b/i],
]
const SENSITIVE_FORM_RE = /\b(?:allerg(?:y|ies|ic)|pregnan(?:t|cy)|medications?|diagnos(?:is|ed|tic)|medical history|mental[- ]health history|symptoms?|health conditions?)\b/i
const LITERAL_EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const LITERAL_PHONE_RE = /(?:^|[^\w])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?:\s*(?:x|ext\.?)[\s\d]+)?(?:$|[^\w])/i
const DEPLOYABLE_EXTENSIONS = new Set([
  '.html', '.css', '.js', '.mjs', '.svg', '.png', '.jpg', '.jpeg', '.gif',
  '.webp', '.avif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.txt', '.xml',
  '.webmanifest',
])

export function validateUploadContract(pages, fields) {
  const errors = []
  const tokens = new Set()

  for (const [page, html] of Object.entries(pages)) {
    const mustaches = html.match(ANY_MUSTACHE_RE) || []
    for (const mustache of mustaches) {
      if (!/^\{\{\s*[A-Za-z][A-Za-z0-9_]*\s*\}\}$/.test(mustache)) {
        errors.push(`${page}: contains unsupported template expression ${mustache.slice(0, 80)}`)
      }
    }
    const withoutValidTokens = html.replace(TOKEN_RE, '')
    if (withoutValidTokens.includes('{{') || withoutValidTokens.includes('}}')) {
      errors.push(`${page}: contains an unmatched or unsupported template expression`)
    }

    TOKEN_RE.lastIndex = 0
    let match
    while ((match = TOKEN_RE.exec(html)) !== null) tokens.add(match[1].toUpperCase())
    for (const [label, pattern] of PERSONAL_DATA_PATTERNS) {
      if (pattern.test(html)) errors.push(`${page}: contains ${label}`)
    }

    const anchorMarkup = html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(?:script|style|noscript)\b[\s\S]*?<\/(?:script|style|noscript)>/gi, ' ')
    const visibleMarkup = anchorMarkup.replace(TOKEN_RE, '')
    for (const [label, pattern] of PUBLICATION_RISK_PATTERNS) {
      if (pattern.test(visibleMarkup)) errors.push(`${page}: contains ${label}`)
    }
    if (LITERAL_EMAIL_RE.test(visibleMarkup)) errors.push(`${page}: contains a hard-coded email address`)
    if (LITERAL_PHONE_RE.test(visibleMarkup)) errors.push(`${page}: contains a hard-coded phone number`)

    for (const form of visibleMarkup.match(/<form\b[\s\S]*?<\/form>/gi) || []) {
      if (SENSITIVE_FORM_RE.test(form)) {
        errors.push(`${page}: form solicits sensitive health information`)
        break
      }
    }

    // Preserve tokens for destination validation. The proof/copy scans above
    // deliberately remove them, but a valid mailto:{{EMAIL}} or tel:{{PHONE}}
    // link must retain its token here so it is not mistaken for a literal.
    for (const anchor of anchorMarkup.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)) {
      const href = anchor[2].trim()
      if (/^(?:https?:|mailto:|tel:)/i.test(href) && !/\{\{\s*[A-Za-z0-9_]+\s*\}\}/.test(href)) {
        errors.push(`${page}: contains a hard-coded external contact or destination link`)
        break
      }
    }
  }

  if (tokens.size === 0) errors.push('template contains no runtime personalization tokens')
  if (![...tokens].some((token) => IDENTITY_TOKENS.has(token))) {
    errors.push('template is missing a supported business or practitioner identity token')
  }
  if (![...tokens].some((token) => CONTACT_TOKENS.has(token))) {
    errors.push('template is missing a supported contact or booking token')
  }

  const fieldNames = new Set(fields.map((field) => String(field.name || '').trim().toUpperCase()).filter(Boolean))
  const fieldsByName = new Map(
    fields.map((field) => [String(field.name || '').trim().toUpperCase(), field]),
  )
  const missing = [...tokens].filter((token) => !fieldNames.has(token)).sort()
  const unused = [...fieldNames].filter((field) => !tokens.has(field)).sort()
  if (missing.length > 0) errors.push(`fields are missing tokens: ${missing.join(', ')}`)
  if (unused.length > 0) errors.push(`fields declare unused tokens: ${unused.join(', ')}`)

  const missingPreviewValues = [...tokens].filter((token) => {
    if (INTAKE_TOKENS.has(token)) return false
    const defaultValue = fieldsByName.get(token)?.default
    return typeof defaultValue !== 'string' || !defaultValue.trim() || /\{\{/.test(defaultValue)
  })
  if (missingPreviewValues.length > 0) {
    errors.push(
      `tokens are not supplied by intake and have no concrete default: ${missingPreviewValues.sort().join(', ')}`,
    )
  }

  for (const field of fields) {
    if (typeof field.default === 'string' && /\{\{\s*[A-Za-z0-9_]+\s*\}\}/.test(field.default)) {
      errors.push(`default for ${field.name} contains a token`)
    }
  }

  return { pass: errors.length === 0, errors, tokens: [...tokens].sort() }
}

function fieldsMatchingTokens(fields, tokens) {
  const existing = new Map(
    fields.map((field) => [String(field.name || '').trim().toUpperCase(), field]),
  )
  return tokens.map((token) => {
    const prior = existing.get(token)
    const normalized = prior
      ? { ...prior, name: token }
      : normalizeField({ key: token })
    if (
      typeof normalized.default === 'string' &&
      /\{\{\s*[A-Za-z0-9_]+\s*\}\}/.test(normalized.default)
    ) {
      delete normalized.default
    }
    return normalized
  })
}

function printHelp() {
  console.log(`Usage: node scripts/upload-templates-to-blobs.mjs [options]

Options:
  --dry-run                    Validate and print the upload plan; never writes
  --only <niche[/slug]>         Restrict by niche or complete template; repeatable
  --root <directory>            Read a specific local template-library root
  --force                      Overwrite selected objects already in Blobs
  --help, -h                   Show this help

Examples:
  node scripts/upload-templates-to-blobs.mjs --dry-run --only aromatherapy
  node scripts/upload-templates-to-blobs.mjs --only aromatherapy/my-template --force

Partial uploads merge into the last validated remote manifest. A selected
template is always uploaded as a complete directory. Existing objects are
skipped only when their recorded SHA-256 matches the local file.`)
}

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
    const re = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g
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
  let finalReceipt = {}
  const finalReceiptPath = path.join(templateDir, '.dailyclarity', 'final-quality-receipt.json')
  if (existsSync(finalReceiptPath)) {
    try {
      finalReceipt = JSON.parse(readFileSync(finalReceiptPath, 'utf-8'))
    } catch { /* validation below reports a malformed receipt */ }
  }

  const slug = meta.slug || path.basename(templateDir)
  const pages = Array.isArray(meta.pages)
    ? meta.pages.filter((page) => typeof page === 'string')
    : meta.pages && typeof meta.pages === 'object'
      ? Object.keys(meta.pages)
      : readdirSync(templateDir).filter((f) => f.endsWith('.html'))

  let fields = existsSync(fieldsJsonPath) ? parseFields(fieldsJsonPath) : []
  if (fields.length === 0 && Array.isArray(meta.placeholders)) {
    fields = fieldsFromPlaceholders(meta.placeholders)
  }
  if (fields.length === 0) {
    fields = fieldsFromHtml(indexPath)
  }
  fields = dedupeFields(fields)
  const files = listDeployableFiles(templateDir)

  return {
    slug,
    legacySlug: typeof meta.legacySlug === 'string' ? meta.legacySlug : slug,
    name: meta.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    niche: nicheSlug,
    nicheSlug,
    layoutFamily: meta.layoutFamily,
    voiceFamily: meta.voiceFamily,
    order: typeof meta.order === 'number' ? meta.order : undefined,
    featured: meta.featured === true,
    showcaseOrder: typeof meta.showcaseOrder === 'number' ? meta.showcaseOrder : undefined,
    pages,
    files,
    dir: relDir.split(path.sep).join('/'),
    fields,
    snippet: extractSnippet(indexPath),
    contractVersion: meta.contractVersion === 3 ? 3 : 2,
    designId: typeof meta.designId === 'string' ? meta.designId : undefined,
    contentPresetId: typeof meta.contentPresetId === 'string' ? meta.contentPresetId : undefined,
    themePresetId: typeof meta.themePresetId === 'string' ? meta.themePresetId : undefined,
    qualityReceipt: typeof finalReceipt.id === 'string'
      ? finalReceipt.id
      : typeof meta.qualityReceipt === 'string' ? meta.qualityReceipt : undefined,
  }
}

function normalizeArtifactTreePath(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.startsWith('/') ||
    value.includes('\\') ||
    /[\0-\x1f]/.test(value)
  ) {
    return null
  }
  const segments = value.split('/')
  if (segments.some((segment) => !SAFE_ARTIFACT_SEGMENT_RE.test(segment))) return null
  return segments.join('/')
}

function listArtifactTreeFiles(templateDir, currentDir = templateDir, prefix = '') {
  const files = []
  for (const entry of readdirSync(currentDir).sort()) {
    const full = path.resolve(currentDir, entry)
    if (!isPathWithin(templateDir, full)) throw new Error(`artifact path escapes template root: ${entry}`)
    const stat = lstatSync(full)
    const relative = prefix ? `${prefix}/${entry}` : entry
    if (stat.isSymbolicLink()) throw new Error(`artifact is a symbolic link: ${relative}`)
    if (stat.isDirectory()) {
      files.push(...listArtifactTreeFiles(templateDir, full, relative))
    } else if (stat.isFile() && !ARTIFACT_TREE_EXCLUSIONS.has(relative)) {
      files.push(relative)
    }
  }
  return files.sort()
}

function validateReceiptEvidence(receipt, meta, errors) {
  if (!Array.isArray(meta.pages) || meta.pages.length === 0) {
    errors.push('catalog v3 template has no pages to verify')
    return
  }
  if (!Array.isArray(receipt.pages)) {
    errors.push('catalog v3 final receipt has no browser evidence')
    return
  }

  const expected = new Set()
  for (const page of meta.pages) {
    expected.add(`${page}\0desktop`)
    expected.add(`${page}\0mobile`)
  }
  const seen = new Set()
  for (const evidence of receipt.pages) {
    if (!evidence || typeof evidence !== 'object') {
      errors.push('catalog v3 final receipt contains malformed browser evidence')
      continue
    }
    const key = `${evidence.page}\0${evidence.viewport}`
    if (!expected.has(key)) {
      errors.push(`catalog v3 final receipt has unexpected browser evidence for ${evidence.page}/${evidence.viewport}`)
      continue
    }
    if (seen.has(key)) {
      errors.push(`catalog v3 final receipt repeats browser evidence for ${evidence.page}/${evidence.viewport}`)
      continue
    }
    seen.add(key)
    if (
      evidence.passed !== true ||
      !SHA256_RE.test(evidence.screenshotSha256) ||
      !/^[a-f0-9]{16}$/.test(evidence.perceptualHash) ||
      !Number.isSafeInteger(evidence.editSlots) || evidence.editSlots < 0 ||
      !Number.isSafeInteger(evidence.imageSlots) || evidence.imageSlots < 0 ||
      !Array.isArray(evidence.issues) || evidence.issues.length !== 0
    ) {
      errors.push(`catalog v3 final receipt has invalid browser evidence for ${evidence.page}/${evidence.viewport}`)
    }
  }
  for (const key of expected) {
    if (!seen.has(key)) {
      const [page, viewport] = key.split('\0')
      errors.push(`catalog v3 final receipt is missing browser evidence for ${page}/${viewport}`)
    }
  }
}

export function validateV3QualityReceipt(templateDir, meta) {
  if (meta.contractVersion !== 3) return []
  const errors = []
  for (const [label, pattern] of Object.entries(V3_ID_PATTERNS)) {
    const value = meta[label]
    if (typeof value !== 'string' || !pattern.test(value)) {
      errors.push(`catalog v3 ${label} is missing or invalid`)
    }
  }

  const treePath = path.join(templateDir, '.dailyclarity', 'artifact-tree.json')
  const receiptPath = path.join(templateDir, '.dailyclarity', 'final-quality-receipt.json')
  let tree
  let receipt
  try { tree = JSON.parse(readFileSync(treePath, 'utf-8')) } catch { errors.push('catalog v3 artifact tree is missing or malformed') }
  try { receipt = JSON.parse(readFileSync(receiptPath, 'utf-8')) } catch { errors.push('catalog v3 final quality receipt is missing or malformed') }
  if (!tree || !receipt) return errors

  if (
    typeof tree !== 'object' || Array.isArray(tree) || tree.version !== 1 ||
    !Array.isArray(tree.files) || tree.files.length === 0 || !SHA256_RE.test(tree.treeHash)
  ) {
    errors.push('catalog v3 artifact tree shape is invalid')
    return errors
  }

  const records = []
  const recordPaths = new Set()
  for (const item of tree.files) {
    const itemPath = normalizeArtifactTreePath(item?.path)
    if (
      !item || typeof item !== 'object' || !itemPath || itemPath !== item.path ||
      !SHA256_RE.test(item.sha256) || !Number.isSafeInteger(item.bytes) || item.bytes < 0 ||
      ARTIFACT_TREE_EXCLUSIONS.has(itemPath)
    ) {
      errors.push('catalog v3 artifact tree contains an invalid file record')
      continue
    }
    if (recordPaths.has(itemPath)) {
      errors.push(`catalog v3 artifact tree repeats file record ${itemPath}`)
      continue
    }
    recordPaths.add(itemPath)
    records.push({ path: itemPath, sha256: item.sha256, bytes: item.bytes })

    const filePath = path.resolve(templateDir, ...itemPath.split('/'))
    let stat
    try { stat = lstatSync(filePath) } catch { /* reported as missing below */ }
    if (!isPathWithin(templateDir, filePath) || !stat?.isFile() || stat.isSymbolicLink()) {
      errors.push(`catalog v3 artifact is missing or invalid ${itemPath}`)
      continue
    }
    const bytes = readFileSync(filePath)
    const actualHash = createHash('sha256').update(bytes).digest('hex')
    if (bytes.byteLength !== item.bytes || actualHash !== item.sha256) {
      errors.push(`catalog v3 artifact digest mismatch for ${itemPath}`)
    }
  }
  records.sort((left, right) => left.path.localeCompare(right.path))
  const calculatedTreeHash = manifestDigest(records)
  if (calculatedTreeHash !== tree.treeHash) errors.push('catalog v3 artifact tree hash is invalid')

  try {
    const actualPaths = listArtifactTreeFiles(templateDir)
    for (const actualPath of actualPaths) {
      if (!recordPaths.has(actualPath)) {
        errors.push(`catalog v3 artifact tree is missing file record ${actualPath}`)
      }
    }
  } catch (error) {
    errors.push(`catalog v3 artifact inventory is invalid: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (typeof receipt !== 'object' || Array.isArray(receipt) || receipt.version !== 1) {
    errors.push('catalog v3 final quality receipt shape is invalid')
    return errors
  }
  if (receipt.id !== meta.qualityReceipt) errors.push('catalog v3 final receipt id does not match manifest metadata')
  const { id: _receiptId, ...receiptBody } = receipt
  const calculatedReceiptId = `receipt_${manifestDigest(receiptBody).slice(0, 24)}`
  if (receipt.id !== calculatedReceiptId) errors.push('catalog v3 final receipt digest is invalid')
  if (receipt.legacySlug !== meta.legacySlug || receipt.niche !== meta.nicheSlug) {
    errors.push('catalog v3 final receipt lineage does not match template metadata')
  }
  if (
    !SHA256_RE.test(receipt.sourceHash) ||
    typeof receipt.ruleVersion !== 'string' || !receipt.ruleVersion.trim() ||
    typeof receipt.generatedAt !== 'string' || !Number.isFinite(Date.parse(receipt.generatedAt))
  ) {
    errors.push('catalog v3 final receipt provenance is invalid')
  }
  if (receipt.artifactHash !== tree.treeHash) errors.push('catalog v3 final receipt does not match artifact tree')
  if (
    receipt.checks?.static !== 'passed' || receipt.checks?.desktop !== 'passed' ||
    receipt.checks?.mobile !== 'passed' || receipt.checks?.criticalDefects !== 0 ||
    receipt.checks?.seriousDefects !== 0
  ) {
    errors.push('catalog v3 final receipt does not prove all required quality gates passed')
  }
  validateReceiptEvidence(receipt, meta, errors)
  return errors
}

function catalogV3Key(niche, legacySlug) {
  return `${niche}/${legacySlug}`
}

/**
 * Reconcile the uploader manifest with the authoritative, post-dedupe v3 map.
 * The per-template sidecars predate visual clustering, so only this document
 * contains the canonical design ID selected for visually equivalent aliases.
 */
export function reconcileCatalogV3Manifest(manifest, catalog) {
  const errors = []
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    return { pass: false, errors: ['catalog v3 document is missing or malformed'], manifest: null }
  }
  if (
    catalog.contractVersion !== 3 ||
    typeof catalog.ruleVersion !== 'string' || !catalog.ruleVersion.trim() ||
    typeof catalog.generatedAt !== 'string' || !Number.isFinite(Date.parse(catalog.generatedAt)) ||
    !Number.isSafeInteger(catalog.sourceTemplates) || catalog.sourceTemplates < 1 ||
    !Number.isSafeInteger(catalog.canonicalDesigns) || catalog.canonicalDesigns < 1 ||
    !Array.isArray(catalog.templates) ||
    !catalog.gallery || typeof catalog.gallery !== 'object' || Array.isArray(catalog.gallery)
  ) {
    errors.push('catalog v3 document shape is invalid')
  }
  if (!Array.isArray(catalog.templates)) {
    return { pass: false, errors, manifest: null }
  }

  const localEntries = []
  const localByKey = new Map()
  for (const [niche, templates] of Object.entries(manifest || {})) {
    if (!Array.isArray(templates)) continue
    for (const template of templates) {
      if (template?.validation?.contractVersion !== 3) continue
      const key = catalogV3Key(niche, template.legacySlug)
      if (
        typeof template.legacySlug !== 'string' ||
        !SAFE_ARTIFACT_SEGMENT_RE.test(template.legacySlug) ||
        localByKey.has(key)
      ) {
        errors.push(`local catalog v3 entry is duplicated or malformed: ${key}`)
        continue
      }
      localEntries.push(template)
      localByKey.set(key, template)
    }
  }

  const mappingsByKey = new Map()
  for (const mapping of catalog.templates) {
    const validIdentity = Boolean(
      mapping && typeof mapping === 'object' &&
      typeof mapping.niche === 'string' && SAFE_ARTIFACT_SEGMENT_RE.test(mapping.niche) &&
      typeof mapping.legacySlug === 'string' && SAFE_ARTIFACT_SEGMENT_RE.test(mapping.legacySlug) &&
      typeof mapping.canonicalLegacySlug === 'string' && SAFE_ARTIFACT_SEGMENT_RE.test(mapping.canonicalLegacySlug) &&
      ['canonical', 'alias'].includes(mapping.disposition),
    )
    const validIds = Boolean(
      validIdentity && Object.entries(V3_ID_PATTERNS).every(([field, pattern]) => (
        typeof mapping[field] === 'string' && pattern.test(mapping[field])
      )),
    )
    if (!validIdentity || !validIds) {
      errors.push('catalog v3 document contains a malformed template mapping')
      continue
    }
    const key = catalogV3Key(mapping.niche, mapping.legacySlug)
    if (mappingsByKey.has(key)) {
      errors.push(`catalog v3 document repeats template mapping ${key}`)
      continue
    }
    mappingsByKey.set(key, mapping)
  }

  if (catalog.sourceTemplates !== catalog.templates.length || catalog.sourceTemplates !== localEntries.length) {
    errors.push(
      `catalog v3 source count does not match local manifest: ` +
      `declared=${catalog.sourceTemplates} mappings=${catalog.templates.length} local=${localEntries.length}`,
    )
  }
  for (const [key, template] of localByKey) {
    const mapping = mappingsByKey.get(key)
    if (!mapping) {
      errors.push(`catalog v3 document is missing template mapping ${key}`)
      continue
    }
    for (const field of ['contentPresetId', 'themePresetId', 'qualityReceipt']) {
      if (mapping[field] !== template[field]) {
        errors.push(`catalog v3 ${field} does not match verified template ${key}`)
      }
    }
  }
  for (const key of mappingsByKey.keys()) {
    if (!localByKey.has(key)) errors.push(`catalog v3 document has unknown template mapping ${key}`)
  }

  const canonicalByDesign = new Map()
  for (const [key, mapping] of mappingsByKey) {
    const canonicalKey = catalogV3Key(mapping.niche, mapping.canonicalLegacySlug)
    const canonical = mappingsByKey.get(canonicalKey)
    const localCanonical = localByKey.get(canonicalKey)
    if (
      !canonical || canonical.disposition !== 'canonical' ||
      canonical.legacySlug !== canonical.canonicalLegacySlug ||
      canonical.designId !== mapping.designId ||
      !localCanonical || localCanonical.designId !== canonical.designId
    ) {
      errors.push(`catalog v3 template mapping has invalid canonical lineage ${key}`)
      continue
    }
    const previousCanonical = canonicalByDesign.get(mapping.designId)
    if (previousCanonical && previousCanonical !== canonicalKey) {
      errors.push(`catalog v3 design has multiple canonical templates ${mapping.designId}`)
    } else {
      canonicalByDesign.set(mapping.designId, canonicalKey)
    }
    if (mapping.disposition === 'canonical' && mapping.legacySlug !== mapping.canonicalLegacySlug) {
      errors.push(`catalog v3 canonical mapping does not point to itself ${key}`)
    }
    if (mapping.disposition === 'alias' && mapping.legacySlug === mapping.canonicalLegacySlug) {
      errors.push(`catalog v3 alias mapping points to itself ${key}`)
    }
  }
  if (catalog.canonicalDesigns !== canonicalByDesign.size) {
    errors.push(
      `catalog v3 canonical design count is invalid: declared=${catalog.canonicalDesigns} actual=${canonicalByDesign.size}`,
    )
  }

  const expectedGallery = {}
  for (const mapping of mappingsByKey.values()) {
    if (mapping.disposition !== 'canonical') continue
    expectedGallery[mapping.niche] ??= []
    expectedGallery[mapping.niche].push(mapping.legacySlug)
  }
  for (const values of Object.values(expectedGallery)) values.sort()
  const galleryNiches = new Set([
    ...Object.keys(expectedGallery),
    ...Object.keys(catalog.gallery || {}),
  ])
  for (const niche of galleryNiches) {
    const actual = catalog.gallery?.[niche]
    const expected = expectedGallery[niche] || []
    if (
      !Array.isArray(actual) ||
      actual.some((slug) => typeof slug !== 'string') ||
      new Set(actual).size !== actual.length ||
      JSON.stringify(actual) !== JSON.stringify(expected)
    ) {
      errors.push(`catalog v3 gallery does not match canonical mappings for ${niche}`)
    }
  }

  if (errors.length > 0) return { pass: false, errors, manifest: null }
  const reconciled = Object.fromEntries(
    Object.entries(manifest).map(([niche, templates]) => [
      niche,
      templates.map((template) => {
        if (template.validation?.contractVersion !== 3) return template
        const mapping = mappingsByKey.get(catalogV3Key(niche, template.legacySlug))
        return {
          ...template,
          designId: mapping.designId,
          contentPresetId: mapping.contentPresetId,
          themePresetId: mapping.themePresetId,
          qualityReceipt: mapping.qualityReceipt,
          canonicalLegacySlug: mapping.canonicalLegacySlug,
          disposition: mapping.disposition,
        }
      }),
    ]),
  )
  return { pass: true, errors: [], manifest: reconciled }
}

function applyCatalogV3DocumentFromRoot(root, manifest) {
  const hasV3Templates = Object.values(manifest).some(
    (templates) => templates.some((template) => template.validation?.contractVersion === 3),
  )
  const catalogPath = path.join(root, '_catalog-v3.json')
  if (!hasV3Templates && !existsSync(catalogPath)) return manifest
  if (!existsSync(catalogPath)) {
    throw new Error('Catalog v3 templates require the authoritative _catalog-v3.json document')
  }

  let catalog
  try {
    catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
  } catch {
    throw new Error('Authoritative _catalog-v3.json is malformed')
  }
  const result = reconcileCatalogV3Manifest(manifest, catalog)
  if (!result.pass) {
    throw new Error(`Authoritative _catalog-v3.json failed validation:\n  - ${result.errors.join('\n  - ')}`)
  }
  return result.manifest
}

function listDeployableFiles(templateDir, currentDir = templateDir, prefix = '') {
  const files = []
  for (const entry of readdirSync(currentDir)) {
    const full = path.resolve(currentDir, entry)
    if (!isPathWithin(templateDir, full)) throw new Error(`Unsafe template asset path: ${full}`)
    const stat = lstatSync(full)
    if (stat.isSymbolicLink()) throw new Error(`Template assets may not be symbolic links: ${full}`)
    const relative = prefix ? `${prefix}/${entry}` : entry
    if (stat.isDirectory()) {
      files.push(...listDeployableFiles(templateDir, full, relative))
    } else if (DEPLOYABLE_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
      files.push(relative.split(path.sep).join('/'))
    }
  }
  return files.sort()
}

function validateTemplateDirectory(templateDir, nicheSlug, templateKey) {
  const meta = parseTemplateMeta(templateDir, nicheSlug, templateKey)
  if (!meta) return { meta: null, result: { pass: false, errors: ['missing index.html'], tokens: [] } }

  const pages = {}
  const structuralErrors = []
  for (const page of meta.pages) {
    const pagePath = path.resolve(templateDir, page)
    if (!isPathWithin(templateDir, pagePath) || !existsSync(pagePath)) {
      structuralErrors.push(`invalid or missing page ${page}`)
      continue
    }
    pages[page] = readFileSync(pagePath, 'utf-8')
  }
  for (const page of meta.pages) {
    if (!meta.files.includes(page)) structuralErrors.push(`page is missing from deployable files: ${page}`)
  }
  structuralErrors.push(...validateV3QualityReceipt(templateDir, meta))
  const initialContract = validateUploadContract(pages, meta.fields)
  // Legacy libraries often have a correct tokenized HTML surface but stale
  // fields.json metadata. Rebuild the manifest fields from the actual tokens;
  // this is a lossless metadata repair and never invents editability for a
  // tokenless template.
  meta.fields = fieldsMatchingTokens(meta.fields, initialContract.tokens)
  const contract = validateUploadContract(pages, meta.fields)
  return {
    meta,
    result: {
      ...contract,
      pass: structuralErrors.length === 0 && contract.pass,
      errors: [...structuralErrors, ...contract.errors],
    },
  }
}

// ---------- collect all files to upload ----------

function isPathWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate))
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

async function collectFiles(root, dir, relBase) {
  const results = []
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const full = path.resolve(dir, entry)
    if (!isPathWithin(root, full)) {
      throw new Error(`Refusing to read outside template root: ${full}`)
    }
    const rel = relBase ? `${relBase}/${entry}` : entry
    const stat = lstatSync(full)
    if (stat.isSymbolicLink()) {
      throw new Error(`Refusing to follow symbolic link in template library: ${rel}`)
    }
    if (stat.isDirectory()) {
      results.push(...await collectFiles(root, full, rel))
    } else {
      results.push({ full, key: rel, bytes: stat.size })
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

function buildManifest(nicheSlugs) {
  const manifest = {}
  let totalTemplates = 0
  const rejectedTemplates = []

  for (const nicheSlug of nicheSlugs) {
    const nicheDir = path.join(PLATFORM_BUILDER_ROOT, nicheSlug)
    if (!existsSync(nicheDir)) {
      manifest[nicheSlug] = []
      continue
    }
    const templates = []
    for (const entry of readdirSync(nicheDir)) {
      const templateDir = path.resolve(nicheDir, entry)
      if (!isPathWithin(PLATFORM_BUILDER_ROOT, templateDir)) {
        throw new Error(`Refusing to scan outside template root: ${templateDir}`)
      }
      const stat = lstatSync(templateDir)
      if (stat.isSymbolicLink()) {
        throw new Error(`Refusing to follow symbolic link in template library: ${nicheSlug}/${entry}`)
      }
      if (!stat.isDirectory()) continue
      const templateKey = `${nicheSlug}/${entry}`
      const { meta: template, result } = validateTemplateDirectory(
        templateDir,
        nicheSlug,
        templateKey,
      )
      if (!template || !result.pass) {
        rejectedTemplates.push({ key: templateKey, errors: result.errors })
        continue
      }
      templates.push({
        ...template,
        editable: true,
        validation: {
          status: 'passed',
          contractVersion: template.contractVersion,
          tokens: result.tokens,
        },
      })
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

  return { manifest, totalTemplates, rejectedTemplates }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`
}

function hasValidationStamp(template) {
  const hasBaseStamp = Boolean(
    template &&
    typeof template === 'object' &&
    template.editable === true &&
    template.validation?.status === 'passed' &&
    SUPPORTED_CATALOG_CONTRACT_VERSIONS.has(template.validation?.contractVersion) &&
    Array.isArray(template.validation?.tokens) &&
    template.validation.tokens.length > 0,
  )
  if (!hasBaseStamp || template.validation.contractVersion !== 3) return hasBaseStamp
  const hasCompositionIds = Object.entries(V3_ID_PATTERNS).every(([field, pattern]) => (
    typeof template[field] === 'string' && pattern.test(template[field])
  ))
  const hasCanonicalLineage = Boolean(
    typeof template.legacySlug === 'string' && SAFE_ARTIFACT_SEGMENT_RE.test(template.legacySlug) &&
    typeof template.canonicalLegacySlug === 'string' && SAFE_ARTIFACT_SEGMENT_RE.test(template.canonicalLegacySlug) &&
    ['canonical', 'alias'].includes(template.disposition) &&
    (template.disposition === 'canonical') === (template.legacySlug === template.canonicalLegacySlug)
  )
  return hasCompositionIds && hasCanonicalLineage
}

export function mergeValidatedManifest(remoteManifest, localManifest, selectors, nicheSlugs) {
  if (selectors.length === 0) return localManifest

  const merged = {}
  for (const niche of nicheSlugs) {
    const remoteTemplates = Array.isArray(remoteManifest?.[niche])
      ? remoteManifest[niche].filter(hasValidationStamp)
      : []
    const localTemplates = Array.isArray(localManifest?.[niche]) ? localManifest[niche] : []
    const nicheSelectors = selectors.filter((selector) => selector === niche || selector.startsWith(`${niche}/`))

    if (nicheSelectors.length === 0) {
      merged[niche] = remoteTemplates
      continue
    }
    if (nicheSelectors.includes(niche)) {
      merged[niche] = localTemplates
      continue
    }

    const selectedDirs = new Set(nicheSelectors)
    const retained = remoteTemplates.filter((template) => !selectedDirs.has(template.dir))
    const replacements = localTemplates.filter((template) => selectedDirs.has(template.dir))
    merged[niche] = [...retained, ...replacements].sort((a, b) => {
      const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY
      const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY
      return ao === bo ? String(a.name).localeCompare(String(b.name)) : ao - bo
    })
  }
  return merged
}

export function uploadMetadataForFile(key, sha256, manifest) {
  const parts = typeof key === 'string' ? key.split('/') : []
  if (parts.length < 3 || !SHA256_RE.test(sha256)) {
    throw new Error(`Cannot derive upload metadata for invalid template key: ${key}`)
  }
  const templateDir = `${parts[0]}/${parts[1]}`
  const template = Array.isArray(manifest?.[parts[0]])
    ? manifest[parts[0]].find((entry) => entry?.dir === templateDir)
    : undefined
  const contractVersion = template?.validation?.contractVersion
  if (!SUPPORTED_CATALOG_CONTRACT_VERSIONS.has(contractVersion)) {
    throw new Error(`Cannot derive upload contract version for ${key}`)
  }
  return { sha256, contractVersion }
}

export function hasMatchingUploadMetadata(remote, expected) {
  return Boolean(
    remote?.metadata?.sha256 === expected.sha256 &&
    remote.metadata.contractVersion === expected.contractVersion,
  )
}

function validateSelectedTemplates(files) {
  const templateKeys = new Set()
  for (const { key } of files) {
    const parts = key.split('/')
    if (parts.length < 3) {
      throw new Error(`Template file is outside a niche/slug directory: ${key}`)
    }
    templateKeys.add(`${parts[0]}/${parts[1]}`)
  }

  const failures = []
  for (const templateKey of templateKeys) {
    const [nicheSlug, templateSlug] = templateKey.split('/')
    const templateDir = path.resolve(PLATFORM_BUILDER_ROOT, nicheSlug, templateSlug)
    if (!isPathWithin(PLATFORM_BUILDER_ROOT, templateDir)) {
      failures.push(`${templateKey}: resolves outside template root`)
      continue
    }

    const { result } = validateTemplateDirectory(templateDir, nicheSlug, templateKey)
    if (!result.pass) failures.push(`${templateKey}: ${result.errors.join('; ')}`)
  }

  if (failures.length > 0) {
    const shown = failures.slice(0, 20).join('\n  - ')
    const suffix = failures.length > 20 ? `\n  ...and ${failures.length - 20} more` : ''
    throw new Error(
      `Template validation failed (${failures.length}):\n  - ${shown}${suffix}`,
    )
  }
  return templateKeys.size
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseUploadArgs(argv)
  if (options.help) {
    printHelp()
    return { dryRun: true, files: 0, bytes: 0 }
  }

  PLATFORM_BUILDER_ROOT = options.root ||
    (env.TEMPLATE_LIBRARY_ROOT ? path.resolve(env.TEMPLATE_LIBRARY_ROOT) : DEFAULT_PLATFORM_BUILDER_ROOT)
  if (!existsSync(PLATFORM_BUILDER_ROOT)) {
    throw new Error(
      `platform-builder directory not found: ${PLATFORM_BUILDER_ROOT}\n` +
      'This script requires the ignored local template library at the repository root.',
    )
  }

  const nicheSlugs = loadNicheSlugs()
  for (const selector of options.only) {
    const selectedNiche = selector.split('/')[0]
    if (!nicheSlugs.includes(selectedNiche)) {
      throw new Error(`Unknown niche in --only selector: ${selectedNiche}`)
    }
  }

  let { manifest, totalTemplates, rejectedTemplates } = buildManifest(nicheSlugs)
  console.log(
    `[upload-templates] Found ${nicheSlugs.length} niches, ${totalTemplates} publishable templates, ` +
    `${rejectedTemplates.length} quarantined.`,
  )
  for (const niche of nicheSlugs) {
    const accepted = manifest[niche]?.length || 0
    const rejected = rejectedTemplates.filter(({ key }) => key.startsWith(`${niche}/`)).length
    console.log(`[upload-templates] ${niche}: publishable=${accepted} quarantined=${rejected}`)
  }
  if (rejectedTemplates.length > 0) {
    const preview = rejectedTemplates.slice(0, 10)
      .map(({ key, errors }) => {
        const shown = errors.slice(0, 4).join('; ')
        const suffix = errors.length > 4 ? `; ...and ${errors.length - 4} more issue(s)` : ''
        return `${key}: ${shown}${suffix}`
      })
      .join('\n  - ')
    const suffix = rejectedTemplates.length > 10
      ? `\n  ...and ${rejectedTemplates.length - 10} more`
      : ''
    console.warn(`[upload-templates] Quarantined templates:\n  - ${preview}${suffix}`)
  }

  manifest = applyCatalogV3DocumentFromRoot(PLATFORM_BUILDER_ROOT, manifest)
  const localCatalogIntegrity = assertLaunchCatalogManifest(manifest, 'Local validated catalog')
  console.log(
    `[upload-templates] Launch inventory verified: ${localCatalogIntegrity.totalTemplates} templates ` +
    `across ${Object.keys(localCatalogIntegrity.countsByNiche).length} niches.`,
  )

  const selectedNiches = options.only.length > 0
    ? new Set(options.only.map((selector) => selector.split('/')[0]))
    : new Set(nicheSlugs)
  const candidateFiles = []
  for (const nicheSlug of nicheSlugs) {
    if (!selectedNiches.has(nicheSlug)) continue
    const nicheDir = path.join(PLATFORM_BUILDER_ROOT, nicheSlug)
    if (!existsSync(nicheDir)) continue
    candidateFiles.push(
      ...await collectFiles(PLATFORM_BUILDER_ROOT, nicheDir, nicheSlug),
    )
  }

  const publishableTemplateDirs = new Set(
    Object.values(manifest).flat().map((template) => template.dir),
  )
  const publishableFiles = candidateFiles.filter(({ key }) => {
    const [niche, template] = key.split('/')
    return publishableTemplateDirs.has(`${niche}/${template}`)
  })

  const unmatchedSelectors = options.only.filter(
    (selector) => !publishableFiles.some(({ key }) => matchesOnlySelector(key, [selector])),
  )
  if (unmatchedSelectors.length > 0) {
    throw new Error(`--only selector matched no publishable templates: ${unmatchedSelectors.join(', ')}`)
  }

  const files = publishableFiles.filter(({ key }) => matchesOnlySelector(key, options.only))
  if (files.length === 0) throw new Error('No template files matched the upload plan')

  const validatedTemplates = validateSelectedTemplates(files)

  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  const selectorSummary = options.only.length > 0 ? options.only.join(', ') : '(all templates)'
  console.log(`[upload-templates] Selection: ${selectorSummary}`)
  console.log(
    `[upload-templates] Plan: ${files.length} files across ${validatedTemplates} validated templates, ${formatBytes(totalBytes)}, ` +
    `force=${options.force}, dryRun=${options.dryRun}.`,
  )

  if (options.dryRun) {
    console.log('[upload-templates] Dry run complete. No credentials loaded and no writes performed.')
    return { dryRun: true, files: files.length, bytes: totalBytes, totalTemplates }
  }

  if (!env.NETLIFY_AUTH_TOKEN || !env.NETLIFY_SITE_ID) {
    throw new Error('NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID must be set for a real upload')
  }

  const store = getStore({
    name: 'templates',
    consistency: 'strong',
    siteID: env.NETLIFY_SITE_ID,
    token: env.NETLIFY_AUTH_TOKEN,
  })
  let manifestToPublish = manifest
  if (options.only.length > 0) {
    const remoteManifest = await store.get('_manifest.json', { type: 'json' })
    if (!remoteManifest || typeof remoteManifest !== 'object') {
      throw new Error('A partial upload requires an existing validated remote manifest; run a full upload first')
    }
    manifestToPublish = mergeValidatedManifest(remoteManifest, manifest, options.only, nicheSlugs)
    manifestToPublish = applyCatalogV3DocumentFromRoot(PLATFORM_BUILDER_ROOT, manifestToPublish)
  }
  assertLaunchCatalogManifest(manifestToPublish, 'Manifest publish plan')

  let uploaded = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < files.length; i++) {
    const { full, key } = files[i]
    try {
      const content = await fsp.readFile(full)
      const sha256 = createHash('sha256').update(content).digest('hex')
      const metadata = uploadMetadataForFile(key, sha256, manifestToPublish)
      if (!options.force) {
        const meta = await store.getMetadata(key)
        if (hasMatchingUploadMetadata(meta, metadata)) {
          skipped++
          if ((i + 1) % 500 === 0) {
            console.log(`[upload-templates] Progress: ${i + 1} / ${files.length} (uploaded=${uploaded} skipped=${skipped} errors=${errors})`)
          }
          continue
        }
      }
      await store.set(key, content, {
        metadata,
      })
      uploaded++
      if ((uploaded + skipped) % 100 === 0 || (i + 1) % 500 === 0) {
        console.log(`[upload-templates] Progress: ${i + 1} / ${files.length} (uploaded=${uploaded} skipped=${skipped} errors=${errors})`)
      }
    } catch (error) {
      errors++
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[upload-templates] Error uploading ${key}:`, message)
    }
  }

  if (errors > 0) {
    throw new Error(
      `${errors} selected files failed; _manifest.json was not published`,
    )
  }

  await store.setJSON('_manifest.json', manifestToPublish)
  const publishedManifest = await store.get('_manifest.json', { type: 'json' })
  const readback = verifyPublishedManifest(manifestToPublish, publishedManifest)
  if (!readback.pass) {
    throw new Error(
      `Published manifest readback verification failed:\n  - ${readback.errors.join('\n  - ')}`,
    )
  }
  const publishedTemplates = Object.values(manifestToPublish).flat().length
  console.log(`[upload-templates] Uploaded _manifest.json (niches=${nicheSlugs.length} templates=${publishedTemplates})`)
  console.log(`[upload-templates] Readback verified (sha256=${readback.publishedDigest})`)
  console.log(`[upload-templates] Done. uploaded=${uploaded} skipped=${skipped} errors=0 total=${files.length}`)
  return { dryRun: false, files: files.length, bytes: totalBytes, totalTemplates, uploaded, skipped }
}

const entryPoint = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : ''
const modulePath = path.resolve(fileURLToPath(import.meta.url)).toLowerCase()
if (entryPoint === modulePath) {
  main().catch((error) => {
    console.error('[upload-templates]', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
