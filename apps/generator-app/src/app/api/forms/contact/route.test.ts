import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  rateLimit: vi.fn(),
  notifyOwner: vi.fn(),
  confirmVisitor: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/email', () => ({
  sendContactNotification: mocks.notifyOwner,
  sendContactConfirmation: mocks.confirmVisitor,
}))
vi.mock('@/lib/server-auth', () => ({
  rateLimitByIp: mocks.rateLimit,
  jsonTooManyRequests: () => new Response(null, { status: 429 }),
}))

type Row = Record<string, unknown>
type Query = {
  table: string
  filters: Array<[string, unknown]>
  insert?: Row
  update?: Row
}

let sites: Row[]
let reservations: Row[]
let messages: Row[]
let queries: Query[]
let insertFails: boolean

// Filter by the route's real tenant constraints, so omitting or changing a slug
// cannot accidentally succeed against a universal mock response.
function from(table: string) {
  const query: Query = { table, filters: [] }
  const execute = (single = false) => {
    queries.push(query)
    const rows = table === 'portal_sites' ? sites
      : table === 'site_slugs' ? reservations
        : table === 'contact_messages' ? messages
          : null
    if (!rows) throw new Error('Unexpected table in contact test')
    if (query.insert) {
      if (insertFails) return { data: null, error: { message: 'Storage unavailable' } }
      const inserted = { id: `message-${messages.length + 1}`, ...query.insert }
      rows.push(inserted)
      return { data: inserted, error: null }
    }
    const matched = rows.filter((row) => query.filters.every(([key, value]) => row[key] === value))
    if (query.update) for (const row of matched) Object.assign(row, query.update)
    return { data: single ? matched[0] || null : matched, error: null }
  }
  const builder = {
    select() { return builder },
    eq(key: string, value: unknown) { query.filters.push([key, value]); return builder },
    insert(values: Row) { query.insert = values; return builder },
    update(values: Row) { query.update = values; return builder },
    single: async () => execute(true),
    maybeSingle: async () => execute(true),
    then(resolve: (value: ReturnType<typeof execute>) => unknown) {
      return Promise.resolve(execute()).then(resolve)
    },
  }
  return builder
}

async function submit(body: Row = {}, origin = 'https://dailyclarity.example') {
  const { POST } = await import('./route')
  return POST(new NextRequest('https://dailyclarity.example/api/forms/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      slug: '', name: 'Visitor', email: 'visitor@example.test',
      message: 'Please help with my website.', ...body,
    }),
  }))
}

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('POSTMARK_SERVER_TOKEN', 'test-postmark-token')
  vi.stubEnv('EMAIL_FROM_ADDRESS', 'sender@example.test')
  vi.stubEnv('CONTACT_EMAIL_ADDRESS', 'platform-support@example.test')
  vi.stubEnv('PLATFORM_OWNER_EMAIL', 'platform-owner@example.test')
  sites = [
    { slug: 'bravo-site', data: { email: 'bravo-owner@example.test', businessName: 'Bravo' } },
    { slug: 'alpha-site', data: { email: ' alpha-owner@example.test ', businessName: 'Alpha', customerValues: { EMAIL: 'alpha-public@example.test' } } },
  ]
  reservations = [
    { slug: 'bravo-site', status: 'provisioned', site_url: 'https://platform-bravo-site.netlify.app' },
    { slug: 'alpha-site', status: 'provisioned', site_url: 'https://platform-alpha-site.netlify.app' },
  ]
  messages = []
  queries = []
  insertFails = false
  mocks.from.mockImplementation(from)
  mocks.createClient.mockReturnValue({ from: mocks.from })
  mocks.rateLimit.mockReturnValue(true)
  mocks.notifyOwner.mockImplementation(async () => {
    expect(messages).toHaveLength(1)
    return undefined
  })
  mocks.confirmVisitor.mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('platform contact recipient and reply address', () => {
  it('saves first, trims the configured support recipient, and sends replies to that recipient', async () => {
    vi.stubEnv('CONTACT_EMAIL_ADDRESS', ' platform-support@example.test ')
    const response = await submit()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, deliveryStatus: 'sent' })
    expect(mocks.notifyOwner).toHaveBeenCalledExactlyOnceWith({
      ownerEmail: 'platform-support@example.test', visitorName: 'Visitor',
      visitorEmail: 'visitor@example.test', visitorPhone: '',
      message: 'Please help with my website.', siteName: 'DailyClarity',
    })
    expect(mocks.confirmVisitor).toHaveBeenCalledExactlyOnceWith({
      visitorEmail: 'visitor@example.test', visitorName: 'Visitor', siteName: 'DailyClarity',
      replyTo: 'platform-support@example.test',
    })
    expect(messages).toEqual([expect.objectContaining({
      id: 'message-1', slug: null, visitor_email: 'visitor@example.test',
      owner_notification_status: 'sent', visitor_confirmation_status: 'sent',
      notification_last_error: null,
    })])
    expect(queries.filter((query) => query.update)).toEqual([
      expect.objectContaining({ table: 'contact_messages', filters: [['id', 'message-1']] }),
    ])
  })

  it.each([
    '', 'first@example.test,second@example.test', 'first@example.test;second@example.test',
    'Display Name <first@example.test>', 'first@example.test\r\nBcc:other@example.test',
  ])('uses the validated platform owner when configured support is absent or invalid: %j', async (configured) => {
    vi.stubEnv('CONTACT_EMAIL_ADDRESS', configured)
    vi.stubEnv('PLATFORM_OWNER_EMAIL', ' platform-owner@example.test ')
    expect((await submit()).status).toBe(200)
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ ownerEmail: 'platform-owner@example.test' }))
    expect(mocks.confirmVisitor).toHaveBeenCalledWith(expect.objectContaining({ replyTo: 'platform-owner@example.test' }))
    expect(messages[0].owner_notification_status).toBe('sent')
  })

  it.each(['', 'first@example.test,second@example.test', 'first@example.test\nBcc:other@example.test'])('stores for review without inventing an owner recipient: %j', async (owner) => {
    vi.stubEnv('CONTACT_EMAIL_ADDRESS', '')
    vi.stubEnv('PLATFORM_OWNER_EMAIL', owner)
    const response = await submit()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, deliveryStatus: 'stored_for_review' })
    expect(mocks.notifyOwner).not.toHaveBeenCalled()
    expect(mocks.confirmVisitor).toHaveBeenCalledWith(expect.objectContaining({ replyTo: undefined }))
    expect(messages[0]).toMatchObject({ owner_notification_status: 'no_recipient', visitor_confirmation_status: 'sent' })
  })
})

describe('tenant recipient isolation', () => {
  it('notifies the selected private owner but gives visitors only the public Reply-To', async () => {
    const response = await submit({ slug: 'alpha-site' }, 'https://platform-alpha-site.netlify.app')
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://platform-alpha-site.netlify.app')
    expect(mocks.notifyOwner).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ ownerEmail: 'alpha-owner@example.test', siteName: 'Alpha' }))
    expect(mocks.confirmVisitor).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ replyTo: 'alpha-public@example.test', siteName: 'Alpha' }))
    expect(JSON.stringify(mocks.confirmVisitor.mock.calls)).not.toContain('alpha-owner@example.test')
    expect(messages[0]).toMatchObject({ slug: 'alpha-site', owner_notification_status: 'sent' })
    expect(queries.find((query) => query.table === 'portal_sites')?.filters).toEqual([['slug', 'alpha-site']])
  })

  it('uses that site’s public email only when a separate owner email is absent', async () => {
    sites[1].data = { customerValues: { EMAIL: ' alpha-public@example.test ', BUSINESS_NAME: 'Alpha Practice' } }
    expect((await submit({ slug: 'alpha-site' })).status).toBe(200)
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ ownerEmail: 'alpha-public@example.test', siteName: 'Alpha Practice' }))
    expect(mocks.confirmVisitor).toHaveBeenCalledWith(expect.objectContaining({ replyTo: 'alpha-public@example.test' }))
  })

  it.each([
    '', 'first@example.test,second@example.test', 'first@example.test;second@example.test',
    'Name <first@example.test>', 'first@example.test\r\nBcc:other@example.test',
  ])('never falls back to another tenant or platform recipient when the saved tenant address is invalid: %j', async (email) => {
    sites[1].data = { email, customerValues: { EMAIL: 'alpha-public@example.test' } }
    const response = await submit({ slug: 'alpha-site' })
    expect(await response.json()).toEqual({ ok: true, deliveryStatus: 'stored_for_review' })
    expect(mocks.notifyOwner).not.toHaveBeenCalled()
    expect(mocks.confirmVisitor).toHaveBeenCalledWith(expect.objectContaining({ replyTo: 'alpha-public@example.test' }))
    expect(messages[0]).toMatchObject({ slug: 'alpha-site', owner_notification_status: 'no_recipient' })
  })

  it.each([undefined, '', 'invalid', 'first@example.test,second@example.test'])('does not expose a private recipient when public contact email is %j', async (publicEmail) => {
    sites[1].data = { email: 'private-owner@example.test', customerValues: { EMAIL: publicEmail } }
    expect((await submit({ slug: 'alpha-site' })).status).toBe(200)
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ ownerEmail: 'private-owner@example.test' }))
    expect(mocks.confirmVisitor).toHaveBeenCalledWith(expect.objectContaining({ replyTo: undefined }))
    expect(JSON.stringify(mocks.confirmVisitor.mock.calls)).not.toContain('private-owner@example.test')
  })

  it('keeps notifications private after the public contact address is edited', async () => {
    sites[1].data = {
      email: 'private-owner@example.test',
      customerValues: { EMAIL: 'updated-public@example.test' },
    }
    expect((await submit({ slug: 'alpha-site', accountEmail: 'request-injection@example.test' })).status).toBe(200)
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ ownerEmail: 'private-owner@example.test' }))
    expect(mocks.confirmVisitor).toHaveBeenCalledWith(expect.objectContaining({ replyTo: 'updated-public@example.test' }))
  })

  it('keeps a missing tenant portal row from selecting the platform fallback', async () => {
    sites = sites.filter((site) => site.slug !== 'alpha-site')
    const response = await submit({ slug: 'alpha-site' })
    expect(await response.json()).toEqual({ ok: true, deliveryStatus: 'stored_for_review' })
    expect(mocks.notifyOwner).not.toHaveBeenCalled()
    expect(messages[0].owner_notification_status).toBe('no_recipient')
  })

  it('rejects another site’s Origin before storage or email', async () => {
    const response = await submit({ slug: 'alpha-site' }, 'https://platform-bravo-site.netlify.app')
    expect(response.status).toBe(403)
    expect(messages).toHaveLength(0)
    expect(mocks.notifyOwner).not.toHaveBeenCalled()
    expect(mocks.confirmVisitor).not.toHaveBeenCalled()
  })
})

describe('invalid contact inputs and delivery failures', () => {
  it.each([
    { email: 'first@example.test,second@example.test' },
    { email: 'first@example.test;second@example.test' },
    { email: 'first@example.test\r\nBcc:other@example.test' },
    { name: 'Visitor\r\nBcc:other@example.test' },
    { phone: '555-0100\nBcc:other@example.test' },
  ])('rejects multiple addresses and header injection before storage or delivery: %j', async (body) => {
    expect((await submit(body)).status).toBe(400)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(messages).toHaveLength(0)
    expect(mocks.notifyOwner).not.toHaveBeenCalled()
    expect(mocks.confirmVisitor).not.toHaveBeenCalled()
  })

  it('keeps a saved message when owner notification fails and never claims delivery', async () => {
    mocks.notifyOwner.mockRejectedValue(new Error('Provider rejected request'))
    const response = await submit()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, deliveryStatus: 'stored_for_review' })
    expect(messages[0]).toMatchObject({ owner_notification_status: 'failed', visitor_confirmation_status: 'sent' })
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1)
  })

  it('records visitor failure independently from accepted owner notification', async () => {
    mocks.confirmVisitor.mockRejectedValue(new Error('Provider rejected confirmation'))
    expect(await (await submit()).json()).toEqual({ ok: true, deliveryStatus: 'sent' })
    expect(messages[0]).toMatchObject({ owner_notification_status: 'sent', visitor_confirmation_status: 'failed' })
  })

  it('stores without sending when Postmark is not configured', async () => {
    vi.stubEnv('POSTMARK_SERVER_TOKEN', '')
    expect(await (await submit()).json()).toEqual({ ok: true, deliveryStatus: 'stored_for_review' })
    expect(messages[0]).toMatchObject({ owner_notification_status: 'not_configured', visitor_confirmation_status: 'not_configured', notification_attempted_at: null })
    expect(mocks.notifyOwner).not.toHaveBeenCalled()
    expect(mocks.confirmVisitor).not.toHaveBeenCalled()
  })

  it('sends no email if the message could not be stored', async () => {
    insertFails = true
    expect((await submit()).status).toBe(500)
    expect(messages).toHaveLength(0)
    expect(mocks.notifyOwner).not.toHaveBeenCalled()
    expect(mocks.confirmVisitor).not.toHaveBeenCalled()
  })

  it('returns a retry instruction without an invented mailbox when storage is unconfigured', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const response = await submit()
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Contact submissions are temporarily unavailable. Please try again later.' })
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.notifyOwner).not.toHaveBeenCalled()
  })
})
