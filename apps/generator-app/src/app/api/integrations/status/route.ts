import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/integrations/status
 *
 * Returns the live configuration status of all platform integrations.
 * Used by the portal to show real-time integration health instead of
 * hardcoded "Pending" badges.
 */
export async function GET(req: NextRequest) {
  const integrations = [
    {
      name: 'Stripe',
      configured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      detail: process.env.STRIPE_SECRET_KEY
        ? 'Connected'
        : 'Missing STRIPE_SECRET_KEY',
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
        ? 'Connected'
        : 'Missing NETLIFY_ACCESS_TOKEN',
    },
  ]

  return NextResponse.json({ integrations })
}
