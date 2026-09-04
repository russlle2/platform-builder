# Portal security hardening

Customer portal access is **not** secured by site slug alone. A random slug must not expose editable business data or allow writes.

## Model

| Action | Requirement |
|--------|-------------|
| **GET** `/api/portal/customer?slug=` | Public summary only (status, live URL, niche/template labels). No `customerValues`, email, inline edits, or Netlify IDs. |
| **GET** with valid `token` query (or `x-portal-token` / `Authorization: Bearer`) | Full portal payload for that slug (Netlify IDs still stripped from JSON). |
| **POST** `/api/portal/customer` | Valid portal token required → **403** without it. |
| **GET/POST** `/api/sites/domain` | Internal admin **or** valid portal token for the slug. |

Tokens are 32-byte random values (base64url). Only **HMAC-SHA256** hashes are stored in Postgres:

- Column: `portal_sites.portal_token_hash`
- Secret: `PORTAL_TOKEN_SECRET` (server-only, required for minting and verification)

Migration: `apps/generator-app/supabase/migrations/20260531120000_portal_token_hash.sql`

## Issuing tokens

On **Stripe `checkout.session.completed`** and **`/api/test-purchase`** (when Supabase is configured):

1. `createPortalAccessCredentials()` generates `{ token, hash }`.
2. `portal_token_hash` is saved on `portal_sites` upsert.
3. Welcome email links to `/portal?slug=…&token=…` (token removed from the browser URL after `sessionStorage` save).

Test purchase JSON includes `portalAccessToken` and `portalUrl` for local QA.

## Client behavior

- `PortalClient` stores the token in `sessionStorage` per slug (`pb_portal_token:{slug}`).
- Forms and save/domain actions are disabled until `authenticated: true` from GET.
- **Non-production** shows a dev banner when a slug is loaded without a valid token.

## Environment

```bash
PORTAL_TOKEN_SECRET=<long-random-string>   # required for token issue/verify
```

Without `PORTAL_TOKEN_SECRET`, new hashes cannot be created and verification fails closed (writes denied).

## Legacy sites

Rows with `portal_token_hash = null` cannot be edited via the public customer API until a token is issued (re-checkout, test-purchase, or manual hash update using the same HMAC helper).

## Rate limiting

Existing IP rate limits on portal GET/POST remain unchanged.

## Future improvements

- Token rotation and revocation table
- Short-lived magic links with one-time exchange
- Supabase Auth mapping for customers who want email/password login
