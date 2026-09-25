-- Tighten Supabase security-advisor warnings.
-- Applied via MCP on 2026-06-17; mirrored here for version control.

-- Some of these tables were introduced by a later drift-reconciliation
-- migration. Guard every relation so a fresh database can replay the history.
do $$
begin
  if to_regclass('public.orders') is not null then
    execute 'drop policy if exists "Allow order insert" on public.orders';
    execute 'drop policy if exists "Allow anon select orders" on public.orders';
    execute 'drop policy if exists "Allow order update" on public.orders';
    execute 'revoke all on public.orders from anon, authenticated';
  end if;

  if to_regclass('public.contact_messages') is not null then
    execute 'drop policy if exists "Allow anon select contact" on public.contact_messages';
    execute 'revoke select on public.contact_messages from anon, authenticated';
  end if;

  if to_regclass('public.booking_inquiries') is not null then
    execute 'drop policy if exists "Allow anon select booking" on public.booking_inquiries';
    execute 'revoke all on public.booking_inquiries from anon, authenticated';
    execute 'grant insert on public.booking_inquiries to anon, authenticated';
  end if;

  if to_regclass('public.newsletter_subscribers') is not null then
    execute 'drop policy if exists "Allow anon select newsletter" on public.newsletter_subscribers';
    execute 'revoke all on public.newsletter_subscribers from anon, authenticated';
    execute 'grant insert on public.newsletter_subscribers to anon, authenticated';
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "customer_images_public_read" on storage.objects';
  end if;
end;
$$;
