import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDraftImageOwner,
  createUploadSessionValue,
  UPLOAD_SESSION_MAX_AGE_SECONDS,
  verifyUploadSessionValue,
} from './upload-session'

describe('upload session capabilities', () => {
  beforeEach(() => {
    process.env.UPLOAD_TOKEN_SECRET = 'test-upload-secret'
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.UPLOAD_TOKEN_SECRET
  })

  it('round-trips a server-generated owner', () => {
    const owner = createDraftImageOwner()
    expect(verifyUploadSessionValue(createUploadSessionValue(owner))).toBe(owner)
  })

  it('rejects tampered or non-draft owners', () => {
    const owner = createDraftImageOwner()
    expect(verifyUploadSessionValue(`${createUploadSessionValue(owner)}x`)).toBeNull()
    expect(verifyUploadSessionValue(createUploadSessionValue('someone-else'))).toBeNull()
    expect(verifyUploadSessionValue(createUploadSessionValue('draft-guessable-name'))).toBeNull()
  })

  it('cryptographically expires copied session values with the cookie', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const value = createUploadSessionValue(createDraftImageOwner())
    expect(verifyUploadSessionValue(value)).not.toBeNull()

    vi.advanceTimersByTime(UPLOAD_SESSION_MAX_AGE_SECONDS * 1000)
    expect(verifyUploadSessionValue(value)).toBeNull()
  })
})
