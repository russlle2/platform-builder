import { describe, expect, it } from 'vitest'
import {
  getInvoiceSubscriptionId,
  getMissingTemplateFulfillmentConfig,
  getSupportedCheckoutType,
  getTemplateFulfillmentConfigIssues,
  isDedicatedSupabaseProjectConfigured,
  isCheckoutPaymentReady,
} from './stripe-runtime'

describe('Stripe runtime compatibility', () => {
  it('resolves a Dahlia invoice subscription from parent.subscription_details', () => {
    expect(getInvoiceSubscriptionId({
      parent: {
        subscription_details: { subscription: { id: 'sub_dahlia' } },
      },
    })).toBe('sub_dahlia')
  })

  it('falls back to the pre-Basil invoice subscription field', () => {
    expect(getInvoiceSubscriptionId({
      parent: null,
      subscription: 'sub_legacy',
    })).toBe('sub_legacy')
  })

  it('prefers the current invoice parent when both versioned shapes exist', () => {
    expect(getInvoiceSubscriptionId({
      parent: {
        subscription_details: { subscription: 'sub_current' },
      },
      subscription: 'sub_legacy',
    })).toBe('sub_current')
  })

  it('only treats paid and no-payment-required sessions as fulfillable', () => {
    expect(isCheckoutPaymentReady({ payment_status: 'paid' })).toBe(true)
    expect(isCheckoutPaymentReady({
      payment_status: 'no_payment_required',
      subscription: 'sub_trial',
    })).toBe(true)
    expect(isCheckoutPaymentReady({ payment_status: 'no_payment_required' })).toBe(false)
    expect(isCheckoutPaymentReady({ payment_status: 'unpaid' })).toBe(false)
    expect(isCheckoutPaymentReady({})).toBe(false)
  })

  it('only accepts the two explicitly supported checkout types', () => {
    expect(getSupportedCheckoutType({
      metadata: { checkoutType: 'template_subscription' },
    })).toBe('template_subscription')
    expect(getSupportedCheckoutType({
      metadata: { checkoutType: 'custom_build' },
    })).toBe('custom_build')
    expect(getSupportedCheckoutType({ metadata: { checkoutType: 'other_product' } })).toBeNull()
    expect(getSupportedCheckoutType({ metadata: null })).toBeNull()
  })

  it('reports every missing fulfillment dependency and accepts trimmed values', () => {
    const configured = {
      STRIPE_SECRET_KEY: ' sk_test_example ',
      STRIPE_WEBHOOK_SECRET: ' whsec_example ',
      STRIPE_FULFILLMENT_WORKER_SECRET: ` ${'w'.repeat(64)} `,
      STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID: ' bpc_example ',
      NEXT_PUBLIC_SITE_URL: ' https://dailyclarity.org ',
      NEXT_PUBLIC_SUPABASE_URL: ' https://example.supabase.co ',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ' anon-key ',
      SUPABASE_SERVICE_ROLE_KEY: ' service-role ',
      DAILYCLARITY_SUPABASE_PROJECT_REF: ' example ',
      NETLIFY_ACCESS_TOKEN: ' netlify-token ',
      PLATFORM_DOMAIN: ' dailyclarity.org ',
      PORTAL_TOKEN_SECRET: ' portal-secret ',
      POSTMARK_SERVER_TOKEN: ' postmark-token ',
      EMAIL_FROM_ADDRESS: ' hello@dailyclarity.org ',
    }

    expect(getMissingTemplateFulfillmentConfig(configured)).toEqual([])
    expect(getMissingTemplateFulfillmentConfig({
      ...configured,
      NETLIFY_ACCESS_TOKEN: ' ',
      STRIPE_FULFILLMENT_WORKER_SECRET: undefined,
      PORTAL_TOKEN_SECRET: undefined,
      EMAIL_FROM_ADDRESS: '',
    })).toEqual([
      'STRIPE_FULFILLMENT_WORKER_SECRET',
      'NETLIFY_ACCESS_TOKEN',
      'PORTAL_TOKEN_SECRET',
      'EMAIL_FROM_ADDRESS',
    ])

    expect(isDedicatedSupabaseProjectConfigured(configured)).toBe(true)
    expect(getTemplateFulfillmentConfigIssues({
      ...configured,
      DAILYCLARITY_SUPABASE_PROJECT_REF: 'different-project',
    })).toContain('SUPABASE_PROJECT_REF_MISMATCH')
    expect(getTemplateFulfillmentConfigIssues({
      ...configured,
      NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.com',
    })).toContain('SUPABASE_PROJECT_REF_MISMATCH')
    expect(getTemplateFulfillmentConfigIssues({
      ...configured,
      NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    })).toContain('GENERATED_SITE_API_ORIGIN_INSECURE')
    expect(getTemplateFulfillmentConfigIssues({
      ...configured,
      NEXT_PUBLIC_API_URL: 'not a URL',
    })).toContain('GENERATED_SITE_API_ORIGIN_INVALID')
    expect(getTemplateFulfillmentConfigIssues({
      ...configured,
      STRIPE_FULFILLMENT_WORKER_SECRET: 'too-short',
    })).toContain('STRIPE_FULFILLMENT_WORKER_SECRET_TOO_SHORT')
  })
})
