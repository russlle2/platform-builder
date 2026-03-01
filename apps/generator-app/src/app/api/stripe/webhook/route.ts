import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email'
import { provisionSite, deploySiteFiles } from '@/lib/netlify'
import {
  readTemplateFile,
  hydrateTemplate,
  getTemplate,
} from '@/lib/templates/niche-registry'
import { buildVariationCSS } from '@/lib/templates/variations'

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

    // Parse customer field values from metadata
    let customerValues: Record<string, string> = {}
    try {
      if (meta.customerValues) {
        customerValues = JSON.parse(meta.customerValues)
      }
    } catch { /* ignore malformed JSON */ }

    if (slug) {
      await reserveSlug(slug)

      // Auto-provision a Netlify site at slug.yourdomain.com
      if (process.env.NETLIFY_ACCESS_TOKEN) {
        try {
          const site = await provisionSite(slug)

          // Build and deploy the customized template
          if (templateSlug && niche) {
            try {
              const templateData = getTemplate(niche, templateSlug)
              if (templateData) {
                const variationCSS = buildVariationCSS(colorScheme, fontVariation, structureVariation)
                const cssFile = readTemplateFile(niche, templateSlug, 'assets/css/styles.css')
                const jsFile = readTemplateFile(niche, templateSlug, 'assets/js/main.js')

                const deployFiles: Record<string, string> = {}

                // Hydrate and collect all HTML pages
                for (const page of templateData.pages) {
                  const rawHtml = readTemplateFile(niche, templateSlug, page)
                  if (!rawHtml) continue
                  let html = hydrateTemplate(rawHtml, customerValues)

                  // Inject CSS and variation overrides into each page
                  const injectedStyles: string[] = []
                  if (cssFile) injectedStyles.push(cssFile)
                  if (variationCSS) injectedStyles.push(variationCSS)
                  if (injectedStyles.length > 0) {
                    html = html.replace('</head>', `<style>${injectedStyles.join('\n')}</style></head>`)
                  }

                  // Inject contact form handler script that posts to our API
                  const contactScript = `
<script>
(function(){
  var forms = document.querySelectorAll('form');
  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function(v, k) { data[k] = v; });
      data.slug = '${slug}';
      fetch('${process.env.NEXT_PUBLIC_API_URL || ''}/api/forms/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(function() {
        form.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--primary,#22c55e)">Thank you! We\\'ll be in touch soon.</p>';
      }).catch(function() {
        alert('Something went wrong. Please try again.');
      });
    });
  });
})();
</script>`
                  html = html.replace('</body>', contactScript + '</body>')

                  deployFiles[page] = html
                }

                // Include CSS and JS as static assets
                if (cssFile) deployFiles['assets/css/styles.css'] = cssFile
                if (jsFile) deployFiles['assets/js/main.js'] = jsFile

                // Deploy all files to the Netlify site
                await deploySiteFiles(site.siteId, deployFiles)
              }
            } catch (deployErr) {
              console.error('[webhook] template deploy failed:', deployErr)
            }
          }

          // Update the slug record with hosting info
          const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
          await supabase
            .from('site_slugs')
            .update({
              status: 'provisioned',
              netlify_site_id: site.siteId,
              site_url: site.siteUrl,
            })
            .eq('slug', normalizedSlug)

          // Store full site config in portal_sites for future edits
          await supabase
            .from('portal_sites')
            .upsert({
              slug: normalizedSlug,
              status: 'active',
              data: {
                niche,
                template: templateSlug,
                colorScheme,
                fontVariation,
                structureVariation,
                customerValues,
                email: customerValues.EMAIL || session.customer_details?.email || '',
                netlify_site_id: site.siteId,
                site_url: site.siteUrl,
                plan: meta.planKey,
              },
            }, { onConflict: 'slug' })

        } catch (err) {
          console.error('[webhook] site provisioning failed:', err)
        }
      }
    }

    // Send welcome email to the customer
    const customerEmail = session.customer_details?.email
    const businessName = customerValues.BUSINESS_NAME || meta.slug || 'your business'
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
