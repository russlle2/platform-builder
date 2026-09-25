'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { canLoadBrowserAnalytics } from '@/lib/analytics-privacy'

/** Private delivery pages must never load a third-party page tracker. */
export default function Analytics({ plausibleDomain, googleAnalyticsId }: { plausibleDomain?: string; googleAnalyticsId: string | null }) {
  const pathname = usePathname()
  const [allowed, setAllowed] = useState(false)
  const scriptsRequested = useRef(false)
  useEffect(() => {
    const nextAllowed = canLoadBrowserAnalytics(pathname)
    setAllowed(nextAllowed)
    if (!nextAllowed && scriptsRequested.current) {
      // Script unmounting cannot remove listeners installed by an earlier SPA
      // page. Re-enter this route as a clean document before using the kit.
      window.location.replace(window.location.href)
      return
    }
    if (nextAllowed && (plausibleDomain || googleAnalyticsId)) scriptsRequested.current = true
  }, [pathname, plausibleDomain, googleAnalyticsId])
  // No server-rendered tracker can run before client storage has been checked.
  if (!allowed || !canLoadBrowserAnalytics(pathname)) return null
  return <>
    {plausibleDomain && <Script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.js" strategy="afterInteractive" />}
    {googleAnalyticsId && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(googleAnalyticsId)});`}</Script>
    </>}
  </>
}
