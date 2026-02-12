create table if not exists public.site_slugs (
  slug text primary key,
  status text default 'reserved',
  created_at timestamptz default now()
);

create unique index if not exists site_slugs_slug_key on public.site_slugs (slug);
