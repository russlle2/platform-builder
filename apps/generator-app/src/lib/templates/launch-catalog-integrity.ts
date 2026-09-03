import launchCatalogContract from './launch-catalog-contract.json'

export interface CatalogNicheCount {
  slug: string
  templateCount: number
}

export interface LaunchCatalogIntegrity {
  ready: boolean
  actualTotal: number
  expectedTotal: number
  actualByNiche: Record<string, number>
  expectedByNiche: Readonly<Record<string, number>>
  issues: string[]
}

const expectedByNiche = Object.freeze({ ...launchCatalogContract.templatesByNiche })
const expectedTotal = launchCatalogContract.totalTemplates
const calculatedTotal = Object.values(expectedByNiche).reduce((sum, count) => sum + count, 0)

if (calculatedTotal !== expectedTotal) {
  throw new Error(
    `Launch catalog contract is inconsistent: niches total ${calculatedTotal}, expected ${expectedTotal}.`,
  )
}

export const LAUNCH_CATALOG_EXPECTED_TOTAL = expectedTotal
export const LAUNCH_CATALOG_EXPECTED_BY_NICHE = expectedByNiche

/**
 * Validate the runtime catalog against the exact launch inventory. Counts must
 * come from the registry after its editability/validation filter has run.
 */
export function inspectLaunchCatalog(
  niches: readonly CatalogNicheCount[],
): LaunchCatalogIntegrity {
  const actualByNiche: Record<string, number> = {}
  const issues: string[] = []

  for (const niche of niches) {
    if (!Number.isInteger(niche.templateCount) || niche.templateCount < 0) {
      issues.push(`${niche.slug}: invalid template count`)
      continue
    }
    if (Object.prototype.hasOwnProperty.call(actualByNiche, niche.slug)) {
      issues.push(`${niche.slug}: duplicate niche result`)
      continue
    }
    actualByNiche[niche.slug] = niche.templateCount
  }

  for (const [slug, expected] of Object.entries(expectedByNiche)) {
    const actual = actualByNiche[slug] ?? 0
    if (actual !== expected) {
      issues.push(`${slug}: expected ${expected}, found ${actual}`)
    }
  }

  for (const slug of Object.keys(actualByNiche)) {
    if (!Object.prototype.hasOwnProperty.call(expectedByNiche, slug)) {
      issues.push(`${slug}: unexpected launch niche`)
    }
  }

  const actualTotal = Object.values(actualByNiche).reduce((sum, count) => sum + count, 0)
  if (actualTotal !== expectedTotal) {
    issues.push(`total: expected ${expectedTotal}, found ${actualTotal}`)
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
