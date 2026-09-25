import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const route = vi.hoisted(() => ({ pathname: '/booking-kit/result' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('next/script', () => ({ default: ({ src, children }: { src?: string; children?: string }) => createElement('script', { src }, children) }))
import Analytics from './Analytics'
import { BOOKING_KIT_ACCESS_STORAGE_KEY, canLoadPageAnalytics } from '@/lib/analytics-privacy'

describe('private kit analytics exclusion', () => {
  it('loads no analytics scripts on private kit result pages even with configured trackers', () => {
    for (const pathname of ['/booking-kit/result', '/booking-kit/result/']) {
      route.pathname = pathname
      expect(renderToStaticMarkup(createElement(Analytics, { plausibleDomain: 'dailyclarity.org', googleAnalyticsId: 'G-EXAMPLE' }))).toBe('')
    }
  })
  it('does not render public trackers before private storage is checked in the browser', () => {
    route.pathname = '/pricing'
    const rendered = renderToStaticMarkup(createElement(Analytics, { plausibleDomain: 'dailyclarity.org', googleAnalyticsId: 'G-EXAMPLE' }))
    expect(rendered).toBe('')
  })
  it('suppresses all kit paths and public pages while the tab retains a private credential', () => {
    const empty = { getItem: () => null }
    const credential = { getItem: (key: string) => key === BOOKING_KIT_ACCESS_STORAGE_KEY ? 'private' : null }
    expect(canLoadPageAnalytics('/pricing', empty)).toBe(true)
    expect(canLoadPageAnalytics('/booking-kit', empty)).toBe(false)
    expect(canLoadPageAnalytics('/booking-kit/result', empty)).toBe(false)
    expect(canLoadPageAnalytics('/preview-your-business', credential)).toBe(false)
    expect(canLoadPageAnalytics('/pricing', credential)).toBe(false)
    expect(canLoadPageAnalytics('/pricing', { getItem: () => { throw new Error('Storage unavailable') } })).toBe(false)
  })
})
