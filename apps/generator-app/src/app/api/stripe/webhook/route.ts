import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  sendOrderConfirmationEmail,
  sendWebsiteLiveEmail,
  sendManualServiceAlert,
} from '@/lib/email'
import { createPortalAccessCredentials } from '@/lib/portal-auth'
import { provisionSite, deploySiteFiles } from '@/lib/netlify'
import {
  buildDeployFiles,
  unchunkJsonFromMetadata,
  type InlineTextEdit,
} from '@/lib/site-deploy'
import {
  migrateImagesToSiteSlug,
  rewriteImageSwapUrls,
} from '@/lib/customer-images'
import type { ImageSwap } from '@/lib/image-swaps'
import { isManagedPlan, normalizePlanKey } from '@/lib/plans'

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

async function reserveSlug(supabase: SupabaseClient, slug: string) {
  const normalized = normalizeSlug(slug)
  if (!normalized) return
  await supabase
    .from('site_slugs')
    .upsert({ slug: normalized, status: 'reserved' }, { onConflict: 'slug' })
}

/**
 * Fulfillment for a completed checkout: reserve slug, provision + deploy the
 * site, persist the portal record, queue the manual premium service for the
 * Security + Ads tier, and send transactional emails. Each major step is
 * individually try/caught so a single failure cannot crash the whole handler.
 * All failures are recorded in `partialFailures` and persisted on the portal
 * record so they're visible without tailing logs.
 */
async function handleCheckoutCompleted(
  stripe: Stripe,
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
) {
  const meta = session.metadata || {}
  const slug = meta.slug
  const templateSlug = meta.template
  const niche = meta.niche
  const colorScheme = meta.colorScheme || 'original'
  const fontVariation = meta.fontVariation || 'original'
  const structureVariation = meta.structureVariation || 'original'
  const planKey = normalizePlanKey(meta.planKey) || 'basic'

  // Normalize stripe_customer_id — Stripe types it as string | Customer | DeletedCustomer | null
  const rawCustomer = session.customer
  const stripeCustomerId =
    typeof rawCustomer === 'string'
      ? rawCustomer
      : (rawCustomer as { id?: string } | null)?.id ?? null

  const partialFailures: string[] = []

  // Reassemble chunked customer values + inline edits from metadata.
  const customerValues = unchunkJsonFromMetadata<Record<string, string>>('customerValues', meta, {})
  const inlineEdits = unchunkJsonFromMetadata<Record<string, InlineTextEdit[]>>('inlineEdits', meta, {})
  let imageSwaps = unchunkJsonFromMetadata<Record<string, ImageSwap[]>>('imageSwaps', meta, {})
  const imageOwner = meta.imageOwner || ''

  const customerEmail = customerValues.EMAIL || session.customer_details?.email || ''
  const businessName = customerValues.BUSINESS_NAME || slug || 'your business'

  if (!slug) {
    // Without a slug we cannot provision or build a site. Record the lead so
    // the purchase is not silently lost, then bail out gracefully.
    console.error('[webhook] checkout.session.completed missing slug; cannot provision', session.id)
    if (customerEmail) {
      await sendOrderConfirmationEmail(customerEmail, businessName, 'your-site').catch((err) =>
        console.error('[webhook] order confirmation email failed:', err),
      )
    }
    return
  }

  const normalizedSlug = normalizeSlug(slug)

  // ── Step 1: Reserve slug ──────────────────────────────────────────────────
  try {
    await reserveSlug(supabase, slug)
  } catch (slugErr) {
    const msg = slugErr instanceof Error ? slugErr.message : 'Slug reservation failed'
    console.error('[webhook] slug reservation failed:', slugErr)
    partialFailures.push(`slug_reservation: ${msg}`)
  }

  const portalCredentials = createPortalAccessCredentials()
  const portalAccessToken = portalCredentials?.token

  // ── Step 2: Image migration ───────────────────────────────────────────────
  let imageMigrationError: string | undefined
  if (imageOwner && imageOwner.startsWith('draft-') && normalizedSlug) {
    try {
      await migrateImagesToSiteSlug(imageOwner, normalizedSlug)
      imageSwaps = rewriteImageSwapUrls(imageSwaps, imageOwner, normalizedSlug)
    } catch (migrateErr) {
      imageMigrationError = migrateErr instanceof Error ? migrateErr.message : 'Image migration failed'
      console.error('[webhook] image migration failed:', migrateErr)
      partialFailures.push(`image_migration: ${imageMigrationError}`)
    }
  }

  // ── Step 3: Netlify provisioning ──────────────────────────────────────────
  let netlifySiteId: string | undefined
  let netlifySiteUrl: string | undefined
  let provisioningError: string | undefined
  let provisioningSucceeded = false

  if (process.env.NETLIFY_ACCESS_TOKEN) {
    try {
      const site = await provisionSite(slug)

      if (templateSlug && niche) {
        try {
          const deployFiles = buildDeployFiles({
            niche,
            templateSlug,
            customerValues,
            colorScheme,
            fontVariation,
            structureVariation,
            inlineEdits,
            imageSwaps,
            slug,
          })
          if (deployFiles) {
            await deploySiteFiles(site.siteId, deployFiles)
          }
        } catch (deployErr) {
          console.error('[webhook] template deploy failed:', deployErr)
          partialFailures.push(`template_deploy: ${deployErr instanceof Error ? deployErr.message : String(deployErr)}`)
        }
      }

      netlifySiteId = site.siteId
      netlifySiteUrl = site.siteUrl
      provisioningSucceeded = true

      try {
        await supabase
          .from('site_slugs')
          .update({ status: 'provisioned', netlify_site_id: site.siteId, site_url: site.siteUrl })
          .eq('slug', normalizedSlug)
      } catch (slugUpdateErr) {
        console.error('[webhook] site_slugs update after provisioning failed:', slugUpdateErr)
        partialFailures.push(`site_slugs_update: ${slugUpdateErr instanceof Error ? slugUpdateErr.message : String(slugUpdateErr)}`)
      }
    } catch (err) {
      provisioningError = err instanceof Error ? err.message : 'Site provisioning failed'
      console.error('[webhook] site provisioning failed:', err)
      partialFailures.push(`provisioning: ${provisioningError}`)
    }
  } else {
    // Netlify not configured: provisioning is pending manual/automated setup.
    provisioningError = undefined
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

  try {
    await supabase
      .from('portal_sites')
      .upsert(
        {
          slug: normalizedSlug,
          status,
          portal_token_hash: portalCredentials?.hash ?? null,
          data: {
            niche,
            template: templateSlug,
            colorScheme,
            fontVariation,
            structureVariation,
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
            image_migration_error: imageMigrationError,
            provisioning_succeeded: provisioningSucceeded,
            stripe_customer_id: stripeCustomerId,
            partial_failures: partialFailures,
          },
        },
        { onConflict: 'slug' },
      )
  } catch (upsertErr) {
    const msg = upsertErr instanceof Error ? upsertErr.message : 'Portal record upsert failed'
    console.error('[webhook] portal_sites upsert failed:', upsertErr)
    partialFailures.push(`portal_upsert: ${msg}`)
  }

  // ── Step 5: Manual premium service (Security + Ads) ──────────────────────
  if (isManagedPlan(planKey)) {
    try {
      await supabase.from('manual_service_tasks').insert({
        slug: normalizedSlug,
        plan: planKey,
        email: customerEmail,
        business_name: businessName,
        task_type: 'security_ads',
        status: 'open',
        details: { stripe_session: session.id, site_url: netlifySiteUrl },
      })
    } catch (taskErr) {
      console.error('[webhook] manual_service_tasks insert failed:', taskErr)
    }

    const ownerEmail = process.env.PLATFORM_OWNER_EMAIL
    if (ownerEmail) {
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
  // Email failures must never crash the webhook — Postmark outages are
  // non-fatal. Both calls already have .catch() guards.
  if (customerEmail) {
    await sendOrderConfirmationEmail(customerEmail, businessName, slug, portalAccessToken, niche).catch((err) =>
      console.error('[webhook] order confirmation email failed:', err),
    )
    if (provisioningSucceeded) {
      await sendWebsiteLiveEmail(customerEmail, businessName, slug, portalAccessToken, netlifySiteUrl).catch((err) =>
        console.error('[webhook] website live email failed:', err),
      )
    }
  }
}

export async function POST(req: Request) {
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Stripe or Supabase configuration.' },
      { status: 500 }
    )
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  const signature = (await headers()).get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripe, supabase, event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const slug = subscription.metadata?.slug
        if (slug) await reserveSlug(supabase, slug)
        break
      }
      default:
        // Acknowledge all other subscribed events so Stripe doesn't retry.
        break
    }
  } catch (err) {
    // Log but still acknowledge: re-delivery rarely fixes app-level errors and
    // would otherwise wedge the Stripe event queue. Fulfillment steps above
    // already catch their own failures and record them on the portal record.
    console.error('[webhook] handler error:', err)
  }

  return NextResponse.json({ received: true })
}
