import { describe, expect, it } from 'vitest'
import { getTestPurchaseGuardIssue } from './test-purchase-guard'

const staging = {
  DAILYCLARITY_ENVIRONMENT: 'staging',
  ENABLE_TEST_PURCHASE: 'true',
  STAGING_APP_HOST: 'dailyclarity-staging.netlify.app',
  NEXT_PUBLIC_SUPABASE_URL: 'https://stagingref.supabase.co',
  DAILYCLARITY_SUPABASE_PROJECT_REF: 'stagingref',
  STAGING_SUPABASE_PROJECT_REF: 'stagingref',
  NODE_ENV: 'production',
}

describe('test purchase staging boundary', () => {
  it('accepts only the exact staging host and project', () => {
    expect(getTestPurchaseGuardIssue(
      'https://dailyclarity-staging.netlify.app/api/test-purchase',
      staging,
    )).toBeNull()
  })

  it('rejects production even when the legacy flag and secret could be present', () => {
    expect(getTestPurchaseGuardIssue('https://dailyclarity.org/api/test-purchase', {
      ...staging,
      DAILYCLARITY_ENVIRONMENT: 'production',
      STAGING_APP_HOST: 'dailyclarity.org',
    })).toBe('STAGING_ENVIRONMENT_REQUIRED')
  })

  it('rejects host and Supabase project mismatches', () => {
    expect(getTestPurchaseGuardIssue('https://dailyclarity.org/api/test-purchase', staging))
      .toBe('STAGING_HOST_MISMATCH')
    expect(getTestPurchaseGuardIssue(
      'https://dailyclarity-staging.netlify.app/api/test-purchase',
      { ...staging, NEXT_PUBLIC_SUPABASE_URL: 'https://productionref.supabase.co' },
    )).toBe('STAGING_SUPABASE_MISMATCH')
  })
})
