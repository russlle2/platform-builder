-- Schema drift reconciliation: create tables that were referenced by existing
-- RLS policies (20260617215143_harden_advisor_warnings and
-- 20260617215232_validate_public_form_insert_policies) but never explicitly
-- created in any prior migration.

-- ── orders ───────────────────────────────────────────────────────────────────
-- Financial record of each completed Stripe checkout. Service-role only;
-- no public SELECT/INSERT — the Stripe webhook writes via the service key.
create table if not exists public.orders (
  id               uuid        primary key default gen_random_uuid(),
  slug             text        references public.site_slugs(slug),
  stripe_session_id text,
  stripe_customer_id text,
  email            text,
  plan             text,
  amount_cents     integer,
  status           text        not null default 'pending',
  created_at       timestamptz not null default now()
);

alter table public.orders enable row level security;

revoke all on public.orders from anon, authenticated;

-- ── booking_inquiries ─────────────────────────────────────────────────────────
-- Visitor booking requests submitted via site contact/booking forms.
create table if not exists public.booking_inquiries (
  id             uuid        primary key default gen_random_uuid(),
  slug           text        references public.site_slugs(slug),
  visitor_name   text,
  visitor_email  text,
  message        text,
  created_at     timestamptz not null default now()
);

alter table public.booking_inquiries enable row level security;

revoke all on public.booking_inquiries from anon, authenticated;
grant insert on public.booking_inquiries to anon, authenticated;
drop policy if exists "Allow public booking insert" on public.booking_inquiries;
create policy "Allow public booking insert" on public.booking_inquiries
  for insert to anon, authenticated
  with check (
    visitor_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(visitor_name) between 1 and 200
    and char_length(message) between 1 and 5000
  );

-- ── newsletter_subscribers ────────────────────────────────────────────────────
-- Email addresses collected from marketing opt-in widgets on generated sites.
create table if not exists public.newsletter_subscribers (
  id              uuid        primary key default gen_random_uuid(),
  email           text        not null unique,
  niche           text,
  source          text,
  subscribed_at   timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table public.newsletter_subscribers enable row level security;

revoke all on public.newsletter_subscribers from anon, authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;
drop policy if exists "Allow public newsletter insert" on public.newsletter_subscribers;
create policy "Allow public newsletter insert" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
