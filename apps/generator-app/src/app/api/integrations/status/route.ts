import { NextRequest, NextResponse } from 'next/server'
import { getPlatformDomain } from '@/lib/platform-config'
import { requireInternalAdminOrThrow } from '@/lib/server-auth'
import {
  getTemplateFulfillmentConfigIssues,
  isDedicatedSupabaseProjectConfigured,
} from '@/lib/stripe-runtime'
import { getTemplateCatalogReadiness } from '@/lib/templates/niche-registry'
import {
  inspectLaunchCatalog,
  type LaunchCatalogIntegrity,
} from '@/lib/templates/launch-catalog-integrity'

import { EXPECTED_LAUNCH_SCHEMA_VERSION, EXPECTED_BOOKING_KIT_SCHEMA_VERSION, inspectReleaseSchema } from '@/lib/release-schema'

function getSupabaseProjectRef(value: string | undefined): string | null {
  try {
    return new URL(value || '').hostname.toLowerCase().match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1] || null
  } catch {
    return null
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
  const launchSchema = await inspectReleaseSchema(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.DAILYCLARITY_SUPABASE_PROJECT_REF,
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

  let catalogIntegrity: LaunchCatalogIntegrity & { profile?: string; catalogHash?: string | null; manifestHash?: string | null; certificationHash?: string | null; catalogueReleaseSha?: string | null } = inspectLaunchCatalog([])
  try {
    catalogIntegrity = await getTemplateCatalogReadiness()
  } catch (error) {
    console.error('[integrations/status] template catalog check failed:', error)
  }
  const publishedTemplateCount = catalogIntegrity.actualTotal
  const templateCatalogReady = catalogIntegrity.ready

  const missingRequirements = [
    ...getTemplateFulfillmentConfigIssues(),
    ...(!hasStripePriceBasic ? ['STRIPE_PRICE_BASIC'] : []),
    ...(!hasStripePriceGrowth ? ['STRIPE_PRICE_GROWTH'] : []),
    ...(!launchSchema.ready ? [`supabase_schema_${EXPECTED_LAUNCH_SCHEMA_VERSION}_kit_${EXPECTED_BOOKING_KIT_SCHEMA_VERSION}`] : []),
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
                ? `Dedicated project schema/API probe failed (expected ${EXPECTED_LAUNCH_SCHEMA_VERSION} and ${EXPECTED_BOOKING_KIT_SCHEMA_VERSION})`
                : `Dedicated project and schemas ${launchSchema.schemaVersion}, ${launchSchema.kitSchemaVersion} verified`,
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
        ? `${publishedTemplateCount} validated editable templates available (${catalogIntegrity.profile} catalogue)`
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
    bookingKitSalesEnabled: process.env.BOOKING_KIT_ENABLED === 'true',
    supabaseProjectRef,
    supabaseSchemaVersion: launchSchema.schemaVersion,
    bookingKitSchemaVersion: launchSchema.kitSchemaVersion,
    supabaseSchemaReady: launchSchema.ready,
    publishedTemplateCount,
    templateCatalogReady,
    templateCatalogProfile: catalogIntegrity.profile ?? null,
    templateCatalogHash: catalogIntegrity.catalogHash ?? null,
    templateManifestHash: catalogIntegrity.manifestHash ?? null,
    templateCertificationHash: catalogIntegrity.certificationHash ?? null,
    templateCatalogueReleaseSha: catalogIntegrity.catalogueReleaseSha ?? null,
    expectedTemplateCount: catalogIntegrity.expectedTotal,
    templateCountsByNiche: catalogIntegrity.actualByNiche,
    expectedTemplateCountsByNiche: catalogIntegrity.expectedByNiche,
    templateCatalogIssues: catalogIntegrity.issues,
    missingRequirements,
    readinessBasis:
      'Configuration, live Supabase schema/API probe, and validated template manifest; Stripe/webhook delivery, sender verification, and DNS are not probed.',
  })
}
