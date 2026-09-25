-- Launch hardening for payment idempotency, checkout durability, account
-- ownership, and service-only data. Apply before deploying the matching app.

alter table public.site_slugs
  add column if not exists reserved_for text,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists netlify_default_domain text;

drop index if exists public.site_slugs_slug_key; -- primary key already enforces uniqueness
do $$
begin
  if exists (
    select 1 from public.site_slugs
    where custom_domain is not null
    group by lower(custom_domain)
    having count(*) > 1
  ) then
    raise exception 'launch preflight: duplicate site_slugs.custom_domain values require operator remediation';
  end if;
end;
$$;
create index if not exists site_slugs_reservation_expiry_idx
  on public.site_slugs (reservation_expires_at)
  where reservation_expires_at is not null;
create unique index if not exists site_slugs_custom_domain_unique_idx
  on public.site_slugs (lower(custom_domain))
  where custom_domain is not null;

create table if not exists public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  plan text not null,
  email text not null,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'session_created', 'completed', 'checkout_failed', 'fulfillment_failed')),
  stripe_session_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists checkout_intents_stripe_session_idx
  on public.checkout_intents (stripe_session_id)
  where stripe_session_id is not null;
create index if not exists checkout_intents_status_created_idx
  on public.checkout_intents (status, created_at desc);
alter table public.checkout_intents enable row level security;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null,
  business_key text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'succeeded', 'failed', 'dead_letter')),
  attempts integer not null default 0,
  payload jsonb not null,
  last_error text,
  next_attempt_at timestamptz,
  last_dispatched_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.stripe_webhook_events
  add column if not exists business_key text,
  add column if not exists payload jsonb,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_dispatched_at timestamptz,
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz;
alter table public.stripe_webhook_events
  drop constraint if exists stripe_webhook_events_status_check;
alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_status_check
    check (status in ('queued', 'processing', 'succeeded', 'failed', 'dead_letter'));
update public.stripe_webhook_events
set status = 'dead_letter',
    last_error = coalesce(last_error, 'Legacy ledger row has no replayable event payload.')
where payload is null and status <> 'succeeded';
update public.stripe_webhook_events set payload = '{}'::jsonb where payload is null;
update public.stripe_webhook_events
set business_key = 'event:' || event_id
where business_key is null;
alter table public.stripe_webhook_events
  alter column payload set not null,
  alter column business_key set not null,
  alter column attempts set default 0,
  alter column status set default 'queued';
create index if not exists stripe_webhook_events_status_updated_idx
  on public.stripe_webhook_events (status, updated_at);
create index if not exists stripe_webhook_events_due_idx
  on public.stripe_webhook_events (next_attempt_at)
  where status in ('queued', 'failed');
create index if not exists stripe_webhook_events_lease_idx
  on public.stripe_webhook_events (lease_expires_at)
  where status = 'processing';
create unique index if not exists stripe_webhook_events_active_business_key_idx
  on public.stripe_webhook_events (business_key)
  where status = 'processing';
alter table public.stripe_webhook_events enable row level security;

alter table public.orders
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_event_id text,
  add column if not exists billing_event_created bigint,
  add column if not exists currency text,
  add column if not exists updated_at timestamptz not null default now();
do $$
begin
  if exists (
    select 1 from public.orders
    where stripe_session_id is not null
    group by stripe_session_id
    having count(*) > 1
  ) then
    raise exception 'launch preflight: duplicate orders.stripe_session_id values require operator remediation';
  end if;
end;
$$;
create unique index if not exists orders_stripe_session_unique_idx
  on public.orders (stripe_session_id);
do $$
begin
  if exists (
    select 1 from public.orders
    where stripe_subscription_id is not null
    group by stripe_subscription_id
    having count(*) > 1
  ) then
    raise exception 'launch preflight: duplicate orders.stripe_subscription_id values require operator remediation';
  end if;
end;
$$;
create unique index if not exists orders_stripe_subscription_unique_idx
  on public.orders (stripe_subscription_id)
  where stripe_subscription_id is not null;
create index if not exists orders_slug_idx on public.orders (slug);

alter table public.manual_service_tasks
  add column if not exists stripe_session_id text;
do $$
begin
  if exists (
    select 1 from public.manual_service_tasks
    where stripe_session_id is not null
    group by stripe_session_id, task_type
    having count(*) > 1
  ) then
    raise exception 'launch preflight: duplicate manual service checkout tasks require operator remediation';
  end if;
end;
$$;
create unique index if not exists manual_service_tasks_checkout_type_unique_idx
  on public.manual_service_tasks (stripe_session_id, task_type);

alter table public.portal_sites
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists portal_token_expires_at timestamptz;
create index if not exists portal_sites_owner_id_idx on public.portal_sites (owner_id);

-- Portal email links are bearer credentials, so they must not remain valid
-- forever. Existing credentials receive a migration-time grace period. A new
-- or rotated hash receives a fresh window, while idempotent checkout retries
-- preserve the original expiration.
update public.portal_sites
set portal_token_expires_at = now() + interval '90 days'
where portal_token_hash is not null
  and portal_token_expires_at is null;

create or replace function public.set_portal_token_expiration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.portal_token_hash is null then
    new.portal_token_expires_at = null;
  elsif tg_op = 'INSERT'
     or old.portal_token_hash is distinct from new.portal_token_hash then
    new.portal_token_expires_at = now() + interval '90 days';
  end if;
  return new;
end;
$$;

drop trigger if exists portal_token_expiration on public.portal_sites;
create trigger portal_token_expiration
  before insert or update of portal_token_hash on public.portal_sites
  for each row execute function public.set_portal_token_expiration();

revoke all on function public.set_portal_token_expiration()
  from public, anon, authenticated;
grant execute on function public.set_portal_token_expiration()
  to service_role;
create index if not exists booking_inquiries_slug_idx on public.booking_inquiries (slug);

-- RLS is defense in depth even where API grants are also revoked. In
-- particular, the portal ownership policy below has no effect unless RLS is
-- enabled on portal_sites.
alter table public.portal_sites enable row level security;
alter table public.site_slugs enable row level security;
alter table public.contact_messages enable row level security;
alter table public.lead_captures enable row level security;

-- Contact submissions are durable even when Postmark is temporarily down.
-- These states make missed notifications visible to operators instead of
-- silently treating a stored message as delivered email.
alter table public.contact_messages
  add column if not exists owner_notification_status text not null default 'not_attempted',
  add column if not exists visitor_confirmation_status text not null default 'not_attempted',
  add column if not exists notification_last_error text,
  add column if not exists notification_attempted_at timestamptz;
alter table public.contact_messages
  drop constraint if exists contact_messages_owner_notification_status_check,
  drop constraint if exists contact_messages_visitor_confirmation_status_check;
alter table public.contact_messages
  add constraint contact_messages_owner_notification_status_check
    check (owner_notification_status in ('not_attempted', 'sent', 'failed', 'not_configured', 'no_recipient')),
  add constraint contact_messages_visitor_confirmation_status_check
    check (visitor_confirmation_status in ('not_attempted', 'sent', 'failed', 'not_configured'));
create index if not exists contact_messages_notification_attention_idx
  on public.contact_messages (created_at desc)
  where owner_notification_status <> 'sent';

-- Canonical account rows are created from trusted Auth data. Clients may not
-- choose an arbitrary email for their account row.
create or replace function public.sync_auth_user_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    insert into public.accounts (id, email)
    values (new.id, lower(new.email))
    on conflict (id) do update set email = excluded.email;

    update public.portal_sites
      set owner_id = new.id,
          owner_email = lower(new.email)
      where owner_id is null
        and lower(owner_email) = lower(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_account_sync on auth.users;
create trigger on_auth_user_account_sync
  after insert or update of email on auth.users
  for each row execute function public.sync_auth_user_account();

revoke all on function public.sync_auth_user_account() from public, anon, authenticated;

insert into public.accounts (id, email)
select id, lower(email)
from auth.users
where email is not null
on conflict (id) do update set email = excluded.email;

update public.portal_sites as p
set owner_id = u.id,
    owner_email = lower(u.email)
from auth.users as u
where u.email is not null
  and lower(p.owner_email) = lower(u.email)
  and p.owner_id is null;

drop policy if exists "Users can read own account" on public.accounts;
drop policy if exists "Users can insert own account" on public.accounts;
create policy "Users can read own account" on public.accounts
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Authenticated users can read own sites" on public.portal_sites;
create policy "Authenticated users can read own sites" on public.portal_sites
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- Browser clients read only their own account/site through RLS. All writes and
-- all operational tables remain server/service-role only.
revoke all on public.accounts from anon, authenticated;
grant select on public.accounts to authenticated;
revoke all on public.portal_sites from anon, authenticated;
grant select on public.portal_sites to authenticated;

revoke all on public.checkout_intents from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;
grant all on public.checkout_intents to service_role;
grant all on public.stripe_webhook_events to service_role;
revoke all on public.orders from anon, authenticated;
revoke all on public.site_slugs from anon, authenticated;
revoke all on public.draft_profiles from anon, authenticated;

-- Draft access must be scoped to an unguessable browser credential, never to
-- a user-supplied email address. Retain email only as contact/recovery data.
alter table public.draft_profiles
  add column if not exists draft_id uuid default gen_random_uuid();
update public.draft_profiles
set draft_id = gen_random_uuid()
where draft_id is null;
alter table public.draft_profiles
  alter column draft_id set not null;
alter table public.draft_profiles
  drop constraint if exists draft_profiles_pkey;
alter table public.draft_profiles
  add constraint draft_profiles_pkey primary key (draft_id);
create index if not exists draft_profiles_email_idx
  on public.draft_profiles (lower(email));
comment on table public.draft_profiles is
  'Pre-purchase profile drafts keyed by an opaque browser-bound UUID. Service-role access only.';

-- Update one JSONB key atomically so domain setup cannot overwrite concurrent
-- portal edits by performing a read/merge/write in application code.
create or replace function public.sync_portal_custom_domain(
  p_slug text,
  p_domain text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.portal_sites
  set data = jsonb_set(
        coalesce(data, '{}'::jsonb),
        '{custom_domain}',
        coalesce(to_jsonb(p_domain), 'null'::jsonb),
        true
      ),
      updated_at = now()
  where slug = p_slug;
$$;
revoke all on function public.sync_portal_custom_domain(text, text)
  from public, anon, authenticated;
grant execute on function public.sync_portal_custom_domain(text, text)
  to service_role;

-- Keep the portal mirror in the same transaction as the canonical domain
-- reservation. External Netlify work can fail or be superseded, but portal and
-- site_slugs state can no longer diverge because of an application crash.
create or replace function public.mirror_site_slug_custom_domain()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.sync_portal_custom_domain(new.slug, new.custom_domain);
  return new;
end;
$$;

drop trigger if exists site_slug_custom_domain_mirror on public.site_slugs;
create trigger site_slug_custom_domain_mirror
  after update of custom_domain on public.site_slugs
  for each row
  when (old.custom_domain is distinct from new.custom_domain)
  execute function public.mirror_site_slug_custom_domain();

revoke all on function public.mirror_site_slug_custom_domain()
  from public, anon, authenticated;

-- Apply customer portal edits without replacing the full JSON document. The
-- site_slugs row is locked first (the same order used by the domain trigger),
-- so a concurrent custom-domain reservation cannot be overwritten by a portal
-- save that began from stale JSON.
create or replace function public.merge_portal_site_data(
  p_slug text,
  p_customer_values jsonb,
  p_data_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_custom_domain text;
  v_merged_data jsonb;
begin
  select custom_domain
    into v_custom_domain
    from public.site_slugs
    where slug = p_slug
    for share;
  if not found then
    raise exception 'site slug not found';
  end if;

  update public.portal_sites
  set data =
        (coalesce(data, '{}'::jsonb) - 'custom_domain')
        || coalesce(p_data_patch, '{}'::jsonb)
        || jsonb_build_object(
             'customerValues',
             case
               when jsonb_typeof(data->'customerValues') = 'object'
                 then data->'customerValues'
               else '{}'::jsonb
             end || coalesce(p_customer_values, '{}'::jsonb)
           )
        || jsonb_build_object('custom_domain', v_custom_domain),
      updated_at = now()
  where slug = p_slug
  returning data into v_merged_data;

  if not found then
    raise exception 'portal site not found';
  end if;
  return v_merged_data;
end;
$$;
revoke all on function public.merge_portal_site_data(text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.merge_portal_site_data(text, jsonb, jsonb)
  to service_role;

-- Checkout retries may resume after a customer edit or a newer billing event.
-- Seed editable fields only on the first insert; thereafter merge only
-- provisioning-owned keys and never replace billing/domain/customer state.
create or replace function public.upsert_portal_checkout_state(
  p_slug text,
  p_owner_email text,
  p_status text,
  p_portal_token_hash text,
  p_data_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
begin
  insert into public.portal_sites (slug, owner_email, status, portal_token_hash, data, updated_at)
  values (
    p_slug,
    p_owner_email,
    p_status,
    p_portal_token_hash,
    coalesce(p_data_patch, '{}'::jsonb),
    now()
  )
  on conflict (slug) do update
  set owner_email = coalesce(public.portal_sites.owner_email, excluded.owner_email),
      status = case
        -- Provisioning progress/failure is authoritative while a checkout is
        -- running. On successful deployment, derive access from the newest
        -- billing state so a healthy trial can recover from an earlier deploy
        -- failure without bypassing a canceled or past-due subscription.
        when public.portal_sites.data->>'billing_status' in ('canceled', 'unpaid', 'incomplete_expired')
          and public.portal_sites.data ? 'billing_event_created'
          then 'billing_suspended'
        when excluded.status <> 'active' then excluded.status
        when not (public.portal_sites.data ? 'billing_event_created') then excluded.status
        when public.portal_sites.data->>'billing_status' in ('active', 'trialing', 'paid')
          then 'active'
        else 'billing_attention'
      end,
      portal_token_hash = coalesce(public.portal_sites.portal_token_hash, excluded.portal_token_hash),
      data = coalesce(public.portal_sites.data, '{}'::jsonb)
        || (excluded.data - array[
             'custom_domain', 'billing_status', 'billing_updated_at',
             'billing_event_created', 'billing_event_id',
             'customerValues', 'inlineEdits', 'imageSwaps', 'customTheme',
             'colorScheme', 'fontVariation', 'structureVariation', 'template'
           ]::text[])
        || case
             when public.portal_sites.data ? 'billing_event_created'
               or not (excluded.data ? 'billing_status')
               then '{}'::jsonb
             else jsonb_build_object('billing_status', excluded.data->'billing_status')
           end
        || case when public.portal_sites.data ? 'customerValues' or not (excluded.data ? 'customerValues')
             then '{}'::jsonb else jsonb_build_object('customerValues', excluded.data->'customerValues') end
        || case when public.portal_sites.data ? 'inlineEdits' or not (excluded.data ? 'inlineEdits')
             then '{}'::jsonb else jsonb_build_object('inlineEdits', excluded.data->'inlineEdits') end
        || case when public.portal_sites.data ? 'imageSwaps' or not (excluded.data ? 'imageSwaps')
             then '{}'::jsonb else jsonb_build_object('imageSwaps', excluded.data->'imageSwaps') end
        || case when public.portal_sites.data ? 'customTheme' or not (excluded.data ? 'customTheme')
             then '{}'::jsonb else jsonb_build_object('customTheme', excluded.data->'customTheme') end
        || case when public.portal_sites.data ? 'colorScheme' or not (excluded.data ? 'colorScheme')
             then '{}'::jsonb else jsonb_build_object('colorScheme', excluded.data->'colorScheme') end
        || case when public.portal_sites.data ? 'fontVariation' or not (excluded.data ? 'fontVariation')
             then '{}'::jsonb else jsonb_build_object('fontVariation', excluded.data->'fontVariation') end
        || case when public.portal_sites.data ? 'structureVariation' or not (excluded.data ? 'structureVariation')
             then '{}'::jsonb else jsonb_build_object('structureVariation', excluded.data->'structureVariation') end
        || case when public.portal_sites.data ? 'template' or not (excluded.data ? 'template')
             then '{}'::jsonb else jsonb_build_object('template', excluded.data->'template') end,
      updated_at = now()
  returning data into v_data;
  return v_data;
end;
$$;
revoke all on function public.upsert_portal_checkout_state(text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_portal_checkout_state(text, text, text, text, jsonb)
  to service_role;

create or replace function public.upsert_checkout_order(
  p_slug text,
  p_stripe_session_id text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_email text,
  p_plan text,
  p_amount_cents integer,
  p_currency text,
  p_status text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.orders (
    slug, stripe_session_id, stripe_customer_id, stripe_subscription_id,
    email, plan, amount_cents, currency, status, updated_at
  ) values (
    p_slug, p_stripe_session_id, p_stripe_customer_id, p_stripe_subscription_id,
    p_email, p_plan, p_amount_cents, p_currency, p_status, now()
  )
  on conflict (stripe_session_id) do update
  set slug = excluded.slug,
      stripe_customer_id = coalesce(public.orders.stripe_customer_id, excluded.stripe_customer_id),
      stripe_subscription_id = coalesce(public.orders.stripe_subscription_id, excluded.stripe_subscription_id),
      email = coalesce(public.orders.email, excluded.email),
      plan = excluded.plan,
      amount_cents = excluded.amount_cents,
      currency = excluded.currency,
      status = case
        when public.orders.billing_event_created is null then excluded.status
        else public.orders.status
      end,
      updated_at = now();
$$;
revoke all on function public.upsert_checkout_order(text, text, text, text, text, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.upsert_checkout_order(text, text, text, text, text, text, integer, text, text)
  to service_role;

-- Billing webhooks update only their owned keys while holding the portal row
-- lock. Stripe's (created,event_id) tuple makes equal-second races deterministic.
drop function if exists public.merge_portal_billing_state(text, text, jsonb, bigint);
create or replace function public.merge_portal_billing_state(
  p_slug text,
  p_billing_status text,
  p_data_patch jsonb,
  p_event_created bigint,
  p_event_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_event bigint;
  v_previous_event_id text;
  v_portal_status text;
  v_provisioning_succeeded boolean;
  v_patch jsonb := coalesce(p_data_patch, '{}'::jsonb);
begin
  select case
           when data->>'billing_event_created' ~ '^[0-9]+$'
             then (data->>'billing_event_created')::bigint
           else null
         end,
         data->>'billing_event_id',
         status,
         case
           when lower(data->>'provisioning_succeeded') in ('true', 'false')
             then (data->>'provisioning_succeeded')::boolean
           else false
         end
    into v_previous_event, v_previous_event_id, v_portal_status, v_provisioning_succeeded
    from public.portal_sites
    where slug = p_slug
    for update;

  if not found then
    raise exception 'portal site not found';
  end if;
  -- Stripe event IDs are opaque and event.created is only second-granular.
  -- Accept every event from the newest observed second so a terminal event
  -- cannot be discarded merely because its ID sorts before a peer event.
  if p_event_created is not null
     and v_previous_event is not null
     and v_previous_event > p_event_created then
    return false;
  end if;

  if p_event_created is not null then
    v_patch := v_patch || jsonb_build_object(
      'billing_event_created', p_event_created,
      'billing_event_id', p_event_id
    );
  end if;

  update public.portal_sites
  set status = case
        when p_billing_status in ('active', 'trialing', 'paid')
          then case when v_provisioning_succeeded then 'active' else v_portal_status end
        when p_billing_status in ('canceled', 'unpaid', 'incomplete_expired')
          then 'billing_suspended'
        else 'billing_attention'
      end,
      data = coalesce(data, '{}'::jsonb) || v_patch || jsonb_build_object('billing_status', p_billing_status),
      updated_at = now()
  where slug = p_slug;
  return true;
end;
$$;
revoke all on function public.merge_portal_billing_state(text, text, jsonb, bigint, text)
  from public, anon, authenticated;
grant execute on function public.merge_portal_billing_state(text, text, jsonb, bigint, text)
  to service_role;

create or replace function public.merge_order_billing_state(
  p_subscription_id text,
  p_status text,
  p_event_created bigint,
  p_event_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_event bigint;
  v_previous_event_id text;
begin
  select billing_event_created, stripe_event_id
    into v_previous_event, v_previous_event_id
    from public.orders
    where stripe_subscription_id = p_subscription_id
    order by created_at desc
    limit 1
    for update;
  if not found then
    raise exception 'order not found';
  end if;
  -- Do not order opaque Stripe event IDs within the same second. Every event
  -- is applied under this row lock; only events from an older second lose.
  if p_event_created is not null
     and v_previous_event is not null
     and v_previous_event > p_event_created then
    return false;
  end if;
  update public.orders
  set status = p_status,
      billing_event_created = p_event_created,
      stripe_event_id = p_event_id,
      updated_at = now()
  where stripe_subscription_id = p_subscription_id;
  return true;
end;
$$;
revoke all on function public.merge_order_billing_state(text, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.merge_order_billing_state(text, text, bigint, text)
  to service_role;

-- A value-free deployment sentinel. Application promotion fails before Netlify
-- publication unless the matching schema/RPC contract is already present.
create or replace function public.launch_schema_readiness()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'schemaVersion', '20260903.2',
    'ready',
      to_regclass('public.checkout_intents') is not null
      and to_regclass('public.stripe_webhook_events') is not null
      and to_regprocedure('public.upsert_portal_checkout_state(text,text,text,text,jsonb)') is not null
      and to_regprocedure('public.upsert_checkout_order(text,text,text,text,text,text,integer,text,text)') is not null
      and to_regprocedure('public.merge_portal_billing_state(text,text,jsonb,bigint,text)') is not null
      and to_regprocedure('public.merge_order_billing_state(text,text,bigint,text)') is not null
      and to_regclass('public.site_slugs_custom_domain_unique_idx') is not null
      and to_regclass('public.orders_stripe_session_unique_idx') is not null
      and to_regclass('public.orders_stripe_subscription_unique_idx') is not null
      and to_regclass('public.manual_service_tasks_checkout_type_unique_idx') is not null
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
  );
$$;
revoke all on function public.launch_schema_readiness() from public, anon, authenticated;
grant execute on function public.launch_schema_readiness() to service_role;

revoke all on public.intake_contacts from anon, authenticated;
revoke all on public.lead_captures from anon, authenticated;
revoke all on public.manual_service_tasks from anon, authenticated;
revoke all on public.custom_build_requests from anon, authenticated;

drop policy if exists "Allow public contact insert" on public.contact_messages;
revoke all on public.contact_messages from anon, authenticated;

comment on table public.checkout_intents is
  'Durable pre-Stripe checkout state; service-role access only.';
comment on table public.stripe_webhook_events is
  'Durable queue, idempotency ledger, leases, retries, and dead letters for verified Stripe events; service-role access only.';
