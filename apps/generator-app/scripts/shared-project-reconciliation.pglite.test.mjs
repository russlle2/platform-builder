import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { buildSharedProjectReconciliation, SHARED_PRODUCTION_PROJECT_REF, PRESERVATION_QUERY } from './shared-project-reconciliation.mjs'

const migrationRoot = new URL('../supabase/migrations/', import.meta.url)
const ownerId = '11111111-1111-4111-8111-111111111111'
const otherId = '22222222-2222-4222-8222-222222222222'
const thirdId = '33333333-3333-4333-8333-333333333333'
const scalar = async (db, sql) => Object.values((await db.query(sql)).rows[0])[0]
const bundle = () => buildSharedProjectReconciliation({ projectRef: SHARED_PRODUCTION_PROJECT_REF })

async function legacySharedDatabase() {
  const db = new PGlite()
  await db.waitReady
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    revoke create on schema public from public;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text);
  `)
  const names = (await readdir(migrationRoot)).filter(name => name.endsWith('.sql') && name < '20260903000000').sort()
  for (const name of names) await db.exec(await readFile(new URL(name, migrationRoot), 'utf8'))
  await db.exec(`
    -- Match observed legacy differences while preserving existing policies.
    alter table public.booking_inquiries rename column visitor_name to name;
    alter table public.booking_inquiries rename column visitor_email to email;
    alter table public.orders add column customer_email text, add column amount_total integer, add column line_items jsonb;
    create table public.hunter_fixture(id bigserial primary key, marker text not null);
    alter table public.hunter_fixture enable row level security;
    insert into public.hunter_fixture(marker) values ('unrelated fixture');
    create table public.hunter_auth_fixture(user_id uuid primary key);
    create function public.hunter_auth_fixture_trigger() returns trigger language plpgsql security definer set search_path='' as $$
      begin insert into public.hunter_auth_fixture values(new.id); return new; end $$;
    create trigger hunter_signup_fixture after insert on auth.users for each row execute function public.hunter_auth_fixture_trigger();
    insert into auth.users(id,email,email_confirmed_at) values ('${ownerId}','owner@example.test',now()),('${otherId}','other@example.test',null);
    insert into public.accounts(id,email) values ('${ownerId}','owner@example.test');
    insert into public.site_slugs(slug,status,custom_domain) values ('fixture','active','fixture.example.test');
    insert into public.portal_sites(slug,owner_email,portal_token_hash,data) values ('fixture','OWNER@example.test',repeat('a',64),'{}');
    insert into public.portal_sites(slug,owner_email,portal_token_hash,data) values ('unconfirmed','other@example.test',repeat('b',64),'{}');
    insert into public.draft_profiles(email,profile) values ('draft@example.test','{"preserved":"yes"}');
  `)
  return db
}

test('scoped reconciliation preserves shared consumers and rows while satisfying real runtime contracts', async () => {
  const db = await legacySharedDatabase()
  try {
    const before = await scalar(db, PRESERVATION_QUERY)
    const hunterBefore = await db.query('select * from public.hunter_fixture')
    const accountsBefore = await db.query('select * from public.accounts')
    const { sql } = await bundle()
    await db.exec(sql)
    // The canonical follow-up must never install its project-wide Auth trigger
    // on this deliberately scoped shared-project installation.
    await db.exec(await readFile(new URL('20261015004242_require_confirmed_email_for_portal_claims.sql', migrationRoot), 'utf8'))
    assert.deepEqual(await scalar(db, PRESERVATION_QUERY), before)
    assert.deepEqual((await db.query('select * from public.hunter_fixture')).rows, hunterBefore.rows)
    assert.deepEqual((await db.query('select * from public.accounts')).rows, accountsBefore.rows, 'unrelated Auth identities must not be imported into DailyClarity accounts')
    assert.deepEqual(await scalar(db, 'select public.launch_schema_readiness()'), { ready: true, schemaVersion: '20260903.4' })
    assert.equal(await scalar(db, 'select public.booking_kit_schema_version()'), '20260925.2')
    const draft = (await db.query('select email,profile,draft_id from public.draft_profiles')).rows[0]
    assert.equal(draft.email, 'draft@example.test')
    assert.deepEqual(draft.profile, { preserved: 'yes' })
    assert.match(draft.draft_id, /^[a-f0-9-]{36}$/)
    const portal = (await db.query("select owner_id,owner_email,portal_token_hash,portal_token_expires_at from public.portal_sites where slug='fixture'")).rows[0]
    assert.equal(portal.owner_id, ownerId)
    assert.equal(portal.owner_email, 'owner@example.test')
    assert.equal(portal.portal_token_hash, 'a'.repeat(64))
    assert.ok(portal.portal_token_expires_at)
    assert.equal(await scalar(db, "select owner_id from public.portal_sites where slug='unconfirmed'"), null, 'unconfirmed email cannot claim a legacy portal')
    await db.exec(`insert into auth.users(id,email) values('${thirdId}','third@example.test')`)
    assert.equal(await scalar(db, 'select count(*)::integer from public.hunter_auth_fixture'), 3, 'unrelated Auth signup trigger still works')
    assert.equal(await scalar(db, 'select count(*)::integer from public.accounts'), 1)
    assert.equal(await scalar(db, "select to_regprocedure('public.sync_auth_user_account()') is null"), true)
    await db.exec('create table public.hunter_future_fixture(id bigserial primary key)')
    assert.equal(await scalar(db, "select has_table_privilege('service_role','public.hunter_future_fixture','INSERT')"), true, 'future unrelated consumers retain their default privileges')
    assert.equal(await scalar(db, "select has_sequence_privilege('service_role','public.hunter_future_fixture_id_seq','USAGE')"), true)
    for (const name of ['booking_kit_orders', 'booking_kit_access_tokens', 'booking_kit_rate_limits']) {
      for (const role of ['anon', 'authenticated']) assert.equal(await scalar(db, `select has_table_privilege('${role}','public.${name}','SELECT')`), false)
      assert.equal(await scalar(db, `select has_table_privilege('service_role','public.${name}','TRUNCATE')`), false, 'inherited ALL must be removed without changing project defaults')
      assert.equal(await scalar(db, `select relrowsecurity from pg_class where oid='public.${name}'::regclass`), true)
    }
    await db.exec(`set role service_role;
      select public.upsert_checkout_order('fixture','cs_fixture','cus_fixture','sub_fixture','owner@example.test','basic',0,'usd','trialing');
      select public.record_order_payment('sub_fixture','cs_fixture',2000,now());
      reset role;`)
    assert.equal(await scalar(db, "select first_payment_amount_cents from public.orders where stripe_session_id='cs_fixture'"), 2000)
    for (const role of ['anon', 'authenticated']) {
      assert.equal(await scalar(db, `select has_function_privilege('${role}','public.launch_schema_readiness()','EXECUTE')`), false)
      assert.equal(await scalar(db, `select has_function_privilege('${role}','public.record_order_payment(text,text,integer,timestamptz)','EXECUTE')`), false)
    }
    const draftId = draft.draft_id
    await db.exec(sql)
    assert.equal(await scalar(db, "select draft_id from public.draft_profiles where email='draft@example.test'"), draftId, 'replaying the reviewed bundle preserves existing draft identities')
    assert.equal(await scalar(db, "select owner_id from public.portal_sites where slug='unconfirmed'"), null, 'replaying cannot promote an unconfirmed email')
    await db.exec(`update auth.users set email_confirmed_at=now() where id='${otherId}';
      update auth.users set email='changed@example.test', email_confirmed_at=null where id='${ownerId}';`)
    await db.exec(sql)
    assert.equal(await scalar(db, "select owner_id from public.portal_sites where slug='unconfirmed'"), otherId, 'confirmed email can claim an unowned portal')
    assert.equal(await scalar(db, "select owner_id from public.portal_sites where slug='fixture'"), ownerId, 'email changes never transfer an already-owned portal')
    assert.deepEqual(await scalar(db, 'select public.launch_schema_readiness()'), { ready: true, schemaVersion: '20260903.4' })
  } finally { await db.close() }
})

test('duplicate preflight failure rolls back every schema change and preserves legacy drafts', async () => {
  const db = await legacySharedDatabase()
  try {
    await db.exec("insert into public.site_slugs(slug,custom_domain) values ('duplicate','FIXTURE.example.test')")
    const before = await scalar(db, PRESERVATION_QUERY)
    await assert.rejects(db.exec((await bundle()).sql), /duplicate site_slugs.custom_domain/)
    await db.exec('rollback')
    assert.deepEqual(await scalar(db, PRESERVATION_QUERY), before)
    assert.equal(await scalar(db, "select to_regclass('public.checkout_intents') is null"), true)
    assert.equal(await scalar(db, "select count(*)::integer from information_schema.columns where table_schema='public' and table_name='site_slugs' and column_name='reserved_for'"), 0)
    assert.equal(await scalar(db, "select count(*)::integer from public.draft_profiles where profile='{" + '"preserved":"yes"' + "}'::jsonb"), 1)
  } finally { await db.close() }
})

test('unsafe schema grants abort before writes rather than changing shared schema permissions', async () => {
  const db = await legacySharedDatabase()
  try {
    await db.exec('grant create on schema public to service_role')
    const before = await scalar(db, PRESERVATION_QUERY)
    await assert.rejects(db.exec((await bundle()).sql), /existing schema privileges need separate review/)
    await db.exec('rollback')
    assert.deepEqual(await scalar(db, PRESERVATION_QUERY), before)
    assert.equal(await scalar(db, "select to_regclass('public.checkout_intents') is null"), true)
  } finally { await db.close() }
})

test('a late unrelated ACL change is detected and the entire transaction can roll back', async () => {
  const db = await legacySharedDatabase()
  try {
    const before = await scalar(db, PRESERVATION_QUERY)
    const sql = (await bundle()).sql.replace('do $$ declare current_preservation jsonb;', () => 'revoke select on public.hunter_fixture from service_role;\ndo $$ declare current_preservation jsonb;')
    await assert.rejects(db.exec(sql), /shared_project_preservation_failed/)
    await db.exec('rollback')
    assert.deepEqual(await scalar(db, PRESERVATION_QUERY), before)
    assert.equal(await scalar(db, "select to_regclass('public.checkout_intents') is null"), true)
    assert.equal(await scalar(db, "select count(*)::integer from information_schema.columns where table_schema='public' and table_name='draft_profiles' and column_name='draft_id'"), 0)
    assert.equal(await scalar(db, 'select count(*)::integer from public.draft_profiles'), 1)
  } finally { await db.close() }
})

test('builder requires the reviewed project identity', async () => {
  await assert.rejects(buildSharedProjectReconciliation({ projectRef: 'yuviqftugmasjypkhrpo' }), /bound to the existing shared production project/)
})
