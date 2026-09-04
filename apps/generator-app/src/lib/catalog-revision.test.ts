import { describe, expect, it } from 'vitest'
import {
  assertCatalogRevision,
  sanitizeCatalogRevisionPin,
  snapshotCatalogRevision,
} from './catalog-revision'

const v3Template = {
  validation: { contractVersion: 3 },
  designId: 'design_shared',
  contentPresetId: 'content_legacy_slug',
  themePresetId: 'theme_legacy_slug',
  qualityReceipt: 'receipt_deadbeef',
}

describe('catalogue revision pins', () => {
  it('snapshots only valid v3 design/content/theme receipts', () => {
    expect(snapshotCatalogRevision(v3Template)).toEqual({
      contractVersion: 3,
      designId: 'design_shared',
      contentPresetId: 'content_legacy_slug',
      themePresetId: 'theme_legacy_slug',
      qualityReceipt: 'receipt_deadbeef',
    })
    expect(snapshotCatalogRevision({ validation: { contractVersion: 2 } })).toBeUndefined()
    expect(sanitizeCatalogRevisionPin({ ...snapshotCatalogRevision(v3Template), designId: '../bad' }))
      .toBeNull()
  })

  it('accepts legacy unpinned records and rejects any changed v3 coordinate', () => {
    expect(() => assertCatalogRevision(v3Template, undefined)).not.toThrow()
    expect(() => assertCatalogRevision(v3Template, snapshotCatalogRevision(v3Template))).not.toThrow()
    expect(() => assertCatalogRevision(v3Template, {
      ...snapshotCatalogRevision(v3Template),
      contentPresetId: 'content_different',
    })).toThrow('Catalogue revision mismatch')
  })
})
