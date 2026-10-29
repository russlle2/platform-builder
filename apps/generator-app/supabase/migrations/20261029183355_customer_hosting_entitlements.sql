-- Additive entitlement evidence. No customer credentials or provider payloads
-- are retained, and no customer-facing role can read or mutate these records.
create table if not exists public.hosting_entitlements (
  slug text primary key references public.portal_sites(slug) on delete cascade,
  subscription_id text not null,
  customer_id text not null,
  plan text not null check (plan in ('basic', 'security_ads')),
  livemode boolean not null,
  kind text not null default 'unknown' check (kind in ('paid','trial','none','unknown')),
  subscription_status text not null default 'unknown',
  valid_from timestamptz,
  valid_through timestamptz,
  subscription_item_id text,
  price_id text,
  invoice_id text,
  verified_at timestamptz,
  next_reconcile_at timestamptz not null default now(),
  last_error text,
  generation bigint not null default 0,
  portal_billing_snapshot jsonb not null default '{}'::jsonb,
  lease_token uuid,
  lease_expires_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((valid_from is null and valid_through is null) or (valid_from is not null and valid_through is not null and valid_through > valid_from))
);
alter table public.hosting_entitlements enable row level security;
revoke all on public.hosting_entitlements from public, anon, authenticated;
grant select, insert, update on public.hosting_entitlements to service_role;
create index if not exists hosting_entitlements_due_idx on public.hosting_entitlements(next_reconcile_at);

create table if not exists public.hosting_operations (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.portal_sites(slug) on delete cascade,
  site_id text not null,
  action text not null check (action in ('disable','enable')),
  phase text not null check (phase in ('requested','confirmed','unknown','rejected')),
  entitlement_generation bigint not null,
  binding jsonb not null,
  baseline jsonb not null,
  restored_from uuid references public.hosting_operations(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text
);
alter table public.hosting_operations enable row level security;
revoke all on public.hosting_operations from public, anon, authenticated;
grant select, insert, update on public.hosting_operations to service_role;
create index if not exists hosting_operations_site_idx on public.hosting_operations(slug, created_at desc);

alter table public.portal_sites add column if not exists hosting_reconcile_after timestamptz not null default now();

-- Claim before contacting Stripe. A unique lease/generation fences late HTTP
-- responses; event.created cannot order independent live provider reads.
create or replace function public.claim_hosting_reconciliation(
  p_slug text, p_subscription_id text, p_customer_id text, p_plan text, p_livemode boolean
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare p public.portal_sites; e public.hosting_entitlements; t uuid; g bigint;
begin
  select * into p from public.portal_sites where slug=p_slug for update;
  if not found or p.data->>'stripe_subscription_id' is distinct from p_subscription_id
    or p.data->>'stripe_customer_id' is distinct from p_customer_id
    or p.data->>'plan' is distinct from p_plan or p_plan not in ('basic','security_ads')
    or nullif(p_subscription_id,'') is null or nullif(p_customer_id,'') is null then
    return jsonb_build_object('claimed',false,'reason','identity_changed');
  end if;
  insert into public.hosting_entitlements(slug,subscription_id,customer_id,plan,livemode)
    values(p_slug,p_subscription_id,p_customer_id,p_plan,p_livemode) on conflict(slug) do nothing;
  select * into e from public.hosting_entitlements where slug=p_slug for update;
  if e.lease_expires_at > clock_timestamp() then
    return jsonb_build_object('claimed',false,'reason','busy');
  end if;
  t := gen_random_uuid(); g := e.generation + 1;
  if e.subscription_id is distinct from p_subscription_id or e.customer_id is distinct from p_customer_id
    or e.plan is distinct from p_plan or e.livemode is distinct from p_livemode then
    update public.hosting_entitlements set
      subscription_id=p_subscription_id,customer_id=p_customer_id,plan=p_plan,livemode=p_livemode,
      kind='unknown',subscription_status='unknown',valid_from=null,valid_through=null,
      subscription_item_id=null,price_id=null,invoice_id=null,verified_at=null
      where slug=p_slug;
  end if;
  update public.hosting_entitlements set generation=g,lease_token=t,
    portal_billing_snapshot=jsonb_build_object('status',p.status,'billingStatus',p.data->>'billing_status',
      'eventId',p.data->>'billing_event_id','eventCreated',p.data->>'billing_event_created'),
    next_reconcile_at=clock_timestamp(),lease_expires_at=clock_timestamp()+interval '2 minutes',updated_at=clock_timestamp() where slug=p_slug;
  return jsonb_build_object('claimed',true,'token',t,'generation',g);
end; $$;

create or replace function public.finish_hosting_reconciliation(
  p_slug text, p_token uuid, p_generation bigint, p_observation jsonb
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare p public.portal_sites; e public.hosting_entitlements; k text;
begin
  select * into p from public.portal_sites where slug=p_slug for update;
  select * into e from public.hosting_entitlements where slug=p_slug for update;
  if not found or e.lease_token is distinct from p_token or e.generation <> p_generation
    or e.lease_expires_at <= clock_timestamp()
    or p.data->>'stripe_subscription_id' is distinct from e.subscription_id
    or p.data->>'stripe_customer_id' is distinct from e.customer_id
    or p.data->>'plan' is distinct from e.plan then return false; end if;
  if e.portal_billing_snapshot is distinct from jsonb_build_object('status',p.status,'billingStatus',p.data->>'billing_status',
      'eventId',p.data->>'billing_event_id','eventCreated',p.data->>'billing_event_created') then
    update public.hosting_entitlements set lease_token=null,lease_expires_at=null,next_reconcile_at=clock_timestamp() where slug=p_slug;
    return false;
  end if;
  k := p_observation->>'kind';
  if k not in ('paid','trial','none','unknown') then raise exception 'invalid_hosting_observation'; end if;
  if k in ('paid','trial') and (
    nullif(p_observation->>'validFrom','') is null or nullif(p_observation->>'validThrough','') is null
    or (p_observation->>'validThrough')::timestamptz <= (p_observation->>'validFrom')::timestamptz
    or nullif(p_observation->>'subscriptionItemId','') is null or nullif(p_observation->>'priceId','') is null
  ) then raise exception 'invalid_hosting_coverage'; end if;
  if k = 'unknown' then
    -- A failed/ambiguous read is not revocation of proven coverage. Preserve
    -- the last good record, but make uncertainty visible to the operator.
    update public.hosting_entitlements set last_error='provider_observation_unavailable',
      next_reconcile_at=clock_timestamp()+interval '5 minutes',lease_token=null,lease_expires_at=null,
      updated_at=clock_timestamp() where slug=p_slug;
  else
    -- Commit the current provider observation with its portal billing display.
    -- The captured snapshot above prevents overwriting a newer webhook.
    update public.portal_sites set status=case
      when k in ('paid','trial') and data->>'provisioning_succeeded'='true' then 'active'
      when k='none' and p_observation->>'subscriptionStatus' in ('canceled','unpaid','incomplete_expired') then 'billing_suspended'
      when k='none' then 'billing_attention' else status end,
      data=data || jsonb_build_object('billing_status',p_observation->>'subscriptionStatus'),updated_at=clock_timestamp()
      where slug=p_slug;
    update public.hosting_entitlements set kind=k,
      subscription_status=p_observation->>'subscriptionStatus',
      valid_from=case when k in ('paid','trial') then (p_observation->>'validFrom')::timestamptz else valid_from end,
      valid_through=case when k in ('paid','trial') then (p_observation->>'validThrough')::timestamptz else valid_through end,
      subscription_item_id=coalesce(p_observation->>'subscriptionItemId',subscription_item_id),
      price_id=coalesce(p_observation->>'priceId',price_id),
      invoice_id=coalesce(p_observation->>'invoiceId',invoice_id),
      verified_at=clock_timestamp(),last_error=null,
      next_reconcile_at=greatest(clock_timestamp()+interval '5 minutes',least(clock_timestamp()+interval '1 hour',
        coalesce((p_observation->>'validThrough')::timestamptz,clock_timestamp()+interval '1 hour'))),
      lease_token=null,lease_expires_at=null,updated_at=clock_timestamp() where slug=p_slug;
  end if;
  return true;
end; $$;

-- Calling this inside a quota transaction serializes eligibility with every
-- billing observation. The wall clock is read AFTER acquiring the row lock.
create or replace function public.customer_service_entitlement(p_slug text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare e public.hosting_entitlements; p public.portal_sites; n timestamptz; r text := null;
begin
  select * into p from public.portal_sites where slug=p_slug for update;
  select * into e from public.hosting_entitlements where slug=p_slug for update;
  if not found then return jsonb_build_object('allowed',false,'tier',null,'reason','unverified','validThrough',null); end if;
  n := clock_timestamp();
  if p.slug is null or p.data->>'stripe_subscription_id' is distinct from e.subscription_id
    or p.data->>'stripe_customer_id' is distinct from e.customer_id
    or p.data->>'plan' is distinct from e.plan then r := 'identity_changed';
  elsif p.status in ('provisioning_failed','pending','draft')
    or p.data->>'provisioning_succeeded' is distinct from 'true' then r := 'site_not_ready';
  elsif p.status in ('billing_suspended','billing_attention')
    or p.data->>'billing_status' in ('canceled','unpaid','past_due','incomplete','incomplete_expired','paused') then r := 'billing_inactive';
  elsif e.kind not in ('paid','trial') or e.verified_at is null then r := 'unverified';
  elsif e.subscription_status not in ('active','trialing') then r := 'billing_inactive';
  elsif (e.kind='trial') is distinct from (e.subscription_status='trialing') then r := 'unverified';
  elsif e.valid_from is null or e.valid_through is null or n < e.valid_from then r := 'unverified';
  elsif n >= e.valid_through then r := 'expired'; end if;
  return jsonb_build_object('allowed',r is null,'tier',case when r is null then e.kind else null end,
    'reason',coalesce(r,'included'),'validThrough',e.valid_through);
end; $$;

create or replace function public.due_hosting_reconciliations(p_limit integer default 20)
returns table(slug text) language plpgsql security invoker set search_path = '' as $$
begin
  -- Reserve even malformed/unprocessable records for a retry delay so they
  -- cannot monopolize the first page and starve valid customers behind them.
  return query with picked as (
    select p.slug from public.portal_sites p left join public.hosting_entitlements e on e.slug=p.slug
    where nullif(p.data->>'stripe_subscription_id','') is not null
      and nullif(p.data->>'stripe_customer_id','') is not null
      and p.data->>'plan' in ('basic','security_ads')
      and greatest(p.hosting_reconcile_after,coalesce(e.next_reconcile_at,'-infinity'::timestamptz)) <= clock_timestamp()
      and (e.lease_expires_at is null or e.lease_expires_at <= clock_timestamp())
    order by p.hosting_reconcile_after,e.next_reconcile_at nulls first,p.slug
    limit greatest(1,least(100,p_limit)) for update of p skip locked
  ) update public.portal_sites p set hosting_reconcile_after=clock_timestamp()+interval '5 minutes'
    from picked where p.slug=picked.slug returning p.slug;
end; $$;

create or replace function public.billing_lifecycle_schema_readiness()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('schemaVersion','20261029.1','ready',
    to_regclass('public.hosting_entitlements') is not null
    and to_regclass('public.hosting_operations') is not null
    and to_regprocedure('public.customer_service_entitlement(text)') is not null
    and to_regprocedure('public.claim_hosting_reconciliation(text,text,text,text,boolean)') is not null
    and to_regprocedure('public.finish_hosting_reconciliation(text,uuid,bigint,jsonb)') is not null);
$$;

revoke all on function public.claim_hosting_reconciliation(text,text,text,text,boolean) from public,anon,authenticated;
revoke all on function public.finish_hosting_reconciliation(text,uuid,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.customer_service_entitlement(text) from public,anon,authenticated;
revoke all on function public.due_hosting_reconciliations(integer) from public,anon,authenticated;
revoke all on function public.billing_lifecycle_schema_readiness() from public,anon,authenticated;
grant execute on function public.claim_hosting_reconciliation(text,text,text,text,boolean) to service_role;
grant execute on function public.finish_hosting_reconciliation(text,uuid,bigint,jsonb) to service_role;
grant execute on function public.customer_service_entitlement(text) to service_role;
grant execute on function public.due_hosting_reconciliations(integer) to service_role;
grant execute on function public.billing_lifecycle_schema_readiness() to service_role;

-- A historical subscription cannot rebind the current customer portal.
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
  v_current_subscription text;
  v_current_customer text;
  v_current_session text;
  v_incoming_subscription text;
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
         , nullif(data->>'stripe_subscription_id',''), nullif(data->>'stripe_customer_id',''), nullif(data->>'stripe_session_id','')
    into v_previous_event, v_previous_event_id, v_portal_status, v_provisioning_succeeded, v_current_subscription, v_current_customer, v_current_session
    from public.portal_sites
    where slug = p_slug
    for update;

  if not found then
    raise exception 'portal site not found';
  end if;
  v_incoming_subscription := nullif(v_patch->>'stripe_subscription_id','');
  if v_current_subscription is not null and v_incoming_subscription is distinct from v_current_subscription then return false; end if;
  if v_current_subscription is null and not exists (
    select 1 from public.orders o where o.slug=p_slug and o.stripe_subscription_id=v_incoming_subscription
      and (v_current_customer is null or o.stripe_customer_id=v_current_customer)
      and (v_current_session is null or o.stripe_session_id=v_current_session)
  ) then return false; end if;
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

-- Checkpoint retries may fill missing identity fields but cannot replace them.
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
             'checkout_intent_id', 'stripe_session_id', 'stripe_customer_id', 'stripe_subscription_id',
             'custom_domain', 'billing_status', 'billing_updated_at',
             'billing_event_created', 'billing_event_id',
             'customerValues', 'inlineEdits', 'imageSwaps', 'customTheme',
             'colorScheme', 'fontVariation', 'structureVariation', 'template'
           ]::text[])
        || jsonb_strip_nulls(jsonb_build_object('checkout_intent_id',coalesce(nullif(public.portal_sites.data->>'checkout_intent_id',''),nullif(excluded.data->>'checkout_intent_id','')),'stripe_session_id',coalesce(nullif(public.portal_sites.data->>'stripe_session_id',''),nullif(excluded.data->>'stripe_session_id','')),'stripe_customer_id',coalesce(nullif(public.portal_sites.data->>'stripe_customer_id',''),nullif(excluded.data->>'stripe_customer_id','')),'stripe_subscription_id',coalesce(nullif(public.portal_sites.data->>'stripe_subscription_id',''),nullif(excluded.data->>'stripe_subscription_id',''))))
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
  where not exists (select 1 from unnest(array['checkout_intent_id','stripe_session_id','stripe_customer_id','stripe_subscription_id']) as keys(k)
    where nullif(public.portal_sites.data->>k,'') is not null and nullif(excluded.data->>k,'') is not null
      and public.portal_sites.data->>k is distinct from excluded.data->>k)
    and (case when nullif(public.portal_sites.data->>'stripe_session_id','') is not null
      then public.portal_sites.data->>'stripe_session_id' = excluded.data->>'stripe_session_id'
      when nullif(public.portal_sites.data->>'checkout_intent_id','') is not null
      then public.portal_sites.data->>'checkout_intent_id' = excluded.data->>'checkout_intent_id'
      else true end)
  returning data into v_data;
  if not found then raise exception 'portal checkout identity mismatch'; end if;
  return v_data;
end;
$$;
