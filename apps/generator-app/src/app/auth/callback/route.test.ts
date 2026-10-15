import { beforeEach, describe, expect, it, vi } from 'vitest'

const { exchangeCodeForSession, createClient } = vi.hoisted(() => {
  const exchangeCodeForSession = vi.fn()
  return { exchangeCodeForSession, createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession } })) }
})
vi.mock('@/lib/supabase/server', () => ({ createClient }))
import { GET } from './route'

const PUBLIC_STAGE = 'https://dailyclarity-staging.netlify.app'
const INTERNAL_DEPLOYMENT = 'https://6ad037cc5141ef0560905c06--dailyclarity-staging.netlify.app'
const TEST_CODE = 'unit-test-authorization-code'

function callback(origin = INTERNAL_DEPLOYMENT, next?: string, headers?: HeadersInit) {
  const url = new URL('/auth/callback', origin)
  url.searchParams.set('code', TEST_CODE)
  if (next !== undefined) url.searchParams.set('next', next)
  return new Request(url, { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  exchangeCodeForSession.mockResolvedValue({ error: null })
})

describe('public-origin authentication callback', () => {
  it('exchanges the code and keeps the canonical browser cookie origin despite an internal Netlify URL', async () => {
    const response = await GET(callback())
    expect(exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith(TEST_CODE)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('/dashboard')
    const browserTarget = new URL(response.headers.get('location')!, PUBLIC_STAGE)
    expect(browserTarget.origin).toBe(PUBLIC_STAGE)
    expect([...browserTarget.searchParams.keys()]).toEqual([])
  })

  it.each([
    'https://dailyclarity.org',
    'https://hvac.dailyclarity.org',
    'https://legal.dailyclarity.org',
    'https://dental.dailyclarity.org',
    'https://platformbuilder.netlify.app',
    'https://deploy-preview-23--platformbuilder.netlify.app',
    'http://localhost:3000',
  ])('keeps the actual browser origin for %s', async (origin) => {
    const response = await GET(callback(origin, '/dashboard?site=owned-site#billing'))
    const target = new URL(response.headers.get('location')!, origin)
    expect(target.origin).toBe(origin)
    expect(target.pathname).toBe('/dashboard')
    expect(target.searchParams.get('site')).toBe('owned-site')
    expect(target.hash).toBe('#billing')
    expect(target.searchParams.has('code')).toBe(false)
  })

  it('does not let forwarded headers or Host select a redirect authority', async () => {
    const response = await GET(callback(INTERNAL_DEPLOYMENT, '/dashboard', {
      host: 'attacker.example', 'x-forwarded-host': 'attacker.example, dailyclarity.org',
      forwarded: 'host=attacker.example;proto=http', 'x-forwarded-proto': 'http',
    }))
    expect(response.headers.get('location')).toBe('/dashboard')
  })

  it.each(['https://attacker.example', '//attacker.example', '/\\attacker.example', '/%252f%252fattacker.example'])('rejects unsafe next=%s', async (next) => {
    expect((await GET(callback(PUBLIC_STAGE, next))).headers.get('location')).toBe('/dashboard')
  })

  it('removes authorization parameters from the requested destination and nested next', async () => {
    const next = '/dashboard?site=owned-site&code=used-code&token_hash=used-hash&next=' + encodeURIComponent('/portal?slug=owned-site&access_token=used-token')
    const response = await GET(callback(PUBLIC_STAGE, next))
    const target = new URL(response.headers.get('location')!, PUBLIC_STAGE)
    expect([...target.searchParams.keys()]).toEqual(['site', 'next'])
    expect(target.searchParams.get('next')).toBe('/portal?slug=owned-site')
    expect(target.searchParams.get('site')).toBe('owned-site')
  })

  it('preserves legacy portal token links and current fragment links', async () => {
    const legacy = await GET(callback(PUBLIC_STAGE, '/portal?slug=owned-site&token=unit-test-portal-token'))
    expect(legacy.headers.get('location')).toBe('/portal?slug=owned-site&token=unit-test-portal-token')
    const current = await GET(callback(PUBLIC_STAGE, '/portal?slug=owned-site#token=unit-test-portal-token'))
    expect(current.headers.get('location')).toBe('/portal?slug=owned-site#token=unit-test-portal-token')
  })

  it('bounds and validates nested next destinations', async () => {
    const response = await GET(callback(PUBLIC_STAGE, '/dashboard?next=' + encodeURIComponent('//attacker.example')))
    expect(response.headers.get('location')).toBe('/dashboard?next=%2Fdashboard')
  })

  it.each(['missing', 'rejected'])('returns a same-origin login error without forwarding a %s code', async (kind) => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'Invalid unit-test code' } })
    const request = kind === 'missing'
      ? new Request(`${INTERNAL_DEPLOYMENT}/auth/callback?next=%2Fdashboard&token=unused`)
      : callback()
    const response = await GET(request)
    expect(response.headers.get('location')).toBe('/login?error=auth_callback_failed')
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(kind === 'missing' ? 0 : 1)
  })

  it('never caches or sends the credential-bearing callback as a referrer', async () => {
    const response = await GET(callback())
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })
})
