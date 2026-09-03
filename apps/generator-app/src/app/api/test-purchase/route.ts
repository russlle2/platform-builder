import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { provisionSite, deploySiteFiles, deleteSite } from '@/lib/netlify'
import { buildDeployFiles, type InlineTextEdit } from '@/lib/site-deploy'
import type { ImageSwap } from '@/lib/image-swaps'
import {
  CUSTOMER_IMAGES_BUCKET,
  migrateImagesToSiteSlug,
  rewriteImageSwapUrls,
} from '@/lib/customer-images'
import { buildPortalMagicLink, createPortalAccessCredentials } from '@/lib/portal-auth'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { sanitizeCustomTheme, type CustomTheme } from '@/lib/custom-theme'
import { isDraftImageOwner } from '@/lib/image-owner'
import { validateCheckoutImageSession } from '@/lib/checkout-image-session'
import { getTestPurchaseGuardIssue } from '@/lib/test-purchase-guard'

function hasTestPurchaseSecret(req: Request): boolean {
  const expected = process.env.TEST_PURCHASE_ADMIN_SECRET
  const provided = (req.headers.get('x-test-purchase-secret') || '').trim()
  if (!expected || !provided) return false
  const expectedBytes = Buffer.from(expected)
  const providedBytes = Buffer.from(provided)
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes)
}

/**
 * POST /api/test-purchase
 *
 * Simulates a completed purchase without going through Stripe.
 * Only enabled when:
 *   DAILYCLARITY_ENVIRONMENT=staging and ENABLE_TEST_PURCHASE=true
 *   exact staging host + Supabase project sentinels match
 *   TEST_PURCHASE_ADMIN_SECRET is set and matches x-test-purchase-secret header
 *
 * Never enabled based on NEXT_PUBLIC_APP_STAGE alone (client-accessible, bypassable).
 */
export async function POST(req: Request) {
  // Gate 1: hard staging boundary. Production rejects this route even if a
  // legacy feature flag or shared secret is accidentally copied there.
  const guardIssue = getTestPurchaseGuardIssue(req.url)
  if (guardIssue) {
    return NextResponse.json(
      { error: 'Test purchase is available only in the isolated staging environment.', code: guardIssue },
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

  if (!hasTestPurchaseSecret(req)) {
    return NextResponse.json(
      { error: 'Forbidden.' },
      { status: 403 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const netlifyAccessToken = process.env.NETLIFY_ACCESS_TOKEN
  if (!supabaseUrl || !supabaseServiceKey || !netlifyAccessToken) {
    return NextResponse.json(
      { error: 'The isolated staging purchase harness is not fully configured.' },
      { status: 503 },
    )
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

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

  if (!slug || !templateSlug || !niche) {
    return NextResponse.json({ error: 'slug, template, and niche are required' }, { status: 400 })
  }

  const normalizedSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  const customerEmail = (customerValues.EMAIL || '').trim().toLowerCase()
  if (!/^e2e-[a-z0-9._+-]+@dailyclarity\.test$/.test(customerEmail)
      || !/^e2e-[a-z0-9-]{1,50}$/.test(normalizedSlug)) {
    return NextResponse.json(
      { error: 'Only generated E2E fixtures are accepted by the staging purchase harness.' },
      { status: 400 },
    )
  }

  const log: string[] = []
  let siteUrl = ''
  let siteId = ''
  let netlifyDefaultDomain = ''
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
  try {
    const { error } = await supabase
      .from('site_slugs')
      .upsert({ slug: normalizedSlug, status: 'reserved' }, { onConflict: 'slug' })
    if (error) throw error
    log.push('Slug reserved in Supabase')
  } catch (error) {
    console.error('[test-purchase] staging slug reservation failed:', error)
    return NextResponse.json(
      { error: 'Staging slug reservation failed.' },
      { status: 502 },
    )
  }

  // ── 2. Provision Netlify site ────────────────────────────────────
  try {
    const site = await provisionSite(normalizedSlug)
    siteId = site.siteId
    siteUrl = site.siteUrl
    netlifyDefaultDomain = site.defaultDomain
    log.push(`Netlify site provisioned: ${site.siteUrl}`)

    // ── 3. Build & deploy customized template ────────────────────
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

    // Update Supabase records with hosting info
    const { error: siteSlugError } = await supabase
      .from('site_slugs')
      .update({
        status: deploymentSucceeded ? 'provisioned' : 'failed',
        netlify_site_id: siteId,
        site_url: siteUrl,
        netlify_default_domain: netlifyDefaultDomain,
      })
      .eq('slug', normalizedSlug)
    if (siteSlugError) throw siteSlugError

    const { error: portalError } = await supabase
      .from('portal_sites')
      .upsert({
        slug: normalizedSlug,
        status: deploymentSucceeded ? 'active' : 'provisioning_failed',
        portal_token_hash: portalCredentials?.hash ?? null,
        owner_email: customerEmail,
        data: {
          niche,
          template: templateSlug,
          colorScheme,
          fontVariation,
          structureVariation,
          customTheme: sanitizeCustomTheme(customTheme),
          customerValues,
          inlineEdits,
          imageSwaps: resolvedImageSwaps,
          imageOwner: normalizedSlug,
          email: customerEmail,
          netlify_site_id: siteId,
          site_url: siteUrl,
          netlify_default_domain: netlifyDefaultDomain,
          plan: planKey,
          test_purchase: true,
          ...(deploymentError ? { provisioning_error: deploymentError } : {}),
        },
      }, { onConflict: 'slug' })
    if (portalError) throw portalError

    log.push('Supabase records updated (site_slugs + portal_sites)')

    if (!deploymentSucceeded) {
      throw new Error(deploymentError || 'Template deployment did not complete.')
    }

    const businessName = customerValues.BUSINESS_NAME || normalizedSlug
    await sendOrderConfirmationEmail(customerEmail, businessName, normalizedSlug, portalCredentials?.token, niche).catch((err) =>
      console.error('[test-purchase] order confirmation email failed:', err),
    )
    log.push(`Order confirmation email sent to ${customerEmail}`)
  } catch (err) {
    deploymentError = err instanceof Error ? err.message : String(err)
    deploymentSucceeded = false
    log.push(`Staging provisioning failed: ${deploymentError}`)
    if (siteId) {
      try {
        await deleteSite(siteId)
        log.push('Failed staging site removed')
      } catch (cleanupError) {
        console.error('[test-purchase] failed site cleanup failed:', cleanupError)
        log.push('Failed staging site cleanup requires attention')
      }
    }
  }

  const responseBody = {
    success: deploymentSucceeded,
    slug: normalizedSlug,
    siteUrl: siteUrl || null,
    siteId: siteId || null,
    portalAccessToken: portalCredentials?.token ?? null,
    portalUrl: portalCredentials
      ? buildPortalMagicLink(normalizedSlug, portalCredentials.token)
      : null,
    log,
  }
  if (!deploymentSucceeded) {
    return NextResponse.json(
      { ...responseBody, error: 'Test purchase provisioning did not complete successfully.' },
      { status: 502 },
    )
  }
  return NextResponse.json(responseBody)
}

/** Remove every artifact created by the staging-only E2E purchase. */
export async function DELETE(req: Request) {
  const guardIssue = getTestPurchaseGuardIssue(req.url)
  if (guardIssue || !hasTestPurchaseSecret(req)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }
  const url = new URL(req.url)
  const slug = (url.searchParams.get('slug') || '').trim().toLowerCase()
  const email = (url.searchParams.get('email') || '').trim().toLowerCase()
  if (!/^e2e-[a-z0-9-]{1,50}$/.test(slug) || !/^e2e-[^@]+@dailyclarity\.test$/.test(email)) {
    return NextResponse.json({ error: 'Only generated E2E fixtures can be removed.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Staging Supabase is not configured.' }, { status: 503 })
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { data: site, error: lookupError } = await supabase
    .from('site_slugs')
    .select('netlify_site_id')
    .eq('slug', slug)
    .maybeSingle()
  if (lookupError) return NextResponse.json({ error: 'Fixture lookup failed.' }, { status: 502 })

  if (site?.netlify_site_id && !process.env.NETLIFY_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Staging Netlify cleanup is not configured.' }, { status: 503 })
  }
  if (site?.netlify_site_id) {
    try {
      await deleteSite(site.netlify_site_id)
    } catch (error) {
      console.error('[test-purchase] staging site cleanup failed:', error)
      return NextResponse.json({ error: 'Staging site cleanup failed.' }, { status: 502 })
    }
  }

  const bucket = supabase.storage.from(CUSTOMER_IMAGES_BUCKET)
  const { data: images, error: imageListError } = await bucket.list(slug, { limit: 1_000 })
  if (imageListError) return NextResponse.json({ error: 'Fixture image cleanup failed.' }, { status: 502 })
  const imagePaths = (images || []).filter((file) => file.name).map((file) => `${slug}/${file.name}`)
  if (imagePaths.length > 0) {
    const { error } = await bucket.remove(imagePaths)
    if (error) return NextResponse.json({ error: 'Fixture image cleanup failed.' }, { status: 502 })
  }

  for (const [table, column, value] of [
    ['manual_service_tasks', 'slug', slug],
    ['orders', 'slug', slug],
    ['contact_messages', 'slug', slug],
    ['booking_inquiries', 'slug', slug],
    ['portal_sites', 'slug', slug],
    ['site_slugs', 'slug', slug],
    ['intake_contacts', 'email', email],
  ] as const) {
    const { error } = await supabase.from(table).delete().eq(column, value)
    if (error) {
      console.error(`[test-purchase] cleanup failed for ${table}:`, error.message)
      return NextResponse.json({ error: 'Fixture database cleanup failed.' }, { status: 502 })
    }
  }
  return NextResponse.json({ ok: true, slug })
}
