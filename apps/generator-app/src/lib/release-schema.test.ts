import { afterEach, describe, expect, it, vi } from 'vitest'
import { inspectReleaseSchema } from './release-schema'

afterEach(() => vi.unstubAllGlobals())
describe('combined deployment schema gate', () => {
  it('requires website and durable payment-evidence schemas even with kit sales disabled', async () => {
    const fetch = vi.fn().mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith('launch_schema_readiness') ? { ready: true, schemaVersion: '20260903.3' } : '20260925.2' }))
    vi.stubGlobal('fetch', fetch)
    expect((await inspectReleaseSchema('https://project.supabase.co', 'private', 'project')).ready).toBe(true)
    fetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith('launch_schema_readiness') ? { ready: true, schemaVersion: '20260903.3' } : '20260925.1' }))
    expect((await inspectReleaseSchema('https://project.supabase.co', 'private', 'project')).ready).toBe(false)
  })
  it.each(['http://project.supabase.co', 'https://other.supabase.co', 'https://project.supabase.co/path', 'https://user@project.supabase.co', 'https://project.supabase.co?other=1'])('never sends a credential to an unpinned origin %s', async (url) => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect((await inspectReleaseSchema(url, 'private', 'project')).ready).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('fails closed on missing RPCs and transport errors', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', fetch)
    expect((await inspectReleaseSchema('https://project.supabase.co', 'private', 'project')).ready).toBe(false)
    fetch.mockRejectedValue(new Error('network unavailable'))
    expect((await inspectReleaseSchema('https://project.supabase.co', 'private', 'project')).ready).toBe(false)
  })
})
