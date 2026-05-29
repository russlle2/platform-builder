-- Public bucket for customer-uploaded images (logos, hero photos, etc.).
-- Files are stored under {owner_id}/filename.webp where owner_id is either
-- a draft UUID (pre-purchase) or the site slug (post-purchase).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-images',
  'customer-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read (public bucket URLs).
create policy "customer_images_public_read"
  on storage.objects for select
  using (bucket_id = 'customer-images');

-- Service role uploads via API (bypasses RLS with service key).
-- Authenticated owners could be added later; uploads go through our API.
