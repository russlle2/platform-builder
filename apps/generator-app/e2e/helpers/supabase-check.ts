import { createClient } from '@supabase/supabase-js'

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

export async function cleanupTestData(email: string): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )
  await supabase.from('intake_contacts').delete().eq('email', email)
}
