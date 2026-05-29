#!/usr/bin/env node
/**
 * normalize-templates.mjs
 * ------------------------------------------------------------------
 * Idempotent, re-runnable template normalizer for the Platform Builder
 * template library.
 *
 * For each ACTIVE niche, for each template subdir that contains index.html:
 *   1. Read template.json (create a base object if missing/unparseable).
 *   2. Assign a deterministic, human, descriptor-style `name`, guaranteed
 *      unique within the niche.
 *   3. Assign a short (<160 char) `description`.
 *   4. De-duplicate the gallery-visible snippet: within a niche, no two
 *      templates may share an identical snippet. When an exact duplicate is
 *      found, lightly reword the visible hero copy of the *later* duplicate.
 *   5. Assign an integer `order` that interleaves by layoutFamily/voiceFamily
 *      so adjacent templates differ.
 *   6. Write name/description/order back into template.json (slug preserved).
 *
 * The script NEVER changes `slug`, NEVER deletes templates, and NEVER touches
 * the `hvac` niche. It is deterministic: re-running produces stable output.
 *
 * Usage (run from apps/generator-app):
 *   node scripts/normalize-templates.mjs            # normalize + validate
 *   node scripts/normalize-templates.mjs --report   # validate only (no writes)
 *   node scripts/normalize-templates.mjs --dry-run   # compute, log, no writes
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

// scripts/ lives in apps/generator-app/scripts; templates root mirrors the
// runtime resolution in niche-registry.ts: <repo>/platform-builder
const TEMPLATES_ROOT = path.resolve(__dirname, '..', '..', '..', 'platform-builder')

// Process ONLY these. Never touch hvac (deactivated) or any other folder.
const ACTIVE_NICHES = [
  'aromatherapy',
  'holistic_medicine',
  'private_practice_therapist',
  'sound_bath',
  'wellness_coach',
]

const NICHE_LABEL = {
  aromatherapy: 'Aromatherapy',
  holistic_medicine: 'Holistic Medicine',
  private_practice_therapist: 'Private Practice Therapist',
  sound_bath: 'Sound Bath',
  wellness_coach: 'Wellness Coach',
}

const REPORT_ONLY = process.argv.includes('--report')
const DRY_RUN = process.argv.includes('--dry-run')

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

const ACRONYMS = { vip: 'VIP', diy: 'DIY', faq: 'FAQ', ai: 'AI', us: 'US' }

function titleCase(s) {
  if (!s) return ''
  return String(s)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase()
      if (ACRONYMS[lower]) return ACRONYMS[lower]
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function decodeEntities(s) {
  return String(s)
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2014;/gi, '\u2014')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&#0?160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/** Strip tags + {{tokens}} + collapse whitespace */
function cleanText(s) {
  return decodeEntities(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Remove leading separator punctuation left over after stripping a token */
function stripLeadingSeparators(s) {
  return s.replace(/^[\s\u2014\u2013\-|:•·,–—]+/, '').trim()
}

function stripTrailingSeparators(s) {
  return s.replace(/[\s\u2014\u2013\-|:•·,–—]+$/, '').trim()
}

/** True if the string contains the unicode replacement char (decode failure) */
function looksMojibake(s) {
  return typeof s === 'string' && (s.includes('\uFFFD') || /Ã.|â€|Â./.test(s))
}

/** Cap a phrase at maxLen, breaking on a word boundary, no ellipsis. */
function capPhrase(s, maxLen = 64) {
  if (s.length <= maxLen) return s
  const cut = s.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  return stripTrailingSeparators((lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim())
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']
function roman(n) {
  return ROMAN[n] || String(n)
}

/* ------------------------------------------------------------------ */
/* Snippet — must mirror extractSnippet() in niche-registry.ts          */
/* ------------------------------------------------------------------ */

function computeSnippet(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, 160)
}

/* ------------------------------------------------------------------ */
/* Hero phrase extraction                                              */
/* ------------------------------------------------------------------ */

function firstMatch(html, re) {
  const m = html.match(re)
  return m ? m[1] : ''
}

/**
 * Derive a distinctive hero phrase from index.html:
 *   1. <h1> text (if non-empty after stripping tokens)
 *   2. <title> text (strip the "{{BUSINESS_NAME}} —" prefix)
 *   3. first <h2>/<h3>
 * Returns '' if nothing usable (or only mojibake).
 */
function extractHeroPhrase(html) {
  const candidates = []

  const h1 = cleanText(firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i))
  if (h1) candidates.push(h1)

  const rawTitle = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = stripLeadingSeparators(cleanText(rawTitle))
  if (title) candidates.push(title)

  const h2 = cleanText(firstMatch(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i))
  if (h2) candidates.push(h2)

  for (const c of candidates) {
    if (!c || looksMojibake(c)) continue
    return capPhrase(stripTrailingSeparators(stripLeadingSeparators(c)))
  }
  return ''
}

/* ------------------------------------------------------------------ */
/* Niche scan                                                          */
/* ------------------------------------------------------------------ */

function listTemplateDirs(nicheDir) {
  let entries = []
  try {
    entries = fs.readdirSync(nicheDir)
  } catch {
    return []
  }
  return entries
    .filter((e) => {
      const d = path.join(nicheDir, e)
      try {
        return fs.statSync(d).isDirectory() && fs.existsSync(path.join(d, 'index.html'))
      } catch {
        return false
      }
    })
    .sort() // deterministic iteration
}

function readJsonSafe(file) {
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(file, 'utf-8')) }
  } catch {
    return { ok: false, value: null }
  }
}

/* ------------------------------------------------------------------ */
/* Name + description composition                                      */
/* ------------------------------------------------------------------ */

function composeName(meta, heroPhrase, niche) {
  const voice = titleCase(meta.voiceFamily)
  const layout = titleCase(meta.layoutFamily)
  const descriptor = [voice, layout].filter(Boolean).join(' \u00b7 ')

  if (descriptor && heroPhrase) return `${descriptor} \u2014 ${heroPhrase}`
  if (descriptor) return descriptor
  if (heroPhrase) return heroPhrase

  const program = titleCase(meta.programModel || meta.offerModel)
  if (program) return `${NICHE_LABEL[niche]} \u2014 ${program}`
  return `${NICHE_LABEL[niche]} Site`
}

function composeDescription(meta, heroPhrase, niche) {
  const voice = (titleCase(meta.voiceFamily) || 'Custom').toLowerCase()
  const layout = (titleCase(meta.layoutFamily) || 'modern').toLowerCase()
  const nicheLabel = NICHE_LABEL[niche].toLowerCase()
  let d = `A ${voice}, ${layout} ${nicheLabel} website`
  if (heroPhrase) d += ` \u2014 ${heroPhrase}`
  d = d.replace(/\s+/g, ' ').trim()
  if (!d.endsWith('.')) d += '.'
  if (d.length > 159) d = stripTrailingSeparators(d.slice(0, 156)) + '\u2026'
  return d
}

/** Resolve a unique name within a niche. */
function uniqueName(base, used, extras) {
  const key = (s) => s.toLowerCase()
  if (!used.has(key(base))) {
    used.add(key(base))
    return base
  }
  // Try extra qualifiers (e.g. program/offer model) first.
  for (const e of extras) {
    if (!e) continue
    const cand = `${base} \u00b7 ${e}`
    if (!used.has(key(cand))) {
      used.add(key(cand))
      return cand
    }
  }
  // Fall back to roman-numeral suffix.
  let i = 2
  let cand
  do {
    cand = `${base} (${roman(i)})`
    i++
  } while (used.has(key(cand)))
  used.add(key(cand))
  return cand
}

/* ------------------------------------------------------------------ */
/* Snippet de-duplication (light hero reword)                          */
/* ------------------------------------------------------------------ */

// Deterministic, on-brand reword fragments appended to vary a duplicate's
// first visible heading/paragraph just enough to make the snippet distinct.
// Index = (number of prior duplicates of this snippet) - 1.
const REWORD_VARIANTS = [
  'Thoughtfully crafted for your practice.',
  'Designed to feel calm and clear.',
  'A welcoming first impression for new clients.',
  'Built around a grounded, modern experience.',
  'Made to reflect your unique approach.',
  'Tailored for clarity and warmth.',
  'Shaped to help your work stand out.',
  'Centered on trust and ease.',
]

/**
 * Insert a small on-brand sentence into the first visible <p> (or after the
 * first heading) of the hero so the gallery snippet becomes distinct.
 * Idempotent: it will not re-insert a marker it already added, and only
 * touches files free of mojibake.
 * Returns { changed, html }.
 */
function rewordHero(html, variantIdx) {
  if (looksMojibake(html)) return { changed: false, html }
  const marker = `<!--nrm-${variantIdx}-->`
  if (html.includes(marker)) return { changed: false, html } // already done

  const sentence = REWORD_VARIANTS[variantIdx % REWORD_VARIANTS.length]
  const insertion = ` ${sentence}${marker}`

  // Prefer inserting into the first <p ...>...</p> after the opening <body>.
  const bodyIdx = html.search(/<body[^>]*>/i)
  const searchFrom = bodyIdx >= 0 ? bodyIdx : 0
  const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/i
  const sub = html.slice(searchFrom)
  const m = sub.match(pRe)
  if (m && m.index != null) {
    const closeRel = sub.indexOf('</p>', m.index)
    if (closeRel >= 0) {
      const abs = searchFrom + closeRel
      const next = html.slice(0, abs) + insertion + html.slice(abs)
      return { changed: true, html: next }
    }
  }
  // Fallback: after the first heading close tag.
  const hRe = /<\/h[1-3]>/i
  const hm = html.slice(searchFrom).match(hRe)
  if (hm && hm.index != null) {
    const abs = searchFrom + hm.index
    const next = html.slice(0, abs) + insertion + html.slice(abs)
    return { changed: true, html: next }
  }
  return { changed: false, html }
}

/* ------------------------------------------------------------------ */
/* Order assignment (interleave by layoutFamily, then voiceFamily)      */
/* ------------------------------------------------------------------ */

function assignOrder(templates) {
  // Bucket by layoutFamily so adjacent picks differ in layout.
  const buckets = new Map()
  for (const t of templates) {
    const key = t.layoutFamily || '~none'
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(t)
  }
  // Deterministic bucket order + intra-bucket order (voice then slug).
  const keys = [...buckets.keys()].sort()
  for (const k of keys) {
    buckets.get(k).sort((a, b) => {
      const av = a.voiceFamily || '~'
      const bv = b.voiceFamily || '~'
      if (av !== bv) return av < bv ? -1 : 1
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0
    })
  }
  // Round-robin pull.
  const order = new Map()
  let idx = 0
  let remaining = templates.length
  while (remaining > 0) {
    for (const k of keys) {
      const arr = buckets.get(k)
      if (arr.length) {
        const t = arr.shift()
        order.set(t.slug, idx++)
        remaining--
      }
    }
  }
  return order
}

/* ------------------------------------------------------------------ */
/* Main per-niche processing                                           */
/* ------------------------------------------------------------------ */

function processNiche(niche, { write }) {
  const nicheDir = path.join(TEMPLATES_ROOT, niche)
  const dirs = listTemplateDirs(nicheDir)

  // First pass: gather meta + current html/snippet for every template.
  const templates = []
  for (const dir of dirs) {
    const templateDir = path.join(nicheDir, dir)
    const templateJsonPath = path.join(templateDir, 'template.json')
    const indexPath = path.join(templateDir, 'index.html')

    const parsed = readJsonSafe(templateJsonPath)
    const meta = parsed.ok && parsed.value && typeof parsed.value === 'object' ? parsed.value : {}
    const slug = meta.slug || dir

    let html = ''
    try {
      html = fs.readFileSync(indexPath, 'utf-8')
    } catch {
      html = ''
    }

    templates.push({
      dir,
      templateDir,
      templateJsonPath,
      indexPath,
      meta,
      metaExisted: parsed.ok,
      slug,
      layoutFamily: meta.layoutFamily,
      voiceFamily: meta.voiceFamily,
      html,
      heroPhrase: extractHeroPhrase(html),
    })
  }

  // ---- Snippet de-duplication ----
  // Process in deterministic (slug) order; the FIRST occurrence keeps its copy,
  // later duplicates get a light reword until the snippet is unique.
  const seenSnippets = new Map() // snippet -> count
  let snippetsDeduped = 0
  for (const t of templates) {
    if (!t.html) {
      t.snippet = ''
      continue
    }
    let snippet = computeSnippet(t.html)
    if (looksMojibake(t.html)) {
      // Don't risk corrupting; just record and move on.
      t.snippet = snippet
      t.skippedReword = true
      seenSnippets.set(snippet, (seenSnippets.get(snippet) || 0) + 1)
      continue
    }
    let guard = 0
    while ((seenSnippets.get(snippet) || 0) > 0 && guard < REWORD_VARIANTS.length) {
      const variantIdx = (seenSnippets.get(snippet) || 0) - 1 + guard
      const res = rewordHero(t.html, variantIdx)
      if (!res.changed) break
      t.html = res.html
      t.htmlChanged = true
      snippet = computeSnippet(t.html)
      guard++
    }
    if (t.htmlChanged) snippetsDeduped++
    t.snippet = snippet
    seenSnippets.set(snippet, (seenSnippets.get(snippet) || 0) + 1)
  }

  // ---- Order ----
  const orderMap = assignOrder(templates)

  // ---- Names + descriptions ----
  const usedNames = new Set()
  let namesAssigned = 0
  let uniquified = 0
  for (const t of templates) {
    const baseName = composeName(t.meta, t.heroPhrase, niche)
    const program = titleCase(t.meta.programModel || t.meta.offerModel)
    const extraKeyword = t.heroPhrase
      ? capPhrase(t.heroPhrase.split(' ').slice(0, 2).join(' '), 24)
      : ''
    const finalName = uniqueName(baseName, usedNames, [program, extraKeyword])
    if (finalName !== baseName) uniquified++
    t.finalName = finalName
    t.finalDescription = composeDescription(t.meta, t.heroPhrase, niche)
    t.finalOrder = orderMap.get(t.slug)
    namesAssigned++
  }

  // ---- Write back ----
  let templateJsonWritten = 0
  let indexHtmlWritten = 0
  if (write) {
    for (const t of templates) {
      // template.json
      const obj = t.metaExisted && t.meta && typeof t.meta === 'object' ? { ...t.meta } : {}
      if (!obj.slug) obj.slug = t.slug // preserve / set, never change existing
      obj.name = t.finalName
      obj.description = t.finalDescription
      obj.order = t.finalOrder
      const nextJson = JSON.stringify(obj, null, 2) + '\n'
      let prevJson = null
      try {
        prevJson = fs.readFileSync(t.templateJsonPath, 'utf-8')
      } catch {
        prevJson = null
      }
      if (prevJson !== nextJson) {
        fs.writeFileSync(t.templateJsonPath, nextJson, 'utf-8')
        templateJsonWritten++
      }
      // index.html (only when reworded)
      if (t.htmlChanged) {
        fs.writeFileSync(t.indexPath, t.html, 'utf-8')
        indexHtmlWritten++
      }
    }
  }

  return {
    niche,
    processed: templates.length,
    namesAssigned,
    uniquified,
    snippetsDeduped,
    templateJsonWritten,
    indexHtmlWritten,
    templates,
  }
}

/* ------------------------------------------------------------------ */
/* Validation report                                                   */
/* ------------------------------------------------------------------ */

function validateNiche(niche) {
  const nicheDir = path.join(TEMPLATES_ROOT, niche)
  const dirs = listTemplateDirs(nicheDir)
  const names = new Map()
  const snippets = new Map()
  let missingNames = 0
  for (const dir of dirs) {
    const templateDir = path.join(nicheDir, dir)
    const parsed = readJsonSafe(path.join(templateDir, 'template.json'))
    const meta = parsed.ok && parsed.value ? parsed.value : {}
    const name = (meta.name || '').trim()
    if (!name) missingNames++
    else names.set(name.toLowerCase(), (names.get(name.toLowerCase()) || 0) + 1)
    let html = ''
    try {
      html = fs.readFileSync(path.join(templateDir, 'index.html'), 'utf-8')
    } catch {}
    const snip = computeSnippet(html)
    snippets.set(snip, (snippets.get(snip) || 0) + 1)
  }
  const dupNames = [...names.values()].filter((v) => v > 1).length
  const dupSnippets = [...snippets.values()].filter((v) => v > 1).length
  return { niche, total: dirs.length, missingNames, dupNames, dupSnippets }
}

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

function pad(s, n) {
  s = String(s)
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

function main() {
  if (!fs.existsSync(TEMPLATES_ROOT)) {
    console.error('Templates root not found:', TEMPLATES_ROOT)
    process.exit(1)
  }
  console.log('Templates root:', TEMPLATES_ROOT)
  console.log('Mode:', REPORT_ONLY ? 'REPORT ONLY' : DRY_RUN ? 'DRY RUN' : 'NORMALIZE')
  console.log('')

  if (REPORT_ONLY) {
    printReport()
    return
  }

  const write = !DRY_RUN
  const results = []
  for (const niche of ACTIVE_NICHES) {
    results.push(processNiche(niche, { write }))
  }

  console.log('Per-niche normalization summary')
  console.log('-'.repeat(96))
  console.log(
    pad('niche', 28) +
      pad('processed', 11) +
      pad('names', 8) +
      pad('uniquified', 12) +
      pad('snip-deduped', 14) +
      pad('json-written', 14) +
      pad('html-written', 14),
  )
  for (const r of results) {
    console.log(
      pad(r.niche, 28) +
        pad(r.processed, 11) +
        pad(r.namesAssigned, 8) +
        pad(r.uniquified, 12) +
        pad(r.snippetsDeduped, 14) +
        pad(r.templateJsonWritten, 14) +
        pad(r.indexHtmlWritten, 14),
    )
  }
  console.log('')
  printReport()
}

function printReport() {
  console.log('Validation report (0 missing names / 0 dup names / 0 dup snippets expected)')
  console.log('-'.repeat(80))
  console.log(
    pad('niche', 28) +
      pad('templates', 12) +
      pad('missingNames', 14) +
      pad('dupNames', 12) +
      pad('dupSnippets', 12),
  )
  let allClean = true
  for (const niche of ACTIVE_NICHES) {
    const v = validateNiche(niche)
    if (v.missingNames || v.dupNames || v.dupSnippets) allClean = false
    console.log(
      pad(v.niche, 28) +
        pad(v.total, 12) +
        pad(v.missingNames, 14) +
        pad(v.dupNames, 12) +
        pad(v.dupSnippets, 12),
    )
  }
  console.log('-'.repeat(80))
  console.log(allClean ? 'RESULT: CLEAN \u2713' : 'RESULT: ISSUES FOUND \u2717')
}

main()
