#!/usr/bin/env node
// V2 owned fixture only. No Stripe mutation, direct database write, DNS, SSL,
// customer-site adoption, arbitrary upload, restore or delete operation.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, lstat, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TARGET as ORIGINAL_TARGET, digest, taskSlug, validateBinding, assertPending, assertIntent, observation as originalObservation, assertFixtureSite as originalFixtureSite, createProviderAccess as originalProviderAccess, safeProviderDiagnostic } from './staging-recovery-proof.mjs'
import { assertReleaseCi } from './verify-release-ci.mjs'

export { digest, taskSlug }
export const TARGET = Object.freeze({ ...ORIGINAL_TARGET, workflow: '.github/workflows/staging-publication-recovery.yml', productionSiteId: '4a98d266-bb9f-44ab-bf27-30597d741705' })
export const FAULT = 'Published site did not become reachable over HTTPS after 18 attempts (HTTP 404).'
export const BASELINE_FILES = Object.freeze({
  '/404.html': '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><title>Staging recovery fixture</title></head><body><p>DailyClarity staging recovery fixture.</p></body></html>\n',
  '/_headers': '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Cache-Control: no-store\n',
  '/robots.txt': 'User-agent: *\nDisallow: /\n',
})
export const BASELINE_MANIFEST = Object.freeze(Object.fromEntries(Object.entries(BASELINE_FILES).map(([name, content]) => [name, createHash('sha1').update(content).digest('hex')])))
const HASH = /^[a-f0-9]{64}$/, DEPLOY = /^[a-f0-9]{24}$/, UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/, ID = /^[1-9][0-9]{0,15}$/
const EVENT = /^evt_[A-Za-z0-9_]{6,255}$/, SUB = /^sub_[A-Za-z0-9_]{6,255}$/
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',')
const same = (a, b) => digest(a) === digest(b)
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
class ControlError extends Error { constructor(code) { super('Publication recovery control rejected.'); this.code = code } }
const need = (ok, code) => { if (!ok) throw new ControlError(code) }
const sourceFor = env => ({ runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, releaseSha: env.GITHUB_SHA })
const ownedId = id => need(UUID.test(id ?? '') && ![TARGET.siteId, TARGET.productionSiteId].includes(id), 'fixture_identity')
const titleFor = binding => `dc-recovery-${binding.nonce}-${binding.releaseSha.slice(0, 12)}`
const CHECKPOINTS = ['creation-requested.json', 'fixture-created.json', 'deploy-requested.json', 'deploy-created.json', 'upload-requested.json', 'lock-requested.json']
const FILES = [...CHECKPOINTS, 'recovery-journal.json', 'cleared-journal.json']
export function safeFailureMessage(error) {
  const diagnostic = safeProviderDiagnostic(error)
  const code = error instanceof ControlError ? error.code : diagnostic ? `${diagnostic.phase}:${diagnostic.status ?? 'none'}:${diagnostic.category}` : 'unclassified'
  return `Publication recovery stopped (${code}). Preserve its control artifact. No payment is permitted without the prepared journal and observed locked 404 fixture. Raw provider responses and credentials are not retained.`
}
export function configuration(env) {
  need(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === TARGET.repository && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_SHA === env.GITHUB_SHA && env.GITHUB_WORKFLOW_REF === `${TARGET.repository}/${TARGET.workflow}@refs/heads/main`, 'protected_workflow')
  need(ID.test(env.GITHUB_RUN_ID ?? '') && ID.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'run_identity')
  need(env.DEPLOY_ENVIRONMENT === 'staging' && env.NETLIFY_SITE_ID === TARGET.siteId && env.NETLIFY_EXPECTED_SITE_ID === TARGET.siteId && env.NETLIFY_EXPECTED_SITE_HOSTNAME === TARGET.hostname && env.NETLIFY_EXPECTED_ACCOUNT_SLUG === TARGET.accountSlug && env.STAGING_SUPABASE_PROJECT_REF === TARGET.projectRef && env.STAGING_SUPABASE_URL === `https://${TARGET.projectRef}.supabase.co`, 'fixed_staging_target')
  need(['prepare', 'inspect', 'clear', 'retry'].includes(env.OPERATION), 'operation')
  need(env.OPERATION === 'inspect' || env.CONFIRMATION === ({ prepare: 'PREPARE OWNED PUBLICATION FAULT', clear: 'CLEAR OWNED PUBLICATION FAULT', retry: 'RETRY OWNED RECOVERY EVENT' })[env.OPERATION], 'confirmation')
  need(typeof env.BINDING_JSON === 'string' && env.BINDING_JSON.length <= 2048, 'binding_size')
  const binding = validateBinding(JSON.parse(env.BINDING_JSON), env.GITHUB_SHA)
  need(path.isAbsolute(env.RUNNER_TEMP || ''), 'runner_temporary_directory')
  if (env.OPERATION === 'prepare') need(!env.SOURCE_RUN_ID && !env.SOURCE_ARTIFACT_ID && !env.SOURCE_JOURNAL_HASH && !env.EVENT_ID, 'prepare_has_no_source')
  else need(ID.test(env.SOURCE_RUN_ID ?? '') && ID.test(env.SOURCE_ARTIFACT_ID ?? '') && HASH.test(env.SOURCE_JOURNAL_HASH ?? '') && EVENT.test(env.EVENT_ID ?? ''), 'exact_source_and_event')
  return { operation: env.OPERATION, binding, source: sourceFor(env), eventId: env.EVENT_ID, journalHash: env.SOURCE_JOURNAL_HASH, output: path.join(env.RUNNER_TEMP, 'staging-publication-output'), input: path.join(env.RUNNER_TEMP, 'staging-publication-input') }
}
export function assertFixtureSite(site, binding, options = {}) {
  ownedId(site?.id)
  originalFixtureSite(site, binding, { ...options, aliases: [] })
  need(site.build_settings?.repo_url == null && site.build_settings?.repo_path == null, 'fixture_repository')
  return site
}
export function assertDeploy(deploy, siteId, deploymentId, { baseline = false, binding, ready = true } = {}) {
  ownedId(siteId)
  need(DEPLOY.test(deploy?.id ?? '') && (!deploymentId || deploy.id === deploymentId) && deploy.site_id === siteId, 'deployment_identity')
  need(deploy.context === 'production' && deploy.draft !== true && (!ready || deploy.state === 'ready'), 'deployment_state')
  need(typeof deploy.locked === 'boolean', 'deployment_lock_unknown')
  if (baseline) need(deploy.title === titleFor(binding), 'baseline_title')
  return deploy
}
export async function publication(deps, binding, journal, { baseline = false, locked } = {}) {
  const site = assertFixtureSite(await deps.site(journal.siteId), binding, { siteId: journal.siteId, createdAfter: journal.createdAt })
  need(DEPLOY.test(site.published_deploy?.id ?? ''), 'published_deployment_missing')
  const deploy = assertDeploy(await deps.deploy(site.published_deploy.id), journal.siteId, site.published_deploy.id, { baseline, binding })
  if (baseline) need(deploy.id === journal.baseline.deploymentId, 'baseline_not_published')
  if (locked !== undefined) need(deploy.locked === locked, 'publication_lock_changed')
  return { deploymentId: deploy.id, locked: deploy.locked }
}
const FAILURE_KEYS = ['observedAt', 'eventIdHash', 'eventType', 'businessKeyHash', 'eventCreatedAt', 'orderIdHash', 'amountCents', 'currency']
export function assertFailed(snapshot, binding, journal, eventId, now) {
  const intent = assertIntent(snapshot, binding, journal.sessionHash)
  need(snapshot.orders.length === 1 && snapshot.portals.length === 1 && snapshot.events.length === 1, 'failure_cardinality')
  const [order] = snapshot.orders, [portal] = snapshot.portals, [event] = snapshot.events, [reservation] = snapshot.reservations
  need(EVENT.test(eventId) && event.event_id === eventId && event.payload_event_id === eventId && event.payload_event_type === event.event_type && event.payload_livemode === false && event.event_type === 'checkout.session.completed' && event.livemode === false && ['failed', 'dead_letter'].includes(event.status) && event.last_error === FAULT && Number.isSafeInteger(event.attempts) && event.attempts >= 1, 'actual_publication_failure')
  need(event.session_id === intent.stripe_session_id && event.checkout_intent_id === intent.id && event.slug === intent.slug && event.checkout_type === 'template_subscription' && event.payment_status === 'paid' && Number.isSafeInteger(event.amount_total) && event.amount_total > 0 && SUB.test(event.subscription_id ?? '') && event.business_key === `subscription:${event.subscription_id}`, 'signed_test_checkout_binding')
  need(iso(event.created_at) && Date.parse(event.created_at) >= Date.parse(journal.preparedAt) && Date.parse(event.created_at) <= now && Number.isSafeInteger(event.payload_created) && event.payload_created >= Math.ceil(Date.parse(journal.preparedAt) / 1000) && event.payload_created <= Math.floor(now / 1000), 'failure_after_preparation')
  need(intent.status === 'fulfillment_failed' && order.slug === intent.slug && order.stripe_session_id === intent.stripe_session_id && order.stripe_subscription_id === event.subscription_id && order.first_payment_amount_cents === event.amount_total && iso(order.first_payment_received_at) && order.amount_cents === event.amount_total && UUID.test(order.id ?? ''), 'failed_order_binding')
  need(portal.slug === intent.slug && portal.status === 'provisioning_failed' && portal.checkout_intent_id === intent.id && portal.stripe_session_id === intent.stripe_session_id && portal.provisioning_error === FAULT && portal.provisioning_succeeded === false && portal.netlify_site_id === journal.siteId && reservation.netlify_site_id == null && reservation.status === 'reserved', 'failed_fixture_binding')
  need(typeof order.currency === 'string' && /^[a-z]{3}$/.test(order.currency), 'currency')
  return { observedAt: new Date(now).toISOString(), eventIdHash: digest(eventId), eventType: event.event_type, businessKeyHash: digest(event.business_key), eventCreatedAt: event.created_at, orderIdHash: digest(order.id), amountCents: order.amount_cents, currency: order.currency }
}
export function validateJournal(journal, config, source) {
  need(exact(journal, ['version', 'kind', 'binding', 'source', 'createdAt', 'preparedAt', 'siteId', 'sessionHash', 'baseline', 'phase', 'failure', 'clearedAt']) && journal.version === 2 && journal.kind === 'staging-owned-publication-recovery' && same(journal.binding, config.binding) && digest(journal) === config.journalHash, 'journal_shape_or_hash')
  ownedId(journal.siteId)
  need(exact(journal.source, ['runId', 'runAttempt', 'releaseSha']) && same(journal.source, source) && iso(journal.createdAt) && iso(journal.preparedAt) && Date.parse(journal.preparedAt) >= Date.parse(journal.createdAt) && journal.sessionHash === config.binding.sessionHash, 'journal_identity')
  const baseline = journal.baseline
  need(exact(baseline, ['deploymentId', 'filesHash', 'bodyHash', 'lockedAt']) && DEPLOY.test(baseline.deploymentId ?? '') && baseline.filesHash === digest(BASELINE_MANIFEST) && baseline.bodyHash === digest(BASELINE_FILES['/404.html']) && iso(baseline.lockedAt) && Date.parse(baseline.lockedAt) >= Date.parse(journal.createdAt) && Date.parse(baseline.lockedAt) <= Date.parse(journal.preparedAt), 'journal_baseline')
  need(['prepared', 'clear_requested', 'cleared'].includes(journal.phase), 'journal_phase')
  if (journal.phase === 'prepared') need(journal.failure === null && journal.clearedAt === null, 'prepared_journal')
  else need(exact(journal.failure, FAILURE_KEYS) && ['eventIdHash', 'businessKeyHash', 'orderIdHash'].every(k => HASH.test(journal.failure[k] ?? '')) && journal.failure.eventType === 'checkout.session.completed' && iso(journal.failure.observedAt) && iso(journal.failure.eventCreatedAt) && Date.parse(journal.failure.eventCreatedAt) >= Date.parse(journal.preparedAt) && Date.parse(journal.failure.observedAt) >= Date.parse(journal.failure.eventCreatedAt) && Number.isSafeInteger(journal.failure.amountCents) && journal.failure.amountCents > 0 && /^[a-z]{3}$/.test(journal.failure.currency) && (journal.phase === 'clear_requested' ? journal.clearedAt === null : iso(journal.clearedAt) && Date.parse(journal.clearedAt) >= Date.parse(journal.failure.observedAt)), 'failure_journal')
  return journal
}
export function validateControlBundle(files, config, source) {
  need(files instanceof Map && files.size > 0 && files.size <= FILES.length && [...files.keys()].every(name => FILES.includes(name)), 'journal_bundle')
  const journals = [...files].filter(([name, value]) => ['recovery-journal.json', 'cleared-journal.json'].includes(name) && digest(value) === config.journalHash).map(([, value]) => value)
  need(journals.length === 1, 'exact_journal_hash')
  const journal = validateJournal(journals[0], config, source)
  for (const name of CHECKPOINTS) {
    if (!files.has(name)) continue
    const value = files.get(name)
    need(exact(value, ['version', 'binding', 'source', 'createdAt', 'prepared', 'step', 'siteId', 'deploymentId', 'filesHash', 'requestedAt']) && value.version === 2 && value.prepared === false && value.step === name && same(value.binding, journal.binding) && same(value.source, journal.source) && value.createdAt === journal.createdAt && value.filesHash === journal.baseline.filesHash && iso(value.requestedAt) && Date.parse(value.requestedAt) >= Date.parse(value.createdAt) && Date.parse(value.requestedAt) <= Date.parse(journal.preparedAt), 'checkpoint_shape')
    need(value.siteId === (name === 'creation-requested.json' ? null : journal.siteId) && value.deploymentId === (['creation-requested.json', 'fixture-created.json', 'deploy-requested.json'].includes(name) ? null : journal.baseline.deploymentId), 'checkpoint_identity')
  }
  return journal
}
export function assertArtifactSource(run, artifact, config, env) {
  need(String(run?.id) === env.SOURCE_RUN_ID && run.repository?.full_name === TARGET.repository && run.path === TARGET.workflow && run.head_branch === 'main' && run.head_sha === config.binding.releaseSha && run.event === 'workflow_dispatch' && run.status === 'completed' && ['success', 'failure', 'cancelled'].includes(run.conclusion), 'journal_producer')
  need(String(artifact?.id) === env.SOURCE_ARTIFACT_ID && artifact.expired === false && artifact.name === `staging-publication-journal-${run.id}-${run.run_attempt}` && artifact.workflow_run?.id === Number(env.SOURCE_RUN_ID) && artifact.workflow_run?.head_sha === run.head_sha && Number.isSafeInteger(artifact.size_in_bytes) && artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 128 * 1024, 'journal_artifact')
  return { runId: String(run.id), runAttempt: String(run.run_attempt), releaseSha: run.head_sha }
}
export const observation = (snapshot, binding, journal, eventId, now) => ({ ...originalObservation(snapshot, binding, journal, eventId, now), version: 2, kind: 'staging-publication-observation' })
export async function orchestrate(config, deps) {
  const { binding } = config
  await deps.guard()
  if (config.operation === 'prepare') {
    const intent = assertPending(await deps.snapshot(null), binding, deps.now())
    need(await deps.lookup() === null, 'deterministic_site_already_exists')
    const createdAt = new Date(deps.now()).toISOString()
    let siteId = null, deploymentId = null
    const checkpoint = name => deps.save(name, { version: 2, binding, source: config.source, createdAt, prepared: false, step: name, siteId, deploymentId, filesHash: digest(BASELINE_MANIFEST), requestedAt: new Date(deps.now()).toISOString() })
    const recheckPending = async () => { await deps.guard(); const current = assertPending(await deps.snapshot(null), binding, deps.now()); need(current.stripe_session_id === intent.stripe_session_id, 'pending_session_changed') }
    await recheckPending()
    await checkpoint('creation-requested.json')
    const site = await deps.create()
    ownedId(site?.id); siteId = site.id
    await checkpoint('fixture-created.json')
    assertFixtureSite(site, binding, { siteId, createdAfter: createdAt, empty: true })
    await recheckPending()
    assertFixtureSite(await deps.site(siteId), binding, { siteId, createdAfter: createdAt, empty: true })
    await checkpoint('deploy-requested.json')
    const deploy = await deps.createBaseline(siteId)
    // Retain the syntactically valid returned identity before checking ownership
    // and metadata. This unprepared checkpoint never authorizes later writes.
    need(DEPLOY.test(deploy?.id ?? ''), 'deployment_identity')
    deploymentId = deploy.id
    await checkpoint('deploy-created.json')
    assertDeploy(deploy, siteId, deploymentId, { baseline: true, binding, ready: false })
    need(Array.isArray(deploy.required) && new Set(deploy.required).size === deploy.required.length && deploy.required.every(hash => Object.values(BASELINE_MANIFEST).includes(hash)) && ['required_functions', 'required_edge_functions', 'required_server'].every(key => deploy[key] === undefined || Array.isArray(deploy[key]) && deploy[key].length === 0), 'baseline_upload_scope')
    await recheckPending()
    assertFixtureSite(await deps.site(siteId), binding, { siteId, createdAfter: createdAt })
    assertDeploy(await deps.deploy(deploymentId), siteId, deploymentId, { baseline: true, binding, ready: false })
    // This fixed manifest checkpoint authorizes only its known immutable bytes.
    await checkpoint('upload-requested.json')
    for (const hash of deploy.required) await deps.upload(deploymentId, hash)
    await deps.waitReady(siteId, deploymentId)
    const pendingJournal = { siteId, createdAt, baseline: { deploymentId } }
    await publication(deps, binding, pendingJournal, { baseline: true, locked: false })
    await deps.baselineHttp()
    await recheckPending()
    await publication(deps, binding, pendingJournal, { baseline: true, locked: false })
    await checkpoint('lock-requested.json')
    await deps.lock(deploymentId)
    await deps.waitLock(siteId, deploymentId, true)
    await publication(deps, binding, pendingJournal, { baseline: true, locked: true })
    const lockedAt = new Date(deps.now()).toISOString()
    await deps.baselineHttp()
    await recheckPending()
    await publication(deps, binding, pendingJournal, { baseline: true, locked: true })
    const journal = { version: 2, kind: 'staging-owned-publication-recovery', binding, source: config.source, createdAt, preparedAt: new Date(deps.now()).toISOString(), siteId, sessionHash: digest(intent.stripe_session_id), baseline: { deploymentId, filesHash: digest(BASELINE_MANIFEST), bodyHash: digest(BASELINE_FILES['/404.html']), lockedAt }, phase: 'prepared', failure: null, clearedAt: null }
    await deps.save('recovery-journal.json', journal)
    return { prepared: true, journalHash: digest(journal), locked404Observed: true, paymentAttempted: false }
  }
  const journal = await deps.loadJournal()
  const snapshot = await deps.snapshot(config.eventId)
  const published = await publication(deps, binding, journal)
  const baseline = assertDeploy(await deps.deploy(journal.baseline.deploymentId), journal.siteId, journal.baseline.deploymentId, { baseline: true, binding })
  const alreadyClear = baseline.locked === false && published.locked === false
  const report = observation(snapshot, binding, journal, config.eventId, deps.now())
  if (config.operation === 'inspect') {
    const result = { ...report, fixtureLockCleared: alreadyClear, publishedDeploymentChanged: published.deploymentId !== baseline.id, recoveryObserved: report.recoveryObserved && alreadyClear && published.deploymentId !== baseline.id }
    await deps.save('recovery-observation.json', result)
    return result
  }
  if (config.operation === 'retry') {
    need(journal.phase === 'cleared' && alreadyClear && report.sameCapturedEvent && report.sameCapturedOrder && ['failed', 'dead_letter'].includes(report.eventStatus), 'retry_requires_recorded_clear')
    await deps.guard()
    await publication(deps, binding, journal, { locked: false })
    const current = observation(await deps.snapshot(config.eventId), binding, journal, config.eventId, deps.now())
    need(current.sameCapturedEvent && current.sameCapturedOrder && ['failed', 'dead_letter'].includes(current.eventStatus), 'retry_state_changed')
    await deps.save('recovery-observation.json', { ...current, retryRequested: true })
    await deps.retry(config.eventId)
    return { retryDispatched: true, recoveryObserved: false, fullConnectedGateAttestation: false }
  }
  need(journal.phase !== 'cleared', 'already_cleared')
  if (journal.phase === 'clear_requested' && alreadyClear) {
    need(report.sameCapturedEvent && report.sameCapturedOrder, 'uncertain_clear_identity')
    const cleared = { ...journal, source: config.source, phase: 'cleared', clearedAt: new Date(deps.now()).toISOString() }
    await deps.save('cleared-journal.json', cleared)
    return { cleared: true, journalHash: digest(cleared), resumedWithoutProviderWrite: true, recoveryObserved: false }
  }
  need(!alreadyClear, 'unexpected_external_unlock')
  const failure = assertFailed(snapshot, binding, journal, config.eventId, deps.now())
  if (journal.failure) need(['eventIdHash', 'orderIdHash', 'businessKeyHash'].every(key => failure[key] === journal.failure[key]), 'failure_identity_changed')
  await publication(deps, binding, journal, { baseline: true, locked: true })
  await deps.baselineHttp()
  await deps.guard()
  const rechecked = assertFailed(await deps.snapshot(config.eventId), binding, journal, config.eventId, deps.now())
  need(['eventIdHash', 'orderIdHash', 'businessKeyHash'].every(key => failure[key] === rechecked[key]), 'failure_changed')
  await publication(deps, binding, journal, { baseline: true, locked: true })
  const requested = { ...journal, source: config.source, phase: 'clear_requested', failure: journal.failure || failure, clearedAt: null }
  await deps.save('recovery-journal.json', requested)
  await deps.unlock(baseline.id)
  await deps.waitLock(journal.siteId, baseline.id, false)
  await publication(deps, binding, journal, { locked: false })
  const cleared = { ...requested, phase: 'cleared', clearedAt: new Date(deps.now()).toISOString() }
  await deps.save('cleared-journal.json', cleared)
  return { cleared: true, journalHash: digest(cleared), recoveryObserved: false, exactRetryAvailable: true }
}

export function createProviderAccess(env, config, fetcher = fetch) {
  // The V1 utilities below retain their original runtime and read-only REST
  // projection checks. Its alias mutation methods are deliberately not exposed.
  const shared = originalProviderAccess(env, config, fetcher)
  const request = async (url, init = {}) => {
    try { return await fetcher(url, { ...init, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25_000) }) }
    catch { throw new ControlError('provider_transport') }
  }
  const bodyText = async response => {
    const reader = response.body?.getReader(); need(reader, 'provider_empty_body')
    const chunks = []; let size = 0
    try {
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; need(size <= 256 * 1024, 'provider_body_size'); chunks.push(value) }
      return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
    } catch (error) { if (error instanceof ControlError) throw error; throw new ControlError('provider_body_read') }
    finally { try { await reader.cancel() } catch { /* no raw body */ } }
  }
  const api = async (resource, method = 'GET', body) => {
    const response = await request(`https://api.netlify.com/api/v1/${resource}`, { method, headers: { authorization: `Bearer ${env.NETLIFY_AUTH_TOKEN}`, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    need(response.ok, 'provider_http')
    const raw = await bodyText(response)
    try { return JSON.parse(raw) } catch { throw new ControlError('provider_json') }
  }
  const deploy = id => { need(DEPLOY.test(id ?? ''), 'deployment_id'); return api(`deploys/${id}`) }
  const changeLock = async (id, operation) => {
    need(DEPLOY.test(id ?? '') && ['lock', 'unlock'].includes(operation), 'deployment_id')
    const response = await request(`https://api.netlify.com/api/v1/deploys/${id}/${operation}`, { method: 'POST', headers: { authorization: `Bearer ${env.NETLIFY_AUTH_TOKEN}`, accept: 'application/json' } })
    // 202 is queued, not proof. An empty success body is valid; callers must
    // independently poll the exact deployment and re-read site publication.
    need(response.ok, 'publication_change_unconfirmed')
    try { await response.body?.cancel() } catch { /* never retain response text */ }
  }
  const wait = async (siteId, id, locked) => {
    // Each HTTP request also has a 25s timeout. The 90s observation budget keeps
    // stalled readiness/lock checks inside the protected job's 10 minute budget.
    const deadline = Date.now() + 90_000
    for (let attempt = 0; attempt < 30 && Date.now() < deadline; attempt++) {
      const value = assertDeploy(await deploy(id), siteId, id, { baseline: true, binding: config.binding, ready: false })
      need(!['error', 'rejected'].includes(value.state), 'deployment_failed')
      if (value.state === 'ready' && (locked === undefined || value.locked === locked)) return value
      if (Date.now() >= deadline) break
      await new Promise(resolve => setTimeout(resolve, Math.min(1000, deadline - Date.now())))
    }
    throw new ControlError('deployment_observation_timeout')
  }
  return {
    now: shared.now, snapshot: shared.snapshot, guard: shared.guard, retry: shared.retry, lookup: shared.lookup, site: shared.site,
    create: () => shared.create({ name: `platform-${taskSlug(config.binding)}` }), deploy,
    createBaseline: id => { ownedId(id); return api(`sites/${id}/deploys?title=${encodeURIComponent(titleFor(config.binding))}`, 'POST', { files: BASELINE_MANIFEST }) },
    upload: async (id, hash) => {
      need(DEPLOY.test(id ?? ''), 'deployment_id')
      const name = Object.keys(BASELINE_MANIFEST).find(name => BASELINE_MANIFEST[name] === hash)
      need(name, 'unknown_upload_digest')
      const response = await request(`https://api.netlify.com/api/v1/deploys/${id}/files${name}`, { method: 'PUT', headers: { authorization: `Bearer ${env.NETLIFY_AUTH_TOKEN}`, 'content-type': 'application/octet-stream' }, body: BASELINE_FILES[name] })
      need(response.ok, 'upload_unconfirmed')
    },
    lock: id => changeLock(id, 'lock'), unlock: id => changeLock(id, 'unlock'),
    waitReady: (siteId, id) => wait(siteId, id), waitLock: wait,
    baselineHttp: async () => {
      const response = await request(`https://platform-${taskSlug(config.binding)}.netlify.app/?__dc_fixture=${config.binding.nonce}`, { headers: { accept: 'text/html' } })
      need(response.status === 404 && /(?:^|[,\s])noindex(?:$|[,\s])/i.test(response.headers.get('x-robots-tag') || ''), 'baseline_http_status')
      need(digest(await bodyText(response)) === digest(BASELINE_FILES['/404.html']), 'baseline_http_content')
    },
  }
}
async function githubJson(env, resource) {
  const response = await fetch(`https://api.github.com/repos/${TARGET.repository}/${resource}`, { headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' }, redirect: 'error', signal: AbortSignal.timeout(25_000) })
  need(response.ok, 'github_read')
  return response.json()
}
async function sourceIdentity(env, config) {
  const artifact = await githubJson(env, `actions/artifacts/${env.SOURCE_ARTIFACT_ID}`)
  const attempt = artifact?.name?.match(new RegExp(`^staging-publication-journal-${env.SOURCE_RUN_ID}-([1-9][0-9]*)$`))?.[1]
  need(attempt, 'artifact_attempt')
  const run = await githubJson(env, `actions/runs/${env.SOURCE_RUN_ID}/attempts/${attempt}`)
  return assertArtifactSource(run, artifact, config, env)
}
export async function run(env = process.env) {
  const config = configuration(env)
  need(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() === config.binding.releaseSha && env.GITHUB_TOKEN, 'checkout_head_or_credential')
  const ci = await githubJson(env, `actions/workflows/ci.yml/runs?head_sha=${config.binding.releaseSha}&status=success&per_page=100`)
  assertReleaseCi(ci.workflow_runs, config.binding.releaseSha, TARGET.repository)
  if (process.argv[2] === 'check-source') { need(config.operation !== 'prepare', 'source_not_needed'); await sourceIdentity(env, config); return }
  for (const name of ['NETLIFY_AUTH_TOKEN', 'INTERNAL_ADMIN_TOKEN', 'STAGING_SUPABASE_SERVICE_ROLE_KEY']) need(env[name], 'protected_staging_credential')
  await mkdir(config.output, { recursive: false, mode: 0o700 })
  const deps = createProviderAccess(env, config)
  deps.save = (name, value) => writeFile(path.join(config.output, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  deps.loadJournal = async () => {
    const source = await sourceIdentity(env, config), names = await readdir(config.input)
    need(names.length <= FILES.length && names.every(name => FILES.includes(name)), 'journal_bundle')
    const files = new Map()
    for (const name of names) {
      const file = path.join(config.input, name), stat = await lstat(file)
      need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size <= 16 * 1024, 'journal_file')
      files.set(name, JSON.parse(await readFile(file, 'utf8')))
    }
    return validateControlBundle(files, config, source)
  }
  console.log(JSON.stringify(await orchestrate(config, deps)))
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run().catch(error => { console.error(safeFailureMessage(error)); process.exitCode = 1 })
