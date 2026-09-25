-- Private, deterministic digital orders. Browser roles have no table/RPC access.
create table if not exists public.booking_kit_orders (
  id uuid primary key default gen_random_uuid(),
  state text not null default 'checkout_pending' check (state in ('checkout_pending', 'payment_pending', 'checkout_failed', 'paid', 'refunded')),
  purchase_email text not null,
  supplied_facts jsonb not null,
  artifact jsonb not null,
  artifact_version text not null,
  artifact_hash text not null check (artifact_hash ~ '^[a-f0-9]{64}$'),
  stripe_price_id text not null,
  amount_cents integer not null check (amount_cents = 900),
  currency text not null check (currency = 'usd'),
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  checkout_access_hash text unique check (checkout_access_hash ~ '^[a-f0-9]{64}$'),
  checkout_access_expires_at timestamptz,
  paid_at timestamptz,
  access_expires_at timestamptz,
  delivery_sent_at timestamptz,
  delivery_failed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (state <> 'paid' or (paid_at is not null and access_expires_at is not null and stripe_payment_intent_id is not null))
);
create index if not exists booking_kit_orders_email_idx on public.booking_kit_orders (purchase_email, paid_at desc);

create table if not exists public.booking_kit_access_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  order_id uuid not null references public.booking_kit_orders(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists booking_kit_access_tokens_order_idx on public.booking_kit_access_tokens (order_id);
create index if not exists booking_kit_access_tokens_expiry_idx on public.booking_kit_access_tokens (expires_at);

create table if not exists public.booking_kit_rate_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1
);
create index if not exists booking_kit_rate_limits_expiry_idx on public.booking_kit_rate_limits (window_started_at);

alter table public.booking_kit_orders enable row level security;
alter table public.booking_kit_access_tokens enable row level security;
alter table public.booking_kit_rate_limits enable row level security;
revoke all on public.booking_kit_orders, public.booking_kit_access_tokens, public.booking_kit_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.booking_kit_orders, public.booking_kit_access_tokens, public.booking_kit_rate_limits to service_role;
grant usage on schema public to service_role;

-- Invoker functions keep the existing service-role boundary. State transitions
-- lock the row and never overwrite a refund, even with reordered worker events.
drop function if exists public.fulfill_booking_kit_order(uuid, text, text, timestamptz);
drop function if exists public.revoke_booking_kit_order(uuid, text, text, timestamptz);
create or replace function public.fulfill_booking_kit_order(p_order_id uuid, p_session_id text, p_payment_intent_id text, p_paid_at timestamptz, p_purchase_email text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_order public.booking_kit_orders;
begin
  select * into current_order from public.booking_kit_orders where id = p_order_id for update;
  if not found or p_session_id is null or p_session_id = '' or current_order.stripe_session_id is distinct from p_session_id or p_payment_intent_id is null or p_payment_intent_id = '' then
    raise exception 'booking_kit_session_mismatch';
  end if;
  if current_order.stripe_payment_intent_id is not null and current_order.stripe_payment_intent_id <> p_payment_intent_id then
    raise exception 'booking_kit_payment_mismatch';
  end if;
  if p_paid_at is null or p_paid_at > now() + interval '5 minutes' or p_paid_at < current_order.created_at - interval '5 minutes' then raise exception 'booking_kit_paid_timestamp_invalid'; end if;
  if p_purchase_email is null or length(btrim(p_purchase_email)) > 254 or btrim(p_purchase_email) !~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+\.[^[:space:]<>@,;]+$' then raise exception 'booking_kit_purchase_email_invalid'; end if;
  if current_order.state = 'paid' then return false; end if;
  if current_order.state = 'refunded' then
    update public.booking_kit_orders set paid_at = coalesce(paid_at, p_paid_at),
      access_expires_at = coalesce(access_expires_at, p_paid_at + interval '90 days'),
      purchase_email = lower(btrim(p_purchase_email)), updated_at = now() where id = p_order_id;
    return false;
  end if;
  update public.booking_kit_orders set state = 'paid', stripe_payment_intent_id = p_payment_intent_id,
    purchase_email = lower(btrim(p_purchase_email)), paid_at = p_paid_at, access_expires_at = p_paid_at + interval '90 days', updated_at = now()
    where id = p_order_id;
  return true;
end $$;

create or replace function public.revoke_booking_kit_order(p_order_id uuid, p_session_id text, p_payment_intent_id text, p_paid_at timestamptz, p_purchase_email text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_order public.booking_kit_orders;
begin
  select * into current_order from public.booking_kit_orders where id = p_order_id for update;
  if not found or p_session_id is null or p_session_id = '' or current_order.stripe_session_id is distinct from p_session_id or p_payment_intent_id is null or p_payment_intent_id = '' then
    raise exception 'booking_kit_session_mismatch';
  end if;
  if current_order.stripe_payment_intent_id is not null and current_order.stripe_payment_intent_id <> p_payment_intent_id then
    raise exception 'booking_kit_payment_mismatch';
  end if;
  if p_paid_at is not null and (p_paid_at > now() + interval '5 minutes' or p_paid_at < current_order.created_at - interval '5 minutes') then raise exception 'booking_kit_paid_timestamp_invalid'; end if;
  if p_purchase_email is null or length(btrim(p_purchase_email)) > 254 or btrim(p_purchase_email) !~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+\.[^[:space:]<>@,;]+$' then raise exception 'booking_kit_purchase_email_invalid'; end if;
  if current_order.state = 'refunded' then
    if p_paid_at is not null and current_order.paid_at is null then
      update public.booking_kit_orders set paid_at = p_paid_at, access_expires_at = p_paid_at + interval '90 days',
        purchase_email = lower(btrim(p_purchase_email)), updated_at = now() where id = p_order_id;
    end if;
    return false;
  end if;
  update public.booking_kit_orders set state = 'refunded', stripe_payment_intent_id = p_payment_intent_id,
    purchase_email = lower(btrim(p_purchase_email)),
    paid_at = coalesce(paid_at, p_paid_at), access_expires_at = coalesce(access_expires_at, p_paid_at + interval '90 days'),
    refunded_at = now(), checkout_access_hash = null, checkout_access_expires_at = null, updated_at = now()
    where id = p_order_id;
  delete from public.booking_kit_access_tokens where order_id = p_order_id;
  return true;
end $$;

create or replace function public.read_booking_kit_result(p_token_hash text)
returns setof public.booking_kit_orders language sql stable security invoker set search_path = '' as $$
  select o.* from public.booking_kit_orders o
  where o.state <> 'refunded' and (
    (o.checkout_access_hash = p_token_hash and o.checkout_access_expires_at > now()) or
    exists (select 1 from public.booking_kit_access_tokens t where t.order_id = o.id and t.token_hash = p_token_hash and t.expires_at > now())
  ) and (o.state <> 'paid' or o.access_expires_at > now()) limit 1;
$$;

create or replace function public.consume_booking_kit_rate_limit(p_key text, p_max integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare used_attempts integer;
begin
  if p_max < 1 or p_max > 120 then return false; end if;
  delete from public.booking_kit_rate_limits where window_started_at < now() - interval '2 hours';
  delete from public.booking_kit_access_tokens where expires_at < now();
  insert into public.booking_kit_rate_limits (key_hash, window_started_at, attempts) values (p_key, now(), 1)
  on conflict (key_hash) do update set
    attempts = case when booking_kit_rate_limits.window_started_at <= now() - interval '1 hour' then 1 else least(booking_kit_rate_limits.attempts + 1, 121) end,
    window_started_at = case when booking_kit_rate_limits.window_started_at <= now() - interval '1 hour' then now() else booking_kit_rate_limits.window_started_at end
  returning attempts into used_attempts;
  return used_attempts <= p_max;
end $$;

create or replace function public.booking_kit_schema_version()
returns text language sql stable security invoker set search_path = '' as $$ select '20260925.1'::text $$;

revoke all on function public.fulfill_booking_kit_order(uuid, text, text, timestamptz, text), public.revoke_booking_kit_order(uuid, text, text, timestamptz, text), public.read_booking_kit_result(text), public.consume_booking_kit_rate_limit(text, integer), public.booking_kit_schema_version() from public, anon, authenticated;
grant execute on function public.fulfill_booking_kit_order(uuid, text, text, timestamptz, text), public.revoke_booking_kit_order(uuid, text, text, timestamptz, text), public.read_booking_kit_result(text), public.consume_booking_kit_rate_limit(text, integer), public.booking_kit_schema_version() to service_role;
