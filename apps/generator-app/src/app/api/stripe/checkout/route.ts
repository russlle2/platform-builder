import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY')
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
})

const priceMap: Record<string, string | undefined> = {
  basic: process.env.STRIPE_PRICE_BASIC,
  growth: process.env.STRIPE_PRICE_GROWTH,
}

export async function POST(req: Request) {
  try {
    const { planKey, slug } = await req.json()
    const priceId = priceMap[planKey]

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid or missing price configuration.' },
        { status: 400 }
      )
    }

    const origin = (await headers()).get('origin') || 'http://localhost:3000'

    const metadata = {
      planKey,
      slug: typeof slug === 'string' ? slug : '',
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      allow_promotion_codes: true,
      metadata,
      subscription_data: {
        metadata,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unable to create checkout session.' },
      { status: 500 }
    )
  }
}
