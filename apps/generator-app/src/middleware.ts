import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export default function middleware(req: NextRequest) {
  const catalogRedirect = templateCatalogRedirect(req)
  if (catalogRedirect) return catalogRedirect

  const res = NextResponse.next()

  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  res.headers.set(
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

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)).*)',
  ],
}
