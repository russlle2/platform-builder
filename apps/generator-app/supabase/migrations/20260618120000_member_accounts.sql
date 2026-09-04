-- Member accounts linked to Supabase Auth users
create table if not exists public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz default now()
);

alter table public.accounts enable row level security;

create policy "Users can read own account" on public.accounts
  for select using (auth.uid() = id);

-- Allow authenticated users to insert their own account row (used by auth trigger)
create policy "Users can insert own account" on public.accounts
  for insert with check (auth.uid() = id);

-- Add owner_email to portal_sites for account-based access
alter table public.portal_sites
  add column if not exists owner_email text;

create index if not exists portal_sites_owner_email_idx on public.portal_sites(owner_email);

-- Backfill owner_email from the JSONB data column
update public.portal_sites
set owner_email = data->>'email'
where owner_email is null and data->>'email' is not null;

-- RLS: authenticated users can read their own sites
create policy "Authenticated users can read own sites" on public.portal_sites
  for select using (
    auth.uid() is not null and
    owner_email = (select email from public.accounts where id = auth.uid())
  );
