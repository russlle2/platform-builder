import { describe, expect, it } from 'vitest'
import { readBoundedJson } from './bounded-json'

describe('readBoundedJson', () => {
  it('parses JSON within the byte budget', async () => {
    const request = new Request('https://dailyclarity.test/api/preview', {
      method: 'POST',
      body: JSON.stringify({ business: 'Daily Clarity' }),
    })

    await expect(readBoundedJson(request, 1_024)).resolves.toEqual({
      ok: true,
      value: { business: 'Daily Clarity' },
    })
  })

  it('rejects a declared oversized payload before reading it', async () => {
    const request = new Request('https://dailyclarity.test/api/preview', {
      method: 'POST',
      headers: { 'content-length': '2048' },
      body: '{}',
    })

    await expect(readBoundedJson(request, 1_024)).resolves.toEqual({
      ok: false,
      reason: 'too_large',
    })
  })

  it('enforces the real streamed byte count when Content-Length is absent', async () => {
    const request = new Request('https://dailyclarity.test/api/preview', {
      method: 'POST',
      body: JSON.stringify({ value: 'x'.repeat(1_024) }),
    })

    await expect(readBoundedJson(request, 128)).resolves.toEqual({
      ok: false,
      reason: 'too_large',
    })
  })

  it('rejects malformed or empty JSON', async () => {
    const malformed = new Request('https://dailyclarity.test/api/preview', {
      method: 'POST',
      body: '{',
    })
    const empty = new Request('https://dailyclarity.test/api/preview', { method: 'POST' })

    await expect(readBoundedJson(malformed, 1_024)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    })
    await expect(readBoundedJson(empty, 1_024)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    })
  })
})
