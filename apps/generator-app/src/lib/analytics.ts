/**
 * Provider-neutral analytics wrapper.
 *
 * Supported providers (loaded automatically if available on window):
 *   - Plausible (window.plausible) — set NEXT_PUBLIC_PLAUSIBLE_DOMAIN
 *   - PostHog (window.posthog) — set NEXT_PUBLIC_POSTHOG_KEY
 *   - Google Analytics 4 (window.gtag) — set NEXT_PUBLIC_GA_ID
 *
 * Falls back to console.info in development only.
 * Safe to call during SSR — all window access is guarded.
 */

type Properties = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Properties }) => void
    posthog?: { capture: (event: string, props?: Properties) => void }
    gtag?: (...args: unknown[]) => void
  }
}

export function track(eventName: string, properties: Properties = {}): void {
  if (typeof window === 'undefined') return

  // Plausible
  if (window.plausible) {
    window.plausible(eventName, { props: properties })
  }

  // PostHog
  if (window.posthog) {
    window.posthog.capture(eventName, properties)
  }

  // Google Analytics 4
  if (window.gtag) {
    window.gtag('event', eventName, properties)
  }

  // Console fallback (dev only)
  if (process.env.NODE_ENV === 'development') {
    console.info('[analytics]', eventName, properties)
  }
}

export function pageview(path: string, properties: Properties = {}): void {
  track('pageview', { path, ...properties })
}
