import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getStripeTrialDays } from '@/lib/platform-config'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'
import { getPlan, normalizePlanKey } from '@/lib/plans'
import { getTrustedSiteOrigin } from '@/lib/site-origin'
import { sanitizeImageSwapMap } from '@/lib/image-swaps'
import { validateCheckoutImageSession } from '@/lib/checkout-image-session'
import {
  chunkJsonToMetadata,
  sanitizeCustomerValues,
} from '@/lib/site-deploy'
import { getTemplateAtCatalogRevision } from '@/lib/templates/niche-registry'
import { buildCheckoutTemplateState } from '@/lib/customer-site-state'
import { createStripeClient } from '@/lib/stripe-client'
import {
  TEMPLATE_CHECKOUT_TYPE,
  getTemplateFulfillmentConfigIssues,
} from '@/lib/stripe-runtime'
import { normalizeSiteSlug, validateSiteSlug } from '@/lib/site-slug'
import { UPLOAD_SESSION_COOKIE, verifyUploadSessionValue } from '@/lib/upload-session'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const MAX_CHECKOUT_PAYLOAD_BYTES = 200_000

/** Resolve and verify the recurring Stripe price before accepting checkout. */
async function resolvePriceId(stripe: Stripe, planKey: string): Promise<string | undefined> {
  const plan = getPlan(planKey)
  if (!plan) return undefined
  const priceId = process.env[plan.stripePriceEnv]
  if (!priceId) return undefined
  const price = await stripe.prices.retrieve(priceId)
  if (
    !price.active ||
    price.type !== 'recurring' ||
    price.recurring?.interval !== 'month' ||
    price.recurring.interval_count !== 1 ||
    price.unit_amount !== plan.price * 100 ||
    price.currency !== 'usd'
  ) {
    throw new Error(`stripe_price_mismatch:${plan.key}`)
  }
  return price.id
}

/** Short, collision-resistant suffix for auto-generated slugs. */
function randomSuffix(): string {
  return randomUUID().replace(/-/g, '').slice(0, 6)
}

export async function POST(req: NextRequest) {
  const allowed = rateLimitByIp(req, 'checkout', 10, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

  let checkoutIntentId: string | null = null
  let reservedSlug: string | null = null
  const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

  try {
    const runtimeConfigIssues = getTemplateFulfillmentConfigIssues()
    if (runtimeConfigIssues.length > 0 || !stripeSecretKey || !supabase) {
      console.error(
        '[stripe/checkout] unavailable; fulfillment configuration issues:',
        runtimeConfigIssues.join(', '),
      )
      return NextResponse.json({ error: 'Checkout is temporarily unavailable.' }, { status: 503 })
    }
    const body = await req.json()
    if (!body || typeof body !== 'object' || JSON.stringify(body).length > MAX_CHECKOUT_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Checkout details are invalid or too large.' }, { status: 413 })
    }
    const { planKey, slug, template, niche, colorScheme, fontVariation, structureVariation, customTheme, customerValues, inlineEdits, imageSwaps, catalogRevision: requestedCatalogRevision } = body

    const canonicalPlan = normalizePlanKey(planKey)
    if (!canonicalPlan) {
      return NextResponse.json(
        { error: 'Invalid or unknown plan.' },
        { status: 400 }
      )
    }

    // Validate required profile fields
    if (!customerValues || typeof customerValues !== 'object' || Array.isArray(customerValues)) {
      return NextResponse.json({ error: 'Business profile details are required.' }, { status: 400 })
    }
    const safeCustomerValues = sanitizeCustomerValues(customerValues)
    const businessName = String(safeCustomerValues.BUSINESS_NAME || '').trim()
    const email = String(safeCustomerValues.EMAIL || '').trim().toLowerCase()
    if (!businessName || businessName.length > 200) {
      return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
    }
    const templateSlug = typeof template === 'string' ? template.trim() : ''
    const nicheSlug = typeof niche === 'string' ? niche.trim() : ''
    if (!templateSlug || !nicheSlug) {
      return NextResponse.json({ error: 'Choose a valid template before checkout.' }, { status: 400 })
    }
    let selectedTemplate
    try {
      selectedTemplate = await getTemplateAtCatalogRevision(
        nicheSlug,
        templateSlug,
        requestedCatalogRevision,
      )
    } catch (error) {
      console.warn('[stripe/checkout] requested catalogue revision is unavailable:', error)
      return NextResponse.json({
        error: 'This preview revision is no longer available. Reload the preview before checkout.',
        code: 'catalog_revision_unavailable',
        recoveryUrl: '/preview-your-business',
      }, { status: 409 })
    }
    if (!selectedTemplate) {
      return requestedCatalogRevision
        ? NextResponse.json({
            error: 'This preview revision is no longer available. Reload the preview before checkout.',
            code: 'catalog_revision_unavailable',
            recoveryUrl: '/preview-your-business',
          }, { status: 409 })
        : NextResponse.json(
            { error: 'That template is not currently available for purchase.' },
            { status: 400 },
          )
    }
    const safeImageSwaps = sanitizeImageSwapMap(imageSwaps)
    const cookieImageOwner = verifyUploadSessionValue(
      req.cookies.get(UPLOAD_SESSION_COOKIE)?.value,
    )
    const imageSession = validateCheckoutImageSession(safeImageSwaps, cookieImageOwner)
    if (!imageSession.ok) {
      return NextResponse.json(
        {
          error: imageSession.error,
          code: imageSession.code,
          recoveryUrl: '/preview-your-business',
        },
        { status: 409 },
      )
    }

    // No Stripe API request is made until every draft image is bound to the
    // active signed upload session. This prevents accepting payment for an
    // order that fulfillment already knows it cannot migrate.
    const stripe = createStripeClient(stripeSecretKey)
    const priceId = await resolvePriceId(stripe, canonicalPlan)
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid or missing price configuration.' },
        { status: 400 }
      )
    }

    // Derive a stable, unique slug. Never fall back to the (shared) template
    // slug — that causes collisions/overwrites across customers. Prefer an
    // explicit slug, otherwise generate one from the business name.
    const explicitSlug = typeof slug === 'string' && slug.trim().length > 0
    let resolvedSlug = explicitSlug ? normalizeSiteSlug(slug) : ''
    if (explicitSlug) {
      const slugError = validateSiteSlug(resolvedSlug)
      if (slugError) return NextResponse.json({ error: slugError }, { status: 400 })
    }
    if (!resolvedSlug || resolvedSlug === normalizeSiteSlug(templateSlug)) {
      let base = (normalizeSiteSlug(businessName) || normalizeSiteSlug(templateSlug) || 'site').slice(0, 23)
      // `draft-*` is the private upload-capability namespace. A business name
      // may legitimately begin with "Draft", so move only generated slugs out
      // of that namespace while continuing to reject explicit reserved slugs.
      if (base === 'draft' || base.startsWith('draft-')) {
        base = `site-${base}`.slice(0, 23)
      }
      resolvedSlug = `${base}-${randomSuffix()}`
    }
    const generatedSlugError = validateSiteSlug(resolvedSlug)
    if (generatedSlugError) {
      return NextResponse.json({ error: generatedSlugError }, { status: 400 })
    }

    const origin = getTrustedSiteOrigin(req.url)
    if (!origin) {
      return NextResponse.json({ error: 'Checkout redirect configuration is missing.' }, { status: 503 })
    }

    checkoutIntentId = randomUUID()
    // The optional preview pin has already been resolved through a hash-checked
    // server catalogue. Snapshot only that verified server entry; never copy
    // client-provided design/preset identities into durable checkout state.
    const checkoutPayload = buildCheckoutTemplateState({
      template: templateSlug,
      niche: nicheSlug,
      templateRevision: selectedTemplate,
      colorScheme,
      fontVariation,
      structureVariation,
      customTheme,
      customerValues: safeCustomerValues,
      inlineEdits,
      imageSwaps: safeImageSwaps,
      imageOwner: imageSession.imageOwner,
    })
    const catalogRevision = checkoutPayload.catalogRevision
    const { error: intentError } = await supabase.from('checkout_intents').insert({
      id: checkoutIntentId,
      slug: resolvedSlug,
      plan: canonicalPlan,
      email,
      payload: checkoutPayload,
      status: 'pending',
    })
    if (intentError) throw new Error(`checkout_intent_insert:${intentError.code || 'unknown'}`)

    // Stripe requires expires_at to be at least 30 minutes in the future. Use
    // a full hour so request/network latency cannot push it below that floor.
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    const reservation = {
      slug: resolvedSlug,
      status: 'checkout_pending',
      reserved_for: checkoutIntentId,
      reservation_expires_at: expiresAt.toISOString(),
    }
    const { error: reserveError } = await supabase.from('site_slugs').insert(reservation)
    if (reserveError) {
      if (reserveError.code !== '23505') {
        throw new Error(`slug_reservation:${reserveError.code || 'unknown'}`)
      }
      const { data: reclaimed, error: reclaimError } = await supabase
        .from('site_slugs')
        .update(reservation)
        .eq('slug', resolvedSlug)
        .eq('status', 'checkout_pending')
        .lt('reservation_expires_at', new Date().toISOString())
        .select('slug')
        .maybeSingle()
      if (reclaimError || !reclaimed) {
        await supabase.from('checkout_intents').update({
          status: 'checkout_failed',
          last_error: 'slug_unavailable',
          updated_at: new Date().toISOString(),
        }).eq('id', checkoutIntentId)
        return NextResponse.json(
          { error: 'That site address was just reserved. Please choose another.' },
          { status: 409 },
        )
      }
    }
    reservedSlug = resolvedSlug

    const metadata: Record<string, string> = {
      checkoutType: TEMPLATE_CHECKOUT_TYPE,
      checkoutIntentId,
      planKey: canonicalPlan,
      slug: resolvedSlug,
      ...(catalogRevision ? chunkJsonToMetadata('catalogRevision', catalogRevision, 2) : {}),
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
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      ...(email ? { customer_email: email } : {}),
      client_reference_id: checkoutIntentId,
      metadata,
      subscription_data: subscriptionData,
    }, { idempotencyKey: `dailyclarity-checkout-${checkoutIntentId}` })

    if (!session.url) throw new Error('stripe_checkout_missing_url')
    const { error: sessionUpdateError } = await supabase.from('checkout_intents').update({
      status: 'session_created',
      stripe_session_id: session.id,
      updated_at: new Date().toISOString(),
    }).eq('id', checkoutIntentId)
    if (sessionUpdateError) {
      console.error('[stripe/checkout] intent session update failed:', sessionUpdateError)
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create checkout session.'
    console.error('[stripe/checkout]', message)
    if (supabase && checkoutIntentId) {
      await supabase.from('checkout_intents').update({
        status: 'checkout_failed',
        last_error: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq('id', checkoutIntentId)
      if (reservedSlug) {
        await supabase.from('site_slugs').delete()
          .eq('slug', reservedSlug)
          .eq('reserved_for', checkoutIntentId)
          .eq('status', 'checkout_pending')
      }
    }
    return NextResponse.json(
      { error: 'Unable to start checkout. Please try again.' },
      { status: 500 },
    )
  }
}
