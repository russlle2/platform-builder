-- Launch hardening for payment idempotency, checkout durability, account
-- ownership, and service-only data. Apply before deploying the matching app.

alter table public.site_slugs
  add column if not exists reserved_for text,
  add column if not exists reservation_expires_at timestamptz;

drop index if exists public.site_slugs_slug_key; -- primary key already enforces uniqueness
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
  add column if not exists currency text,
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists orders_stripe_session_unique_idx
  on public.orders (stripe_session_id);
create index if not exists orders_slug_idx on public.orders (slug);

alter table public.manual_service_tasks
  add column if not exists stripe_session_id text;
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

-- Billing webhooks update only their owned keys while holding the portal row
-- lock. This prevents an event that started from a stale JSON snapshot from
-- erasing a simultaneous customer edit or custom-domain mirror. The Stripe
-- event creation time is checked inside the same transaction so out-of-order
-- events cannot win a race.
create or replace function public.merge_portal_billing_state(
  p_slug text,
  p_status text,
  p_data_patch jsonb,
  p_event_created bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_event bigint;
  v_patch jsonb := coalesce(p_data_patch, '{}'::jsonb);
begin
  select case
           when data->>'billing_event_created' ~ '^[0-9]+$'
             then (data->>'billing_event_created')::bigint
           else null
         end
    into v_previous_event
    from public.portal_sites
    where slug = p_slug
    for update;

  if not found then
    raise exception 'portal site not found';
  end if;
  if p_event_created is not null
     and v_previous_event is not null
     and v_previous_event > p_event_created then
    return false;
  end if;

  if p_event_created is not null then
    v_patch := v_patch || jsonb_build_object('billing_event_created', p_event_created);
  end if;

  update public.portal_sites
  set status = p_status,
      data = coalesce(data, '{}'::jsonb) || v_patch,
      updated_at = now()
  where slug = p_slug;
  return true;
end;
$$;
revoke all on function public.merge_portal_billing_state(text, text, jsonb, bigint)
  from public, anon, authenticated;
grant execute on function public.merge_portal_billing_state(text, text, jsonb, bigint)
  to service_role;

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
