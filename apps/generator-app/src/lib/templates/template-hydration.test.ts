import { describe, expect, it } from 'vitest'
import { hydrateTemplate } from './template-hydration'

describe('hydrateTemplate', () => {
  it('merges concrete defaults under non-empty customer values', () => {
    const html = '<h1>{{BUSINESS_NAME}}</h1><p>{{TAGLINE}}</p>'
    const fields = [
      { name: 'BUSINESS_NAME', type: 'text', default: 'Wellness Practice' },
      { name: 'TAGLINE', type: 'text', default: 'Care for real life' },
    ]

    expect(hydrateTemplate(html, { BUSINESS_NAME: 'North Star', TAGLINE: '' }, fields))
      .toBe('<h1>North Star</h1><p>Care for real life</p>')
  })

  it('resolves practitioner and phone aliases in either direction', () => {
    const html = '<p>{{PRACTITIONER_NAME}}</p><a href="tel:{{PHONE}}">{{PHONE_NUMBER}}</a>'
    const values = { OWNER_NAME: 'Avery Chen', PHONE_NUMBER: '+1 (212) 555-0199' }

    expect(hydrateTemplate(html, values)).toBe(
      '<p>Avery Chen</p><a href="tel:+1 (212) 555-0199">+1 (212) 555-0199</a>',
    )
  })

  it('escapes text and rejects unsafe URL and invalid contact values', () => {
    const html = [
      '<h1>{{BUSINESS_NAME}}</h1>',
      '<a href="{{PRIMARY_CTA_URL}}">Go</a>',
      '<a href="mailto:{{EMAIL}}">{{EMAIL}}</a>',
    ].join('')
    const fields = [
      { name: 'PRIMARY_CTA_URL', type: 'url', default: '/book.html' },
      { name: 'EMAIL', type: 'email', default: 'team@example.com' },
    ]

    expect(hydrateTemplate(html, {
      BUSINESS_NAME: '<img src=x onerror=alert(1)>',
      PRIMARY_CTA_URL: 'javascript:alert(1)',
      EMAIL: 'not-an-email\r\nBcc: victim@example.com',
    }, fields)).toBe(
      '<h1>&lt;img src=x onerror=alert(1)&gt;</h1>' +
      '<a href="/book.html">Go</a>' +
      '<a href="mailto:team@example.com">team@example.com</a>',
    )
  })

  it('normalizes plain website domains and clears undeclared tokens', () => {
    expect(hydrateTemplate(
      '<a href="{{WEBSITE}}">Site</a><p>{{UNKNOWN_TOKEN}}</p>',
      { website: 'example.com/about' },
      [{ name: 'WEBSITE', type: 'url' }],
    )).toBe('<a href="https://example.com/about">Site</a><p></p>')
  })

  it('does not re-inject token-valued defaults', () => {
    expect(hydrateTemplate(
      '<h1>{{BUSINESS_NAME}}</h1>',
      {},
      [{ name: 'BUSINESS_NAME', default: '{{BUSINESS_NAME}}' }],
    )).toBe('<h1></h1>')
  })
})
