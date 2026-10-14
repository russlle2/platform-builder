import { afterEach, expect, it, vi } from 'vitest'
import { emailBookingKitLink } from './booking-kit-server'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('delivers private credentials transactionally without provider open or link tracking', async () => {
  vi.stubEnv('POSTMARK_SERVER_TOKEN', 'test-only')
  vi.stubEnv('EMAIL_FROM_ADDRESS', 'delivery@example.test')
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ErrorCode: 0 }) })
  vi.stubGlobal('fetch', fetch)
  await emailBookingKitLink('buyer@example.test', 'https://example.test/booking-kit/result#access_token=private-test', '2026-12-24T00:00:00.000Z')
  const body = JSON.parse(fetch.mock.calls[0][1].body)
  expect(body).toMatchObject({ To: 'buyer@example.test', TrackOpens: false, TrackLinks: 'None', MessageStream: 'outbound' })
  expect(body).not.toHaveProperty('Metadata')
  expect(body.TextBody).toContain('private-test')
})
