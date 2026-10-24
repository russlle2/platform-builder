import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { TARGET, FAULT, BASELINE_FILES, BASELINE_MANIFEST, digest, taskSlug, configuration, assertFixtureSite, assertDeploy, assertFailed, validateJournal, validateControlBundle, assertArtifactSource, observation, orchestrate, createProviderAccess, safeFailureMessage } from './staging-publication-recovery.mjs'

const SHA = 'a'.repeat(40), NOW = Date.parse('2026-10-24T12:00:00.000Z'), CREATED = '2026-10-24T11:55:00.000Z'
const SESSION = 'cs_test_example123', EVENT = 'evt_example123', SUB = 'sub_example123', INTENT = '11111111-1111-4111-8111-111111111111', SITE = '22222222-2222-4222-8222-222222222222', ORDER = '33333333-3333-4333-8333-333333333333', DEPLOY = '1'.repeat(24), NEXT = '2'.repeat(24)
const binding = { releaseSha: SHA, certificationHash: 'b'.repeat(64), stagingJournalHash: 'c'.repeat(64), catalogHash: 'd'.repeat(64), manifestHash: 'e'.repeat(64), nonce: '1234567890abcdef12345678', intentId: INTENT, sessionHash: digest(SESSION) }
const source = { runId: '42', runAttempt: '1', releaseSha: SHA }
const env = () => ({ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: TARGET.repository, GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: `${TARGET.repository}/${TARGET.workflow}@refs/heads/main`, GITHUB_SHA: SHA, GITHUB_WORKFLOW_SHA: SHA, GITHUB_RUN_ID: '42', GITHUB_RUN_ATTEMPT: '1', DEPLOY_ENVIRONMENT: 'staging', NETLIFY_SITE_ID: TARGET.siteId, NETLIFY_EXPECTED_SITE_ID: TARGET.siteId, NETLIFY_EXPECTED_SITE_HOSTNAME: TARGET.hostname, NETLIFY_EXPECTED_ACCOUNT_SLUG: TARGET.accountSlug, STAGING_SUPABASE_PROJECT_REF: TARGET.projectRef, STAGING_SUPABASE_URL: `https://${TARGET.projectRef}.supabase.co`, OPERATION: 'prepare', CONFIRMATION: 'PREPARE OWNED PUBLICATION FAULT', BINDING_JSON: JSON.stringify(binding), RUNNER_TEMP: '/tmp/publication-test' })
const config = operation => ({ operation, binding, source, eventId: operation === 'prepare' ? undefined : EVENT })
const fixture = () => ({ id: SITE, account_id: TARGET.accountId, account_slug: TARGET.accountSlug, name: `platform-${taskSlug(binding)}`, default_domain: `platform-${taskSlug(binding)}.netlify.app`, custom_domain: null, domain_aliases: [], url: `http://platform-${taskSlug(binding)}.netlify.app`, ssl_url: `https://platform-${taskSlug(binding)}.netlify.app`, created_at: new Date(NOW).toISOString(), published_deploy: null, build_settings: {} })
const deploy = (locked = false, id = DEPLOY) => ({ id, site_id: SITE, title: `dc-recovery-${binding.nonce}-${SHA.slice(0, 12)}`, context: 'production', draft: false, state: 'ready', locked, required: Object.values(BASELINE_MANIFEST) })
const pending = () => ({ intents: [{ id: INTENT, slug: taskSlug(binding), plan: 'basic', status: 'session_created', stripe_session_id: SESSION, created_at: CREATED, catalog_revision: { contractVersion: 3, catalogHash: binding.catalogHash, manifestHash: binding.manifestHash } }], reservations: [{ slug: taskSlug(binding), reserved_for: INTENT, status: 'checkout_pending', reservation_expires_at: '2026-10-24T12:55:00.000Z', netlify_site_id: null, site_url: null, custom_domain: null }], orders: [], portals: [], events: [] })
const journal = () => ({ version: 2, kind: 'staging-owned-publication-recovery', binding, source, createdAt: '2026-10-24T11:58:00.000Z', preparedAt: '2026-10-24T11:58:02.000Z', siteId: SITE, sessionHash: digest(SESSION), baseline: { deploymentId: DEPLOY, filesHash: digest(BASELINE_MANIFEST), bodyHash: digest(BASELINE_FILES['/404.html']), lockedAt: '2026-10-24T11:58:01.000Z' }, phase: 'prepared', failure: null, clearedAt: null })
const failed = () => {
  const s = pending(); s.intents[0].status = 'fulfillment_failed'; s.reservations[0].status = 'reserved'; s.reservations[0].reservation_expires_at = null
  s.orders = [{ id: ORDER, slug: taskSlug(binding), stripe_session_id: SESSION, stripe_subscription_id: SUB, status: 'active', amount_cents: 2999, currency: 'usd', first_payment_amount_cents: 2999, first_payment_received_at: '2026-10-24T11:59:00.000Z' }]
  s.portals = [{ slug: taskSlug(binding), status: 'provisioning_failed', checkout_intent_id: INTENT, stripe_session_id: SESSION, provisioning_error: FAULT, provisioning_succeeded: false, netlify_site_id: SITE }]
  s.events = [{ event_id: EVENT, payload_event_id: EVENT, payload_event_type: 'checkout.session.completed', payload_livemode: false, payload_created: Date.parse('2026-10-24T11:59:00.000Z') / 1000, event_type: 'checkout.session.completed', livemode: false, status: 'failed', last_error: FAULT, attempts: 2, created_at: '2026-10-24T11:59:00.000Z', session_id: SESSION, checkout_intent_id: INTENT, slug: taskSlug(binding), checkout_type: 'template_subscription', payment_status: 'paid', amount_total: 2999, subscription_id: SUB, business_key: `subscription:${SUB}` }]
  return s
}
const clearedJournal = () => ({ ...journal(), phase: 'cleared', failure: assertFailed(failed(), binding, journal(), EVENT, NOW), clearedAt: new Date(NOW).toISOString() })
const recovered = () => {
  const s = failed(); s.intents[0].status = 'completed'; s.reservations[0].status = 'provisioned'; s.reservations[0].netlify_site_id = SITE
  s.portals[0] = { ...s.portals[0], status: 'active', provisioning_error: null, provisioning_succeeded: true }
  s.events[0] = { event_id: EVENT, event_type: 'checkout.session.completed', livemode: false, status: 'succeeded', business_key: `subscription:${SUB}`, created_at: '2026-10-24T11:59:00.000Z' }
  return s
}
function harness(operation = 'prepare', state = pending(), savedJournal = journal()) {
  const calls = [], files = new Map(), site = fixture(), deployments = new Map([[DEPLOY, deploy(operation !== 'prepare' && savedJournal.phase !== 'cleared')]])
  if (operation !== 'prepare') site.published_deploy = { id: DEPLOY }
  const deps = {
    now: () => NOW, guard: async () => calls.push('guard'),
    snapshot: async () => { calls.push('snapshot'); return structuredClone(state) }, lookup: async () => null,
    create: async () => { calls.push('create'); return structuredClone(site) },
    site: async id => { assert.equal(id, SITE); calls.push('site'); return structuredClone(site) },
    createBaseline: async id => { assert.equal(id, SITE); calls.push('createBaseline'); return structuredClone(deployments.get(DEPLOY)) },
    deploy: async id => { calls.push('deploy'); return structuredClone(deployments.get(id)) },
    upload: async (id, hash) => { assert.equal(id, DEPLOY); assert(Object.values(BASELINE_MANIFEST).includes(hash)); calls.push('upload') },
    waitReady: async () => { calls.push('waitReady'); site.published_deploy = { id: DEPLOY } },
    baselineHttp: async () => calls.push('baselineHttp'),
    lock: async id => { assert.equal(id, DEPLOY); calls.push('lock'); deployments.get(id).locked = true },
    unlock: async id => { assert.equal(id, DEPLOY); calls.push('unlock'); deployments.get(id).locked = false },
    waitLock: async (siteId, id, locked) => { assert.equal(siteId, SITE); assert.equal(deployments.get(id).locked, locked); calls.push('waitLock') },
    retry: async id => { assert.equal(id, EVENT); calls.push('retry') }, loadJournal: async () => structuredClone(savedJournal),
    save: async (name, value) => { assert(!files.has(name)); files.set(name, structuredClone(value)); calls.push(`save:${name}`) },
  }
  return { calls, files, deps, site, deployments }
}
test('V2 pins separate protected workflow and fixed staging target without accepting V1 phrase', () => {
  assert.equal(configuration(env()).binding.sessionHash, digest(SESSION))
  for (const patch of [{ GITHUB_REF: 'refs/heads/other' }, { GITHUB_SHA: 'f'.repeat(40) }, { GITHUB_WORKFLOW_REF: `${TARGET.repository}/.github/workflows/staging-recovery-proof.yml@refs/heads/main` }, { GITHUB_WORKFLOW_SHA: 'f'.repeat(40) }, { STAGING_SUPABASE_PROJECT_REF: 'production' }, { CONFIRMATION: 'PREPARE OWNED RECOVERY FAULT' }, { BINDING_JSON: JSON.stringify({ ...binding, uploadUrl: 'https://other.example' }) }]) assert.throws(() => configuration({ ...env(), ...patch }))
})
test('all phases reject a foreign domain, repo, account, protected site or deployment', () => {
  assertFixtureSite(fixture(), binding, { siteId: SITE })
  for (const patch of [{ id: TARGET.siteId }, { id: TARGET.productionSiteId }, { account_id: 'other' }, { custom_domain: 'customer.example' }, { domain_aliases: ['customer.example'] }, { build_settings: { repo_url: 'https://github.com/other' } }]) assert.throws(() => assertFixtureSite({ ...fixture(), ...patch }, binding))
  for (const patch of [{ site_id: TARGET.siteId }, { id: NEXT }, { state: 'error' }, { context: 'branch-deploy' }, { locked: undefined }, { title: 'other' }, { draft: true }]) assert.throws(() => assertDeploy({ ...deploy(), ...patch }, SITE, DEPLOY, { baseline: true, binding }))
})
test('prepare checkpoints every mutation and independently observes published locked404 before payment eligibility', async () => {
  const h = harness(); const result = await orchestrate(config('prepare'), h.deps)
  assert.equal(result.prepared, true); assert.equal(result.paymentAttempted, false)
  for (const [before, after] of [['save:creation-requested.json', 'create'], ['save:deploy-requested.json', 'createBaseline'], ['save:upload-requested.json', 'upload'], ['save:lock-requested.json', 'lock'], ['lock', 'waitLock']]) assert(h.calls.indexOf(before) < h.calls.indexOf(after))
  assert(h.calls.lastIndexOf('baselineHttp') > h.calls.indexOf('lock'))
  assert(h.calls.lastIndexOf('site') > h.calls.indexOf('lock'))
  const saved = h.files.get('recovery-journal.json'), c = { ...config('prepare'), journalHash: digest(saved) }
  assert.equal(validateControlBundle(h.files, c, source).siteId, SITE)
})
test('uncertain create/deploy/upload/lock and ignored lock never produce prepared evidence', async () => {
  for (const method of ['create', 'createBaseline', 'upload', 'lock']) {
    const h = harness(), original = h.deps[method]
    h.deps[method] = async (...args) => { await original(...args); throw new Error('PRIVATE PROVIDER RESPONSE') }
    await assert.rejects(orchestrate(config('prepare'), h.deps)); assert(!h.files.has('recovery-journal.json'))
    assert(h.files.has(({ create: 'creation-requested.json', createBaseline: 'deploy-requested.json', upload: 'upload-requested.json', lock: 'lock-requested.json' })[method]))
  }
  const h = harness(); h.deps.lock = async () => {}; await assert.rejects(orchestrate(config('prepare'), h.deps)); assert(!h.files.has('recovery-journal.json'))
})
test('preexisting fixture and changed pending checkout refuse creation', async () => {
  const h = harness(); h.deps.lookup = async () => fixture(); await assert.rejects(orchestrate(config('prepare'), h.deps)); assert(!h.calls.includes('create'))
  const changed = harness(); let calls = 0
  changed.deps.snapshot = async () => { const s = pending(); if (++calls > 1) s.intents[0].status = 'completed'; return s }
  await assert.rejects(orchestrate(config('prepare'), changed.deps)); assert(!changed.calls.includes('create'))
})
test('unknown upload digest, foreign deployment and publication changes refuse lock', async () => {
  for (const patch of [{ required: ['f'.repeat(40)] }, { site_id: ORDER }, { required_functions: ['server'] }]) {
    const h = harness(); h.deps.createBaseline = async () => ({ ...deploy(), ...patch }); await assert.rejects(orchestrate(config('prepare'), h.deps)); assert(!h.calls.includes('upload')); assert(!h.calls.includes('lock'))
  }
  const h = harness(); h.deployments.set(NEXT, deploy(false, NEXT)); h.deps.waitReady = async () => { h.site.published_deploy = { id: NEXT } }
  await assert.rejects(orchestrate(config('prepare'), h.deps)); assert(!h.calls.includes('lock'))
})
test('a returned owned deployment identity survives failed metadata validation for read-only reconciliation', async () => {
  for (const patch of [{ title: 'ignored-title' }, { locked: undefined }, { context: 'unknown' }, { site_id: ORDER }]) {
    const h = harness(); h.deps.createBaseline = async () => ({ ...deploy(), ...patch })
    await assert.rejects(orchestrate(config('prepare'), h.deps))
    assert.equal(h.files.get('deploy-created.json').deploymentId, DEPLOY)
    assert(!h.calls.includes('upload')); assert(!h.calls.includes('lock')); assert(!h.files.has('recovery-journal.json'))
  }
})
test('prepare rechecks404 after locking and refuses a changed HTTP response', async () => {
  const h = harness(); let count = 0
  h.deps.baselineHttp = async () => { if (++count > 1) throw new Error('now200') }
  await assert.rejects(orchestrate(config('prepare'), h.deps)); assert(h.calls.includes('lock')); assert(!h.files.has('recovery-journal.json'))
})
test('genuine failure requires signed-test binding, exact404 error and persisted fixture identity', () => {
  assert.equal(assertFailed(failed(), binding, journal(), EVENT, NOW).orderIdHash, digest(ORDER))
  for (const mutate of [s => s.events[0].livemode = true, s => s.events[0].payload_livemode = true, s => s.events[0].payment_status = 'unpaid', s => s.events[0].amount_total = 0, s => s.events[0].last_error = 'TLS error', s => s.events[0].payload_created = 0, s => s.events[0].status = 'processing', s => s.portals[0].netlify_site_id = null, s => s.portals[0].netlify_site_id = ORDER, s => s.reservations[0].netlify_site_id = SITE, s => s.orders.push(s.orders[0])]) { const s = failed(); mutate(s); assert.throws(() => assertFailed(s, binding, journal(), EVENT, NOW)) }
})
test('clear captures actual failure before unlocking, then reports dispatch facts only', async () => {
  const h = harness('clear', failed()); const result = await orchestrate(config('clear'), h.deps)
  assert.equal(result.cleared, true); assert.equal(result.recoveryObserved, false)
  assert(h.calls.indexOf('save:recovery-journal.json') < h.calls.indexOf('unlock'))
  const saved = h.files.get('cleared-journal.json')
  assert.equal(validateControlBundle(h.files, { ...config('clear'), journalHash: digest(saved) }, source).phase, 'cleared')
})
test('uncertain unlock preserves source-bound requested journal and reconciles without another write', async () => {
  const h = harness('clear', failed()), unlock = h.deps.unlock
  h.deps.unlock = async id => { await unlock(id); throw new Error('timeout after applied') }
  await assert.rejects(orchestrate(config('clear'), h.deps))
  assert(!h.files.has('cleared-journal.json')); const requested = h.files.get('recovery-journal.json'); assert.equal(requested.phase, 'clear_requested')
  const next = harness('clear', recovered(), requested); next.deployments.get(DEPLOY).locked = false; next.deployments.set(NEXT, deploy(false, NEXT)); next.site.published_deploy = { id: NEXT }
  const result = await orchestrate(config('clear'), next.deps)
  assert.equal(result.resumedWithoutProviderWrite, true); assert(!next.calls.includes('unlock')); assert.equal(result.recoveryObserved, false)
})
test('clear refuses changed publication, foreign fixture and uncaptured external unlock', async () => {
  for (const mutate of [h => { h.deployments.set(NEXT, deploy(true, NEXT)); h.site.published_deploy = { id: NEXT } }, h => { h.site.domain_aliases = ['foreign.example'] }, h => { h.deployments.get(DEPLOY).locked = false }]) {
    const h = harness('clear', failed()); mutate(h); await assert.rejects(orchestrate(config('clear'), h.deps)); assert(!h.calls.includes('unlock'))
  }
})
test('clear rechecks failure immediately before writing and retains no unlock on processing race', async () => {
  const h = harness('clear', failed()); let count = 0
  h.deps.snapshot = async () => { const s = failed(); if (++count > 1) s.events[0].status = 'processing'; return s }
  await assert.rejects(orchestrate(config('clear'), h.deps)); assert(!h.calls.includes('unlock'))
})
test('inspect requires original order/site and changed ready unlocked publication after real recovery', async () => {
  const h = harness('inspect', recovered(), clearedJournal()); h.deployments.set(NEXT, deploy(false, NEXT)); h.site.published_deploy = { id: NEXT }
  assert.equal((await orchestrate(config('inspect'), h.deps)).recoveryObserved, true)
  const same = harness('inspect', recovered(), clearedJournal()); assert.equal((await orchestrate(config('inspect'), same.deps)).recoveryObserved, false)
  for (const mutate of [s => s.orders.push(s.orders[0]), s => s.portals[0].netlify_site_id = ORDER, s => s.events[0].event_id = 'evt_different123', s => s.reservations[0].status = 'reserved']) {
    const s = recovered(); mutate(s); assert.equal(observation(s, binding, clearedJournal(), EVENT, NOW).recoveryObserved, false)
  }
})
test('retry requires a cleared source, stopped exact event, and fresh identity recheck', async () => {
  const h = harness('retry', failed(), clearedJournal()); assert.equal((await orchestrate(config('retry'), h.deps)).retryDispatched, true); assert(h.calls.includes('retry'))
  const notCleared = harness('retry', failed()); await assert.rejects(orchestrate(config('retry'), notCleared.deps)); assert(!notCleared.calls.includes('retry'))
  const changed = harness('retry', failed(), clearedJournal()); let count = 0
  changed.deps.snapshot = async () => { const s = failed(); if (++count > 1) s.events[0].status = 'processing'; return s }
  await assert.rejects(orchestrate(config('retry'), changed.deps)); assert(!changed.calls.includes('retry'))
})
test('journal loader refuses V1, changed baseline, partial checkpoint and foreign source', () => {
  const j = journal(), c = { ...config('clear'), journalHash: digest(j) }; validateJournal(j, c, source)
  for (const patch of [{ version: 1 }, { kind: 'staging-owned-alias-recovery' }, { siteId: TARGET.productionSiteId }, { source: { ...source, runId: '99' } }, { baseline: { ...j.baseline, filesHash: 'f'.repeat(64) } }]) { const modified = { ...j, ...patch }; assert.throws(() => validateJournal(modified, { ...c, journalHash: digest(modified) }, source)) }
  assert.throws(() => validateControlBundle(new Map([['lock-requested.json', {}]]), c, source))
  assert.throws(() => validateControlBundle(new Map([['recovery-journal.json', j], ['arbitrary.json', {}]]), c, source))
})
test('artifact producer must be exact separate workflow, commit, completed attempt and immutable artifact', () => {
  const e = { SOURCE_RUN_ID: '42', SOURCE_ARTIFACT_ID: '99' }, run = { id: 42, run_attempt: 1, repository: { full_name: TARGET.repository }, path: TARGET.workflow, head_branch: 'main', head_sha: SHA, event: 'workflow_dispatch', status: 'completed', conclusion: 'success' }, artifact = { id: 99, expired: false, name: 'staging-publication-journal-42-1', workflow_run: { id: 42, head_sha: SHA }, size_in_bytes: 2000 }
  assert.deepEqual(assertArtifactSource(run, artifact, config('clear'), e), source)
  for (const patch of [{ path: ORIGINAL_WORKFLOW }, { head_sha: 'f'.repeat(40) }, { head_branch: 'other' }, { run_attempt: 2 }]) assert.throws(() => assertArtifactSource({ ...run, ...patch }, artifact, config('clear'), e))
})
const ORIGINAL_WORKFLOW = '.github/workflows/staging-recovery-proof.yml'
const providerEnv = { NETLIFY_AUTH_TOKEN: 'PRIVATE_TOKEN', STAGING_SUPABASE_SERVICE_ROLE_KEY: 'PRIVATE_DB', INTERNAL_ADMIN_TOKEN: 'PRIVATE_ADMIN' }
test('provider adapter permits only fixed bytes and fixture operations without alias/DNS/delete methods', async () => {
  const calls = [], access = createProviderAccess(providerEnv, config('prepare'), async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(deploy()), { status: 200 }) })
  await access.createBaseline(SITE); await access.upload(DEPLOY, BASELINE_MANIFEST['/404.html'])
  assert.deepEqual(JSON.parse(calls[0].init.body), { files: BASELINE_MANIFEST })
  assert.equal(calls[0].url, `https://api.netlify.com/api/v1/sites/${SITE}/deploys?title=dc-recovery-${binding.nonce}-${SHA.slice(0, 12)}`)
  assert.equal(calls[1].init.body, BASELINE_FILES['/404.html']); assert.equal(calls[1].url, `https://api.netlify.com/api/v1/deploys/${DEPLOY}/files/404.html`)
  await assert.rejects(access.upload(DEPLOY, 'f'.repeat(40))); assert.equal(calls.length, 2)
  assert.equal(access.setAlias, undefined); assert.equal(access.clear, undefined); assert.equal(access.delete, undefined); assert.equal(access.restore, undefined)
  assert.throws(() => access.createBaseline(TARGET.productionSiteId)); assert.throws(() => access.createBaseline(TARGET.siteId))
})
test('lock and unlock accept empty202 only as request acceptance; independent GET observes state', async () => {
  const calls = [], access = createProviderAccess(providerEnv, config('prepare'), async (url, init) => { calls.push({ url, init }); return init.method === 'POST' ? new Response(null, { status: 202 }) : new Response(JSON.stringify(deploy(true))) })
  await access.lock(DEPLOY); await access.unlock(DEPLOY); const actual = await access.waitLock(SITE, DEPLOY, true)
  assert.equal(actual.locked, true); assert.equal(calls.length, 3); assert(calls.every(call => call.init.redirect === 'error'))
})
test('polling has an elapsed-time budget even when a provider response is slow', async () => {
  const originalNow = Date.now; let now = NOW, calls = 0
  Date.now = () => now
  try {
    const access = createProviderAccess(providerEnv, config('prepare'), async () => { calls++; now += 91_000; return new Response(JSON.stringify({ ...deploy(false), state: 'uploading' })) })
    await assert.rejects(access.waitReady(SITE, DEPLOY))
    assert.equal(calls, 1)
  } finally { Date.now = originalNow }
})
test('public404 probe requires exact fixed body/noindex, with no provider authorization header', async () => {
  for (const [status, body, robots, passes] of [[404, BASELINE_FILES['/404.html'], 'noindex, nofollow', true], [200, BASELINE_FILES['/404.html'], 'noindex', false], [404, 'other', 'noindex', false], [404, BASELINE_FILES['/404.html'], '', false]]) {
    const access = createProviderAccess(providerEnv, config('prepare'), async (url, init) => { assert.equal(url, `https://platform-${taskSlug(binding)}.netlify.app/?__dc_fixture=${binding.nonce}`); assert.equal(init.headers.authorization, undefined); return new Response(body, { status, headers: { 'x-robots-tag': robots } }) })
    if (passes) await access.baselineHttp(); else await assert.rejects(access.baselineHttp())
  }
})
test('safe failures do not include provider exceptions, response body or credentials', async () => {
  const privateText = 'PRIVATE_TOKEN PRIVATE_DB private@example.invalid', access = createProviderAccess(providerEnv, config('prepare'), async () => { throw new Error(privateText) })
  await assert.rejects(access.lock(DEPLOY), error => { assert(!safeFailureMessage(error).includes(privateText)); assert(!safeFailureMessage(error).includes('PRIVATE_')); return true })
  assert(!safeFailureMessage(new Error(privateText)).includes(privateText))
})
test('real runtime verification rejects fixed404 and uses published hostname rather than deploy URL', async () => {
  const source = await readFile(new URL('../src/lib/netlify.ts', import.meta.url), 'utf8'), start = source.indexOf('export async function verifyPublishedSite('), end = source.indexOf('\n/**', start)
  const code = stripTypeScriptTypes(source.slice(start, end).replace('export async function', 'async function'))
  const urls = [], verify = new Function('fetch', 'ensureBrandedCertificate', `${code}; return verifyPublishedSite`)(async url => { urls.push(String(url)); return new Response(BASELINE_FILES['/404.html'], { status: 404 }) }, async () => {})
  await assert.rejects(verify('https://platform-fixture.netlify.app', { attempts: 1, delayMs: 0, cacheKey: DEPLOY }), /HTTP 404/)
  assert.equal(new URL(urls[0]).hostname, 'platform-fixture.netlify.app')
  const worker = await readFile(new URL('../src/lib/stripe-fulfillment-worker.ts', import.meta.url), 'utf8')
  assert.match(worker, /await verifyPublishedSite\(netlifySiteUrl, \{ cacheKey: deploy\.deployId, netlifySiteId \}\)/)
})
test('separate workflow retains staging protection, serialization, exact journal input and always retention', async () => {
  const workflow = await readFile(new URL('../../../.github/workflows/staging-publication-recovery.yml', import.meta.url), 'utf8')
  assert.match(workflow, /environment: staging/); assert.match(workflow, /group: dailyclarity-staging/); assert.match(workflow, /cancel-in-progress: false/); assert.match(workflow, /if: \$\{\{ always\(\) \}\}/)
  assert.match(workflow, /staging-publication-recovery\.test\.mjs/); assert.match(workflow, /artifact-ids: \$\{\{ inputs\.source_artifact_id \}\}/)
})
