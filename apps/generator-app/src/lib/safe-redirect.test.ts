import { describe, expect, it } from 'vitest'
import { getSafeRedirectPath } from './safe-redirect'

describe('getSafeRedirectPath', () => {
  it('preserves an internal path, query, and fragment', () => {
    expect(getSafeRedirectPath('/portal?site=my-practice#settings')).toBe(
      '/portal?site=my-practice#settings'
    )
  })

  it.each([
    'https://example.com/phishing',
    '//example.com/phishing',
    '/\\example.com/phishing',
    '/%5cexample.com/phishing',
    '/%2f%2fexample.com/phishing',
    '/%252f%252fexample.com/phishing',
    '/dashboard%0d%0aLocation:%20https://example.com',
    ' /dashboard',
    '/dashboard ',
    '%2Fdashboard',
  ])('rejects unsafe or ambiguous destination %s', (value) => {
    expect(getSafeRedirectPath(value)).toBe('/dashboard')
  })

  it('uses the supplied safe fallback when no destination is present', () => {
    expect(getSafeRedirectPath(null, '/portal')).toBe('/portal')
  })

  it('uses the site root when the fallback itself is unsafe', () => {
    expect(getSafeRedirectPath(null, 'https://example.com')).toBe('/')
  })
})
