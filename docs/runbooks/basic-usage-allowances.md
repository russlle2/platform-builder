# Included service allowances

The Basic price remains $20/month. These controls never create Stripe usage
charges or charge an overage. The same included service allowance applies to the
higher plan until a separate entitlement is explicitly implemented.

| Service | Paid site | Trial site | Reset |
| --- | --- | --- | --- |
| Customer publish attempts | 30 | 5 | First of each month, 00:00 UTC |
| Contact submissions | 200 | 20 | First of each month, 00:00 UTC |
| Stored customer images | 100 images and 100 MiB | 20 images and 20 MiB | Capacity; freed by explicit image deletion |

Each contact submission attempts at most one owner notification and one visitor
confirmation. Initial provisioning and operator fulfillment recovery do not use
customer publish allowance. Both the pricing features and authenticated portal
show the limits. Provider costs remain the platform operator's responsibility.

Guest preview uploads allow 20 images and 20 MiB per server-issued draft identity.
All outstanding draft objects and reservations share a 10 GiB capacity ceiling.
Completed purchases retain source draft images for recovery; those sources remain
included in that shared ceiling. No automatic source deletion is introduced.

The controls bound the listed operations and stored image volume. They do not
establish a fixed bill or cap CDN bandwidth, request processing, operator recovery
work, or other provider usage. The DailyClarity support contact form is separate
from customer site allowances.

## Deployment and verification

Apply both additive October 29 migrations in filename order. Verify
`billing_lifecycle_schema_readiness()` (billing migration) and
`site_usage_schema_readiness()` as `service_role`; both must report their expected
version and ready status before accepting customer writes. The quota migration's
readiness version is `20261029.1`. Existing catalogue readiness versions remain
unchanged.

Only `service_role` has access to the new tables/RPCs. RLS is enabled. New paid
writes require current server-verified entitlement. Unknown or expired proof
fails closed; historical account reads and billing management remain available.
The initial deployment inventory found no recorded customer portal sites, so no
customer quota counter backfill was needed. This does not establish whether the
separate Stripe account has historical charges.

## Uncertain publication outcomes

A publication is reserved before changing saved customization or contacting
Netlify. Only one unresolved publication may exist per site; this prevents an
older slow deployment from overwriting a newer publication. Different browser
operation IDs do not bypass this gate. The portal and visual editor retain their
operation ID after a lost response.

A proven failure before the provider call releases the unused reservation. A
successful provider-ready result stores a replayable receipt. A timeout, process
exit, or other uncertain provider result retains the reservation and blocks a new
publication. The customer sees an instruction to contact support; reloading or
changing the request ID cannot start a competing deployment.

To resolve an uncertain publication:

1. Read the pending `site_usage_operations` record for the exact site, metric,
   operation ID, and fingerprint. Inspect application logs and that site's
   Netlify deploy history for the matching attempt.
2. Establish the provider's final state. Do not assume a network error means the
   deploy failed. Wait for any in-progress deployment to terminate and verify the
   published site's content before permitting another publication.
3. If the desired version is confirmed live, call `finish_site_usage` with the
   exact recorded identity and a successful receipt. If a provider attempt is
   confirmed terminal but unsuccessful, settle a failure receipt while retaining
   its consumed allowance. A new explicit customer attempt then uses a new ID.
4. Call `release_site_usage` only when evidence establishes that no provider
   publication was attempted. It releases the original month's counter once;
   never edit counters or delete operation rows to clear a problem.

The code does not guess provider outcomes or automatically expire pending
publication reservations. Service-role operations require authorized operator
review, and their evidence should be retained with the support incident.

## Image and contact uncertainty

Image storage counts authoritative `storage.objects` sizes plus absent-object
reservations. A stored object and its reservation count once. Successful uploads
retire their reservation; an unknown upload outcome keeps it. Explicit owner
image deletion retires a reservation only after Storage confirms the path is
absent. Do not remove customer images merely to free quota.

Contact claims precede message persistence and email attempts. Completed receipts
prevent repeated sends for the same operation. Legacy generated forms without an
explicit request ID coalesce identical submissions within a five-minute window;
this is a bounded retry aid, not permanent deduplication of messages. The monthly
submission cap still applies across windows. Unknown persistence or email
outcomes retain their allowance and require review before any operator resend.
