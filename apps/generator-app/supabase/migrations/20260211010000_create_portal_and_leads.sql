create table if not exists public.portal_sites (
  slug text primary key,
  data jsonb not null default '{}'::jsonb,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists portal_sites_status_idx on public.portal_sites (status);

create table if not exists public.lead_captures (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  source text default 'modal',
  created_at timestamptz default now()
);

create index if not exists lead_captures_created_at_idx on public.lead_captures (created_at desc);
