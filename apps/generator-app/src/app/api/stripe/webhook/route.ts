import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email'
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

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: Request) {
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Stripe or Supabase configuration.' },
      { status: 500 }
    )
  }

  const stripeWebhookSecret = webhookSecret as string
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  })
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  const reserveSlug = async (slug: string) => {
    const normalized = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (!normalized) {
      return
    }

    await supabase
      .from('site_slugs')
      .upsert({ slug: normalized, status: 'reserved' }, { onConflict: 'slug' })
  }

  const signature = (await headers()).get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata || {}
    const slug = meta.slug
    const templateSlug = meta.template
    const niche = meta.niche
    const colorScheme = meta.colorScheme || 'original'
    const fontVariation = meta.fontVariation || 'original'
    const structureVariation = meta.structureVariation || 'original'

    // Reassemble chunked customer values + inline edits from metadata.
    const customerValues = unchunkJsonFromMetadata<Record<string, string>>(
      'customerValues',
      meta,
      {},
    )
    const inlineEdits = unchunkJsonFromMetadata<Record<string, InlineTextEdit[]>>(
      'inlineEdits',
      meta,
      {},
    )
    let imageSwaps = unchunkJsonFromMetadata<Record<string, ImageSwap[]>>(
      'imageSwaps',
      meta,
      {},
    )
    const imageOwner = meta.imageOwner || ''

    let portalAccessToken: string | undefined

    if (slug) {
      await reserveSlug(slug)

      const normalizedSlug = slug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')

      const portalCredentials = createPortalAccessCredentials()
      portalAccessToken = portalCredentials?.token

      // Move draft uploads to the purchased site slug folder when applicable.
      if (imageOwner && imageOwner.startsWith('draft-') && normalizedSlug) {
        try {
          await migrateImagesToSiteSlug(imageOwner, normalizedSlug)
          imageSwaps = rewriteImageSwapUrls(imageSwaps, imageOwner, normalizedSlug)
        } catch (migrateErr) {
          console.error('[webhook] image migration failed:', migrateErr)
        }
      }

      let netlifySiteId: string | undefined
      let netlifySiteUrl: string | undefined

      // Auto-provision a Netlify site at slug.yourdomain.com
      if (process.env.NETLIFY_ACCESS_TOKEN) {
        try {
          const site = await provisionSite(slug)

          // Build and deploy the customized template
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
            }
          }

          netlifySiteId = site.siteId
          netlifySiteUrl = site.siteUrl

          await supabase
            .from('site_slugs')
            .update({
              status: 'provisioned',
              netlify_site_id: site.siteId,
              site_url: site.siteUrl,
            })
            .eq('slug', normalizedSlug)
        } catch (err) {
          console.error('[webhook] site provisioning failed:', err)
        }
      }

      await supabase
        .from('portal_sites')
        .upsert(
          {
            slug: normalizedSlug,
            status: 'active',
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
              email: customerValues.EMAIL || session.customer_details?.email || '',
              netlify_site_id: netlifySiteId,
              site_url: netlifySiteUrl,
              plan: meta.planKey,
            },
          },
          { onConflict: 'slug' },
        )
    }

    // Send welcome email to the customer (includes magic portal link when token was issued)
    const customerEmail = session.customer_details?.email
    const businessName = customerValues.BUSINESS_NAME || meta.slug || 'your business'
    if (customerEmail && slug) {
      await sendWelcomeEmail(customerEmail, businessName, slug, portalAccessToken).catch((err) =>
        console.error('[webhook] welcome email failed:', err)
      )
    }
  }

  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription
    const slug = subscription.metadata?.slug
    if (slug) {
      await reserveSlug(slug)
    }
  }

  return NextResponse.json({ received: true })
}
