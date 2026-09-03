import { createHash } from 'node:crypto'
import launchCatalogContract from './launch-catalog-contract.json'
import approvedReceipt from './launch-catalog-approved-receipt.json'

export interface CatalogTemplateIdentity {
  slug: string
  artifactSha256: string
}

export interface CatalogNicheIdentity {
  slug: string
  templates: readonly CatalogTemplateIdentity[]
}

export interface LaunchCatalogIntegrity {
  ready: boolean
  actualTotal: number
  expectedTotal: number
  actualByNiche: Record<string, number>
  expectedByNiche: Readonly<Record<string, number>>
  issues: string[]
}

const SHA256_RE = /^[a-f0-9]{64}$/
const expectedByNiche = Object.freeze({ ...launchCatalogContract.templatesByNiche })
const expectedTotal = launchCatalogContract.totalTemplates
const calculatedTotal = Object.values(expectedByNiche).reduce((sum, count) => sum + count, 0)
const approvedByKey = new Map(
  approvedReceipt.templates.map((item) => [`${item.niche}/${item.slug}`, item.sha256]),
)

function identityDigest(
  templates: readonly { niche: string; slug: string; sha256: string }[],
): string {
  const normalized = templates
    .map(({ niche, slug, sha256 }) => ({ niche, slug, sha256 }))
    .sort((a, b) => `${a.niche}/${a.slug}`.localeCompare(`${b.niche}/${b.slug}`))
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

if (
  calculatedTotal !== expectedTotal ||
  approvedReceipt.contractVersion !== launchCatalogContract.contractVersion ||
  approvedReceipt.totalTemplates !== expectedTotal ||
  approvedByKey.size !== expectedTotal ||
  identityDigest(approvedReceipt.templates) !== launchCatalogContract.templateIdentitySha256
) {
  throw new Error('Launch catalog contract and approved receipt are inconsistent.')
}

export const LAUNCH_CATALOG_EXPECTED_TOTAL = expectedTotal
export const LAUNCH_CATALOG_EXPECTED_BY_NICHE = expectedByNiche
export const LAUNCH_CATALOG_APPROVED_IDENTITIES = Object.freeze(
  approvedReceipt.templates.map((item) => Object.freeze({ ...item })),
)

/**
 * Validate the runtime catalog against the exact signed-off slug and artifact
 * SHA-256 receipt. This runs after the registry's editability filter, so one
 * missing, substituted, or mutated template disables the entire catalog.
 */
export function inspectLaunchCatalog(
  niches: readonly CatalogNicheIdentity[],
): LaunchCatalogIntegrity {
  const actualByNiche: Record<string, number> = {}
  const identities: Array<{ niche: string; slug: string; sha256: string }> = []
  const seenKeys = new Set<string>()
  const issues: string[] = []

  for (const niche of niches) {
    if (Object.prototype.hasOwnProperty.call(actualByNiche, niche.slug)) {
      issues.push(`${niche.slug}: duplicate niche result`)
      continue
    }
    if (!Array.isArray(niche.templates)) {
      issues.push(`${niche.slug}: invalid template identities`)
      continue
    }
    actualByNiche[niche.slug] = niche.templates.length
    for (const template of niche.templates) {
      const sha256 = typeof template?.artifactSha256 === 'string'
        ? template.artifactSha256.toLowerCase()
        : ''
      const key = `${niche.slug}/${template.slug}`
      if (seenKeys.has(key)) issues.push(`${key}: duplicate template identity`)
      seenKeys.add(key)
      if (!SHA256_RE.test(sha256)) issues.push(`${key}: invalid artifact SHA-256`)
      const approvedSha256 = approvedByKey.get(key)
      if (!approvedSha256) issues.push(`${key}: template is not approved for launch`)
      else if (approvedSha256 !== sha256) issues.push(`${key}: artifact differs from the approved launch receipt`)
      identities.push({ niche: niche.slug, slug: template.slug, sha256 })
    }
  }

  for (const [slug, expected] of Object.entries(expectedByNiche)) {
    const actual = actualByNiche[slug] ?? 0
    if (actual !== expected) issues.push(`${slug}: expected ${expected}, found ${actual}`)
  }
  for (const slug of Object.keys(actualByNiche)) {
    if (!Object.prototype.hasOwnProperty.call(expectedByNiche, slug)) {
      issues.push(`${slug}: unexpected launch niche`)
    }
  }
  for (const key of approvedByKey.keys()) {
    if (!seenKeys.has(key)) issues.push(`${key}: approved template is missing`)
  }

  const actualTotal = Object.values(actualByNiche).reduce((sum, count) => sum + count, 0)
  if (actualTotal !== expectedTotal) issues.push(`total: expected ${expectedTotal}, found ${actualTotal}`)
  if (
    identities.length === expectedTotal &&
    identityDigest(identities) !== launchCatalogContract.templateIdentitySha256
  ) {
    issues.push('catalog identity digest differs from the approved launch receipt')
  }

  return {
    ready: issues.length === 0,
    actualTotal,
    expectedTotal,
    actualByNiche,
    expectedByNiche,
    issues,
  }
}
