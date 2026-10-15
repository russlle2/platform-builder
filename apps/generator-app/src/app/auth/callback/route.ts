import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuthRedirect, getAuthReturnPath } from '@/lib/auth-redirect'
import { getTrustedSiteOrigin } from '@/lib/site-origin'

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function GET(request: Request) {
  const origin = getTrustedSiteOrigin(request.url)
  if (!origin) {
    return new NextResponse('Authentication is temporarily unavailable.', {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer' },
    })
  }
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = getAuthReturnPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Netlify can copy the callback query onto a query-free HTTP redirect,
      // including absolute redirects. A 200 meta refresh avoids that proxy
      // behavior while preserving the session cookies set by the exchange.
      // https://answers.netlify.com/t/query-parameters-in-redirects/40285
      const destination = escapeHtmlAttribute(new URL(next, origin).href)
      return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0;url=${destination}"><title>Signing in</title></head><body><p>Signing in… <a href="${destination}" rel="noreferrer">Continue</a></p></body></html>`, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, no-store, max-age=0',
          'Referrer-Policy': 'no-referrer',
          'X-Robots-Tag': 'noindex, nofollow',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Content-Security-Policy': "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        },
      })
    }
  }

  // The explicit error query prevents proxy query inheritance on this redirect.
  const response = createAuthRedirect('/login?error=auth_callback_failed')
  response.headers.set('Location', new URL(response.headers.get('Location')!, origin).href)
  return response
}
