import { NextRequest, NextResponse } from 'next/server'
import { getPlatformDomain } from '@/lib/platform-config'

/**
 * GET /api/integrations/status
 *
 * Returns the live configuration status of all platform integrations.
 */
export async function GET(req: NextRequest) {
  const hasStripeSecret = !!process.env.STRIPE_SECRET_KEY
  const hasStripeWebhook = !!process.env.STRIPE_WEBHOOK_SECRET
  const hasStripePriceBasic = !!process.env.STRIPE_PRICE_BASIC
  const hasStripePriceGrowth = !!process.env.STRIPE_PRICE_GROWTH
  const stripeCheckoutReady =
    hasStripeSecret &&
    hasStripeWebhook &&
    hasStripePriceBasic &&
    hasStripePriceGrowth

  const integrations = [
    {
      name: 'Stripe',
      configured: hasStripeSecret && hasStripeWebhook,
      detail: !hasStripeSecret
        ? 'Missing STRIPE_SECRET_KEY'
        : !hasStripeWebhook
          ? 'Missing STRIPE_WEBHOOK_SECRET'
          : !hasStripePriceBasic || !hasStripePriceGrowth
            ? `Missing price IDs (basic: ${hasStripePriceBasic ? 'ok' : 'no'}, growth: ${hasStripePriceGrowth ? 'ok' : 'no'})`
            : 'Connected',
    },
    {
      name: 'Postmark',
      configured: !!(process.env.POSTMARK_SERVER_TOKEN && process.env.EMAIL_FROM_ADDRESS),
      detail: process.env.POSTMARK_SERVER_TOKEN
        ? 'Connected'
        : 'Missing POSTMARK_SERVER_TOKEN',
    },
    {
      name: 'Supabase',
      configured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      detail: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? 'Connected'
        : 'Missing NEXT_PUBLIC_SUPABASE_URL',
    },
    {
      name: 'Netlify',
      configured: !!process.env.NETLIFY_ACCESS_TOKEN,
      detail: process.env.NETLIFY_ACCESS_TOKEN
        ? `Connected (${getPlatformDomain()})`
        : 'Missing NETLIFY_ACCESS_TOKEN',
    },
  ]

  const netlifyReady = !!process.env.NETLIFY_ACCESS_TOKEN
  const supabaseReady = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const postmarkReady = !!(
    process.env.POSTMARK_SERVER_TOKEN && process.env.EMAIL_FROM_ADDRESS
  )

  return NextResponse.json({
    integrations,
    checkoutReady: stripeCheckoutReady,
    fulfillmentReady: stripeCheckoutReady && netlifyReady && supabaseReady,
    emailReady: postmarkReady,
    platformDomain: getPlatformDomain(),
  })
}
