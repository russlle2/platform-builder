import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const { updateSession } = vi.hoisted(() => ({ updateSession: vi.fn() }))
vi.mock('@/lib/supabase/middleware', () => ({ updateSession }))
import middleware from './middleware'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://dailyclarity-staging.netlify.app')
  updateSession.mockResolvedValue({ supabaseResponse: NextResponse.next(), user: null })
})

afterEach(() => vi.unstubAllEnvs())

describe('dashboard authentication redirects', () => {
  it('stays on the public cookie origin and preserves the requested website', async () => {
    const request = new NextRequest('https://6ad037cc5141ef0560905c06--dailyclarity-staging.netlify.app/dashboard?site=owned-site', {
      headers: { 'x-forwarded-host': 'attacker.example' },
    })
    const response = await middleware(request)
    expect(response.headers.get('location')).toBe('https://dailyclarity-staging.netlify.app/login?next=%2Fdashboard%3Fsite%3Downed-site')
    // Netlify constructs URL(Location) without a base for middleware responses.
    expect(new URL(response.headers.get('location')!).origin).toBe('https://dailyclarity-staging.netlify.app')
  })

  it('does not carry used callback credentials into login or its next parameter', async () => {
    const response = await middleware(new NextRequest('https://dailyclarity-staging.netlify.app/dashboard?code=used-code&refresh_token=used-token&site=owned-site'))
    expect(response.headers.get('location')).toBe('https://dailyclarity-staging.netlify.app/login?next=%2Fdashboard%3Fsite%3Downed-site')
  })

  it('fails closed when production has no trusted public origin', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    const response = await middleware(new NextRequest('https://attacker.example/dashboard'))
    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('preserves local development redirects without production configuration', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    const response = await middleware(new NextRequest('http://localhost:3000/dashboard'))
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fdashboard')
  })

  it('preserves session cookie cleanup when a visitor needs to sign in', async () => {
    const sessionResponse = NextResponse.next()
    sessionResponse.cookies.set('expired-unit-test-session', '', { maxAge: 0, path: '/', httpOnly: true })
    updateSession.mockResolvedValue({ supabaseResponse: sessionResponse, user: null })
    const response = await middleware(new NextRequest('https://dailyclarity.org/dashboard'))
    expect(response.cookies.get('expired-unit-test-session')).toMatchObject({ value: '', maxAge: 0, path: '/', httpOnly: true })
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  })

  it('allows an authenticated dashboard request without redirecting', async () => {
    updateSession.mockResolvedValue({ supabaseResponse: NextResponse.next(), user: { id: 'verified-test-user' } })
    const response = await middleware(new NextRequest('https://dailyclarity.org/dashboard?site=owned-site'))
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })
})

// The server-to-server hook must keep its existing five-second delivery budget.
describe('signed Auth email hook middleware boundary', () => {
  it('does not make an Auth session round trip for the exact hook path', async () => {
    const response = await middleware(new NextRequest('https://dailyclarity-staging.netlify.app/api/auth/send-email'))
    expect(updateSession).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  })
})
