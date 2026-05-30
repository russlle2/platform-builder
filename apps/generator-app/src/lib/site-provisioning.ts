/**
 * Core customer site provisioning logic.
 *
 * Called by:
 *  - Stripe webhook after verified payment
 *  - /api/test-purchase (when explicitly enabled + secret-authenticated)
 *  - /api/sites/provision (admin-only HTTP endpoint)
 */
import { createClient } from '@supabase/supabase-js'
import { provisionSite } from '@/lib/netlify'

export interface ProvisionInput {
  slug: string
}

export interface ProvisionResult {
  ok: boolean
  siteId: string
  subdomain: string
  siteUrl: string
  adminUrl: string
}

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function provisionCustomerSite(input: ProvisionInput): Promise<ProvisionResult> {
  const { slug: rawSlug } = input
  const slug = normalizeSlug(rawSlug)

  if (!slug) throw new Error('Slug is required.')
  if (!process.env.NETLIFY_ACCESS_TOKEN) throw new Error('Netlify is not configured.')

  const result = await provisionSite(slug)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    await supabase.from('site_slugs').upsert(
      {
        slug,
        status: 'provisioned',
        netlify_site_id: result.siteId,
        site_url: result.siteUrl,
      },
      { onConflict: 'slug' }
    )

    await supabase.from('portal_sites').upsert(
      {
        slug,
        data: {
          netlify_site_id: result.siteId,
          site_url: result.siteUrl,
          subdomain: result.subdomain,
          adminUrl: result.adminUrl,
        },
        status: 'provisioned',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    )
  }

  return { ok: true, ...result }
}
