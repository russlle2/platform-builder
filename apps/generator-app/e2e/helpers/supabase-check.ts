import { createClient } from '@supabase/supabase-js'
import type { APIRequestContext } from '@playwright/test'

export async function verifyIntakeContact(email: string): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return false
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )
  const { data, error } = await supabase
    .from('intake_contacts')
    .select('email')
    .eq('email', email)
    .maybeSingle()
  return !error && !!data
}

export async function cleanupTestData(
  email: string,
  slug: string,
  request?: APIRequestContext,
): Promise<void> {
  const secret = process.env.TEST_PURCHASE_ADMIN_SECRET
  if (request && secret) {
    const response = await request.delete(
      `/api/test-purchase?slug=${encodeURIComponent(slug)}&email=${encodeURIComponent(email)}`,
      { headers: { 'x-test-purchase-secret': secret } },
    )
    if (!response.ok()) {
      throw new Error(`Staging fixture cleanup failed (${response.status()}): ${await response.text()}`)
    }
    return
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )
  const { error } = await supabase.from('intake_contacts').delete().eq('email', email)
  if (error) throw new Error(`Intake fixture cleanup failed: ${error.message}`)
}
