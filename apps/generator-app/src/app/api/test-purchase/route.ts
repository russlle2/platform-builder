import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { provisionSite, deploySiteFiles } from '@/lib/netlify'
import { getTemplate } from '@/lib/templates/niche-registry'
import { buildDeployFiles, type InlineTextEdit } from '@/lib/site-deploy'
import type { ImageSwap } from '@/lib/image-swaps'
import { migrateImagesToSiteSlug, rewriteImageSwapUrls } from '@/lib/customer-images'
import { buildPortalMagicLink, createPortalAccessCredentials } from '@/lib/portal-auth'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { sanitizeCustomTheme, type CustomTheme } from '@/lib/custom-theme'
import { isDraftImageOwner } from '@/lib/image-owner'
import { validateCheckoutImageSession } from '@/lib/checkout-image-session'
import { snapshotCatalogRevision } from '@/lib/catalog-revision'

/**
 * POST /api/test-purchase
 *
 * Simulates a completed purchase without going through Stripe.
 * Only enabled when:
 *   ENABLE_TEST_PURCHASE=true
 *   TEST_PURCHASE_ADMIN_SECRET is set and matches x-test-purchase-secret header
 *
 * Never enabled based on NEXT_PUBLIC_APP_STAGE alone (client-accessible, bypassable).
 */
export async function POST(req: Request) {
  // Gate 1: feature flag (server-only)
  if (process.env.ENABLE_TEST_PURCHASE !== 'true') {
    return NextResponse.json(
      { error: 'Test purchase is not enabled.' },
      { status: 403 }
    )
  }

  // Gate 2: secret header must match TEST_PURCHASE_ADMIN_SECRET
  const expectedSecret = process.env.TEST_PURCHASE_ADMIN_SECRET
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'Test purchase is not configured.' },
      { status: 403 }
    )
  }

  const providedSecret = (req.headers.get('x-test-purchase-secret') || '').trim()
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Forbidden.' },
      { status: 403 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const body = await req.json()
  const {
    slug,
    template: templateSlug,
    niche,
    planKey = 'basic',
    colorScheme = 'original',
    fontVariation = 'original',
    structureVariation = 'original',
    customerValues = {},
    inlineEdits = {},
    imageSwaps = {},
    imageOwner = '',
    customTheme = null,
  } = body as {
    slug?: string
    template?: string
    niche?: string
    planKey?: string
    colorScheme?: string
    fontVariation?: string
    structureVariation?: string
    customerValues?: Record<string, string>
    inlineEdits?: Record<string, InlineTextEdit[]>
    imageSwaps?: Record<string, ImageSwap[]>
    imageOwner?: string
    customTheme?: CustomTheme | null
  }

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const normalizedSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  // Match production checkout semantics: derive the immutable v3 receipt
  // from the server catalogue rather than accepting it from this request.
  const selectedTemplate = templateSlug && niche
    ? await getTemplate(niche, templateSlug)
    : null
  const catalogRevision = selectedTemplate
    ? snapshotCatalogRevision(selectedTemplate)
    : undefined

  const log: string[] = []
  let siteUrl = ''
  let siteId = ''
  let deploymentSucceeded = false
  let deploymentError: string | null = null
  let resolvedImageSwaps = imageSwaps as Record<string, ImageSwap[]>
  const portalCredentials = createPortalAccessCredentials()

  const imageSession = validateCheckoutImageSession(
    resolvedImageSwaps,
    isDraftImageOwner(imageOwner) ? imageOwner : null,
  )
  if (!imageSession.ok) {
    return NextResponse.json(
      { error: imageSession.error, code: imageSession.code },
      { status: 409 },
    )
  }
  if (imageSession.draftImageUrls.length > 0) {
    try {
      await migrateImagesToSiteSlug(
        imageSession.imageOwner,
        normalizedSlug,
        imageSession.draftImageUrls,
      )
      resolvedImageSwaps = rewriteImageSwapUrls(
        resolvedImageSwaps,
        imageSession.imageOwner,
        normalizedSlug,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image migration failed.'
      return NextResponse.json(
        { error: `Test purchase image migration failed: ${message}` },
        { status: 502 },
      )
    }
  }

  // ── 1. Reserve slug in Supabase ──────────────────────────────────
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
      await supabase
        .from('site_slugs')
        .upsert({ slug: normalizedSlug, status: 'reserved' }, { onConflict: 'slug' })
      log.push('Slug reserved in Supabase')
    } catch (err) {
      log.push(`Slug reservation failed: ${err}`)
    }
  } else {
    log.push('Supabase not configured — skipping slug reservation')
  }

  // ── 2. Provision Netlify site ────────────────────────────────────
  if (process.env.NETLIFY_ACCESS_TOKEN) {
    try {
      const site = await provisionSite(normalizedSlug)
      siteId = site.siteId
      siteUrl = site.siteUrl
      log.push(`Netlify site provisioned: ${site.siteUrl}`)

      // ── 3. Build & deploy customized template ────────────────────
      if (templateSlug && niche) {
        try {
          const deployFiles = await buildDeployFiles({
            niche,
            templateSlug,
            customerValues,
            colorScheme,
            fontVariation,
            structureVariation,
            inlineEdits,
            imageSwaps: resolvedImageSwaps,
            slug: normalizedSlug,
            siteUrl,
            customTheme: sanitizeCustomTheme(customTheme),
            catalogRevision,
          })
          if (deployFiles) {
            const deploy = await deploySiteFiles(siteId, deployFiles)
            deploymentSucceeded = true
            log.push(`Template deployed: ${Object.keys(deployFiles).length} files (deploy ${deploy.deployId})`)
          } else {
            deploymentError = `Template "${templateSlug}" was not found in niche "${niche}".`
            log.push(`Template "${templateSlug}" not found in niche "${niche}" — site created but empty`)
          }
        } catch (deployErr) {
          deploymentError = deployErr instanceof Error ? deployErr.message : String(deployErr)
          log.push(`Template deploy failed: ${deployErr}`)
        }
      } else {
        deploymentError = 'Template and niche are required for deployment.'
        log.push('No template/niche specified — site created but empty')
      }

      // Update Supabase records with hosting info
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false },
        })

        await supabase
          .from('site_slugs')
          .update({
            status: deploymentSucceeded ? 'provisioned' : 'failed',
            netlify_site_id: siteId,
            site_url: siteUrl,
          })
          .eq('slug', normalizedSlug)

        await supabase
          .from('portal_sites')
          .upsert({
            slug: normalizedSlug,
            status: deploymentSucceeded ? 'active' : 'provisioning_failed',
            portal_token_hash: portalCredentials?.hash ?? null,
            owner_email: customerValues.EMAIL?.trim().toLowerCase() || null,
            data: {
              niche,
              template: templateSlug,
              colorScheme,
              fontVariation,
              structureVariation,
              customTheme: sanitizeCustomTheme(customTheme),
              ...(catalogRevision ? { catalogRevision } : {}),
              customerValues,
              inlineEdits,
              imageSwaps: resolvedImageSwaps,
              imageOwner: normalizedSlug,
              email: customerValues.EMAIL || '',
              netlify_site_id: siteId,
              site_url: siteUrl,
              plan: planKey,
              test_purchase: true,
              ...(deploymentError ? { provisioning_error: deploymentError } : {}),
            },
          }, { onConflict: 'slug' })

        log.push('Supabase records updated (site_slugs + portal_sites)')

        const customerEmail = customerValues.EMAIL || ''
        const businessName = customerValues.BUSINESS_NAME || normalizedSlug
        if (customerEmail && deploymentSucceeded) {
          await sendOrderConfirmationEmail(customerEmail, businessName, normalizedSlug, portalCredentials?.token, niche).catch((err) =>
            console.error('[test-purchase] order confirmation email failed:', err),
          )
          log.push(`Order confirmation email sent to ${customerEmail}`)
        }
      }
    } catch (err) {
      deploymentError = err instanceof Error ? err.message : String(err)
      log.push(`Netlify provisioning failed: ${err}`)
    }
  } else {
    log.push('NETLIFY_ACCESS_TOKEN not set — skipping site provisioning')
    if (templateSlug && niche) {
      const templateData = selectedTemplate
      if (templateData) {
        log.push(`Template "${templateData.name}" found with ${templateData.pages.length} pages — would deploy on purchase`)
      }
    }
    // Send confirmation email even without Netlify (so customers know their order was received)
    const customerEmail = customerValues.EMAIL || ''
    const businessName = customerValues.BUSINESS_NAME || normalizedSlug
    if (customerEmail) {
      await sendOrderConfirmationEmail(customerEmail, businessName, normalizedSlug, portalCredentials?.token, niche).catch((err) =>
        console.error('[test-purchase] order confirmation email failed:', err),
      )
      log.push(`Order confirmation email sent to ${customerEmail}`)
    }
  }

  const responseBody = {
    success: process.env.NETLIFY_ACCESS_TOKEN ? deploymentSucceeded : true,
    slug: normalizedSlug,
    siteUrl: siteUrl || null,
    siteId: siteId || null,
    portalAccessToken: portalCredentials?.token ?? null,
    portalUrl: portalCredentials
      ? buildPortalMagicLink(normalizedSlug, portalCredentials.token)
      : null,
    log,
  }
  if (process.env.NETLIFY_ACCESS_TOKEN && !deploymentSucceeded) {
    return NextResponse.json(
      { ...responseBody, error: 'Test purchase provisioning did not complete successfully.' },
      { status: 502 },
    )
  }
  return NextResponse.json(responseBody)
}
