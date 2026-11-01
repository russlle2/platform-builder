# Fixed production application reconciliation

The protected read-only observation run `41269570003`, attempt `1`, observed
`dailyclarity.org` serving deployment `6ae6a05eda554f3a43ad8f94`, commit
`c1ec11e1fe8607d5b7158043422afd63e287211b`, with automatic builds enabled and no
release marker. That revision reverted application and release safeguards. A
normal certified promotion must not silently adopt it as a healthy rollback
baseline.

This one-purpose workflow can restore only deployment
`6ad19c79b1a9ec56fe82b1ce`, application commit
`fafde2dcd12bd6a8a5481a27e6035a510904f75c`. Its original catalogue certification
is `c707c300a55db5b4eb416309649e2bc8b4a72918ff39c98e1c06dcd0d5455472`.
These identities came from the prior protected demo-maintenance record,
producer run `39530783832`, attempt `1`. Historical evidence only identifies the
candidate: the workflow must independently recheck its current authenticated
Netlify ownership, ready production context, unique deployment hostname, exact
marker, authenticated runtime readiness, and unchanged active catalogue hashes
before making any provider change.

## Running the control

Merge the reviewed controller and let the exact main push pass CI. Dispatch
`.github/workflows/production-baseline-reconcile.yml` on main with that exact
`expected_release_sha`. `operation: verify` is the read-only default. Restoration
requires `operation: restore` and `confirm: RESTORE CERTIFIED BASELINE`. Both
operations retain the existing GitHub production environment review and shared
production concurrency. The controller rechecks main and successful push CI
before every write. Environment variables are contextual guards; GitHub's
protected workflow supplies the actual authorization.

The only allowed provider changes are:

1. PATCH the fixed site's `build_settings.stop_builds` to `true` and verify that
   publication, lock state and unrelated settings did not change.
2. Lock the exact observed current deployment, checking that it is still current
   and initially unlocked before requesting the lock.
3. Restore the one owned, ready, freshly healthy certified deployment. Recheck
   its public release marker, authenticated runtime and unchanged catalogue
   while the transferred publication lock remains held.
4. Release only the lock on that successfully restored baseline and repeat the
   public health and catalogue readbacks.

The controller never updates environment variables, catalogue blobs/pointers,
DNS, billing, or application source. It does not perform purchases or claim new
Stripe/email end-to-end evidence. It restores an earlier certified application;
publishing the finished application still requires the existing staged release
and connected acceptance process.

## Failure and follow-up

Every mutation has a durable local intent before the request. The workflow
uploads its journal as `production-reconciliation-RUN_ID-RUN_ATTEMPT`, including
the prior and selected deployment IDs, exact application commits, observed
settings hash and last observed publication. Raw provider configuration,
environment values, tokens and response bodies are not retained.

Ambiguous writes are never automatically retried. A failure attempts an
authenticated readback and stops. If public health fails after restoration,
the baseline stays locked and automatic builds stay stopped. Inspect the
journal and actual provider state before any reviewed recovery. The current
foreign revision is retained as a provider deployment, but this control never
automatically restores an unverified application. It cannot adopt a preexisting
lock or treat another deployment as its own.

Automatic builds stay stopped after success, including automatic deploy
previews on this production site. Netlify's setting permits manual CLI/API
deployments; the existing protected release workflows remain the publication
path. Restoring automatic site builds, if later desired, requires a separate
reviewed decision after the production build guard and final release are
verified. No provider compare-and-swap operation exists for these deployment
endpoints; the shared workflow concurrency, fresh read-before-write checks,
temporary lock and strict readbacks detect observed interference and stop.

Relevant provider references: [stop builds](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/)
and the [Netlify API specification](https://github.com/netlify/open-api/blob/master/swagger.yml).
