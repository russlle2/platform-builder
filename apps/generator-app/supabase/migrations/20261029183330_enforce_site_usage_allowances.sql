-- Application-owned allowances. These do not create Stripe usage charges.
-- Only the existing server service role can claim or settle an operation.
create table if not exists public.site_usage_counters (
  owner text not null,
  period date not null,
  metric text not null check (metric in ('publish', 'contact')),
  used integer not null default 0 check (used >= 0),
  primary key (owner, period, metric)
);
create table if not exists public.site_usage_operations (
  owner text not null,
  metric text not null check (metric in ('publish', 'contact')),
  operation_id text not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  period date not null,
  state text not null check (state in ('pending', 'completed', 'released')),
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner, metric, operation_id),
  foreign key (owner, period, metric) references public.site_usage_counters(owner, period, metric)
);
create table if not exists public.customer_image_reservations (
  path text primary key,
  owner text not null,
  bytes bigint not null check (bytes > 0 and bytes <= 4194304),
  created_at timestamptz not null default now()
);
create index if not exists customer_image_reservations_owner_idx on public.customer_image_reservations(owner);

alter table public.site_usage_counters enable row level security;
alter table public.site_usage_operations enable row level security;
alter table public.customer_image_reservations enable row level security;
revoke all on public.site_usage_counters, public.site_usage_operations, public.customer_image_reservations from public, anon, authenticated;
grant select, insert, update, delete on public.site_usage_counters, public.site_usage_operations, public.customer_image_reservations to service_role;

create or replace function public.reserve_site_usage(p_slug text, p_metric text, p_operation_id text, p_fingerprint text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_period date;
  v_reset timestamptz;
  v_now timestamptz;
  v_entitlement jsonb;
  v_limit integer;
  v_used integer;
  v_existing public.site_usage_operations%rowtype;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{0,62}$'
    or p_metric not in ('publish', 'contact') or p_metric is null
    or p_operation_id is null or p_operation_id !~ '^[a-f0-9-]{36,64}$'
    or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_usage_request';
  end if;
  -- Billing locks precede quota locks everywhere so reconciliation cannot form
  -- a reverse lock dependency with publication/contact requests.
  v_entitlement := public.customer_service_entitlement(p_slug);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dc-usage:' || p_slug, 0));
  select * into v_existing from public.site_usage_operations
    where owner = p_slug and metric = p_metric and operation_id = p_operation_id;
  if found then
    if v_existing.fingerprint <> p_fingerprint then
      return jsonb_build_object('state', 'conflict');
    end if;
    -- Replays never perform an external action again, including after expiry
    -- or a calendar-month boundary. Account/history reads stay available.
    if v_existing.state = 'completed' then
      return jsonb_build_object('state', 'completed', 'status', v_existing.response_status, 'body', v_existing.response_body);
    elsif v_existing.state = 'pending' then
      return jsonb_build_object('state', 'pending');
    end if;
  end if;
  if v_entitlement->>'allowed' is distinct from 'true' or coalesce(v_entitlement->>'tier', '') not in ('paid', 'trial') then
    return jsonb_build_object('state', 'ineligible', 'reason', coalesce(v_entitlement->>'reason', 'billing_unknown'));
  end if;
  -- One in-flight publication per site also preserves content order. A provider
  -- timeout retains this slot until its real outcome has been reconciled.
  if p_metric = 'publish' and exists (select 1 from public.site_usage_operations
    where owner = p_slug and metric = 'publish' and state = 'pending') then
    return jsonb_build_object('state', 'pending');
  end if;
  v_limit := case when p_metric = 'publish' then
    case when v_entitlement->>'tier' = 'trial' then 5 else 30 end
    else case when v_entitlement->>'tier' = 'trial' then 20 else 200 end end;
  -- Read the clock after waiting for locks. A request delayed across expiry or
  -- a UTC month boundary must not spend an earlier interval's allowance.
  loop
    v_now := clock_timestamp();
    v_period := date_trunc('month', timezone('UTC', v_now))::date;
    insert into public.site_usage_counters(owner, period, metric) values (p_slug, v_period, p_metric)
      on conflict do nothing;
    select used into v_used from public.site_usage_counters
      where owner = p_slug and period = v_period and metric = p_metric for update;
    v_now := clock_timestamp();
    exit when v_period = date_trunc('month', timezone('UTC', v_now))::date;
  end loop;
  if not coalesce(v_now < (v_entitlement->>'validThrough')::timestamptz, false) then
    return jsonb_build_object('state', 'ineligible', 'reason', 'expired');
  end if;
  v_reset := (date_trunc('month', timezone('UTC', v_now)) + interval '1 month') at time zone 'UTC';
  if v_used >= v_limit then
    return jsonb_build_object('state', 'limited', 'limit', v_limit, 'used', v_used, 'resetAt', v_reset);
  end if;
  update public.site_usage_counters set used = used + 1
    where owner = p_slug and period = v_period and metric = p_metric;
  insert into public.site_usage_operations(owner, metric, operation_id, fingerprint, period, state)
    values (p_slug, p_metric, p_operation_id, p_fingerprint, v_period, 'pending')
    on conflict (owner, metric, operation_id) do update
      set state = 'pending', period = excluded.period, response_status = null, response_body = null, updated_at = now();
  return jsonb_build_object('state', 'reserved', 'limit', v_limit, 'used', v_used + 1, 'resetAt', v_reset);
end $$;

create or replace function public.finish_site_usage(p_slug text, p_metric text, p_operation_id text, p_fingerprint text, p_status integer, p_body jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_status < 200 or p_status > 599 or p_status is null
    or jsonb_typeof(p_body) is distinct from 'object' or pg_column_size(p_body) > 8192 then
    raise exception 'invalid_usage_response';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dc-usage:' || p_slug, 0));
  update public.site_usage_operations set state = 'completed', response_status = p_status,
    response_body = p_body, updated_at = now()
    where owner = p_slug and metric = p_metric and operation_id = p_operation_id
      and fingerprint = p_fingerprint and state = 'pending';
  return found;
end $$;

-- Call only after independently establishing that no external side effect ran.
-- Unknown or failed provider outcomes consume the allowance until reconciled.
create or replace function public.release_site_usage(p_slug text, p_metric text, p_operation_id text, p_fingerprint text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_period date;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dc-usage:' || p_slug, 0));
  update public.site_usage_operations set state = 'released', updated_at = now()
    where owner = p_slug and metric = p_metric and operation_id = p_operation_id
      and fingerprint = p_fingerprint and state = 'pending' returning period into v_period;
  if not found then return false; end if;
  update public.site_usage_counters set used = used - 1
    where owner = p_slug and metric = p_metric and period = v_period and used > 0;
  if not found then raise exception 'usage_counter_inconsistent'; end if;
  return true;
end $$;

create or replace function public.customer_image_usage(p_owner text)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_bytes bigint; v_count integer; v_unknown integer; v_pending_bytes bigint; v_pending_count integer;
begin
  if p_owner is null or p_owner !~ '^[a-z0-9][a-z0-9-]{0,62}$' then raise exception 'invalid_image_owner'; end if;
  select coalesce(sum(case when metadata->>'size' ~ '^[0-9]{1,18}$' then (metadata->>'size')::bigint else 0 end), 0),
    count(*), count(*) filter (where metadata->>'size' is null or metadata->>'size' !~ '^[0-9]{1,18}$')
    into v_bytes, v_count, v_unknown from storage.objects
    where bucket_id = 'customer-images' and name like p_owner || '/%';
  if v_unknown > 0 then raise exception 'image_usage_unknown'; end if;
  -- A successful upload is already counted by Storage even if the process died
  -- before retiring its reservation. Never double-count that same object.
  select coalesce(sum(r.bytes), 0), count(*) into v_pending_bytes, v_pending_count
    from public.customer_image_reservations r where r.owner = p_owner
    and not exists (select 1 from storage.objects o where o.bucket_id = 'customer-images' and o.name = r.path);
  return jsonb_build_object('bytes', v_bytes + v_pending_bytes, 'objects', v_count + v_pending_count);
end $$;

create or replace function public.reserve_customer_image(p_owner text, p_path text, p_bytes bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_draft boolean;
  v_entitlement jsonb;
  v_usage jsonb;
  v_limit bigint := 104857600;
  v_objects integer := 100;
  v_global_bytes bigint;
  v_global_unknown integer;
begin
  if p_owner is null or p_owner !~ '^[a-z0-9][a-z0-9-]{0,62}$' or p_path is null
    or left(p_path, length(p_owner) + 1) <> p_owner || '/'
    or substring(p_path from length(p_owner) + 2) !~ '^[a-zA-Z0-9_-]+\.webp$'
    or p_bytes is null or p_bytes < 1 or p_bytes > 4194304 then raise exception 'invalid_image_reservation'; end if;
  v_draft := p_owner ~ '^draft-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  if not v_draft then v_entitlement := public.customer_service_entitlement(p_owner); end if;
  -- All guest owners share one outstanding storage ceiling. Cookies cannot
  -- evade this bound by requesting a fresh draft identity.
  if v_draft then perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dc-draft-storage', 0)); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dc-usage:' || p_owner, 0));
  if exists (select 1 from public.customer_image_reservations where path = p_path)
    or exists (select 1 from storage.objects where bucket_id = 'customer-images' and name = p_path) then
    return jsonb_build_object('state', 'conflict');
  end if;
  if not v_draft then
    if v_entitlement->>'allowed' is distinct from 'true' or coalesce(v_entitlement->>'tier', '') not in ('paid', 'trial') then
      return jsonb_build_object('state', 'ineligible', 'reason', coalesce(v_entitlement->>'reason', 'billing_unknown'));
    end if;
  end if;
  if v_draft or v_entitlement->>'tier' = 'trial' then v_limit := 20971520; v_objects := 20; end if;
  v_usage := public.customer_image_usage(p_owner);
  if (v_usage->>'bytes')::bigint + p_bytes > v_limit or (v_usage->>'objects')::integer + 1 > v_objects then
    return v_usage || jsonb_build_object('state', 'limited', 'byteLimit', v_limit, 'objectLimit', v_objects);
  end if;
  if v_draft then
    select coalesce(sum(case when metadata->>'size' ~ '^[0-9]{1,18}$' then (metadata->>'size')::bigint else 0 end), 0),
      count(*) filter (where metadata->>'size' is null or metadata->>'size' !~ '^[0-9]{1,18}$')
      into v_global_bytes, v_global_unknown from storage.objects
      where bucket_id = 'customer-images' and name like 'draft-%/%';
    if v_global_unknown > 0 then raise exception 'draft_image_usage_unknown'; end if;
    select v_global_bytes + coalesce(sum(r.bytes), 0) into v_global_bytes from public.customer_image_reservations r
      where r.owner like 'draft-%' and not exists
      (select 1 from storage.objects o where o.bucket_id = 'customer-images' and o.name = r.path);
    if v_global_bytes + p_bytes > 10737418240 then return jsonb_build_object('state', 'platform_capacity'); end if;
  end if;
  if not v_draft and not coalesce(clock_timestamp() < (v_entitlement->>'validThrough')::timestamptz, false) then
    return jsonb_build_object('state', 'ineligible', 'reason', 'expired');
  end if;
  insert into public.customer_image_reservations(path, owner, bytes) values (p_path, p_owner, p_bytes);
  return v_usage || jsonb_build_object('state', 'reserved', 'byteLimit', v_limit, 'objectLimit', v_objects);
end $$;

-- This only retires a reservation when Storage independently contains its exact
-- object. Failed/ambiguous uploads retain reservations for operator reconciliation.
create or replace function public.confirm_customer_image(p_owner text, p_path text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dc-usage:' || p_owner, 0));
  delete from public.customer_image_reservations r where r.owner = p_owner and r.path = p_path
    and exists (select 1 from storage.objects o where o.bucket_id = 'customer-images' and o.name = r.path);
  return found;
end $$;

create or replace function public.site_usage_status(p_slug text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_entitlement jsonb := public.customer_service_entitlement(p_slug);
  v_period date := date_trunc('month', timezone('UTC', now()))::date;
  v_trial boolean := v_entitlement->>'tier' = 'trial';
  v_publish integer; v_contact integer;
begin
  select coalesce(sum(used) filter (where metric = 'publish'), 0), coalesce(sum(used) filter (where metric = 'contact'), 0)
    into v_publish, v_contact from public.site_usage_counters where owner = p_slug and period = v_period;
  return jsonb_build_object('entitlement', v_entitlement,
    'resetAt', (date_trunc('month', timezone('UTC', now())) + interval '1 month') at time zone 'UTC',
    'publish', jsonb_build_object('used', v_publish, 'limit', case when v_trial then 5 else 30 end),
    'contact', jsonb_build_object('used', v_contact, 'limit', case when v_trial then 20 else 200 end),
    'storage', public.customer_image_usage(p_slug) || jsonb_build_object('byteLimit', case when v_trial then 20971520 else 104857600 end,
      'objectLimit', case when v_trial then 20 else 100 end));
end $$;

-- Only used after the owner requested deletion and Storage confirmed it.
-- If the exact object still exists, its reservation cannot be released.
create or replace function public.release_deleted_customer_image(p_owner text, p_path text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dc-usage:' || p_owner, 0));
  delete from public.customer_image_reservations r where r.owner = p_owner and r.path = p_path
    and not exists (select 1 from storage.objects o where o.bucket_id = 'customer-images' and o.name = r.path);
  return found;
end $$;

create or replace function public.site_usage_schema_readiness()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('schemaVersion', '20261029.1', 'ready',
    to_regprocedure('public.customer_service_entitlement(text)') is not null
    and has_table_privilege('service_role', 'storage.objects', 'SELECT')
    and (select count(*) = 3 and bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in ('site_usage_counters', 'site_usage_operations', 'customer_image_reservations')));
$$;

revoke all on function public.reserve_site_usage(text,text,text,text), public.finish_site_usage(text,text,text,text,integer,jsonb),
  public.release_site_usage(text,text,text,text), public.customer_image_usage(text), public.reserve_customer_image(text,text,bigint),
  public.confirm_customer_image(text,text), public.release_deleted_customer_image(text,text), public.site_usage_status(text), public.site_usage_schema_readiness() from public, anon, authenticated;
grant execute on function public.reserve_site_usage(text,text,text,text), public.finish_site_usage(text,text,text,text,integer,jsonb),
  public.release_site_usage(text,text,text,text), public.customer_image_usage(text), public.reserve_customer_image(text,text,bigint),
  public.confirm_customer_image(text,text), public.release_deleted_customer_image(text,text), public.site_usage_status(text), public.site_usage_schema_readiness() to service_role;
