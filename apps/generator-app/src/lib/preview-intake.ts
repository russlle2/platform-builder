import type { BusinessInfo } from '@/store/previewStore'
import { getNicheSlugs } from './templates/niche-meta'
import { normalizeAccountEmail } from './account-email'

export type PreviewInfoErrors = Partial<Record<keyof BusinessInfo, string>>

export function isValidPreviewEmail(value: string): boolean {
  return normalizeAccountEmail(value) !== null
}

/** Real business previews save an email-linked lead before purchase; samples bypass intake. */
export function validatePreviewInfo(info: BusinessInfo): PreviewInfoErrors {
  const errors: PreviewInfoErrors = {}
  if (!info.businessName.trim()) errors.businessName = 'Enter your business name.'
  if (!getNicheSlugs().includes(info.niche)) errors.niche = 'Choose an available industry.'
  if (!isValidPreviewEmail(info.accountEmail)) {
    errors.accountEmail = 'Enter a valid account email address.'
  }
  if (!isValidPreviewEmail(info.email)) {
    errors.email = 'Enter a valid public contact email address.'
  }
  return errors
}

/** Keep private identity attached to its business draft, independently of URL/template selection. */
export function checkoutAccountEmail(
  customerValues: Record<string, string>,
  savedBusinessInfo: string | null,
): string | null {
  const publicEmail = typeof customerValues.EMAIL === 'string' ? customerValues.EMAIL.trim() : ''
  if (!isValidPreviewEmail(publicEmail)) return null
  // Legacy template-only checkouts used one address for both purposes.
  if (savedBusinessInfo === null) return publicEmail.toLowerCase()
  try {
    const info: unknown = JSON.parse(savedBusinessInfo)
    if (!info || typeof info !== 'object' || Array.isArray(info)) return null
    const draft = info as Record<string, unknown>
    // Do not attach a different/partially edited business's account to stale pricing values.
    if (typeof draft.businessName !== 'string' || draft.businessName.trim() !== customerValues.BUSINESS_NAME?.trim()
      || typeof draft.email !== 'string' || draft.email.trim().toLowerCase() !== publicEmail.toLowerCase()) return null
    const accountEmail = Object.prototype.hasOwnProperty.call(draft, 'accountEmail') ? draft.accountEmail : draft.email
    return typeof accountEmail === 'string' && isValidPreviewEmail(accountEmail) ? accountEmail.trim().toLowerCase() : null
  } catch {
    return null
  }
}
