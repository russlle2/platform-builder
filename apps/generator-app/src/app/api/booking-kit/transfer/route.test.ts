import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), limited: vi.fn() }))
vi.mock('@/lib/booking-kit-server', () => ({
  bookingKitDatabase: () => ({ rpc: mocks.rpc }),
  hashBookingKitToken: () => 'hashed-credential',
  BOOKING_KIT_PRIVATE_HEADERS: { 'Cache-Control': 'private, no-store, max-age=0' },
}))
vi.mock('@/lib/server-auth', () => ({ rateLimitByIp: mocks.limited }))
const request = (token?: string) => new NextRequest('https://example.test/api/booking-kit/transfer', {
  method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {},
})

describe('private preview-transfer measurement', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.limited.mockReturnValue(true) })
  it('requires a well-formed private credential before querying storage', async () => {
    expect((await POST(request())).status).toBe(401)
    expect((await POST(request('invalid'))).status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('records only a verified active entitlement and sends only its hash to storage', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null })
    const result = await POST(request('x'.repeat(43)))
    expect(result.status).toBe(200)
    expect(result.headers.get('Cache-Control')).toContain('no-store')
    expect(mocks.rpc).toHaveBeenCalledWith('record_booking_kit_transfer', { p_token_hash: 'hashed-credential' })
  })
  it('rejects inactive tokens and reports database failures without leaking details', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null })
    expect((await POST(request('x'.repeat(43)))).status).toBe(401)
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'secret database detail' } })
    const response = await POST(request('x'.repeat(43)))
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('secret')
  })
  it('limits abusive measurement requests', async () => {
    mocks.limited.mockReturnValue(false)
    expect((await POST(request('x'.repeat(43)))).status).toBe(429)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
