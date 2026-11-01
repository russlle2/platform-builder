# Production build control and read-only observation

DailyClarity's Git-linked Netlify builds must not replace an application whose
catalogue, schema and connected purchase path were verified through the protected
release workflows. Deploy previews and branch previews remain available.

The root Netlify configuration stops hosted production builds with `build.ignore`.
Netlify documents that build hooks bypass that setting, so both the default and
production build commands also run a dependency-free build guard before installing
or building the app. The guard requires the expected manual GitHub main workflow,
unchanged tracked checkout, fixed production/staging target, and an untracked
generated deployment marker for that workflow and exact commit. It does not accept
an environment flag alone, a committed marker, or a marker for a different kind of
release. These checks prevent accidental hosted publication; they are not a
cryptographic attestation or a replacement for GitHub environment protection.

Supported CLI builds remain the certified production promoter, reviewed baseline
recovery, full-catalogue staging, and the existing isolated staging launch workflow.
The last workflow now emits an explicitly non-certifying `dailyclarity-staging-launch`
marker after its existing validation/schema gates. Rollback/reapply restore existing
deployments and do not build. Demo maintenance continues to build its immutable
historical source and configuration; this change does not broaden that source lane.

The guard changes no Netlify account setting. The existing release requirement that
Git auto-builds are stopped still applies and must be observed before publication.
Direct account changes or deployment of an older commit remain outside this guard.

## Read-only production observation

Dispatch `production-runtime-probe.yml` on main with `expected_release_sha` equal to
the actual merged main commit. The production environment's existing review applies.
The probe requires successful push CI and checks main before and after observation.
It uses only fixed GET requests to the known GitHub repository, production Netlify
site/account, its published deployment, and the public release marker. It does not
fetch environment variables or carry credentials to the public hostname.

The artifact `production-observation-RUN-ATTEMPT` records the deployment ID,
commit reference when valid, publication lock, stopped-builds setting, domain/account
binding, and marker availability. Unknown provider titles are withheld and hashed;
known release titles can be retained. The site/deployment snapshot must remain stable
through the readback. An absent or mismatched marker is reported as observed, not
relabelled as a verified release. Observation is not permission to publish and does
not establish payment, email, schema or customer-workflow success.

References: [Netlify ignore commands](https://docs.netlify.com/build/configure-builds/ignore-builds/)
and [Netlify build metadata](https://docs.netlify.com/build/configure-builds/environment-variables/).
