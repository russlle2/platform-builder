import { afterEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { updateSession } from './middleware'

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl

  if (originalAnonKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey
})

describe('updateSession', () => {
  it('keeps public requests available and returns no user when Supabase is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const request = new NextRequest('http://localhost:3000/')
    const { supabaseResponse, user } = await updateSession(request)

    expect(user).toBeNull()
    expect(supabaseResponse.status).toBe(200)
  })
})
