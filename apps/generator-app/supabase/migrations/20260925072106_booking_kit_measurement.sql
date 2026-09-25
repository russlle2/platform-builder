-- Private operational measurements. Missing support time stays unknown, not zero.
alter table public.booking_kit_orders
  add column if not exists preview_transferred_at timestamptz,
  add column if not exists support_minutes integer check (support_minutes >= 0);

-- Financial evidence survives subscription entitlement changes and queue-payload
-- scrubbing. Zero-dollar trial invoices are deliberately not paid conversions.
alter table public.orders
  add column if not exists first_payment_received_at timestamptz,
  add column if not exists first_payment_amount_cents integer check (first_payment_amount_cents > 0);
-- Keep existing order financial columns behind their dedicated RPCs; only the
-- new measurement columns need invoker UPDATE permission for this RPC.
grant update (first_payment_received_at, first_payment_amount_cents) on public.orders to service_role;

create or replace function public.record_order_payment(
  p_subscription_id text, p_session_id text, p_amount_cents integer, p_paid_at timestamptz
)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare matching_order public.orders;
begin
  if p_amount_cents is null or p_amount_cents <= 0 or p_paid_at is null or
    p_paid_at < '2000-01-01'::timestamptz or p_paid_at > now() + interval '5 minutes' then
    raise exception 'invalid_payment_evidence';
  end if;
  select * into matching_order from public.orders
    where (p_session_id is not null and stripe_session_id = p_session_id)
      or (p_session_id is null and p_subscription_id is not null and stripe_subscription_id = p_subscription_id)
    order by created_at desc, id limit 1 for update;
  if not found then raise exception 'payment_order_not_ready'; end if;
  if p_subscription_id is not null and matching_order.stripe_subscription_id is distinct from p_subscription_id then
    raise exception 'payment_subscription_mismatch';
  end if;
  if matching_order.first_payment_received_at is not null and matching_order.first_payment_received_at <= p_paid_at then
    return false;
  end if;
  update public.orders set first_payment_received_at = p_paid_at,
    first_payment_amount_cents = p_amount_cents where id = matching_order.id;
  return true;
end;
$$;

create or replace function public.record_booking_kit_transfer(p_token_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare matching_order public.booking_kit_orders;
begin
  select * into matching_order from public.read_booking_kit_result(p_token_hash)
    where state = 'paid' and access_expires_at > now();
  if matching_order.id is null then return false; end if;
  update public.booking_kit_orders set preview_transferred_at = coalesce(preview_transferred_at, now())
    where id = matching_order.id and state = 'paid' and access_expires_at > now();
  return found;
end;
$$;

create or replace function public.booking_kit_first_25_report()
returns jsonb language sql stable security invoker set search_path = '' as $$
  with first_purchase as (
    select distinct on (purchase_email) * from public.booking_kit_orders
    where paid_at is not null or refunded_at is not null
    order by purchase_email, coalesce(paid_at, refunded_at), id
  ), cohort as (
    select * from first_purchase order by coalesce(paid_at, refunded_at), id limit 25
  ), cohort_orders as (
    select o.* from public.booking_kit_orders o join cohort c using (purchase_email)
    where o.paid_at is not null or o.refunded_at is not null
  )
  select jsonb_build_object(
    'cohortLimit', 25,
    'buyersObserved', (select count(*) from cohort),
    'completedFirstPurchases', (select count(*) from cohort),
    'completedPurchases', count(*),
    'deliveredByEmail', count(*) filter (where delivery_sent_at is not null),
    'ordersWithDeliveryFailures', count(*) filter (where delivery_failed_at is not null),
    'unresolvedDeliveryFailures', count(*) filter (where delivery_failed_at is not null and delivery_sent_at is null and state = 'paid'),
    'refunds', count(*) filter (where state = 'refunded'),
    'previewTransfers', count(*) filter (where preview_transferred_at is not null),
    'supportTimeRecordedFor', count(support_minutes),
    'recordedSupportMinutes', sum(support_minutes),
    'buyersWithLaterWebsitePurchase', (select count(*) from cohort c where exists (
      select 1 from public.orders o where lower(trim(o.email)) = c.purchase_email
      and o.first_payment_received_at >= coalesce(c.paid_at, c.refunded_at)
      and o.plan = 'basic' and o.first_payment_amount_cents > 0
    )),
    'buyersWithLaterCustomBuild', (select count(*) from cohort c where exists (
      select 1 from public.custom_build_requests b where lower(trim(b.email)) = c.purchase_email
      and b.paid_at >= coalesce(c.paid_at, c.refunded_at) and b.status = 'paid'
    ))
  ) from cohort_orders;
$$;

revoke all on function public.record_order_payment(text, text, integer, timestamptz), public.record_booking_kit_transfer(text), public.booking_kit_first_25_report() from public, anon, authenticated;
grant execute on function public.record_order_payment(text, text, integer, timestamptz), public.record_booking_kit_transfer(text), public.booking_kit_first_25_report() to service_role;

-- A checkout gate at this version proves both private access and measurement
-- migrations exist before any checkout can depend on their worker RPCs.
create or replace function public.booking_kit_schema_version()
returns text language sql stable security invoker set search_path = '' as $$ select '20260925.2'::text $$;
