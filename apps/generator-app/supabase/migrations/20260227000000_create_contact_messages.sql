-- Contact messages from visitor form submissions on client sites
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  slug text,
  visitor_name text not null,
  visitor_email text not null,
  visitor_phone text,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Index for looking up messages by site
create index idx_contact_messages_slug on public.contact_messages (slug);

-- Add hosting columns to site_slugs for Netlify provisioning
alter table public.site_slugs
  add column if not exists netlify_site_id text,
  add column if not exists site_url text,
  add column if not exists custom_domain text;
