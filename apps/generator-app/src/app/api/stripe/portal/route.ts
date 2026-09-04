import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST() {
  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  // Verify the caller is authenticated.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  // Look up the Stripe customer ID stored in portal_sites.data.
  const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  const { data: site } = await serviceClient
    .from('portal_sites')
    .select('data')
    .eq('owner_email', user.email)
    .limit(1)
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

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  })

  return NextResponse.json({ url: session.url })
}
