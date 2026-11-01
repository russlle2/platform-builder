import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  contactUsageOperation, reserveSiteUsage, usageFingerprint, usageOperation,
  reserveCustomerImage, assertCustomerServiceEntitled, readSiteUsage,
} from './site-usage'

const id = '00000000-0000-4000-8000-000000000001'
function client(data: unknown, error: unknown = null) {
  return { rpc: vi.fn().mockResolvedValue({ data, error }) } as unknown as SupabaseClient
}

describe('server-owned usage operations', () => {
  it('binds a browser UUID to a deterministic hash of sanitized details', () => {
    expect(usageFingerprint({ a: 1, b: { x: 2, y: 3 } })).toBe(usageFingerprint({ b: { y: 3, x: 2 }, a: 1 }))
    expect(usageOperation('site', 'publish', { name: 'A' }, id)).toEqual({ slug: 'site', metric: 'publish', id, fingerprint: usageFingerprint({ name: 'A' }) })
    expect(usageOperation('site', 'publish', { name: 'B' }, id).fingerprint).not.toBe(usageFingerprint({ name: 'A' }))
    expect(usageOperation('site', 'publish', {}, 'malicious-key').id).toMatch(/^[a-f0-9-]{36}$/)
  })
  it('coalesces old form retries without storing contact text in the ledger', () => {
    const first = contactUsageOperation('site', { email: 'private@example.test' }, undefined, 300_001)
    expect(contactUsageOperation('site', { email: 'private@example.test' }, undefined, 599_999)).toEqual(first)
    expect(contactUsageOperation('site', { email: 'private@example.test' }, undefined, 600_001).id).not.toBe(first.id)
    expect(JSON.stringify(first)).not.toContain('private@example.test')
    expect(contactUsageOperation('site', {}, id, 600_001).id).toBe(id)
  })
  it('rejects database errors and malformed allowance responses before any action', async () => {
    const operation = usageOperation('site', 'publish', {}, id)
    for (const value of [null, {}, { state: 'reserved', used: '1', limit: 30 }, { state: 'completed', status: 200, body: [] }]) {
      await expect(reserveSiteUsage(client(value), operation)).rejects.toMatchObject({ code: 'usage_unavailable', status: 503 })
    }
    await expect(reserveSiteUsage(client({ state: 'reserved' }, { message: 'offline' }), operation)).rejects.toMatchObject({ status: 503 })
  })
  it('returns an explicit no-extra-charge limit response with a UTC reset', async () => {
    await expect(reserveSiteUsage(client({ state: 'limited', resetAt: '2099-02-01T00:00:00Z' }), usageOperation('site', 'publish', {}, id)))
      .rejects.toMatchObject({ status: 429, message: expect.stringContaining('No extra charge was made.'), resetAt: '2099-02-01T00:00:00Z' })
  })
  it('fails closed when billing verification is missing or not a supported tier', async () => {
    await expect(assertCustomerServiceEntitled(client(null), 'site')).rejects.toMatchObject({ status: 503 })
    await expect(assertCustomerServiceEntitled(client({ allowed: true, tier: null }), 'site')).rejects.toMatchObject({ status: 402 })
    await expect(assertCustomerServiceEntitled(client({ allowed: true, tier: 'trial' }), 'site')).resolves.toBeUndefined()
  })
  it('distinguishes a full customer allowance from the shared draft capacity', async () => {
    await expect(reserveCustomerImage(client({ state: 'limited' }), 'site', 'site/a.webp', 1)).rejects.toMatchObject({ status: 409, code: 'image_storage_limit' })
    await expect(reserveCustomerImage(client({ state: 'platform_capacity' }), 'site', 'site/a.webp', 1)).rejects.toMatchObject({ status: 503, code: 'preview_storage_capacity' })
  })
  it('keeps a broken usage read from implying unlimited allowance', async () => {
    expect(await readSiteUsage(client(null), 'site')).toBeNull()
    expect(await readSiteUsage(client({ resetAt: '2099-02-01', entitlement: { allowed: true } }), 'site')).toBeNull()
  })
})
