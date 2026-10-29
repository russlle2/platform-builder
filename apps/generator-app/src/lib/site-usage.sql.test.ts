// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { PAID_SITE_ALLOWANCE, TRIAL_SITE_ALLOWANCE } from './usage-allowances'

let db: PGlite
const hash = 'a'.repeat(64)
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
const draft = `draft-${id(1000)}`
async function result(sql: string, args: unknown[] = []) {
  return (await db.query<{ result: Record<string, unknown> }>(sql, args)).rows[0].result
}
const claim = (owner: string, metric: string, n: number, fingerprint = hash) => result(
  'select public.reserve_site_usage($1,$2,$3,$4) as result', [owner, metric, id(n), fingerprint],
)
const image = (owner: string, n: number, bytes = 1) => result(
  'select public.reserve_customer_image($1,$2,$3) as result', [owner, `${owner}/${n}.webp`, bytes],
)

beforeAll(async () => {
  db = new PGlite()
  await db.waitReady
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema storage;
    create table storage.objects (bucket_id text, name text, metadata jsonb);
    grant usage on schema storage to service_role;
    grant select on storage.objects to service_role;
    create table public.fixture_entitlements (slug text primary key, value jsonb);
    grant select, update on public.fixture_entitlements to service_role;
    create function public.customer_service_entitlement(p_slug text) returns jsonb
      language plpgsql security invoker set search_path = '' as $$
      declare v_value jsonb;
      begin
        select value into v_value from public.fixture_entitlements where slug=p_slug for update;
        return coalesce(v_value,'{"allowed":false,"reason":"unverified"}'::jsonb);
      end $$;
  `)
  await db.exec(await readFile(new URL('../../supabase/migrations/20261029183330_enforce_site_usage_allowances.sql', import.meta.url), 'utf8'))
}, 30_000)
beforeEach(async () => {
  await db.exec(`
    reset role;
    truncate public.site_usage_operations, public.site_usage_counters, public.customer_image_reservations,
      storage.objects, public.fixture_entitlements;
    insert into public.fixture_entitlements values
      ('paid','{"allowed":true,"tier":"paid","reason":"active","validThrough":"2099-01-01T00:00:00Z"}'),
      ('trial','{"allowed":true,"tier":"trial","reason":"active","validThrough":"2099-01-01T00:00:00Z"}'),
      ('expired','{"allowed":false,"tier":null,"reason":"expired"}'),
      ('malformed','{"allowed":true,"tier":null}'),
      ('stale','{"allowed":true,"tier":"paid","validThrough":"2020-01-01T00:00:00Z"}'),
      ('missing-expiry','{"allowed":true,"tier":"paid"}');
    set role service_role;
  `)
})
afterAll(async () => { await db?.close() })

describe('durable monthly allowances', () => {
  it('enforces the advertised paid and trial publish limits across settled attempts', async () => {
    const attempt = async (owner: string, n: number) => {
      const response = await claim(owner, 'publish', n)
      if (response.state === 'reserved') await db.query('select public.finish_site_usage($1,$2,$3,$4,200,$5)', [owner,'publish',id(n),hash,{ ok: true }])
      return response
    }
    const paid = []
    for (let n = 0; n < 35; n++) paid.push(await attempt('paid', n))
    expect(paid.filter(x => x.state === 'reserved')).toHaveLength(PAID_SITE_ALLOWANCE.publishes)
    expect(paid.filter(x => x.state === 'limited')).toHaveLength(5)
    const trials = []
    for (let n = 0; n < 7; n++) trials.push(await attempt('trial', n))
    expect(trials.filter(x => x.state === 'reserved')).toHaveLength(TRIAL_SITE_ALLOWANCE.publishes)
    expect(trials.filter(x => x.state === 'limited')).toHaveLength(2)
  })
  it('serializes distinct publication requests until the preceding outcome is settled', async () => {
    const attempts = await Promise.all(Array.from({ length: 8 }, (_, n) => claim('paid', 'publish', n)))
    expect(attempts.filter(x => x.state === 'reserved')).toHaveLength(1)
    expect(attempts.filter(x => x.state === 'pending')).toHaveLength(7)
    expect((await result("select public.site_usage_status('paid') as result")).publish).toEqual({ used: 1, limit: 30 })
    await db.query('select public.finish_site_usage($1,$2,$3,$4,200,$5)', ['paid','publish',id(0),hash,{ ok: true }])
    expect((await claim('paid', 'publish', 10)).state).toBe('reserved')
  })
  it('enforces contact counts independently of publishing', async () => {
    const contacts = await db.query<{ result: Record<string, unknown> }>(`
      select public.reserve_site_usage('paid','contact', '00000000-0000-4000-8000-' || lpad(n::text,12,'0'), $1) as result
      from generate_series(1,201) n`, [hash])
    expect(contacts.rows.filter(x => x.result.state === 'reserved')).toHaveLength(PAID_SITE_ALLOWANCE.contacts)
    expect(contacts.rows.at(-1)?.result.state).toBe('limited')
    expect((await claim('paid', 'publish', 1)).state).toBe('reserved')
  })
  it('preserves unknown operations and binds replay to the exact details', async () => {
    expect((await claim('paid', 'publish', 1)).state).toBe('reserved')
    expect((await claim('paid', 'publish', 1)).state).toBe('pending')
    expect((await claim('paid', 'publish', 1, 'b'.repeat(64))).state).toBe('conflict')
    const usage = await result("select public.site_usage_status('paid') as result")
    expect(usage.publish).toEqual({ used: 1, limit: 30 })
    await db.query('select public.finish_site_usage($1,$2,$3,$4,200,$5)', ['paid','publish',id(1),hash,{ ok: true, republished: true }])
    expect(await claim('paid', 'publish', 1)).toEqual({ state: 'completed', status: 200, body: { ok: true, republished: true } })
  })
  it('replays completed operations across month boundaries without another claim', async () => {
    await claim('paid', 'publish', 1)
    await db.query('select public.finish_site_usage($1,$2,$3,$4,200,$5)', ['paid','publish',id(1),hash,{ ok: true }])
    await db.exec(`reset role;
      insert into public.site_usage_counters values ('paid','2020-01-01','publish',1);
      update public.site_usage_operations set period='2020-01-01';
      update public.site_usage_counters set used=0 where period<>'2020-01-01';
      update public.fixture_entitlements set value='{"allowed":false,"reason":"expired"}' where slug='paid';
      set role service_role;`)
    expect((await claim('paid', 'publish', 1)).state).toBe('completed')
    expect((await result("select public.site_usage_status('paid') as result")).publish).toEqual({ used: 0, limit: 30 })
    expect((await claim('paid', 'publish', 2)).state).toBe('ineligible')
  })
  it('releases a known unused reservation once and can safely retry it', async () => {
    await claim('paid', 'publish', 1)
    const release = () => db.query<{ released: boolean }>('select public.release_site_usage($1,$2,$3,$4) as released', ['paid','publish',id(1),hash])
    expect((await release()).rows[0].released).toBe(true)
    expect((await release()).rows[0].released).toBe(false)
    expect((await result("select public.site_usage_status('paid') as result")).publish).toEqual({ used: 0, limit: 30 })
    expect((await claim('paid', 'publish', 1)).state).toBe('reserved')
  })
  it('fails closed for expired, missing, and malformed entitlements', async () => {
    for (const owner of ['expired', 'missing', 'malformed', 'stale', 'missing-expiry']) {
      expect((await claim(owner, 'publish', 1)).state).toBe('ineligible')
      expect((await image(owner, 1)).state).toBe('ineligible')
    }
  })
})

describe('authoritative image storage reservations', () => {
  it('counts concurrent pending bytes before accepting another upload', async () => {
    const uploads = await Promise.all(Array.from({ length: 6 }, (_, n) => image('trial', n, 4 * 1024 * 1024)))
    expect(uploads.filter(x => x.state === 'reserved')).toHaveLength(5)
    expect(uploads.at(-1)?.state).toBe('limited')
    expect(await result("select public.customer_image_usage('trial') as result")).toEqual({ bytes: TRIAL_SITE_ALLOWANCE.imageBytes, objects: 5 })
  })
  it('enforces the object-count allowance even for tiny files', async () => {
    const uploads = await Promise.all(Array.from({ length: 21 }, (_, n) => image(draft, n)))
    expect(uploads.filter(x => x.state === 'reserved')).toHaveLength(TRIAL_SITE_ALLOWANCE.imageObjects)
    expect(uploads.at(-1)?.state).toBe('limited')
  })
  it('counts stored bytes and pending reservations without double counting the same upload', async () => {
    await image('paid', 1, 100)
    await db.exec(`reset role;
      insert into storage.objects values ('customer-images','paid/1.webp','{"size":100}');
      set role service_role;`)
    expect(await result("select public.customer_image_usage('paid') as result")).toEqual({ bytes: 100, objects: 1 })
    await db.query("select public.confirm_customer_image('paid','paid/1.webp')")
    expect(await result("select public.customer_image_usage('paid') as result")).toEqual({ bytes: 100, objects: 1 })
    expect((await image('paid', 1, 100)).state).toBe('conflict')
  })
  it('retains legacy oversized objects but refuses additional storage', async () => {
    await db.exec(`reset role;
      insert into storage.objects values ('customer-images','paid/legacy.webp','{"size":104857600}');
      set role service_role;`)
    expect((await image('paid', 1)).state).toBe('limited')
    expect((await result("select public.customer_image_usage('paid') as result")).bytes).toBe(PAID_SITE_ALLOWANCE.imageBytes)
  })
  it('enforces a global outstanding draft ceiling across fresh guest identities', async () => {
    await db.exec(`reset role;
      insert into storage.objects values ('customer-images','draft-${id(2000)}/legacy.webp','{"size":10737418240}');
      set role service_role;`)
    expect((await image(draft, 1)).state).toBe('platform_capacity')
    expect((await image(`draft-${id(3000)}`, 1)).state).toBe('platform_capacity')
    expect((await image('paid', 1)).state).toBe('reserved')
  })
  it('does not free uncertain uploads merely because a caller retries', async () => {
    await image('paid', 1, 100)
    expect((await image('paid', 1, 100)).state).toBe('conflict')
    const confirmation = await db.query<{ confirmed: boolean }>("select public.confirm_customer_image('paid','paid/1.webp') as confirmed")
    expect(confirmation.rows[0].confirmed).toBe(false)
    expect(await result("select public.customer_image_usage('paid') as result")).toEqual({ bytes: 100, objects: 1 })
  })
  it('only clears deletion reservations when the exact stored object is absent', async () => {
    await image('paid', 1, 100)
    await db.exec(`reset role;
      insert into storage.objects values ('customer-images','paid/1.webp','{"size":100}');
      set role service_role;`)
    const release = () => db.query<{ released: boolean }>("select public.release_deleted_customer_image('paid','paid/1.webp') as released")
    expect((await release()).rows[0].released).toBe(false)
    await db.exec("reset role; delete from storage.objects; set role service_role;")
    expect((await release()).rows[0].released).toBe(true)
    expect(await result("select public.customer_image_usage('paid') as result")).toEqual({ bytes: 0, objects: 0 })
  })
  it('fails closed when authoritative object size metadata is unknown', async () => {
    await db.exec(`reset role; insert into storage.objects values ('customer-images','paid/legacy.webp','{}'); set role service_role;`)
    await expect(image('paid', 1)).rejects.toThrow('image_usage_unknown')
  })
})

it('keeps tables and RPCs inaccessible to public and signed-in clients', async () => {
  await db.exec('reset role')
  for (const role of ['anon', 'authenticated']) {
    for (const table of ['site_usage_counters','site_usage_operations','customer_image_reservations']) {
      const privileges = (await db.query<{ allowed: boolean }>('select has_table_privilege($1,$2,\'SELECT,INSERT,UPDATE,DELETE\') as allowed', [role, `public.${table}`])).rows[0]
      expect(privileges.allowed).toBe(false)
    }
    await db.exec(`set role ${role}`)
    await expect(claim('paid','publish',1)).rejects.toThrow('permission denied')
    await db.exec('reset role')
  }
  expect(await result('select public.site_usage_schema_readiness() as result')).toEqual({ ready: true, schemaVersion: '20261029.1' })
})
