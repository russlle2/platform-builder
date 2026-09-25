import { createHash } from 'node:crypto'

export const PRODUCTION_NETLIFY_SITE_ID = '4a98d266-bb9f-44ab-bf27-30597d741705'
export const CERTIFIED_STORE = 'templates-rehab-certified'
export const CERTIFIED_TOTAL = 5486
export async function forEachBounded(items, operation, concurrency = 12) {
  let cursor = 0
  let failure
  let failed = false
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!failed) {
      const index = cursor++
      if (index >= items.length) return
      try { await operation(items[index], index) } catch (error) { if (!failed) { failure = error; failed = true } }
    }
  }))
  if (failed) throw failure
}
const SHA = /^[a-f0-9]{64}$/
const COMMIT = /^[a-f0-9]{40}$/
const matches = (pattern, value) => typeof value === 'string' && pattern.test(value)

export function canonicalDigest(value) {
  const canonical = (item) => Array.isArray(item) ? `[${item.map(canonical).join(',')}]`
    : item && typeof item === 'object' ? `{${Object.keys(item).filter((key) => item[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical(item[key])}`).join(',')}}`
      : JSON.stringify(item)
  return createHash('sha256').update(canonical(value)).digest('hex')
}

export function assertCatalogDeployment(env, environment) {
  const site = env.SITE_ID?.trim().toLowerCase()
  if (env.DAILYCLARITY_ENVIRONMENT !== environment) throw new Error('Catalogue deployment environment does not match its profile')
  const expected = environment === 'production' ? PRODUCTION_NETLIFY_SITE_ID : env.DAILYCLARITY_STAGING_SITE_ID?.trim().toLowerCase()
  if (!expected || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(expected) || site !== expected || (environment === 'staging' && site === PRODUCTION_NETLIFY_SITE_ID)) {
    throw new Error('Catalogue deployment site is not the pinned environment site')
  }
}

export function validateCertification(receipt, expected = {}) {
  if (!receipt || receipt.version !== 1 || receipt.profile !== 'rehab-certified' || !matches(COMMIT, receipt.releaseSha)) {
    throw new Error('Certified catalogue release identity is missing or malformed')
  }
  for (const key of ['catalogHash', 'manifestHash', 'fullGateHash', 'sourceCatalogHash', 'templateEvidenceHash', 'fileEvidenceHash']) {
    if (!matches(SHA, receipt[key])) throw new Error(`Certified catalogue ${key} is invalid`)
  }
  if (receipt.sourceTemplates !== CERTIFIED_TOTAL || receipt.certifiedTemplates !== CERTIFIED_TOTAL || receipt.neutralFallbacks !== 0 || receipt.customizationDiagnostics !== 0 || !Number.isSafeInteger(receipt.files) || receipt.files < CERTIFIED_TOTAL || !Number.isSafeInteger(receipt.pages) || receipt.pages < CERTIFIED_TOTAL) {
    throw new Error('Certified catalogue requires complete browser/customization evidence and zero neutral fallbacks')
  }
  for (const [key, value] of Object.entries(expected)) {
    if (value !== undefined && receipt[key] !== value) throw new Error(`Certified catalogue ${key} does not match the approved release`)
  }
  return receipt
}

export function createCertifiedPointer(receipt, activatedAt = new Date().toISOString()) {
  validateCertification(receipt)
  if (typeof activatedAt !== 'string' || !Number.isFinite(Date.parse(activatedAt))) throw new Error('Certified catalogue activation time is invalid')
  const certificationHash = canonicalDigest(receipt)
  const prefix = `catalogs/${receipt.catalogHash}`
  return { version: 1, profile: 'rehab-certified', catalogHash: receipt.catalogHash, catalogKey: `${prefix}/_catalog-v3.json`, manifestHash: receipt.manifestHash, manifestKey: `${prefix}/_manifest.json`, sourceTemplates: CERTIFIED_TOTAL, releaseSha: receipt.releaseSha, certificationHash, certificationKey: `certifications/${certificationHash}.json`, activatedAt }
}

export function validateCertifiedPointer(pointer) {
  if (!pointer || pointer.profile !== 'rehab-certified' || pointer.version !== 1 || pointer.sourceTemplates !== CERTIFIED_TOTAL || !matches(COMMIT, pointer.releaseSha) || !matches(SHA, pointer.catalogHash) || !matches(SHA, pointer.manifestHash) || !matches(SHA, pointer.certificationHash) || typeof pointer.activatedAt !== 'string' || !Number.isFinite(Date.parse(pointer.activatedAt))) throw new Error('Certified catalogue pointer is invalid')
  const prefix = `catalogs/${pointer.catalogHash}`
  if (pointer.catalogKey !== `${prefix}/_catalog-v3.json` || pointer.manifestKey !== `${prefix}/_manifest.json` || pointer.certificationKey !== `certifications/${pointer.certificationHash}.json`) throw new Error('Certified catalogue pointer escaped its immutable namespace')
  return pointer
}
