import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

type Row = Record<string, unknown>
type ObservedQuery = { table: string; method: string; url: URL; headers: Headers }
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const created = '2026-01-02T00:00:00.000Z'
let tables: Record<string, Row[]>
let queries: ObservedQuery[]
let rowCap: number
let intercept: ((query: ObservedQuery) => Response | undefined) | undefined

function inValues(value: string): string[] {
  return (value.slice(4, -1).match(/"(?:\\.|[^"\\])*"|[^,]+/g) || [])
    .map(item => item.startsWith('"') ? JSON.parse(item) as string : item)
}

// This fetch double receives URLs and headers from the installed real Supabase
// client. It tests the actual projection/filter/count/keyset serialization and
// returns only synthetic records; no provider or database is contacted.
async function databaseFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.origin !== 'https://export-test.supabase.co') throw new Error('Unexpected test network request')
  const table = url.pathname.split('/').at(-1)!
  const query = { table, method: init?.method || 'GET', url, headers: new Headers(init?.headers) }
  queries.push(query)
  const override = intercept?.(query)
  if (override) return override
  const params = url.searchParams
  const idKey = table === 'draft_profiles' ? 'draft_id' : 'id'
  const cutoffColumn = table === 'draft_profiles' ? 'updated_at' : 'created_at'
  const cutoff = params.get('or')?.match(/\.lte\.([^,]+)/)?.[1]
  let rows = [...(tables[table] || [])].filter(row => {
    if (cutoff && row[cutoffColumn] != null && String(row[cutoffColumn]) > cutoff) return false
    const since = params.get('created_at')?.slice(4)
    if (since && (row.created_at == null || String(row.created_at) < since)) return false
    const niche = params.get('niche')?.slice(3)
    if (niche && row.niche !== niche) return false
    const cursor = params.get(idKey)?.slice(3)
    if (cursor && String(row[idKey]) <= cursor) return false
    const email = params.get('email')
    if (email && !inValues(email).includes(String(row.email))) return false
    return true
  }).sort((a, b) => String(a[idKey]).localeCompare(String(b[idKey])))
  const total = rows.length
  if (query.method === 'HEAD') return new Response(null, { headers: { 'content-range': `*/${total}` } })
  rows = rows.slice(0, Math.min(Number(params.get('limit') || rowCap), rowCap))
  const columns = params.get('select')?.split(',') || []
  rows = rows.map(row => Object.fromEntries(columns.map(column => {
    if (!column.includes(':')) return [column, row[column] ?? null]
    const [alias, expression] = column.split(':')
    const path = expression.split('->')
    let value: unknown = row
    for (const part of path) value = value && typeof value === 'object' ? (value as Row)[part] : null
    return [alias, value ?? null]
  })))
  return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json', 'content-range': `0-${Math.max(0, rows.length - 1)}/${total}` } })
}

function request(search = '', authorization: string | null = 'Bearer test-internal-token') {
  return new NextRequest(`https://dailyclarity.org/api/admin/contacts/export${search}`, {
    headers: authorization ? { authorization } : {},
  })
}
function intake(n: number, extra: Row = {}): Row {
  return { id: id(n), email: `person-${n}@example.test`, name: `Person ${n}`, phone: '', business_name: 'Example business', niche: 'wellness_coach', source: 'preview-intake', created_at: created, ...extra }
}
function lead(n: number, extra: Row = {}): Row {
  return { id: id(n), email: '', phone: `555000${String(n).padStart(4, '0')}`, source: 'modal', created_at: created, ...extra }
}
function draft(n: number, email: string, preference: unknown, extra: Row = {}): Row {
  return { draft_id: id(n), email, updated_at: created, profile: {
    businessInfo: { description: 'SYNTHETIC PRIVATE HEALTH NOTE', imageData: 'PRIVATE IMAGE', auth: 'PRIVATE AUTH' },
    communicationPreferences: { marketingEmailOptIn: preference, noticeVersion: 'preview-followup-2026-10-16', recordedAt: created, ...extra },
  } }
}
async function csvRows(response: Response): Promise<Row[]> {
  const text = await response.text()
  const lines = text.split('\n').map(line => line.split(','))
  return lines.slice(1).filter(line => line.length > 1).map(line => Object.fromEntries(lines[0].map((key, index) => [key, line[index]])))
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://export-test.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service-key')
  vi.stubEnv('INTERNAL_ADMIN_TOKEN', 'test-internal-token')
  tables = { intake_contacts: [], lead_captures: [], draft_profiles: [] }
  queries = []; rowCap = 500; intercept = undefined
  vi.stubGlobal('fetch', vi.fn(databaseFetch))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('private owner contact CSV', () => {
  it.each([[null, 401], ['Bearer wrong-token', 403]] as const)('rejects missing or invalid admin authorization (%s) before querying', async (authorization, status) => {
    const response = await GET(request('', authorization))
    expect(response.status).toBe(status)
    expect(queries).toEqual([])
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('fails closed when the admin token is not configured', async () => {
    vi.stubEnv('INTERNAL_ADMIN_TOKEN', '')
    const response = await GET(request())
    expect(response.status).toBe(403)
    expect(queries).toEqual([])
  })

  it('paginates beyond a full page, including a provider cap below the requested page size', async () => {
    tables.lead_captures = Array.from({ length: 507 }, (_, index) => lead(index + 1))
    rowCap = 137
    const response = await GET(request())
    expect(response.status).toBe(200)
    const rows = await csvRows(response)
    expect(rows).toHaveLength(507)
    expect(new Set(rows.map(row => row.lead_record_id)).size).toBe(507)
    expect(response.headers.get('x-export-lead-count')).toBe('507')
    expect(response.headers.get('x-export-row-count')).toBe('507')
    expect(response.headers.get('x-export-complete')).toBe('true')
    const pages = queries.filter(query => query.table === 'lead_captures' && query.method === 'GET')
    expect(pages.map(query => query.url.searchParams.get('id'))).toEqual([null, `gt.${id(137)}`, `gt.${id(274)}`, `gt.${id(411)}`])
    for (const page of pages) {
      expect(page.url.searchParams.get('order')).toBe('id.asc')
      expect(page.headers.get('prefer')).toContain('count=exact')
      expect(page.url.searchParams.get('or')).toContain(response.headers.get('x-export-as-of'))
    }
  })

  it('keeps separate phone-only records even for the same phone, and deduplicates a shared email', async () => {
    tables.intake_contacts = [intake(1)]
    tables.lead_captures = [lead(2, { phone: '5551112222' }), lead(3, { phone: '5551112222' }), lead(4, { email: 'PERSON-1@example.test' })]
    const rows = await csvRows(await GET(request()))
    expect(rows).toHaveLength(3)
    expect(rows.filter(row => row.phone === '5551112222').map(row => row.lead_record_id)).toEqual([id(2), id(3)])
    expect(rows.find(row => row.email === 'person-1@example.test')).toMatchObject({ source_record_count: '2', source: 'modal;preview-intake', name: 'Person 1', phone: '5550000004' })
  })

  it('keeps a nonblank intake phone even when a later modal phone differs', async () => {
    tables.intake_contacts = [intake(1, { phone: '5551112222' })]
    tables.lead_captures = [lead(2, { email: 'person-1@example.test', phone: '5553334444', created_at: '2026-02-01T00:00:00.000Z' })]
    const rows = await csvRows(await GET(request()))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ phone: '5551112222', source_record_count: '2' })
  })

  it('reports absent, false, true, conflicting and incomplete draft preferences without claiming eligibility', async () => {
    tables.intake_contacts = [1, 2, 3, 4, 5, 6].map(n => intake(n))
    tables.draft_profiles = [
      draft(1, 'person-1@example.test', true), draft(2, 'person-2@example.test', false),
      draft(3, 'person-3@example.test', true), draft(4, 'person-3@example.test', false),
      draft(5, 'person-5@example.test', 'true'), draft(6, 'person-6@example.test', true), draft(7, 'person-6@example.test', null),
      draft(8, 'not-exported@example.test', true),
    ]
    rowCap = 2
    const response = await GET(request())
    const rows = await csvRows(response)
    expect(rows.map(row => row.marketing_preference)).toEqual([
      'opted_in_unverified', 'opted_out_unverified', 'conflicting_unverified', 'not_recorded', 'invalid_unverified', 'incomplete_unverified',
    ])
    expect(rows[0]).toMatchObject({ marketing_preference_source: 'browser_draft', marketing_preference_notice: 'preview-followup-2026-10-16', preference_client_recorded_at: created })
    expect(rows[2].preference_draft_count).toBe('2')
    expect(response.headers.get('x-export-draft-count')).toBe('7')
    expect(Object.keys(rows[0])).not.toContain('campaign_eligible')
    const draftQueries = queries.filter(query => query.table === 'draft_profiles')
    expect(draftQueries.length).toBeGreaterThan(2)
    for (const query of draftQueries) {
      expect(inValues(query.url.searchParams.get('email')!)).not.toContain('not-exported@example.test')
      if (query.method === 'GET') {
        expect(query.url.searchParams.get('select')).toBe('draft_id,email,updated_at,marketing_opt_in:profile->communicationPreferences->marketingEmailOptIn,preference_recorded_at:profile->communicationPreferences->recordedAt,preference_notice:profile->communicationPreferences->noticeVersion')
      }
    }
  })

  it('never exports raw draft objects or unknown notice/timestamp content', async () => {
    tables.intake_contacts = [intake(1)]
    tables.draft_profiles = [draft(1, 'person-1@example.test', { private: 'SENSITIVE PREFERENCE VALUE' }, {
      noticeVersion: 'SENSITIVE NOTICE VALUE', recordedAt: 'SENSITIVE TIMESTAMP VALUE',
    })]
    const text = await (await GET(request())).text()
    expect(text).toContain('invalid_unverified,browser_draft,unrecognized,,')
    expect(text).not.toMatch(/SENSITIVE|PRIVATE|HEALTH|imageData|businessInfo|campaign_eligible/)
  })

  it('escapes unusual email literals before client URL encoding and bounds recipient batches', async () => {
    const unusual = 'name,"tag\\value"@example.test'
    tables.intake_contacts = [intake(1, { email: unusual }), ...Array.from({ length: 54 }, (_, n) => intake(n + 2))]
    tables.draft_profiles = [draft(1, unusual, false)]
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('x-export-draft-count')).toBe('1')
    expect(await response.text()).toContain('opted_out_unverified')
    const groups = queries.filter(query => query.table === 'draft_profiles' && query.method === 'GET')
    expect(groups).toHaveLength(2)
    expect(groups.flatMap(query => inValues(query.url.searchParams.get('email')!))).toContain(unusual)
    expect(groups.every(query => inValues(query.url.searchParams.get('email')!).length <= 50)).toBe(true)
  })

  it('preserves niche/since filtering and explicitly excludes unclassified modal leads for a niche export', async () => {
    tables.intake_contacts = [intake(1), intake(2, { niche: 'sound_bath' }), intake(3, { created_at: '2025-01-01T00:00:00.000Z' })]
    tables.lead_captures = [lead(4)]
    const response = await GET(request('?niche=wellness_coach&since=2026-01-01'))
    expect(await csvRows(response)).toHaveLength(1)
    expect(response.headers.get('x-export-lead-scope')).toBe('excluded-by-niche-filter')
    expect(queries.some(query => query.table === 'lead_captures')).toBe(false)
  })

  it('neutralizes CSV formulas after whitespace and quotes embedded comma, quote and newline', async () => {
    tables.intake_contacts = [intake(1, { name: '\n\t=HYPERLINK("https://example.test")', business_name: 'Example, "Clinic"' })]
    const response = await GET(request())
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    const text = await response.text()
    expect(text).toContain('"\'\n\t=HYPERLINK(""https://example.test"")"')
    expect(text).toContain('"Example, ""Clinic"""')
  })

  it('returns an explicit private error instead of a partial CSV on a later query failure', async () => {
    tables.lead_captures = [lead(1), lead(2)]
    rowCap = 1
    intercept = query => query.table === 'lead_captures' && query.url.searchParams.has('id')
      ? new Response(JSON.stringify({ code: 'XX000', message: 'PRIVATE PROVIDER PAYLOAD person@example.test' }), { status: 400 }) : undefined
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await GET(request())
    expect(response.status).toBe(502)
    expect(response.headers.get('x-export-complete')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const body = await response.text()
    expect(body).toContain('No partial export')
    expect(body).not.toMatch(/PRIVATE|person@example/)
    expect(log).not.toHaveBeenCalled()
  })

  it('rejects a premature empty page despite an exact remaining count', async () => {
    tables.lead_captures = [lead(1)]
    intercept = query => query.table === 'lead_captures' && query.method === 'GET'
      ? new Response('[]', { headers: { 'content-range': '*/1' } }) : undefined
    const response = await GET(request())
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ code: 'incomplete' })
  })

  it('refuses results without an exact count', async () => {
    intercept = () => new Response('[]')
    const response = await GET(request())
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ code: 'incomplete' })
  })

  it('detects a backdated concurrent insert behind the keyset cursor during final count verification', async () => {
    tables.lead_captures = [lead(2), lead(3)]
    rowCap = 1
    intercept = query => {
      if (query.table === 'lead_captures' && query.url.searchParams.get('id') === `gt.${id(2)}`) tables.lead_captures.push(lead(1))
      return undefined
    }
    const response = await GET(request())
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'changed' })
  })

  it('excludes inserts after the export cutoff and retains legacy null timestamps', async () => {
    tables.lead_captures = [lead(1, { created_at: null }), lead(2)]
    rowCap = 1
    intercept = query => {
      if (query.table === 'lead_captures' && query.url.searchParams.get('id') === `gt.${id(1)}`) {
        tables.lead_captures.push(lead(3, { created_at: '2099-01-01T00:00:00.000Z' }))
      }
      return undefined
    }
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await csvRows(response)).toHaveLength(2)
  })

  it('refuses an oversized result before consuming an unbounded table', async () => {
    intercept = () => new Response('[]', { headers: { 'content-range': '*/10001' } })
    const response = await GET(request())
    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: 'limit' })
    expect(queries).toHaveLength(1)
  })

  it('bounds requests when a tiny provider row cap would require excessive pages', async () => {
    tables.lead_captures = Array.from({ length: 130 }, (_, index) => lead(index + 1))
    rowCap = 1
    const response = await GET(request())
    expect(response.status).toBe(413)
    expect(queries).toHaveLength(128)
    expect(await response.json()).toMatchObject({ code: 'limit' })
  })

  it.each(['not-a-date', '2026-02-30', '2026-02-30T12:00:00Z', '2026-01-01T25:00:00Z'])('rejects invalid since filter %s before any data request', async since => {
    const response = await GET(request(`?since=${encodeURIComponent(since)}`))
    expect(response.status).toBe(400)
    expect(queries).toEqual([])
  })
})
