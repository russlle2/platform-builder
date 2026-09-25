import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient as createServerAuthClient } from '@/lib/supabase/server'

/** Return the verified Supabase user attached to the current request cookies. */
export async function getAuthenticatedPortalUser(): Promise<User | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null
  }
  try {
    const authClient = await createServerAuthClient()
    const { data: { user } } = await authClient.auth.getUser()
    return user || null
  } catch {
    return null
  }
}

/**
 * Bind legacy/unclaimed portal rows to a verified account once, then authorize
 * strictly by the immutable Auth user ID. An email change or later email reuse
 * can no longer transfer a claimed site or its Stripe customer access.
 */
export async function claimPortalSitesForUser(
  serviceClient: SupabaseClient,
  user: Pick<User, 'id' | 'email'>,
): Promise<void> {
  const email = user.email?.trim().toLowerCase()
  if (!email) return
  const { error } = await serviceClient
    .from('portal_sites')
    .update({ owner_id: user.id, owner_email: email })
    .is('owner_id', null)
    .eq('owner_email', email)
  if (error) throw new Error(`portal_owner_claim:${error.message}`)
}

export async function isAuthenticatedPortalOwnerForSlug(
  serviceClient: SupabaseClient,
  slug: string,
): Promise<boolean> {
  const user = await getAuthenticatedPortalUser()
  if (!user?.email) return false
  await claimPortalSitesForUser(serviceClient, user)
  const { data, error } = await serviceClient
    .from('portal_sites')
    .select('slug')
    .eq('slug', slug)
    .eq('owner_id', user.id)
    .maybeSingle()
  return !error && Boolean(data)
}
