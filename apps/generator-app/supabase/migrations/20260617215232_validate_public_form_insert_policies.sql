-- Replace WITH CHECK (true) public-form INSERT policies with real validation
-- (email format + length bounds). Clears rls_policy_always_true advisor warnings
-- and blocks junk/spam inserts. Applied via MCP on 2026-06-17.

-- contact_messages
drop policy if exists "Allow public contact insert" on public.contact_messages;
create policy "Allow public contact insert" on public.contact_messages
  for insert to anon, authenticated
  with check (
    visitor_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(visitor_name) between 1 and 200
    and char_length(message) between 1 and 5000
  );

-- booking_inquiries
drop policy if exists "Allow public booking insert" on public.booking_inquiries;
create policy "Allow public booking insert" on public.booking_inquiries
  for insert to anon, authenticated
  with check (
    email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(name) between 1 and 200
    and char_length(message) between 1 and 5000
  );

-- newsletter_subscribers
drop policy if exists "Allow public newsletter insert" on public.newsletter_subscribers;
create policy "Allow public newsletter insert" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (
    email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );
