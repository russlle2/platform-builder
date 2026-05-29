import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeTrialDays } from '@/lib/platform-config'
import { chunkJsonToMetadata } from '@/lib/site-deploy'

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

    const { planKey, slug, template, niche, colorScheme, fontVariation, structureVariation, customerValues, inlineEdits, imageSwaps, imageOwner } = await req.json()
    const priceId = priceMap[planKey]

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid or missing price configuration.' },
        { status: 400 }
      )
    }

    const origin = (await headers()).get('origin') || 'http://localhost:3000'

    const metadata: Record<string, string> = {
      planKey,
      slug: typeof slug === 'string' ? slug : '',
      template: typeof template === 'string' ? template : '',
      niche: typeof niche === 'string' ? niche : '',
      colorScheme: typeof colorScheme === 'string' ? colorScheme : 'original',
      fontVariation: typeof fontVariation === 'string' ? fontVariation : 'original',
      structureVariation: typeof structureVariation === 'string' ? structureVariation : 'original',
    }

    // Stripe caps each metadata value at 500 chars. A full intake easily
    // exceeds that, so chunk the customer's values + inline edits across
    // numbered keys; the webhook reassembles them. (See lib/site-deploy.)
    if (customerValues && typeof customerValues === 'object') {
      Object.assign(metadata, chunkJsonToMetadata('customerValues', customerValues, 18))
    }
    if (inlineEdits && typeof inlineEdits === 'object') {
      Object.assign(metadata, chunkJsonToMetadata('inlineEdits', inlineEdits, 10))
    }
    if (imageSwaps && typeof imageSwaps === 'object') {
      Object.assign(metadata, chunkJsonToMetadata('imageSwaps', imageSwaps, 12))
    }
    if (typeof imageOwner === 'string' && imageOwner.trim()) {
      metadata.imageOwner = imageOwner.trim().slice(0, 64)
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
