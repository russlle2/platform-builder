import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DashboardClient, {
  isStripeBillingPortalUrl,
  safeDashboardSiteUrl,
  type PortalSiteData,
} from './DashboardClient'

const site: PortalSiteData = {
  slug: 'evening-practice',
  status: 'active',
  owner_email: 'owner@example.com',
  data: {
    niche: 'wellness_coach',
    template: 'calm-practice',
    plan: 'basic',
    customerValues: {
      BUSINESS_NAME: 'Evening Practice',
      EMAIL: 'hello@example.com',
    },
  },
}

describe('customer dashboard navigation', () => {
  it('opens the owned website workspace, correct service sections, and selected visual editor', () => {
    const html = renderToStaticMarkup(
      createElement(DashboardClient, {
        userEmail: 'owner@example.com',
        site,
        sites: [{ slug: site.slug, name: 'Evening Practice' }],
      }),
    )
    expect(html).toContain('/portal?slug=evening-practice#inbox')
    expect(html).toContain('/portal?slug=evening-practice#images')
    expect(html).toContain(
      '/templates/wellness_coach/calm-practice?portalSlug=evening-practice',
    )
    expect(html).toContain('Billing is not linked yet')
    expect(html).not.toContain('https://evening-practice.dailyclarity.org')
    expect(html).not.toContain('fixed top-0')
  })

  it('offers billing only when a Stripe customer is linked and labels suspended publishing', () => {
    const html = renderToStaticMarkup(
      createElement(DashboardClient, {
        userEmail: 'owner@example.com',
        site: {
          ...site,
          status: 'billing_suspended',
          data: { ...site.data, stripe_customer_id: 'cus_test' },
        },
        sites: [],
      }),
    )
    expect(html).toContain('Manage billing')
    expect(html).toContain('Billing needs attention')
    expect(html).toContain('Publishing is paused')
    expect(html).not.toContain('Email delivery ready')
  })

  it('never invents a live address or accepts a dangerous scheme', () => {
    expect(safeDashboardSiteUrl(undefined)).toBeNull()
    expect(safeDashboardSiteUrl('javascript:alert(1)')).toBeNull()
    expect(safeDashboardSiteUrl('https://user:secret@example.com')).toBeNull()
    expect(safeDashboardSiteUrl('https://practice.example.com')).toBe(
      'https://practice.example.com/',
    )
  })

  it('accepts only a direct secure Stripe billing portal redirect', () => {
    expect(
      isStripeBillingPortalUrl('https://billing.stripe.com/p/session/test'),
    ).toBe(true)
    for (const url of [
      'https://billing.stripe.com.evil.test/p/session',
      'https://user@billing.stripe.com/p/session',
      'http://billing.stripe.com/p/session',
      'javascript:alert(1)',
      null,
    ])
      expect(isStripeBillingPortalUrl(url)).toBe(false)
  })
})
