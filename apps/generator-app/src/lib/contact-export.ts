import type { SupabaseClient } from '@supabase/supabase-js'

const PAGE_SIZE = 500
const MAX_RECORDS = 10_000
const MAX_REQUESTS = 128
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const NOTICE_VERSION = 'preview-followup-2026-10-16'
const DRAFT_COLUMNS = [
  'draft_id', 'email', 'updated_at',
  'marketing_opt_in:profile->communicationPreferences->marketingEmailOptIn',
  'preference_recorded_at:profile->communicationPreferences->recordedAt',
  'preference_notice:profile->communicationPreferences->noticeVersion',
].join(',')

type Row = Record<string, unknown>
type Page = { data: unknown; error: unknown; count: number | null }
type PageQuery = (cursor: string | null, head: boolean) => PromiseLike<Page>
type Failure = 'query' | 'changed' | 'incomplete' | 'limit'

export class ContactExportError extends Error {
  readonly status: number
  constructor(readonly code: Failure) {
    super({
      query: 'Unable to read contacts. No partial export was returned. Please retry.',
      changed: 'Contact records changed during export. No partial export was returned. Please retry.',
      incomplete: 'The database returned incomplete export results. No partial export was returned.',
      limit: 'This export exceeds its bounded size or request limit. Use a narrower since or niche filter.',
    }[code])
    this.status = code === 'limit' ? 413 : code === 'changed' ? 409 : 502
  }
}

class ExportBudget {
  private records = 0
  private requests = 0
  readonly signal = AbortSignal.timeout(25_000)
  addRecords(count: number) {
    this.records += count
    if (this.records > MAX_RECORDS) throw new ContactExportError('limit')
  }
  async request(query: PageQuery, cursor: string | null, head: boolean): Promise<Page> {
    if (++this.requests > MAX_REQUESTS) throw new ContactExportError('limit')
    this.signal.throwIfAborted()
    const result = await query(cursor, head)
    if (result.error) throw new ContactExportError('query')
    if (!Number.isSafeInteger(result.count) || result.count === null || result.count < 0) {
      throw new ContactExportError('incomplete')
    }
    return result
  }
}

// Keyset pagination advances by the last actual returned ID, so a Data API cap
// smaller than PAGE_SIZE cannot silently skip the remainder of a page. Exact
// remaining counts and a final total detect truncation and membership changes.
async function readAll(query: PageQuery, idKey: 'id' | 'draft_id', budget: ExportBudget): Promise<Row[]> {
  const rows: Row[] = []
  let total: number | null = null
  let cursor: string | null = null
  while (true) {
    const result = await budget.request(query, cursor, false)
    const count = result.count!
    if (total === null) { total = count; budget.addRecords(total) }
    else if (count !== total - rows.length) throw new ContactExportError('changed')
    if (!Array.isArray(result.data) || result.data.length > Math.min(PAGE_SIZE, count)
      || (count > 0 && result.data.length === 0)) throw new ContactExportError('incomplete')
    for (const value of result.data) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ContactExportError('incomplete')
      const row = value as Row
      const id = row[idKey]
      if (typeof id !== 'string' || !UUID.test(id) || (cursor !== null && id.toLowerCase() <= cursor)) {
        throw new ContactExportError('incomplete')
      }
      cursor = id.toLowerCase()
      rows.push(row)
    }
    if (rows.length === total) break
  }
  const final = await budget.request(query, null, true)
  if (final.count !== total) throw new ContactExportError('changed')
  return rows
}

function text(value: unknown): string { return typeof value === 'string' ? value : '' }
function timestamp(value: unknown): string {
  const input = text(value)
  return /^\d{4}-\d{2}-\d{2}T[\d:.+Z-]+$/.test(input) && input.length <= 40 && Number.isFinite(Date.parse(input))
    ? new Date(input).toISOString() : ''
}
function emailKey(value: unknown): string { return text(value).trim().toLowerCase() }
function escapeCsv(value: string): string {
  // Protect formula prefixes even after tabs/newlines/other leading whitespace.
  const inert = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value
  return /[,"\n\r]/.test(inert) ? `"${inert.replace(/"/g, '""')}"` : inert
}

// PostgREST IN literals require both backslashes and quotes to be escaped.
// The installed client's .in() only wraps reserved characters, so use this
// narrow literal serializer and let the client perform URL encoding.
function emailLiteral(email: string): string {
  return `"${email.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

// Bound URL length as well as recipient count.
function emailBatches(emails: string[]): string[][] {
  const batches: string[][] = []
  let batch: string[] = []
  let size = 0
  for (const email of emails) {
    const encoded = encodeURIComponent(emailLiteral(email)).length + 3
    if (email.length > 320 || encoded > 3_000) throw new ContactExportError('incomplete')
    if (batch.length >= 50 || size + encoded > 3_000) { batches.push(batch); batch = []; size = 0 }
    batch.push(email); size += encoded
  }
  if (batch.length) batches.push(batch)
  return batches
}

function summarizePreferences(drafts: Row[]) {
  const choices = new Set(drafts.map(row => row.marketing_opt_in))
  const hasTrue = choices.has(true), hasFalse = choices.has(false)
  let preference = 'not_recorded'
  if (hasTrue && hasFalse) preference = 'conflicting_unverified'
  else if (choices.size === 1 && hasTrue) preference = 'opted_in_unverified'
  else if (choices.size === 1 && hasFalse) preference = 'opted_out_unverified'
  else if (hasTrue || hasFalse) preference = 'incomplete_unverified'
  else if ([...choices].some(value => value !== null && value !== undefined)) preference = 'invalid_unverified'
  const notices = [...new Set(drafts.map(row => row.preference_notice === NOTICE_VERSION
    ? NOTICE_VERSION : row.preference_notice == null ? 'not_recorded' : 'unrecognized'))].sort()
  return [
    preference,
    drafts.length ? 'browser_draft' : 'not_recorded',
    notices.join(';'),
    drafts.map(row => timestamp(row.preference_recorded_at)).filter(Boolean).sort().at(-1) || '',
    drafts.map(row => timestamp(row.updated_at)).filter(Boolean).sort().at(-1) || '',
    String(drafts.length),
  ]
}

export async function buildContactExport(client: SupabaseClient, filters: { niche: string | null; since: string | null }) {
  const asOf = new Date().toISOString()
  const budget = new ExportBudget()
  const contactQuery = (table: 'intake_contacts' | 'lead_captures'): PageQuery => (cursor, head) => {
    const columns = table === 'intake_contacts'
      ? 'id,email,name,phone,business_name,niche,source,created_at'
      : 'id,email,phone,source,created_at'
    let query = client.from(table).select(head ? 'id' : columns, { count: 'exact', head })
      .or(`created_at.lte.${asOf},created_at.is.null`)
      .order('id', { ascending: true }).abortSignal(budget.signal)
    if (filters.niche && table === 'intake_contacts') query = query.eq('niche', filters.niche)
    if (filters.since) query = query.gte('created_at', filters.since)
    if (cursor) query = query.gt('id', cursor)
    return head ? query : query.range(0, PAGE_SIZE - 1)
  }
  const intake = await readAll(contactQuery('intake_contacts'), 'id', budget)
  // Modal leads have no niche. Preserve the existing explicit niche scope.
  const leads = filters.niche ? [] : await readAll(contactQuery('lead_captures'), 'id', budget)
  const emails = [...new Set([...intake, ...leads].map(row => emailKey(row.email)).filter(Boolean))].sort()
  const draftsByEmail = new Map<string, Row[]>()
  let draftCount = 0
  for (const batch of emailBatches(emails)) {
    const query: PageQuery = (cursor, head) => {
      let request = client.from('draft_profiles').select(head ? 'draft_id' : DRAFT_COLUMNS, { count: 'exact', head })
        .filter('email', 'in', `(${batch.map(emailLiteral).join(',')})`).or(`updated_at.lte.${asOf},updated_at.is.null`)
        .order('draft_id', { ascending: true }).abortSignal(budget.signal)
      if (cursor) request = request.gt('draft_id', cursor)
      return head ? request : request.range(0, PAGE_SIZE - 1)
    }
    for (const row of await readAll(query, 'draft_id', budget)) {
      const email = emailKey(row.email)
      if (!batch.includes(email)) throw new ContactExportError('incomplete')
      draftsByEmail.set(email, [...(draftsByEmail.get(email) || []), row])
      draftCount++
    }
  }

  const byIdentity = new Map<string, { row: Row; sources: Set<string>; records: number; identity: string }>()
  // Prefer the intake summary, then the newest modal submission for an email.
  // Phone-only records retain their own IDs, even when phone numbers match.
  const newestFirst = (a: Row, b: Row) => text(b.created_at).localeCompare(text(a.created_at)) || text(a.id).localeCompare(text(b.id))
  for (const row of [...intake.sort(newestFirst), ...leads.sort(newestFirst)]) {
    const email = emailKey(row.email)
    const identity = email ? `email:${email}` : `lead:${text(row.id)}`
    const existing = byIdentity.get(identity)
    if (existing) {
      existing.sources.add(text(row.source)); existing.records++
      // Preserve a supplied modal phone when the preferred intake summary has
      // none. Never replace a nonblank phone or deduplicate people by phone.
      if (!text(existing.row.phone).trim() && text(row.phone).trim()) existing.row = { ...existing.row, phone: row.phone }
      continue
    }
    byIdentity.set(identity, { row, identity, sources: new Set([text(row.source)]), records: 1 })
  }
  const rows = [...byIdentity.values()].sort((a, b) => newestFirst(a.row, b.row) || a.identity.localeCompare(b.identity))
  const header = [
    'email', 'name', 'phone', 'business_name', 'niche', 'source', 'created_at',
    'source_record_count', 'lead_record_id', 'marketing_preference', 'marketing_preference_source',
    'marketing_preference_notice', 'preference_client_recorded_at', 'preference_draft_updated_at', 'preference_draft_count',
  ]
  const csvRows = rows.map(({ row, sources, records }) => [
    text(row.email), text(row.name), text(row.phone), text(row.business_name), text(row.niche),
    [...sources].sort().join(';'), text(row.created_at), String(records), emailKey(row.email) ? '' : text(row.id),
    ...summarizePreferences(draftsByEmail.get(emailKey(row.email)) || []),
  ].map(escapeCsv).join(','))
  return { csv: [header.join(','), ...csvRows].join('\n'), rows: rows.length, intake: intake.length, leads: leads.length, drafts: draftCount, asOf }
}
