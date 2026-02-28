import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { provisionSite } from '@/lib/netlify'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * POST /api/sites/provision
 *
 * Provisions a new Netlify site for a customer after checkout.
 * Called by the Stripe webhook or manually from the admin portal.
 *
 * Body: { slug }
 *
 * Flow:
 *  1. Creates a Netlify site at slug.yourdomain.com
 *  2. Updates the `site_slugs` table with site ID and URL
 *  3. Updates the `portal_sites` table with hosting info
 */
export async function POST(req: Request) {
  try {
    const { slug } = await req.json()

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
    }

    const normalizedSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (!process.env.NETLIFY_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Netlify is not configured. Set NETLIFY_ACCESS_TOKEN.' },
        { status: 500 }
      )
    }

    // Provision the site on Netlify
    const result = await provisionSite(normalizedSlug)

    // Update Supabase records
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })

      // Update slug status to "provisioned"
      await supabase
        .from('site_slugs')
        .upsert(
          {
            slug: normalizedSlug,
            status: 'provisioned',
            netlify_site_id: result.siteId,
            site_url: result.siteUrl,
          },
          { onConflict: 'slug' }
        )

      // Update portal_sites with hosting info
      await supabase.from('portal_sites').upsert(
        {
          slug: normalizedSlug,
          data: {
            hosting: {
              provider: 'netlify',
              siteId: result.siteId,
              subdomain: result.subdomain,
              siteUrl: result.siteUrl,
              adminUrl: result.adminUrl,
            },
          },
          status: 'provisioned',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' }
      )
    }

    return NextResponse.json({
      ok: true,
      siteId: result.siteId,
      subdomain: result.subdomain,
      siteUrl: result.siteUrl,
      adminUrl: result.adminUrl,
    })
  } catch (error: any) {
    console.error('[provision] error:', error)
    return NextResponse.json(
      { error: error?.message || 'Provisioning failed.' },
      { status: 500 }
    )
  }
}
