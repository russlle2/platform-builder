import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import DashboardClient from './DashboardClient'
import type { PortalSiteData } from './DashboardClient'
import { claimPortalSitesForUser } from '@/lib/portal-owner-auth'

export const metadata: Metadata = {
  title: 'Customer Dashboard',
  description: 'Manage your DailyClarity website and account.',
  alternates: { canonical: '/dashboard' },
  openGraph: {
    title: 'Customer Dashboard | DailyClarity',
    description: 'Manage your DailyClarity website and account.',
    url: '/dashboard',
    type: 'website',
    images: ['/og-image.png'],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard')
  }

  // Use service role to read portal_sites (bypasses RLS for server-side render).
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Claim legacy rows once by verified email, then authorize strictly by the
  // immutable Auth user ID so address changes and reuse cannot transfer sites.
  await claimPortalSitesForUser(serviceClient, user)

  const { data: ownedSites } = await serviceClient
    .from('portal_sites')
    .select('slug, status, data, owner_email')
    .eq('owner_id', user.id)
    .order('slug', { ascending: true })

  const requestedSlug = (await searchParams).site?.trim().toLowerCase()
  const sites = (ownedSites || []) as PortalSiteData[]
  const site = sites.find((candidate) => candidate.slug === requestedSlug) || sites[0] || null

  return (
    <DashboardClient
      userEmail={user.email ?? ''}
      site={site}
      sites={sites.map((candidate) => ({
        slug: candidate.slug,
        name: candidate.data.customerValues?.BUSINESS_NAME || candidate.slug,
      }))}
    />
  )
}
