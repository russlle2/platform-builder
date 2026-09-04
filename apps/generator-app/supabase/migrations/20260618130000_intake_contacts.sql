create table if not exists public.intake_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  phone text,
  business_name text,
  niche text,
  source text default 'intake_wizard',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists intake_contacts_email_idx on public.intake_contacts(email);
create index if not exists intake_contacts_niche_idx on public.intake_contacts(niche);
create index if not exists intake_contacts_created_at_idx on public.intake_contacts(created_at desc);

-- RLS: Only service role can access (no public access)
alter table public.intake_contacts enable row level security;
-- No public policies — only accessible via service role key in API routes
