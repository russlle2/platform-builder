import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationPath = path.resolve(
  here,
  '..',
  'supabase',
  'migrations',
  '20260903000000_launch_transaction_hardening.sql',
)
const grantMigrationPath = path.resolve(
  here,
  '..',
  'supabase',
  'migrations',
  '20260903230900_harden_service_role_data_api_grants.sql',
)

const baseline = `
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  revoke create, usage on schema public from public;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create table auth.users (id uuid primary key, email text);

  create table public.site_slugs (
    slug text primary key,
    status text default 'reserved',
    created_at timestamptz default now(),
    netlify_site_id text,
    site_url text,
    custom_domain text
  );
  create unique index site_slugs_slug_key on public.site_slugs (slug);
  create table public.portal_sites (
    slug text primary key,
    data jsonb not null default '{}'::jsonb,
    status text default 'draft',
    owner_email text,
    portal_token_hash text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create table public.accounts (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    created_at timestamptz default now()
  );
  create table public.contact_messages (
    id uuid primary key default gen_random_uuid(),
    slug text,
    visitor_name text not null,
    visitor_email text not null,
    message text not null,
    created_at timestamptz default now()
  );
  create table public.lead_captures (
    id uuid primary key default gen_random_uuid(),
    legacy_sequence_id bigserial unique,
    email text,
    created_at timestamptz default now()
  );
  create table public.orders (
    id uuid primary key default gen_random_uuid(),
    slug text references public.site_slugs(slug),
    stripe_session_id text,
    stripe_customer_id text,
    email text,
    plan text,
    amount_cents integer,
    status text not null default 'pending',
    created_at timestamptz not null default now()
  );
  create table public.booking_inquiries (
    id uuid primary key default gen_random_uuid(),
    slug text references public.site_slugs(slug),
    created_at timestamptz not null default now()
  );
  create table public.newsletter_subscribers (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    created_at timestamptz not null default now()
  );
  create table public.manual_service_tasks (
    id uuid primary key default gen_random_uuid(),
    slug text,
    task_type text not null default 'security_ads',
    status text not null default 'open',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create table public.draft_profiles (
    email text primary key,
    profile jsonb not null default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create table public.intake_contacts (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    created_at timestamptz default now()
  );
  create table public.custom_build_requests (
    id uuid primary key default gen_random_uuid()
  );
`

async function scalar(db, sql, params = []) {
  const result = await db.query(sql, params)
  return Object.values(result.rows[0] || {})[0]
}

test('launch migration parses and billing/checkout RPCs converge under retries', async () => {
  const db = new PGlite()
  try {
    await db.waitReady
    await db.exec(baseline)
    const migration = await readFile(migrationPath, 'utf8')
    const grantMigration = await readFile(grantMigrationPath, 'utf8')
    await db.exec(migration)
    await db.exec(migration)
    await db.exec(grantMigration)
    await db.exec(grantMigration)

    const readiness = await scalar(db, 'select public.launch_schema_readiness()')
    assert.deepEqual(readiness, { ready: true, schemaVersion: '20260903.3' })
    assert.equal(
      await scalar(db, "select has_schema_privilege('service_role', 'public', 'USAGE')"),
      true,
    )

    const expectedPrivileges = {
      site_slugs: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      portal_sites: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      lead_captures: ['SELECT', 'INSERT'],
      contact_messages: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      draft_profiles: ['SELECT', 'INSERT', 'UPDATE'],
      manual_service_tasks: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      accounts: [],
      intake_contacts: ['SELECT', 'INSERT', 'DELETE'],
      orders: ['SELECT', 'DELETE'],
      booking_inquiries: ['DELETE'],
      newsletter_subscribers: [],
      custom_build_requests: ['SELECT', 'INSERT', 'UPDATE'],
      checkout_intents: ['SELECT', 'INSERT', 'UPDATE'],
      stripe_webhook_events: ['SELECT', 'INSERT', 'UPDATE'],
    }
    for (const [table, expected] of Object.entries(expectedPrivileges)) {
      for (const privilege of [
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER',
      ]) {
        assert.equal(
          await scalar(
            db,
            'select has_table_privilege(\'service_role\', $1, $2)',
            [`public.${table}`, privilege],
          ),
          expected.includes(privilege),
          `${table} ${privilege}`,
        )
      }
    }

    assert.equal(
      await scalar(
        db,
        "select has_sequence_privilege('service_role', 'public.lead_captures_legacy_sequence_id_seq', 'USAGE')",
      ),
      true,
    )
    assert.equal(
      await scalar(
        db,
        "select has_sequence_privilege('service_role', 'public.lead_captures_legacy_sequence_id_seq', 'SELECT')",
      ),
      true,
    )
    assert.equal(
      await scalar(
        db,
        "select has_sequence_privilege('service_role', 'public.lead_captures_legacy_sequence_id_seq', 'UPDATE')",
      ),
      false,
    )

    await db.exec('revoke update on public.checkout_intents from service_role')
    assert.deepEqual(
      await scalar(db, 'select public.launch_schema_readiness()'),
      { ready: false, schemaVersion: '20260903.3' },
    )
    await db.exec(grantMigration)

    await db.exec('revoke usage on schema public from service_role')
    assert.deepEqual(
      await scalar(db, 'select public.launch_schema_readiness()'),
      { ready: false, schemaVersion: '20260903.3' },
    )
    await db.exec(grantMigration)

    for (const driftStatement of [
      'grant create on schema public to service_role',
      'grant delete on public.lead_captures to service_role',
      'grant delete on public.lead_captures to public',
      'grant truncate on public.lead_captures to service_role',
      'grant references on public.lead_captures to service_role',
      'grant trigger on public.lead_captures to service_role',
    ]) {
      await db.exec(driftStatement)
      assert.deepEqual(
        await scalar(db, 'select public.launch_schema_readiness()'),
        { ready: false, schemaVersion: '20260903.3' },
      )
      await db.exec(grantMigration)
    }

    await db.exec(
      'revoke usage on sequence public.lead_captures_legacy_sequence_id_seq from service_role',
    )
    assert.deepEqual(
      await scalar(db, 'select public.launch_schema_readiness()'),
      { ready: false, schemaVersion: '20260903.3' },
    )
    await db.exec(grantMigration)

    await db.exec(
      'grant update on sequence public.lead_captures_legacy_sequence_id_seq to service_role',
    )
    assert.deepEqual(
      await scalar(db, 'select public.launch_schema_readiness()'),
      { ready: false, schemaVersion: '20260903.3' },
    )
    await db.exec(grantMigration)

    await db.exec('alter table public.newsletter_subscribers rename to newsletter_subscribers_missing')
    assert.deepEqual(
      await scalar(db, 'select public.launch_schema_readiness()'),
      { ready: false, schemaVersion: '20260903.3' },
    )
    await db.exec('alter table public.newsletter_subscribers_missing rename to newsletter_subscribers')

    await db.exec(
      'revoke execute on function public.merge_portal_site_data(text, jsonb, jsonb) from service_role',
    )
    assert.deepEqual(
      await scalar(db, 'select public.launch_schema_readiness()'),
      { ready: false, schemaVersion: '20260903.3' },
    )
    await db.exec(grantMigration)

    await db.exec(
      'grant execute on function public.merge_portal_site_data(text, jsonb, jsonb) to public',
    )
    assert.deepEqual(
      await scalar(db, 'select public.launch_schema_readiness()'),
      { ready: false, schemaVersion: '20260903.3' },
    )
    await db.exec(grantMigration)

    await db.exec('set role service_role')
    try {
      const roleReadiness = await scalar(db, 'select public.launch_schema_readiness()')
      assert.deepEqual(roleReadiness, { ready: true, schemaVersion: '20260903.3' })
      await db.exec(`
        insert into public.manual_service_tasks (slug) values ('grant-probe');
        update public.manual_service_tasks set status = 'done' where slug = 'grant-probe';
        select id from public.manual_service_tasks where slug = 'grant-probe';
        delete from public.manual_service_tasks where slug = 'grant-probe';
        insert into public.lead_captures (email) values ('grant-probe@example.test');
      `)
      await assert.rejects(
        db.exec("delete from public.lead_captures where email = 'grant-probe@example.test'"),
        /permission denied/i,
      )
    } finally {
      await db.exec('reset role')
    }

    await db.exec(`
      insert into public.site_slugs (slug, status) values ('calm-co', 'provisioned');
      select public.upsert_portal_checkout_state(
        'calm-co', 'owner@example.com', 'provisioning_failed', 'hash',
        '{"provisioning_succeeded":false,"billing_status":"trial_or_pending"}'::jsonb
      );
      select public.upsert_checkout_order(
        'calm-co', 'cs_template', 'cus_template', 'sub_template',
        'owner@example.com', 'premium', 8000, 'usd', 'fulfillment_failed'
      );
    `)

    // A healthy trial that arrives while deployment is down must not hide the
    // deployment failure; a later successful retry must activate the portal.
    assert.equal(await scalar(db, `select public.merge_portal_billing_state(
      'calm-co', 'trialing', '{}'::jsonb, 100, 'evt_trial'
    )`), true)
    assert.equal(await scalar(db, `select status from public.portal_sites where slug='calm-co'`), 'provisioning_failed')
    await db.query(`select public.upsert_portal_checkout_state(
      'calm-co', 'owner@example.com', 'active', 'hash', $1::jsonb
    )`, [JSON.stringify({ provisioning_succeeded: true })])
    assert.equal(await scalar(db, `select status from public.portal_sites where slug='calm-co'`), 'active')

    // Terminal billing always wins over both successful and failed checkout
    // retries, so no partial deployment can restore publish access.
    assert.equal(await scalar(db, `select public.merge_portal_billing_state(
      'calm-co', 'canceled', '{}'::jsonb, 101, 'evt_cancel'
    )`), true)
    for (const retryStatus of ['provisioning_failed', 'active']) {
      await db.query(`select public.upsert_portal_checkout_state(
        'calm-co', 'owner@example.com', $1, 'hash', $2::jsonb
      )`, [retryStatus, JSON.stringify({ provisioning_succeeded: retryStatus === 'active' })])
      assert.equal(await scalar(db, `select status from public.portal_sites where slug='calm-co'`), 'billing_suspended')
    }

    // Retrying the exact webhook is allowed to reconcile a newly retrieved
    // canonical Stripe state; a different older event still cannot win.
    assert.equal(await scalar(db, `select public.merge_portal_billing_state(
      'calm-co', 'active', '{}'::jsonb, 200, 'evt_reconcile'
    )`), true)
    assert.equal(await scalar(db, `select public.merge_portal_billing_state(
      'calm-co', 'canceled', '{}'::jsonb, 200, 'evt_reconcile'
    )`), true)
    assert.equal(await scalar(db, `select status from public.portal_sites where slug='calm-co'`), 'billing_suspended')
    assert.equal(await scalar(db, `select public.merge_portal_billing_state(
      'calm-co', 'active', '{}'::jsonb, 199, 'evt_older'
    )`), false)

    // Stripe IDs are opaque and timestamps are second-granular. A terminal
    // peer event must win even when its ID sorts below the active event ID.
    assert.equal(await scalar(db, `select public.merge_portal_billing_state(
      'calm-co', 'active', '{}'::jsonb, 300, 'evt_z_active'
    )`), true)
    assert.equal(await scalar(db, `select public.merge_portal_billing_state(
      'calm-co', 'canceled', '{}'::jsonb, 300, 'evt_a_canceled'
    )`), true)
    assert.equal(await scalar(db, `select status from public.portal_sites where slug='calm-co'`), 'billing_suspended')

    // Portal and order convergence remain independently replayable after a
    // network failure between RPC calls.
    assert.equal(await scalar(db, `select public.merge_order_billing_state(
      'sub_template', 'canceled', 200, 'evt_reconcile'
    )`), true)
    assert.equal(await scalar(db, `select status from public.orders where stripe_subscription_id='sub_template'`), 'canceled')
    assert.equal(await scalar(db, `select public.merge_order_billing_state(
      'sub_template', 'active', 300, 'evt_z_active'
    )`), true)
    assert.equal(await scalar(db, `select public.merge_order_billing_state(
      'sub_template', 'canceled', 300, 'evt_a_canceled'
    )`), true)
    assert.equal(await scalar(db, `select status from public.orders where stripe_subscription_id='sub_template'`), 'canceled')

    // Malformed legacy JSON cannot crash billing reconciliation.
    await db.exec(`
      insert into public.site_slugs (slug, status) values ('legacy-co', 'provisioned');
      insert into public.portal_sites (slug, status, data)
      values ('legacy-co', 'provisioning_failed', '{"provisioning_succeeded":"unknown"}'::jsonb);
    `)
    assert.equal(await scalar(db, `select public.merge_portal_billing_state(
      'legacy-co', 'active', '{}'::jsonb, 1, 'evt_legacy'
    )`), true)
  } finally {
    await db.close()
  }
})
