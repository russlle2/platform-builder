-- Replace WITH CHECK (true) public-form INSERT policies with real validation
-- (email format + length bounds). Clears rls_policy_always_true advisor warnings
-- and blocks junk/spam inserts. Applied via MCP on 2026-06-17.

-- Tables reconciled later in the history are guarded so a clean database can
-- replay migrations. The later create migration installs the skipped policies.
do $$
begin
  if to_regclass('public.contact_messages') is not null then
    execute 'drop policy if exists "Allow public contact insert" on public.contact_messages';
    execute $policy$
      create policy "Allow public contact insert" on public.contact_messages
        for insert to anon, authenticated
        with check (
          visitor_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
          and char_length(visitor_name) between 1 and 200
          and char_length(message) between 1 and 5000
        )
    $policy$;
  end if;

  if to_regclass('public.booking_inquiries') is not null then
    execute 'drop policy if exists "Allow public booking insert" on public.booking_inquiries';
    execute $policy$
      create policy "Allow public booking insert" on public.booking_inquiries
        for insert to anon, authenticated
        with check (
          visitor_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
          and char_length(visitor_name) between 1 and 200
          and char_length(message) between 1 and 5000
        )
    $policy$;
  end if;

  if to_regclass('public.newsletter_subscribers') is not null then
    execute 'drop policy if exists "Allow public newsletter insert" on public.newsletter_subscribers';
    execute $policy$
      create policy "Allow public newsletter insert" on public.newsletter_subscribers
        for insert to anon, authenticated
        with check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
    $policy$;
  end if;
end;
$$;
