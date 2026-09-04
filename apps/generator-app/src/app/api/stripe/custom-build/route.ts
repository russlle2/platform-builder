import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  CUSTOM_BUILD_AMOUNT_CENTS,
  CUSTOM_BUILD_CURRENCY,
  validateCustomBuildInput,
} from '@/lib/custom-build'
import { jsonTooManyRequests, rateLimitByIp } from '@/lib/server-auth'
import { getTrustedSiteOrigin } from '@/lib/site-origin'
import { createStripeClient, stripeIntegrationIdentifier } from '@/lib/stripe-client'
import {
  CUSTOM_BUILD_CHECKOUT_TYPE,
  isDedicatedSupabaseProjectConfigured,
} from '@/lib/stripe-runtime'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function resolveCustomBuildPrice(stripe: Stripe): Promise<string> {
  const configuredPriceId = process.env.STRIPE_PRICE_CUSTOM_BUILD
  if (!configuredPriceId) throw new Error('custom_build_price_not_configured')
  const configuredPrice = await stripe.prices.retrieve(configuredPriceId)
  if (
    configuredPrice.active &&
    configuredPrice.type === 'one_time' &&
    configuredPrice.currency === CUSTOM_BUILD_CURRENCY &&
    configuredPrice.unit_amount === CUSTOM_BUILD_AMOUNT_CENTS
  ) {
    return configuredPrice.id
  }
  throw new Error('custom_build_price_invalid')
}

export async function POST(req: NextRequest) {
  if (!rateLimitByIp(req, 'custom-build-checkout', 5, 10 * 60 * 1000)) {
    return jsonTooManyRequests()
  }

  const customBuildRuntimeReady = Boolean(
    stripeSecretKey &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    (process.env.STRIPE_FULFILLMENT_WORKER_SECRET?.trim().length || 0) >= 32 &&
    process.env.STRIPE_PRICE_CUSTOM_BUILD &&
    supabaseUrl &&
    supabaseServiceKey &&
    process.env.POSTMARK_SERVER_TOKEN &&
    process.env.EMAIL_FROM_ADDRESS &&
    isDedicatedSupabaseProjectConfigured(),
  )
  if (!customBuildRuntimeReady || !stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Custom-build checkout is temporarily unavailable.' },
      { status: 503 },
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

    const stripe = createStripeClient(stripeSecretKey)
    const priceId = await resolveCustomBuildPrice(stripe)
    const origin = getTrustedSiteOrigin(req.url)
    if (!origin) throw new Error('checkout_redirect_not_configured')

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: parsed.data.email,
      client_reference_id: requestId,
      integration_identifier: stripeIntegrationIdentifier('dailyclarity-custom-build', requestId),
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/custom-build?canceled=1`,
      metadata: {
        checkoutType: CUSTOM_BUILD_CHECKOUT_TYPE,
        customBuildRequestId: requestId,
      },
      payment_intent_data: {
        metadata: {
          checkoutType: CUSTOM_BUILD_CHECKOUT_TYPE,
          customBuildRequestId: requestId,
        },
      },
      custom_text: {
        submit: {
          message:
            'Your $500 payment is charged immediately. Your saved project brief is sent to DailyClarity after successful payment.',
        },
      },
    }, { idempotencyKey: `dailyclarity-custom-build-${requestId}` })

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
    return NextResponse.json(
      { error: 'Unable to start custom-build checkout. Please try again.' },
      { status: 500 },
    )
  }
}
