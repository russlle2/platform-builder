import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import DashboardClient from './DashboardClient'
import type { PortalSiteData } from './DashboardClient'

export default async function DashboardPage() {
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

  const { data: site } = await serviceClient
    .from('portal_sites')
    .select('slug, status, data, owner_email')
    .eq('owner_email', user.email ?? '')
    .order('slug', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (
    <DashboardClient
      userEmail={user.email ?? ''}
      site={site as PortalSiteData | null}
    />
  )
}
