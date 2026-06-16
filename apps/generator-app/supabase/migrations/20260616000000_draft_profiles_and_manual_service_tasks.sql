-- Draft profiles for pre-purchase recovery (used by /api/profile/save-draft)
create table if not exists public.draft_profiles (
  email text primary key,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists draft_profiles_updated_at_idx on public.draft_profiles (updated_at desc);
alter table public.draft_profiles enable row level security;

-- Manual service work queue for the $80 Security + Ads tier
create table if not exists public.manual_service_tasks (
  id uuid primary key default gen_random_uuid(),
  slug text,
  plan text,
  email text,
  business_name text,
  task_type text not null default 'security_ads',
  status text not null default 'open',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists manual_service_tasks_status_idx on public.manual_service_tasks (status, created_at desc);
create index if not exists manual_service_tasks_slug_idx on public.manual_service_tasks (slug);
alter table public.manual_service_tasks enable row level security;

comment on table public.draft_profiles is 'Pre-purchase profile drafts keyed by email for recovery. Service-role access only.';
comment on table public.manual_service_tasks is 'Work queue for the manual Security + Ads premium tier. Service-role access only.';
