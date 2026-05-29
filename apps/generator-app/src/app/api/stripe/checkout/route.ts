import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeTrialDays } from '@/lib/platform-config'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

const priceMap: Record<string, string | undefined> = {
  basic: process.env.STRIPE_PRICE_BASIC,
  growth: process.env.STRIPE_PRICE_GROWTH,
}

export async function POST(req: Request) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Missing STRIPE_SECRET_KEY' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const { planKey, slug, template, niche, colorScheme, fontVariation, structureVariation, customerValues } = await req.json()
    const priceId = priceMap[planKey]

    if (!priceId) {
      const envName =
        planKey === 'growth' ? 'STRIPE_PRICE_GROWTH' : 'STRIPE_PRICE_BASIC'
      return NextResponse.json(
        {
          error: `Checkout is not configured for this plan. Set ${envName} in Netlify environment variables (Stripe Price ID for the ${planKey} subscription).`,
          code: 'missing_price_id',
          planKey,
        },
        { status: 503 }
      )
    }

    const origin = (await headers()).get('origin') || 'http://localhost:3000'

    // Stripe metadata has a 500-char limit per value, so we store
    // template config as compact JSON. Customer form values are stored
    // separately so the webhook can build the deployed site.
    const metadata: Record<string, string> = {
      planKey,
      slug: typeof slug === 'string' ? slug : '',
      template: typeof template === 'string' ? template : '',
      niche: typeof niche === 'string' ? niche : '',
      colorScheme: typeof colorScheme === 'string' ? colorScheme : 'original',
      fontVariation: typeof fontVariation === 'string' ? fontVariation : 'original',
      structureVariation: typeof structureVariation === 'string' ? structureVariation : 'original',
    }

    // Store customer field values so the webhook can hydrate the template
    if (customerValues && typeof customerValues === 'object') {
      metadata.customerValues = JSON.stringify(customerValues).slice(0, 500)
    }

    const trialDays = getStripeTrialDays()
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata,
    }
    if (trialDays > 0) {
      subscriptionData.trial_period_days = trialDays
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      allow_promotion_codes: true,
      payment_method_collection: 'always',
      metadata,
      subscription_data: subscriptionData,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create checkout session.'
    console.error('[stripe/checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
