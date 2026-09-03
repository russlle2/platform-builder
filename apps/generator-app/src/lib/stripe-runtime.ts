export const TEMPLATE_CHECKOUT_TYPE = 'template_subscription' as const
export const CUSTOM_BUILD_CHECKOUT_TYPE = 'custom_build' as const

export const TEMPLATE_FULFILLMENT_ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_FULFILLMENT_WORKER_SECRET',
  'STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DAILYCLARITY_SUPABASE_PROJECT_REF',
  'NETLIFY_ACCESS_TOKEN',
  'PLATFORM_DOMAIN',
  'PORTAL_TOKEN_SECRET',
  'POSTMARK_SERVER_TOKEN',
  'EMAIL_FROM_ADDRESS',
] as const

type RuntimeEnvironment = Partial<Record<string, string | undefined>>

/** Configuration required to accept a template purchase that can be fulfilled. */
export function getMissingTemplateFulfillmentConfig(
  env: RuntimeEnvironment = process.env,
): string[] {
  return TEMPLATE_FULFILLMENT_ENV_KEYS.filter((key) => !env[key]?.trim())
}

export function getSupabaseProjectRef(url: string | undefined): string | null {
  if (!url?.trim()) return null
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return hostname.match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1] || null
  } catch {
    return null
  }
}

export function isDedicatedSupabaseProjectConfigured(
  env: RuntimeEnvironment = process.env,
): boolean {
  const expectedRef = env.DAILYCLARITY_SUPABASE_PROJECT_REF?.trim().toLowerCase()
  const actualRef = getSupabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL)
  return Boolean(expectedRef && actualRef && expectedRef === actualRef)
}

/** Missing variables plus safe, value-free configuration mismatch codes. */
export function getTemplateFulfillmentConfigIssues(
  env: RuntimeEnvironment = process.env,
): string[] {
  const issues = getMissingTemplateFulfillmentConfig(env)
  if (
    !issues.includes('NEXT_PUBLIC_SUPABASE_URL') &&
    !issues.includes('DAILYCLARITY_SUPABASE_PROJECT_REF') &&
    !isDedicatedSupabaseProjectConfigured(env)
  ) {
    issues.push('SUPABASE_PROJECT_REF_MISMATCH')
  }
  const workerSecret = env.STRIPE_FULFILLMENT_WORKER_SECRET?.trim()
  if (workerSecret && workerSecret.length < 32) {
    issues.push('STRIPE_FULFILLMENT_WORKER_SECRET_TOO_SHORT')
  }
  const generatedSiteApiOrigin = env.NEXT_PUBLIC_API_URL?.trim() || env.NEXT_PUBLIC_SITE_URL?.trim()
  if (generatedSiteApiOrigin) {
    try {
      const url = new URL(generatedSiteApiOrigin)
      if (url.protocol !== 'https:' || url.username || url.password) {
        issues.push('GENERATED_SITE_API_ORIGIN_INSECURE')
      }
    } catch {
      issues.push('GENERATED_SITE_API_ORIGIN_INVALID')
    }
  }
  return issues
}

/**
 * Stripe uses `no_payment_required` for subscription checkouts whose trial or
 * discount makes the initial amount zero. `unpaid` must wait for the later
 * async-payment success event before fulfillment starts.
 */
export function isCheckoutPaymentReady(session: {
  payment_status?: string | null
  subscription?: unknown
}): boolean {
  return session.payment_status === 'paid' || (
    session.payment_status === 'no_payment_required' &&
    Boolean(stripeObjectId(session.subscription))
  )
}

export type SupportedCheckoutType =
  | typeof TEMPLATE_CHECKOUT_TYPE
  | typeof CUSTOM_BUILD_CHECKOUT_TYPE

export function getSupportedCheckoutType(session: {
  metadata?: { checkoutType?: unknown } | null
}): SupportedCheckoutType | null {
  const checkoutType = session.metadata?.checkoutType
  return checkoutType === TEMPLATE_CHECKOUT_TYPE || checkoutType === CUSTOM_BUILD_CHECKOUT_TYPE
    ? checkoutType
    : null
}

function stripeObjectId(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

interface VersionedInvoiceSubscriptionSource {
  parent?: {
    subscription_details?: {
      subscription?: unknown
    } | null
  } | null
  /** Present on webhook events created with pre-Basil Stripe API versions. */
  subscription?: unknown
}

/** Resolve both current Dahlia and retained legacy webhook invoice shapes. */
export function getInvoiceSubscriptionId(invoice: VersionedInvoiceSubscriptionSource): string | null {
  return (
    stripeObjectId(invoice.parent?.subscription_details?.subscription) ||
    stripeObjectId(invoice.subscription)
  )
}
