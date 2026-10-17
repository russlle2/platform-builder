import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createAuthRedirect, getAuthReturnPath } from '@/lib/auth-redirect'
import { getTrustedSiteOrigin } from '@/lib/site-origin'

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
  // The callback exchanges the PKCE code and writes its own session cookies.
  // Netlify applies middleware headers after the route response, so keep this
  // credential-bearing, script-free completion document private at both layers.
  if (req.nextUrl.pathname === '/auth/callback') {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Content-Security-Policy', "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
    return response
  }
  // This server-to-server hook authenticates its raw body with Standard Webhooks.
  // Refreshing a browser session here adds a needless Auth round trip to its 5s budget.
  if (req.nextUrl.pathname === '/api/auth/send-email') {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    return response
  }
  // Sandbox diagnostics have their own signed cookie and no account dependency.
  // Keep PayPal return parameters away from trackers and referrers.
  if (req.nextUrl.pathname === '/paypal-test' || req.nextUrl.pathname.startsWith('/api/paypal/sandbox/')) {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Content-Security-Policy', [
      "default-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'", "font-src 'self'", "img-src 'self' data: blob:",
      "connect-src 'self'", "frame-src 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
    ].join('; '))
    return response
  }
  const catalogRedirect = templateCatalogRedirect(req)
  if (catalogRedirect) return catalogRedirect

  // Refresh the Supabase auth session on every request (required for @supabase/ssr).
  const { supabaseResponse, user } = await updateSession(req)

  // Protect /dashboard: unauthenticated visitors are sent to /login.
  if (req.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const next = getAuthReturnPath(`${req.nextUrl.pathname}${req.nextUrl.search}`)
    const response = createAuthRedirect(`/login?next=${encodeURIComponent(next)}`)
    // Netlify's middleware adapter requires an absolute Location. Use the
    // configured public origin so cookies stay on that host even behind an
    // immutable deployment URL.
    const origin = getTrustedSiteOrigin(req.url)
    if (!origin) {
      return new NextResponse('Authentication is temporarily unavailable.', {
        status: 503,
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      })
    }
    response.headers.set('Location', new URL(response.headers.get('Location')!, origin).href)
    for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie)
    return response
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

  if (
    req.nextUrl.pathname === '/booking-kit/result' ||
    req.nextUrl.pathname.startsWith('/booking-kit/result/') ||
    req.nextUrl.pathname === '/success' ||
    req.nextUrl.pathname === '/success/'
  ) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-store, max-age=0')
    supabaseResponse.headers.set('Referrer-Policy', 'no-referrer')
    supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow')
    // Checkout references can retrieve order status. Keep them and private kit
    // credentials out of trackers, referrers and shared caches, even if a
    // tracker is accidentally added to a shared layout in a future change.
    supabaseResponse.headers.set('Content-Security-Policy', [
      "default-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'", "font-src 'self'", "img-src 'self' data: blob:",
      "connect-src 'self'", "frame-src 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
    ].join('; '))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // The exact signed server-to-server hook has its own security headers and
    // must not spend Supabase's five-second budget initializing middleware.
    '/((?!api/auth/send-email$|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)).*)',
  ],
}
