import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import middleware from './middleware'

const mocks = vi.hoisted(() => ({ updateSession: vi.fn() }))
vi.mock('@/lib/supabase/middleware', () => ({ updateSession: mocks.updateSession }))

describe('signed Auth email hook middleware boundary', () => {
  it('does not make an Auth session round trip for the exact hook path', async () => {
    const response = await middleware(new NextRequest('https://dailyclarity-staging.netlify.app/api/auth/send-email'))
    expect(mocks.updateSession).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  })
})
