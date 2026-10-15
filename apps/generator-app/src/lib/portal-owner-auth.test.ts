import type { SupabaseClient, User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }))

import { claimPortalSitesForUser, isAuthenticatedPortalOwnerForSlug } from './portal-owner-auth'

type Portal = { slug: string; owner_id: string | null; owner_email: string }
const confirmedUser = { id: 'owner-id', email: 'owner@example.test', email_confirmed_at: '2026-10-15T00:00:00Z' }

function database(rows: Portal[]) {
  const update = vi.fn((values: Partial<Portal>) => ({
    is: (column: keyof Portal, value: unknown) => ({
      eq: async (otherColumn: keyof Portal, otherValue: unknown) => {
        for (const row of rows) if (row[column] === value && row[otherColumn] === otherValue) Object.assign(row, values)
        return { error: null }
      },
    }),
  }))
  const from = vi.fn(() => ({
    update,
    select: () => {
      const filters = new Map<keyof Portal, unknown>()
      const query = {
        eq: (column: keyof Portal, value: unknown) => { filters.set(column, value); return query },
        maybeSingle: async () => ({
          data: rows.find(row => [...filters].every(([key, value]) => row[key] === value)) || null,
          error: null,
        }),
      }
      return query
    },
  }))
  return { serviceClient: { from } as unknown as SupabaseClient, from, update }
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://auth.example.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key')
  getUser.mockReset()
})
afterEach(() => vi.unstubAllEnvs())

describe('legacy portal ownership claims', () => {
  it('requires Auth email confirmation even when user metadata claims verification', async () => {
    const rows = [{ slug: 'legacy', owner_id: null, owner_email: confirmedUser.email }]
    const { serviceClient, from } = database(rows)
    const unconfirmedUser = { ...confirmedUser, email_confirmed_at: undefined, user_metadata: { email_verified: true } }
    getUser.mockResolvedValue({ data: { user: unconfirmedUser } })

    await claimPortalSitesForUser(serviceClient, unconfirmedUser)
    expect(from).not.toHaveBeenCalled()
    await expect(isAuthenticatedPortalOwnerForSlug(serviceClient, 'legacy')).resolves.toBe(false)
    expect(rows[0].owner_id).toBeNull()
  })

  it('claims matching unowned rows once after confirmation without taking an already-owned row', async () => {
    const rows: Portal[] = [
      { slug: 'legacy', owner_id: null, owner_email: confirmedUser.email },
      { slug: 'someone-else', owner_id: 'previous-owner-id', owner_email: confirmedUser.email },
      { slug: 'different-email', owner_id: null, owner_email: 'different@example.test' },
    ]
    const { serviceClient } = database(rows)
    await claimPortalSitesForUser(serviceClient, { ...confirmedUser, email: ' OWNER@example.test ' })
    expect(rows.map(row => row.owner_id)).toEqual(['owner-id', 'previous-owner-id', null])
    getUser.mockResolvedValue({ data: { user: confirmedUser } })
    await expect(isAuthenticatedPortalOwnerForSlug(serviceClient, 'legacy')).resolves.toBe(true)
    await expect(isAuthenticatedPortalOwnerForSlug(serviceClient, 'someone-else')).resolves.toBe(false)
  })

  it.each([undefined, 'changed@example.test'])('keeps immutable owner access with unconfirmed email %s', async email => {
    const { serviceClient, update } = database([{ slug: 'owned', owner_id: confirmedUser.id, owner_email: confirmedUser.email }])
    getUser.mockResolvedValue({ data: { user: { id: confirmedUser.id, email, email_confirmed_at: undefined } } })
    await expect(isAuthenticatedPortalOwnerForSlug(serviceClient, 'owned')).resolves.toBe(true)
    expect(update).not.toHaveBeenCalled()
  })

  it('does not authorize a different immutable owner even with the same confirmed email', async () => {
    const { serviceClient } = database([{ slug: 'owned', owner_id: 'previous-owner-id', owner_email: confirmedUser.email }])
    getUser.mockResolvedValue({ data: { user: confirmedUser } })
    await expect(isAuthenticatedPortalOwnerForSlug(serviceClient, 'owned')).resolves.toBe(false)
  })

  it('denies a request when Auth cannot verify a user', async () => {
    const { serviceClient, from } = database([])
    getUser.mockRejectedValue(new Error('Auth unavailable'))
    await expect(isAuthenticatedPortalOwnerForSlug(serviceClient, 'owned')).resolves.toBe(false)
    expect(from).not.toHaveBeenCalled()
  })

  it('propagates a failed ownership write instead of reporting a successful claim', async () => {
    const serviceClient = { from: () => ({ update: () => ({ is: () => ({ eq: async () => ({ error: { message: 'database unavailable' } }) }) }) }) } as unknown as SupabaseClient
    await expect(claimPortalSitesForUser(serviceClient, confirmedUser as User)).rejects.toThrow('portal_owner_claim:database unavailable')
  })
})
