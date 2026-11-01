# Consolidated DailyClarity release

The October 31 visual update replaced reviewed application files with older versions. This integration preserves its amber/sage design, niche photography and inline pricing, while restoring the security patch, checkout recovery, contact exports, reviewed sample selection, optional early contact details, accessible Help, and the missing wellness, walkthrough and refund routes.

The Basic launch controls from PR 64 are included: explicit usage allowances without overage charges, customer-detail review before checkout, verified paid/trial entitlement, and bounded reconciliation. Homepage plan selections persist through the preview; selecting a plan does not start a payment automatically. Existing hosting-suspension controls remain an isolated rehearsal, not an activated customer suspension service.

Both additive database migrations were applied and independently verified on staging and production. Their exact hashes, provider history versions, permission checks and preservation evidence are recorded in [billing entitlements](billing-entitlements-and-hosting.md). Only the two scoped application migrations were applied; shared production migration history and unrelated applications were preserved.

Automatic production builds now stop before publishing over the certified catalogue. Deploy previews remain available. Existing protected CLI workflows require their generated deployment marker and bound workflow/site identity; GitHub environment approvals and the existing release gates remain authoritative. The new GET-only production probe establishes the actual current deployment and provider build settings without changing them. See [production build control](../PRODUCTION_BUILD_CONTROL.md).

The recovered original catalogue is available through import run `38780575189`, attempt 2. Use the exact current artifact identities in [the catalogue handoff](../FULL_CATALOGUE_HANDOFF.md), with `closure_version=2`, only after the final main commit passes push CI. The historical compiler/browser evidence remains historical; current customization and connected staging evidence are still required.

## Completion criteria

Require CI on the final merged commit, actual production observation, complete catalogue preparation/import, staged customer purchase and email/sign-in, owned editing and publication, same-order fulfillment recovery, refund plus subscription cancellation, rollback/reapply, and independent production verification. Local fixtures, successful source merges, database sentinels and deploy previews do not replace those connected results.

The earlier public drafts are incorporated in this consolidated release. PR 46's later duplicate JSX is repaired rather than retained; PRs 47–49 and Netlify PR 62 add no missing functionality beyond the restored integrated implementation. Close superseded PRs with a link to the final merge; retain their discussion history.
