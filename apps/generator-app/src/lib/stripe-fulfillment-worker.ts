import { randomUUID } from 'node:crypto'
import Stripe from 'stripe'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  sendOrderConfirmationEmail,
  sendWebsiteLiveEmail,
  sendManualServiceAlert,
  sendCustomBuildCustomerConfirmation,
  sendCustomBuildOwnerAlert,
} from '@/lib/email'
import { createPortalAccessCredentials } from '@/lib/portal-auth'
import { provisionSite, deploySiteFiles, verifyPublishedSite } from '@/lib/netlify'
import {
  buildDeployFiles,
  unchunkJsonFromMetadata,
  type InlineTextEdit,
} from '@/lib/site-deploy'
import {
  migrateImagesToSiteSlug,
  rewriteImageSwapUrls,
} from '@/lib/customer-images'
import { sanitizeImageSwapMap, type ImageSwap } from '@/lib/image-swaps'
import { validateCheckoutImageSession } from '@/lib/checkout-image-session'
import { isDraftImageOwner } from '@/lib/image-owner'
import { sanitizeCustomTheme, type CustomTheme } from '@/lib/custom-theme'
import { isManagedPlan, normalizePlanKey } from '@/lib/plans'
import { createStripeClient } from '@/lib/stripe-client'
import {
  CUSTOM_BUILD_CHECKOUT_TYPE,
  TEMPLATE_CHECKOUT_TYPE,
  getInvoiceSubscriptionId,
  getSupportedCheckoutType,
  isCheckoutPaymentReady,
} from '@/lib/stripe-runtime'
import {
  STRIPE_FULFILLMENT_LEASE_MS,
  STRIPE_FULFILLMENT_MAX_ATTEMPTS,
  fulfillmentErrorMessage,
  isStripeEventId,
  stripeEventBusinessKey,
  stripeFulfillmentRetryDelayMs,
} from '@/lib/stripe-fulfillment-queue'
import {
  dispatchQueuedStripeEvent,
  markStripeEventDispatched,
} from '@/lib/stripe-fulfillment-dispatch'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function reserveSlug(supabase: SupabaseClient, slug: string, reservationId: string) {
  const normalized = normalizeSlug(slug)
  if (!normalized) throw new Error('A valid slug is required for fulfillment.')

  const { data: existing, error: lookupError } = await supabase
    .from('site_slugs')
    .select('slug, status, reserved_for')
    .eq('slug', normalized)
    .maybeSingle()
  if (lookupError) throw new Error(`slug_lookup:${lookupError.message}`)

  if (!existing) {
    const { error } = await supabase.from('site_slugs').insert({
      slug: normalized,
      status: 'reserved',
      reserved_for: reservationId,
      reservation_expires_at: null,
    })
    if (error) throw new Error(`slug_reservation:${error.message}`)
    return
  }

  if (existing.reserved_for !== reservationId) {
    throw new Error(`Slug "${normalized}" belongs to another checkout.`)
  }
  const { error } = await supabase.from('site_slugs').update({
    status: 'reserved',
    reservation_expires_at: null,
  }).eq('slug', normalized).eq('reserved_for', reservationId)
  if (error) throw new Error(`slug_reservation_update:${error.message}`)
}

interface CheckoutIntentPayload {
  template?: string
  niche?: string
  colorScheme?: string
  fontVariation?: string
  structureVariation?: string
  customTheme?: CustomTheme | null
  customerValues?: Record<string, string>
  inlineEdits?: Record<string, InlineTextEdit[]>
  imageSwaps?: Record<string, ImageSwap[]>
  imageOwner?: string
}

async function handleCustomBuildCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
) {
  const requestId = session.metadata?.customBuildRequestId
  if (!requestId) {
    throw new Error(`Custom-build checkout ${session.id} is missing its request ID.`)
  }

  const rawPaymentIntent = session.payment_intent
  const paymentIntentId =
    typeof rawPaymentIntent === 'string'
      ? rawPaymentIntent
      : (rawPaymentIntent as { id?: string } | null)?.id ?? null

  if (session.payment_status !== 'paid') {
    const { error } = await supabase
      .from('custom_build_requests')
      .update({
        status: 'payment_pending',
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
    if (error) throw new Error(`custom_build_payment_pending:${error.message}`)
    return
  }

  const paidAt = new Date().toISOString()
  const { data: request, error } = await supabase
    .from('custom_build_requests')
    .update({
      status: 'paid',
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: paidAt,
      updated_at: paidAt,
    })
    .eq('id', requestId)
    .select('*')
    .single()

  if (error || !request) {
    throw new Error(`custom_build_update:${error?.message || 'not_found'}`)
  }

  const customerEmail = request.email || session.customer_details?.email || ''

  if (customerEmail && !request.customer_notified_at) {
    await sendCustomBuildCustomerConfirmation({
      to: customerEmail,
      businessName: request.business_name,
      requestId,
    })
    const { error: notificationError } = await supabase
      .from('custom_build_requests')
      .update({ customer_notified_at: new Date().toISOString() })
      .eq('id', requestId)
    if (notificationError) {
      throw new Error(`custom_build_customer_notification:${notificationError.message}`)
    }
  }

  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL || process.env.EMAIL_FROM_ADDRESS
  if (ownerEmail && !request.owner_notified_at) {
    await sendCustomBuildOwnerAlert({
      ownerEmail,
      requestId,
      businessName: request.business_name,
      contactName: request.contact_name,
      customerEmail,
      phone: request.phone,
      siteVision: request.site_vision,
      requiredFunctionality: request.required_functionality,
      inspirationLinks: request.inspiration_links,
      existingWebsite: request.existing_website,
      stripeSessionId: session.id,
    })
    const { error: notificationError } = await supabase
      .from('custom_build_requests')
      .update({ owner_notified_at: new Date().toISOString() })
      .eq('id', requestId)
    if (notificationError) {
      throw new Error(`custom_build_owner_notification:${notificationError.message}`)
    }
  }
}

/**
 * Durable worker fulfillment for a completed checkout: reserve slug, provision + deploy the
 * site, persist the portal record, queue the manual premium service for the
 * Security + Ads tier, and send transactional emails. Each major step is
 * Failure state is persisted for operator visibility and then surfaced so
 * Stripe retries the verified event. Retry-safe identifiers prevent duplicate
 * sites, orders, and manual-service tasks.
 */
async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
) {
  const meta = session.metadata || {}
  const slug = meta.slug
  const checkoutIntentId = meta.checkoutIntentId || ''
  let templateSlug: string | undefined = meta.template
  let niche: string | undefined = meta.niche
  let colorScheme = meta.colorScheme || 'original'
  let fontVariation = meta.fontVariation || 'original'
  let structureVariation = meta.structureVariation || 'original'
  let customTheme: CustomTheme | null = null
  let planKey = normalizePlanKey(meta.planKey) || 'basic'

  // Normalize stripe_customer_id — Stripe types it as string | Customer | DeletedCustomer | null
  const rawCustomer = session.customer
  const stripeCustomerId =
    typeof rawCustomer === 'string'
      ? rawCustomer
      : (rawCustomer as { id?: string } | null)?.id ?? null
  const rawSubscription = session.subscription
  const stripeSubscriptionId =
    typeof rawSubscription === 'string'
      ? rawSubscription
      : (rawSubscription as { id?: string } | null)?.id ?? null

  const partialFailures: string[] = []

  // Reassemble chunked customer values + inline edits from metadata.
  let customerValues = unchunkJsonFromMetadata<Record<string, string>>('customerValues', meta, {})
  let inlineEdits = unchunkJsonFromMetadata<Record<string, InlineTextEdit[]>>('inlineEdits', meta, {})
  let imageSwaps = sanitizeImageSwapMap(
    unchunkJsonFromMetadata<Record<string, ImageSwap[]>>('imageSwaps', meta, {}),
  )
  let imageOwner = meta.imageOwner || ''
  let intentEmail = ''

  if (checkoutIntentId) {
    const { data: intent, error: intentError } = await supabase
      .from('checkout_intents')
      .select('id, slug, plan, email, payload, stripe_session_id')
      .eq('id', checkoutIntentId)
      .maybeSingle()
    if (intentError || !intent) {
      throw new Error(`checkout_intent_load:${intentError?.message || 'not_found'}`)
    }
    if (intent.slug !== slug) throw new Error('Checkout intent slug mismatch.')
    if (intent.stripe_session_id && intent.stripe_session_id !== session.id) {
      throw new Error('Checkout intent session mismatch.')
    }
    const payload = (intent.payload || {}) as CheckoutIntentPayload
    templateSlug = payload.template
    niche = payload.niche
    colorScheme = payload.colorScheme || 'original'
    fontVariation = payload.fontVariation || 'original'
    structureVariation = payload.structureVariation || 'original'
    customTheme = sanitizeCustomTheme(payload.customTheme)
    customerValues = payload.customerValues || {}
    inlineEdits = payload.inlineEdits || {}
    imageSwaps = sanitizeImageSwapMap(payload.imageSwaps)
    imageOwner = payload.imageOwner || ''
    intentEmail = intent.email || ''
    planKey = normalizePlanKey(intent.plan) || planKey

    if (!intent.stripe_session_id) {
      const { error } = await supabase.from('checkout_intents').update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      }).eq('id', checkoutIntentId)
      if (error) throw new Error(`checkout_intent_session_update:${error.message}`)
    }
  }

  const customerEmail = (customerValues.EMAIL || intentEmail || session.customer_details?.email || '')
    .trim()
    .toLowerCase()
  const businessName = customerValues.BUSINESS_NAME || slug || 'your business'

  if (!slug) {
    console.error('[webhook] checkout.session.completed missing slug; cannot provision', session.id)
    throw new Error('Checkout session is missing a slug.')
  }

  const normalizedSlug = normalizeSlug(slug)

  // ── Step 1: Reserve slug ──────────────────────────────────────────────────
  await reserveSlug(supabase, slug, checkoutIntentId || session.id)

  const portalCredentials = createPortalAccessCredentials(session.id)
  if (!portalCredentials) throw new Error('Portal token signing is not configured.')
  const portalAccessToken = portalCredentials.token

  // ── Step 2: Image migration ───────────────────────────────────────────────
  const imageSession = validateCheckoutImageSession(
    imageSwaps,
    isDraftImageOwner(imageOwner) ? imageOwner : null,
  )
  if (!imageSession.ok) {
    throw new Error(`image_migration:${imageSession.code}:${imageSession.error}`)
  }
  const { draftImageUrls } = imageSession
  if (draftImageUrls.length > 0 && normalizedSlug) {
    const verifiedDraftOwner = imageSession.imageOwner
    try {
      const migratedImageCount = await migrateImagesToSiteSlug(
        verifiedDraftOwner,
        normalizedSlug,
        draftImageUrls,
      )
      if (migratedImageCount === 0) {
        throw new Error('Referenced draft images were not found in durable storage.')
      }
      imageSwaps = rewriteImageSwapUrls(imageSwaps, verifiedDraftOwner, normalizedSlug)
    } catch (migrateErr) {
      console.error('[webhook] image migration failed:', migrateErr)
      const message = migrateErr instanceof Error ? migrateErr.message : 'Image migration failed'
      throw new Error(`image_migration:${message}`)
    }
  }

  // ── Step 3: Netlify provisioning ──────────────────────────────────────────
  const { data: priorPortal, error: priorPortalError } = await supabase
    .from('portal_sites')
    .select('data')
    .eq('slug', normalizedSlug)
    .maybeSingle()
  if (priorPortalError) throw new Error(`portal_lookup:${priorPortalError.message}`)
  const priorData = (priorPortal?.data || {}) as Record<string, unknown>
  const canReusePriorSite =
    priorData.checkout_intent_id === checkoutIntentId ||
    priorData.stripe_session_id === session.id
  const platformDomain = process.env.PLATFORM_DOMAIN?.trim().toLowerCase()
  const brandedSiteUrl = platformDomain ? `https://${normalizedSlug}.${platformDomain}` : undefined
  let netlifySiteId = canReusePriorSite && typeof priorData.netlify_site_id === 'string'
    ? priorData.netlify_site_id
    : undefined
  let netlifySiteUrl = canReusePriorSite
    ? (brandedSiteUrl || (typeof priorData.site_url === 'string' ? priorData.site_url : undefined))
    : undefined
  let provisioningError: string | undefined
  let provisioningSucceeded = false

  if (process.env.NETLIFY_ACCESS_TOKEN) {
    try {
      if (!netlifySiteId) {
        const site = await provisionSite(normalizedSlug)
        netlifySiteId = site.siteId
        netlifySiteUrl = site.siteUrl
        // Persist the external resource immediately. If the process is
        // interrupted before deploy completes, the Stripe retry reuses this
        // site instead of orphaning it and creating another one.
        const { error: checkpointError } = await supabase.from('portal_sites').upsert({
          slug: normalizedSlug,
          owner_email: customerEmail || null,
          status: 'provisioning',
          portal_token_hash: portalCredentials.hash,
          data: {
            ...priorData,
            netlify_site_id: netlifySiteId,
            site_url: netlifySiteUrl,
            stripe_session_id: session.id,
            checkout_intent_id: checkoutIntentId || null,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'slug' })
        if (checkpointError) {
          throw new Error(`provisioning_checkpoint:${checkpointError.message}`)
        }
      }
      const selectedTemplate = templateSlug?.trim()
      const selectedNiche = niche?.trim()
      if (!selectedTemplate || !selectedNiche) throw new Error('Template selection is missing.')
      if (!netlifySiteUrl) throw new Error('Provisioned site URL is missing.')
      const deployFiles = await buildDeployFiles({
        niche: selectedNiche,
        templateSlug: selectedTemplate,
        customerValues,
        colorScheme,
        fontVariation,
        structureVariation,
        customTheme,
        inlineEdits,
        imageSwaps,
        slug,
        siteUrl: netlifySiteUrl,
      })
      if (!deployFiles || Object.keys(deployFiles).length === 0) {
        throw new Error('Template build produced no deployable files.')
      }
      const deploy = await deploySiteFiles(netlifySiteId, deployFiles)
      await verifyPublishedSite(netlifySiteUrl, { cacheKey: deploy.deployId })
      provisioningSucceeded = true

      const { data: updatedSlug, error: slugUpdateError } = await supabase
        .from('site_slugs')
        .update({ status: 'provisioned', netlify_site_id: netlifySiteId, site_url: netlifySiteUrl })
        .eq('slug', normalizedSlug)
        .eq('reserved_for', checkoutIntentId || session.id)
        .select('slug')
        .maybeSingle()
      if (slugUpdateError || !updatedSlug) {
        throw new Error(`site_slugs_update:${slugUpdateError?.message || 'reservation_lost'}`)
      }
    } catch (err) {
      provisioningError = err instanceof Error ? err.message : 'Site provisioning failed'
      console.error('[webhook] site provisioning failed:', err)
      partialFailures.push(`provisioning: ${provisioningError}`)
    }
  } else {
    provisioningError = 'Netlify is not configured.'
    partialFailures.push('provisioning: Netlify is not configured.')
  }

  // ── Step 4: Persist portal record ────────────────────────────────────────
  // Status is only "active" when the site actually deployed; otherwise it is
  // pending (Netlify unconfigured) or failed.
  const status = provisioningError
    ? 'provisioning_failed'
    : provisioningSucceeded
      ? 'active'
      : process.env.NETLIFY_ACCESS_TOKEN
        ? 'provisioning_failed'
        : 'pending'

  const portalData: Record<string, unknown> = {
    ...priorData,
    niche,
    template: templateSlug,
    colorScheme,
    fontVariation,
    structureVariation,
    customTheme,
    customerValues,
    inlineEdits,
    imageSwaps,
    imageOwner: normalizedSlug || imageOwner,
    email: customerEmail,
    netlify_site_id: netlifySiteId,
    site_url: netlifySiteUrl,
    plan: planKey,
    managed_service: isManagedPlan(planKey),
    provisioning_error: provisioningError,
    provisioning_succeeded: provisioningSucceeded,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_session_id: session.id,
    checkout_intent_id: checkoutIntentId || null,
    billing_status: session.payment_status === 'paid' ? 'paid' : 'trial_or_pending',
    partial_failures: partialFailures,
  }
  const { error: portalUpsertError } = await supabase
    .from('portal_sites')
    .upsert(
      {
        slug: normalizedSlug,
        owner_email: customerEmail || null,
        status,
        portal_token_hash: portalCredentials.hash,
        data: portalData,
      },
      { onConflict: 'slug' },
    )
  if (portalUpsertError) throw new Error(`portal_upsert:${portalUpsertError.message}`)

  const { error: orderError } = await supabase.from('orders').upsert({
    slug: normalizedSlug,
    stripe_session_id: session.id,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    email: customerEmail || null,
    plan: planKey,
    amount_cents: session.amount_total,
    currency: session.currency,
    status: provisioningSucceeded
      ? (session.payment_status === 'paid' ? 'paid' : 'trialing')
      : 'fulfillment_failed',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_session_id' })
  if (orderError) throw new Error(`order_upsert:${orderError.message}`)

  if (checkoutIntentId) {
    const { error: intentUpdateError } = await supabase.from('checkout_intents').update({
      status: provisioningSucceeded ? 'completed' : 'fulfillment_failed',
      last_error: provisioningError || null,
      updated_at: new Date().toISOString(),
    }).eq('id', checkoutIntentId)
    if (intentUpdateError) throw new Error(`checkout_intent_update:${intentUpdateError.message}`)
  }

  // Persist failure state for operator visibility, then fail the webhook so
  // Stripe retries. A retry reuses the already-created Netlify site.
  if (provisioningError || !provisioningSucceeded) {
    throw new Error(provisioningError || 'Site provisioning did not complete.')
  }

  // ── Step 5: Manual premium service (Security + Ads) ──────────────────────
  if (isManagedPlan(planKey) && session.payment_status === 'paid') {
    const { data: createdTask, error: taskError } = await supabase
      .from('manual_service_tasks')
      .upsert({
        slug: normalizedSlug,
        plan: planKey,
        email: customerEmail,
        business_name: businessName,
        task_type: 'security_ads',
        status: 'open',
        stripe_session_id: session.id,
        details: { stripe_session: session.id, site_url: netlifySiteUrl },
      }, { onConflict: 'stripe_session_id,task_type', ignoreDuplicates: true })
      .select('id')
      .maybeSingle()
    if (taskError) throw new Error(`manual_service_task:${taskError.message}`)

    const ownerEmail = process.env.PLATFORM_OWNER_EMAIL
    if (ownerEmail && createdTask) {
      await sendManualServiceAlert({
        ownerEmail,
        businessName,
        slug: normalizedSlug,
        customerEmail,
        plan: planKey,
      }).catch((err) => console.error('[webhook] manual service alert failed:', err))
    }
  }

  // ── Step 6: Transactional emails ─────────────────────────────────────────
  // Persist each delivery marker immediately. If the second send fails, the
  // retry skips the first and reuses the same checkout-bound portal token.
  if (customerEmail) {
    if (!priorData.order_confirmation_sent_at) {
      await sendOrderConfirmationEmail(customerEmail, businessName, slug, portalAccessToken, niche)
      portalData.order_confirmation_sent_at = new Date().toISOString()
      const { error } = await supabase.from('portal_sites').update({
        data: portalData,
        updated_at: new Date().toISOString(),
      }).eq('slug', normalizedSlug)
      if (error) throw new Error(`order_confirmation_marker:${error.message}`)
    }
    if (!priorData.website_live_sent_at) {
      await sendWebsiteLiveEmail(customerEmail, businessName, slug, portalAccessToken, netlifySiteUrl)
      portalData.website_live_sent_at = new Date().toISOString()
      const { error } = await supabase.from('portal_sites').update({
        data: portalData,
        updated_at: new Date().toISOString(),
      }).eq('slug', normalizedSlug)
      if (error) throw new Error(`website_live_marker:${error.message}`)
    }
  }
}

type EventQueueState = 'queued' | 'already_queued' | 'already_succeeded' | 'dead_letter'
type WorkerClaim =
  | { state: 'claimed'; event: Stripe.Event; leaseToken: string; attempt: number }
  | { state: 'already_succeeded' | 'busy' | 'deferred' | 'dead_letter' }

interface StripeWebhookQueueRow {
  event_id: string
  event_type: string
  livemode: boolean
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'dead_letter'
  attempts: number
  payload: unknown
  next_attempt_at: string | null
  lease_token: string | null
  lease_expires_at: string | null
  updated_at: string
}

function configuredStripeLivemode(secretKey: string): boolean | null {
  if (/^(?:sk|rk)_live_/.test(secretKey)) return true
  if (/^(?:sk|rk)_test_/.test(secretKey)) return false
  return null
}

async function enqueueStripeEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<EventQueueState> {
  const now = new Date().toISOString()
  const { error: insertError } = await supabase.from('stripe_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    business_key: stripeEventBusinessKey(event),
    status: 'queued',
    attempts: 0,
    payload: event,
    next_attempt_at: now,
    updated_at: now,
  })
  if (!insertError) return 'queued'
  if (insertError.code !== '23505') {
    throw new Error(`webhook_event_enqueue:${insertError.message}`)
  }

  const { data: prior, error: lookupError } = await supabase
    .from('stripe_webhook_events')
    .select('status')
    .eq('event_id', event.id)
    .maybeSingle()
  if (lookupError || !prior) {
    throw new Error(`webhook_event_lookup:${lookupError?.message || 'not_found'}`)
  }
  if (prior.status === 'succeeded') return 'already_succeeded'
  if (prior.status === 'dead_letter') return 'dead_letter'
  return 'already_queued'
}

async function claimQueuedStripeEvent(
  supabase: SupabaseClient,
  eventId: string,
): Promise<WorkerClaim> {
  if (!isStripeEventId(eventId)) throw new Error('invalid_stripe_event_id')

  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .select(
      'event_id,event_type,livemode,status,attempts,payload,next_attempt_at,lease_token,lease_expires_at,updated_at',
    )
    .eq('event_id', eventId)
    .maybeSingle()
  if (error || !data) throw new Error(`webhook_event_load:${error?.message || 'not_found'}`)

  const prior = data as StripeWebhookQueueRow
  if (prior.status === 'succeeded') return { state: 'already_succeeded' }
  if (prior.status === 'dead_letter') return { state: 'dead_letter' }

  const event = prior.payload as Stripe.Event
  if (
    !event ||
    event.id !== prior.event_id ||
    event.type !== prior.event_type ||
    event.livemode !== prior.livemode ||
    !event.data ||
    typeof event.data !== 'object'
  ) {
    const { error: integrityError } = await supabase
      .from('stripe_webhook_events')
      .update({
        status: 'dead_letter',
        last_error: 'Stored Stripe event payload failed its integrity check.',
        next_attempt_at: null,
        lease_token: null,
        lease_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('status', prior.status)
      .eq('updated_at', prior.updated_at)
    if (integrityError) throw new Error(`webhook_event_integrity:${integrityError.message}`)
    return { state: 'dead_letter' }
  }

  const nowMs = Date.now()
  const nextAttemptMs = Date.parse(prior.next_attempt_at || '')
  if (prior.status === 'failed' && Number.isFinite(nextAttemptMs) && nextAttemptMs > nowMs) {
    return { state: 'deferred' }
  }

  const leaseExpiresMs = Date.parse(prior.lease_expires_at || '')
  if (prior.status === 'processing' && Number.isFinite(leaseExpiresMs) && leaseExpiresMs > nowMs) {
    return { state: 'busy' }
  }

  const leaseToken = randomUUID()
  const now = new Date(nowMs).toISOString()
  const attempt = Number(prior.attempts || 0) + 1
  const { data: claimed, error: claimError } = await supabase
    .from('stripe_webhook_events')
    .update({
      status: 'processing',
      attempts: attempt,
      last_error: null,
      lease_token: leaseToken,
      lease_expires_at: new Date(nowMs + STRIPE_FULFILLMENT_LEASE_MS).toISOString(),
      updated_at: now,
    })
    .eq('event_id', eventId)
    .eq('status', prior.status)
    .eq('updated_at', prior.updated_at)
    .select('event_id')
    .maybeSingle()
  if (claimError?.code === '23505') return { state: 'busy' }
  if (claimError) throw new Error(`webhook_event_claim:${claimError.message}`)
  if (!claimed) return { state: 'busy' }

  return { state: 'claimed', event, leaseToken, attempt }
}

async function finishStripeEvent(
  supabase: SupabaseClient,
  eventId: string,
  leaseToken: string,
  attempt: number,
  error?: unknown,
) {
  const nowMs = Date.now()
  const succeeded = error === undefined
  const deadLetter = !succeeded && attempt >= STRIPE_FULFILLMENT_MAX_ATTEMPTS
  const status = succeeded ? 'succeeded' : deadLetter ? 'dead_letter' : 'failed'
  const now = new Date(nowMs).toISOString()
  const { data, error: updateError } = await supabase
    .from('stripe_webhook_events')
    .update({
      status,
      ...(succeeded ? { payload: {} } : {}),
      last_error: succeeded ? null : fulfillmentErrorMessage(error),
      processed_at: succeeded ? now : null,
      next_attempt_at: succeeded || deadLetter
        ? null
        : new Date(nowMs + stripeFulfillmentRetryDelayMs(attempt)).toISOString(),
      lease_token: null,
      lease_expires_at: null,
      updated_at: now,
    })
    .eq('event_id', eventId)
    .eq('status', 'processing')
    .eq('lease_token', leaseToken)
    .select('event_id')
    .maybeSingle()
  if (updateError) throw new Error(`webhook_event_finish:${updateError.message}`)
  if (!data) throw new Error('webhook_event_finish:lease_lost')
}

async function findOrderSlugForSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('slug')
    .eq('stripe_subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`subscription_order_lookup:${error.message}`)
  return typeof data?.slug === 'string' ? data.slug : null
}

async function updatePortalBillingState(
  supabase: SupabaseClient,
  subscriptionId: string,
  billingStatus: string,
  details: Record<string, unknown> = {},
  eventCreated?: number,
  ignoreMissingOrder = false,
) {
  const slug = await findOrderSlugForSubscription(supabase, subscriptionId)
  if (!slug) {
    if (ignoreMissingOrder) return
    throw new Error(`subscription_order_lookup:not_ready:${subscriptionId}`)
  }

  const { data: portal, error: portalLookupError } = await supabase
    .from('portal_sites')
    .select('status, data')
    .eq('slug', slug)
    .maybeSingle()
  if (portalLookupError) throw new Error(`subscription_portal_lookup:${portalLookupError.message}`)
  if (!portal) throw new Error(`subscription_portal_lookup:not_ready:${slug}`)

  const currentData = (portal.data || {}) as Record<string, unknown>
  const previousEventCreated = Number(currentData.billing_event_created)
  if (
    typeof eventCreated === 'number' &&
    Number.isFinite(previousEventCreated) &&
    previousEventCreated > eventCreated
  ) {
    return
  }

  const healthy = billingStatus === 'active' || billingStatus === 'trialing' || billingStatus === 'paid'
  const terminal = billingStatus === 'canceled' || billingStatus === 'unpaid' || billingStatus === 'incomplete_expired'
  const nextStatus = healthy
    ? (currentData.provisioning_succeeded ? 'active' : portal.status)
    : terminal
      ? 'billing_suspended'
      : 'billing_attention'
  const billingPatch = {
    ...details,
    stripe_subscription_id: subscriptionId,
    billing_status: billingStatus,
    billing_updated_at: new Date().toISOString(),
  }
  const { data: applied, error: portalError } = await supabase.rpc(
    'merge_portal_billing_state',
    {
      p_slug: slug,
      p_status: nextStatus,
      p_data_patch: billingPatch,
      p_event_created: typeof eventCreated === 'number' ? eventCreated : null,
    },
  )
  if (portalError) throw new Error(`subscription_portal_update:${portalError.message}`)
  if (applied === false) return

  const { error: orderError } = await supabase
    .from('orders')
    .update({ status: billingStatus, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId)
  if (orderError) throw new Error(`subscription_order_update:${orderError.message}`)
}

async function handleSubscriptionEvent(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  eventCreated: number,
) {
  const itemPeriodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === 'number')
  // Legacy webhook destinations may still send the pre-Basil top-level field;
  // current Dahlia payloads carry periods on each subscription item.
  const legacyPeriodEnd = (subscription as unknown as { current_period_end?: unknown })
    .current_period_end
  const currentPeriodEnd = itemPeriodEnds.length > 0
    ? Math.max(...itemPeriodEnds)
    : typeof legacyPeriodEnd === 'number'
      ? legacyPeriodEnd
      : null
  await updatePortalBillingState(supabase, subscription.id, subscription.status, {
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_end: currentPeriodEnd,
  }, eventCreated)
}

async function handleInvoiceEvent(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  paid: boolean,
  eventCreated: number,
) {
  const subscriptionId = getInvoiceSubscriptionId(
    invoice as Stripe.Invoice & { subscription?: unknown },
  )
  if (!subscriptionId) return
  const subscriptionMetadata = (
    invoice as Stripe.Invoice & {
      parent?: { subscription_details?: { metadata?: Record<string, string> | null } | null } | null
    }
  ).parent?.subscription_details?.metadata
  if (subscriptionMetadata?.checkoutType && subscriptionMetadata.checkoutType !== TEMPLATE_CHECKOUT_TYPE) {
    return
  }
  await updatePortalBillingState(supabase, subscriptionId, paid ? 'paid' : 'past_due', {
    latest_invoice_id: invoice.id,
    latest_invoice_paid: paid,
  }, eventCreated, subscriptionMetadata?.checkoutType !== TEMPLATE_CHECKOUT_TYPE)
}

async function handleCheckoutExpired(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  failureReason: 'checkout_expired' | 'async_payment_failed',
) {
  const checkoutType = getSupportedCheckoutType(session)
  if (checkoutType === CUSTOM_BUILD_CHECKOUT_TYPE) {
    const requestId = session.metadata?.customBuildRequestId
    if (!requestId) return
    const { error } = await supabase
      .from('custom_build_requests')
      .update({ status: 'checkout_failed', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .in('status', ['checkout_pending', 'payment_pending'])
    if (error) throw new Error(`custom_build_expiry:${error.message}`)
    return
  }

  if (checkoutType !== TEMPLATE_CHECKOUT_TYPE) return

  const checkoutIntentId = session.metadata?.checkoutIntentId
  const slug = normalizeSlug(session.metadata?.slug || '')
  if (!checkoutIntentId || !slug) return
  const { error: intentError } = await supabase
    .from('checkout_intents')
    .update({
      status: 'checkout_failed',
      last_error: failureReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', checkoutIntentId)
    .in('status', ['pending', 'session_created'])
  if (intentError) throw new Error(`checkout_expiry:${intentError.message}`)

  const { error: releaseError } = await supabase
    .from('site_slugs')
    .delete()
    .eq('slug', slug)
    .eq('reserved_for', checkoutIntentId)
    .eq('status', 'checkout_pending')
  if (releaseError) throw new Error(`checkout_slug_release:${releaseError.message}`)
}

async function processStripeEvent(supabase: SupabaseClient, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session
      const checkoutType = getSupportedCheckoutType(session)
      if (checkoutType === CUSTOM_BUILD_CHECKOUT_TYPE) {
        await handleCustomBuildCompleted(supabase, session)
      } else if (
        checkoutType === TEMPLATE_CHECKOUT_TYPE &&
        isCheckoutPaymentReady(session)
      ) {
        await handleCheckoutCompleted(supabase, session)
      }
      break
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      await handleCheckoutExpired(
        supabase,
        event.data.object as Stripe.Checkout.Session,
        event.type === 'checkout.session.expired'
          ? 'checkout_expired'
          : 'async_payment_failed',
      )
      break
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      if (subscription.metadata?.checkoutType === TEMPLATE_CHECKOUT_TYPE) {
        await handleSubscriptionEvent(supabase, subscription, event.created)
      }
      break
    }
    case 'invoice.paid':
      await handleInvoiceEvent(supabase, event.data.object as Stripe.Invoice, true, event.created)
      break
    case 'invoice.payment_failed':
      await handleInvoiceEvent(supabase, event.data.object as Stripe.Invoice, false, event.created)
      break
    default:
      // Verified but irrelevant events are completed cheaply and remain in the
      // ledger so repeated deliveries never create work.
      break
  }
}

export async function processQueuedStripeEvent(
  eventId: string,
): Promise<'succeeded' | 'already_succeeded' | 'busy' | 'deferred' | 'dead_letter'> {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase fulfillment configuration is incomplete.')
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  const claim = await claimQueuedStripeEvent(supabase, eventId)
  if (claim.state !== 'claimed') return claim.state

  try {
    await processStripeEvent(supabase, claim.event)
    await finishStripeEvent(supabase, eventId, claim.leaseToken, claim.attempt)
    return 'succeeded'
  } catch (error) {
    await finishStripeEvent(supabase, eventId, claim.leaseToken, claim.attempt, error)
    if (claim.attempt >= STRIPE_FULFILLMENT_MAX_ATTEMPTS) {
      console.error('[stripe-fulfillment] event moved to dead letter:', eventId, fulfillmentErrorMessage(error))
      return 'dead_letter'
    }
    throw error
  }
}

export async function POST(req: Request) {
  if (
    !stripeSecretKey ||
    !webhookSecret ||
    !supabaseUrl ||
    !supabaseServiceKey ||
    (process.env.STRIPE_FULFILLMENT_WORKER_SECRET?.trim().length || 0) < 32
  ) {
    return Response.json(
      { error: 'Stripe fulfillment configuration is incomplete.' },
      { status: 500 }
    )
  }

  const stripe = createStripeClient(stripeSecretKey)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return Response.json({ error: 'Missing signature' }, { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const expectedLivemode = configuredStripeLivemode(stripeSecretKey)
  if (expectedLivemode !== null && event.livemode !== expectedLivemode) {
    console.error('[webhook] rejected event from the wrong Stripe mode:', event.id)
    return Response.json({ error: 'Stripe mode mismatch' }, { status: 400 })
  }

  let queueState: EventQueueState
  try {
    queueState = await enqueueStripeEvent(supabase, event)
  } catch (err) {
    console.error('[webhook] could not enqueue event:', err)
    return Response.json({ error: 'Webhook queue unavailable' }, { status: 500 })
  }
  if (queueState === 'already_succeeded') {
    return Response.json({ received: true, duplicate: true })
  }
  if (queueState === 'dead_letter') {
    // Retrying forever would amplify a poison event. The retained payload and
    // error are recoverable by an operator after the underlying issue is fixed.
    return Response.json({ received: true, deadLetter: true }, { status: 202 })
  }

  try {
    await dispatchQueuedStripeEvent(event.id, new URL(req.url).origin)
    await markStripeEventDispatched(supabase, event.id)
  } catch (error) {
    console.error('[webhook] queued event dispatch failed:', error)
    // The event is already durable. A non-2xx asks Stripe for an additional
    // delivery while the scheduled sweeper remains an independent recovery path.
    return Response.json({ error: 'Webhook queued but dispatch failed' }, { status: 500 })
  }

  return Response.json({ received: true, queued: true }, { status: 202 })
}
