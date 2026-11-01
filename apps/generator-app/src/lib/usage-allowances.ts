/** Included allowances; reaching one never creates an additional Stripe charge. */
export const PAID_SITE_ALLOWANCE = {
  publishes: 30,
  contacts: 200,
  imageBytes: 100 * 1024 * 1024,
  imageObjects: 100,
} as const

export const TRIAL_SITE_ALLOWANCE = {
  publishes: 5,
  contacts: 20,
  imageBytes: 20 * 1024 * 1024,
  imageObjects: 20,
} as const

export interface SiteUsageStatus {
  entitlement: { allowed: boolean; tier: 'paid' | 'trial' | null; reason: string; validThrough: string | null }
  resetAt: string
  publish: { used: number; limit: number }
  contact: { used: number; limit: number }
  storage: { bytes: number; objects: number; byteLimit: number; objectLimit: number }
}
