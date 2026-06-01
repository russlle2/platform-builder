-- Portal write access requires a valid access token (stored as HMAC-SHA256 hash).
-- Plaintext tokens are only sent to customers via email at checkout.

alter table public.portal_sites
  add column if not exists portal_token_hash text;

comment on column public.portal_sites.portal_token_hash is
  'HMAC-SHA256 hash of the customer portal access token (see PORTAL_TOKEN_SECRET).';
