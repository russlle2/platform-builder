#!/usr/bin/env node
// Deliberately no Stripe mutation, database write, DNS, SSL, deployment or delete API.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, lstat, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertDeployedRuntime } from './deployed-runtime-contract.mjs'
import { assertReleaseCi } from './verify-release-ci.mjs'
import { assertNetlifyTarget } from './netlify-target-contract.mjs'

export const TARGET = Object.freeze({ repository: 'russlle2/platform-builder', workflow: '.github/workflows/staging-recovery-proof.yml', siteId: 'e5f283c4-d2f2-4fc9-965d-f67f9875c074', accountId: '6974219b1ab3798c7aed8c8a', accountSlug: 'christopherlake96', hostname: 'dailyclarity-staging.netlify.app', projectRef: 'yuviqftugmasjypkhrpo' })
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/, UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/, ID = /^[1-9][0-9]{0,15}$/
const EVENT = /^evt_[A-Za-z0-9_]{6,255}$/, SESSION = /^cs_test_[A-Za-z0-9_]{6,255}$/, SUB = /^sub_[A-Za-z0-9_]{6,255}$/
const FAULT = 'The deterministic Netlify site name is already bound to another domain.'
class RecoveryControlError extends Error {
  constructor(code) { super(`Recovery control rejected: ${code}.`); this.code = code }
}
const requireThat = (condition, code) => { if (!condition) throw new RecoveryControlError(code) }
const SAFE_FAILURE_CODES = new Set(['creation_identity', 'fixture_identity', 'fixture_domains', 'fixture_url', 'fixture_created_at', 'fixture_must_be_empty', 'deterministic_site_already_exists', 'fresh_pending_checkout', 'reservation_expiry', 'checkout_already_processed', 'pending_session_changed', 'current_main_changed', 'staging_account_changed', 'runtime_not_ready', 'runtime_requirements', 'exact_staged_candidate', 'provider_http', 'provider_response_size', 'checkpoint_identity', 'checkpoint_shape', 'journal_bundle'])
export const safeFailureCode = error => error instanceof RecoveryControlError && SAFE_FAILURE_CODES.has(error.code) ? error.code : 'unclassified'
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',')
const canonical = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(canonical) : Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(canonical(value))).digest('hex')
const same = (a, b) => digest(a) === digest(b)
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const sourceFor = env => ({ runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, releaseSha: env.GITHUB_SHA })
const BINDING_KEYS = ['releaseSha', 'certificationHash', 'stagingJournalHash', 'catalogHash', 'manifestHash', 'nonce', 'intentId', 'sessionHash']
export function validateBinding(binding, sha) {
  requireThat(exact(binding, BINDING_KEYS) && binding.releaseSha === sha && SHA.test(sha), 'binding_fields')
  for (const key of ['certificationHash', 'stagingJournalHash', 'catalogHash', 'manifestHash', 'sessionHash']) requireThat(HASH.test(binding[key] ?? ''), 'binding_hash')
  requireThat(/^[a-f0-9]{24}$/.test(binding.nonce ?? '') && UUID.test(binding.intentId ?? ''), 'task_identity')
  return binding
}
export const taskSlug = binding => `dc-r-${binding.nonce}`
export const faultAlias = binding => `recovery-fault-${binding.nonce}.dailyclarity.org`
export function configuration(env) {
  requireThat(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === TARGET.repository && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_SHA === env.GITHUB_SHA && env.GITHUB_WORKFLOW_REF === `${TARGET.repository}/${TARGET.workflow}@refs/heads/main`, 'protected_workflow')
  requireThat(ID.test(env.GITHUB_RUN_ID ?? '') && ID.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'run_identity')
  requireThat(env.DEPLOY_ENVIRONMENT === 'staging' && env.NETLIFY_SITE_ID === TARGET.siteId && env.NETLIFY_EXPECTED_SITE_ID === TARGET.siteId && env.NETLIFY_EXPECTED_SITE_HOSTNAME === TARGET.hostname && env.NETLIFY_EXPECTED_ACCOUNT_SLUG === TARGET.accountSlug && env.STAGING_SUPABASE_PROJECT_REF === TARGET.projectRef && env.STAGING_SUPABASE_URL === `https://${TARGET.projectRef}.supabase.co`, 'fixed_staging_target')
  requireThat(['prepare', 'inspect', 'clear', 'retry'].includes(env.OPERATION), 'operation')
  requireThat(env.OPERATION === 'inspect' || env.CONFIRMATION === (env.OPERATION === 'prepare' ? 'PREPARE OWNED RECOVERY FAULT' : env.OPERATION === 'clear' ? 'CLEAR OWNED RECOVERY FAULT' : 'RETRY OWNED RECOVERY EVENT'), 'confirmation')
  requireThat(typeof env.BINDING_JSON === 'string' && env.BINDING_JSON.length <= 2048, 'binding_size')
  const binding = validateBinding(JSON.parse(env.BINDING_JSON), env.GITHUB_SHA)
  requireThat(path.isAbsolute(env.RUNNER_TEMP || ''), 'runner_temporary_directory')
  if (env.OPERATION !== 'prepare') {
    requireThat(ID.test(env.SOURCE_RUN_ID ?? '') && ID.test(env.SOURCE_ARTIFACT_ID ?? '') && HASH.test(env.SOURCE_JOURNAL_HASH ?? '') && EVENT.test(env.EVENT_ID ?? ''), 'exact_source_and_event')
  } else requireThat(!env.SOURCE_RUN_ID && !env.SOURCE_ARTIFACT_ID && !env.SOURCE_JOURNAL_HASH && !env.EVENT_ID, 'prepare_has_no_prior_source')
  return { operation: env.OPERATION, binding, source: sourceFor(env), eventId: env.EVENT_ID, journalHash: env.SOURCE_JOURNAL_HASH, output: path.join(env.RUNNER_TEMP, 'staging-recovery-output'), input: path.join(env.RUNNER_TEMP, 'staging-recovery-input') }
}
export function assertRuntime(readiness, proof, publicConfig, binding) {
  assertDeployedRuntime(readiness, { siteId: TARGET.siteId, projectRef: TARGET.projectRef, releaseSha: binding.releaseSha, catalogProfile: 'rehab-staging', catalogHash: binding.catalogHash, manifestHash: binding.manifestHash })
  for (const key of ['templateCheckoutReady', 'fulfillmentReady', 'emailReady']) requireThat(readiness[key] === true, 'runtime_not_ready')
  requireThat(readiness.salesPaused === false && readiness.bookingKitSalesEnabled === false && Array.isArray(readiness.missingRequirements) && readiness.missingRequirements.length === 0, 'runtime_requirements')
  requireThat(exact(proof, ['version', 'profile', 'releaseSha', 'certificationHash', 'journalHash']) && proof.version === 1 && proof.profile === 'rehab-staging-candidate' && proof.releaseSha === binding.releaseSha && proof.certificationHash === binding.certificationHash && proof.journalHash === binding.stagingJournalHash, 'exact_staged_candidate')
  requireThat(publicConfig?.trialDays === 0, 'nonzero_payment_required')
  // The exact staging release's readiness includes STRIPE_ENVIRONMENT_MODE_MISMATCH.
  // Actual test mode is additionally proved by the stored cs_test_ session and signed event.
}
export function assertFixtureSite(site, binding, { siteId, aliases, createdAfter, empty = false }) {
  const name = `platform-${taskSlug(binding)}`, host = `${name}.netlify.app`
  requireThat(UUID.test(site?.id ?? '') && (!siteId || site.id === siteId) && site.id !== TARGET.siteId && site.account_id === TARGET.accountId && site.account_slug === TARGET.accountSlug && site.name === name, 'fixture_identity')
  requireThat((site.default_domain == null || site.default_domain === host) && site.custom_domain == null && Array.isArray(site.domain_aliases) && same(site.domain_aliases, aliases), 'fixture_domains')
  for (const key of ['url', 'ssl_url']) {
    let url; try { url = new URL(site[key]) } catch { throw new RecoveryControlError('fixture_url') }
    requireThat(['http:', 'https:'].includes(url.protocol) && url.hostname === host && !url.username && !url.password && !url.port && !url.search && !url.hash, 'fixture_url')
  }
  requireThat(iso(site.created_at) && (!createdAfter || Date.parse(site.created_at) >= Date.parse(createdAfter) - 30_000), 'fixture_created_at')
  if (empty) requireThat(site.published_deploy == null && site.build_settings?.repo_url == null && site.build_settings?.repo_path == null, 'fixture_must_be_empty')
  return site
}
export function assertIntent(snapshot, binding, sessionHash) {
  requireThat(snapshot.intents.length === 1 && snapshot.reservations.length === 1, 'intent_reservation_cardinality')
  const intent = snapshot.intents[0], reservation = snapshot.reservations[0]
  requireThat(intent.id === binding.intentId && intent.slug === taskSlug(binding) && intent.plan === 'basic' && SESSION.test(intent.stripe_session_id ?? '') && digest(intent.stripe_session_id) === binding.sessionHash && (!sessionHash || digest(intent.stripe_session_id) === sessionHash), 'owned_test_intent')
  requireThat(intent.catalog_revision?.contractVersion === 3 && intent.catalog_revision.catalogHash === binding.catalogHash && intent.catalog_revision.manifestHash === binding.manifestHash, 'intent_catalogue')
  requireThat(reservation.slug === intent.slug && reservation.reserved_for === intent.id && reservation.custom_domain == null, 'reservation_ownership')
  return intent
}
export function assertPending(snapshot, binding, now) {
  const intent = assertIntent(snapshot, binding), reservation = snapshot.reservations[0]
  const age = now - Date.parse(intent.created_at)
  requireThat(intent.status === 'session_created' && age >= -30_000 && age <= 30 * 60_000 && reservation.status === 'checkout_pending' && reservation.netlify_site_id == null && reservation.site_url == null, 'fresh_pending_checkout')
  requireThat(iso(reservation.reservation_expires_at) && Date.parse(reservation.reservation_expires_at) > now + 10 * 60_000, 'reservation_expiry')
  requireThat(snapshot.orders.length === 0 && snapshot.portals.length === 0 && snapshot.events.length === 0, 'checkout_already_processed')
  return intent
}
const FAILURE_KEYS = ['observedAt', 'eventIdHash', 'eventType', 'businessKeyHash', 'eventCreatedAt', 'orderIdHash', 'amountCents', 'currency']
export function assertFailed(snapshot, binding, journal, eventId, now) {
  const intent = assertIntent(snapshot, binding, journal.sessionHash)
  requireThat(snapshot.orders.length === 1 && snapshot.portals.length === 1 && snapshot.events.length === 1, 'failure_cardinality')
  const order = snapshot.orders[0], portal = snapshot.portals[0], event = snapshot.events[0]
  requireThat(EVENT.test(eventId) && event.event_id === eventId && event.payload_event_id === eventId && event.payload_event_type === event.event_type && event.payload_livemode === false && event.event_type === 'checkout.session.completed' && event.livemode === false && ['failed', 'dead_letter'].includes(event.status) && event.last_error === FAULT && Number.isSafeInteger(event.attempts) && event.attempts >= 1, 'actual_alias_failure')
  requireThat(event.session_id === intent.stripe_session_id && event.checkout_intent_id === intent.id && event.slug === intent.slug && event.checkout_type === 'template_subscription' && event.payment_status === 'paid' && Number.isSafeInteger(event.amount_total) && event.amount_total > 0 && SUB.test(event.subscription_id ?? '') && event.business_key === `subscription:${event.subscription_id}`, 'signed_test_checkout_binding')
  requireThat(iso(event.created_at) && Date.parse(event.created_at) >= Date.parse(journal.preparedAt) && Date.parse(event.created_at) <= now && Number.isSafeInteger(event.payload_created) && event.payload_created >= Math.ceil(Date.parse(journal.preparedAt) / 1000) && event.payload_created <= Math.floor(now / 1000), 'failure_after_fixture')
  requireThat(intent.status === 'fulfillment_failed' && order.slug === intent.slug && order.stripe_session_id === intent.stripe_session_id && order.stripe_subscription_id === event.subscription_id && order.first_payment_amount_cents === event.amount_total && iso(order.first_payment_received_at) && order.amount_cents === event.amount_total && UUID.test(order.id ?? ''), 'failed_order_binding')
  requireThat(portal.slug === intent.slug && portal.status === 'provisioning_failed' && portal.checkout_intent_id === intent.id && portal.stripe_session_id === intent.stripe_session_id && portal.provisioning_error === FAULT && portal.provisioning_succeeded === false && portal.netlify_site_id == null && snapshot.reservations[0].netlify_site_id == null, 'failed_portal_binding')
  requireThat(typeof order.currency === 'string' && /^[a-z]{3}$/.test(order.currency), 'order_currency')
  return { observedAt: new Date(now).toISOString(), eventIdHash: digest(eventId), eventType: event.event_type, businessKeyHash: digest(event.business_key), eventCreatedAt: event.created_at, orderIdHash: digest(order.id), amountCents: order.amount_cents, currency: order.currency }
}
export function validateJournal(journal, config, source) {
  requireThat(exact(journal, ['version', 'kind', 'binding', 'source', 'createdAt', 'preparedAt', 'siteId', 'sessionHash', 'phase', 'failure', 'clearedAt']) && journal.version === 1 && journal.kind === 'staging-owned-alias-recovery' && same(journal.binding, config.binding) && digest(journal) === config.journalHash, 'journal_shape_or_hash')
  requireThat(exact(journal.source, ['runId', 'runAttempt', 'releaseSha']) && same(journal.source, source) && iso(journal.createdAt) && iso(journal.preparedAt) && Date.parse(journal.preparedAt) >= Date.parse(journal.createdAt) && UUID.test(journal.siteId ?? '') && journal.siteId !== TARGET.siteId && journal.sessionHash === config.binding.sessionHash, 'journal_identity')
  requireThat(['prepared', 'clear_requested', 'cleared'].includes(journal.phase), 'journal_phase')
  if (journal.phase === 'prepared') requireThat(journal.failure === null && journal.clearedAt === null, 'prepared_journal')
  else requireThat(exact(journal.failure, FAILURE_KEYS) && ['eventIdHash', 'businessKeyHash', 'orderIdHash'].every(k => HASH.test(journal.failure[k] ?? '')) && journal.failure.eventType === 'checkout.session.completed' && iso(journal.failure.observedAt) && iso(journal.failure.eventCreatedAt) && Number.isSafeInteger(journal.failure.amountCents) && journal.failure.amountCents > 0 && /^[a-z]{3}$/.test(journal.failure.currency) && (journal.phase === 'clear_requested' ? journal.clearedAt === null : iso(journal.clearedAt)), 'cleared_journal')
  return journal
}
export function validateControlBundle(files, config, source) {
  const allowed = ['creation-requested.json', 'fixture-created.json', 'alias-requested.json', 'recovery-journal.json', 'cleared-journal.json']
  requireThat(files instanceof Map && files.size > 0 && files.size <= allowed.length && [...files.keys()].every(name => allowed.includes(name)), 'journal_bundle')
  const journals = [...files].filter(([name, value]) => ['recovery-journal.json', 'cleared-journal.json'].includes(name) && digest(value) === config.journalHash).map(([, value]) => value)
  requireThat(journals.length === 1, 'exact_journal_hash')
  const journal = validateJournal(journals[0], config, source)
  for (const name of ['creation-requested.json', 'fixture-created.json', 'alias-requested.json']) {
    if (!files.has(name)) continue
    const value = files.get(name)
    const extra = name === 'creation-requested.json' ? ['creationOutcome'] : name === 'fixture-created.json' ? ['siteId'] : ['siteId', 'aliasRequestedAt', 'aliases', 'aliasOutcome']
    requireThat(exact(value, ['version', 'binding', 'source', 'createdAt', 'prepared', ...extra]) && value.version === 1 && value.prepared === false, 'checkpoint_shape')
    requireThat(same(value.binding, journal.binding) && same(value.source, journal.source) && value.createdAt === journal.createdAt, 'checkpoint_identity')
    if (name === 'creation-requested.json') requireThat(value.creationOutcome === 'unconfirmed', 'checkpoint_shape')
    else requireThat(value.siteId === journal.siteId, 'checkpoint_identity')
    if (name === 'alias-requested.json') requireThat(value.aliasOutcome === 'unconfirmed' && same(value.aliases, [faultAlias(config.binding)]) && iso(value.aliasRequestedAt) && Date.parse(value.aliasRequestedAt) >= Date.parse(journal.createdAt) && Date.parse(value.aliasRequestedAt) <= Date.parse(journal.preparedAt), 'checkpoint_identity')
  }
  return journal
}
export function assertArtifactSource(run, artifact, config, env) {
  requireThat(String(run?.id) === env.SOURCE_RUN_ID && run.repository?.full_name === TARGET.repository && run.path === TARGET.workflow && run.head_branch === 'main' && run.head_sha === config.binding.releaseSha && run.event === 'workflow_dispatch' && run.status === 'completed' && ['success', 'failure', 'cancelled'].includes(run.conclusion), 'journal_producer')
  requireThat(String(artifact?.id) === env.SOURCE_ARTIFACT_ID && artifact.expired === false && artifact.name === `staging-recovery-journal-${run.id}-${run.run_attempt}` && artifact.workflow_run?.id === Number(env.SOURCE_RUN_ID) && artifact.workflow_run?.head_sha === run.head_sha && Number.isSafeInteger(artifact.size_in_bytes) && artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 64 * 1024, 'journal_artifact')
  return { runId: String(run.id), runAttempt: String(run.run_attempt), releaseSha: run.head_sha }
}
export function observation(snapshot, binding, journal, eventId, now) {
  const intent = assertIntent(snapshot, binding, journal.sessionHash)
  const event = snapshot.events.length === 1 ? snapshot.events[0] : null
  const order = snapshot.orders.length === 1 ? snapshot.orders[0] : null
  const portal = snapshot.portals.length === 1 ? snapshot.portals[0] : null
  const reservation = snapshot.reservations[0]
  const captured = journal.failure
  const eventMatches = Boolean(captured && event?.event_id === eventId && digest(eventId) === captured.eventIdHash && event.event_type === captured.eventType && event.livemode === false && digest(event.business_key) === captured.businessKeyHash && event.created_at === captured.eventCreatedAt)
  const orderMatches = Boolean(captured && order && digest(order.id) === captured.orderIdHash && order.slug === intent.slug && order.stripe_session_id === intent.stripe_session_id && digest(`subscription:${order.stripe_subscription_id}`) === captured.businessKeyHash)
  return {
    version: 1, kind: 'staging-recovery-observation', observedAt: new Date(now).toISOString(), releaseSha: binding.releaseSha, journalHash: digest(journal),
    eventRows: snapshot.events.length, orderRows: snapshot.orders.length, portalRows: snapshot.portals.length,
    eventStatus: ['queued', 'processing', 'failed', 'dead_letter', 'succeeded'].includes(event?.status) ? event.status : null,
    intentStatus: ['pending', 'session_created', 'completed', 'checkout_failed', 'fulfillment_failed'].includes(intent.status) ? intent.status : null,
    orderStatus: ['paid', 'trialing', 'fulfillment_failed', 'cancelled', 'canceled', 'past_due', 'active'].includes(order?.status) ? order.status : null,
    sameCapturedEvent: eventMatches, sameCapturedOrder: orderMatches,
    sameFixtureSite: Boolean(portal?.netlify_site_id === journal.siteId && reservation.netlify_site_id === journal.siteId),
    recoveryObserved: Boolean(['clear_requested', 'cleared'].includes(journal.phase) && eventMatches && orderMatches && event.status === 'succeeded' && intent.status === 'completed' && order.first_payment_amount_cents === captured.amountCents && iso(order.first_payment_received_at) && portal?.status === 'active' && portal.checkout_intent_id === intent.id && portal.stripe_session_id === intent.stripe_session_id && portal.provisioning_succeeded === true && portal.provisioning_error == null && portal.netlify_site_id === journal.siteId && reservation.netlify_site_id === journal.siteId && reservation.status === 'provisioned'),
    // This is deliberately not a receipt, refund, email or full gate attestation.
    financialRefundVerified: false, inboxDeliveryVerified: false, fullConnectedGateAttestation: false,
  }
}

export async function orchestrate(config, deps) {
  const { binding } = config
  await deps.guard()
  if (config.operation === 'prepare') {
    const intent = assertPending(await deps.snapshot(null), binding, deps.now())
    requireThat(await deps.lookup() === null, 'deterministic_site_already_exists')
    // Re-read the DB and runtime immediately before the only creation request.
    const rechecked = assertPending(await deps.snapshot(null), binding, deps.now())
    requireThat(rechecked.stripe_session_id === intent.stripe_session_id, 'pending_session_changed')
    await deps.guard()
    const createdAt = new Date(deps.now()).toISOString()
    await deps.save('creation-requested.json', { version: 1, binding, source: config.source, createdAt, prepared: false, creationOutcome: 'unconfirmed' })
    const site = await deps.create({ name: `platform-${taskSlug(binding)}` })
    requireThat(UUID.test(site?.id ?? '') && site.id !== TARGET.siteId, 'creation_identity')
    // Establish new empty-site ownership before a separate alias-only update.
    await deps.save('fixture-created.json', { version: 1, binding, source: config.source, createdAt, siteId: site.id, prepared: false })
    assertFixtureSite(site, binding, { aliases: [], createdAfter: createdAt, empty: true })
    assertFixtureSite(await deps.site(site.id), binding, { siteId: site.id, aliases: [], createdAfter: createdAt, empty: true })
    await deps.guard()
    assertPending(await deps.snapshot(null), binding, deps.now())
    assertFixtureSite(await deps.site(site.id), binding, { siteId: site.id, aliases: [], createdAfter: createdAt, empty: true })
    // A timeout is uncertain. This checkpoint never authorizes payment or resume.
    await deps.save('alias-requested.json', { version: 1, binding, source: config.source, createdAt, siteId: site.id, prepared: false, aliasRequestedAt: new Date(deps.now()).toISOString(), aliases: [faultAlias(binding)], aliasOutcome: 'unconfirmed' })
    const aliased = await deps.setAlias(site.id)
    assertFixtureSite(aliased, binding, { siteId: site.id, aliases: [faultAlias(binding)], createdAfter: createdAt, empty: true })
    assertFixtureSite(await deps.site(site.id), binding, { siteId: site.id, aliases: [faultAlias(binding)], createdAfter: createdAt, empty: true })
    await deps.guard()
    assertPending(await deps.snapshot(null), binding, deps.now())
    const journal = { version: 1, kind: 'staging-owned-alias-recovery', binding, source: config.source, createdAt, preparedAt: new Date(deps.now()).toISOString(), siteId: site.id, sessionHash: digest(intent.stripe_session_id), phase: 'prepared', failure: null, clearedAt: null }
    await deps.save('recovery-journal.json', journal)
    return { prepared: true, journalHash: digest(journal), paymentAttempted: false, providerAliasAcceptanceObserved: true }
  }
  const journal = await deps.loadJournal()
  const snapshot = await deps.snapshot(config.eventId)
  const site = await deps.site(journal.siteId)
  const alreadyClear = Array.isArray(site.domain_aliases) && site.domain_aliases.length === 0
  const providerDeploymentReady = site.published_deploy?.state === 'ready' && /^[a-f0-9]{24}$/.test(site.published_deploy?.id ?? '')
  assertFixtureSite(site, binding, { siteId: journal.siteId, aliases: journal.phase === 'prepared' ? [faultAlias(binding)] : alreadyClear ? [] : [faultAlias(binding)], createdAfter: journal.createdAt })
  if (config.operation === 'inspect') {
    const observed = observation(snapshot, binding, journal, config.eventId, deps.now())
    const report = { ...observed, recoveryObserved: observed.recoveryObserved && alreadyClear && providerDeploymentReady, fixtureAliasCleared: alreadyClear, providerDeploymentReady }
    await deps.save('recovery-observation.json', report)
    return report
  }
  if (config.operation === 'retry') {
    requireThat(journal.phase !== 'prepared' && alreadyClear, 'retry_requires_recorded_clear')
    const report = observation(snapshot, binding, journal, config.eventId, deps.now())
    requireThat(report.sameCapturedEvent && report.sameCapturedOrder && ['failed', 'dead_letter'].includes(report.eventStatus), 'exact_retryable_event')
    await deps.save('recovery-observation.json', { ...report, retryRequested: true })
    await deps.guard()
    assertFixtureSite(await deps.site(journal.siteId), binding, { siteId: journal.siteId, aliases: [], createdAfter: journal.createdAt })
    const rechecked = observation(await deps.snapshot(config.eventId), binding, journal, config.eventId, deps.now())
    requireThat(rechecked.sameCapturedEvent && rechecked.sameCapturedOrder && ['failed', 'dead_letter'].includes(rechecked.eventStatus), 'retry_state_changed')
    await deps.retry(config.eventId)
    return { retryDispatched: true, recoveryObserved: false, fullConnectedGateAttestation: false }
  }
  requireThat(journal.phase !== 'cleared', 'already_cleared')
  if (journal.phase === 'clear_requested' && alreadyClear) {
    const report = observation(snapshot, binding, journal, config.eventId, deps.now())
    requireThat(report.sameCapturedEvent && report.sameCapturedOrder, 'uncertain_clear_identity')
    const cleared = { ...journal, source: config.source, phase: 'cleared', clearedAt: new Date(deps.now()).toISOString() }
    await deps.save('cleared-journal.json', cleared)
    return { cleared: true, journalHash: digest(cleared), recoveryObserved: report.recoveryObserved && providerDeploymentReady, resumedWithoutProviderWrite: true }
  }
  const failure = assertFailed(snapshot, binding, journal, config.eventId, deps.now())
  if (journal.failure) requireThat(failure.eventIdHash === journal.failure.eventIdHash && failure.orderIdHash === journal.failure.orderIdHash && failure.businessKeyHash === journal.failure.businessKeyHash, 'captured_failure_changed')
  const recordedFailure = journal.failure || failure
  assertFixtureSite(site, binding, { siteId: journal.siteId, aliases: [faultAlias(binding)], createdAfter: journal.createdAt, empty: true })
  await deps.guard()
  const currentFailure = assertFailed(await deps.snapshot(config.eventId), binding, journal, config.eventId, deps.now())
  requireThat(currentFailure.eventIdHash === failure.eventIdHash && currentFailure.orderIdHash === failure.orderIdHash, 'failure_binding_changed')
  assertFixtureSite(await deps.site(journal.siteId), binding, { siteId: journal.siteId, aliases: [faultAlias(binding)], createdAfter: journal.createdAt, empty: true })
  // Persist exact failure and ownership BEFORE PATCH. A timeout is uncertain;
  // the next run must inspect this immutable artifact, never blindly retry.
  const requested = { ...journal, source: config.source, phase: 'clear_requested', failure: recordedFailure, clearedAt: null }
  await deps.save('recovery-journal.json', requested)
  await deps.clear(journal.siteId)
  assertFixtureSite(await deps.site(journal.siteId), binding, { siteId: journal.siteId, aliases: [], createdAfter: journal.createdAt })
  const cleared = { ...requested, phase: 'cleared', clearedAt: new Date(deps.now()).toISOString() }
  await deps.save('cleared-journal.json', cleared)
  return { cleared: true, journalHash: digest(cleared), recoveryObserved: false, automaticSweeperEligible: snapshot.events[0].status !== 'dead_letter', exactRetryAvailable: true }

}

export function createProviderAccess(env, config, fetcher = fetch) {
  const jsonRequest = async (url, init = {}, optional404 = false) => {
    const response = await fetcher(url, { ...init, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25_000) })
    if (optional404 && response.status === 404) return null
    requireThat(response.ok, 'provider_http')
    const raw = await response.text(); requireThat(Buffer.byteLength(raw) <= 256 * 1024, 'provider_response_size')
    return JSON.parse(raw)
  }
  const netlify = (resource, method = 'GET', body, optional404 = false) => jsonRequest(`https://api.netlify.com/api/v1/${resource}`, { method, headers: { authorization: `Bearer ${env.NETLIFY_AUTH_TOKEN}`, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }, optional404)
  const rows = async (table, select, filters) => {
    const params = new URLSearchParams({ select, ...filters, limit: '2' })
    const result = await jsonRequest(`https://${TARGET.projectRef}.supabase.co/rest/v1/${table}?${params}`, { method: 'GET', headers: { authorization: `Bearer ${env.STAGING_SUPABASE_SERVICE_ROLE_KEY}`, apikey: env.STAGING_SUPABASE_SERVICE_ROLE_KEY, accept: 'application/json' } })
    requireThat(Array.isArray(result) && result.length <= 2, 'database_response')
    return result
  }
  const snapshot = async eventId => {
    const slug = taskSlug(config.binding)
    const intents = await rows('checkout_intents', 'id,slug,plan,status,stripe_session_id,created_at,catalog_revision:payload->catalogRevision', { slug: `eq.${slug}` })
    requireThat(intents.length === 1 && intents[0].id === config.binding.intentId && SESSION.test(intents[0].stripe_session_id ?? ''), 'intent_lookup')
    const session = intents[0].stripe_session_id
    const [reservations, orders, portals, events] = await Promise.all([
      rows('site_slugs', 'slug,status,reserved_for,reservation_expires_at,netlify_site_id,site_url,custom_domain', { slug: `eq.${slug}` }),
      rows('orders', 'id,slug,stripe_session_id,stripe_subscription_id,status,amount_cents,currency,first_payment_amount_cents,first_payment_received_at', { or: `(slug.eq.${slug},stripe_session_id.eq.${session})` }),
      rows('portal_sites', 'slug,status,checkout_intent_id:data->>checkout_intent_id,stripe_session_id:data->>stripe_session_id,netlify_site_id:data->>netlify_site_id,provisioning_succeeded:data->provisioning_succeeded,provisioning_error:data->>provisioning_error', { slug: `eq.${slug}` }),
      rows('stripe_webhook_events', 'event_id,event_type,livemode,business_key,status,attempts,created_at,last_error,payload_event_id:payload->>id,payload_event_type:payload->>type,payload_livemode:payload->livemode,payload_created:payload->created,session_id:payload->data->object->>id,checkout_intent_id:payload->data->object->metadata->>checkoutIntentId,slug:payload->data->object->metadata->>slug,checkout_type:payload->data->object->metadata->>checkoutType,payment_status:payload->data->object->>payment_status,amount_total:payload->data->object->amount_total,subscription_id:payload->data->object->>subscription', eventId ? { event_id: `eq.${eventId}` } : { 'payload->data->object->>id': `eq.${session}` }),
    ])
    return { intents, reservations, orders, portals, events }
  }
  return {
    now: () => Date.now(), snapshot,
    guard: async () => {
      const [runtime, proof, publicConfig, mainBranch, stagingSite] = await Promise.all([
        jsonRequest(`https://${TARGET.hostname}/api/integrations/status`, { headers: { authorization: `Bearer ${env.INTERNAL_ADMIN_TOKEN}` } }),
        jsonRequest(`https://${TARGET.hostname}/__dailyclarity_release.json`),
        jsonRequest(`https://${TARGET.hostname}/api/platform/config`),
        jsonRequest(`https://api.github.com/repos/${TARGET.repository}/branches/main`, { headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' } }),
        netlify(`sites/${TARGET.siteId}`),
      ])
      requireThat(mainBranch?.commit?.sha === config.binding.releaseSha, 'current_main_changed')
      assertNetlifyTarget(stagingSite, { environment: 'staging', configuredSiteId: TARGET.siteId, expectedSiteId: TARGET.siteId, expectedHostname: TARGET.hostname, expectedAccountSlug: TARGET.accountSlug })
      requireThat(stagingSite.account_id === TARGET.accountId, 'staging_account_changed')
      assertRuntime(runtime, proof, publicConfig, config.binding)
    },
    retry: async eventId => {
      requireThat(EVENT.test(eventId), 'retry_event')
      const response = await fetcher(`https://${TARGET.hostname}/api/admin/stripe/fulfillment/retry`, { method: 'POST', headers: { authorization: `Bearer ${env.INTERNAL_ADMIN_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ eventId }), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25_000) })
      requireThat(response.status === 202, 'retry_dispatch_unconfirmed')
    },
    lookup: () => netlify(`sites/${encodeURIComponent(`platform-${taskSlug(config.binding)}.netlify.app`)}`, 'GET', undefined, true),
    site: id => { requireThat(UUID.test(id), 'site_id'); return netlify(`sites/${id}`) },
    create: body => netlify(`${TARGET.accountSlug}/sites`, 'POST', body),
    setAlias: id => { requireThat(UUID.test(id) && id !== TARGET.siteId, 'alias_id'); return netlify(`sites/${id}`, 'PATCH', { domain_aliases: [faultAlias(config.binding)] }) },
    clear: id => { requireThat(UUID.test(id) && id !== TARGET.siteId, 'clear_id'); return netlify(`sites/${id}`, 'PATCH', { domain_aliases: [] }) },
  }
}
async function githubJson(env, resource) {
  const response = await fetch(`https://api.github.com/repos/${TARGET.repository}/${resource}`, { headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' }, redirect: 'error', signal: AbortSignal.timeout(25_000) })
  requireThat(response.ok, 'github_read')
  return response.json()
}
async function sourceIdentity(env, config) {
  const artifact = await githubJson(env, `actions/artifacts/${env.SOURCE_ARTIFACT_ID}`)
  const attempt = artifact?.name?.match(new RegExp(`^staging-recovery-journal-${env.SOURCE_RUN_ID}-([1-9][0-9]*)$`))?.[1]
  requireThat(attempt, 'artifact_attempt')
  const run = await githubJson(env, `actions/runs/${env.SOURCE_RUN_ID}/attempts/${attempt}`)
  return assertArtifactSource(run, artifact, config, env)
}
export async function run(env = process.env) {
  const config = configuration(env)
  requireThat(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() === config.binding.releaseSha, 'checkout_head')
  requireThat(env.GITHUB_TOKEN, 'github_read_credential')
  const ci = await githubJson(env, `actions/workflows/ci.yml/runs?head_sha=${config.binding.releaseSha}&status=success&per_page=100`)
  assertReleaseCi(ci.workflow_runs, config.binding.releaseSha, TARGET.repository)
  if (process.argv[2] === 'check-source') {
    requireThat(config.operation !== 'prepare', 'source_not_needed')
    await sourceIdentity(env, config)
    console.log('Verified exact same-commit recovery journal producer.')
    return
  }
  for (const name of ['NETLIFY_AUTH_TOKEN', 'INTERNAL_ADMIN_TOKEN', 'STAGING_SUPABASE_SERVICE_ROLE_KEY']) requireThat(env[name], 'protected_staging_credential')
  await mkdir(config.output, { recursive: false, mode: 0o700 })
  const deps = createProviderAccess(env, config)
  deps.save = (name, value) => writeFile(path.join(config.output, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  deps.loadJournal = async () => {
    const source = await sourceIdentity(env, config)
    const names = await readdir(config.input)
    requireThat(names.length <= 5 && names.every(name => ['creation-requested.json', 'fixture-created.json', 'alias-requested.json', 'recovery-journal.json', 'cleared-journal.json'].includes(name)), 'journal_bundle')
    const files = new Map()
    for (const name of names) {
      const file = path.join(config.input, name), info = await lstat(file)
      requireThat(info.isFile() && !info.isSymbolicLink() && info.nlink === 1 && info.size <= 16 * 1024, 'journal_file')
      files.set(name, JSON.parse(await readFile(file, 'utf8')))
    }
    return validateControlBundle(files, config, source)
  }
  const result = await orchestrate(config, deps)
  console.log(JSON.stringify(result))
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run().catch(error => { console.error(`Staging recovery control stopped (${safeFailureCode(error)}). No raw provider response or credentials were retained. Keep its control artifact; do not pay unless prepare completed and its independent alias readback succeeded.`); process.exitCode = 1 })
