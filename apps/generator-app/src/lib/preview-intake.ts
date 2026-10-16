import type { BusinessInfo } from '@/store/previewStore'
import { getNicheSlugs } from './templates/niche-meta'

export type PreviewInfoErrors = Partial<Record<keyof BusinessInfo, string>>

export function isValidPreviewEmail(value: string): boolean {
  const email = value.trim()
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Real business previews save an email-linked lead before purchase; samples bypass intake. */
export function validatePreviewInfo(info: BusinessInfo): PreviewInfoErrors {
  const errors: PreviewInfoErrors = {}
  if (!info.businessName.trim()) errors.businessName = 'Enter your business name.'
  if (!getNicheSlugs().includes(info.niche)) errors.niche = 'Choose an available industry.'
  if (!isValidPreviewEmail(info.email)) {
    errors.email = 'Enter a valid contact email address.'
  }
  return errors
}
