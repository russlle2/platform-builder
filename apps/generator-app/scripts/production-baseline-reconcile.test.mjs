import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { RECONCILIATION as r, reconciliationConfiguration, captureProduction, assertBaselineDocuments,
  assertBaselineMarker, assertOwnedBaseline, reconcileProduction, createReconciliationHttp } from './production-baseline-reconcile.mjs'

const sha = '1'.repeat(40)
const config = { operation: 'restore', controllerSha: sha, producer: { runId: '123', runAttempt: '1' } }
const env = () => ({ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: r.repository, GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_WORKFLOW_REF: `${r.repository}/${r.workflow}@refs/heads/main`, GITHUB_SHA: sha, GITHUB_WORKFLOW_SHA: sha, EXPECTED_RELEASE_SHA: sha,
  DEPLOY_ENVIRONMENT: 'production', NETLIFY_SITE_ID: r.siteId, NETLIFY_EXPECTED_SITE_ID: r.siteId, NETLIFY_EXPECTED_SITE_HOSTNAME: r.hostname,
  NETLIFY_EXPECTED_ACCOUNT_SLUG: r.accountSlug, OPERATION: 'restore', CONFIRMATION: 'RESTORE CERTIFIED BASELINE', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' })
const deployment = () => ({ id: r.currentDeploymentId, site_id: r.siteId, state: 'ready', context: 'production', commit_ref: r.currentCommit, locked: null })
const site = () => ({ id: r.siteId, account_id: r.accountId, account_slug: r.accountSlug, custom_domain: r.hostname, force_ssl: true,
  build_settings: { stop_builds: false, repo_path: r.repository, env: { PRIVATE_TOKEN: 'must-not-appear' } }, published_deploy: { id: r.currentDeploymentId } })
const baseline = () => ({ ...deployment(), id: r.baselineDeploymentId, commit_ref: null, deploy_ssl_url: r.baselineOrigin })
const marker = () => ({ version: 1, releaseSha: r.baselineCommit, certificationHash: r.certificationHash })

function fixture() {
  const state = captureProduction(site(), deployment())
  const saved = [], writes = [], events = []
  const f = { state, saved, writes, events, before: () => {} }
  const invoke = async name => { events.push(name); await f.before(name) }
  const write = async (name, update) => {
    assert.equal(saved.at(-1).phase, `${name}-requested`, 'Durable intent must precede each provider write')
    writes.push(name); await invoke(name); update()
  }
  f.a = {
    now: () => '2026-11-01T04:00:00.000Z',
    save: async journal => { await invoke('save'); saved.push(structuredClone(journal)) },
    controllerGate: async () => invoke('controller'),
    capture: async () => { await invoke('capture'); return structuredClone(state) },
    catalogue: async () => { await invoke('catalogue'); return { pointerHash: r.pointerHash, certificationHash: r.certificationHash } },
    verifyBaseline: async () => { await invoke('baseline'); return { deploymentId: r.baselineDeploymentId } },
    verifyPublic: async () => { await invoke('public'); return { checkoutReady: true } },
    stopBuilds: () => write('stop-builds', () => { state.stopBuilds = true }),
    lock: id => { assert.equal(id, r.currentDeploymentId); return write('lock-current', () => { state.locked = true }) },
    restore: id => { assert.equal(id, r.baselineDeploymentId); return write('restore-baseline', () => { state.deploymentId = id; state.commitRef = null }) },
    unlock: id => { assert.equal(id, r.baselineDeploymentId); return write('unlock-baseline', () => { state.locked = false }) },
    waitPublication: async (id, locked) => { await invoke('wait'); assert.equal(state.deploymentId, id); assert.equal(state.locked, locked); return structuredClone(state) },
  }
  return f
}

test('controller binds exact reviewed main, protected target, operation and explicit restoration confirmation', () => {
  assert.deepEqual(reconciliationConfiguration(env(), sha), config)
  assert.equal(reconciliationConfiguration({ ...env(), OPERATION: 'verify', CONFIRMATION: '' }, sha).operation, 'verify')
  for (const [key, value] of Object.entries(env())) {
    assert.throws(() => reconciliationConfiguration({ ...env(), [key]: key === 'OPERATION' ? 'promote' : `${value}-wrong` }, sha), key)
  }
  assert.throws(() => reconciliationConfiguration(env(), '2'.repeat(40)))
})

test('production capture rejects other accounts, aliases-only foreign hosts, unknown locks and changed identity', () => {
  const captured = captureProduction(site(), deployment())
  assert.equal(captured.deploymentId, r.currentDeploymentId)
  assert.equal(captured.locked, false)
  assert.ok(!JSON.stringify(captured).includes('must-not-appear'))
  for (const patch of [{ id: 'foreign' }, { account_id: 'foreign' }, { account_slug: 'foreign' }, { custom_domain: 'foreign.example' },
    { force_ssl: false }, { build_settings: { stop_builds: null } }, { published_deploy: { id: '2'.repeat(24) } }]) {
    assert.throws(() => captureProduction({ ...site(), ...patch }, deployment()))
  }
  for (const patch of [{ id: '2'.repeat(24) }, { site_id: 'foreign' }, { state: 'building' }, { context: 'deploy-preview' }, { locked: undefined }, { locked: 'true' }]) {
    assert.throws(() => captureProduction(site(), { ...deployment(), ...patch }))
  }
  const modified = site(); modified.build_settings.repo_path = 'foreign/repository'
  assert.notEqual(captureProduction(modified, deployment()).settingsHash, captured.settingsHash)
  modified.build_settings.repo_path = r.repository; modified.build_settings.stop_builds = true
  assert.equal(captureProduction(modified, deployment()).settingsHash, captured.settingsHash)
})

test('baseline metadata and marker cannot select another deployment, account host, revision, or mixed marker', () => {
  assertOwnedBaseline(baseline()); assertBaselineMarker(marker())
  for (const patch of [{ id: r.currentDeploymentId }, { site_id: 'foreign' }, { state: 'error' }, { context: 'deploy-preview' },
    { commit_ref: sha }, { deploy_ssl_url: 'https://evil.example' }, { locked: undefined }]) assert.throws(() => assertOwnedBaseline({ ...baseline(), ...patch }))
  for (const patch of [{ version: 2 }, { releaseSha: sha }, { certificationHash: '0'.repeat(64) }, { kind: 'invented' }]) assert.throws(() => assertBaselineMarker({ ...marker(), ...patch }))
})

test('catalogue documents cannot invent or relabel the historical certification', () => {
  const certificate = { version: 1, profile: 'rehab-certified', releaseSha: r.baselineCommit, catalogHash: r.catalogHash, manifestHash: r.manifestHash,
    fullGateHash: 'a'.repeat(64), sourceCatalogHash: 'b'.repeat(64), templateEvidenceHash: 'c'.repeat(64), fileEvidenceHash: 'd'.repeat(64),
    sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0, customizationDiagnostics: 0, files: 5486, pages: 5486 }
  const pointer = { version: 1, profile: 'rehab-certified', releaseSha: r.baselineCommit, catalogHash: r.catalogHash, manifestHash: r.manifestHash,
    certificationHash: r.certificationHash, sourceTemplates: 5486, activatedAt: '2026-10-01T00:00:00Z',
    catalogKey: `catalogs/${r.catalogHash}/_catalog-v3.json`, manifestKey: `catalogs/${r.catalogHash}/_manifest.json`, certificationKey: `certifications/${r.certificationHash}.json` }
  assert.throws(() => assertBaselineDocuments(pointer, certificate, Buffer.from('{}'), {}), /unchanged certified baseline/)
  assert.throws(() => assertBaselineDocuments({ ...pointer, catalogKey: '_active.json' }, certificate, Buffer.from('{}'), {}), /namespace/)
  assert.throws(() => assertBaselineDocuments(pointer, { ...certificate, releaseSha: sha }, Buffer.from('{}'), {}), /releaseSha/)
})

test('verify is read-only, with fresh identity, catalogue and unique baseline validation', async () => {
  const f = fixture(); const journal = await reconcileProduction({ ...config, operation: 'verify' }, f.a)
  assert.equal(journal.phase, 'validated'); assert.deepEqual(f.writes, [])
  assert.deepEqual(journal.attemptedWrites, []); assert.equal(journal.publicationApproved, false)
  assert.equal(journal.priorDeploymentId, r.currentDeploymentId)
  assert.ok(f.events.includes('baseline') && f.events.includes('catalogue'))
})

test('restore journals each fixed write, leaves automatic builds stopped and preserves both deployment identities', async () => {
  const f = fixture(); const journal = await reconcileProduction(config, f.a)
  assert.deepEqual(f.writes, ['stop-builds', 'lock-current', 'restore-baseline', 'unlock-baseline'])
  assert.equal(journal.phase, 'complete'); assert.equal(journal.after.stopBuilds, true); assert.equal(journal.after.locked, false)
  assert.equal(journal.after.deploymentId, r.baselineDeploymentId); assert.equal(journal.before.deploymentId, r.currentDeploymentId)
  assert.equal(journal.publicationApproved, false)
  assert.equal(f.events.filter(value => value === 'public').length, 2)
})

test('already stopped builds stay stopped without a redundant settings write', async () => {
  const f = fixture(); f.state.stopBuilds = true
  await reconcileProduction(config, f.a)
  assert.deepEqual(f.writes, ['lock-current', 'restore-baseline', 'unlock-baseline'])
})

test('a foreign publication, commit, or preexisting lock stops without provider writes', async () => {
  for (const patch of [{ deploymentId: '2'.repeat(24) }, { commitRef: sha }, { locked: true }]) {
    const f = fixture(); Object.assign(f.state, patch)
    await assert.rejects(reconcileProduction(config, f.a)); assert.deepEqual(f.writes, [])
    assert.equal(f.saved.at(-1).requiresReconciliation, false)
  }
})

test('baseline, catalogue or main/CI failure before publication leaves the provider untouched', async () => {
  for (const event of ['controller', 'baseline', 'catalogue']) {
    const f = fixture(); f.before = async name => { if (name === event) throw new Error('fixture rejection') }
    await assert.rejects(reconcileProduction(config, f.a)); assert.deepEqual(f.writes, [])
    assert.equal(f.saved.at(-1).phase, 'stopped')
  }
})

test('publication moving while the current-main gate runs is caught before each write', async () => {
  for (let gate = 2; gate <= 5; gate++) {
    const f = fixture(); let count = 0
    f.before = async name => { if (name === 'controller' && ++count === gate) f.state.deploymentId = '2'.repeat(24) }
    await assert.rejects(reconcileProduction(config, f.a))
    assert.equal(f.writes.length, gate - 2)
    assert.equal(f.saved.at(-1).lastObserved.deploymentId, '2'.repeat(24))
  }
})

test('every ambiguous provider write is observed and halts without retry or automatic rollback', async () => {
  const names = ['stop-builds', 'lock-current', 'restore-baseline', 'unlock-baseline']
  for (const phase of names) {
    const f = fixture(); f.before = async name => { if (name === phase) throw new Error('ambiguous provider response') }
    await assert.rejects(reconcileProduction(config, f.a))
    assert.deepEqual(f.writes, names.slice(0, names.indexOf(phase) + 1))
    const last = f.saved.at(-1)
    assert.equal(last.phase, 'stopped'); assert.equal(last.requiresReconciliation, true)
    assert.equal(last.interruptedAtPhase, `${phase}-requested`); assert.ok(last.lastObserved)
  }
})

test('unchanged-state readback failure after stopping builds halts before locking or restoring', async () => {
  const f = fixture(); const stop = f.a.stopBuilds
  f.a.stopBuilds = async () => { await stop(); f.state.settingsHash = 'unexpected' }
  await assert.rejects(reconcileProduction(config, f.a), /unrelated settings/)
  assert.deepEqual(f.writes, ['stop-builds'])
})

test('failed public health preserves the restored lock and stopped builds for reviewed recovery', async () => {
  const f = fixture(); f.before = async name => { if (name === 'public') throw new Error('not healthy') }
  await assert.rejects(reconcileProduction(config, f.a))
  assert.deepEqual(f.writes, ['stop-builds', 'lock-current', 'restore-baseline'])
  assert.equal(f.state.locked, true); assert.equal(f.state.stopBuilds, true)
  assert.equal(f.saved.at(-1).lastObserved.deploymentId, r.baselineDeploymentId)
})

test('failed durable intent prevents the corresponding provider write', async () => {
  const f = fixture(); const save = f.a.save
  f.a.save = async journal => { if (journal.phase === 'restore-baseline-requested') throw new Error('disk unavailable'); await save(journal) }
  await assert.rejects(reconcileProduction(config, f.a)); assert.deepEqual(f.writes, ['stop-builds', 'lock-current'])
})

test('publication moving during final public health cannot be reported as a completed restoration', async () => {
  const f = fixture(); let count = 0
  f.before = async name => { if (name === 'public' && ++count === 2) f.state.deploymentId = '2'.repeat(24) }
  await assert.rejects(reconcileProduction(config, f.a), /publication, lock or unrelated settings/)
  assert.equal(f.saved.at(-1).phase, 'stopped')
  assert.equal(f.saved.at(-1).lastObserved.deploymentId, '2'.repeat(24))
})

const credentials = { NETLIFY_AUTH_TOKEN: 'netlify-test-secret', INTERNAL_ADMIN_TOKEN: 'runtime-test-secret', GITHUB_TOKEN: 'github-test-secret' }
test('provider adapter uses only the four fixed writes, forbids arbitrary targets and isolates credentials by host', async () => {
  const seen = []
  const http = createReconciliationHttp(credentials, async (url, options) => { seen.push({ url, ...options }); return Response.json({}) })
  await http.site(); await http.deployment(r.baselineDeploymentId); await http.main(); await http.ci(sha)
  await http.runtime(r.baselineOrigin); await http.runtime(`https://${r.hostname}`)
  await http.stopBuilds(); await http.lock(r.currentDeploymentId); await http.restore(r.baselineDeploymentId); await http.unlock(r.baselineDeploymentId)
  assert.equal(seen.length, 10)
  const changes = seen.filter(call => call.method !== 'GET')
  assert.deepEqual(changes.map(call => call.method), ['PATCH', 'POST', 'POST', 'POST'])
  assert.deepEqual(JSON.parse(changes[0].body), { build_settings: { stop_builds: true } })
  for (const call of seen) {
    assert.equal(call.redirect, 'error'); assert.equal(call.cache, 'no-store')
    const expected = call.url.startsWith('https://api.netlify.com/') ? credentials.NETLIFY_AUTH_TOKEN
      : call.url.startsWith('https://api.github.com/') ? credentials.GITHUB_TOKEN : credentials.INTERNAL_ADMIN_TOKEN
    assert.equal(call.headers.authorization, `Bearer ${expected}`)
  }
  for (const action of [() => http.lock(r.baselineDeploymentId), () => http.restore(r.currentDeploymentId), () => http.unlock(r.currentDeploymentId),
    () => http.runtime('https://evil.example'), () => http.deployment('../sites'), () => http.ci('../main')]) assert.throws(action)
  assert.equal(seen.length, 10)
})

test('provider errors, redirects, oversized bodies and missing credentials fail without exposing response contents', async () => {
  assert.throws(() => createReconciliationHttp({ ...credentials, GITHUB_TOKEN: '' }))
  for (const reply of [new Response('sensitive-error', { status: 500 }),
    { ok: true, redirected: true }, new Response('x'.repeat(1024 * 1024 + 1))]) {
    const http = createReconciliationHttp(credentials, async () => reply)
    await assert.rejects(http.site(), error => !String(error).includes('sensitive-error') && !String(error).includes('netlify-test-secret'))
  }
  const empty = createReconciliationHttp(credentials, async () => new Response(null, { status: 204 }))
  assert.equal(await empty.unlock(r.baselineDeploymentId), null)
})

test('workflow retains production review, shared concurrency, exact main guard, scoped secrets and immutable journal artifact', async () => {
  const workflow = await readFile(new URL('../../../.github/workflows/production-baseline-reconcile.yml', import.meta.url), 'utf8')
  assert.match(workflow, /environment: production/); assert.match(workflow, /group: dailyclarity-production/)
  assert.match(workflow, /cancel-in-progress: false/); assert.match(workflow, /github\.ref == 'refs\/heads\/main'/)
  assert.match(workflow, /persist-credentials: false/); assert.match(workflow, /operation:[\s\S]*default: verify/)
  assert.match(workflow, /production-reconciliation-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/)
  assert.equal((workflow.match(/NETLIFY_AUTH_TOKEN:/g) || []).length, 1)
  assert.ok(workflow.indexOf('NETLIFY_AUTH_TOKEN:') > workflow.indexOf('name: Run the bounded production reconciliation'))
})
