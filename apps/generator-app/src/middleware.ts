import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/** Public template catalog routes redirect to intake; portal edit keeps ?portalSlug= */
function templateCatalogRedirect(req: NextRequest): NextResponse | null {
  const { pathname, searchParams } = req.nextUrl

  if (pathname === '/templates') {
    return NextResponse.redirect(new URL('/preview-your-business', req.url))
  }

  const nicheOnly = pathname.match(/^\/templates\/([^/]+)$/)
  if (nicheOnly) {
    return NextResponse.redirect(
      new URL(`/preview-your-business?niche=${encodeURIComponent(nicheOnly[1])}`, req.url),
    )
  }

  const viewPath = pathname.match(/^\/templates\/([^/]+)\/([^/]+)\/view$/)
  if (viewPath) {
    return NextResponse.redirect(
      new URL(`/preview-your-business?niche=${encodeURIComponent(viewPath[1])}`, req.url),
    )
  }

  const slugPath = pathname.match(/^\/templates\/([^/]+)\/([^/]+)$/)
  if (slugPath && !searchParams.has('portalSlug')) {
    return NextResponse.redirect(
      new URL(`/preview-your-business?niche=${encodeURIComponent(slugPath[1])}`, req.url),
    )
  }

  return null
}

export default async function middleware(req: NextRequest) {
  const catalogRedirect = templateCatalogRedirect(req)
  if (catalogRedirect) return catalogRedirect

  // Refresh the Supabase auth session on every request (required for @supabase/ssr).
  const { supabaseResponse, user } = await updateSession(req)

  // Protect /dashboard: unauthenticated visitors are sent to /login.
  if (req.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Apply security headers to the final response.
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  supabaseResponse.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net https://plausible.io https://app.posthog.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://api.stripe.com https://*.supabase.co https://plausible.io https://app.posthog.com https://www.google-analytics.com https://api.postmarkapp.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "worker-src 'self' blob:",
    ].join('; ')
  )

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)).*)',
  ],
}
