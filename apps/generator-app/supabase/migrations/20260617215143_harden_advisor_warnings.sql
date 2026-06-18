-- Tighten Supabase security-advisor warnings.
-- Applied via MCP on 2026-06-17; mirrored here for version control.

-- Lock down orders: financial table, service-role only (Stripe webhook).
drop policy if exists "Allow order insert" on public.orders;
drop policy if exists "Allow anon select orders" on public.orders;
drop policy if exists "Allow order update" on public.orders;
revoke all on public.orders from anon, authenticated;

-- contact_messages: keep public INSERT (forms), remove read/discoverability.
drop policy if exists "Allow anon select contact" on public.contact_messages;
revoke select on public.contact_messages from anon, authenticated;

-- booking_inquiries: public forms may INSERT only; strip TRUNCATE/DELETE/UPDATE/SELECT.
drop policy if exists "Allow anon select booking" on public.booking_inquiries;
revoke all on public.booking_inquiries from anon, authenticated;
grant insert on public.booking_inquiries to anon, authenticated;

-- newsletter_subscribers: public forms may INSERT only; strip the rest.
drop policy if exists "Allow anon select newsletter" on public.newsletter_subscribers;
revoke all on public.newsletter_subscribers from anon, authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;

-- customer-images is a public bucket: drop broad listing policy; direct URL access still works.
drop policy if exists "customer_images_public_read" on storage.objects;
