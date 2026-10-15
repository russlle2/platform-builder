#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const SHARED_PRODUCTION_PROJECT_REF = 'psxmvaushwsboogfnyqi'
export const SOURCE_MIGRATIONS = [
  '20260903000000_launch_transaction_hardening.sql',
  '20260903230900_harden_service_role_data_api_grants.sql',
  '20260925071341_booking_kit_private_orders.sql',
  '20260925072106_booking_kit_measurement.sql',
  '20260925222534_booking_inquiry_cleanup_filter_privilege.sql',
  '20260925222605_attest_booking_inquiry_cleanup_filter.sql',
]
const migrationRoot = new URL('../supabase/migrations/', import.meta.url)
const appTables = ['site_slugs', 'portal_sites', 'lead_captures', 'contact_messages', 'draft_profiles', 'manual_service_tasks', 'accounts', 'intake_contacts', 'orders', 'booking_inquiries', 'newsletter_subscribers', 'custom_build_requests', 'checkout_intents', 'stripe_webhook_events', 'booking_kit_orders', 'booking_kit_access_tokens', 'booking_kit_rate_limits']
const list = appTables.map(name => `'${name}'`).join(', ')
const appFunctions = ['set_portal_token_expiration', 'sync_portal_custom_domain', 'mirror_site_slug_custom_domain', 'merge_portal_site_data', 'upsert_portal_checkout_state', 'upsert_checkout_order', 'merge_portal_billing_state', 'merge_order_billing_state', 'launch_schema_readiness', 'fulfill_booking_kit_order', 'revoke_booking_kit_order', 'read_booking_kit_result', 'consume_booking_kit_rate_limit', 'booking_kit_schema_version', 'record_order_payment', 'record_booking_kit_transfer', 'booking_kit_first_25_report']

// A value-free fingerprint: unrelated data is never copied or inspected.
export const PRESERVATION_QUERY = `select jsonb_build_object(
  'defaultPrivileges', (select coalesce(jsonb_agg(row_to_json(d) order by d.oid), '[]') from pg_default_acl d),
  'publicSchemaAcl', (select nspacl::text from pg_namespace where nspname='public'),
  'authTriggers', (select coalesce(jsonb_agg(jsonb_build_object('oid', t.oid, 'definition', pg_get_triggerdef(t.oid)) order by t.oid), '[]') from pg_trigger t where t.tgrelid='auth.users'::regclass and not t.tgisinternal),
  'unrelatedFunctions', (select coalesce(jsonb_agg(jsonb_build_object('oid', p.oid, 'name', p.proname, 'acl', p.proacl::text, 'definitionHash', md5(pg_get_functiondef(p.oid))) order by p.oid), '[]') from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind in ('f','p') and p.proname not in (${appFunctions.map(name => `'${name}'`).join(', ')})),
  'unrelatedRelations', (select coalesce(jsonb_agg(jsonb_build_object('oid', c.oid, 'name', c.relname, 'acl', c.relacl::text, 'rls', c.relrowsecurity) order by c.oid), '[]') from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','p','v','m','S') and c.relname not in (${list}) and not exists (select 1 from pg_depend d join pg_class owner_table on owner_table.oid=d.refobjid where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype in ('a','i') and owner_table.relnamespace='public'::regnamespace and owner_table.relname in (${list})))
) as preservation`

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error('Source migration changed; review the shared-project adaptation again')
  return source.replace(before, after)
}

function removeBetween(source, start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first)
  if (first < 0 || last <= first || source.indexOf(start, first + 1) >= 0) throw new Error('Source migration changed; review the shared-project boundaries again')
  return source.slice(0, first) + source.slice(last)
}

/** Build reviewable SQL only. This module has no database/network connection. */
export async function buildSharedProjectReconciliation({ projectRef } = {}) {
  if (projectRef !== SHARED_PRODUCTION_PROJECT_REF) throw new Error('This reviewed reconciliation is bound to the existing shared production project')
  const sources = await Promise.all(SOURCE_MIGRATIONS.map(async name => ({ name, sql: await readFile(new URL(name, migrationRoot), 'utf8') })))
  const hashes = sources.map(({ name, sql }) => ({ name, sha256: createHash('sha256').update(sql).digest('hex') }))
  const adapted = sources.map(({ name, sql }) => {
    if (name === SOURCE_MIGRATIONS[0]) {
      // Do not attach a DailyClarity trigger to every auth.users signup or
      // import unrelated Auth users into accounts. Keep the scoped portal
      // ownership backfill, restricted to confirmed Auth email addresses.
      // Runtime applies the same requirement after auth.getUser().
      sql = removeBetween(sql, '-- Canonical account rows are created from trusted Auth data.', 'update public.portal_sites as p')
      sql = replaceOnce(sql, 'where u.email is not null\n  and lower(p.owner_email) = lower(u.email)', 'where u.email is not null\n  and u.email_confirmed_at is not null\n  and lower(p.owner_email) = lower(u.email)')
    }
    if (name === SOURCE_MIGRATIONS[1]) {
      sql = removeBetween(sql, '-- Future tables and sequences must opt in explicitly', '-- Start from a deterministic baseline')
    }
    if (name === SOURCE_MIGRATIONS[2]) {
      sql = replaceOnce(sql, 'revoke all on public.booking_kit_orders, public.booking_kit_access_tokens, public.booking_kit_rate_limits from public, anon, authenticated;', 'revoke all on public.booking_kit_orders, public.booking_kit_access_tokens, public.booking_kit_rate_limits from public, anon, authenticated, service_role;')
      sql = replaceOnce(sql, 'grant usage on schema public to service_role;', '-- Existing schema USAGE is checked by preflight; schema ACL is preserved.')
    }
    return `-- Source: ${name}\n${sql}`
  }).join('\n')
  if (/alter\s+default\s+privileges|(?:create|drop)\s+trigger[^;]*on\s+auth\.users/i.test(adapted)) throw new Error('Shared-project reconciliation must preserve global privileges and Auth triggers')

  const sql = `-- REVIEWED TARGET: ${projectRef}. Never apply the complete canonical history to this shared project.
-- Generated from exact source hashes:\n${hashes.map(x => `-- ${x.name}: ${x.sha256}`).join('\n')}
begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';
do $$ begin
  if not has_schema_privilege('service_role', 'public', 'USAGE') or has_schema_privilege('service_role', 'public', 'CREATE') then
    raise exception 'shared_project_preflight: existing schema privileges need separate review';
  end if;
  if exists (select 1 from pg_constraint where contype='f' and confrelid='public.draft_profiles'::regclass) then
    raise exception 'shared_project_preflight: draft primary key has dependents';
  end if;
end $$;
lock table ${appTables.slice(0, 12).map(name => `public.${name}`).join(', ')} in share row exclusive mode;
create temporary table dailyclarity_reconciliation_guard on commit drop as ${PRESERVATION_QUERY};

${adapted}

do $$ declare current_preservation jsonb; begin
  ${PRESERVATION_QUERY.replace(') as preservation', ') into current_preservation')};
  if current_preservation is distinct from (select preservation from dailyclarity_reconciliation_guard) then
    raise exception 'shared_project_preservation_failed';
  end if;
  if public.launch_schema_readiness() is distinct from '{"ready":true,"schemaVersion":"20260903.4"}'::jsonb or public.booking_kit_schema_version() <> '20260925.2' then
    raise exception 'shared_project_schema_readiness_failed';
  end if;
  if exists (
    select 1 from (values ('booking_kit_orders'),('booking_kit_access_tokens'),('booking_kit_rate_limits')) as t(name)
    cross join (values ('anon'),('authenticated')) as r(name)
    cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) as p(name)
    where has_table_privilege(r.name, format('public.%I',t.name), p.name)
      or not (select relrowsecurity from pg_class where oid=to_regclass(format('public.%I',t.name)))
      or has_table_privilege('service_role',format('public.%I',t.name),'TRUNCATE,REFERENCES,TRIGGER')
  ) then raise exception 'shared_project_private_order_grants_failed'; end if;
end $$;
commit;
`
  return { sql, sources: hashes, sha256: createHash('sha256').update(sql).digest('hex') }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.length !== 4 || args[0] !== '--project-ref' || args[2] !== '--output') throw new Error('Usage: shared-project-reconciliation.mjs --project-ref psxmvaushwsboogfnyqi --output /absolute/reviewed.sql')
  if (!path.isAbsolute(args[3])) throw new Error('Use an explicit absolute output path outside the migration history')
  const result = await buildSharedProjectReconciliation({ projectRef: args[1] })
  await writeFile(args[3], result.sql, { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ projectRef: args[1], output: args[3], sha256: result.sha256, sources: result.sources }, null, 2))
}
