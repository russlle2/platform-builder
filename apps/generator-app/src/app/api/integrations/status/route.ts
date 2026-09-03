import { NextRequest, NextResponse } from 'next/server'
import { getPlatformDomain } from '@/lib/platform-config'
import { requireInternalAdminOrThrow } from '@/lib/server-auth'
import {
  getTemplateFulfillmentConfigIssues,
  isDedicatedSupabaseProjectConfigured,
} from '@/lib/stripe-runtime'
import { getLaunchCatalogIdentitySnapshot } from '@/lib/templates/niche-registry'
import {
  inspectLaunchCatalog,
  type LaunchCatalogIntegrity,
} from '@/lib/templates/launch-catalog-integrity'

const EXPECTED_LAUNCH_SCHEMA_VERSION = '20260903.3'

function getSupabaseProjectRef(value: string | undefined): string | null {
  try {
    return new URL(value || '').hostname.toLowerCase().match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1] || null
  } catch {
    return null
  }
}

async function inspectLaunchSchema(url: string | undefined, serviceKey: string | undefined) {
  if (!url || !serviceKey) return { ready: false, schemaVersion: null }
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/launch_schema_readiness`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return { ready: false, schemaVersion: null }
    const result = await response.json() as { ready?: boolean; schemaVersion?: string }
    return {
      ready: result.ready === true && result.schemaVersion === EXPECTED_LAUNCH_SCHEMA_VERSION,
      schemaVersion: typeof result.schemaVersion === 'string' ? result.schemaVersion : null,
    }
  } catch {
    return { ready: false, schemaVersion: null }
  }
}

/**
 * GET /api/integrations/status
 *
 * Returns the live configuration status of all platform integrations.
 * Admin-only: requires INTERNAL_ADMIN_TOKEN.
 */
export async function GET(req: NextRequest) {
  const authError = requireInternalAdminOrThrow(req)
  if (authError) return authError

  const hasStripeSecret = !!process.env.STRIPE_SECRET_KEY
  const hasStripeWebhook = !!process.env.STRIPE_WEBHOOK_SECRET
  const workerSecretLength = process.env.STRIPE_FULFILLMENT_WORKER_SECRET?.trim().length || 0
  const stripeWorkerReady = workerSecretLength >= 32
  const hasStripePriceBasic = !!process.env.STRIPE_PRICE_BASIC
  const hasStripePriceGrowth = !!process.env.STRIPE_PRICE_GROWTH
  const hasStripePriceCustomBuild = !!process.env.STRIPE_PRICE_CUSTOM_BUILD
  const hasStripePortalConfiguration = !!process.env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID
  const stripeConfigured =
    hasStripeSecret &&
    hasStripeWebhook &&
    stripeWorkerReady &&
    hasStripePriceBasic &&
    hasStripePriceGrowth &&
    hasStripePortalConfiguration

  const hasPostmarkToken = !!process.env.POSTMARK_SERVER_TOKEN
  const hasEmailFrom = !!process.env.EMAIL_FROM_ADDRESS
  const postmarkReady = hasPostmarkToken && hasEmailFrom
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasSupabaseServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const hasDedicatedSupabaseRef = !!process.env.DAILYCLARITY_SUPABASE_PROJECT_REF
  const supabaseProjectMatches = isDedicatedSupabaseProjectConfigured()
  const supabaseProjectRef = getSupabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const launchSchema = await inspectLaunchSchema(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
  const supabaseReady =
    hasSupabaseUrl &&
    hasSupabaseServiceKey &&
    hasDedicatedSupabaseRef &&
    supabaseProjectMatches &&
    launchSchema.ready
  const hasNetlifyToken = !!process.env.NETLIFY_ACCESS_TOKEN
  const hasPlatformDomain = !!process.env.PLATFORM_DOMAIN
  const netlifyReady = hasNetlifyToken && hasPlatformDomain
  const portalSigningReady = !!process.env.PORTAL_TOKEN_SECRET

  let catalogIntegrity: LaunchCatalogIntegrity = inspectLaunchCatalog([])
  try {
    const niches = await getLaunchCatalogIdentitySnapshot()
    catalogIntegrity = inspectLaunchCatalog(niches)
  } catch (error) {
    console.error('[integrations/status] template catalog check failed:', error)
  }
  const publishedTemplateCount = catalogIntegrity.actualTotal
  const templateCatalogReady = catalogIntegrity.ready

  const missingRequirements = [
    ...getTemplateFulfillmentConfigIssues(),
    ...(!hasStripePriceBasic ? ['STRIPE_PRICE_BASIC'] : []),
    ...(!hasStripePriceGrowth ? ['STRIPE_PRICE_GROWTH'] : []),
    ...(!launchSchema.ready ? [`supabase_schema_${EXPECTED_LAUNCH_SCHEMA_VERSION}`] : []),
    ...(!templateCatalogReady ? ['validated_template_catalog'] : []),
  ]
  const checkoutReady = missingRequirements.length === 0
  const customBuildCheckoutReady =
    hasStripeSecret &&
    hasStripeWebhook &&
    stripeWorkerReady &&
    hasStripePriceCustomBuild &&
    supabaseReady &&
    postmarkReady

  const integrations = [
    {
      name: 'Stripe',
      configured: stripeConfigured,
      detail: !hasStripeSecret
        ? 'Missing STRIPE_SECRET_KEY'
        : !hasStripeWebhook
          ? 'Missing STRIPE_WEBHOOK_SECRET'
          : !stripeWorkerReady
            ? 'Missing or weak STRIPE_FULFILLMENT_WORKER_SECRET'
          : !hasStripePriceBasic || !hasStripePriceGrowth
            ? `Missing price IDs (basic: ${hasStripePriceBasic ? 'ok' : 'no'}, growth: ${hasStripePriceGrowth ? 'ok' : 'no'})`
            : !hasStripePortalConfiguration
              ? 'Missing STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID'
            : 'Configured (credentials, webhook destination, and Price objects not live-tested)',
    },
    {
      name: 'Postmark',
      configured: postmarkReady,
      detail: !hasPostmarkToken
        ? 'Missing POSTMARK_SERVER_TOKEN'
        : !hasEmailFrom
          ? 'Missing EMAIL_FROM_ADDRESS'
          : 'Configured (sender verification and API access not live-tested)',
    },
    {
      name: 'Supabase',
      configured: supabaseReady,
      detail: !hasSupabaseUrl
        ? 'Missing NEXT_PUBLIC_SUPABASE_URL'
        : !hasSupabaseServiceKey
          ? 'Missing SUPABASE_SERVICE_ROLE_KEY'
          : !hasDedicatedSupabaseRef
            ? 'Missing DAILYCLARITY_SUPABASE_PROJECT_REF'
            : !supabaseProjectMatches
              ? 'NEXT_PUBLIC_SUPABASE_URL does not match the dedicated DailyClarity project ref'
              : !launchSchema.ready
                ? `Dedicated project schema/API probe failed (expected ${EXPECTED_LAUNCH_SCHEMA_VERSION})`
                : `Dedicated project and schema ${launchSchema.schemaVersion} verified`,
    },
    {
      name: 'Netlify',
      configured: netlifyReady,
      detail: !hasNetlifyToken
        ? 'Missing NETLIFY_ACCESS_TOKEN'
        : !hasPlatformDomain
          ? 'Missing PLATFORM_DOMAIN'
          : `Configured for ${getPlatformDomain()} (API access and DNS not live-tested)`,
    },
    {
      name: 'Stripe fulfillment worker',
      configured: stripeWorkerReady,
      detail: stripeWorkerReady
        ? 'Authenticated background worker configured (deployment and scheduled recovery not live-tested)'
        : 'Missing STRIPE_FULFILLMENT_WORKER_SECRET with at least 32 characters',
    },
    {
      name: 'Portal signing',
      configured: portalSigningReady,
      detail: portalSigningReady
        ? 'Configured'
        : 'Missing PORTAL_TOKEN_SECRET',
    },
    {
      name: 'Template catalog',
      configured: templateCatalogReady,
      detail: templateCatalogReady
        ? `${publishedTemplateCount} validated editable templates available (12 in each launch niche)`
        : `${publishedTemplateCount}/${catalogIntegrity.expectedTotal} validated editable templates; ${catalogIntegrity.issues.join('; ')}`,
    },
  ]

  return NextResponse.json({
    integrations,
    checkoutReady,
    templateCheckoutReady: checkoutReady,
    customBuildCheckoutReady,
    fulfillmentReady: checkoutReady,
    emailReady: postmarkReady,
    platformDomain: getPlatformDomain(),
    deploymentSiteId: process.env.SITE_ID || null,
    deploymentReleaseSha: process.env.NEXT_PUBLIC_RELEASE_SHA || null,
    supabaseProjectRef,
    supabaseSchemaVersion: launchSchema.schemaVersion,
    supabaseSchemaReady: launchSchema.ready,
    publishedTemplateCount,
    expectedTemplateCount: catalogIntegrity.expectedTotal,
    templateCountsByNiche: catalogIntegrity.actualByNiche,
    expectedTemplateCountsByNiche: catalogIntegrity.expectedByNiche,
    templateCatalogIssues: catalogIntegrity.issues,
    missingRequirements,
    readinessBasis:
      'Configuration, live Supabase schema/API probe, and validated template manifest; Stripe/webhook delivery, sender verification, and DNS are not probed.',
  })
}
