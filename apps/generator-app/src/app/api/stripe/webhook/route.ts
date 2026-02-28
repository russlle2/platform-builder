import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email'
import { provisionSite } from '@/lib/netlify'

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
    const slug = session.metadata?.slug
    if (slug) {
      await reserveSlug(slug)

      // Auto-provision a Netlify site at slug.yourdomain.com
      if (process.env.NETLIFY_ACCESS_TOKEN) {
        try {
          const site = await provisionSite(slug)
          // Update the slug record with hosting info
          await supabase
            .from('site_slugs')
            .update({
              status: 'provisioned',
              netlify_site_id: site.siteId,
              site_url: site.siteUrl,
            })
            .eq('slug', slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, ''))
        } catch (err) {
          console.error('[webhook] site provisioning failed:', err)
        }
      }
    }

    // Send welcome email to the customer
    const customerEmail = session.customer_details?.email
    const businessName = session.metadata?.slug || 'your business'
    if (customerEmail && slug) {
      await sendWelcomeEmail(customerEmail, businessName, slug).catch((err) =>
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
