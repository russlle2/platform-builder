import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeTrialDays } from '@/lib/platform-config'
import { chunkJsonToMetadata } from '@/lib/site-deploy'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'
import { getPlan, normalizePlanKey } from '@/lib/plans'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

/** Resolve the Stripe price ID for a (normalized) plan from its env var. */
function resolvePriceId(planKey: string): string | undefined {
  const plan = getPlan(planKey)
  if (!plan) return undefined
  return process.env[plan.stripePriceEnv]
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Short, collision-resistant suffix for auto-generated slugs. */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}

export async function POST(req: NextRequest) {
  const allowed = rateLimitByIp(req, 'checkout', 10, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

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

    const canonicalPlan = normalizePlanKey(planKey)
    if (!canonicalPlan) {
      return NextResponse.json(
        { error: 'Invalid or unknown plan.' },
        { status: 400 }
      )
    }

    // Validate required profile fields
    const businessName = (customerValues?.BUSINESS_NAME || '').trim()
    const email = (customerValues?.EMAIL || '').trim()
    if (customerValues && typeof customerValues === 'object') {
      if (!businessName) {
        return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
      }
      if (!email) {
        return NextResponse.json({ error: 'Email address is required.' }, { status: 400 })
      }
    }

    const priceId = resolvePriceId(canonicalPlan)
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid or missing price configuration.' },
        { status: 400 }
      )
    }

    // Derive a stable, unique slug. Never fall back to the (shared) template
    // slug — that causes collisions/overwrites across customers. Prefer an
    // explicit slug, otherwise generate one from the business name.
    const templateSlug = typeof template === 'string' ? template : ''
    let resolvedSlug = typeof slug === 'string' ? slugify(slug) : ''
    if (!resolvedSlug || resolvedSlug === slugify(templateSlug)) {
      const base = slugify(businessName) || slugify(templateSlug) || 'site'
      resolvedSlug = `${base}-${randomSuffix()}`
    }

    const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const metadata: Record<string, string> = {
      planKey: canonicalPlan,
      slug: resolvedSlug,
      template: templateSlug,
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
      ...(email ? { customer_email: email } : {}),
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
