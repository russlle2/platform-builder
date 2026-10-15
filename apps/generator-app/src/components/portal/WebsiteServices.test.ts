import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WebsiteServices, savedNotificationRecipient } from './WebsiteServices'

describe('managed website service guidance', () => {
  it('describes subscription billing without implying customer merchant onboarding or provider health', () => {
    const html = renderToStaticMarkup(createElement(WebsiteServices, {
      context: 'dashboard',
      site: { slug: 'owned-site', data: { stripe_customer_id: 'cus_private_reference', email: 'notifications@example.test' } },
    }))
    expect(html).toContain('Subscription billing only')
    expect(html).toContain('does not set up payments from your own customers')
    expect(html).toContain('href="#billing"')
    expect(html).toContain('/portal?slug=owned-site#inbox')
    expect(html).toContain('notifications@example.test')
    expect(html).toContain('does not confirm delivery')
    expect(html).not.toContain('cus_private_reference')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('Connected')
    expect(html).not.toContain('Email delivery ready')
  })

  it('offers existing support and selected-site actions when billing/notification setup is missing', () => {
    const html = renderToStaticMarkup(createElement(WebsiteServices, { context: 'portal', site: { slug: 'owned-site', data: {} } }))
    expect(html).toContain('Billing reference not linked')
    expect(html).toContain('Notification address needs attention')
    expect(html).toContain('href="/contact"')
    expect(html).toContain('href="#details"')
    expect(html).toContain('href="#inbox"')
    expect(html).not.toContain('Review subscription billing')
  })

  it('matches the actual contact route recipient priority rather than displaying the edited public email', () => {
    expect(savedNotificationRecipient({ email: 'billing@example.test', customerValues: { EMAIL: 'public@example.test' } })).toBe('billing@example.test')
    expect(savedNotificationRecipient({ customerValues: { EMAIL: 'public@example.test' } })).toBe('public@example.test')
    expect(savedNotificationRecipient({ email: '', customerValues: { EMAIL: 'public@example.test' } })).toBeNull()
    expect(savedNotificationRecipient({ email: 'invalid\r\nvalue' })).toBeNull()
  })
})
