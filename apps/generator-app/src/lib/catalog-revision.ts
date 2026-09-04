/** Immutable catalogue coordinates captured when a customer starts checkout. */
export interface CatalogRevisionPin {
  contractVersion: 3
  designId: string
  contentPresetId: string
  themePresetId: string
  qualityReceipt: string
}

interface CatalogRevisionSource {
  validation?: { contractVersion?: number } | null
  designId?: unknown
  contentPresetId?: unknown
  themePresetId?: unknown
  qualityReceipt?: unknown
}

const DESIGN_ID_RE = /^design_[A-Za-z0-9_-]+$/
const CONTENT_ID_RE = /^content_[A-Za-z0-9_-]+$/
const THEME_ID_RE = /^theme_[A-Za-z0-9_-]+$/
const RECEIPT_ID_RE = /^receipt_[A-Za-z0-9_-]+$/

/** Validate an untrusted pin loaded from checkout or portal JSON. */
export function sanitizeCatalogRevisionPin(value: unknown): CatalogRevisionPin | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Partial<CatalogRevisionPin>
  if (
    candidate.contractVersion !== 3 ||
    typeof candidate.designId !== 'string' || !DESIGN_ID_RE.test(candidate.designId) ||
    typeof candidate.contentPresetId !== 'string' || !CONTENT_ID_RE.test(candidate.contentPresetId) ||
    typeof candidate.themePresetId !== 'string' || !THEME_ID_RE.test(candidate.themePresetId) ||
    typeof candidate.qualityReceipt !== 'string' || !RECEIPT_ID_RE.test(candidate.qualityReceipt)
  ) {
    return null
  }
  return {
    contractVersion: 3,
    designId: candidate.designId,
    contentPresetId: candidate.contentPresetId,
    themePresetId: candidate.themePresetId,
    qualityReceipt: candidate.qualityReceipt,
  }
}

/** Snapshot a publishable v3 template; v2 catalogue entries remain unpinned. */
export function snapshotCatalogRevision(source: CatalogRevisionSource): CatalogRevisionPin | undefined {
  if (source.validation?.contractVersion !== 3) return undefined
  const pin = sanitizeCatalogRevisionPin({
    contractVersion: 3,
    designId: source.designId,
    contentPresetId: source.contentPresetId,
    themePresetId: source.themePresetId,
    qualityReceipt: source.qualityReceipt,
  })
  if (!pin) throw new Error('Published v3 template has invalid catalogue revision metadata.')
  return pin
}

export function catalogRevisionMatches(
  source: CatalogRevisionSource,
  expected: CatalogRevisionPin,
): boolean {
  const current = snapshotCatalogRevision(source)
  return Boolean(current && catalogRevisionPinsEqual(current, expected))
}

export function catalogRevisionPinsEqual(
  left: CatalogRevisionPin,
  right: CatalogRevisionPin,
): boolean {
  return (
    left.designId === right.designId &&
    left.contentPresetId === right.contentPresetId &&
    left.themePresetId === right.themePresetId &&
    left.qualityReceipt === right.qualityReceipt
  )
}

/**
 * Enforce a stored v3 pin. Missing pins are intentionally accepted for
 * existing v2 purchases and portal records created before catalogue v3.
 */
export function assertCatalogRevision(
  source: CatalogRevisionSource,
  expectedValue: unknown,
): void {
  if (expectedValue === undefined || expectedValue === null) return
  const expected = sanitizeCatalogRevisionPin(expectedValue)
  if (!expected) throw new Error('Saved catalogue revision pin is invalid.')
  if (!catalogRevisionMatches(source, expected)) {
    throw new Error(
      'Catalogue revision mismatch: the purchased design/content/theme receipt is no longer current.',
    )
  }
}
