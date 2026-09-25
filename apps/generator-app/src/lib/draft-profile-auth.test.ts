import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDraftProfileSession, verifyDraftProfileSession } from './draft-profile-auth'

describe('draft profile sessions', () => {
  beforeEach(() => {
    process.env.DRAFT_PROFILE_SECRET = 'test-draft-secret'
  })

  afterEach(() => {
    delete process.env.DRAFT_PROFILE_SECRET
  })

  it('binds a signed session to an opaque draft ID', () => {
    const draftId = '3f77bd45-4447-4c67-8c28-2a9ef73898d4'
    const value = createDraftProfileSession(draftId)
    expect(verifyDraftProfileSession(value)).toBe(draftId)
  })

  it('rejects tampering', () => {
    const value = createDraftProfileSession('3f77bd45-4447-4c67-8c28-2a9ef73898d4')
    expect(verifyDraftProfileSession(`${value}x`)).toBeNull()
  })

  it('rejects user-controlled identifiers such as email addresses', () => {
    expect(createDraftProfileSession('owner@example.com')).toBeNull()
  })
})
