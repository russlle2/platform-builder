import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  CUSTOM_BUILD_AMOUNT_CENTS,
  CUSTOM_BUILD_CURRENCY,
  CUSTOM_BUILD_LOOKUP_KEY,
  DEFAULT_CUSTOM_BUILD_PRICE_ID,
  validateCustomBuildInput,
} from '@/lib/custom-build'
import { jsonTooManyRequests, rateLimitByIp } from '@/lib/server-auth'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function resolveCustomBuildPrice(stripe: Stripe): Promise<string> {
  const configuredPriceId = process.env.STRIPE_PRICE_CUSTOM_BUILD || DEFAULT_CUSTOM_BUILD_PRICE_ID
  if (configuredPriceId) {
    const configuredPrice = await stripe.prices.retrieve(configuredPriceId)
    if (
      configuredPrice.active &&
      configuredPrice.type === 'one_time' &&
      configuredPrice.currency === CUSTOM_BUILD_CURRENCY &&
      configuredPrice.unit_amount === CUSTOM_BUILD_AMOUNT_CENTS
    ) {
      return configuredPrice.id
    }
    throw new Error('STRIPE_PRICE_CUSTOM_BUILD is not an active one-time $500 USD price.')
  }

  const existing = await stripe.prices.list({
    active: true,
    lookup_keys: [CUSTOM_BUILD_LOOKUP_KEY],
    limit: 1,
  })
  const price = existing.data[0]
  if (price) {
    if (
      price.type !== 'one_time' ||
      price.currency !== CUSTOM_BUILD_CURRENCY ||
      price.unit_amount !== CUSTOM_BUILD_AMOUNT_CENTS
    ) {
      throw new Error('The custom-build Stripe lookup key is attached to the wrong price.')
    }
    return price.id
  }

  const product = await stripe.products.create(
    {
      name: 'Custom Website Build',
      description:
        'A one-time custom website design and build based on the detailed project brief submitted at DailyClarity.org.',
      metadata: { offering: 'custom_website_build', platform: 'dailyclarity' },
    },
    { idempotencyKey: 'dailyclarity-custom-build-product-v1' },
  )

  const createdPrice = await stripe.prices.create(
    {
      product: product.id,
      currency: CUSTOM_BUILD_CURRENCY,
      unit_amount: CUSTOM_BUILD_AMOUNT_CENTS,
      lookup_key: CUSTOM_BUILD_LOOKUP_KEY,
      metadata: { offering: 'custom_website_build', amount: '500_usd' },
    },
    { idempotencyKey: 'dailyclarity-custom-build-price-v1' },
  )

  return createdPrice.id
}

export async function POST(req: NextRequest) {
  if (!rateLimitByIp(req, 'custom-build-checkout', 5, 10 * 60 * 1000)) {
    return jsonTooManyRequests()
  }

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Custom-build checkout is not configured.' },
      { status: 500 },
    )
  }

  let requestId: string | null = null
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  try {
    const parsed = validateCustomBuildInput(await req.json())
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    requestId = randomUUID()
    const now = new Date().toISOString()
    const { error: insertError } = await supabase.from('custom_build_requests').insert({
      id: requestId,
      status: 'checkout_pending',
      business_name: parsed.data.businessName,
      contact_name: parsed.data.contactName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      site_vision: parsed.data.siteVision,
      required_functionality: parsed.data.requiredFunctionality,
      inspiration_links: parsed.data.inspirationLinks,
      existing_website: parsed.data.existingWebsite,
      amount_cents: CUSTOM_BUILD_AMOUNT_CENTS,
      currency: CUSTOM_BUILD_CURRENCY,
      terms_accepted_at: now,
      updated_at: now,
    })

    if (insertError) {
      console.error('[stripe/custom-build] request insert failed:', insertError)
      return NextResponse.json(
        { error: 'We could not save your project brief. Please try again.' },
        { status: 500 },
      )
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
    const priceId = await resolveCustomBuildPrice(stripe)
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, '')

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: parsed.data.email,
      client_reference_id: requestId,
      payment_method_types: ['card', 'cashapp'],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/custom-build?canceled=1`,
      metadata: {
        checkoutType: 'custom_build',
        customBuildRequestId: requestId,
      },
      payment_intent_data: {
        metadata: {
          checkoutType: 'custom_build',
          customBuildRequestId: requestId,
        },
      },
      custom_text: {
        submit: {
          message:
            'Your $500 payment is charged immediately. Your saved project brief is sent to DailyClarity after successful payment.',
        },
      },
    })

    const { error: updateError } = await supabase
      .from('custom_build_requests')
      .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
      .eq('id', requestId)

    if (updateError) {
      console.error('[stripe/custom-build] session ID update failed:', updateError)
    }

    if (!session.url) throw new Error('Stripe did not return a checkout URL.')
    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start checkout.'
    console.error('[stripe/custom-build]', message)
    if (requestId) {
      try {
        await supabase
          .from('custom_build_requests')
          .update({ status: 'checkout_failed', updated_at: new Date().toISOString() })
          .eq('id', requestId)
      } catch { /* preserve the original checkout error */ }
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
