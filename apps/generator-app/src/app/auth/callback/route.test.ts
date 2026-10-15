import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { chromium, type Browser } from '@playwright/test'

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
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', PUBLIC_STAGE)
  vi.stubEnv('NODE_ENV', 'production')
  exchangeCodeForSession.mockResolvedValue({ error: null })
})

afterEach(() => vi.unstubAllEnvs())

async function completionTarget(response: Response) {
  expect(response.status).toBe(200)
  expect(response.headers.get('location')).toBeNull()
  const html = await response.text()
  const value = html.match(/<a href="([^"]*)"/)?.[1]
  expect(value).toBeTruthy()
  return new URL(value!.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))
}

describe('public-origin authentication callback', () => {
  it('exchanges the code and keeps the canonical browser cookie origin despite an internal Netlify URL', async () => {
    const response = await GET(callback())
    expect(exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith(TEST_CODE)
    const browserTarget = await completionTarget(response)
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
  ])('uses the configured trusted origin for %s', async (origin) => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', origin)
    if (origin.startsWith('http:')) vi.stubEnv('NODE_ENV', 'development')
    const response = await GET(callback(INTERNAL_DEPLOYMENT, '/dashboard?site=owned-site#billing'))
    const target = await completionTarget(response)
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
    expect((await completionTarget(response)).href).toBe(PUBLIC_STAGE + '/dashboard')
  })

  it.each(['https://attacker.example', '//attacker.example', '/\\attacker.example', '/%252f%252fattacker.example'])('rejects unsafe next=%s', async (next) => {
    expect((await completionTarget(await GET(callback(PUBLIC_STAGE, next)))).href).toBe(PUBLIC_STAGE + '/dashboard')
  })

  it('removes authorization parameters from the requested destination and nested next', async () => {
    const next = '/dashboard?site=owned-site&code=used-code&token_hash=used-hash&next=' + encodeURIComponent('/portal?slug=owned-site&access_token=used-token')
    const response = await GET(callback(PUBLIC_STAGE, next))
    const target = await completionTarget(response)
    expect([...target.searchParams.keys()]).toEqual(['site', 'next'])
    expect(target.searchParams.get('next')).toBe('/portal?slug=owned-site')
    expect(target.searchParams.get('site')).toBe('owned-site')
  })

  it('preserves legacy portal token links and current fragment links', async () => {
    const legacy = await GET(callback(PUBLIC_STAGE, '/portal?slug=owned-site&token=unit-test-portal-token'))
    expect((await completionTarget(legacy)).href).toBe(PUBLIC_STAGE + '/portal?slug=owned-site&token=unit-test-portal-token')
    const current = await GET(callback(PUBLIC_STAGE, '/portal?slug=owned-site#token=unit-test-portal-token'))
    expect((await completionTarget(current)).href).toBe(PUBLIC_STAGE + '/portal?slug=owned-site#token=unit-test-portal-token')
  })

  it('bounds and validates nested next destinations', async () => {
    const response = await GET(callback(PUBLIC_STAGE, '/dashboard?next=' + encodeURIComponent('//attacker.example')))
    expect((await completionTarget(response)).href).toBe(PUBLIC_STAGE + '/dashboard?next=%2Fdashboard')
  })

  it.each(['missing', 'rejected'])('returns a same-origin login error without forwarding a %s code', async (kind) => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'Invalid unit-test code' } })
    const request = kind === 'missing'
      ? new Request(`${INTERNAL_DEPLOYMENT}/auth/callback?next=%2Fdashboard&token=unused`)
      : callback()
    const response = await GET(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(PUBLIC_STAGE + '/login?error=auth_callback_failed')
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(kind === 'missing' ? 0 : 1)
  })

  it('never caches or sends the credential-bearing callback as a referrer', async () => {
    const response = await GET(callback())
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })
})

describe('callback completion response security', () => {
  it.each(['', 'not-a-url', 'http://dailyclarity.org'])('fails closed before exchanging a code with invalid production origin %s', async (origin) => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', origin)
    const response = await GET(callback())
    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('contains only the escaped safe destination, without the used authorization code or executable content', async () => {
    const response = await GET(callback(PUBLIC_STAGE, '/dashboard?site=" onclick="alert(1)\'>&code=used-code&next=' + encodeURIComponent('/portal?token_hash=used-hash')))
    const body = await response.text()
    expect(body).not.toContain(TEST_CODE)
    expect(body).not.toContain('used-code')
    expect(body).not.toContain('used-hash')
    expect(body).not.toMatch(/<script|<img|<iframe|<form/)
    expect(body).toContain('&amp;next=')
    expect(body).toContain('%27%3E')
    expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
  })
})

describe('browser callback completion', () => {
  let browser: Browser
  beforeAll(async () => { browser = await chromium.launch() })
  afterAll(async () => { await browser?.close() })

  it.each([
    ['/dashboard', '/dashboard'],
    ['/dashboard?site=owned-site&code=used-code#billing', '/dashboard?site=owned-site#billing'],
    ['//attacker.example/path', '/dashboard'],
    ['/dashboard?site=" onclick="alert(1)\'>', '/dashboard?site=%22+onclick%3D%22alert%281%29%27%3E'],
  ])('navigates without JavaScript to the exact safe destination for %s', async (next, expected) => {
    const response = await GET(callback(INTERNAL_DEPLOYMENT, next))
    const body = await response.text()
    const headers = Object.fromEntries(response.headers.entries())
    // Browser transport fixture: Next's route-handler cookie mutation is merged
    // by the framework. Verify that cookies on the resulting 200 response survive
    // the meta refresh; the real provider sign-in remains a separate release gate.
    headers['set-cookie'] = 'auth-fixture=session-established; Path=/; Secure; HttpOnly; SameSite=Lax'
    const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' })
    const destinationRequests: { url: string; cookie?: string; referrer?: string }[] = []
    try {
      await context.route('**/*', async route => {
        const request = route.request()
        const url = new URL(request.url())
        if (url.origin !== PUBLIC_STAGE) throw new Error('Unexpected browser destination')
        if (url.pathname === '/auth/callback') {
          await route.fulfill({ status: response.status, headers, body })
        } else {
          const requestHeaders = await request.allHeaders()
          destinationRequests.push({ url: request.url(), cookie: requestHeaders.cookie, referrer: requestHeaders.referer })
          await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Signed in</h1>' })
        }
      })
      const page = await context.newPage()
      await page.goto(`${PUBLIC_STAGE}/auth/callback?code=${TEST_CODE}`, { waitUntil: 'domcontentloaded' })
      await page.waitForURL(PUBLIC_STAGE + expected)
      await page.getByRole('heading', { name: 'Signed in' }).waitFor()
      expect(page.url()).toBe(PUBLIC_STAGE + expected)
      expect(new URL(page.url()).searchParams.has('code')).toBe(false)
      expect(destinationRequests).toHaveLength(1)
      expect(destinationRequests[0].cookie).toContain('auth-fixture=session-established')
      expect(destinationRequests[0].referrer).toBeUndefined()
      expect(destinationRequests[0].url).not.toContain(TEST_CODE)
    } finally { await context.close() }
  })
})
