import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { TARGET, digest, taskSlug, faultAlias, configuration, assertRuntime, assertPending, assertFailed, assertFixtureSite, validateJournal, validateControlBundle, safeFailureCode, safeProviderDiagnostic, safeFailureMessage, assertArtifactSource, observation, orchestrate, createProviderAccess } from './staging-recovery-proof.mjs'

const SHA = 'a'.repeat(40), NOW = Date.parse('2026-10-16T12:00:00.000Z'), CREATED = '2026-10-16T11:55:00.000Z'
const SESSION = 'cs_test_example123', EVENT = 'evt_example123', SUB = 'sub_example123', INTENT = '11111111-1111-4111-8111-111111111111', SITE = '22222222-2222-4222-8222-222222222222', ORDER = '33333333-3333-4333-8333-333333333333'
const binding = { releaseSha: SHA, certificationHash: 'b'.repeat(64), stagingJournalHash: 'c'.repeat(64), catalogHash: 'd'.repeat(64), manifestHash: 'e'.repeat(64), nonce: '1234567890abcdef12345678', intentId: INTENT, sessionHash: digest(SESSION) }
const source = { runId: '42', runAttempt: '1', releaseSha: SHA }
const FAULT = 'The deterministic Netlify site name is already bound to another domain.'
const env = () => ({ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: TARGET.repository, GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: `${TARGET.repository}/${TARGET.workflow}@refs/heads/main`, GITHUB_SHA: SHA, GITHUB_WORKFLOW_SHA: SHA, GITHUB_RUN_ID: '42', GITHUB_RUN_ATTEMPT: '1', DEPLOY_ENVIRONMENT: 'staging', NETLIFY_SITE_ID: TARGET.siteId, NETLIFY_EXPECTED_SITE_ID: TARGET.siteId, NETLIFY_EXPECTED_SITE_HOSTNAME: TARGET.hostname, NETLIFY_EXPECTED_ACCOUNT_SLUG: TARGET.accountSlug, STAGING_SUPABASE_PROJECT_REF: TARGET.projectRef, STAGING_SUPABASE_URL: `https://${TARGET.projectRef}.supabase.co`, OPERATION: 'prepare', CONFIRMATION: 'PREPARE OWNED RECOVERY FAULT', BINDING_JSON: JSON.stringify(binding), RUNNER_TEMP: '/tmp/recovery-test' })
const config = operation => ({ operation, binding, source, eventId: operation === 'prepare' ? undefined : EVENT })
const fixture = (aliases = [faultAlias(binding)]) => ({ id: SITE, account_id: TARGET.accountId, account_slug: TARGET.accountSlug, name: `platform-${taskSlug(binding)}`, default_domain: `platform-${taskSlug(binding)}.netlify.app`, custom_domain: null, domain_aliases: aliases, url: `http://platform-${taskSlug(binding)}.netlify.app`, ssl_url: `https://platform-${taskSlug(binding)}.netlify.app`, created_at: new Date(NOW).toISOString(), published_deploy: null, build_settings: {} })
const pending = () => ({ intents: [{ id: INTENT, slug: taskSlug(binding), plan: 'basic', status: 'session_created', stripe_session_id: SESSION, created_at: CREATED, catalog_revision: { contractVersion: 3, catalogHash: binding.catalogHash, manifestHash: binding.manifestHash } }], reservations: [{ slug: taskSlug(binding), reserved_for: INTENT, status: 'checkout_pending', reservation_expires_at: '2026-10-16T12:55:00.000Z', netlify_site_id: null, site_url: null, custom_domain: null }], orders: [], portals: [], events: [] })
const journal = () => ({ version: 1, kind: 'staging-owned-alias-recovery', binding, source, createdAt: '2026-10-16T11:58:00.000Z', preparedAt: '2026-10-16T11:58:01.000Z', siteId: SITE, sessionHash: digest(SESSION), phase: 'prepared', failure: null, clearedAt: null })
const failed = () => {
  const s = pending(); s.intents[0].status = 'fulfillment_failed'; s.reservations[0].status = 'reserved'; s.reservations[0].reservation_expires_at = null
  s.orders = [{ id: ORDER, slug: taskSlug(binding), stripe_session_id: SESSION, stripe_subscription_id: SUB, status: 'active', amount_cents: 2999, currency: 'usd', first_payment_amount_cents: 2999, first_payment_received_at: '2026-10-16T11:59:00.000Z' }]
  s.portals = [{ slug: taskSlug(binding), status: 'provisioning_failed', checkout_intent_id: INTENT, stripe_session_id: SESSION, provisioning_error: FAULT, provisioning_succeeded: false, netlify_site_id: null }]
  s.events = [{ event_id: EVENT, payload_event_id: EVENT, payload_event_type: 'checkout.session.completed', payload_livemode: false, payload_created: Date.parse('2026-10-16T11:59:00.000Z') / 1000, event_type: 'checkout.session.completed', livemode: false, status: 'failed', last_error: FAULT, attempts: 2, created_at: '2026-10-16T11:59:00.000Z', session_id: SESSION, checkout_intent_id: INTENT, slug: taskSlug(binding), checkout_type: 'template_subscription', payment_status: 'paid', amount_total: 2999, subscription_id: SUB, business_key: `subscription:${SUB}` }]
  return s
}
const clearedJournal = () => ({ ...journal(), phase: 'cleared', failure: assertFailed(failed(), binding, journal(), EVENT, NOW), clearedAt: new Date(NOW).toISOString() })
const recovered = () => {
  const s = failed(); s.intents[0].status = 'completed'; s.reservations[0].status = 'provisioned'; s.reservations[0].netlify_site_id = SITE
  s.portals[0] = { ...s.portals[0], status: 'active', provisioning_error: null, provisioning_succeeded: true, netlify_site_id: SITE }
  s.events[0] = { event_id: EVENT, event_type: 'checkout.session.completed', livemode: false, status: 'succeeded', business_key: `subscription:${SUB}`, created_at: '2026-10-16T11:59:00.000Z' }
  return s
}
function harness(operation, state = pending(), savedJournal = journal()) {
  const calls = [], files = new Map(); let site = fixture(operation === 'prepare' || operation === 'retry' || savedJournal.phase === 'cleared' ? [] : [faultAlias(binding)])
  return { calls, files, deps: {
    now: () => NOW, guard: async () => calls.push('guard'),
    snapshot: async () => { calls.push('snapshot'); return structuredClone(state) },
    lookup: async () => { calls.push('lookup'); return null },
    create: async body => { calls.push(['create', body]); return site },
    site: async id => { calls.push(['site', id]); return site },
    setAlias: async id => { calls.push(['setAlias', id]); site = fixture(); return site },
    clear: async id => { calls.push(['clear', id]); site = fixture([]) },
    retry: async id => calls.push(['retry', id]), loadJournal: async () => savedJournal,
    save: async (name, value) => { assert(!files.has(name)); files.set(name, structuredClone(value)); calls.push(['save', name]) },
  } }
}

test('configuration pins protected workflow, target, exact SHA and private session commitment', () => {
  assert.equal(configuration(env()).binding.sessionHash, digest(SESSION))
  for (const patch of [{ GITHUB_REF: 'refs/heads/other' }, { GITHUB_SHA: 'f'.repeat(40) }, { GITHUB_WORKFLOW_REF: 'evil' }, { GITHUB_WORKFLOW_SHA: 'f'.repeat(40) }, { STAGING_SUPABASE_PROJECT_REF: 'production' }, { CONFIRMATION: '' }]) assert.throws(() => configuration({ ...env(), ...patch }))
  assert.throws(() => configuration({ ...env(), BINDING_JSON: JSON.stringify({ ...binding, email: 'private@example.invalid' }) }))
})
test('runtime requires exact full staged candidate and zero-day trial', () => {
  const runtime = { deploymentSiteId: TARGET.siteId, supabaseProjectRef: TARGET.projectRef, deploymentReleaseSha: SHA, supabaseSchemaVersion: '20260903.4', bookingKitSchemaVersion: '20260925.2', supabaseSchemaReady: true, templateCatalogProfile: 'rehab-staging', templateCatalogHash: binding.catalogHash, templateManifestHash: binding.manifestHash, templateCatalogReady: true, publishedTemplateCount: 5486, expectedTemplateCount: 5486, templateCheckoutReady: true, fulfillmentReady: true, emailReady: true, salesPaused: false, bookingKitSalesEnabled: false, missingRequirements: [] }
  const proof = { version: 1, profile: 'rehab-staging-candidate', releaseSha: SHA, certificationHash: binding.certificationHash, journalHash: binding.stagingJournalHash }
  assertRuntime(runtime, proof, { trialDays: 0 }, binding)
  for (const [r, p, c] of [[runtime, proof, { trialDays: 7 }], [{ ...runtime, publishedTemplateCount: 60 }, proof, { trialDays: 0 }], [runtime, { ...proof, journalHash: 'f'.repeat(64) }, { trialDays: 0 }], [{ ...runtime, missingRequirements: ['STRIPE_ENVIRONMENT_MODE_MISMATCH'] }, proof, { trialDays: 0 }]]) assert.throws(() => assertRuntime(r, p, c, binding))
})
test('pending requires exact unexpired checkout_pending reservation and no processed records', () => {
  assertPending(pending(), binding, NOW)
  for (const change of [s => s.reservations[0].status = 'reserved', s => s.reservations[0].reserved_for = ORDER, s => s.intents[0].stripe_session_id = 'cs_live_example', s => s.intents[0].stripe_session_id = 'cs_test_other123', s => s.reservations[0].reservation_expires_at = null, s => s.orders.push({}), s => s.portals.push({}), s => s.events.push({}), s => s.intents[0].catalog_revision.catalogHash = 'f'.repeat(64)]) { const s = pending(); change(s); assert.throws(() => assertPending(s, binding, NOW)) }
})
test('alias site rejects another account, custom domain, alias set, reused deployment and default hostname', () => {
  assertFixtureSite(fixture(), binding, { siteId: SITE, aliases: [faultAlias(binding)], empty: true })
  for (const patch of [{ account_id: 'other' }, { custom_domain: 'customer.example' }, { domain_aliases: [faultAlias(binding), 'customer.example'] }, { default_domain: 'other.netlify.app' }, { published_deploy: { id: 'exists' } }, { id: TARGET.siteId }]) assert.throws(() => assertFixtureSite({ ...fixture(), ...patch }, binding, { siteId: SITE, aliases: [faultAlias(binding)], empty: true }))
})
test('prepare creates empty site, rechecks ownership and checkout, then records one alias PATCH before independent readback', async () => {
  const h = harness('prepare'); const result = await orchestrate(config('prepare'), h.deps)
  assert.equal(result.prepared, true); assert.equal(result.paymentAttempted, false)
  assert.deepEqual(h.calls, ['guard', 'snapshot', 'lookup', 'snapshot', 'guard', ['save', 'creation-requested.json'], ['create', { name: `platform-${taskSlug(binding)}` }], ['save', 'fixture-created.json'], ['site', SITE], 'guard', 'snapshot', ['site', SITE], ['save', 'alias-requested.json'], ['setAlias', SITE], ['site', SITE], 'guard', 'snapshot', ['save', 'recovery-journal.json']])
  const text = JSON.stringify([...h.files]); assert(!text.includes(SESSION)); assert(!text.includes('private@example'))
  assert(h.files.has('fixture-created.json')); assert(h.files.has('alias-requested.json')); assert(h.files.has('recovery-journal.json'))
  assert.equal(validateControlBundle(h.files, { ...config('clear'), journalHash: result.journalHash }, source), h.files.get('recovery-journal.json'))
})
test('prepare never mutates existing deterministic site or races a processed checkout', async () => {
  const h = harness('prepare'); h.deps.lookup = async () => fixture()
  await assert.rejects(orchestrate(config('prepare'), h.deps)); assert(!h.calls.some(c => Array.isArray(c) && c[0] === 'create'))
  const raced = harness('prepare'); let reads = 0; raced.deps.snapshot = async () => ++reads === 1 ? pending() : failed()
  await assert.rejects(orchestrate(config('prepare'), raced.deps)); assert(!raced.calls.some(c => Array.isArray(c) && c[0] === 'create'))
})
test('ignored alias or ambiguous creation does not approve payment or blindly repeat POST', async () => {
  const h = harness('prepare'); h.deps.site = async () => fixture([])
  await assert.rejects(orchestrate(config('prepare'), h.deps)); assert(h.files.has('fixture-created.json')); assert(!h.files.has('recovery-journal.json'))
  let creates = 0; const uncertain = harness('prepare'); uncertain.deps.create = async () => { creates++; throw Error('secret provider response') }
  await assert.rejects(orchestrate(config('prepare'), uncertain.deps)); assert.equal(creates, 1); assert(uncertain.files.has('creation-requested.json')); assert(!uncertain.files.has('recovery-journal.json'))
})
test('prepare rejects wrong or nonempty creation and readback identities before alias PATCH', async () => {
  const invalid = [
    { id: 'not-a-uuid' }, { id: TARGET.siteId }, { account_id: 'other' }, { account_slug: 'other' }, { name: 'another-site' },
    { custom_domain: 'customer.example' }, { default_domain: 'other.netlify.app' }, { url: 'https://customer.example' },
    { domain_aliases: [faultAlias(binding)] }, { domain_aliases: ['customer.example'] },
    { published_deploy: { id: 'existing' } }, { build_settings: { repo_url: 'https://github.com/example/site' } },
    { build_settings: { repo_path: 'some/repository' } }, { created_at: CREATED },
  ]
  for (const patch of invalid) for (const stage of ['create', 'readback']) {
    const h = harness('prepare')
    h.deps[stage === 'create' ? 'create' : 'site'] = async () => ({ ...fixture([]), ...patch })
    await assert.rejects(orchestrate(config('prepare'), h.deps))
    assert(!h.calls.some(c => Array.isArray(c) && c[0] === 'setAlias')); assert(!h.files.has('recovery-journal.json'))
  }
  const mismatch = harness('prepare'); mismatch.deps.site = async () => ({ ...fixture([]), id: ORDER })
  await assert.rejects(orchestrate(config('prepare'), mismatch.deps), /fixture_identity/)
  assert(!mismatch.calls.some(c => Array.isArray(c) && c[0] === 'setAlias'))
})
test('prepare rejects alias PATCH response or independent readback mismatches without prepared proof', async () => {
  const invalid = [{ id: ORDER }, { id: TARGET.siteId }, { account_id: 'other' }, { account_slug: 'other' }, { name: 'another-site' }, { custom_domain: 'customer.example' }, { domain_aliases: [] }, { domain_aliases: [faultAlias(binding), 'customer.example'] }, { url: 'https://customer.example' }, { ssl_url: 'https://customer.example' }, { published_deploy: { id: 'existing' } }, { build_settings: { repo_url: 'https://github.com/example/site' } }]
  for (const patch of invalid) for (const stage of ['patch', 'readback']) {
    const h = harness('prepare'); let patched = false, writes = 0
    h.deps.setAlias = async () => { patched = true; writes++; return stage === 'patch' ? { ...fixture(), ...patch } : fixture() }
    h.deps.site = async () => !patched ? fixture([]) : stage === 'readback' ? { ...fixture(), ...patch } : fixture()
    await assert.rejects(orchestrate(config('prepare'), h.deps))
    assert.equal(writes, 1); assert(h.files.has('alias-requested.json')); assert(!h.files.has('recovery-journal.json'))
  }
})
test('uncertain alias PATCH or failed checkpoint write never retries or approves payment', async () => {
  const uncertain = harness('prepare'); let writes = 0
  uncertain.deps.setAlias = async () => { writes++; throw Error('secret provider response') }
  await assert.rejects(orchestrate(config('prepare'), uncertain.deps)); assert.equal(writes, 1)
  assert(uncertain.files.has('alias-requested.json')); assert(!uncertain.files.has('recovery-journal.json'))
  const blocked = harness('prepare'), save = blocked.deps.save
  blocked.deps.save = async (name, value) => { if (name === 'alias-requested.json') throw Error('disk full'); await save(name, value) }
  await assert.rejects(orchestrate(config('prepare'), blocked.deps))
  assert(!blocked.calls.some(c => Array.isArray(c) && c[0] === 'setAlias')); assert(!blocked.files.has('recovery-journal.json'))
})
test('fresh unpaid checkout, reservation and runtime guards gate PATCH and final prepared proof', async () => {
  for (const failedRead of [3, 4]) for (const change of [s => s.intents[0].created_at = '2026-10-16T10:00:00.000Z', s => s.reservations[0].reservation_expires_at = '2026-10-16T12:05:00.000Z', s => s.orders.push({}), s => s.intents[0].status = 'completed']) {
    const h = harness('prepare'); let reads = 0
    h.deps.snapshot = async () => { const s = pending(); if (++reads === failedRead) change(s); return s }
    await assert.rejects(orchestrate(config('prepare'), h.deps)); assert(!h.files.has('recovery-journal.json'))
    assert.equal(h.calls.filter(c => Array.isArray(c) && c[0] === 'setAlias').length, failedRead === 3 ? 0 : 1)
  }
  for (const failedGuard of [3, 4]) {
    const h = harness('prepare'); let guards = 0
    h.deps.guard = async () => { if (++guards === failedGuard) throw Error('runtime changed') }
    await assert.rejects(orchestrate(config('prepare'), h.deps)); assert(!h.files.has('recovery-journal.json'))
    assert.equal(h.calls.filter(c => Array.isArray(c) && c[0] === 'setAlias').length, failedGuard === 3 ? 0 : 1)
  }
  const changed = harness('prepare'); let reads = 0
  changed.deps.site = async () => ++reads === 2 ? { ...fixture([]), published_deploy: { id: 'raced-deployment' } } : fixture([])
  await assert.rejects(orchestrate(config('prepare'), changed.deps), /fixture_must_be_empty/)
  assert(!changed.calls.some(c => Array.isArray(c) && c[0] === 'setAlias'))
})
test('checkpoint bundle binds exact source, fixture, alias request and time to the selected prepared journal', async () => {
  const h = harness('prepare'), result = await orchestrate(config('prepare'), h.deps)
  const cfg = { ...config('clear'), journalHash: result.journalHash }
  for (const patch of [{ siteId: ORDER }, { binding: { ...binding, nonce: 'f'.repeat(24) } }, { source: { ...source, runId: '43' } }, { createdAt: CREATED }, { aliasRequestedAt: '2026-10-16T12:00:01.000Z' }, { aliasRequestedAt: CREATED }, { aliases: ['customer.example'] }, { prepared: true }, { aliasOutcome: 'confirmed' }, { extra: 'untrusted' }]) {
    const files = structuredClone(h.files); files.set('alias-requested.json', { ...files.get('alias-requested.json'), ...patch })
    assert.throws(() => validateControlBundle(files, cfg, source))
  }
  for (const name of ['creation-requested.json', 'fixture-created.json']) {
    const files = structuredClone(h.files); files.set(name, { ...files.get(name), source: { ...source, runId: '43' } })
    assert.throws(() => validateControlBundle(files, cfg, source), /checkpoint_identity/)
  }
  const partial = structuredClone(h.files); partial.delete('recovery-journal.json')
  assert.throws(() => validateControlBundle(partial, cfg, source), /exact_journal_hash/)
  const extra = structuredClone(h.files); extra.set('provider-secret.json', {})
  assert.throws(() => validateControlBundle(extra, cfg, source), /journal_bundle/)
  const legacy = new Map([['recovery-journal.json', journal()]])
  assert.equal(validateControlBundle(legacy, { ...cfg, journalHash: digest(journal()) }, source), legacy.get('recovery-journal.json'))
})
test('safe diagnostics emit only internal allowlisted codes and never provider text or impersonated errors', () => {
  try { assertFixtureSite(fixture([]), binding, { aliases: [faultAlias(binding)], empty: true }) }
  catch (error) { assert.equal(safeFailureCode(error), 'fixture_domains') }
  for (const error of [Error('secret provider response'), Object.assign(Error('Recovery control rejected: fixture_domains.'), { code: 'fixture_domains' }), { code: 'fixture_domains' }, null]) assert.equal(safeFailureCode(error), 'unclassified')
  try { configuration({ ...env(), GITHUB_REF: 'refs/heads/other' }) }
  catch (error) { assert.equal(safeFailureCode(error), 'unclassified') }
})
test('genuine alias failure binds signed test envelope and nonzero payment, independently of later billing status', () => {
  assert.equal(assertFailed(failed(), binding, journal(), EVENT, NOW).amountCents, 2999)
  for (const change of [s => s.events[0].livemode = true, s => s.events[0].payload_event_id = 'evt_other123', s => s.events[0].payment_status = 'unpaid', s => s.events[0].amount_total = 0, s => s.events[0].payload_created = Date.parse(CREATED) / 1000, s => s.events[0].last_error = 'unrelated', s => s.events[0].status = 'processing', s => s.events[0].business_key = 'subscription:other', s => s.orders[0].first_payment_amount_cents = 0, s => s.portals[0].netlify_site_id = SITE]) { const s = failed(); change(s); assert.throws(() => assertFailed(s, binding, journal(), EVENT, NOW)) }
})
test('clear captures exact failure before removing only singleton alias', async () => {
  const h = harness('clear', failed()); const result = await orchestrate(config('clear'), h.deps)
  assert.equal(result.cleared, true); assert.equal(result.recoveryObserved, false)
  assert(h.calls.findIndex(c => Array.isArray(c) && c[1] === 'recovery-journal.json') < h.calls.findIndex(c => Array.isArray(c) && c[0] === 'clear'))
  assert.equal(h.files.get('recovery-journal.json').phase, 'clear_requested'); assert.equal(h.files.get('cleared-journal.json').phase, 'cleared')
})
test('clear refuses unrelated alias changes or another event/order', async () => {
  const h = harness('clear', failed()); h.deps.site = async () => fixture([faultAlias(binding), 'customer.example'])
  await assert.rejects(orchestrate(config('clear'), h.deps)); assert(!h.calls.some(c => Array.isArray(c) && c[0] === 'clear'))
  const s = failed(); s.events[0].event_id = 'evt_other123'; const wrong = harness('clear', s)
  await assert.rejects(orchestrate(config('clear'), wrong.deps)); assert(!wrong.calls.some(c => Array.isArray(c) && c[0] === 'clear'))
})
test('uncertain PATCH preserves immutable failure journal and can resume by readback without another write', async () => {
  const h = harness('clear', failed()); let writes = 0; h.deps.clear = async () => { writes++; throw Error('timeout') }
  await assert.rejects(orchestrate(config('clear'), h.deps)); assert.equal(writes, 1)
  const requested = h.files.get('recovery-journal.json'); assert.equal(requested.phase, 'clear_requested')
  const resumed = harness('clear', recovered(), requested); resumed.deps.site = async () => ({ ...fixture([]), published_deploy: { id: 'a'.repeat(24), state: 'ready' } })
  const result = await orchestrate(config('clear'), resumed.deps); assert.equal(result.resumedWithoutProviderWrite, true); assert.equal(result.recoveryObserved, true)
  assert(!resumed.calls.some(c => Array.isArray(c) && c[0] === 'clear'))
})
test('inspection proves same order/site/event after payload scrubbing and never asserts refund or mail', () => {
  const report = observation(recovered(), binding, clearedJournal(), EVENT, NOW)
  assert.equal(report.recoveryObserved, true); assert.equal(report.financialRefundVerified, false); assert.equal(report.inboxDeliveryVerified, false)
  for (const change of [s => s.orders[0].id = SITE, s => s.events[0].business_key = 'subscription:other', s => s.portals[0].netlify_site_id = ORDER, s => s.events[0].livemode = true]) { const s = recovered(); change(s); assert.equal(observation(s, binding, clearedJournal(), EVENT, NOW).recoveryObserved, false) }
  assert.equal(observation(recovered(), binding, journal(), EVENT, NOW).recoveryObserved, false)
})
test('dead-letter retry uses only exact recorded event and clear fixture; queued/succeeded/live/unrelated reject', async () => {
  const s = failed(); s.events[0].status = 'dead_letter'; const h = harness('retry', s, clearedJournal())
  assert.equal((await orchestrate(config('retry'), h.deps)).retryDispatched, true)
  assert.deepEqual(h.calls.find(c => Array.isArray(c) && c[0] === 'retry'), ['retry', EVENT])
  for (const status of ['queued', 'processing', 'succeeded']) { const state = failed(); state.events[0].status = status; const rejected = harness('retry', state, clearedJournal()); await assert.rejects(orchestrate(config('retry'), rejected.deps)); assert(!rejected.calls.some(c => Array.isArray(c) && c[0] === 'retry')) }
})
test('journal exact hash, source, fields and immutable artifact attempt must agree', () => {
  const j = journal(), cfg = { ...config('clear'), journalHash: digest(j) }
  assert.equal(validateJournal(j, cfg, source), j)
  assert.throws(() => validateJournal({ ...j, email: 'private@example.invalid' }, cfg, source))
  assert.throws(() => validateJournal(j, cfg, { ...source, runAttempt: '2' }))
  const run = { id: 42, repository: { full_name: TARGET.repository }, path: TARGET.workflow, head_branch: 'main', head_sha: SHA, event: 'workflow_dispatch', status: 'completed', conclusion: 'success', run_attempt: 1 }
  const artifact = { id: 99, name: 'staging-recovery-journal-42-1', expired: false, size_in_bytes: 1000, workflow_run: { id: 42, head_sha: SHA } }
  const e = { SOURCE_RUN_ID: '42', SOURCE_ARTIFACT_ID: '99' }
  assert.deepEqual(assertArtifactSource(run, artifact, cfg, e), source)
  for (const patch of [{ expired: true }, { name: 'staging-recovery-journal-42-2' }, { workflow_run: { id: 42, head_sha: 'f'.repeat(40) } }]) assert.throws(() => assertArtifactSource(run, { ...artifact, ...patch }, cfg, e))
})
test('provider adapter keeps DB read-only, fixed origins, no redirects or raw payload query; mutations are exact', async () => {
  const requests = []
  const fetcher = async (url, init) => {
    requests.push({ url, init }); const parsed = new URL(url)
    if (parsed.pathname.endsWith('/checkout_intents')) return new Response(JSON.stringify(pending().intents))
    if (parsed.pathname.endsWith('/site_slugs')) return new Response(JSON.stringify(pending().reservations))
    if (parsed.hostname.endsWith('.supabase.co')) return new Response('[]')
    if (parsed.pathname.endsWith('/retry')) return new Response('{}', { status: 202 })
    return new Response(JSON.stringify(fixture()))
  }
  const access = createProviderAccess({ NETLIFY_AUTH_TOKEN: 'not-a-secret', INTERNAL_ADMIN_TOKEN: 'not-a-secret', STAGING_SUPABASE_SERVICE_ROLE_KEY: 'not-a-secret' }, config('prepare'), fetcher)
  await access.snapshot(null); await access.create({ name: `platform-${taskSlug(binding)}` }); await access.setAlias(SITE); await access.clear(SITE); await access.retry(EVENT)
  for (const request of requests) { assert.equal(request.init.redirect, 'error'); if (request.url.includes('.supabase.co')) { assert.equal(request.init.method, 'GET'); assert(!new URL(request.url).searchParams.get('select').split(',').includes('payload')) } }
  const mutations = requests.filter(r => r.init.method && r.init.method !== 'GET')
  assert.deepEqual(mutations.map(r => r.init.method), ['POST', 'PATCH', 'PATCH', 'POST'])
  assert.deepEqual(JSON.parse(mutations[0].init.body), { name: `platform-${taskSlug(binding)}` })
  assert.equal(mutations[1].url, `https://api.netlify.com/api/v1/sites/${SITE}`)
  assert.deepEqual(JSON.parse(mutations[1].init.body), { domain_aliases: [faultAlias(binding)] })
  assert.deepEqual(JSON.parse(mutations[2].init.body), { domain_aliases: [] }); assert.equal(mutations[3].url, `https://${TARGET.hostname}/api/admin/stripe/fulfillment/retry`)
  assert.throws(() => access.setAlias(TARGET.siteId)); assert.throws(() => access.setAlias('not-a-uuid'))
})

// Exercise the public wizard's actual normalization rather than copying its limit.
test('task slug survives the actual checkout slug normalizer unchanged', async () => {
  const source = await readFile(new URL('../src/lib/site-slug.ts', import.meta.url), 'utf8')
  const slugModule = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`)
  assert.equal(slugModule.normalizeSiteSlug(taskSlug(binding)), taskSlug(binding))
})
test('documented Netlify response may omit default_domain but never conflict with exact URL identity', () => {
  const site = fixture(); delete site.default_domain
  assertFixtureSite(site, binding, { siteId: SITE, aliases: [faultAlias(binding)], empty: true })
  site.ssl_url = 'https://customer.example'
  assert.throws(() => assertFixtureSite(site, binding, { siteId: SITE, aliases: [faultAlias(binding)], empty: true }))
})
test('completed DB state cannot assert recovery when actual owned site still carries fault alias', async () => {
  const requested = { ...clearedJournal(), phase: 'clear_requested', clearedAt: null }
  const h = harness('inspect', recovered(), requested)
  const result = await orchestrate(config('inspect'), h.deps)
  assert.equal(result.fixtureAliasCleared, false); assert.equal(result.recoveryObserved, false)
})

test('provider guard rejects newer remote main even when deployed runtime still matches the binding', async () => {
  const fetcher = async url => new Response(JSON.stringify(url.includes('/branches/main') ? { commit: { sha: 'f'.repeat(40) } } : {}))
  const access = createProviderAccess({}, config('prepare'), fetcher)
  await assert.rejects(access.guard(), /current_main_changed/)
})

test('recovery inspection requires actual provider ready deployment in addition to converged DB state', async () => {
  const h = harness('inspect', recovered(), clearedJournal())
  const withoutDeploy = await orchestrate(config('inspect'), h.deps)
  assert.equal(withoutDeploy.providerDeploymentReady, false); assert.equal(withoutDeploy.recoveryObserved, false)
  const ready = harness('inspect', recovered(), clearedJournal())
  ready.deps.site = async () => ({ ...fixture([]), published_deploy: { id: 'b'.repeat(24), state: 'ready' } })
  assert.equal((await orchestrate(config('inspect'), ready.deps)).recoveryObserved, true)
})

test('provider account is checked before fixture creation, not merely after its response', async () => {
  const fetcher = async url => new Response(JSON.stringify(url.includes('/branches/main') ? { commit: { sha: SHA } } : url.includes('api.netlify.com') ? { id: TARGET.siteId, name: 'dailyclarity-staging', account_slug: TARGET.accountSlug, account_id: 'unrelated-account' } : {}))
  const access = createProviderAccess({}, config('prepare'), fetcher)
  await assert.rejects(access.guard(), /staging_account_changed/)
})

const PRIVATE = `provider-private-token ${SESSION} ${EVENT} ${SITE} ${binding.nonce} person@example.invalid https://private.invalid/?token=secret ::error::injected`
const providerEnv = { NETLIFY_AUTH_TOKEN: PRIVATE, INTERNAL_ADMIN_TOKEN: PRIVATE, STAGING_SUPABASE_SERVICE_ROLE_KEY: PRIVATE, GITHUB_TOKEN: PRIVATE }
function checkDiagnostic(error, expected, code = 'provider_http') {
  assert.equal(safeFailureCode(error), code)
  assert.deepEqual(safeProviderDiagnostic(error), expected)
  const publicText = safeFailureMessage(error)
  for (const secret of [PRIVATE, SESSION, EVENT, SITE, binding.nonce, 'person@example.invalid', 'https://', '::error::', 'private-token']) assert(!publicText.includes(secret))
  assert(publicText.includes('do not pay unless prepare completed and its independent alias readback succeeded'))
  assert(Object.isFrozen(safeProviderDiagnostic(error)))
  return true
}

test('HTTP diagnostics use only fixed values and never read arbitrary response text or headers', async () => {
  const cases = [[400, 'bad_request'], [401, 'unauthorized'], [402, 'payment_required'], [403, 'forbidden'], [404, 'not_found'], [409, 'conflict'], [422, 'unprocessable_content'], [429, 'rate_limited'], [503, 'server_error'], [302, 'unexpected_redirect'], [418, 'unexpected_status']]
  for (const [status, category] of cases) {
    let requests = 0, bodyReads = 0
    const access = createProviderAccess(providerEnv, config('prepare'), async () => {
      requests++
      return { ok: false, status, get headers() { throw Error(PRIVATE) }, async text() { bodyReads++; throw Error(PRIVATE) } }
    })
    await assert.rejects(access.setAlias(SITE), error => {
      checkDiagnostic(error, { phase: 'fixture_alias_update', status, category, ...(status === 422 ? { providerCategory: 'unrecognized' } : {}) })
      assert.equal(safeFailureMessage(error), `Staging recovery control stopped (provider_http; request=fixture_alias_update; status=${status}; category=${category}${status === 422 ? '; provider_category=unrecognized' : ''}). No raw provider response or credentials were retained. Keep its control artifact; do not pay unless prepare completed and its independent alias readback succeeded.`)
      return true
    })
    assert.equal(requests, 1); assert.equal(bodyReads, 0)
  }
})

test('transport, unreadable, oversized and malformed successful responses stay private and fail closed', async () => {
  const cases = [
    { fetcher: async () => { throw Object.assign(Error(PRIVATE), { code: PRIVATE, cause: PRIVATE, phase: PRIVATE }) }, code: 'provider_transport', status: null, category: 'transport_failure' },
    { fetcher: async () => { throw PRIVATE }, code: 'provider_transport', status: null, category: 'transport_failure' },
    { fetcher: async () => { throw { get message() { throw Error(PRIVATE) }, get name() { throw Error(PRIVATE) } } }, code: 'provider_transport', status: null, category: 'transport_failure' },
    { fetcher: async () => ({ ok: true, status: 200, text: async () => { throw Error(PRIVATE) } }), code: 'provider_response_read', status: 200, category: 'response_read_failed' },
    { fetcher: async () => new Response(PRIVATE), code: 'provider_response_json', status: 200, category: 'invalid_json' },
    { fetcher: async () => new Response(JSON.stringify({ secret: PRIVATE, oversized: 'x'.repeat(256 * 1024) })), code: 'provider_response_size', status: 200, category: 'response_too_large' },
  ]
  for (const { fetcher, code, status, category } of cases) {
    let count = 0
    const access = createProviderAccess(providerEnv, config('prepare'), (...args) => { count++; return fetcher(...args) })
    await assert.rejects(access.setAlias(SITE), error => checkDiagnostic(error, { phase: 'fixture_alias_update', status, category }, code))
    assert.equal(count, 1)
  }
})

test('provider objects and copied diagnostics cannot impersonate an internally issued failure', async () => {
  const access = createProviderAccess(providerEnv, config('prepare'), async () => new Response(JSON.stringify({ message: PRIVATE, phase: 'fixture_alias_update', status: 403, category: PRIVATE }), { status: 403 }))
  let original
  await assert.rejects(access.setAlias(SITE), error => { original = error; return true })
  const expected = { phase: 'fixture_alias_update', status: 403, category: 'forbidden' }
  assert.throws(() => { safeProviderDiagnostic(original).phase = PRIVATE }, TypeError)
  Object.assign(original, { phase: PRIVATE, status: PRIVATE, category: PRIVATE, message: PRIVATE, cause: PRIVATE })
  checkDiagnostic(original, expected)
  for (const impostor of [Object.assign(Error(PRIVATE), { code: 'provider_http', diagnostic: expected }), { code: 'provider_http', ...expected }, null, PRIVATE]) {
    assert.equal(safeProviderDiagnostic(impostor), null)
    assert.equal(safeFailureCode(impostor), 'unclassified')
    assert(!safeFailureMessage(impostor).includes(PRIVATE))
    assert(!safeFailureMessage(impostor).includes('request='))
  }
})

test('all owned-fixture adapter boundaries have distinct static labels including concurrent reads', async () => {
  const direct = [
    ['fixture_lookup', a => a.lookup()], ['fixture_create', a => a.create({ name: `platform-${taskSlug(binding)}` })],
    ['fixture_readback', a => a.site(SITE)], ['fixture_alias_update', a => a.setAlias(SITE)], ['fixture_alias_clear', a => a.clear(SITE)], ['fulfillment_retry', a => a.retry(EVENT)],
  ]
  for (const [phase, call] of direct) {
    const access = createProviderAccess(providerEnv, config('prepare'), async () => new Response(PRIVATE, { status: 503 }))
    await assert.rejects(call(access), error => checkDiagnostic(error, { phase, status: 503, category: 'server_error' }, phase === 'fulfillment_retry' ? 'retry_dispatch_unconfirmed' : 'provider_http'))
  }
  const guards = [['runtime_status', '/api/integrations/status'], ['release_marker', '/__dailyclarity_release.json'], ['platform_config', '/api/platform/config'], ['current_main', '/branches/main'], ['staging_site', `/sites/${TARGET.siteId}`]]
  for (const [phase, suffix] of guards) {
    const access = createProviderAccess(providerEnv, config('prepare'), async url => new Response(url.endsWith(suffix) ? PRIVATE : '{}', { status: url.endsWith(suffix) ? 503 : 200 }))
    await assert.rejects(access.guard(), error => checkDiagnostic(error, { phase, status: 503, category: 'server_error' }))
  }
  const tables = [['checkout_intent', 'checkout_intents'], ['slug_reservation', 'site_slugs'], ['checkout_order', 'orders'], ['checkout_portal', 'portal_sites'], ['checkout_event', 'stripe_webhook_events']]
  for (const [phase, table] of tables) {
    const access = createProviderAccess(providerEnv, config('prepare'), async url => {
      const pathname = new URL(url).pathname
      if (pathname.endsWith(`/${table}`)) return new Response(PRIVATE, { status: 403 })
      return new Response(JSON.stringify(pathname.endsWith('/checkout_intents') ? pending().intents : []))
    })
    await assert.rejects(access.snapshot(null), error => checkDiagnostic(error, { phase, status: 403, category: 'forbidden' }))
  }
})

test('optional lookup 404 remains absence and retry requires exactly 202 without parsing a body', async () => {
  let reads = 0
  const missing = createProviderAccess(providerEnv, config('prepare'), async () => ({ status: 404, ok: false, text() { reads++; throw Error(PRIVATE) } }))
  assert.equal(await missing.lookup(), null); assert.equal(reads, 0)
  for (const status of [200, 202, 204]) {
    const access = createProviderAccess(providerEnv, config('prepare'), async () => ({ status, text() { reads++; throw Error(PRIVATE) } }))
    if (status === 202) await access.retry(EVENT)
    else await assert.rejects(access.retry(EVENT), error => checkDiagnostic(error, { phase: 'fulfillment_retry', status, category: 'unexpected_status' }, 'retry_dispatch_unconfirmed'))
  }
  assert.equal(reads, 0)
})

test('diagnosed HTTP failures after alias checkpoint never retry or save a prepared journal', async () => {
  for (const boundary of ['patch', 'readback', 'guard', 'snapshot']) {
    const h = harness('prepare'), originalPatch = h.deps.setAlias, originalRead = h.deps.site
    let patches = 0, reads = 0, guards = 0, snapshots = 0
    const access = createProviderAccess(providerEnv, config('prepare'), async url => {
      if (boundary === 'snapshot' && new URL(url).pathname.endsWith('/checkout_intents')) return new Response(JSON.stringify(pending().intents))
      return new Response(PRIVATE, { status: 403 })
    })
    h.deps.setAlias = async id => { patches++; return boundary === 'patch' ? access.setAlias(id) : originalPatch(id) }
    h.deps.site = async id => ++reads === 3 && boundary === 'readback' ? access.site(id) : originalRead(id)
    h.deps.guard = async () => { if (++guards === 4 && boundary === 'guard') await access.guard() }
    h.deps.snapshot = async () => ++snapshots === 4 && boundary === 'snapshot' ? access.snapshot(null) : pending()
    await assert.rejects(orchestrate(config('prepare'), h.deps), error => {
      assert.equal(safeFailureCode(error), 'provider_http')
      assert(safeProviderDiagnostic(error)); assert(!safeFailureMessage(error).includes(PRIVATE)); return true
    })
    assert.equal(patches, 1); assert(h.files.has('alias-requested.json')); assert(!h.files.has('recovery-journal.json'))
    assert.equal(h.files.get('alias-requested.json').prepared, false)
  }
})

test('alias422 classifier recognizes only exact documented messages and retains no provider body', async () => {
  const ownership = 'domain_aliases is owned by another account'
  const cases = [
    [{ message: ownership }, 'provider_reported_alias_ownership'],
    [{ code: 422, message: ownership }, 'provider_reported_alias_ownership'],
    [{ errors: { domain_aliases: ['has invalid characters'] } }, 'provider_reported_alias_characters'],
    [{ message: ownership + PRIVATE }, 'unrecognized'],
    [{ message: ownership, secret: PRIVATE }, 'unrecognized'],
    [{ code: PRIVATE, message: ownership }, 'unrecognized'],
    [{ errors: { domain_aliases: ['has invalid characters', PRIVATE] } }, 'unrecognized'],
    [{ errors: { domain_aliases: ['has invalid characters'], other: PRIVATE } }, 'unrecognized'],
    [{ errors: { domain_aliases: ['is owned by another account'] } }, 'unrecognized'],
    [{ errors: { domain_aliases: 'has invalid characters' } }, 'unrecognized'],
    [{ message: 'set a primary domain first' }, 'unrecognized'],
    [{ message: 'billing overdue' }, 'unrecognized'],
  ]
  for (const [body, providerCategory] of cases) for (const operation of ['setAlias', 'clear']) {
    let requests = 0
    const access = createProviderAccess(providerEnv, config('prepare'), async () => { requests++; return new Response(JSON.stringify(body), { status: 422 }) })
    await assert.rejects(access[operation](SITE), error => {
      checkDiagnostic(error, { phase: operation === 'setAlias' ? 'fixture_alias_update' : 'fixture_alias_clear', status: 422, category: 'unprocessable_content', providerCategory })
      assert(!safeFailureMessage(error).includes(ownership)); assert(!safeFailureMessage(error).includes('has invalid characters')); return true
    })
    assert.equal(requests, 1)
  }
  // This optional body recognition never applies to other requests or statuses.
  for (const [status, call, phase] of [[422, a => a.site(SITE), 'fixture_readback'], [403, a => a.setAlias(SITE), 'fixture_alias_update']]) {
    const access = createProviderAccess(providerEnv, config('prepare'), async () => ({ ok: false, status, get body() { throw Error('body must remain unread') } }))
    await assert.rejects(call(access), error => checkDiagnostic(error, { phase, status, category: status === 422 ? 'unprocessable_content' : 'forbidden' }))
  }
})

test('bounded alias error reads preserve original HTTP failure on malformed, oversized or stalled streams', async () => {
  const cases = [
    () => new Response(PRIVATE, { status: 422 }),
    () => new Response(new Uint8Array([255, 254]), { status: 422 }),
    () => new Response(new ReadableStream({ start(controller) { controller.error(Error(PRIVATE)) } }), { status: 422 }),
    () => new Response(new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(4097)) } }), { status: 422 }),
    () => new Response(new ReadableStream({ start() {}, cancel() { return new Promise(() => {}) } }), { status: 422 }),
  ]
  for (const response of cases) {
    const h = harness('prepare'); let patches = 0
    const access = createProviderAccess(providerEnv, config('prepare'), async () => { patches++; return response() })
    h.deps.setAlias = id => access.setAlias(id)
    await assert.rejects(orchestrate(config('prepare'), h.deps), error => checkDiagnostic(error, { phase: 'fixture_alias_update', status: 422, category: 'unprocessable_content', providerCategory: 'unrecognized' }))
    assert.equal(patches, 1); assert(h.files.has('alias-requested.json')); assert(!h.files.has('recovery-journal.json'))
  }
  let pulls = 0, canceled = false
  const access = createProviderAccess(providerEnv, config('prepare'), async () => new Response(new ReadableStream({
    pull(controller) { pulls++; controller.enqueue(new Uint8Array(2048)) }, cancel() { canceled = true },
  }, { highWaterMark: 0 }), { status: 422 }))
  await assert.rejects(access.setAlias(SITE), error => checkDiagnostic(error, { phase: 'fixture_alias_update', status: 422, category: 'unprocessable_content', providerCategory: 'unrecognized' }))
  assert.equal(pulls, 3); assert.equal(canceled, true)
})
