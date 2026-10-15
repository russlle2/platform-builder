-- Harden the canonical Auth trigger without installing it on shared projects
-- that deliberately omit DailyClarity's project-wide account synchronization.
-- Existing ownership is immutable; do not infer past verification or reassign it.
do $migration$
begin
  if to_regprocedure('public.sync_auth_user_account()') is null then
    raise notice 'DailyClarity Auth synchronization is absent; leaving Auth triggers unchanged';
    return;
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'on_auth_user_account_sync'
      and tgfoid = 'public.sync_auth_user_account()'::regprocedure
      and not tgisinternal
  ) then
    raise exception 'portal_claim_preflight: canonical Auth trigger needs separate review';
  end if;

  execute $definition$
    create or replace function public.sync_auth_user_account()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    begin
      if new.email is not null then
        insert into public.accounts (id, email)
        values (new.id, lower(new.email))
        on conflict (id) do update set email = excluded.email;

        if new.email_confirmed_at is not null then
          update public.portal_sites
            set owner_id = new.id,
                owner_email = lower(new.email)
            where owner_id is null
              and lower(owner_email) = lower(new.email);
        end if;
      end if;
      return new;
    end;
    $body$;
  $definition$;

  -- CREATE OR REPLACE preserves the existing function ACL. Explicitly retain
  -- the browser restriction of the canonical migration as defense in depth.
  revoke all on function public.sync_auth_user_account() from public, anon, authenticated;
  drop trigger on_auth_user_account_sync on auth.users;
  create trigger on_auth_user_account_sync
    after insert or update of email, email_confirmed_at on auth.users
    for each row execute function public.sync_auth_user_account();
end;
$migration$;
