#!/usr/bin/env node
/**
 * upload-templates-to-blobs.mjs
 *
 * Reads an explicit deterministic curated export and uploads every template
 * file to an immutable digest-prefixed release in the Netlify Blobs
 * "templates" store. The live `_manifest.json` pointer is switched only after
 * every release object and the release manifest have been verified.
 *
 * Designed to run in GitHub Actions where platform-builder/ is checked out.
 * Auth is read from NETLIFY_AUTH_TOKEN + NETLIFY_SITE_ID env vars.
 *
 * Usage:
 *   node scripts/upload-templates-to-blobs.mjs --root <curated-export>
 *     [--force] [--dry-run]
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
let PLATFORM_BUILDER_ROOT = ''
const SHA256_RE = /^[a-f0-9]{64}$/

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
    Array.isArray(parsed.templatesByNiche) ||
    typeof parsed.curatedReportSha256 !== 'string' ||
    !SHA256_RE.test(parsed.curatedReportSha256) ||
    typeof parsed.templateIdentitySha256 !== 'string' ||
    !SHA256_RE.test(parsed.templateIdentitySha256)
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
    curatedReportSha256: parsed.curatedReportSha256,
    templateIdentitySha256: parsed.templateIdentitySha256,
  })
}

export const LAUNCH_CATALOG_CONTRACT = loadLaunchCatalogContract()

function expectedTemplateKeySet() {
  const keys = new Set()
  for (const [niche, count] of Object.entries(LAUNCH_CATALOG_CONTRACT.templatesByNiche)) {
    for (let index = 1; index <= count; index++) {
      const ordinal = String(index).padStart(2, '0')
      keys.add(`${niche}/curated-v2-${niche.replace(/_/g, '-')}-${ordinal}`)
    }
  }
  return keys
}

const EXPECTED_TEMPLATE_KEYS = expectedTemplateKeySet()

function normalizedTemplateIdentities(templates) {
  return templates
    .map(({ niche, slug, sha256 }) => ({ niche, slug, sha256 }))
    .sort((a, b) => `${a.niche}/${a.slug}`.localeCompare(`${b.niche}/${b.slug}`))
}

export function templateIdentityDigest(templates) {
  return createHash('sha256')
    .update(JSON.stringify(normalizedTemplateIdentities(templates)))
    .digest('hex')
}

function loadApprovedCatalogReceipt() {
  const receiptPath = path.join(
    APP_ROOT,
    'src',
    'lib',
    'templates',
    'launch-catalog-approved-receipt.json',
  )
  const parsed = JSON.parse(readFileSync(receiptPath, 'utf-8'))
  if (
    parsed?.contractVersion !== 2 ||
    parsed?.totalTemplates !== LAUNCH_CATALOG_CONTRACT.totalTemplates ||
    !Array.isArray(parsed?.templates) ||
    parsed.templates.length !== LAUNCH_CATALOG_CONTRACT.totalTemplates
  ) {
    throw new Error('Approved catalog receipt is malformed')
  }
  const seen = new Set()
  for (const item of parsed.templates) {
    const key = `${item?.niche}/${item?.slug}`
    if (!EXPECTED_TEMPLATE_KEYS.has(key) || seen.has(key) || !SHA256_RE.test(String(item?.sha256 || ''))) {
      throw new Error(`Approved catalog receipt contains an invalid identity: ${key}`)
    }
    seen.add(key)
  }
  if (
    seen.size !== EXPECTED_TEMPLATE_KEYS.size ||
    templateIdentityDigest(parsed.templates) !== LAUNCH_CATALOG_CONTRACT.templateIdentitySha256
  ) {
    throw new Error('Approved catalog receipt digest does not match the launch contract')
  }
  return Object.freeze({
    ...parsed,
    templates: Object.freeze(parsed.templates.map((item) => Object.freeze({ ...item }))),
  })
}

export const LAUNCH_CATALOG_APPROVED_RECEIPT = loadApprovedCatalogReceipt()
const APPROVED_TEMPLATE_SHA_BY_KEY = new Map(
  LAUNCH_CATALOG_APPROVED_RECEIPT.templates.map((item) => [`${item.niche}/${item.slug}`, item.sha256]),
)

/** Require the exact launch distribution after template validation/quarantine. */
export function validateLaunchCatalogManifest(manifest) {
  const errors = []
  const countsByNiche = {}
  const identities = []
  const seenTemplateKeys = new Set()
  const isManifestObject = Boolean(manifest && typeof manifest === 'object' && !Array.isArray(manifest))
  const source = isManifestObject ? manifest : {}
  if (!isManifestObject) errors.push('manifest is missing or malformed')

  for (const [niche, expected] of Object.entries(LAUNCH_CATALOG_CONTRACT.templatesByNiche)) {
    const templates = source[niche]
    const actual = Array.isArray(templates) ? templates.length : 0
    countsByNiche[niche] = actual
    if (!Array.isArray(templates)) errors.push(`${niche}: manifest entry is missing or malformed`)
    if (actual !== expected) errors.push(`${niche}: expected ${expected}, found ${actual}`)
    for (const template of Array.isArray(templates) ? templates : []) {
      const slug = typeof template?.slug === 'string' ? template.slug : ''
      const sha256 = typeof template?.artifactSha256 === 'string'
        ? template.artifactSha256.toLowerCase()
        : ''
      const key = `${niche}/${slug}`
      if (!EXPECTED_TEMPLATE_KEYS.has(key)) errors.push(`${key}: template is not in the approved launch receipt`)
      if (seenTemplateKeys.has(key)) errors.push(`${key}: duplicate template identity`)
      seenTemplateKeys.add(key)
      if (!SHA256_RE.test(sha256)) errors.push(`${key}: missing or invalid artifact SHA-256`)
      if (APPROVED_TEMPLATE_SHA_BY_KEY.get(key) !== sha256) {
        errors.push(`${key}: artifact SHA-256 differs from the approved launch receipt`)
      }
      identities.push({ niche, slug, sha256 })
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
  for (const key of EXPECTED_TEMPLATE_KEYS) {
    if (!seenTemplateKeys.has(key)) errors.push(`${key}: approved template is missing`)
  }
  if (
    identities.length === LAUNCH_CATALOG_CONTRACT.totalTemplates &&
    templateIdentityDigest(identities) !== LAUNCH_CATALOG_CONTRACT.templateIdentitySha256
  ) {
    errors.push('template identity digest differs from the approved curated receipt')
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
  node scripts/upload-templates-to-blobs.mjs --root /tmp/curated --dry-run --only aromatherapy
  node scripts/upload-templates-to-blobs.mjs --root /tmp/curated --only aromatherapy/my-template --force

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
  }
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

function listAllTemplateFiles(templateDir, currentDir = templateDir, prefix = '') {
  const files = []
  for (const entry of readdirSync(currentDir).sort()) {
    const full = path.resolve(currentDir, entry)
    if (!isPathWithin(templateDir, full)) throw new Error(`Unsafe template artifact path: ${full}`)
    const stat = lstatSync(full)
    if (stat.isSymbolicLink()) throw new Error(`Template artifacts may not be symbolic links: ${full}`)
    const relative = prefix ? `${prefix}/${entry}` : entry
    if (stat.isDirectory()) files.push(...listAllTemplateFiles(templateDir, full, relative))
    else if (stat.isFile()) files.push(relative.split(path.sep).join('/'))
  }
  return files.sort()
}

function hashTemplateDirectory(templateDir) {
  const hash = createHash('sha256')
  for (const file of listAllTemplateFiles(templateDir)) {
    hash.update(file)
    hash.update('\0')
    hash.update(readFileSync(path.join(templateDir, ...file.split('/'))))
    hash.update('\0')
  }
  return hash.digest('hex')
}

/** Verify the export marker plus every directory against its signed-off receipt. */
export function validateCuratedExportRoot(root) {
  const reportPath = path.join(root, 'curated-report.json')
  if (!existsSync(reportPath) || lstatSync(reportPath).isSymbolicLink()) {
    throw new Error('Curated export marker is missing or unsafe: curated-report.json')
  }
  const reportBytes = readFileSync(reportPath)
  const reportSha256 = createHash('sha256').update(reportBytes).digest('hex')
  if (reportSha256 !== LAUNCH_CATALOG_CONTRACT.curatedReportSha256) {
    throw new Error(
      `Curated report SHA-256 is not approved: expected ${LAUNCH_CATALOG_CONTRACT.curatedReportSha256}, found ${reportSha256}`,
    )
  }

  let report
  try {
    report = JSON.parse(reportBytes.toString('utf-8'))
  } catch {
    throw new Error('Curated export marker is not valid JSON')
  }
  if (
    report?.contractVersion !== 2 ||
    report?.templateCount !== LAUNCH_CATALOG_CONTRACT.totalTemplates ||
    !Array.isArray(report?.templates)
  ) {
    throw new Error('Curated export marker does not match publication contract v2')
  }

  const identities = []
  const seen = new Set()
  for (const receipt of report.templates) {
    const niche = typeof receipt?.niche === 'string' ? receipt.niche : ''
    const slug = typeof receipt?.slug === 'string' ? receipt.slug : ''
    const sha256 = typeof receipt?.sha256 === 'string' ? receipt.sha256.toLowerCase() : ''
    const key = `${niche}/${slug}`
    if (!EXPECTED_TEMPLATE_KEYS.has(key) || seen.has(key) || !SHA256_RE.test(sha256)) {
      throw new Error(`Curated export marker contains an unapproved or duplicate identity: ${key}`)
    }
    seen.add(key)
    const directory = path.resolve(root, niche, slug)
    if (!isPathWithin(root, directory) || !existsSync(directory) || !lstatSync(directory).isDirectory()) {
      throw new Error(`Curated template directory is missing or unsafe: ${key}`)
    }
    const actualSha256 = hashTemplateDirectory(directory)
    if (actualSha256 !== sha256) {
      throw new Error(`Curated template artifact differs from its receipt: ${key}`)
    }
    identities.push({ niche, slug, sha256 })
  }
  if (seen.size !== EXPECTED_TEMPLATE_KEYS.size) {
    throw new Error(`Curated export contains ${seen.size} approved identities, expected ${EXPECTED_TEMPLATE_KEYS.size}`)
  }
  const identitySha256 = templateIdentityDigest(identities)
  if (identitySha256 !== LAUNCH_CATALOG_CONTRACT.templateIdentitySha256) {
    throw new Error('Curated template identity digest differs from the approved launch receipt')
  }
  return { reportSha256, identitySha256, receipts: new Map(identities.map((item) => [`${item.niche}/${item.slug}`, item])) }
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
        artifactSha256: hashTemplateDirectory(templateDir),
        catalogReportSha256: LAUNCH_CATALOG_CONTRACT.curatedReportSha256,
        editable: true,
        validation: {
          status: 'passed',
          contractVersion: 2,
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
  return Boolean(
    template &&
    typeof template === 'object' &&
    template.editable === true &&
    template.validation?.status === 'passed' &&
    template.validation?.contractVersion === 2 &&
    Array.isArray(template.validation?.tokens) &&
    template.validation.tokens.length > 0 &&
    SHA256_RE.test(String(template.artifactSha256 || '')) &&
    template.catalogReportSha256 === LAUNCH_CATALOG_CONTRACT.curatedReportSha256,
  )
}

function sourceTemplateDir(template) {
  return typeof template?.sourceDir === 'string' ? template.sourceDir : template?.dir
}

export function releasePrefix() {
  return `_releases/${LAUNCH_CATALOG_CONTRACT.templateIdentitySha256}`
}

export function buildReleaseManifest(localManifest) {
  const prefix = releasePrefix()
  return Object.fromEntries(
    Object.entries(localManifest).map(([niche, templates]) => [
      niche,
      templates.map((template) => ({
        ...template,
        sourceDir: sourceTemplateDir(template),
        dir: `${prefix}/${niche}/${template.slug}`,
      })),
    ]),
  )
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
    const retained = remoteTemplates.filter((template) => !selectedDirs.has(sourceTemplateDir(template)))
    const replacements = localTemplates.filter((template) => selectedDirs.has(sourceTemplateDir(template)))
    merged[niche] = [...retained, ...replacements].sort((a, b) => {
      const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY
      const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY
      return ao === bo ? String(a.name).localeCompare(String(b.name)) : ao - bo
    })
  }
  return merged
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

  const configuredRoot = options.root || env.TEMPLATE_LIBRARY_ROOT
  if (!configuredRoot) {
    throw new Error(
      'An explicit curated export root is required via --root or TEMPLATE_LIBRARY_ROOT; ' +
      'implicit ignored template directories are never publishable.',
    )
  }
  PLATFORM_BUILDER_ROOT = path.resolve(configuredRoot)
  if (!existsSync(PLATFORM_BUILDER_ROOT)) {
    throw new Error(
      `curated template export directory not found: ${PLATFORM_BUILDER_ROOT}`,
    )
  }
  const curatedReceipt = validateCuratedExportRoot(PLATFORM_BUILDER_ROOT)
  console.log(
    `[upload-templates] Curated receipt verified (report=${curatedReceipt.reportSha256} identities=${curatedReceipt.identitySha256}).`,
  )

  const nicheSlugs = loadNicheSlugs()
  for (const selector of options.only) {
    const selectedNiche = selector.split('/')[0]
    if (!nicheSlugs.includes(selectedNiche)) {
      throw new Error(`Unknown niche in --only selector: ${selectedNiche}`)
    }
  }

  const { manifest, totalTemplates, rejectedTemplates } = buildManifest(nicheSlugs)
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
  const releaseManifest = buildReleaseManifest(manifest)
  let manifestToPublish = releaseManifest
  if (options.only.length > 0) {
    const remoteManifest = await store.get('_manifest.json', { type: 'json' })
    if (!remoteManifest || typeof remoteManifest !== 'object') {
      throw new Error('A partial upload requires an existing validated remote manifest; run a full upload first')
    }
    manifestToPublish = mergeValidatedManifest(remoteManifest, releaseManifest, options.only, nicheSlugs)
  }
  assertLaunchCatalogManifest(manifestToPublish, 'Manifest publish plan')

  let uploaded = 0
  let skipped = 0
  let errors = 0
  const prefix = releasePrefix()

  for (let i = 0; i < files.length; i++) {
    const { full, key } = files[i]
    const destinationKey = `${prefix}/${key}`
    try {
      const content = await fsp.readFile(full)
      const sha256 = createHash('sha256').update(content).digest('hex')
      if (!options.force) {
        const meta = await store.getMetadata(destinationKey)
        if (meta?.metadata?.sha256 === sha256 && meta.metadata.contractVersion === 2) {
          skipped++
          if ((i + 1) % 500 === 0) {
            console.log(`[upload-templates] Progress: ${i + 1} / ${files.length} (uploaded=${uploaded} skipped=${skipped} errors=${errors})`)
          }
          continue
        }
      }
      await store.set(destinationKey, content, {
        metadata: {
          sha256,
          contractVersion: 2,
          catalogReportSha256: LAUNCH_CATALOG_CONTRACT.curatedReportSha256,
        },
      })
      uploaded++
      if ((uploaded + skipped) % 100 === 0 || (i + 1) % 500 === 0) {
        console.log(`[upload-templates] Progress: ${i + 1} / ${files.length} (uploaded=${uploaded} skipped=${skipped} errors=${errors})`)
      }
    } catch (error) {
      errors++
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[upload-templates] Error uploading ${destinationKey}:`, message)
    }
  }

  if (errors > 0) {
    throw new Error(
      `${errors} selected files failed; _manifest.json was not published`,
    )
  }

  for (const { full, key } of files) {
    const content = await fsp.readFile(full)
    const sha256 = createHash('sha256').update(content).digest('hex')
    const destinationKey = `${prefix}/${key}`
    const readback = await store.getWithMetadata(destinationKey, {
      type: 'arrayBuffer',
      consistency: 'strong',
    })
    const readbackSha256 = readback?.data
      ? createHash('sha256').update(Buffer.from(readback.data)).digest('hex')
      : null
    if (
      readbackSha256 !== sha256 ||
      readback?.metadata?.sha256 !== sha256 ||
      readback.metadata.contractVersion !== 2 ||
      readback.metadata.catalogReportSha256 !== LAUNCH_CATALOG_CONTRACT.curatedReportSha256
    ) {
      throw new Error(`Strong readback failed for immutable release object: ${destinationKey}`)
    }
  }

  await store.setJSON(`${prefix}/_manifest.json`, manifestToPublish)
  const releaseReadback = await store.get(`${prefix}/_manifest.json`, { type: 'json' })
  const verifiedRelease = verifyPublishedManifest(manifestToPublish, releaseReadback)
  if (!verifiedRelease.pass) {
    throw new Error(`Immutable release manifest verification failed:\n  - ${verifiedRelease.errors.join('\n  - ')}`)
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
  console.log(`[upload-templates] Atomically switched _manifest.json (release=${prefix} niches=${nicheSlugs.length} templates=${publishedTemplates})`)
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
