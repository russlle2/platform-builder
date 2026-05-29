/**
 * Server-side platform configuration from environment variables.
 */

export function getPlatformDomain(): string {
  return (
    process.env.PLATFORM_DOMAIN ||
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ||
    'dailyclarity.org'
  )
}

export function getStripeTrialDays(): number {
  const raw = process.env.STRIPE_TRIAL_DAYS
  if (!raw) return 7
  const parsed = parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function getDomainAffiliateUrl(): string | null {
  const url =
    process.env.NEXT_PUBLIC_DOMAIN_AFFILIATE_URL ||
    process.env.DOMAIN_AFFILIATE_URL ||
    ''
  return url.trim() || null
}

export function getPublicPlatformConfig() {
  return {
    platformDomain: getPlatformDomain(),
    domainAffiliateUrl: getDomainAffiliateUrl(),
    trialDays: getStripeTrialDays(),
  }
}
