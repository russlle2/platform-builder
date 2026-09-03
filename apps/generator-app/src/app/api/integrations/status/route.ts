import { NextRequest, NextResponse } from 'next/server'
import { getPlatformDomain } from '@/lib/platform-config'
import { requireInternalAdminOrThrow } from '@/lib/server-auth'
import {
  getTemplateFulfillmentConfigIssues,
  isDedicatedSupabaseProjectConfigured,
} from '@/lib/stripe-runtime'
import { getNiches } from '@/lib/templates/niche-registry'
import {
  inspectLaunchCatalog,
  type LaunchCatalogIntegrity,
} from '@/lib/templates/launch-catalog-integrity'

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
  const supabaseReady =
    hasSupabaseUrl &&
    hasSupabaseServiceKey &&
    hasDedicatedSupabaseRef &&
    supabaseProjectMatches
  const hasNetlifyToken = !!process.env.NETLIFY_ACCESS_TOKEN
  const hasPlatformDomain = !!process.env.PLATFORM_DOMAIN
  const netlifyReady = hasNetlifyToken && hasPlatformDomain
  const portalSigningReady = !!process.env.PORTAL_TOKEN_SECRET

  let catalogIntegrity: LaunchCatalogIntegrity = inspectLaunchCatalog([])
  try {
    const niches = await getNiches()
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
              : 'Dedicated project configured (schema and API access not live-tested)',
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
    publishedTemplateCount,
    expectedTemplateCount: catalogIntegrity.expectedTotal,
    templateCountsByNiche: catalogIntegrity.actualByNiche,
    expectedTemplateCountsByNiche: catalogIntegrity.expectedByNiche,
    templateCatalogIssues: catalogIntegrity.issues,
    missingRequirements,
    readinessBasis:
      'Configuration and validated template manifest only; external APIs, webhook delivery, sender verification, and DNS are not probed.',
  })
}
