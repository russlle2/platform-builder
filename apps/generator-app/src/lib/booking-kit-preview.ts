import type { BookingKitArtifact } from './booking-kit-content'
import type { BusinessInfo } from '@/store/previewStore'

const customizationKeys = [
  'pb_inline_edits', 'pb_inline_edits_by_scope_v1', 'pb_inline_edits_legacy_migrated_v1',
  'pb_image_swaps', 'pb_image_swaps_by_scope_v1', 'pb_image_swaps_legacy_migrated_v1',
  'pb_custom_theme', 'pb_template_values', 'pb_checkout_context', 'pb_catalog_revision',
  'pb_selected_plan', 'pb_profile_reviewed',
] as const

export function hasSavedPreviewCustomizations(storage: Pick<Storage, 'getItem'>): boolean {
  return [...customizationKeys, 'pb_matched'].some((key) => {
    const saved = storage.getItem(key)
    return saved !== null && !['null', '{}', '[]', 'false', ''].includes(saved)
  })
}

/** Clears only the replaced preview draft, preserving upload-library ownership and kit access. */
export function clearReplacedPreviewCustomizations(storage: Pick<Storage, 'removeItem'>): void {
  for (const key of customizationKeys) storage.removeItem(key)
}

export function hasPopulatedPreview(info: Partial<BusinessInfo>): boolean {
  return Object.entries(info).some(([key, value]) => key !== 'niche' && typeof value === 'string' && value.trim().length > 0)
}

/** Call only following the buyer's explicit transfer action and, if needed, confirmation. */
export function bookingKitPreviewTransfer(
  artifact: BookingKitArtifact,
  current: BusinessInfo,
  replacementConfirmed = false,
): BusinessInfo | null {
  if (hasPopulatedPreview(current) && !replacementConfirmed) return null
  return { ...current, ...artifact.preview }
}
