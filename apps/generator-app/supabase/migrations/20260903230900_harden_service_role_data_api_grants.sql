-- Supabase no longer guarantees implicit Data API grants on fresh projects.
-- Pin the server-only role to the least-privilege CRUD surface used by the
-- application, smoke tests, and isolated test-purchase cleanup.

-- Future tables and sequences must opt in explicitly instead of silently
-- inheriting broad service-role access.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, service_role;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

revoke create on schema public from public, service_role;
grant usage on schema public to service_role;

-- Start from a deterministic baseline so this also narrows older projects
-- that inherited Supabase's previous permissive defaults.
revoke all privileges on table
  public.site_slugs,
  public.portal_sites,
  public.lead_captures,
  public.contact_messages,
  public.draft_profiles,
  public.manual_service_tasks,
  public.accounts,
  public.intake_contacts,
  public.orders,
  public.booking_inquiries,
  public.newsletter_subscribers,
  public.custom_build_requests,
  public.checkout_intents,
  public.stripe_webhook_events
from public, service_role;

grant select, insert, update, delete on table
  public.site_slugs,
  public.portal_sites,
  public.contact_messages,
  public.manual_service_tasks
to service_role;

grant select, insert, update on table
  public.draft_profiles,
  public.custom_build_requests,
  public.checkout_intents,
  public.stripe_webhook_events
to service_role;

grant select, insert on table
  public.lead_captures
to service_role;

grant select, insert, delete on table
  public.intake_contacts
to service_role;

grant select, delete on table
  public.orders
to service_role;

grant delete on table
  public.booking_inquiries
to service_role;

-- accounts is read through an owner-scoped authenticated policy, while
-- newsletter_subscribers is anonymous insert-only. Neither needs direct
-- service-role table access. Order writes remain behind service-only RPCs.

-- Re-pin the security-definer write surface as well. A table grant alone is
-- not enough if a required RPC lost EXECUTE or became browser-callable.
revoke all on function
  public.sync_portal_custom_domain(text, text),
  public.merge_portal_site_data(text, jsonb, jsonb),
  public.upsert_portal_checkout_state(text, text, text, text, jsonb),
  public.upsert_checkout_order(text, text, text, text, text, text, integer, text, text),
  public.merge_portal_billing_state(text, text, jsonb, bigint, text),
  public.merge_order_billing_state(text, text, bigint, text)
from public, anon, authenticated, service_role;

grant execute on function
  public.sync_portal_custom_domain(text, text),
  public.merge_portal_site_data(text, jsonb, jsonb),
  public.upsert_portal_checkout_state(text, text, text, text, jsonb),
  public.upsert_checkout_order(text, text, text, text, text, text, integer, text, text),
  public.merge_portal_billing_state(text, text, jsonb, bigint, text),
  public.merge_order_billing_state(text, text, bigint, text)
to service_role;

-- A legacy installation may use serial/identity columns even though the
-- canonical schema currently uses UUID defaults. Normalize every sequence
-- owned by an app table, then expose only sequences needed by direct inserts.
do $$
declare
  sequence_record record;
begin
  for sequence_record in
    select distinct
      sequence_namespace.nspname as sequence_schema,
      sequence_class.relname as sequence_name,
      table_class.relname as table_name
    from pg_catalog.pg_class as sequence_class
    join pg_catalog.pg_namespace as sequence_namespace
      on sequence_namespace.oid = sequence_class.relnamespace
    join pg_catalog.pg_depend as dependency
      on dependency.classid = 'pg_catalog.pg_class'::regclass
     and dependency.objid = sequence_class.oid
     and dependency.deptype in ('a', 'i')
    join pg_catalog.pg_class as table_class
      on table_class.oid = dependency.refobjid
    join pg_catalog.pg_namespace as table_namespace
      on table_namespace.oid = table_class.relnamespace
    where sequence_class.relkind = 'S'
      and sequence_namespace.nspname = 'public'
      and table_namespace.nspname = 'public'
      and table_class.relname = any (array[
        'site_slugs', 'portal_sites', 'lead_captures', 'contact_messages',
        'draft_profiles', 'manual_service_tasks', 'accounts', 'intake_contacts',
        'orders', 'booking_inquiries', 'newsletter_subscribers',
        'custom_build_requests', 'checkout_intents', 'stripe_webhook_events'
      ]::text[])
  loop
    execute format(
      'revoke all privileges on sequence %I.%I from public, service_role',
      sequence_record.sequence_schema,
      sequence_record.sequence_name
    );

    if sequence_record.table_name = any (array[
      'site_slugs', 'portal_sites', 'lead_captures', 'contact_messages',
      'draft_profiles', 'manual_service_tasks', 'intake_contacts',
      'custom_build_requests', 'checkout_intents', 'stripe_webhook_events'
    ]::text[]) then
      execute format(
        'grant usage, select on sequence %I.%I to service_role',
        sequence_record.sequence_schema,
        sequence_record.sequence_name
      );
    end if;
  end loop;
end;
$$;

-- Keep the deployment sentinel value-free while making it prove that a
-- service-key request can reach every table operation required at runtime.
create or replace function public.launch_schema_readiness()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'schemaVersion', '20260903.3',
    'ready',
      to_regclass('public.checkout_intents') is not null
      and to_regclass('public.stripe_webhook_events') is not null
      and to_regclass('public.site_slugs_custom_domain_unique_idx') is not null
      and to_regclass('public.orders_stripe_session_unique_idx') is not null
      and to_regclass('public.orders_stripe_subscription_unique_idx') is not null
      and to_regclass('public.manual_service_tasks_checkout_type_unique_idx') is not null
      and has_schema_privilege('service_role', 'public', 'USAGE')
      and not has_schema_privilege('service_role', 'public', 'CREATE')
      and not exists (
        select 1
        from (values
          ('public.sync_portal_custom_domain(text,text)'),
          ('public.merge_portal_site_data(text,jsonb,jsonb)'),
          ('public.upsert_portal_checkout_state(text,text,text,text,jsonb)'),
          ('public.upsert_checkout_order(text,text,text,text,text,text,integer,text,text)'),
          ('public.merge_portal_billing_state(text,text,jsonb,bigint,text)'),
          ('public.merge_order_billing_state(text,text,bigint,text)')
        ) as required(signature)
        where to_regprocedure(required.signature) is null
          or not coalesce(
            has_function_privilege(
              'service_role',
              to_regprocedure(required.signature),
              'EXECUTE'
            ),
            false
          )
          or coalesce(
            has_function_privilege(
              'anon',
              to_regprocedure(required.signature),
              'EXECUTE'
            ),
            false
          )
          or coalesce(
            has_function_privilege(
              'authenticated',
              to_regprocedure(required.signature),
              'EXECUTE'
            ),
            false
          )
      )
      and not exists (
        select 1
        from (values
          ('site_slugs'), ('portal_sites'), ('lead_captures'),
          ('contact_messages'), ('draft_profiles'), ('manual_service_tasks'),
          ('accounts'), ('intake_contacts'), ('orders'), ('booking_inquiries'),
          ('newsletter_subscribers'), ('custom_build_requests'),
          ('checkout_intents'), ('stripe_webhook_events')
        ) as required(table_name)
        where to_regclass(format('public.%I', required.table_name)) is null
      )
      and not exists (
        select 1
        from (values
          ('site_slugs', 'reserved_for'),
          ('site_slugs', 'reservation_expires_at'),
          ('site_slugs', 'netlify_default_domain'),
          ('portal_sites', 'owner_id'),
          ('portal_sites', 'portal_token_expires_at'),
          ('orders', 'stripe_subscription_id'),
          ('orders', 'billing_event_created'),
          ('orders', 'stripe_event_id'),
          ('stripe_webhook_events', 'business_key'),
          ('stripe_webhook_events', 'payload'),
          ('stripe_webhook_events', 'lease_token'),
          ('manual_service_tasks', 'stripe_session_id'),
          ('contact_messages', 'owner_notification_status')
        ) as required(table_name, column_name)
        where not exists (
          select 1 from information_schema.columns as actual
          where actual.table_schema = 'public'
            and actual.table_name = required.table_name
            and actual.column_name = required.column_name
        )
      )
      and not exists (
        select 1
        from (values
          ('site_slugs', 'SELECT'), ('site_slugs', 'INSERT'),
          ('site_slugs', 'UPDATE'), ('site_slugs', 'DELETE'),
          ('portal_sites', 'SELECT'), ('portal_sites', 'INSERT'),
          ('portal_sites', 'UPDATE'), ('portal_sites', 'DELETE'),
          ('lead_captures', 'SELECT'), ('lead_captures', 'INSERT'),
          ('contact_messages', 'SELECT'), ('contact_messages', 'INSERT'),
          ('contact_messages', 'UPDATE'), ('contact_messages', 'DELETE'),
          ('draft_profiles', 'SELECT'), ('draft_profiles', 'INSERT'),
          ('draft_profiles', 'UPDATE'),
          ('manual_service_tasks', 'SELECT'), ('manual_service_tasks', 'INSERT'),
          ('manual_service_tasks', 'UPDATE'), ('manual_service_tasks', 'DELETE'),
          ('intake_contacts', 'SELECT'), ('intake_contacts', 'INSERT'),
          ('intake_contacts', 'DELETE'),
          ('orders', 'SELECT'), ('orders', 'DELETE'),
          ('booking_inquiries', 'DELETE'),
          ('custom_build_requests', 'SELECT'), ('custom_build_requests', 'INSERT'),
          ('custom_build_requests', 'UPDATE'),
          ('checkout_intents', 'SELECT'), ('checkout_intents', 'INSERT'),
          ('checkout_intents', 'UPDATE'),
          ('stripe_webhook_events', 'SELECT'), ('stripe_webhook_events', 'INSERT'),
          ('stripe_webhook_events', 'UPDATE')
        ) as required(table_name, privilege_name)
        where not coalesce(
          has_table_privilege(
            'service_role',
            to_regclass(format('public.%I', required.table_name)),
            required.privilege_name
          ),
          false
        )
      )
      and not exists (
        select 1
        from (values
          ('lead_captures', 'UPDATE'), ('lead_captures', 'DELETE'),
          ('draft_profiles', 'DELETE'),
          ('accounts', 'SELECT'), ('accounts', 'INSERT'),
          ('accounts', 'UPDATE'), ('accounts', 'DELETE'),
          ('intake_contacts', 'UPDATE'),
          ('orders', 'INSERT'), ('orders', 'UPDATE'),
          ('booking_inquiries', 'SELECT'), ('booking_inquiries', 'INSERT'),
          ('booking_inquiries', 'UPDATE'),
          ('newsletter_subscribers', 'SELECT'), ('newsletter_subscribers', 'INSERT'),
          ('newsletter_subscribers', 'UPDATE'), ('newsletter_subscribers', 'DELETE'),
          ('custom_build_requests', 'DELETE'),
          ('checkout_intents', 'DELETE'),
          ('stripe_webhook_events', 'DELETE')
        ) as forbidden(table_name, privilege_name)
        where coalesce(
          has_table_privilege(
            'service_role',
            to_regclass(format('public.%I', forbidden.table_name)),
            forbidden.privilege_name
          ),
          false
        )
      )
      and not exists (
        select 1
        from (values
          ('site_slugs'), ('portal_sites'), ('lead_captures'),
          ('contact_messages'), ('draft_profiles'), ('manual_service_tasks'),
          ('accounts'), ('intake_contacts'), ('orders'), ('booking_inquiries'),
          ('newsletter_subscribers'), ('custom_build_requests'),
          ('checkout_intents'), ('stripe_webhook_events')
        ) as app_table(table_name)
        cross join (values ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'))
          as forbidden(privilege_name)
        where coalesce(
          has_table_privilege(
            'service_role',
            to_regclass(format('public.%I', app_table.table_name)),
            forbidden.privilege_name
          ),
          false
        )
      )
      and not exists (
        select 1
        from pg_catalog.pg_class as sequence_class
        join pg_catalog.pg_namespace as sequence_namespace
          on sequence_namespace.oid = sequence_class.relnamespace
        join pg_catalog.pg_depend as dependency
          on dependency.classid = 'pg_catalog.pg_class'::regclass
         and dependency.objid = sequence_class.oid
         and dependency.deptype in ('a', 'i')
        join pg_catalog.pg_class as table_class
          on table_class.oid = dependency.refobjid
        join pg_catalog.pg_namespace as table_namespace
          on table_namespace.oid = table_class.relnamespace
        where sequence_class.relkind = 'S'
          and sequence_namespace.nspname = 'public'
          and table_namespace.nspname = 'public'
          and table_class.relname = any (array[
            'site_slugs', 'portal_sites', 'lead_captures', 'contact_messages',
            'draft_profiles', 'manual_service_tasks', 'intake_contacts',
            'custom_build_requests', 'checkout_intents', 'stripe_webhook_events'
          ]::text[])
          and (
            not has_sequence_privilege('service_role', sequence_class.oid, 'USAGE')
            or not has_sequence_privilege('service_role', sequence_class.oid, 'SELECT')
            or has_sequence_privilege('service_role', sequence_class.oid, 'UPDATE')
          )
      )
  );
$$;

revoke all on function public.launch_schema_readiness()
  from public, anon, authenticated;
grant execute on function public.launch_schema_readiness()
  to service_role;
