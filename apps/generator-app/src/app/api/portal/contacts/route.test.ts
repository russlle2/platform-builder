import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { hashPortalToken } from '@/lib/portal-auth'
import { GET } from './route'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  rateLimit: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock('@/lib/server-auth', () => ({ rateLimitByIp: mocks.rateLimit }))

type Row = Record<string, unknown>
type Query = {
  table: string
  columns?: string
  filters: Array<[string, unknown]>
  orders: Array<[string, boolean]>
  bounds?: [number, number]
  update?: Row
}

let sites: Row[]
let contacts: Row[]
let queries: Query[]
let queryError: { code: string; message: string } | null

// Exercise the real ownership and token helpers against a filtering database
// double. Tests fail if either helper drops the tenant/owner constraints.
function from(table: string) {
  const query: Query = { table, filters: [], orders: [] }
  const execute = (single = false) => {
    queries.push(query)
    if (queryError && table === 'contact_messages') return { data: null, error: queryError }
    let rows = (table === 'portal_sites' ? sites : contacts)
      .filter((row) => query.filters.every(([key, value]) => row[key] === value))
    if (query.update) {
      for (const row of rows) Object.assign(row, query.update)
    }
    rows = [...rows].sort((left, right) => {
      for (const [key, ascending] of query.orders) {
        const compare = String(left[key]).localeCompare(String(right[key]))
        if (compare) return ascending ? compare : -compare
      }
      return 0
    })
    if (query.bounds) rows = rows.slice(query.bounds[0], query.bounds[1] + 1)
    // Deliberately return extra columns; the route must still whitelist output.
    return { data: single ? rows[0] || null : rows, error: null }
  }
  const builder = {
    select(columns: string) { query.columns = columns; return builder },
    update(values: Row) { query.update = values; return builder },
    eq(key: string, value: unknown) { query.filters.push([key, value]); return builder },
    is(key: string, value: unknown) { query.filters.push([key, value]); return builder },
    order(key: string, options: { ascending: boolean }) {
      query.orders.push([key, options.ascending]); return builder
    },
    range(start: number, end: number) { query.bounds = [start, end]; return builder },
    maybeSingle: async () => execute(true),
    then(resolve: (result: ReturnType<typeof execute>) => unknown) {
      return Promise.resolve(execute()).then(resolve)
    },
  }
  return builder
}

function request(query = 'slug=alpha-site', headers: Record<string, string> = {}) {
  return new NextRequest(`https://dailyclarity.org/api/portal/contacts?${query}`, { headers })
}

function signIn(id: string, email = `${id}@example.com`, extra: Row = {}) {
  mocks.getUser.mockResolvedValue({
    data: { user: { id, email, email_confirmed_at: '2026-10-01T12:00:00Z', ...extra } },
    error: null,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('PORTAL_TOKEN_SECRET', 'test-secret-not-a-real-credential')
  const expires = new Date(Date.now() + 60_000).toISOString()
  sites = [
    { slug: 'alpha-site', owner_id: 'owner-a', owner_email: 'owner-a@example.com', portal_token_hash: hashPortalToken('alpha-token'), portal_token_expires_at: expires },
    { slug: 'bravo-site', owner_id: 'owner-b', owner_email: 'owner-b@example.com', portal_token_hash: hashPortalToken('bravo-token'), portal_token_expires_at: expires },
  ]
  contacts = [
    { id: 'alpha-1', slug: 'alpha-site', visitor_name: 'Alice', visitor_email: 'alice@example.com', visitor_phone: null, message: 'My appointment inquiry', created_at: '2026-10-14T12:00:00Z', owner_notification_status: 'failed', notification_last_error: 'private-provider-detail', visitor_confirmation_status: 'sent', read: false },
    { id: 'bravo-1', slug: 'bravo-site', visitor_name: 'Bob', visitor_email: 'bob@example.com', visitor_phone: '555-0123', message: 'Other customer message', created_at: '2026-10-14T13:00:00Z', owner_notification_status: 'sent' },
    { id: 'platform-1', slug: null, visitor_name: 'Platform lead', visitor_email: 'lead@example.com', message: 'Platform contact', created_at: '2026-10-14T14:00:00Z' },
  ]
  queries = []
  queryError = null
  mocks.from.mockImplementation(from)
  mocks.createClient.mockReturnValue({ from: mocks.from })
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
  mocks.rateLimit.mockReturnValue(true)
})

afterAll(() => vi.unstubAllEnvs())

describe('owner-scoped contact inbox', () => {
  it('returns only the verified account owner’s messages and safe fields', async () => {
    signIn('owner-a')
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      messages: [{ id: 'alpha-1', name: 'Alice', email: 'alice@example.com', phone: null, message: 'My appointment inquiry', createdAt: '2026-10-14T12:00:00Z', notificationStatus: 'failed' }],
      nextOffset: null,
      paginationLimitReached: false,
    })
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('vary')).toBe('Cookie, Authorization, X-Portal-Token')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://project.supabase.co', 'test-service-role-key',
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    expect(queries.find((query) => query.table === 'contact_messages')).toMatchObject({
      filters: [['slug', 'alpha-site']],
      orders: [['created_at', false], ['id', false]],
      bounds: [0, 20],
    })
    expect(mocks.from).not.toHaveBeenCalledWith('intake_contacts')
  })

  it('rejects changing the slug to another account’s site before reading contacts', async () => {
    signIn('owner-a')
    const response = await GET(request('slug=bravo-site'))
    expect(response.status).toBe(401)
    expect(queries.some((query) => query.table === 'contact_messages')).toBe(false)
  })

  it('does not transfer a claimed site when an email address is reused by a different user ID', async () => {
    signIn('owner-b', 'owner-a@example.com')
    expect((await GET(request())).status).toBe(401)
    expect(sites[0].owner_id).toBe('owner-a')
    expect(queries.some((query) => query.table === 'contact_messages')).toBe(false)
  })

  it('claims only an unclaimed legacy site with the verified account email', async () => {
    sites[0].owner_id = null
    signIn('owner-a')
    expect((await GET(request())).status).toBe(200)
    expect(sites[0].owner_id).toBe('owner-a')
    expect(sites[1].owner_id).toBe('owner-b')
    expect(queries[0]).toMatchObject({
      update: { owner_id: 'owner-a', owner_email: 'owner-a@example.com' },
      filters: [['owner_id', null], ['owner_email', 'owner-a@example.com']],
    })
  })

  it('does not claim an unowned site from an unconfirmed email or forged confirmation metadata', async () => {
    sites[0].owner_id = null
    signIn('owner-a', 'owner-a@example.com', {
      email_confirmed_at: null,
      user_metadata: { email_confirmed_at: '2026-10-01T12:00:00Z', email_verified: true },
    })
    expect((await GET(request())).status).toBe(401)
    expect(sites[0].owner_id).toBeNull()
    expect(queries.some((query) => query.update)).toBe(false)
    expect(queries.some((query) => query.table === 'contact_messages')).toBe(false)
  })

  it('keeps an already claimed owner authorized by immutable ID without a confirmed email', async () => {
    signIn('owner-a', '', { email_confirmed_at: null })
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect((await response.json()).messages.map((message: Row) => message.id)).toEqual(['alpha-1'])
    expect(sites[0].owner_id).toBe('owner-a')
    expect(queries.some((query) => query.update)).toBe(false)
  })

  it('does not trust caller-supplied owner fields or editable user metadata', async () => {
    signIn('owner-b', 'owner-b@example.com', { user_metadata: { owner_id: 'owner-a', email: 'owner-a@example.com' } })
    expect((await GET(request('slug=alpha-site&owner_id=owner-a&owner_email=owner-a%40example.com'))).status).toBe(401)
    expect(queries.some((query) => query.table === 'contact_messages')).toBe(false)
  })

  it('treats missing sites and unauthorized sites identically', async () => {
    const existing = await GET(request())
    const missing = await GET(request('slug=missing-site'))
    expect(existing.status).toBe(401)
    expect(missing.status).toBe(401)
    expect(await missing.json()).toEqual(await existing.json())
    expect(queries.some((query) => query.table === 'contact_messages')).toBe(false)
  })

  it.each(['x-portal-token', 'authorization'])('accepts a matching, unexpired token in %s', async (header) => {
    const response = await GET(request('slug=alpha-site', {
      [header]: header === 'authorization' ? 'Bearer alpha-token' : 'alpha-token',
    }))
    expect(response.status).toBe(200)
    expect((await response.json()).messages.map((message: Row) => message.id)).toEqual(['alpha-1'])
    expect(mocks.getUser).not.toHaveBeenCalled()
  })

  it('rejects another site’s valid token', async () => {
    expect((await GET(request('slug=bravo-site', { 'x-portal-token': 'alpha-token' }))).status).toBe(401)
    expect(queries.some((query) => query.table === 'contact_messages')).toBe(false)
  })

  it.each([null, undefined, 'invalid-date', '2000-01-01T00:00:00Z'])('fails closed for token expiry %s', async (expiry) => {
    sites[0].portal_token_expires_at = expiry
    expect((await GET(request('slug=alpha-site', { 'x-portal-token': 'alpha-token' }))).status).toBe(401)
    expect(queries.some((query) => query.table === 'contact_messages')).toBe(false)
  })

  it('fails closed when a token hash or signing secret is missing', async () => {
    sites[0].portal_token_hash = null
    expect((await GET(request('slug=alpha-site', { 'x-portal-token': 'alpha-token' }))).status).toBe(401)
    sites[0].portal_token_hash = hashPortalToken('alpha-token')
    vi.stubEnv('PORTAL_TOKEN_SECRET', '')
    expect((await GET(request('slug=alpha-site', { 'x-portal-token': 'alpha-token' }))).status).toBe(401)
  })

  it('does not accept portal credentials from query parameters', async () => {
    expect((await GET(request('slug=alpha-site&token=alpha-token'))).status).toBe(401)
    expect(queries.some((query) => query.table === 'contact_messages')).toBe(false)
  })

  it('fails closed when cookie verification fails', async () => {
    mocks.getUser.mockRejectedValue(new Error('untrusted-session-detail'))
    expect((await GET(request())).status).toBe(401)
    expect(queries.some((query) => query.table === 'contact_messages')).toBe(false)
  })

  it('keeps a legitimate signed-in owner authorized despite an expired stored link', async () => {
    signIn('owner-a')
    sites[0].portal_token_expires_at = null
    expect((await GET(request('slug=alpha-site', { 'x-portal-token': 'alpha-token' }))).status).toBe(200)
  })
})

describe('inbox pagination and failures', () => {
  it.each([
    '', 'slug=api', 'slug=Alpha-site', 'slug=alpha--site', 'slug=alpha-site%20',
    'slug=alpha-site&slug=bravo-site', 'slug=alpha-site&offset=-1',
    'slug=alpha-site&offset=10001', 'slug=alpha-site&offset=1.5',
    'slug=alpha-site&offset=', 'slug=alpha-site&limit=0',
    'slug=alpha-site&limit=51', 'slug=alpha-site&limit=2&limit=3',
  ])('rejects malformed or unbounded pagination: %s', async (query) => {
    expect((await GET(request(query))).status).toBe(400)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('uses a stable tiebreaker and reads only one extra row to determine the next page', async () => {
    signIn('owner-a')
    contacts.push({ ...contacts[0], id: 'alpha-2' }, { ...contacts[0], id: 'alpha-3' })
    const first = await (await GET(request('slug=alpha-site&limit=2'))).json()
    expect(first.messages.map((message: Row) => message.id)).toEqual(['alpha-3', 'alpha-2'])
    expect(first.nextOffset).toBe(2)
    const second = await (await GET(request(`slug=alpha-site&limit=2&offset=${first.nextOffset}`))).json()
    expect(second.messages.map((message: Row) => message.id)).toEqual(['alpha-1'])
    expect(second.nextOffset).toBeNull()
    expect(queries.filter((query) => query.table === 'contact_messages').map((query) => query.bounds)).toEqual([[0, 2], [2, 4]])
  })

  it('reports the pagination bound explicitly instead of pretending it reached the last message', async () => {
    signIn('owner-a')
    contacts = Array.from({ length: 10_002 }, (_, index) => ({ ...contacts[0], id: `alpha-${index.toString().padStart(5, '0')}` }))
    const body = await (await GET(request('slug=alpha-site&offset=10000&limit=1'))).json()
    expect(body.messages).toHaveLength(1)
    expect(body.nextOffset).toBeNull()
    expect(body.paginationLimitReached).toBe(true)
  })

  it('returns an empty inbox and maps unexpected notification statuses to unknown', async () => {
    signIn('owner-a')
    contacts[0].owner_notification_status = 'internal-provider-detail'
    const body = await (await GET(request())).json()
    expect(body.messages[0].notificationStatus).toBe('unknown')
    contacts = []
    expect(await (await GET(request())).json()).toEqual({ messages: [], nextOffset: null, paginationLimitReached: false })
  })

  it('does not leak raw database errors or log submitted information', async () => {
    signIn('owner-a')
    queryError = { code: 'XX000', message: 'private-provider-detail alice@example.com alpha-token' }
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const response = await GET(request())
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Unable to load messages. Please try again.' })
      expect(logger).not.toHaveBeenCalled()
      expect(response.headers.get('cache-control')).toContain('no-store')
    } finally {
      logger.mockRestore()
    }
  })

  it('sanitizes thrown provider errors without querying contacts', async () => {
    mocks.from.mockImplementation(() => { throw new Error('private-provider-detail') })
    const response = await GET(request('slug=alpha-site', { 'x-portal-token': 'alpha-token' }))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Unable to load messages. Please try again.' })
  })

  it('fails closed without server credentials and does not fall back to local caches', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const response = await GET(request())
    expect(response.status).toBe(503)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('limits requests before creating a database client', async () => {
    mocks.rateLimit.mockReturnValue(false)
    const response = await GET(request())
    expect(response.status).toBe(429)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
})
