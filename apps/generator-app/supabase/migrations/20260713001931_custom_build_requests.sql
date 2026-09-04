create table if not exists public.custom_build_requests (
  id uuid primary key,
  status text not null default 'checkout_pending'
    check (status in ('checkout_pending', 'payment_pending', 'paid', 'checkout_failed', 'refunded', 'canceled')),
  business_name text not null,
  contact_name text,
  email text not null,
  phone text,
  site_vision text not null,
  required_functionality text not null,
  inspiration_links text,
  existing_website text,
  amount_cents integer not null default 50000 check (amount_cents = 50000),
  currency text not null default 'usd' check (currency = 'usd'),
  terms_accepted_at timestamptz not null,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  customer_notified_at timestamptz,
  owner_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_build_requests_email_idx
  on public.custom_build_requests (email);

create index if not exists custom_build_requests_status_created_idx
  on public.custom_build_requests (status, created_at desc);

alter table public.custom_build_requests enable row level security;

-- The browser never talks to this table directly. All writes come from the
-- rate-limited checkout route or the signature-verified Stripe webhook using
-- the server-only service role key.
revoke all on table public.custom_build_requests from anon, authenticated;
grant select, insert, update, delete on table public.custom_build_requests to service_role;
