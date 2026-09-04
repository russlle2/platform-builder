#!/usr/bin/env node
/**
 * upload-templates-to-blobs.mjs
 *
 * Walks ../../platform-builder/<niche>/<slug>/ directories and uploads every
 * template file to the Netlify Blobs "templates" store, keyed as
 * "<niche>/<slug>/<filename>". The explicit rehabilitation profile instead
 * uses the isolated "templates-rehab-staging" store and hash-prefixed keys.
 * Also builds and uploads the manifest JSON.
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
import { parse } from 'parse5'
import postcss from 'postcss'

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

function loadRehabCatalogContract() {
  const contractPath = path.join(
    APP_ROOT,
    'src',
    'lib',
    'templates',
    'rehab-catalog-contract.json',
  )
  const parsed = JSON.parse(readFileSync(contractPath, 'utf-8'))
  if (
    parsed?.contractVersion !== 3 ||
    !Number.isInteger(parsed.totalTemplates) ||
    parsed.totalTemplates < 1 ||
    !parsed.templatesByNiche ||
    typeof parsed.templatesByNiche !== 'object' ||
    Array.isArray(parsed.templatesByNiche)
  ) {
    throw new Error('Rehabilitation catalogue contract is malformed')
  }
  const templatesByNiche = {}
  for (const [slug, count] of Object.entries(parsed.templatesByNiche)) {
    if (!/^[a-z_][a-z0-9_]*$/.test(slug) || !Number.isInteger(count) || count < 1) {
      throw new Error(`Rehabilitation catalogue contract has an invalid niche entry: ${slug}`)
    }
    templatesByNiche[slug] = count
  }
  const calculatedTotal = Object.values(templatesByNiche).reduce((sum, count) => sum + count, 0)
  if (calculatedTotal !== parsed.totalTemplates) {
    throw new Error(
      `Rehabilitation catalogue contract totals ${calculatedTotal} templates, not ${parsed.totalTemplates}`,
    )
  }
  return Object.freeze({
    contractVersion: 3,
    totalTemplates: parsed.totalTemplates,
    templatesByNiche: Object.freeze(templatesByNiche),
  })
}

export const REHAB_STAGING_CATALOG_CONTRACT = loadRehabCatalogContract()
export const REHAB_STAGING_STORE_NAME = 'templates-rehab-staging'
export const REHAB_STAGING_ACTIVE_KEY = '_active.json'

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
  const options = {
    force: false,
    dryRun: false,
    rehabV3Staging: false,
    only: [],
    root: undefined,
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--force') {
      options.force = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--rehab-v3-staging') {
      options.rehabV3Staging = true
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
  if (options.rehabV3Staging && !options.root) {
    throw new Error('--rehab-v3-staging requires an explicit --root directory')
  }
  if (options.rehabV3Staging && options.only.length > 0) {
    throw new Error('--rehab-v3-staging requires a complete catalogue and cannot be combined with --only')
  }
  if (options.rehabV3Staging && options.force) {
    throw new Error('--rehab-v3-staging uses immutable catalog-hash paths and cannot be combined with --force')
  }
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
  ['placeholder email', /\b[A-Z0-9._%+-]+@(?:example\.(?:com|net|org)|example\.test)\b/i],
  ['placeholder practitioner name', /\b(?:Dr\.\s+Morgan\s+Ellis|Jane\s+Doe|John\s+Doe)\b/i],
  ['placeholder phone', /\(?\d{3}\)?[\s.-]*555[\s.-]*01\d{2}\b/i],
  ['placeholder street address', /\b123 Main (?:St(?:reet)?|Road|Rd\.?)\b/i],
  ['placeholder locality', /\bAnytown\b/i],
  ['placeholder city', /\bYour City\b/i],
  ['placeholder state', /\bYour State\b/i],
  [
    'generated placeholder business name',
    /\b(?:Aromatherapy|Holistic Medicine|Private Practice Therapist|Sound Bath|Wellness Coach) Studio\b/i,
  ],
]
const UNSUPPORTED_PROOF_TEXT_RE = /\b(?:proof\s*(?:(?:&|and)\s*(?:credibility|notes?|perspective)|gallery)|proof of progress|social[- ]proof|credibility\s*(?:badges?|bar|gallery|indicators?)|testimonials?|(?:client|patient) (?:success )?stor(?:y|ies)|(?:client|patient) reviews?|(?:(?:real )?client|anonymized) (?:case )?note|case note\s*\(\s*anonymized|(?:selected|short|illustrative) (?:case )?(?:vignettes?|examples?)\s*\(\s*(?:anonymized|de-identified)|what (?:our )?(?:clients?|patients?) (?:say|share)|(?:direct|rotating) voices?|voices? from (?:the )?(?:cohort|community|clients?)|trusted by|featured in|real results|success stories)\b/i
const UNSUPPORTED_PROOF_ATTRIBUTE_RE = /(?:^|[-_\s])(?:testimonials?|reviews?|quotes?|proof(?:[-_]?gallery)?|credibility|social[-_]?proof|success[-_]?stor(?:y|ies))(?:$|[-_\s])/i
const REPORTED_CLIENT_OUTCOME = String.raw`\b(?:many\s+|some\s+|our\s+)?(?:clients?|patients?|participants?|attendees?)\s+(?:found|notice(?:d|s)?|report(?:ed|s|ing)?|experience(?:d|s)?)\b[^.!?\r\n]{0,120}\b(?:better|benefits?|calm(?:er)?|changes?|clarity|confidence|energy|enhanc\w*|focus|help\w*|improv\w*|noticeable|outcomes?|progress|recall|recovery|reduc\w*|relief|rest(?:ed)?|results?|routines?\s+that\s+stick|shifts?|sleep|wins?)\b`
const ATTRIBUTED_INITIAL_QUOTE = String.raw`["“][^"”\r\n]{12,}["”]\s*[—-]\s*(?:[A-Z]\.){1,4}`
const UNSUPPORTED_FABRICATED_METRIC_RE = new RegExp([
  REPORTED_CLIENT_OUTCOME,
  ATTRIBUTED_INITIAL_QUOTE,
  String.raw`\b(?:client|customer|patient)\s+nps\s*:?\s*\d`,
  String.raw`\b(?:average\s+)?(?:habit|client|customer|member|patient)\s+retention\s*:?\s*\d+(?:\.\d+)?%`,
  String.raw`\brepeat\s+(?:clients?|customers?|members?|patients?)\s*:?\s*\d+(?:\.\d+)?%`,
  String.raw`\b(?:rating|rated|reviews?|nps|satisfaction)\b[^.!?\r\n]{0,40}\b\d(?:\.\d+)?\s*(?:out\s+of|\/)\s*5\b`,
  String.raw`\b\d(?:\.\d+)?\s*(?:out\s+of|\/)\s*5\b[^.!?\r\n]{0,40}\b(?:rating|rated|reviews?|nps|satisfaction)\b`,
  String.raw`\b(?:(?:client|community|customer|member|patient)[- ]?)?rated\s+\d(?:\.\d+)?(?:\s*(?:\/\s*5|out\s+of\s+5|stars?|[★☆]{1,5}))?\b`,
  String.raw`\b\d(?:\.\d+)?\s*(?:\/\s*5|out\s+of\s+5|stars?|[★☆]{1,5})`,
  String.raw`\b\d(?:\.\d+)?\s*[- ]\s*stars?\b[^.!?\r\n]{0,40}\b(?:rating|rated|reviews?|clients?)\b`,
  String.raw`\b(?:one|two|three|four|five)(?:\s+point\s+(?:zero|one|two|three|four|five|six|seven|eight|nine))?\s+stars?\b[^.!?\r\n]{0,40}\b(?:clients?|members?|patients?|rating|rated|reviews?)\b`,
  String.raw`\brated\b[^.!?\r\n]{0,30}\b(?:one|two|three|four|five)(?:\s+point\s+(?:zero|one|two|three|four|five|six|seven|eight|nine))?(?:\s+stars?)?(?:\b|(?=\s*[★☆]))`,
  String.raw`\brated\s+(?:[★☆]\s*){3,}`,
  String.raw`(?:[★☆]\s*){3,}`,
  String.raw`\b(?:published\s+in|as\s+seen\s+in)\b[^.!?\r\n]{1,120}`,
  String.raw`\b(?:voted|named)\s+best\b[^.!?\r\n]{0,100}`,
  String.raw`\bcase\s+stud(?:y|ies)\b`,
  String.raw`\b(?:over\s+|more\s+than\s+|join\s+)?(?:\d[\d,.]*\+?|hundreds?|thousands?|millions?)(?:\s+of)?\s+(?:happy|satisfied)\s+(?:clients?|customers?|members?|patients?)\b`,
  String.raw`\b\d{1,3}(?:\.\d+)?%\s+satisfaction(?:\s+(?:rate|score))?\b`,
  String.raw`\b\d{1,3}(?:\.\d+)?%\s+(?:(?:of\s+)?(?:clients?|customers?|members?|patients?)\s+)?(?:feel|felt|report(?:ed)?|recommend|would\s+recommend)\b`,
  String.raw`\b(?:one|two|three|four|five|six|seven|eight|nine|\d+)\s+out\s+of\s+(?:five|ten|5|10)\s+(?:clients?|customers?|members?|patients?)\b[^.!?\r\n]{0,60}\brecommend\b`,
  String.raw`\bloved\s+by\s+\d[\d,.]*\+?\s+(?:clients?|customers?|members?|patients?)\b`,
  String.raw`\bserving\s+\d[\d,.]*\+?\s+(?:clients?|customers?|members?|patients?)\s+since\s+\d{4}\b`,
  String.raw`\b(?:i|we|my|our)\b[^.!?\r\n]{0,120}\b(?:highly\s+recommend|transformed\s+my\s+life|feel\s+like\s+myself|life[- ]changing)\b`,
  String.raw`\btransformed\s+(?:my|our)\s+life\b`,
  String.raw`\b(?:an?\s+)?amazing(?:\s+and)?\s+life[- ]changing\s+(?:experience|service|session)\b`,
  String.raw`\b(?:facilitator|practitioner|coach|therapist)\b[^.!?\r\n]{0,80}\bthoughtful\s+and\s+kind\b`,
  String.raw`\b\d[\d,.]*\+?\s+(?:coaching|clinical|facilitation|practice|teaching|training)\s+hours?\s+(?:completed|delivered|logged)\b`,
  String.raw`\b\d[\d,.]*\+?\s+(?:clients?|customers?|patients?|participants?|sessions?)\s+(?:helped|served|supported|treated|delivered)\b`,
  String.raw`\b(?:we\s+have|we[’']ve)\s+(?:helped|served|supported|treated)\s+\d[\d,.]*\+?\s+(?:clients?|customers?|patients?|participants?|people)\b`,
  String.raw`\b\d[\d,.]*\+\s+(?:clients?|consults?|customers?|patients?|participants?|sessions?|workshops?)\b`,
  String.raw`\b\d{1,3}\+\s+years?\s+(?:of\s+)?(?:experience|practice|specializing|working)\b`,
  String.raw`\b(?:many|most|the\s+majority\s+of)\s+clients?\s+(?:achiev\w*|experienc\w*|report\w*)\b[^.!?\r\n]{0,100}\b(?:measurable\s+)?(?:benefits?|improvements?|outcomes?|results?)\b[^.!?\r\n]{0,60}\b(?:after|in|within)\s+\d+\s+(?:days?|sessions?|weeks?|months?)\b`,
  String.raw`\bhelp(?:s|ed|ing)?\s+(?:a|the|our)\s+(?:client|patient)\b[^.!?\r\n]{0,120}\b(?:achieve|feel|improve|notice|reduce|recover|sleep)\w*\b`,
  String.raw`\b(?:after|across|over|within)\s+\d+\s+sessions?\b[^.!?\r\n]{0,120}\b(?:clients?|patients?|they)\s+(?:achiev\w*|experienc\w*|report\w*)\s+(?:better|improv\w*|reduc\w*|relief|recovery|results?)\b`,
  String.raw`\b(?:a|the)\s+(?:client|patient)\b[^.!?\r\n]{0,120}\b(?:after|across|over|within)\s+\d+\s+sessions?\b[^.!?\r\n]{0,120}\b(?:achiev\w*|improv\w*|reduc\w*|regain\w*|recover\w*)\b`,
].join('|'), 'i')
const HEALTH_RESULT_MODIFIERS = String.raw`(?:\s+(?:a|an|the|your|our|their|overall|healthy|normal|natural|measurable|reported|perceived|physical|mental|restorative)){0,3}`
const CONDITION_ENDPOINT = String.raw`(?:anxiety|depression|post[- ]traumatic\s+stress(?:\s+disorder)?|ptsd|pain|headaches?|migraines?|insomnia|disease|illness|infections?|chronic\s+fatigue(?:\s+syndrome)?|panic\s+attacks?|arthritis|symptoms?|trauma|medical\s+conditions?)`
const PHYSIOLOGICAL_ENDPOINT = String.raw`(?:blood\s+pressure|hormones?|metabolism|digestion|endocrine\s+system|cortisol(?:\s+(?:levels?|regulation))?|(?:parasympathetic|sympathetic)\s+(?:activity|tone|response|function|nervous\s+system)|(?:autonomic\s+)?nervous\s+system(?:\s+(?:balance|regulation|function))?|neurotransmitter(?:s|\s+(?:release|levels?|activity))?|neurochemistry|(?:alpha|beta|theta|delta|gamma)\s+brain\s+waves?|neurological\s+pathways?|immune\s+(?:system|function|response|resilience|health)|immunity|sleep\s+(?:quality|efficiency|onset|latency|duration|architecture|patterns?)|cognitive\s+(?:function|performance|clarity)|memory|mental\s+sharpness|(?:muscle|tissue|cellular|nerve)\s+(?:repair|recovery|regeneration)|inflammation|inflammatory\s+responses?|nerve\s+impingement|proprioception)`
const PHYSIOLOGICAL_ACTION = String.raw`(?:activat(?:e|es|ed|ing)|aid(?:s|ed|ing)?|balanc(?:es|ed|ing)|boost(?:s|ed|ing)?|calm(?:s|ed|ing)?|enhanc(?:e|es|ed|ing)|fight(?:s|ing)?|fought|improv(?:e|es|ed|ing)|influenc(?:e|es|ed|ing)|lower(?:s|ed|ing)?|modulat(?:e|es|ed|ing)|promot(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|regulat(?:e|es|ed|ing)|reset(?:s|ting)?|restor(?:e|es|ed|ing)|stimulat(?:e|es|ed|ing)|strengthen(?:s|ed|ing)?|support(?:s|ed|ing)?|target(?:s|ed|ing)?)`
const CONDITION_ACTION = String.raw`(?:alleviat(?:e|es|ed|ing)|cur(?:e|es|ed|ing)|eliminat(?:e|es|ed|ing)|fight(?:s|ing)?|fought|heal(?:s|ed|ing)?|manag(?:e|es|ed|ing)|prevent(?:s|ed|ing)?|reduc(?:e|es|ed|ing)|reliev(?:e|es|ed|ing)|revers(?:e|es|ed|ing)|treat(?:s|ed|ing)?)`
const EMPIRICAL_HEALTH_PROOF = String.raw`(?:research\s+(?:shows?|demonstrates?|finds?|confirms?|proves?)|clinical(?:ly)?\s+(?:studied|validated|proven)|clinical\s+data|scientifically\s+(?:shown|proven)|validated\s+metrics?|saliva\s+tests?|actigraphy)`
const UNSUPPORTED_OUTCOME_CLAIM_RE = new RegExp([
  String.raw`\b(?:guarantee(?:d|s)?|promise[sd]?)\s+(?:results?|outcomes?|bookings?|revenue|growth|healing|relief)`,
  String.raw`\b(?:cure|heal|reverse|eliminate|prevent|treat)(?:s|ed|ing)?\s+(?:anxiety|depression|disease|illness|pain|symptoms?|trauma|insomnia|headaches?|stress|medical conditions?)\b`,
  String.raw`\b${PHYSIOLOGICAL_ACTION}${HEALTH_RESULT_MODIFIERS}\s+${PHYSIOLOGICAL_ENDPOINT}\b`,
  String.raw`(?:^|[.!?]\s+)(?:please\s+)?balance${HEALTH_RESULT_MODIFIERS}\s+${PHYSIOLOGICAL_ENDPOINT}\b|\b(?:can|could|may|might|will|would|helps?|helping|aims?\s+to|designed\s+to|used\s+to|to)\s+balance${HEALTH_RESULT_MODIFIERS}\s+${PHYSIOLOGICAL_ENDPOINT}\b`,
  String.raw`\b${CONDITION_ACTION}${HEALTH_RESULT_MODIFIERS}\s+${CONDITION_ENDPOINT}\b`,
  String.raw`\benhanc(?:e|es|ed|ing)\s+(?:the\s+)?(?:outcomes?|results?)\s+(?:for|in)\s+(?:${CONDITION_ENDPOINT}|${CONDITION_ENDPOINT}\s+(?:and|or)\s+${CONDITION_ENDPOINT})\s+(?:management|relief)\b`,
  String.raw`\b${EMPIRICAL_HEALTH_PROOF}\b[^.!?\r\n]{0,180}\b${PHYSIOLOGICAL_ENDPOINT}\b`,
  String.raw`\b${PHYSIOLOGICAL_ENDPOINT}\b[^.!?\r\n]{0,180}\b${EMPIRICAL_HEALTH_PROOF}\b`,
  String.raw`\bdetoxif(?:y|ies|ied|ying)\s+(?:the\s+)?body\b`,
].join('|'), 'i')
const UNSUPPORTED_CREDENTIAL_CLAIM_RE = /\b(?:independently verified|member[- ]rated|(?:client|community|member|patient|peer)[- ]reviewed|(?:faculty|facilitators?|practitioners?|providers?|professionals?|experts?|hosts?|teams?|sources?)\s+(?:(?:is|are)\s+)?reviewed by peers?|featured (?:by|in)|award(?:ed|-winning)?|accredited|recognized by|certified by|top[- ]rated|five[- ]star|(?:community|clients?|patients?|attendees?|hosts?|studios?|practitioners?|providers?|trainings?|credentials?|sessions?|participants?|collaborations?|reviews?)\s+(?:(?:is|are)\s+)?verified|(?:(?:every|all)\s+)?(?:faculty|facilitators?|practitioners?|providers?|professionals?|experts?|hosts?|teams?|sources?)\s+(?:(?:is|are)\s+)?vetted|(?:expert|client|community|practitioner)[- ]vetted)\b/i
const HARD_CODED_OFFER_PRICE_RE = /(?:(?:[$£€¥₹]\s*\d[\d,.]*(?:\s*k)?(?:\s*[–—-]\s*(?:[$£€¥₹]\s*)?\d[\d,.]*(?:\s*k)?)?(?:\s*(?:USD|CAD|AUD|NZD|EUR|GBP|JPY|INR))?)|(?:\b(?:USD|CAD|AUD|NZD|EUR|GBP|JPY|INR)\s*\d[\d,.]*(?:\s*k)?(?:\s*[–—-]\s*(?:(?:USD|CAD|AUD|NZD|EUR|GBP|JPY|INR)\s*)?\d[\d,.]*(?:\s*k)?)?)|(?:\b\d[\d,.]*(?:\s*k)?(?:\s*[–—-]\s*\d[\d,.]*(?:\s*k)?)?\s*(?:USD|CAD|AUD|NZD|EUR|GBP|JPY|INR|dollars?|pounds?|euros?|yen|rupees?)\b))(?:\s*(?:\/\s*(?:mo(?:nth)?|yr|year|wk|week|day|session|pkg|package)|per\s+(?:month|year|week|day|session|package)))?/i
const PRICE_SEMANTIC_ATTRIBUTE_RE = /^(?:aria-description|aria-label|aria-placeholder|aria-valuetext|alt|content|label|placeholder|style|title|value|data-(?:(?:[\w-]+-)?(?:amount|cost|fee|price|rate)(?:-[\w-]+)?|annual|daily|monthly|val(?:ue)?|weekly))$/i

const PUBLICATION_RISK_PATTERNS = [
  [
    'unverified testimonial or review content',
    new RegExp(`${UNSUPPORTED_PROOF_TEXT_RE.source}|${UNSUPPORTED_FABRICATED_METRIC_RE.source}`, 'i'),
  ],
  ['unverified percentage result', /\b\d{1,3}(?:\.\d+)?%\s+(?:improvement|better|reduction|relief|success|results?)\b/i],
  ['unsupported absolute efficacy claim', /\b(?:(?:clinically|scientifically) proven|(?:instant|permanent) (?:relief|results?)|(?:works?|effective) (?:every time|for everyone))\b/i],
  ['unverified credential or recognition claim', UNSUPPORTED_CREDENTIAL_CLAIM_RE],
]
const SENSITIVE_FORM_RE = /\b(?:allerg(?:y|ies|ic)|pregnan(?:t|cy)|medications?|diagnos(?:is|ed|tic)|medical history|mental[- ]health history|symptoms?|health conditions?|suicid(?:e|al)|trauma history)\b/i
const UNSAFE_INQUIRY_FORM_RE = /\b(?:passwords?|passcodes?|date of birth|birth dates?|dob|social security|ssn|tax id|insurance|member id|policy number|payment|credit cards?|debit cards?|bank accounts?|routing numbers?|emergency contacts?|uploads?|medical records?|treatment history|therapy history)\b/i
const LITERAL_EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const LITERAL_PHONE_RE = /(?:^|[^\w])(?:\+?1[\s.-]?)?(?:\(\d{3}\)[\s.-]*|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?:\s*(?:x|ext\.?)[\s\d]+)?(?:$|[^\w])/i
const CONTEXTUAL_LITERAL_PHONE_RE = /\b(?:call|phone|telephone|tel|fax|text)(?:\s+(?:us|me))?\s*(?::|at)?\s*(?:\+\s*)?\(?\d[\d().\s-]{7,}\d\b/i
const containsLiteralPhone = (value) => LITERAL_PHONE_RE.test(value) || CONTEXTUAL_LITERAL_PHONE_RE.test(value)

function decodeCssText(value) {
  return value
    .replace(/\\(?:\r\n|[\n\r\f])/g, '')
    .replace(/\\([0-9a-f]{1,6})(?:\r\n|[\t\n\f\r ])?/gi, (_match, hex) => {
      const codePoint = Number.parseInt(hex, 16)
      return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '\ufffd'
    })
    .replace(/\\([^\r\n\f0-9a-f])/gi, '$1')
}

function nonLocalSvgReference(value) {
  const probe = decodeCssText(value).trim().replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase()
  if (!probe || probe.startsWith('#')) return false
  return probe.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(probe)
}

function containsNonLocalSvgCssReference(css) {
  let root
  try { root = postcss.parse(css) } catch { return true }
  let found = false
  root.walkDecls((declaration) => {
    const value = decodeCssText(declaration.value)
    for (const match of value.matchAll(/\burl\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
      if (nonLocalSvgReference(match[2] ?? '')) found = true
    }
  })
  root.walkAtRules('import', (rule) => {
    const value = decodeCssText(rule.params)
    const reference = value.match(/^(?:url\()?\s*(["']?)(.*?)\1\s*\)?(?:\s+.*)?$/i)?.[2] ?? value
    if (nonLocalSvgReference(reference)) found = true
  })
  return found
}

function cssGeneratedTextCandidates(value) {
  const strings = []
  for (let index = 0; index < value.length;) {
    const quote = value[index]
    if (quote !== '"' && quote !== "'") {
      index += 1
      continue
    }
    index += 1
    let raw = ''
    while (index < value.length) {
      const character = value[index]
      if (character === '\\') {
        raw += character
        index += 1
        if (index < value.length) raw += value[index++]
        continue
      }
      if (character === quote) {
        index += 1
        break
      }
      raw += character
      index += 1
    }
    strings.push(decodeCssText(raw))
  }
  if (strings.length === 0) return []
  return [...new Set([...strings, strings.join('')])]
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function unsafeCssGeneratedText(value) {
  const labels = new Set()
  for (const text of cssGeneratedTextCandidates(value)) {
    if (/[\p{L}\p{N}]/u.test(text)) labels.add('non-editable CSS generated prose')
    for (const [label, pattern] of PERSONAL_DATA_PATTERNS) if (pattern.test(text)) labels.add(label)
    if (/^(?:(?:street )?address\s*:\s*)?(?:enter\s+)?your (?:street )?address\s*\.?$/i.test(text)) {
      labels.add('placeholder street address')
    }
    for (const [label, pattern] of PUBLICATION_RISK_PATTERNS) if (pattern.test(text)) labels.add(label)
    if (containsUnsupportedOutcomeClaim(text)) labels.add('unsupported outcome claim')
    if (HARD_CODED_OFFER_PRICE_RE.test(text)) labels.add('hard-coded offer price')
    if (LITERAL_EMAIL_RE.test(text)) labels.add('hard-coded email address')
    if (containsLiteralPhone(text)) labels.add('hard-coded phone number')
  }
  const decoded = decodeCssText(value)
  if (/\battr\s*\(/i.test(decoded)) labels.add('non-editable CSS attr() generated content')
  const counters = [...decoded.matchAll(/\bcounters?\(\s*([-_A-Za-z][-_A-Za-z0-9]*)\b/gi)]
    .map((match) => match[1].toLowerCase())
  if (counters.some((name) => name !== 'step' && name !== 'steps')) {
    labels.add('non-audited CSS counter content')
  }
  if (
    counters.length > 0
    && cssGeneratedTextCandidates(value).some((text) => /[A-Za-z0-9$£€%]/.test(text))
  ) labels.add('non-audited CSS counter label')
  return [...labels]
}

function expandUploadCssGeneratedValue(value, customValues, stack = new Set(), depth = 0) {
  if (depth > 32) return { values: [], unresolved: true }
  const decoded = decodeCssText(value)
  const match = /\bvar\s*\(/iu.exec(decoded)
  if (!match) return { values: [decoded], unresolved: false }
  const open = match.index + match[0].lastIndexOf('(')
  let quote = ''
  let nested = 1
  let close = -1
  for (let index = open + 1; index < decoded.length; index += 1) {
    const character = decoded[index]
    if (quote) {
      if (character === '\\') index += 1
      else if (character === quote) quote = ''
      continue
    }
    if (character === '"' || character === "'") quote = character
    else if (character === '(') nested += 1
    else if (character === ')' && --nested === 0) {
      close = index
      break
    }
  }
  if (close < 0) return { values: [], unresolved: true }
  const inside = decoded.slice(open + 1, close)
  let comma = -1
  quote = ''
  nested = 0
  for (let index = 0; index < inside.length; index += 1) {
    const character = inside[index]
    if (quote) {
      if (character === '\\') index += 1
      else if (character === quote) quote = ''
      continue
    }
    if (character === '"' || character === "'") quote = character
    else if (character === '(') nested += 1
    else if (character === ')') nested -= 1
    else if (character === ',' && nested === 0) {
      comma = index
      break
    }
  }
  const name = inside.slice(0, comma < 0 ? undefined : comma).trim()
  const fallback = comma < 0 ? undefined : inside.slice(comma + 1).trim()
  if (!/^--[^\s,()]+$/u.test(name) || stack.has(name)) return { values: [], unresolved: true }
  const definitions = customValues.get(name)
  const substitutions = definitions?.length ? definitions : fallback ? [fallback] : []
  if (substitutions.length === 0) return { values: [], unresolved: true }
  const values = []
  let unresolved = false
  for (const substitution of substitutions) {
    const expanded = expandUploadCssGeneratedValue(substitution, customValues, new Set(stack).add(name), depth + 1)
    unresolved ||= expanded.unresolved
    for (const resolved of expanded.values) {
      const tail = expandUploadCssGeneratedValue(`${decoded.slice(0, match.index)}${resolved}${decoded.slice(close + 1)}`, customValues, stack, depth + 1)
      unresolved ||= tail.unresolved
      values.push(...tail.values)
      if (values.length > 128) return { values: values.slice(0, 128), unresolved: true }
    }
  }
  return { values: [...new Set(values)], unresolved }
}

function cssGeneratedContentClosure(css) {
  let root
  try {
    root = postcss.parse(css)
  } catch (error) {
    return {
      values: [],
      attributes: [],
      unresolvedVariable: false,
      error: `unparseable stylesheet: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
  const customValues = new Map()
  const contentValues = []
  const quoteValues = []
  root.walkDecls((declaration) => {
    const property = decodeCssText(declaration.prop)
    if (property.toLowerCase() === 'content') contentValues.push(declaration.value)
    if (property.toLowerCase() === 'quotes') quoteValues.push(declaration.value)
    if (property.startsWith('--')) {
      const values = customValues.get(property) ?? []
      values.push(declaration.value)
      customValues.set(property, values)
    }
  })
  let unresolvedVariable = false
  const resolvedContent = []
  for (const value of contentValues) {
    const expanded = expandUploadCssGeneratedValue(value, customValues)
    resolvedContent.push(...expanded.values)
    unresolvedVariable ||= expanded.unresolved
  }
  const resolvedQuotes = []
  for (const value of quoteValues) {
    const expanded = expandUploadCssGeneratedValue(value, customValues)
    resolvedQuotes.push(...expanded.values)
    unresolvedVariable ||= expanded.unresolved
  }
  // Quote state crosses stylesheet boundaries, so quoted generated text is
  // never assumed inert merely because open-quote is declared elsewhere.
  const values = [...resolvedContent, ...resolvedQuotes]
  const attributes = new Set()
  for (const value of values) {
    for (const match of decodeCssText(value).matchAll(/\battr\(\s*([-_A-Za-z][-_A-Za-z0-9]*)\b/gi)) {
      attributes.add(match[1].toLowerCase())
    }
  }
  return { values, attributes: [...attributes], unresolvedVariable }
}

function unsafeCssGeneratedContent(css) {
  const closure = cssGeneratedContentClosure(css)
  if (closure.error) return [closure.error]
  const labels = new Set()
  try {
    const root = postcss.parse(css)
    const expression = /\{\{\s*[A-Za-z_][^{}]*(?:\}\}|$)/u
    let hasExpression = false
    root.walkDecls((declaration) => { hasExpression ||= expression.test(`${declaration.prop}:${declaration.value}`) })
    root.walkRules((rule) => { hasExpression ||= expression.test(rule.selector) })
    root.walkAtRules((rule) => { hasExpression ||= expression.test(`${rule.name} ${rule.params}`) })
    if (hasExpression) labels.add('unsupported CSS template expression')
  } catch {
    // cssGeneratedContentClosure already reports the authoritative parse error.
  }
  if (closure.unresolvedVariable) labels.add('unresolved CSS generated-content variable')
  for (const value of closure.values) {
    for (const label of unsafeCssGeneratedText(value)) labels.add(label)
  }
  return [...labels]
}
const DEPLOYABLE_EXTENSIONS = new Set([
  '.html', '.css', '.js', '.mjs', '.svg', '.png', '.jpg', '.jpeg', '.gif',
  '.webp', '.avif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.txt', '.xml',
  '.webmanifest',
])

const STREET_ADDRESS_PLACEHOLDER_RE = /^(?:(?:street )?address\s*:\s*)?(?:enter\s+)?your (?:street )?address\s*\.?$/i
const SEMANTIC_TEXT_BOUNDARIES = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'caption', 'dd', 'details', 'dialog', 'div', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'legend', 'li', 'main', 'nav', 'ol', 'option', 'p', 'pre', 'section', 'summary', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'title', 'tr', 'ul',
])
const NON_SEMANTIC_ELEMENTS = new Set(['script', 'style', 'noscript', 'template'])
const SVG_TEXT_ELEMENTS = new Set(['title', 'desc', 'text'])
const SVG_SEMANTIC_ATTRIBUTES = new Set([
  'alt', 'aria-description', 'aria-label', 'data-tip', 'data-title', 'data-tooltip', 'title',
])
const STRUCTURAL_PROOF_ATTRIBUTES = new Set([
  'class', 'id', 'data-block', 'data-component', 'data-kind', 'data-role', 'data-section', 'data-type',
])

function walkSemanticNodes(node, visit) {
  visit(node)
  for (const child of node.childNodes ?? []) walkSemanticNodes(child, visit)
}

function nodeAttribute(node, name) {
  return node.attrs?.find((attribute) => attribute.name.toLowerCase() === name)?.value
}

function semanticNodeText(node) {
  const tag = node.tagName?.toLowerCase() ?? ''
  if (NON_SEMANTIC_ELEMENTS.has(tag) || tag === 'svg') return ''
  if (tag === 'br') return ' '
  if (tag === 'wbr') return ''
  return [node.value ?? '', ...(node.childNodes ?? []).map(semanticNodeText)].join('')
}

function semanticTextSegments(document, { excludeNonSemanticAncestors = false } = {}) {
  const segments = []
  const boundary = '\u0000'
  const inlineText = (node, root) => {
    const tag = node.tagName?.toLowerCase() ?? ''
    if (node !== root && SEMANTIC_TEXT_BOUNDARIES.has(tag)) return boundary
    if (NON_SEMANTIC_ELEMENTS.has(tag) || tag === 'svg') return ''
    if (tag === 'br') return ' '
    if (tag === 'wbr') return ''
    return [node.value ?? '', ...(node.childNodes ?? []).map((child) => inlineText(child, root))].join('')
  }
  const svgText = (node) => {
    const tag = node.tagName?.toLowerCase() ?? ''
    if (tag === 'br') return ' '
    if (tag === 'wbr') return ''
    return [node.value ?? '', ...(node.childNodes ?? []).map(svgText)].join('')
  }
  const walk = (node, insideSvg = false) => {
    const tag = node.tagName?.toLowerCase() ?? ''
    if (excludeNonSemanticAncestors && NON_SEMANTIC_ELEMENTS.has(tag)) return
    if (insideSvg) {
      if (SVG_TEXT_ELEMENTS.has(tag)) {
        const text = svgText(node).replace(/\s+/g, ' ').trim()
        if (text) segments.push(text)
        return
      }
      if (tag === 'foreignobject') {
        for (const child of node.childNodes ?? []) walk(child, false)
        return
      }
      for (const child of node.childNodes ?? []) walk(child, true)
      return
    }
    if (tag === 'svg') {
      for (const child of node.childNodes ?? []) walk(child, true)
      return
    }
    if (SEMANTIC_TEXT_BOUNDARIES.has(tag)) {
      for (const run of inlineText(node, node).split(boundary)) {
        const text = run.replace(/\s+/g, ' ').trim()
        if (text) segments.push(text)
      }
    }
    for (const child of node.childNodes ?? []) walk(child, false)
  }
  walk(document)
  return segments
}

function semanticAttributes(document, { excludeNonSemanticAncestors = false } = {}) {
  const attributes = []
  const visit = (node, insideSvg = false) => {
    const tag = node.tagName?.toLowerCase() ?? ''
    if (excludeNonSemanticAncestors && NON_SEMANTIC_ELEMENTS.has(tag)) return
    for (const attribute of node.attrs ?? []) {
      const name = attribute.name.toLowerCase()
      if (insideSvg && !SVG_SEMANTIC_ATTRIBUTES.has(name)) continue
      const value = attribute.value.replace(/\s+/g, ' ').trim()
      if (value) attributes.push({ name, value })
    }
    if (insideSvg && tag === 'foreignobject') {
      for (const child of node.childNodes ?? []) visit(child, false)
      return
    }
    for (const child of node.childNodes ?? []) visit(child, insideSvg || tag === 'svg')
  }
  visit(document)
  return attributes
}

function semanticAnchorHrefs(document) {
  const hrefs = []
  walkSemanticNodes(document, (node) => {
    if (node.tagName !== 'a') return
    const href = nodeAttribute(node, 'href')?.trim()
    if (href) hrefs.push(href)
  })
  return hrefs
}

function inlineStyles(document) {
  const styles = []
  const visit = (node) => {
    if (node.tagName === 'template') return
    if (node.tagName === 'style') {
      styles.push((node.childNodes ?? []).map((child) => child.value ?? '').join(''))
      return
    }
    for (const child of node.childNodes ?? []) visit(child)
  }
  visit(document)
  return styles
}

function duplicateDomIds(document) {
  const seen = new Set()
  const duplicates = new Set()
  walkSemanticNodes(document, (node) => {
    const id = nodeAttribute(node, 'id')
    if (!id) return
    if (seen.has(id)) duplicates.add(id)
    else seen.add(id)
  })
  return [...duplicates]
}

function containsContextualStreetAddressPlaceholder(document) {
  let found = semanticTextSegments(document, { excludeNonSemanticAncestors: true })
    .some((text) => STREET_ADDRESS_PLACEHOLDER_RE.test(text))
  const addressFieldSignal = /(?:^|[-_[\]])(?:(?:street[-_ ]?)?address|street)(?:$|[-_[\]])|^address-line[12]$/i
  const isAddressField = (node) => (
    ['address', 'input', 'select', 'textarea'].includes(node.tagName ?? '')
    || (node.attrs ?? []).some(({ name, value }) => (
      ['autocomplete', 'id', 'name'].includes(name.toLowerCase()) && addressFieldSignal.test(value)
    ))
  )
  const containsAddressField = (node) => isAddressField(node) || (node.childNodes ?? []).some(containsAddressField)
  const visit = (node) => {
    const tag = node.tagName?.toLowerCase() ?? ''
    if (found || NON_SEMANTIC_ELEMENTS.has(tag)) return
    if (node.tagName) {
      const addressField = isAddressField(node)
        || (['fieldset', 'form', 'label'].includes(node.tagName) || nodeAttribute(node, 'role') === 'group')
          && containsAddressField(node)
      for (const attribute of node.attrs ?? []) {
        const name = attribute.name.toLowerCase()
        if (
          (name === 'placeholder' || name === 'value' || (addressField && (name === 'aria-label' || name === 'title')))
          && STREET_ADDRESS_PLACEHOLDER_RE.test(attribute.value.trim())
        ) {
          found = true
          return
        }
      }
    }
    for (const child of node.childNodes ?? []) visit(child)
  }
  visit(document)
  return found
}

function containsUnsupportedProofMarkup(document) {
  let found = false
  const visit = (node) => {
    if (found) return
    if (node.tagName && NON_SEMANTIC_ELEMENTS.has(node.tagName)) return
    for (const attribute of node.attrs ?? []) {
      if (STRUCTURAL_PROOF_ATTRIBUTES.has(attribute.name.toLowerCase()) && UNSUPPORTED_PROOF_ATTRIBUTE_RE.test(attribute.value)) {
        found = true
        return
      }
    }
    for (const child of node.childNodes ?? []) visit(child)
  }
  visit(document)
  return found
}

function isUnsupportedProofHeading(text) {
  const normalized = text
    .replace(/\{\{\s*[A-Za-z0-9_]+\s*\}\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return /^(?:credibility|quick stats?|social[- ]proof|proof\s+of\s+progress|proof\s*(?:(?:&|and)\s*(?:notes?|perspective)|[—-]\s*)?|rotating voices?\s*(?:&|and)\s*credibility)$/i.test(normalized)
}

function containsUnsupportedProofHeadingMarkup(document) {
  let found = false
  const visit = (node) => {
    if (found) return
    if (node.tagName && NON_SEMANTIC_ELEMENTS.has(node.tagName)) return
    if (
      /^(?:title|h[1-6]|legend)$/.test(node.tagName ?? '')
      && isUnsupportedProofHeading(semanticNodeText(node))
    ) found = true
    for (const child of node.childNodes ?? []) visit(child)
  }
  visit(document)
  return found
}

function splitClaimSentences(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .match(/[^.!?\n]+(?:[.!?]+["'’”)*\]]*|(?=\n)|$)/gu)
    ?.map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter(Boolean) ?? []
}

function isExcludedOutcomeMatch(sentence, matchIndex, matchText) {
  if (/\?\s*["'’”)*\]]*$/.test(sentence)) return true
  const before = sentence.slice(Math.max(0, matchIndex - 120), matchIndex)
  if (/(?:\b(?:do(?:es|did)?\s+not|cannot|can['’]t|will\s+not|won['’]t|never|not\s+intended\s+to|isn['’]t\s+intended\s+to|aren['’]t\s+intended\s+to)\b|\b(?:no|insufficient)\s+evidence\b)[^.;:!?]{0,64}$/i.test(before)) return true
  if (/\b(?:ask|consult|check\s+with|speak|talk)\b[^.;:!?]{0,90}\b(?:whether|if)\b[^.;:!?]{0,40}$/i.test(before)) return true
  if (/\b(?:awareness|discussion|education|information|knowledge|understanding)\s+(?:about|of)\b/i.test(matchText)) return true
  return /\b(?:found|finds?|shows?|showed|demonstrates?)\s+(?:no|none|little)\b/i.test(matchText)
}

function containsUnsupportedOutcomeClaim(text) {
  const matcher = new RegExp(UNSUPPORTED_OUTCOME_CLAIM_RE.source, 'gi')
  for (const sentence of splitClaimSentences(text)) {
    matcher.lastIndex = 0
    let match
    while ((match = matcher.exec(sentence)) !== null) {
      if (!isExcludedOutcomeMatch(sentence, match.index, match[0])) return true
      if (match[0].length === 0) matcher.lastIndex += 1
    }
  }
  return false
}

function uploadFormTopology(document) {
  const forms = []
  const controls = []
  const buttons = []
  const associated = []
  walkSemanticNodes(document, (node) => {
    if (node.tagName === 'form') forms.push(node)
    if (['button', 'input', 'select', 'textarea'].includes(node.tagName ?? '')) associated.push(node)
    if (['input', 'select', 'textarea'].includes(node.tagName ?? '')) controls.push(node)
    if (node.tagName === 'button') buttons.push(node)
  })
  const formsById = new Map()
  for (const form of forms) {
    const id = nodeAttribute(form, 'id')
    if (!id) continue
    const matches = formsById.get(id) ?? []
    matches.push(form)
    formsById.set(id, matches)
  }
  const ownerByControl = new Map()
  for (const control of associated) {
    const explicitOwner = nodeAttribute(control, 'form')
    if (explicitOwner !== undefined) {
      const matches = formsById.get(explicitOwner) ?? []
      ownerByControl.set(control, matches.length === 1 ? matches[0] : undefined)
      continue
    }
    let ancestor = control.parentNode
    while (ancestor && ancestor.tagName !== 'form') ancestor = ancestor.parentNode
    ownerByControl.set(control, ancestor?.tagName === 'form' ? ancestor : undefined)
  }
  return { forms, controls, buttons, associated, ownerByControl }
}

function uploadButtonIsSubmit(button) {
  const type = nodeAttribute(button, 'type')?.trim().toLowerCase()
  return type === undefined || type === '' || !['button', 'reset'].includes(type)
}

function uploadSubtreeAttributeValues(root) {
  const values = []
  const visit = (node) => {
    if (node.tagName && NON_SEMANTIC_ELEMENTS.has(node.tagName)) return
    for (const attribute of node.attrs ?? []) {
      const name = attribute.name.toLowerCase()
      if (
        ['alt', 'aria-description', 'aria-label', 'aria-placeholder', 'autocomplete', 'label', 'name', 'placeholder', 'title', 'value'].includes(name)
        || name.startsWith('data-tip')
        || name.startsWith('data-tooltip')
      ) values.push(attribute.value)
    }
    for (const child of node.childNodes ?? []) visit(child)
  }
  visit(root)
  return values
}

function uploadControlAccessibleName(document, control) {
  const ids = new Map()
  const labels = []
  walkSemanticNodes(document, (node) => {
    const id = nodeAttribute(node, 'id')
    if (id) {
      const matches = ids.get(id) ?? []
      matches.push(node)
      ids.set(id, matches)
    }
    if (node.tagName === 'label') labels.push(node)
  })

  const isHiddenLabel = (node) => {
    let cursor = node
    while (cursor) {
      if (
        nodeAttribute(cursor, 'hidden') !== undefined
        || nodeAttribute(cursor, 'inert') !== undefined
        || nodeAttribute(cursor, 'aria-hidden')?.toLowerCase() === 'true'
      ) return true
      cursor = cursor.parentNode
    }
    return false
  }
  const sources = new Set()
  let ancestor = control.parentNode
  while (ancestor) {
    if (ancestor.tagName === 'label' && !isHiddenLabel(ancestor)) sources.add(ancestor)
    ancestor = ancestor.parentNode
  }
  const controlId = nodeAttribute(control, 'id')
  if (controlId) {
    for (const label of labels) {
      if (nodeAttribute(label, 'for') === controlId && !isHiddenLabel(label)) sources.add(label)
    }
  }

  let invalidReference = Boolean(controlId && (ids.get(controlId)?.length ?? 0) !== 1)
  const labelledBy = nodeAttribute(control, 'aria-labelledby')
  if (labelledBy !== undefined) {
    const names = labelledBy.split(/\s+/).filter(Boolean)
    if (names.length === 0) invalidReference = true
    for (const name of names) {
      const matches = ids.get(name) ?? []
      if (matches.length !== 1 || isHiddenLabel(matches[0])) invalidReference = true
      else sources.add(matches[0])
    }
  }
  const descriptionSources = new Set()
  for (const attribute of ['aria-describedby', 'aria-details', 'aria-errormessage']) {
    const reference = nodeAttribute(control, attribute)
    if (reference === undefined) continue
    const names = reference.split(/\s+/).filter(Boolean)
    if (names.length === 0) invalidReference = true
    for (const name of names) {
      const matches = ids.get(name) ?? []
      if (matches.length !== 1 || isHiddenLabel(matches[0])) invalidReference = true
      else descriptionSources.add(matches[0])
    }
  }
  const ariaLabel = nodeAttribute(control, 'aria-label')?.trim() ?? ''
  const nativeName = (() => {
    if (control.tagName === 'button') {
      return semanticTextSegments(control, { excludeNonSemanticAncestors: true }).join(' ') || semanticNodeText(control)
    }
    if (control.tagName === 'input') {
      const type = (nodeAttribute(control, 'type') ?? 'text').trim().toLowerCase()
      if (type === 'image') return nodeAttribute(control, 'alt') ?? nodeAttribute(control, 'value') ?? ''
      if (['button', 'reset', 'submit'].includes(type)) return nodeAttribute(control, 'value') ?? ''
    }
    return nodeAttribute(control, 'title') ?? ''
  })()
  const sourceNames = [...sources].map((source) => [
      semanticTextSegments(source, { excludeNonSemanticAncestors: true }).join(' ') || semanticNodeText(source),
      nodeAttribute(source, 'alt') ?? '',
      nodeAttribute(source, 'aria-description') ?? '',
      nodeAttribute(source, 'aria-label') ?? '',
      nodeAttribute(source, 'title') ?? '',
      nodeAttribute(source, 'value') ?? '',
    ].join(' '))
  const text = (
    labelledBy !== undefined
      ? sourceNames.join(' ')
      : ariaLabel
        ? ariaLabel
        : sourceNames.length > 0
          ? sourceNames.join(' ')
          : nativeName
  ).replace(/\s+/g, ' ').trim()
  const description = [
    nodeAttribute(control, 'aria-description') ?? '',
    nodeAttribute(control, 'aria-placeholder') ?? '',
    nodeAttribute(control, 'placeholder') ?? '',
    ...[...descriptionSources].map((source) => [
      semanticTextSegments(source, { excludeNonSemanticAncestors: true }).join(' ') || semanticNodeText(source),
      nodeAttribute(source, 'alt') ?? '',
      nodeAttribute(source, 'aria-description') ?? '',
      nodeAttribute(source, 'aria-label') ?? '',
      nodeAttribute(source, 'title') ?? '',
      nodeAttribute(source, 'value') ?? '',
    ].join(' ')),
  ].join(' ').replace(/\s+/g, ' ').trim()
  return { text, description, invalidReference }
}

function validateUploadFormAccessibleGraphs(document, forms, controls) {
  const ids = new Map()
  walkSemanticNodes(document, (node) => {
    const id = nodeAttribute(node, 'id')
    if (!id) return
    const matches = ids.get(id) ?? []
    matches.push(node)
    ids.set(id, matches)
  })
  const unavailable = (node) => {
    let cursor = node
    while (cursor) {
      if (
        nodeAttribute(cursor, 'hidden') !== undefined
        || nodeAttribute(cursor, 'inert') !== undefined
        || nodeAttribute(cursor, 'aria-hidden')?.toLowerCase() === 'true'
      ) return true
      cursor = cursor.parentNode
    }
    return false
  }
  const targetSignal = (node) => [
    semanticTextSegments(node, { excludeNonSemanticAncestors: true }).join(' ') || semanticNodeText(node),
    ...['alt', 'aria-description', 'aria-label', 'title', 'value'].map((name) => nodeAttribute(node, name) ?? ''),
  ].join(' ')
  const errors = []
  for (const form of forms) {
    const signals = [
      nodeAttribute(form, 'aria-label') ?? '',
      nodeAttribute(form, 'aria-description') ?? '',
      nodeAttribute(form, 'title') ?? '',
    ]
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-details', 'aria-errormessage']) {
      const reference = nodeAttribute(form, attribute)
      if (reference === undefined) continue
      const names = reference.split(/\s+/).filter(Boolean)
      const targets = names.map((name) => ids.get(name) ?? [])
      if (names.length === 0 || targets.some((matches) => matches.length !== 1 || unavailable(matches[0]))) {
        errors.push(`form ${attribute} contains a dangling or ambiguous ID reference`)
        continue
      }
      signals.push(...targets.flatMap((matches) => matches).map(targetSignal))
    }
    if (SENSITIVE_FORM_RE.test(signals.join(' ')) || UNSAFE_INQUIRY_FORM_RE.test(signals.join(' '))) {
      errors.push('form accessible name or description solicits sensitive or unsupported information')
    }
  }
  for (const control of controls) {
    const graph = uploadControlAccessibleName(document, control)
    const hasReferences = ['aria-labelledby', 'aria-describedby', 'aria-details', 'aria-errormessage']
      .some((attribute) => nodeAttribute(control, attribute) !== undefined)
    if (hasReferences && graph.invalidReference) errors.push('form control contains a dangling or ambiguous accessible-name reference')
    if (SENSITIVE_FORM_RE.test(`${graph.text} ${graph.description}`) || UNSAFE_INQUIRY_FORM_RE.test(`${graph.text} ${graph.description}`)) {
      errors.push('form control accessible prompt solicits sensitive or unsupported information')
    }
  }
  return errors
}

function validateUploadStandardInquiryForm(form, controls, buttons, document) {
  const errors = []
  const styleSuppresses = (node) => /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\.0*)?)\s*(?:!important\s*)?(?:;|$)/i.test(nodeAttribute(node, 'style') ?? '')
  const isEffectivelyUnavailable = (node, readonly = false) => {
    let cursor = node
    while (cursor) {
      if (
        nodeAttribute(cursor, 'hidden') !== undefined
        || nodeAttribute(cursor, 'inert') !== undefined
        || nodeAttribute(cursor, 'aria-hidden')?.toLowerCase() === 'true'
        || nodeAttribute(cursor, 'aria-disabled')?.toLowerCase() === 'true'
        || styleSuppresses(cursor)
        || (cursor.tagName === 'fieldset' && nodeAttribute(cursor, 'disabled') !== undefined)
      ) return true
      if (cursor === node && (
        nodeAttribute(cursor, 'disabled') !== undefined
        || (readonly && nodeAttribute(cursor, 'readonly') !== undefined)
      )) return true
      cursor = cursor.parentNode
    }
    return false
  }
  if (nodeAttribute(form, 'data-dc-standard-form') !== 'contact') {
    errors.push('missing contact form marker')
  }
  if (nodeAttribute(form, 'name') !== 'contact') errors.push('form name must be contact')
  if (nodeAttribute(form, 'method')?.toLowerCase() !== 'post') errors.push('form method must be post')
  if (nodeAttribute(form, 'data-netlify') !== 'true') {
    errors.push('form must enable audited submission')
  }
  if (nodeAttribute(form, 'action') !== undefined) errors.push('custom form action is not allowed')
  if (nodeAttribute(form, 'novalidate') !== undefined) errors.push('form validation may not be disabled')
  if (nodeAttribute(form, 'target') !== undefined || nodeAttribute(form, 'enctype') !== undefined) {
    errors.push('custom form submission mode is not allowed')
  }
  if (['aria-description', 'aria-describedby', 'aria-details', 'aria-errormessage', 'aria-label', 'aria-labelledby', 'role', 'title']
    .some((attribute) => nodeAttribute(form, attribute) !== undefined)) {
    errors.push('form must use the canonical native accessibility semantics')
  }
  if (isEffectivelyUnavailable(form)) errors.push('form and its ancestors must be available to visitors')

  const visitActions = (node) => {
    if (node !== form && node.tagName === 'form') return
    if (['formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget'].some((name) => nodeAttribute(node, name) !== undefined)) {
      errors.push('custom control submission override is not allowed')
    }
    for (const child of node.childNodes ?? []) visitActions(child)
  }
  visitActions(form)

  const expected = new Map([
    ['name', { tag: 'input', type: 'text', required: true, autocomplete: 'name', label: 'Your name' }],
    ['email', { tag: 'input', type: 'email', required: true, autocomplete: 'email', label: 'Email' }],
    ['phone', { tag: 'input', type: 'tel', required: false, autocomplete: 'tel', label: 'Phone (optional)' }],
    ['message', { tag: 'textarea', required: true, label: 'Message', rows: '5' }],
  ])
  const seen = new Map()
  const labels = []
  walkSemanticNodes(document, (node) => { if (node.tagName === 'label') labels.push(node) })
  const labelTextWithoutControls = (label) => {
    const visit = (node) => {
      if (['button', 'input', 'select', 'textarea'].includes(node.tagName ?? '')) return ''
      return [node.value ?? '', ...(node.childNodes ?? []).map(visit)].join('')
    }
    return visit(label).replace(/\s+/g, ' ').trim()
  }
  for (const control of controls) {
    const tag = control.tagName
    const name = nodeAttribute(control, 'name') ?? ''
    const rule = expected.get(name)
    if (!rule || tag === 'select' || tag !== rule.tag) {
      errors.push(`unsupported inquiry control ${name || tag}`)
      continue
    }
    const type = tag === 'input' ? (nodeAttribute(control, 'type') ?? 'text').toLowerCase() : undefined
    if (rule.type && type !== rule.type) errors.push(`${name} control must use type ${rule.type}`)
    const required = nodeAttribute(control, 'required') !== undefined
    if (required !== rule.required) errors.push(`${name} required state is invalid`)
    if (nodeAttribute(control, 'autocomplete') !== rule.autocomplete) {
      errors.push(`${name} control autocomplete is not canonical`)
    }
    if (rule.rows !== undefined && nodeAttribute(control, 'rows') !== rule.rows) {
      errors.push(`${name} control rows are not canonical`)
    }
    if (['accept', 'capture', 'list', 'max', 'maxlength', 'min', 'minlength', 'multiple', 'pattern', 'step'].some((attribute) => nodeAttribute(control, attribute) !== undefined)) {
      errors.push(`${name} control has a noncanonical submission constraint`)
    }
    const forbiddenPromptAttributes = [
      'aria-description', 'aria-describedby', 'aria-details', 'aria-disabled', 'aria-errormessage',
      'aria-label', 'aria-labelledby', 'aria-placeholder', 'form', 'id', 'placeholder', 'title',
    ]
    if (forbiddenPromptAttributes.some((attribute) => nodeAttribute(control, attribute) !== undefined)) {
      errors.push(`${name} control must use only its canonical nested label`)
    }
    if (isEffectivelyUnavailable(control, true)) errors.push(`${name} control must be editable and available`)
    let labelAncestor = control.parentNode
    while (labelAncestor && labelAncestor.tagName !== 'label' && labelAncestor !== form) labelAncestor = labelAncestor.parentNode
    const associatedLabels = labels.filter((label) => (
      label === labelAncestor
      || Boolean(nodeAttribute(control, 'id') && nodeAttribute(label, 'for') === nodeAttribute(control, 'id'))
    ))
    if (labelAncestor?.tagName !== 'label' || associatedLabels.length !== 1) {
      errors.push(`${name} control must have exactly one canonical nested label`)
    } else if (
      ['aria-description', 'aria-describedby', 'aria-details', 'aria-errormessage', 'aria-label', 'aria-labelledby', 'for', 'hidden', 'id', 'inert', 'role', 'title']
        .some((attribute) => nodeAttribute(labelAncestor, attribute) !== undefined)
      || labelTextWithoutControls(labelAncestor) !== rule.label
      || isEffectivelyUnavailable(labelAncestor)
    ) {
      errors.push(`${name} control label must be ${rule.label}`)
    }
    seen.set(name, (seen.get(name) ?? 0) + 1)
  }
  for (const name of expected.keys()) {
    if (seen.get(name) !== 1) errors.push(`form must contain exactly one ${name} control`)
  }
  if (buttons.length !== 1) {
    errors.push('form must contain exactly one submit button')
  } else {
    const button = buttons[0]
    if ((nodeAttribute(button, 'type') ?? 'submit').toLowerCase() !== 'submit') {
      errors.push('form submit button must use type submit')
    }
    if (nodeAttribute(button, 'name') !== undefined || nodeAttribute(button, 'value') !== undefined) {
      errors.push('form submit button may not submit alternate data')
    }
    if ((nodeAttribute(button, 'aria-label') ?? semanticNodeText(button)).replace(/\s+/g, ' ').trim() !== 'Send inquiry') {
      errors.push('form submit button label must be Send inquiry')
    }
    if (['aria-description', 'aria-describedby', 'aria-details', 'aria-disabled', 'aria-errormessage', 'aria-label', 'aria-labelledby', 'form', 'formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'role', 'title'].some((attribute) => nodeAttribute(button, attribute) !== undefined)) {
      errors.push('form submit button must use the canonical submission behavior')
    }
    if (isEffectivelyUnavailable(button)) errors.push('form submit button must be enabled and available')
  }
  return errors
}

function unsafeUploadSvgAsset(svg) {
  const errors = new Set()
  const document = parse(svg)
  const text = semanticTextSegments(document, { excludeNonSemanticAncestors: true })
  const attributes = semanticAttributes(document, { excludeNonSemanticAncestors: true })
  const segments = [...text, ...attributes.map(({ value }) => value)]
  for (const [label, pattern] of PERSONAL_DATA_PATTERNS) {
    if (segments.some((segment) => pattern.test(segment))) errors.add(label)
  }
  if (containsContextualStreetAddressPlaceholder(document)) errors.add('placeholder street address')
  for (const [label, pattern] of PUBLICATION_RISK_PATTERNS) {
    if (segments.some((segment) => pattern.test(segment))) errors.add(label)
  }
  if (segments.some(containsUnsupportedOutcomeClaim)) errors.add('unsupported outcome claim')
  if (segments.some((segment) => HARD_CODED_OFFER_PRICE_RE.test(segment))) errors.add('hard-coded offer price')
  if (segments.some((segment) => LITERAL_EMAIL_RE.test(segment))) errors.add('hard-coded email address')
  if (segments.some(containsLiteralPhone)) errors.add('hard-coded phone number')
  if (segments.some((segment) => /\{\{[^{}]*\}\}|\{\{|\}\}/u.test(segment))) {
    errors.add('unsupported SVG template expression')
  }
  for (const css of inlineStyles(document)) {
    for (const label of unsafeCssGeneratedContent(css)) errors.add(`unsafe generated CSS content (${label})`)
    if (containsNonLocalSvgCssReference(css)) errors.add('non-local SVG stylesheet reference')
  }
  walkSemanticNodes(document, (node) => {
    const tag = node.tagName?.toLowerCase() ?? ''
    if (['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'form', 'input', 'select', 'textarea', 'button'].includes(tag)) {
      errors.add('active embedded content')
    }
    for (const attribute of node.attrs ?? []) {
      const name = attribute.name.toLowerCase()
      const normalized = attribute.value.replace(/[\u0000-\u0020]+/g, '').toLowerCase()
      if (name.startsWith('on') || name === 'srcdoc') errors.add('active event content')
      if (
        ['src', 'href', 'poster', 'action', 'formaction', 'xlink:href'].includes(name)
        && (/^(?:javascript:|vbscript:|blob:|file:|data:(?!image\/(?:png|gif|jpe?g|webp|avif);base64,))/i.test(normalized)
          || (['src', 'href', 'xlink:href'].includes(name) && nonLocalSvgReference(attribute.value)))
      ) errors.add('unsafe embedded URL')
      if (tag === 'a' && name === 'href' && /^(?:https?:|mailto:|tel:)/i.test(normalized)) {
        errors.add('hard-coded external contact or destination link')
      }
      if (name === 'style' && (/(?:url|image-set)\([^)]*(?:javascript:|vbscript:|blob:|file:|data:text)/i.test(normalized)
        || containsNonLocalSvgCssReference(`x{${attribute.value}}`))) {
        errors.add('unsafe embedded URL')
      }
      if (tag === 'template' && name.startsWith('shadowroot')) errors.add('unsupported declarative shadow DOM')
      if (/\{\{[^{}]*\}\}|\{\{/u.test(attribute.value)) errors.add('unsupported SVG template expression')
    }
  })
  return [...errors]
}

export function validateUploadContract(pages, fields, { requireStandardInquiryForms = true, styles = {}, svgAssets = {} } = {}) {
  const errors = []
  const tokens = new Set()
  const cssContentAttributes = new Set()

  for (const [asset, svg] of Object.entries(svgAssets)) {
    for (const label of unsafeUploadSvgAsset(svg)) errors.push(`${asset}: contains ${label}`)
  }

  for (const [stylesheet, css] of Object.entries(styles)) {
    for (const label of unsafeCssGeneratedContent(css)) {
      errors.push(`${stylesheet}: contains unsafe generated CSS content (${label})`)
    }
    for (const name of cssGeneratedContentClosure(css).attributes) cssContentAttributes.add(name)
  }

  for (const [page, html] of Object.entries(pages)) {
    const sourceDocument = parse(html)
    const duplicateIds = duplicateDomIds(sourceDocument)
    if (duplicateIds.length > 0) errors.push(`${page}: contains duplicate DOM IDs (${duplicateIds.join(', ')})`)
    const pageCssContentAttributes = new Set(cssContentAttributes)
    for (const [index, css] of inlineStyles(sourceDocument).entries()) {
      for (const label of unsafeCssGeneratedContent(css)) {
        errors.push(`${page} <style ${index + 1}>: contains unsafe generated CSS content (${label})`)
      }
      for (const name of cssGeneratedContentClosure(css).attributes) pageCssContentAttributes.add(name)
    }
    let hasDeclarativeShadowDom = false
    let hasNonLocalInlineSvgReference = false
    walkSemanticNodes(sourceDocument, (node) => {
      if (node.tagName === 'template' && nodeAttribute(node, 'shadowrootmode') !== undefined) {
        hasDeclarativeShadowDom = true
      }
      let insideSvg = node.tagName === 'svg'
      for (let ancestor = node.parentNode; !insideSvg && ancestor; ancestor = ancestor.parentNode) {
        insideSvg = ancestor.tagName === 'svg'
      }
      if (!insideSvg) return
      for (const attribute of node.attrs ?? []) {
        const name = attribute.name.toLowerCase()
        if (['src', 'href', 'xlink:href'].includes(name) && nonLocalSvgReference(attribute.value)) {
          hasNonLocalInlineSvgReference = true
        }
        if (name === 'style' && containsNonLocalSvgCssReference(`x{${attribute.value}}`)) {
          hasNonLocalInlineSvgReference = true
        }
      }
      if (node.tagName === 'style' && containsNonLocalSvgCssReference((node.childNodes ?? []).map((child) => child.value ?? '').join(''))) {
        hasNonLocalInlineSvgReference = true
      }
    })
    if (hasDeclarativeShadowDom) errors.push(`${page}: contains unsupported declarative shadow DOM`)
    if (hasNonLocalInlineSvgReference) errors.push(`${page}: contains unsafe embedded URL`)
    const sourceSemanticSegments = [
      ...semanticTextSegments(sourceDocument, { excludeNonSemanticAncestors: true }),
      ...semanticAttributes(sourceDocument, { excludeNonSemanticAncestors: true }).map(({ value }) => value),
    ]
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
      if (sourceSemanticSegments.some((segment) => pattern.test(segment))) {
        errors.push(`${page}: contains ${label}`)
      }
    }
    const streetAddressError = `${page}: contains placeholder street address`
    if (containsContextualStreetAddressPlaceholder(sourceDocument) && !errors.includes(streetAddressError)) {
      errors.push(streetAddressError)
    }

    const stripTokens = (value) => value.replace(TOKEN_RE, ' ')
    const semanticText = semanticTextSegments(sourceDocument, { excludeNonSemanticAncestors: true }).map(stripTokens)
    const semanticAttrs = semanticAttributes(sourceDocument, { excludeNonSemanticAncestors: true })
      .map(({ name, value }) => ({ name, value: stripTokens(value) }))
    const semanticSegments = [...semanticText, ...semanticAttrs.map(({ value }) => value)]
    for (const [label, pattern] of PUBLICATION_RISK_PATTERNS) {
      if (semanticSegments.some((segment) => pattern.test(segment))) {
        errors.push(`${page}: contains ${label}`)
      }
    }
    const semanticPriceAttributes = semanticAttrs
      .filter(({ name }) => PRICE_SEMANTIC_ATTRIBUTE_RE.test(name) || pageCssContentAttributes.has(name))
      .map(({ value }) => value)
    if ([...semanticText, ...semanticPriceAttributes].some((segment) => HARD_CODED_OFFER_PRICE_RE.test(segment))) {
      errors.push(`${page}: contains hard-coded offer price`)
    }
    const proofError = `${page}: contains unverified testimonial or review content`
    if (
      (containsUnsupportedProofMarkup(sourceDocument) || containsUnsupportedProofHeadingMarkup(sourceDocument))
      && !errors.includes(proofError)
    ) {
      errors.push(proofError)
    }
    if (semanticSegments.some(containsUnsupportedOutcomeClaim)) {
      errors.push(`${page}: contains unsupported outcome claim`)
    }
    if (semanticSegments.some((segment) => LITERAL_EMAIL_RE.test(segment))) {
      errors.push(`${page}: contains a hard-coded email address`)
    }
    if (semanticSegments.some(containsLiteralPhone)) {
      errors.push(`${page}: contains a hard-coded phone number`)
    }

    const formTopology = uploadFormTopology(sourceDocument)
    for (const accessibilityError of validateUploadFormAccessibleGraphs(
      sourceDocument,
      formTopology.forms,
      formTopology.associated.filter((control) => formTopology.ownerByControl.get(control) !== undefined),
    )) {
      errors.push(`${page}: ${accessibilityError}`)
    }
    for (const form of formTopology.forms) {
      const ownedControls = formTopology.associated.filter((control) => formTopology.ownerByControl.get(control) === form)
      const formSignal = [form, ...ownedControls].flatMap((node) => [
        ...semanticTextSegments(node, { excludeNonSemanticAncestors: true }),
        ...uploadSubtreeAttributeValues(node),
      ]).join('\n').replace(/[-_]+/g, ' ')
      if (SENSITIVE_FORM_RE.test(formSignal)) {
        errors.push(`${page}: form solicits sensitive health information`)
      }
      if (UNSAFE_INQUIRY_FORM_RE.test(formSignal)) {
        errors.push(`${page}: form solicits unsupported sensitive information`)
      }
      if (requireStandardInquiryForms) {
        const controls = formTopology.controls.filter((control) => formTopology.ownerByControl.get(control) === form)
        const buttons = formTopology.buttons.filter((button) => formTopology.ownerByControl.get(button) === form)
        const schemaErrors = validateUploadStandardInquiryForm(form, controls, buttons, sourceDocument)
        if (schemaErrors.length > 0) {
          errors.push(`${page}: form is not the standard inquiry schema (${schemaErrors.join('; ')})`)
        }
      }
    }
    if (
      requireStandardInquiryForms
      && formTopology.associated.some((control) => nodeAttribute(control, 'form') !== undefined)
    ) {
      errors.push(`${page}: externally associated form controls are not allowed`)
    }
    if (
      requireStandardInquiryForms
      && formTopology.controls.some((control) => formTopology.ownerByControl.get(control) === undefined)
    ) {
      errors.push(`${page}: form controls outside the standard inquiry form are not allowed`)
    }
    if (
      requireStandardInquiryForms
      && formTopology.buttons.some((button) => formTopology.ownerByControl.get(button) === undefined && uploadButtonIsSubmit(button))
    ) {
      errors.push(`${page}: unowned submit buttons are not allowed`)
    }

    // Preserve tokens for destination validation. The proof/copy scans above
    // deliberately remove them, but a valid mailto:{{EMAIL}} or tel:{{PHONE}}
    // link must retain its token here so it is not mistaken for a literal.
    for (const href of semanticAnchorHrefs(sourceDocument)) {
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
  --rehab-v3-staging           Use the isolated rehabilitation staging store and active pointer
  --only <niche[/slug]>         Restrict by niche or complete template; repeatable
  --root <directory>            Read a specific local template-library root
  --force                      Overwrite selected objects already in Blobs
  --help, -h                   Show this help

Examples:
  node scripts/upload-templates-to-blobs.mjs --dry-run --only aromatherapy
  node scripts/upload-templates-to-blobs.mjs --only aromatherapy/my-template --force

Partial uploads merge into the last validated remote manifest. A selected
template is always uploaded as a complete directory. Existing objects are
skipped only when their recorded SHA-256 matches the local file.
Rehabilitation staging requires a complete explicit root, forbids --only and
--force, and permits writes only in an explicit non-production context.`)
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

/**
 * Validate a rehabilitation staging catalogue without weakening the immutable
 * 60-template launch contract used by every normal dry-run and real upload.
 */
export function validateRehabV3StagingCatalogManifest(manifest, catalog) {
  const reconciliation = reconcileCatalogV3Manifest(manifest, catalog)
  const errors = [...reconciliation.errors]
  const countsByNiche = {}
  let totalTemplates = 0
  const reconciledManifest = reconciliation.manifest || manifest

  if (!reconciledManifest || typeof reconciledManifest !== 'object' || Array.isArray(reconciledManifest)) {
    errors.push('rehabilitation staging manifest is missing or malformed')
  } else {
    for (const [niche, expected] of Object.entries(REHAB_STAGING_CATALOG_CONTRACT.templatesByNiche)) {
      const templates = reconciledManifest[niche]
      if (!Array.isArray(templates)) {
        errors.push(`rehabilitation staging ${niche}: manifest entry is malformed`)
        countsByNiche[niche] = 0
        continue
      }
      countsByNiche[niche] = templates.length
      totalTemplates += templates.length
      if (templates.length !== expected) {
        errors.push(`rehabilitation staging ${niche}: expected ${expected}, found ${templates.length}`)
      }
      templates.forEach((template, index) => {
        if (template?.validation?.contractVersion !== 3 || !hasValidationStamp(template)) {
          errors.push(`rehabilitation staging ${niche}[${index}]: a complete v3 validation stamp is required`)
        }
        if (
          template?.slug !== template?.legacySlug ||
          template?.nicheSlug !== niche ||
          template?.dir !== `${niche}/${template?.legacySlug}`
        ) {
          errors.push(`rehabilitation staging ${niche}[${index}]: runtime slug/directory identity is invalid`)
        }
      })
    }
    for (const niche of Object.keys(reconciledManifest)) {
      if (!Object.hasOwn(REHAB_STAGING_CATALOG_CONTRACT.templatesByNiche, niche)) {
        errors.push(`rehabilitation staging ${niche}: unexpected niche`)
        const templates = reconciledManifest[niche]
        countsByNiche[niche] = Array.isArray(templates) ? templates.length : 0
        totalTemplates += countsByNiche[niche]
      }
    }
  }

  if (totalTemplates !== REHAB_STAGING_CATALOG_CONTRACT.totalTemplates) {
    errors.push(
      `rehabilitation staging total is invalid: ` +
      `expected=${REHAB_STAGING_CATALOG_CONTRACT.totalTemplates} local=${totalTemplates}`,
    )
  }
  if (catalog?.sourceTemplates !== totalTemplates) {
    errors.push(
      `rehabilitation staging source count is invalid: ` +
      `declared=${String(catalog?.sourceTemplates)} local=${totalTemplates}`,
    )
  }
  if (catalog?.sourceTemplates !== REHAB_STAGING_CATALOG_CONTRACT.totalTemplates) {
    errors.push(
      `rehabilitation staging authoritative source count is invalid: ` +
      `expected=${REHAB_STAGING_CATALOG_CONTRACT.totalTemplates} declared=${String(catalog?.sourceTemplates)}`,
    )
  }

  return {
    pass: errors.length === 0,
    errors,
    manifest: errors.length === 0 ? reconciliation.manifest : null,
    totalTemplates,
    countsByNiche,
  }
}

function applyCatalogV3DocumentFromRoot(root, manifest, { rehabV3Staging = false } = {}) {
  const hasV3Templates = Object.values(manifest).some(
    (templates) => templates.some((template) => template.validation?.contractVersion === 3),
  )
  const catalogPath = path.join(root, '_catalog-v3.json')
  if (!hasV3Templates && !existsSync(catalogPath) && !rehabV3Staging) return manifest
  if (!existsSync(catalogPath)) {
    throw new Error('Catalog v3 templates require the authoritative _catalog-v3.json document')
  }

  let catalog
  try {
    catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
  } catch {
    throw new Error('Authoritative _catalog-v3.json is malformed')
  }
  const result = rehabV3Staging
    ? validateRehabV3StagingCatalogManifest(manifest, catalog)
    : reconcileCatalogV3Manifest(manifest, catalog)
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
  const styles = {}
  for (const file of meta.files.filter((candidate) => /\.css$/i.test(candidate))) {
    const stylesheetPath = path.resolve(templateDir, file)
    if (!isPathWithin(templateDir, stylesheetPath) || !existsSync(stylesheetPath)) continue
    styles[file] = readFileSync(stylesheetPath, 'utf-8')
  }
  const svgAssets = {}
  for (const file of meta.files.filter((candidate) => /\.svg$/i.test(candidate))) {
    const assetPath = path.resolve(templateDir, file)
    if (!isPathWithin(templateDir, assetPath) || !existsSync(assetPath)) continue
    svgAssets[file] = readFileSync(assetPath, 'utf-8')
  }
  structuralErrors.push(...validateV3QualityReceipt(templateDir, meta))
  const contractOptions = { requireStandardInquiryForms: meta.contractVersion === 3, styles, svgAssets }
  const initialContract = validateUploadContract(pages, meta.fields, contractOptions)
  // Legacy libraries often have a correct tokenized HTML surface but stale
  // fields.json metadata. Rebuild the manifest fields from the actual tokens;
  // this is a lossless metadata repair and never invents editability for a
  // tokenless template.
  meta.fields = fieldsMatchingTokens(meta.fields, initialContract.tokens)
  const contract = validateUploadContract(pages, meta.fields, contractOptions)
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
    remote.metadata.contractVersion === expected.contractVersion &&
    (expected.catalogHash === undefined || remote.metadata.catalogHash === expected.catalogHash),
  )
}

export function assertRehabStagingUploadEnvironment(env) {
  const context = String(env.CONTEXT || env.NETLIFY_CONTEXT || '').trim().toLowerCase()
  if (context === 'production' || context === 'prod') {
    throw new Error('Rehabilitation staging publication is forbidden in production context')
  }
  if (!['deploy-preview', 'branch-deploy', 'dev', 'development', 'test'].includes(context)) {
    throw new Error(
      'Rehabilitation staging publication requires an explicit non-production CONTEXT ' +
      '(deploy-preview, branch-deploy, dev, development, or test)',
    )
  }
  return context
}

export function rehabStagingCatalogPrefix(catalogHash) {
  if (!SHA256_RE.test(catalogHash)) {
    throw new Error('Rehabilitation catalogue hash must be a lowercase SHA-256 digest')
  }
  return `catalogs/${catalogHash}`
}

export function createRehabStagingActivePointer({ catalogHash, manifestHash, activatedAt = new Date().toISOString() }) {
  if (!SHA256_RE.test(catalogHash) || !SHA256_RE.test(manifestHash)) {
    throw new Error('Rehabilitation active pointer requires valid catalogue and manifest hashes')
  }
  if (!Number.isFinite(Date.parse(activatedAt))) {
    throw new Error('Rehabilitation active pointer activation time is invalid')
  }
  const prefix = rehabStagingCatalogPrefix(catalogHash)
  return {
    version: 1,
    profile: 'rehab-staging',
    catalogHash,
    catalogKey: `${prefix}/_catalog-v3.json`,
    manifestHash,
    manifestKey: `${prefix}/_manifest.json`,
    sourceTemplates: REHAB_STAGING_CATALOG_CONTRACT.totalTemplates,
    activatedAt,
  }
}

export function verifyRehabStagingActivePointer(expected, actual) {
  const errors = []
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
    errors.push('active pointer readback is missing or malformed')
  } else {
    for (const field of [
      'version', 'profile', 'catalogHash', 'catalogKey', 'manifestHash',
      'manifestKey', 'sourceTemplates', 'activatedAt',
    ]) {
      if (actual[field] !== expected[field]) errors.push(`active pointer readback differs at ${field}`)
    }
  }
  return { pass: errors.length === 0, errors }
}

function rehabManifestFileKeys(manifest) {
  const keys = new Set()
  for (const templates of Object.values(manifest)) {
    for (const template of templates) {
      for (const file of template.files) {
        const key = `${template.dir}/${file}`
        if (keys.has(key)) throw new Error(`Rehabilitation staging manifest repeats file ${key}`)
        keys.add(key)
      }
    }
  }
  return keys
}

function bytesFromStoreValue(value) {
  if (typeof value === 'string') return Buffer.from(value)
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  return null
}

/**
 * Publish one immutable rehabilitation snapshot. All template objects and both
 * hash-bound catalogue documents are written and read back before `_active.json`
 * is switched. The supplied store must be the dedicated staging store.
 */
export async function publishRehabStagingCatalog({
  store,
  files,
  manifest,
  catalogBytes,
  activatedAt,
  onProgress = () => {},
}) {
  const rawCatalog = Buffer.from(catalogBytes)
  let catalog
  try {
    catalog = JSON.parse(rawCatalog.toString('utf8'))
  } catch {
    throw new Error('Authoritative rehabilitation catalogue is malformed JSON')
  }
  const validation = validateRehabV3StagingCatalogManifest(manifest, catalog)
  if (!validation.pass) {
    throw new Error(`Rehabilitation staging publish plan failed validation:\n  - ${validation.errors.join('\n  - ')}`)
  }

  const expectedFiles = rehabManifestFileKeys(manifest)
  const suppliedByKey = new Map()
  for (const file of files) {
    if (!file || typeof file.key !== 'string' || typeof file.read !== 'function') {
      throw new Error('Rehabilitation staging upload contains a malformed file record')
    }
    if (suppliedByKey.has(file.key)) throw new Error(`Rehabilitation staging upload repeats ${file.key}`)
    suppliedByKey.set(file.key, file)
  }
  const missing = [...expectedFiles].filter((key) => !suppliedByKey.has(key))
  const extra = [...suppliedByKey.keys()].filter((key) => !expectedFiles.has(key))
  if (missing.length || extra.length) {
    throw new Error(
      `Rehabilitation staging file set differs from the manifest ` +
      `(missing=${missing.slice(0, 5).join(',') || 'none'}; extra=${extra.slice(0, 5).join(',') || 'none'})`,
    )
  }

  const catalogHash = createHash('sha256').update(rawCatalog).digest('hex')
  const prefix = rehabStagingCatalogPrefix(catalogHash)
  const manifestHash = manifestDigest(manifest)
  let uploaded = 0
  let skipped = 0
  let processed = 0

  for (const key of [...expectedFiles].sort()) {
    const file = suppliedByKey.get(key)
    const content = Buffer.from(await file.read())
    const sha256 = createHash('sha256').update(content).digest('hex')
    const metadata = { ...uploadMetadataForFile(key, sha256, manifest), catalogHash }
    const objectKey = `${prefix}/${key}`
    const existing = await store.getMetadata(objectKey)
    if (existing) {
      if (!hasMatchingUploadMetadata(existing, metadata)) {
        throw new Error(`Immutable rehabilitation object has conflicting metadata: ${objectKey}`)
      }
      skipped += 1
    } else {
      await store.set(objectKey, content, { metadata })
      uploaded += 1
    }
    const readback = await store.getMetadata(objectKey)
    if (!hasMatchingUploadMetadata(readback, metadata)) {
      throw new Error(`Rehabilitation object metadata readback failed: ${objectKey}`)
    }
    const contentReadback = bytesFromStoreValue(await store.get(objectKey, { type: 'arrayBuffer' }))
    if (
      !contentReadback
      || createHash('sha256').update(contentReadback).digest('hex') !== sha256
    ) {
      throw new Error(`Rehabilitation object content readback failed: ${objectKey}`)
    }
    processed += 1
    onProgress({ processed, total: expectedFiles.size, uploaded, skipped, key: objectKey })
  }

  const catalogKey = `${prefix}/_catalog-v3.json`
  const priorCatalog = bytesFromStoreValue(await store.get(catalogKey))
  if (priorCatalog && createHash('sha256').update(priorCatalog).digest('hex') !== catalogHash) {
    throw new Error(`Immutable rehabilitation catalogue object conflicts at ${catalogKey}`)
  }
  if (!priorCatalog) {
    await store.set(catalogKey, rawCatalog, {
      metadata: { sha256: catalogHash, catalogHash, contractVersion: 3 },
    })
  }
  const catalogReadback = bytesFromStoreValue(await store.get(catalogKey))
  if (!catalogReadback || createHash('sha256').update(catalogReadback).digest('hex') !== catalogHash) {
    throw new Error('Rehabilitation catalogue readback hash is invalid')
  }

  const manifestKey = `${prefix}/_manifest.json`
  const priorManifest = await store.get(manifestKey, { type: 'json' })
  if (priorManifest && manifestDigest(priorManifest) !== manifestHash) {
    throw new Error(`Immutable rehabilitation manifest object conflicts at ${manifestKey}`)
  }
  if (!priorManifest) await store.setJSON(manifestKey, manifest)
  const manifestReadback = await store.get(manifestKey, { type: 'json' })
  const readbackValidation = validateRehabV3StagingCatalogManifest(manifestReadback, catalog)
  const manifestReadbackErrors = [...readbackValidation.errors]
  if (manifestDigest(manifestReadback) !== manifestHash) manifestReadbackErrors.push('manifest digest mismatch')
  if (manifestReadbackErrors.length > 0) {
    throw new Error(
      `Rehabilitation manifest readback verification failed:\n  - ` +
      `${manifestReadbackErrors.join('\n  - ')}`,
    )
  }

  const pointer = createRehabStagingActivePointer({ catalogHash, manifestHash, activatedAt })
  // This is the only mutable write and must remain the final operation.
  await store.setJSON(REHAB_STAGING_ACTIVE_KEY, pointer)
  const pointerReadback = await store.get(REHAB_STAGING_ACTIVE_KEY, { type: 'json' })
  const pointerVerification = verifyRehabStagingActivePointer(pointer, pointerReadback)
  if (!pointerVerification.pass) {
    throw new Error(`Rehabilitation active pointer readback failed:\n  - ${pointerVerification.errors.join('\n  - ')}`)
  }

  return {
    catalogHash,
    manifestHash,
    prefix,
    pointer,
    uploaded,
    skipped,
    files: expectedFiles.size,
    sourceTemplates: validation.totalTemplates,
  }
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

export async function main(argv = process.argv.slice(2), env = process.env, dependencies = {}) {
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

  if (options.rehabV3Staging && rejectedTemplates.length > 0) {
    throw new Error(
      `Rehabilitation staging validation requires zero quarantined templates; found ${rejectedTemplates.length}`,
    )
  }
  manifest = applyCatalogV3DocumentFromRoot(PLATFORM_BUILDER_ROOT, manifest, {
    rehabV3Staging: options.rehabV3Staging,
  })
  if (options.rehabV3Staging) {
    const stagingCounts = Object.fromEntries(
      Object.entries(manifest).map(([niche, templates]) => [niche, templates.length]),
    )
    const stagingTotal = Object.values(stagingCounts).reduce((sum, count) => sum + count, 0)
    console.log(
      `[upload-templates] Rehabilitation staging inventory verified: ${stagingTotal} v3 templates ` +
      `across ${Object.values(stagingCounts).filter((count) => count > 0).length} populated niches.`,
    )
  } else {
    const localCatalogIntegrity = assertLaunchCatalogManifest(manifest, 'Local validated catalog')
    console.log(
      `[upload-templates] Launch inventory verified: ${localCatalogIntegrity.totalTemplates} templates ` +
      `across ${Object.keys(localCatalogIntegrity.countsByNiche).length} niches.`,
    )
  }

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

  const selectedFiles = publishableFiles.filter(({ key }) => matchesOnlySelector(key, options.only))
  const stagingExpectedFiles = options.rehabV3Staging ? rehabManifestFileKeys(manifest) : null
  const files = stagingExpectedFiles
    ? selectedFiles.filter(({ key }) => stagingExpectedFiles.has(key))
    : selectedFiles
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

  if (options.rehabV3Staging) assertRehabStagingUploadEnvironment(env)
  if (!env.NETLIFY_AUTH_TOKEN || !env.NETLIFY_SITE_ID) {
    throw new Error('NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID must be set for a real upload')
  }

  const getStoreImplementation = dependencies.getStore || getStore
  if (options.rehabV3Staging) {
    const store = getStoreImplementation({
      name: REHAB_STAGING_STORE_NAME,
      consistency: 'strong',
      siteID: env.NETLIFY_SITE_ID,
      token: env.NETLIFY_AUTH_TOKEN,
    })
    const catalogBytes = await fsp.readFile(path.join(PLATFORM_BUILDER_ROOT, '_catalog-v3.json'))
    const result = await publishRehabStagingCatalog({
      store,
      files: files.map(({ full, key }) => ({ key, read: () => fsp.readFile(full) })),
      manifest,
      catalogBytes,
      onProgress: ({ processed, total, uploaded, skipped }) => {
        if (processed % 100 === 0 || processed === total) {
          console.log(
            `[upload-templates] Rehabilitation staging progress: ${processed} / ${total} ` +
            `(uploaded=${uploaded} skipped=${skipped})`,
          )
        }
      },
    })
    console.log(
      `[upload-templates] Rehabilitation staging active pointer switched last ` +
      `(catalog=${result.catalogHash} templates=${result.sourceTemplates}).`,
    )
    return {
      dryRun: false,
      files: result.files,
      bytes: totalBytes,
      totalTemplates,
      uploaded: result.uploaded,
      skipped: result.skipped,
      catalogHash: result.catalogHash,
      manifestHash: result.manifestHash,
      storeName: REHAB_STAGING_STORE_NAME,
    }
  }

  const store = getStoreImplementation({
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
