import { createClient } from '@/lib/supabase/server'
import { createAuthRedirect, getAuthReturnPath } from '@/lib/auth-redirect'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = getAuthReturnPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return createAuthRedirect(next)
    }
  }

  // Exchange failed — send to login with an error hint, without the used code.
  return createAuthRedirect('/login?error=auth_callback_failed')
}
