import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { TARGET, digest, taskSlug, faultAlias, configuration, assertRuntime, assertPending, assertFailed, assertFixtureSite, validateJournal, assertArtifactSource, observation, orchestrate, createProviderAccess } from './staging-recovery-proof.mjs'

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
  const calls = [], files = new Map(); let site = fixture(operation === 'retry' || savedJournal.phase === 'cleared' ? [] : [faultAlias(binding)])
  return { calls, files, deps: { now: () => NOW, guard: async () => calls.push('guard'), snapshot: async () => structuredClone(state), lookup: async () => null, create: async body => { calls.push(['create', body]); return site }, site: async () => site, clear: async id => { calls.push(['clear', id]); site = fixture([]) }, retry: async id => calls.push(['retry', id]), loadJournal: async () => savedJournal, save: async (name, value) => { assert(!files.has(name)); files.set(name, structuredClone(value)); calls.push(['save', name]) } } }
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
test('prepare creates alias atomically only after 404 and independent readback', async () => {
  const h = harness('prepare'); const result = await orchestrate(config('prepare'), h.deps)
  assert.equal(result.prepared, true); assert.equal(result.paymentAttempted, false)
  assert.deepEqual(h.calls.find(c => Array.isArray(c) && c[0] === 'create')[1], { name: `platform-${taskSlug(binding)}`, domain_aliases: [faultAlias(binding)] })
  const text = JSON.stringify([...h.files]); assert(!text.includes(SESSION)); assert(!text.includes('private@example'))
  assert(h.files.has('fixture-created.json')); assert(h.files.has('recovery-journal.json'))
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
  await access.snapshot(null); await access.create({ name: `platform-${taskSlug(binding)}`, domain_aliases: [faultAlias(binding)] }); await access.clear(SITE); await access.retry(EVENT)
  for (const request of requests) { assert.equal(request.init.redirect, 'error'); if (request.url.includes('.supabase.co')) { assert.equal(request.init.method, 'GET'); assert(!new URL(request.url).searchParams.get('select').split(',').includes('payload')) } }
  const mutations = requests.filter(r => r.init.method && r.init.method !== 'GET')
  assert.deepEqual(mutations.map(r => r.init.method), ['POST', 'PATCH', 'POST'])
  assert.deepEqual(JSON.parse(mutations[1].init.body), { domain_aliases: [] }); assert.equal(mutations[2].url, `https://${TARGET.hostname}/api/admin/stripe/fulfillment/retry`)
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
