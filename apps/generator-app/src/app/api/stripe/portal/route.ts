import { NextResponse } from 'next/server'
import { createStripeClient } from '@/lib/stripe-client'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { claimPortalSitesForUser } from '@/lib/portal-owner-auth'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: Request) {
  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  // Verify the caller is authenticated.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { slug?: unknown }
  const slug = typeof body.slug === 'string'
    ? body.slug.trim().toLowerCase()
    : ''
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    return NextResponse.json({ error: 'Choose a valid site before managing billing.' }, { status: 400 })
  }

  // Look up the Stripe customer ID stored in portal_sites.data.
  const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  await claimPortalSitesForUser(serviceClient, user)

  const { data: site } = await serviceClient
    .from('portal_sites')
    .select('data')
    .eq('owner_id', user.id)
    .eq('slug', slug)
    .maybeSingle()

  const stripeCustomerId = (site?.data as Record<string, string> | null)?.stripe_customer_id

  if (!stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          'No Stripe customer record found. Contact support@dailyclarity.org for billing assistance.',
      },
      { status: 400 },
    )
  }

  const returnUrl =
    process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL ??
    `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dailyclarity.org'}/dashboard`

  const stripe = createStripeClient(stripeSecretKey)
  const configurationId = process.env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID
  if (!configurationId) {
    return NextResponse.json({ error: 'Billing management is temporarily unavailable.' }, { status: 503 })
  }
  const configuration = await stripe.billingPortal.configurations.retrieve(configurationId)
  if (!configuration.active || configuration.features.subscription_update.enabled) {
    console.error('[stripe/portal] unsafe or inactive portal configuration:', configuration.id)
    return NextResponse.json({ error: 'Billing management is temporarily unavailable.' }, { status: 503 })
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
    configuration: configuration.id,
  })

  return NextResponse.json({ url: session.url })
}
