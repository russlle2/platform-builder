import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { TARGET, configuration, fixtureName, fixtureFiles, fixtureManifest, digest, assertFixtureSite, assertDeploy, stateObservation, validateJournal, assertArtifactSource, assertSingleRestoreRun, orchestrate, createProviderAccess } from './staging-hosting-control.mjs'
import { PRODUCTION_NETLIFY_SITE_ID } from './netlify-target-contract.mjs'

const nonce = '1234567890abcdef12345678', sha = 'a'.repeat(40)
const siteId = '11111111-2222-3333-4444-555555555555', deploymentId = 'abcdefabcdefabcdefabcdef'
const started = '2026-10-29T18:00:00.000Z'
const env = (patch = {}) => ({ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: TARGET.repository, GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_SHA: sha, GITHUB_SHA: sha, GITHUB_WORKFLOW_REF: `${TARGET.repository}/${TARGET.workflow}@refs/heads/main`, GITHUB_RUN_ID: '1234', GITHUB_RUN_ATTEMPT: '1', RELEASE_SHA: sha, DEPLOY_ENVIRONMENT: 'staging', NETLIFY_SITE_ID: TARGET.siteId, NETLIFY_EXPECTED_SITE_ID: TARGET.siteId, NETLIFY_EXPECTED_SITE_HOSTNAME: TARGET.hostname, NETLIFY_EXPECTED_ACCOUNT_SLUG: TARGET.accountSlug, OPERATION: 'rehearse', FIXTURE_NONCE: nonce, CONFIRMATION: 'REHEARSE OWNED HOSTING FIXTURE', RUNNER_TEMP: '/tmp/hosting-test', ...patch })
const freshSite = () => ({ id: siteId, name: fixtureName(nonce), default_domain: `${fixtureName(nonce)}.netlify.app`, custom_domain: null, domain_aliases: [], account_id: TARGET.accountId, account_slug: TARGET.accountSlug, url: `http://${fixtureName(nonce)}.netlify.app/`, ssl_url: `https://${fixtureName(nonce)}.netlify.app/`, created_at: started, published_deploy: null, build_settings: { repo_url: null, repo_path: null }, state: 'fixture-active', disabled: false })
const deploy = () => ({ id: deploymentId, site_id: siteId, title: `DailyClarity isolated hosting rehearsal ${nonce}`, context: 'production', draft: false, locked: false, state: 'ready', required: Object.values(fixtureManifest(nonce)) })
function fake(patch = {}) {
  const calls = [], journals = [], site = freshSite()
  let tick = Date.parse(started), disabled = false
  const deps = {
    now: () => tick++, pause: async ms => { tick += ms },
    save: async journal => { journals.push(structuredClone(journal)); calls.push(`save:${journal.phase}`) },
    guard: async () => { calls.push('guard') },
    lookup: async () => null,
    create: async () => { calls.push('create'); return structuredClone(site) },
    site: async id => { assert.equal(id, siteId); return structuredClone(site) },
    createDeploy: async id => { assert.equal(id, siteId); calls.push('deploy'); return deploy() },
    deploy: async id => { assert.equal(id, deploymentId); return deploy() },
    upload: async (id, hash) => { assert.equal(id, deploymentId); assert.ok(Object.values(fixtureManifest(nonce)).includes(hash)); calls.push('upload') },
    waitReady: async () => { site.published_deploy = { id: deploymentId } },
    publicHttp: async () => ({ status: disabled ? 503 : 200, bodyHash: digest(disabled ? 'disabled fixture' : fixtureFiles(nonce)['/index.html']), noindex: !disabled }),
    change: async (id, action) => { assert.equal(id, siteId); calls.push(action); disabled = action === 'disable'; site.disabled = disabled; site.state = disabled ? 'fixture-disabled' : 'fixture-active'; return 204 },
    ...patch,
  }
  return { deps, calls, journals, site }
}
const recoveryConfig = journal => configuration(env({ OPERATION: 'restore', CONFIRMATION: 'RESTORE OWNED HOSTING FIXTURE', SOURCE_RUN_ID: '1234', SOURCE_ARTIFACT_ID: '5678', SOURCE_JOURNAL_HASH: digest(journal), GITHUB_RUN_ID: '9876' }))
async function interruptedJournal() {
  const fixture = fake(), original = fixture.deps.change
  fixture.deps.change = async (id, action) => { if (action === 'enable') throw new Error('ambiguous transport'); return original(id, action) }
  await assert.rejects(orchestrate(configuration(env()), fixture.deps))
  return fixture.journals.at(-1)
}

test('workflow identity, exact SHA, target, nonce and explicit action are mandatory', () => {
  assert.equal(configuration(env()).nonce, nonce)
  for (const patch of [{ GITHUB_REF: 'refs/heads/feature' }, { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_WORKFLOW_SHA: 'b'.repeat(40) }, { RELEASE_SHA: 'b'.repeat(40) }, { NETLIFY_SITE_ID: PRODUCTION_NETLIFY_SITE_ID }, { NETLIFY_EXPECTED_ACCOUNT_SLUG: 'another-account' }, { DEPLOY_ENVIRONMENT: 'production' }, { FIXTURE_NONCE: '../site' }, { CONFIRMATION: '' }, { SOURCE_RUN_ID: '1234' }]) assert.throws(() => configuration(env(patch)))
})
test('fixture identity excludes production, staging, aliases, repositories and existing publications', () => {
  assertFixtureSite(freshSite(), nonce, { siteId, createdAfter: started, empty: true })
  for (const patch of [{ id: TARGET.siteId }, { id: PRODUCTION_NETLIFY_SITE_ID }, { account_id: 'other' }, { account_slug: 'other' }, { name: 'customer' }, { domain_aliases: ['dailyclarity.org'] }, { custom_domain: 'customer.com' }, { branch_deploy_custom_domain: 'customer.com' }, { build_settings: { repo_url: 'https://github.com/customer/repo' } }, { repo: { repo_path: 'customer/repo' } }, { git_provider: 'github' }, { ssl_url: `https://${fixtureName(nonce)}.netlify.app.evil.invalid/` }, { created_at: '2000-01-01T00:00:00.000Z' }, { published_deploy: { id: deploymentId } }]) assert.throws(() => assertFixtureSite({ ...freshSite(), ...patch }, nonce, { createdAfter: started, empty: true }))
})
test('deployment checks exact site, title, context and published ID', () => {
  const fixture = { siteId, deploymentId }
  assertDeploy(deploy(), fixture, nonce)
  for (const patch of [{ id: 'f'.repeat(24) }, { site_id: TARGET.siteId }, { title: 'customer content' }, { context: 'deploy-preview' }, { draft: true }, { locked: true }, { state: 'building' }]) assert.throws(() => assertDeploy({ ...deploy(), ...patch }, fixture, nonce))
})
test('provider state is observed, never inferred or dumped', () => {
  assert.deepEqual(stateObservation({ state: 'brand_new_provider_value', disabled: true, suspended: false, is_disabled: 'secret', password: 'secret', build_settings: { env: { TOKEN: 'secret' } }, disabled_reason: 'secret' }), { state: 'brand_new_provider_value', disabled: true, suspended: false })
  assert.deepEqual(stateObservation({ state: 'https://secret.invalid/token', disabled: 'yes' }), {})
})
test('fresh fixture is deployed, journaled before each mutation, disabled and exactly restored', async () => {
  const { deps, calls, journals } = fake()
  const result = await orchestrate(configuration(env()), deps)
  assert.equal(result.phase, 'restored')
  assert.equal(result.disableStatus, 204); assert.equal(result.enableStatus, 204)
  assert.equal(calls.filter(x => x === 'create').length, 1)
  assert.equal(calls.filter(x => x === 'deploy').length, 1)
  assert.equal(calls.filter(x => x === 'disable').length, 1)
  assert.equal(calls.filter(x => x === 'enable').length, 1)
  assert.equal(calls[calls.indexOf('create') - 1], 'save:creation_requested')
  assert.equal(calls[calls.indexOf('deploy') - 1], 'save:deployment_requested')
  assert.equal(calls[calls.indexOf('disable') - 1], 'save:disable_requested')
  assert.equal(calls[calls.indexOf('enable') - 1], 'save:enable_requested')
  assert.ok(journals.some(j => j.phase === 'disable_returned' && j.disableStatus === 204))
  assert.deepEqual(result.observations.find(x => x.label === 'after_disable').site, { state: 'fixture-disabled', disabled: true })
  assert.equal(result.observations.at(-1).http.bodyHash, digest(fixtureFiles(nonce)['/index.html']))
})
test('preexisting deterministic name is never adopted', async () => {
  const { deps, calls, journals } = fake({ lookup: async () => freshSite() })
  await assert.rejects(orchestrate(configuration(env()), deps), /fixture_already_exists/)
  assert.ok(!calls.includes('create') && !calls.includes('disable'))
  assert.equal(journals.at(-1).creationVerified, false)
})
test('foreign creation response is diagnostic only and cannot authorize restoration', async () => {
  const { deps, calls, journals } = fake({ create: async () => ({ ...freshSite(), account_id: 'foreign' }) })
  await assert.rejects(orchestrate(configuration(env()), deps), /fixture_identity/)
  assert.equal(journals.at(-1).fixture.siteId, siteId)
  assert.equal(journals.at(-1).creationVerified, false)
  assert.ok(!calls.includes('deploy') && !calls.includes('disable'))
  const journal = journals.at(-1)
  assert.throws(() => validateJournal(journal, recoveryConfig(journal), configuration(env()).source), /creation_provenance/)
})
test('unknown required upload digest blocks deployment upload and disabling', async () => {
  const { deps, calls } = fake({ createDeploy: async () => ({ ...deploy(), required: ['bad-hash'] }) })
  await assert.rejects(orchestrate(configuration(env()), deps), /deployment_upload_manifest/)
  assert.ok(!calls.includes('upload') && !calls.includes('disable'))
})
test('unexpected functions block even a valid static upload manifest', async () => {
  for (const key of ['required_functions', 'required_edge_functions', 'required_server', 'required_server_functions']) {
    const { deps, calls } = fake({ createDeploy: async () => ({ ...deploy(), [key]: ['function'] }) })
    await assert.rejects(orchestrate(configuration(env()), deps), /unexpected_function_upload/)
    assert.ok(!calls.includes('upload') && !calls.includes('disable'))
  }
})
test('ambiguous disable preserves intent and exact fixture, does not blindly retry', async () => {
  const { deps, journals, calls } = fake({ change: async (_id, action) => { calls.push(action); throw new Error('raw provider secret must not be retained') } })
  await assert.rejects(orchestrate(configuration(env()), deps))
  const journal = journals.at(-1)
  assert.equal(journal.phase, 'disable_requested'); assert.equal(journal.disableRequested, true); assert.equal(journal.disableStatus, null)
  assert.equal(journal.failure, 'unclassified')
  assert.ok(!JSON.stringify(journal).includes('secret'))
  assert.equal(calls.filter(x => x === 'disable').length, 1); assert.ok(!calls.includes('enable'))
  validateJournal(journal, recoveryConfig(journal), configuration(env()).source)
})
test('disable 422 is retained with no enable or destructive fallback', async () => {
  const { deps, journals, calls } = fake({ change: async (_id, action) => { calls.push(action); return 422 } })
  await assert.rejects(orchestrate(configuration(env()), deps), /disable_not_accepted/)
  assert.equal(journals.at(-1).disableStatus, 422)
  assert.ok(!calls.includes('enable'))
})
test('200 changed content does not pass the offline or restoration check', async () => {
  const { deps, calls, journals } = fake()
  const original = deps.publicHttp
  deps.publicHttp = async () => calls.includes('disable') ? { status: 200, bodyHash: digest('unexpected other page'), noindex: true } : original()
  await assert.rejects(orchestrate(configuration(env()), deps), /public_observation_timeout/)
  assert.equal(journals.at(-1).phase, 'disable_returned')
  assert.ok(!calls.includes('enable'))
})
test('enable 422 retains stopped disabled fixture and does not retry', async () => {
  const { deps, journals, calls } = fake()
  const original = deps.change
  deps.change = async (id, action) => { if (action === 'enable') { calls.push(action); return 422 } return original(id, action) }
  await assert.rejects(orchestrate(configuration(env()), deps), /enable_not_accepted/)
  assert.equal(journals.at(-1).enableStatus, 422)
  assert.equal(calls.filter(x => x === 'enable').length, 1)
})
test('restore is exact-journal enable-only; inspect performs no mutations', async () => {
  const original = await interruptedJournal()
  for (const operation of ['restore', 'inspect']) {
    const recovery = fake()
    recovery.site.published_deploy = { id: deploymentId }
    recovery.deps.publicHttp = async () => recovery.calls.includes('enable') ? { status: 200, bodyHash: original.fixture.bodyHash, noindex: true } : { status: 503, bodyHash: digest('disabled'), noindex: false }
    recovery.deps.loadJournal = async () => original
    const result = await orchestrate({ ...recoveryConfig(original), operation }, recovery.deps)
    assert.equal(result.phase, operation === 'inspect' ? 'inspected' : 'restored')
    assert.ok(!recovery.calls.some(x => ['create', 'deploy', 'upload', 'disable'].includes(x)))
    assert.equal(recovery.calls.includes('enable'), operation === 'restore')
  }
})
test('already-restored fixture needs no enable request', async () => {
  const original = await interruptedJournal()
  const recovery = fake(); recovery.site.published_deploy = { id: deploymentId }; recovery.deps.loadJournal = async () => original
  assert.equal((await orchestrate(recoveryConfig(original), recovery.deps)).phase, 'already_restored')
  assert.ok(!recovery.calls.includes('enable'))
})
test('changed published deployment stops recovery before enable', async () => {
  const original = await interruptedJournal()
  const recovery = fake(); recovery.site.published_deploy = { id: 'f'.repeat(24) }; recovery.deps.loadJournal = async () => original
  await assert.rejects(orchestrate(recoveryConfig(original), recovery.deps), /fixture_publication_changed/)
  assert.ok(!recovery.calls.includes('enable'))
})
test('journal substitution, unverified creation, source chains and missing disable intent cannot authorize restore', async () => {
  const original = await interruptedJournal()
  validateJournal(original, recoveryConfig(original), original.source)
  for (const patch of [{ creationVerified: false }, { operation: 'restore' }, { nonce: 'f'.repeat(24) }, { disableRequested: false }, { phase: 'restored' }, { phase: 'already_restored' }, { phase: 'creation_verified' }, { disableStatus: 422 }, { disableStatus: 401 }, { disableStatus: 403 }, { enableStatus: 422 }, { recoverySource: original.source }, { fixture: { ...original.fixture, siteId: PRODUCTION_NETLIFY_SITE_ID } }, { fixture: { ...original.fixture, bodyHash: 'f'.repeat(64) } }]) {
    const journal = { ...original, ...patch }
    assert.throws(() => validateJournal(journal, recoveryConfig(journal), original.source))
  }
  assert.throws(() => validateJournal({ ...original, phase: 'tampered' }, recoveryConfig(original), original.source), /journal_shape_or_hash/)
})
test('restore rejects repeated runs, reruns, missing history and already completed rehearsal source', async () => {
  const journal = await interruptedJournal(), config = recoveryConfig(journal)
  const run = { id: Number(config.source.runId), run_attempt: 1, display_title: `restore owned hosting fixture ${nonce}`, head_sha: sha, head_branch: 'main', event: 'workflow_dispatch', path: TARGET.workflow }
  assertSingleRestoreRun({ total_count: 1, workflow_runs: [run] }, config)
  assertSingleRestoreRun({ total_count: 1, workflow_runs: [{ ...run, path: `${TARGET.workflow}@main` }] }, config)
  for (const response of [
    { total_count: 2, workflow_runs: [run] },
    { total_count: 0, workflow_runs: [] },
    { total_count: 2, workflow_runs: [run, { ...run, id: 9999 }] },
    { total_count: 1, workflow_runs: [{ ...run, run_attempt: 2 }] },
    { total_count: 1, workflow_runs: [{ ...run, path: '.github/workflows/other.yml' }] },
    { total_count: 1, workflow_runs: [{ ...run, path: `${TARGET.workflow}@feature` }] },
    { total_count: 1, workflow_runs: [{ ...run, path: `${TARGET.workflow}@main-extra` }] },
  ]) assert.throws(() => assertSingleRestoreRun(response, config))
  assert.throws(() => configuration(env({ OPERATION: 'restore', CONFIRMATION: 'RESTORE OWNED HOSTING FIXTURE', SOURCE_RUN_ID: '1234', SOURCE_ARTIFACT_ID: '5678', SOURCE_JOURNAL_HASH: digest(journal), GITHUB_RUN_ATTEMPT: '2' })), /single_restore_attempt/)
  const fixture = fake(), complete = await orchestrate(configuration(env()), fixture.deps)
  assert.throws(() => validateJournal(complete, recoveryConfig(complete), complete.source), /restore_from_completed/)
  validateJournal(complete, { ...recoveryConfig(complete), operation: 'inspect' }, complete.source)
})
test('artifact source binds exact workflow, branch, attempt, SHA, run and size', () => {
  const config = configuration(env()), input = { SOURCE_RUN_ID: '1234', SOURCE_ARTIFACT_ID: '5678' }
  const run = { id: 1234, run_attempt: 1, repository: { full_name: TARGET.repository }, path: TARGET.workflow, head_branch: 'main', head_sha: sha, event: 'workflow_dispatch', status: 'completed', conclusion: 'failure' }
  const artifact = { id: 5678, name: 'staging-hosting-journal-1234-1', expired: false, workflow_run: { id: 1234, head_sha: sha }, size_in_bytes: 1000 }
  assert.deepEqual(assertArtifactSource(run, artifact, config, input), config.source)
  assert.deepEqual(assertArtifactSource({ ...run, path: `${TARGET.workflow}@main` }, artifact, config, input), config.source)
  for (const patch of [{ path: '.github/workflows/other.yml' }, { path: `${TARGET.workflow}@feature` }, { path: `${TARGET.workflow}@main-extra` }, { head_branch: 'feature' }, { head_sha: 'b'.repeat(40) }, { run_attempt: 2 }, { event: 'pull_request' }, { status: 'in_progress' }]) assert.throws(() => assertArtifactSource({ ...run, ...patch }, artifact, config, input))
  for (const patch of [{ id: 9999 }, { expired: true }, { name: 'other' }, { size_in_bytes: 200000 }, { workflow_run: { id: 9999, head_sha: sha } }]) assert.throws(() => assertArtifactSource(run, { ...artifact, ...patch }, config, input))
})
test('provider adapter uses official PUT endpoints, mandatory reason, no redirect and no public credential', async () => {
  const requests = []
  const deps = createProviderAccess({ ...env(), NETLIFY_AUTH_TOKEN: 'test-token' }, configuration(env()), async (url, init) => { requests.push({ url, init }); return init.method === 'PUT' ? new Response(null, { status: 204 }) : new Response(fixtureFiles(nonce)['/index.html'], { status: 200, headers: { 'x-robots-tag': 'noindex, nofollow' } }) })
  assert.equal(await deps.change(siteId, 'disable'), 204)
  assert.equal(await deps.change(siteId, 'enable'), 204)
  assert.equal(requests[0].init.method, 'PUT'); assert.match(requests[0].url, /\/disable\?reason=DailyClarity/)
  assert.equal(requests[1].url, `https://api.netlify.com/api/v1/sites/${siteId}/enable`)
  assert.equal(requests[0].init.redirect, 'error')
  assert.equal((await deps.publicHttp()).bodyHash, digest(fixtureFiles(nonce)['/index.html']))
  assert.equal(requests[2].init.headers.authorization, undefined)
  await assert.rejects(deps.change(PRODUCTION_NETLIFY_SITE_ID, 'enable'))
  await assert.rejects(deps.change(TARGET.siteId, 'disable'))
  await assert.rejects(deps.change(siteId, 'delete'))
})
test('oversized public response and transport errors remain failures, never offline proofs', async () => {
  const oversized = createProviderAccess(env(), configuration(env()), async () => new Response('x'.repeat(256 * 1024 + 1)))
  await assert.rejects(oversized.publicHttp(), /response_size/)
  const transport = createProviderAccess(env(), configuration(env()), async () => { throw new Error('token-leak') })
  await assert.rejects(transport.publicHttp(), error => !error.message.includes('token-leak') && /provider_transport/.test(error.message))
})
test('public redirects and empty HTTP bodies are captured without following or logging locations', async () => {
  for (const status of [204, 302, 304]) {
    const requests = []
    const deps = createProviderAccess(env(), configuration(env()), async (url, init) => { requests.push({ url, init }); return new Response(null, { status, headers: { location: 'https://sensitive.invalid/?token=secret' } }) })
    const observed = await deps.publicHttp()
    assert.deepEqual(observed, { status, bodyHash: digest(''), noindex: false })
    assert.equal(requests.length, 1); assert.equal(requests[0].init.redirect, 'manual')
    assert.ok(!JSON.stringify(observed).includes('secret'))
  }
})
test('workflow remains staging-protected, serialized, minimal-secret and always preserves journal', async () => {
  const workflow = await readFile(new URL('../../../.github/workflows/staging-hosting-control.yml', import.meta.url), 'utf8')
  assert.match(workflow, /environment: staging/); assert.match(workflow, /group: dailyclarity-staging/); assert.match(workflow, /cancel-in-progress: false/)
  assert.match(workflow, /if: always\(\)/); assert.match(workflow, /staging-hosting-output\/\*\.json/)
  assert.ok(!/SUPABASE|STRIPE|INTERNAL_ADMIN|production:|secrets: inherit/.test(workflow))
})
