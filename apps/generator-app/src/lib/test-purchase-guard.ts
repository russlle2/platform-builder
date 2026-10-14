import { getSupabaseProjectRef } from './stripe-runtime'

type GuardEnvironment = Partial<Record<string, string | undefined>>

export function hasSecureTestPurchaseSecret(
  env: GuardEnvironment = process.env,
): boolean {
  return (env.TEST_PURCHASE_ADMIN_SECRET?.trim().length || 0) >= 32
}

export function getTestPurchaseGuardIssue(
  requestUrl: string,
  env: GuardEnvironment = process.env,
): string | null {
  if (env.DAILYCLARITY_ENVIRONMENT !== 'staging') return 'STAGING_ENVIRONMENT_REQUIRED'
  if (env.ENABLE_TEST_PURCHASE !== 'true') return 'TEST_PURCHASE_DISABLED'

  const expectedHost = env.STAGING_APP_HOST?.trim().toLowerCase()
  if (!expectedHost) return 'STAGING_HOST_REQUIRED'
  let requestHost: string
  try {
    const parsed = new URL(requestUrl)
    if (parsed.protocol !== 'https:' && env.NODE_ENV === 'production') return 'STAGING_HTTPS_REQUIRED'
    requestHost = parsed.host.toLowerCase()
  } catch {
    return 'INVALID_REQUEST_URL'
  }
  if (requestHost !== expectedHost) return 'STAGING_HOST_MISMATCH'

  const stagingRef = env.STAGING_SUPABASE_PROJECT_REF?.trim().toLowerCase()
  const dedicatedRef = env.DAILYCLARITY_SUPABASE_PROJECT_REF?.trim().toLowerCase()
  const actualRef = getSupabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL)
  if (!stagingRef || !dedicatedRef || !actualRef) return 'STAGING_SUPABASE_REQUIRED'
  if (stagingRef !== dedicatedRef || stagingRef !== actualRef) {
    return 'STAGING_SUPABASE_MISMATCH'
  }
  return null
}
