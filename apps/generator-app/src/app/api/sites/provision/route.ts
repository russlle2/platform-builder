import { NextRequest, NextResponse } from 'next/server'
import { provisionCustomerSite } from '@/lib/site-provisioning'
import { requireInternalAdminOrThrow } from '@/lib/server-auth'

/**
 * POST /api/sites/provision
 *
 * Admin-only endpoint. Provisions a new Netlify site for a customer.
 * Requires INTERNAL_ADMIN_TOKEN via Authorization: Bearer <token> or
 * x-internal-admin-token header.
 *
 * Body: { slug }
 */
export async function POST(req: NextRequest) {
  const authError = requireInternalAdminOrThrow(req)
  if (authError) return authError

  try {
    const { slug } = await req.json()

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
    }

    const result = await provisionCustomerSite({ slug })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Provisioning failed.'
    console.error('[provision] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
