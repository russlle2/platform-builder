import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { areSalesPaused } from '@/lib/sales-pause'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getStripeTrialDays } from '@/lib/platform-config'
import { rateLimitByIp, jsonTooManyRequests } from '@/lib/server-auth'
import { getPlan, isManagedPlan, normalizePlanKey } from '@/lib/plans'
import { getTrustedSiteOrigin } from '@/lib/site-origin'
import { sanitizeImageSwapMap } from '@/lib/image-swaps'
import { validateCheckoutImageSession } from '@/lib/checkout-image-session'
import {
  chunkJsonToMetadata,
  sanitizeCustomerValues,
} from '@/lib/site-deploy'
import { getTemplateAtCatalogRevision } from '@/lib/templates/niche-registry'
import { buildCheckoutTemplateState, type PersistedTemplateCustomization } from '@/lib/customer-site-state'
import { createStripeClient, stripeIntegrationIdentifier } from '@/lib/stripe-client'
import { stripeCheckoutExperience } from '@/lib/stripe-checkout-experience'
import { readBoundedJson } from '@/lib/bounded-json'
import {
  TEMPLATE_CHECKOUT_TYPE,
  getTemplateFulfillmentConfigIssues,
  configuredStripeLivemode,
} from '@/lib/stripe-runtime'
import { normalizeSiteSlug, validateSiteSlug } from '@/lib/site-slug'
import { UPLOAD_SESSION_COOKIE, verifyUploadSessionValue } from '@/lib/upload-session'
import { normalizeAccountEmail, omitAccountEmailFields } from '@/lib/account-email'
import { isDefinitiveCheckoutRejection, uncertainCheckoutResponse } from '@/lib/checkout-creation-error'
import { readProfileFields, reviewTemplateProfile } from '@/lib/template-profile-review'
import { CHECKOUT_ATTEMPT_COOKIE, CHECKOUT_ATTEMPT_MAX_AGE, createCheckoutAttempt, verifyCheckoutAttempt, inspectCheckoutAttempt, type ExistingCheckoutIntent } from '@/lib/checkout-resume'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const MAX_CHECKOUT_PAYLOAD_BYTES = 200_000

function rememberAttempt(response: NextResponse, intentId: string): NextResponse {
  const value = createCheckoutAttempt(intentId)
  if (value) response.cookies.set(CHECKOUT_ATTEMPT_COOKIE, value, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: CHECKOUT_ATTEMPT_MAX_AGE,
  })
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

function forgetAttempt(response: NextResponse): NextResponse {
  response.cookies.set(CHECKOUT_ATTEMPT_COOKIE, '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0,
  })
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

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
  if (areSalesPaused()) return NextResponse.json({ error: 'Checkout is temporarily unavailable.', retrySafe: true }, { status: 503 })
  const allowed = rateLimitByIp(req, 'checkout', 10, 10 * 60 * 1000)
  if (!allowed) return jsonTooManyRequests()

  let checkoutIntentId: string | null = null
  let reservedSlug: string | null = null
  let sessionCreationAttempted = false
  let createdSession: Stripe.Checkout.Session | null = null
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
      return NextResponse.json({ error: 'Checkout is temporarily unavailable.', retrySafe: true }, { status: 503 })
    }
    const parsedBody = await readBoundedJson(req, MAX_CHECKOUT_PAYLOAD_BYTES)
    if (!parsedBody.ok) {
      return NextResponse.json(
        {
          error: parsedBody.reason === 'too_large'
            ? 'Checkout details are too large.'
            : 'Checkout details are invalid.',
        },
        { status: parsedBody.reason === 'too_large' ? 413 : 400 },
      )
    }
    const bodyValue = parsedBody.value
    if (!bodyValue || typeof bodyValue !== 'object' || Array.isArray(bodyValue)) {
      return NextResponse.json({ error: 'Checkout details are invalid.' }, { status: 400 })
    }
    const body = bodyValue as Record<string, unknown>
    const { planKey, slug, template, niche, colorScheme, fontVariation, structureVariation, customTheme, customerValues, inlineEdits, imageSwaps, catalogRevision: requestedCatalogRevision } = body

    const canonicalPlan = normalizePlanKey(typeof planKey === 'string' ? planKey : null)
    if (!canonicalPlan) {
      return NextResponse.json(
        { error: 'Invalid or unknown plan.' },
        { status: 400 }
      )
    }
    if (isManagedPlan(canonicalPlan) && !process.env.PLATFORM_OWNER_EMAIL?.trim()) {
      return NextResponse.json({ error: 'Managed-service checkout is temporarily unavailable.', retrySafe: true }, { status: 503 })
    }

    // Validate required profile fields
    if (!customerValues || typeof customerValues !== 'object' || Array.isArray(customerValues)) {
      return NextResponse.json({ error: 'Business profile details are required.' }, { status: 400 })
    }
    // Private account identity is never part of the template payload, even if
    // an older/malformed client accidentally nests it among public fields.
    const safeCustomerValues = omitAccountEmailFields(sanitizeCustomerValues(customerValues))
    const businessName = String(safeCustomerValues.BUSINESS_NAME || '').trim()
    const publicEmail = String(safeCustomerValues.EMAIL || '').trim().toLowerCase()
    if (!businessName || businessName.length > 200) {
      return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail) || publicEmail.length > 320) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
    }
    // Only clients predating this field may use the public contact address as
    // their account recipient. An explicit invalid value must never fall back.
    const accountEmail = normalizeAccountEmail(
      Object.prototype.hasOwnProperty.call(body, 'accountEmail') ? body.accountEmail : publicEmail,
    )
    if (!accountEmail) {
      return NextResponse.json({ error: 'A valid account email address is required.' }, { status: 400 })
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
    const attemptCookie = req.cookies.get(CHECKOUT_ATTEMPT_COOKIE)?.value
    const priorIntentId = verifyCheckoutAttempt(attemptCookie)
    if ((attemptCookie && !priorIntentId) || (body.resumePreviousCheckout === true && !priorIntentId)) {
      return forgetAttempt(NextResponse.json({
        error: 'Your earlier checkout could not be identified. Check your account before starting again.',
        code: 'checkout_resume_unavailable', recoveryUrl: '/dashboard',
      }, { status: 409 }))
    }
    const profileFields = readProfileFields(selectedTemplate.fields)
    if (!profileFields) return NextResponse.json({
      error: 'This design’s website details are temporarily unavailable. Reload the preview before checkout.',
      code: 'template_profile_unavailable', recoveryUrl: '/preview-your-business', retrySafe: true,
    }, { status: 503 })
    // A new purchase must be complete before any Stripe request. A returning
    // attempt is reconciled first so already-completed purchases remain usable.
    if (!priorIntentId) {
      const issues = reviewTemplateProfile(profileFields, safeCustomerValues)
      if (issues.length) return NextResponse.json({
        error: 'Complete the details used by this design in your preview before checkout.',
        code: 'template_profile_incomplete', fields: issues,
        recoveryUrl: '/preview-your-business',
      }, { status: 409 })
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
      return NextResponse.json({ error: 'Checkout redirect configuration is missing.', retrySafe: true }, { status: 503 })
    }

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
    if (priorIntentId) {
      // Reads only until Stripe independently confirms terminal expiration.
      // Unknown state must never become permission to start another purchase.
      try {
        const { data, error } = await supabase.from('checkout_intents')
          .select('id,slug,plan,email,payload,status,stripe_session_id')
          .eq('id', priorIntentId).maybeSingle()
        const prior = data as ExistingCheckoutIntent | null
        if (error || !prior || prior.id !== priorIntentId || !prior.stripe_session_id) {
          return NextResponse.json(uncertainCheckoutResponse(priorIntentId), { status: 409 })
        }
        const previousSession = await stripe.checkout.sessions.retrieve(prior.stripe_session_id)
        const requested = body.resumePreviousCheckout === true
          ? { plan: prior.plan, accountEmail: prior.email, explicitSlug: prior.slug, payload: prior.payload }
          : { plan: canonicalPlan, accountEmail, explicitSlug: explicitSlug && normalizeSiteSlug(slug as string) !== normalizeSiteSlug(templateSlug) ? normalizeSiteSlug(slug as string) : null, payload: checkoutPayload }
        const state = inspectCheckoutAttempt(prior, previousSession, requested, configuredStripeLivemode(stripeSecretKey))
        if (state === 'complete') {
          return forgetAttempt(NextResponse.json({ url: `${origin}/success?session_id=${encodeURIComponent(previousSession.id)}` }))
        }
        if (state === 'open') {
          const saved = prior.payload as Partial<PersistedTemplateCustomization> | null
          if (!saved || typeof saved.template !== 'string' || typeof saved.niche !== 'string') {
            return NextResponse.json(uncertainCheckoutResponse(priorIntentId), { status: 409 })
          }
          const priorTemplate = await getTemplateAtCatalogRevision(saved.niche, saved.template, saved.catalogRevision)
          const priorFields = priorTemplate && readProfileFields(priorTemplate.fields)
          if (!priorFields) return NextResponse.json(uncertainCheckoutResponse(priorIntentId), { status: 409 })
          const issues = reviewTemplateProfile(priorFields, omitAccountEmailFields(sanitizeCustomerValues(saved.customerValues)))
          if (issues.length) return NextResponse.json({
            code: 'checkout_previous_profile_incomplete',
            error: 'Your earlier checkout is missing details used by its design. Contact support to close that checkout before starting again.',
            recoveryUrl: '/contact',
          }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } })
          return NextResponse.json({ url: previousSession.url }, {
            headers: { 'Cache-Control': 'private, no-store' },
          })
        }
        if (state === 'changed') return NextResponse.json({
          code: 'checkout_draft_changed',
          error: 'Your earlier checkout is still open with different details. Resume that checkout, or contact support before starting another.',
          previousBusinessName: String((prior.payload as { customerValues?: { BUSINESS_NAME?: unknown } })?.customerValues?.BUSINESS_NAME || '').slice(0, 200),
          previousPlan: getPlan(prior.plan)?.name || 'Previous plan',
          recoveryUrl: '/contact',
        }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } })
        if (state === 'expired') {
          const { error: expiryError } = await supabase.from('checkout_intents').update({
            status: 'checkout_failed', last_error: 'checkout_expired', updated_at: new Date().toISOString(),
          }).eq('id', prior.id).in('status', ['pending', 'session_created'])
          if (expiryError) throw new Error('resume_expiry_update')
          const { error: releaseError } = await supabase.from('site_slugs').delete()
            .eq('slug', prior.slug).eq('reserved_for', prior.id).eq('status', 'checkout_pending')
          if (releaseError) throw new Error('resume_expiry_release')
          return forgetAttempt(NextResponse.json({
            error: 'Your earlier checkout expired without a completed purchase. Choose your plan again to start a fresh checkout.',
            code: 'checkout_expired', retrySafe: true,
          }, { status: 409 }))
        }
        return NextResponse.json(uncertainCheckoutResponse(priorIntentId), { status: 409 })
      } catch {
        return NextResponse.json(uncertainCheckoutResponse(priorIntentId), { status: 409 })
      }
    }
    checkoutIntentId = randomUUID()
    if (!createCheckoutAttempt(checkoutIntentId)) {
      return NextResponse.json({ error: 'Checkout is temporarily unavailable.', retrySafe: true }, { status: 503 })
    }
    const { error: intentError } = await supabase.from('checkout_intents').insert({
      id: checkoutIntentId,
      slug: resolvedSlug,
      plan: canonicalPlan,
      email: accountEmail,
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

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ...stripeCheckoutExperience(),
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      allow_promotion_codes: true,
      payment_method_collection: 'always',
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      customer_email: accountEmail,
      client_reference_id: checkoutIntentId,
      integration_identifier: stripeIntegrationIdentifier('dailyclarity-template', checkoutIntentId),
      metadata,
      subscription_data: subscriptionData,
    }
    sessionCreationAttempted = true
    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey: `dailyclarity-checkout-${checkoutIntentId}`,
    })
    createdSession = session

    if (!session.url) throw new Error('stripe_checkout_missing_url')
    const { error: sessionUpdateError } = await supabase.from('checkout_intents').update({
      status: 'session_created',
      stripe_session_id: session.id,
      updated_at: new Date().toISOString(),
    }).eq('id', checkoutIntentId).in('status', ['pending', 'session_created'])
    if (sessionUpdateError) {
      console.error('[stripe/checkout] intent session update failed:', sessionUpdateError)
    }

    return rememberAttempt(NextResponse.json({ url: session.url }), checkoutIntentId)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create checkout session.'
    console.error('[stripe/checkout]', message)
    if (createdSession || (sessionCreationAttempted && !isDefinitiveCheckoutRejection(error))) {
      // Never release the reservation or manufacture a failure after Stripe
      // might have created a payable session. Signed events can still resolve
      // this durable intent; status filters preserve concurrent fulfillment.
      if (supabase && checkoutIntentId) {
        try {
          const { error: recordError } = await supabase.from('checkout_intents').update({
            ...(createdSession ? { stripe_session_id: createdSession.id, status: 'session_created' } : {}),
            last_error: 'checkout_creation_uncertain',
            updated_at: new Date().toISOString(),
          }).eq('id', checkoutIntentId).in('status', ['pending', 'session_created'])
          if (recordError) console.error('[stripe/checkout] uncertain checkout recording failed')
        } catch {
          // A database outage must not turn uncertainty into permission to buy again.
          console.error('[stripe/checkout] uncertain checkout recording failed')
        }
      }
      const response = NextResponse.json(uncertainCheckoutResponse(checkoutIntentId), { status: 409 })
      return checkoutIntentId ? rememberAttempt(response, checkoutIntentId) : response
    }
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
      { error: 'Unable to start checkout. Please try again.', retrySafe: true },
      { status: 500 },
    )
  }
}
