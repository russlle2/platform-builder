#!/usr/bin/env node
// Isolated provider-behavior rehearsal. No customer, billing, DNS, domain, repo,
// database, plan, deletion or production-adapter changes are supported here.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, rename, lstat, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TARGET as STAGING } from './staging-recovery-proof.mjs'
import { assertNetlifyTarget, PRODUCTION_NETLIFY_SITE_ID } from './netlify-target-contract.mjs'
import { assertReleaseCi } from './verify-release-ci.mjs'

export const TARGET = Object.freeze({ ...STAGING, workflow: '.github/workflows/staging-hosting-control.yml' })
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/, NONCE = /^[a-f0-9]{24}$/
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/, ID = /^[1-9][0-9]{0,15}$/
const JOURNAL = 'hosting-journal.json'
class ControlError extends Error { constructor(code) { super(`Hosting rehearsal stopped (${code}).`); this.code = code } }
const need = (condition, code) => { if (!condition) throw new ControlError(code) }
const canonical = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(canonical) : Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(canonical(value))).digest('hex')
const same = (a, b) => digest(a) === digest(b)
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',')
const iso = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value))
const ownedId = id => need(UUID.test(id ?? '') && ![TARGET.siteId, PRODUCTION_NETLIFY_SITE_ID].includes(id), 'fixture_id')
const sourceFor = env => ({ runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, releaseSha: env.GITHUB_SHA })
const workflowPathMatches = value => value === TARGET.workflow || value === `${TARGET.workflow}@main`
const titleFor = nonce => `DailyClarity isolated hosting rehearsal ${nonce}`
export const fixtureName = nonce => `dc-host-${nonce}`
export function fixtureFiles(nonce) {
  need(NONCE.test(nonce ?? ''), 'nonce')
  return Object.freeze({
    '/index.html': `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>DailyClarity hosting rehearsal</title></head><body>DailyClarity hosting fixture ${nonce}</body></html>\n`,
    '/_headers': '/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store, max-age=0\n  Content-Security-Policy: default-src \'none\'\n',
    '/robots.txt': 'User-agent: *\nDisallow: /\n',
  })
}
export const fixtureManifest = nonce => Object.fromEntries(Object.entries(fixtureFiles(nonce)).map(([name, body]) => [name, createHash('sha1').update(body).digest('hex')]))
export function configuration(env) {
  need(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === TARGET.repository && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_SHA === env.GITHUB_SHA && env.GITHUB_WORKFLOW_REF === `${TARGET.repository}/${TARGET.workflow}@refs/heads/main`, 'protected_workflow')
  need(SHA.test(env.GITHUB_SHA ?? '') && env.RELEASE_SHA === env.GITHUB_SHA && ID.test(env.GITHUB_RUN_ID ?? '') && ID.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'release_identity')
  need(env.DEPLOY_ENVIRONMENT === 'staging' && env.NETLIFY_SITE_ID === TARGET.siteId && env.NETLIFY_EXPECTED_SITE_ID === TARGET.siteId && env.NETLIFY_EXPECTED_SITE_HOSTNAME === TARGET.hostname && env.NETLIFY_EXPECTED_ACCOUNT_SLUG === TARGET.accountSlug, 'fixed_staging_target')
  need(['rehearse', 'inspect', 'restore'].includes(env.OPERATION) && NONCE.test(env.FIXTURE_NONCE ?? ''), 'operation_or_nonce')
  need(env.OPERATION === 'inspect' || env.CONFIRMATION === (env.OPERATION === 'rehearse' ? 'REHEARSE OWNED HOSTING FIXTURE' : 'RESTORE OWNED HOSTING FIXTURE'), 'confirmation')
  if (env.OPERATION === 'rehearse') need(!env.SOURCE_RUN_ID && !env.SOURCE_ARTIFACT_ID && !env.SOURCE_JOURNAL_HASH, 'fresh_rehearsal_only')
  else need(ID.test(env.SOURCE_RUN_ID ?? '') && ID.test(env.SOURCE_ARTIFACT_ID ?? '') && HASH.test(env.SOURCE_JOURNAL_HASH ?? ''), 'exact_source')
  if (env.OPERATION === 'restore') need(env.GITHUB_RUN_ATTEMPT === '1', 'single_restore_attempt')
  need(path.isAbsolute(env.RUNNER_TEMP || ''), 'temporary_directory')
  return { operation: env.OPERATION, nonce: env.FIXTURE_NONCE, source: sourceFor(env), journalHash: env.SOURCE_JOURNAL_HASH, input: path.join(env.RUNNER_TEMP, 'staging-hosting-input'), output: path.join(env.RUNNER_TEMP, 'staging-hosting-output') }
}
export function assertFixtureSite(site, nonce, { siteId, createdAfter, empty = false, deploymentId } = {}) {
  ownedId(site?.id)
  const name = fixtureName(nonce), host = `${name}.netlify.app`
  need((!siteId || site.id === siteId) && site.account_id === TARGET.accountId && site.account_slug === TARGET.accountSlug && site.name === name, 'fixture_identity')
  need((site.default_domain == null || site.default_domain === host) && site.custom_domain == null && Array.isArray(site.domain_aliases) && site.domain_aliases.length === 0 && site.branch_deploy_custom_domain == null && site.deploy_preview_custom_domain == null, 'fixture_domains')
  for (const key of ['url', 'ssl_url']) {
    let url; try { url = new URL(site[key]) } catch { throw new ControlError('fixture_url') }
    need(['http:', 'https:'].includes(url.protocol) && url.hostname === host && !url.username && !url.password && !url.port && !url.search && !url.hash && url.pathname === '/', 'fixture_url')
  }
  need(site.build_settings?.repo_url == null && site.build_settings?.repo_path == null && site.repo?.repo_url == null && site.repo?.repo_path == null && site.git_provider == null, 'fixture_repository')
  need(typeof site.created_at === 'string' && Number.isFinite(Date.parse(site.created_at)) && (!createdAfter || Date.parse(site.created_at) >= Date.parse(createdAfter) - 30_000), 'fixture_created_at')
  if (empty) need(site.published_deploy == null, 'fixture_not_empty')
  if (deploymentId) need(site.published_deploy?.id === deploymentId, 'fixture_publication_changed')
  return site
}
export function assertDeploy(deploy, fixture, nonce, ready = true) {
  need(NONCE.test(deploy?.id ?? '') && (!fixture.deploymentId || deploy.id === fixture.deploymentId) && deploy.site_id === fixture.siteId && deploy.title === titleFor(nonce), 'deployment_identity')
  need(deploy.context === 'production' && deploy.draft !== true && deploy.locked !== true && (!ready || deploy.state === 'ready'), 'deployment_state')
  return deploy
}
// Preserve only observed scalar signals. These are NOT an invented provider enum
// or an authorization rule; review actual before/disabled/restored artifacts first.
export function stateObservation(site) {
  const result = {}
  if (typeof site.state === 'string' && /^[A-Za-z0-9_. -]{1,64}$/.test(site.state)) result.state = site.state
  for (const key of ['disabled', 'is_disabled', 'suspended', 'is_suspended']) if (typeof site[key] === 'boolean') result[key] = site[key]
  return result
}
export function assertArtifactSource(run, artifact, config, env) {
  need(String(run?.id) === env.SOURCE_RUN_ID && run.repository?.full_name === TARGET.repository && workflowPathMatches(run.path) && run.head_branch === 'main' && run.head_sha === config.source.releaseSha && run.event === 'workflow_dispatch' && run.status === 'completed' && ['success', 'failure', 'cancelled'].includes(run.conclusion), 'journal_producer')
  need(String(artifact?.id) === env.SOURCE_ARTIFACT_ID && artifact.expired === false && artifact.name === `staging-hosting-journal-${run.id}-${run.run_attempt}` && artifact.workflow_run?.id === Number(env.SOURCE_RUN_ID) && artifact.workflow_run?.head_sha === run.head_sha && Number.isSafeInteger(artifact.size_in_bytes) && artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 128 * 1024, 'journal_artifact')
  return { runId: String(run.id), runAttempt: String(run.run_attempt), releaseSha: run.head_sha }
}
export function validateJournal(journal, config, source) {
  need(exact(journal, ['version', 'kind', 'source', 'operation', 'nonce', 'startedAt', 'updatedAt', 'phase', 'fixture', 'creationVerified', 'disableRequested', 'disableStatus', 'enableStatus', 'observations', 'failure', 'recoverySource']) && journal.version === 1 && journal.kind === 'staging-owned-hosting-rehearsal' && journal.operation === 'rehearse' && same(journal.source, source) && journal.nonce === config.nonce && digest(journal) === config.journalHash, 'journal_shape_or_hash')
  need(journal.creationVerified === true && iso(journal.startedAt) && iso(journal.updatedAt) && Date.parse(journal.updatedAt) >= Date.parse(journal.startedAt) && journal.recoverySource === null, 'creation_provenance')
  const f = journal.fixture
  need(exact(f, ['siteId', 'name', 'hostname', 'accountId', 'createdAt', 'deploymentId', 'bodyHash', 'manifestHash']), 'journal_fixture')
  ownedId(f.siteId)
  need(f.name === fixtureName(config.nonce) && f.hostname === `${f.name}.netlify.app` && f.accountId === TARGET.accountId && typeof f.createdAt === 'string' && Number.isFinite(Date.parse(f.createdAt)) && Date.parse(f.createdAt) >= Date.parse(journal.startedAt) - 30_000 && NONCE.test(f.deploymentId ?? '') && f.bodyHash === digest(fixtureFiles(config.nonce)['/index.html']) && f.manifestHash === digest(fixtureManifest(config.nonce)), 'journal_fixture_identity')
  need(typeof journal.disableRequested === 'boolean' && (journal.disableStatus === null || Number.isInteger(journal.disableStatus) && journal.disableStatus >= 100 && journal.disableStatus <= 599), 'journal_disable')
  need(Array.isArray(journal.observations) && journal.observations.length <= 80, 'journal_observations')
  // Inspect can diagnose an uploaded baseline. Restore only follows the exact
  // rehearsal's persisted disable intent; it never adopts a name lookup target.
  if (config.operation === 'restore') {
    need(journal.disableRequested === true, 'restore_without_disable_intent')
    need(['disable_requested', 'disable_returned', 'disable_observed', 'enable_requested', 'enable_returned'].includes(journal.phase), 'restore_from_completed_or_unprepared_source')
    need(journal.disableStatus === null || journal.disableStatus === 204, 'restore_after_rejected_disable')
    need(journal.enableStatus !== 422, 'restore_after_provider_block')
  }
  return journal
}
export function assertSingleRestoreRun(response, config) {
  const runs = response?.workflow_runs
  // This small workflow is intentionally limited to one enable-only recovery
  // attempt per nonce. Truncated history, reruns, or another dispatched restore
  // require a reviewed extension, never a blind replay of the original artifact.
  need(Array.isArray(runs) && runs.length <= 100 && response.total_count === runs.length, 'restore_history_incomplete')
  const title = `restore owned hosting fixture ${config.nonce}`
  const matches = runs.filter(run => run.display_title === title)
  need(matches.length === 1 && String(matches[0].id) === config.source.runId && matches[0].run_attempt === 1 && matches[0].head_sha === config.source.releaseSha && matches[0].head_branch === 'main' && matches[0].event === 'workflow_dispatch' && workflowPathMatches(matches[0].path), 'restore_already_attempted_or_unbound')
}
export async function boundObservation(deps, config, fixture) {
  const site = assertFixtureSite(await deps.site(fixture.siteId), config.nonce, { siteId: fixture.siteId, createdAfter: fixture.createdAt, deploymentId: fixture.deploymentId })
  assertDeploy(await deps.deploy(fixture.deploymentId), fixture, config.nonce)
  const http = await deps.publicHttp()
  need(exact(http, ['status', 'bodyHash', 'noindex']) && Number.isInteger(http.status) && http.status >= 100 && http.status <= 599 && HASH.test(http.bodyHash ?? '') && typeof http.noindex === 'boolean', 'public_observation')
  return { observedAt: new Date(deps.now()).toISOString(), site: stateObservation(site), http }
}
const online = (observation, fixture) => observation.http.status === 200 && observation.http.bodyHash === fixture.bodyHash && observation.http.noindex
// A non-2xx result is only an observation following an accepted disable request.
// It is not a reusable production observer. No transport error proves offline.
const unavailable = (observation, fixture) => observation.http.status >= 400 && observation.http.status <= 599 && observation.http.bodyHash !== fixture.bodyHash
export async function orchestrate(config, deps) {
  const journal = { version: 1, kind: 'staging-owned-hosting-rehearsal', source: config.source, operation: config.operation, nonce: config.nonce, startedAt: new Date(deps.now()).toISOString(), updatedAt: new Date(deps.now()).toISOString(), phase: 'started', fixture: null, creationVerified: false, disableRequested: false, disableStatus: null, enableStatus: null, observations: [], failure: null, recoverySource: null }
  const save = async phase => { journal.phase = phase; journal.updatedAt = new Date(deps.now()).toISOString(); await deps.save(journal) }
  const observe = async label => { const value = await boundObservation(deps, config, journal.fixture); journal.observations.push({ label, ...value }); await save(journal.phase); return value }
  const poll = async (label, predicate) => {
    const deadline = deps.now() + 60_000
    for (let attempt = 0; attempt < 20; attempt++) {
      const value = await observe(label)
      if (predicate(value, journal.fixture)) return value
      if (deps.now() >= deadline) break
      await deps.pause(1000)
    }
    throw new ControlError('public_observation_timeout')
  }
  try {
    await save('started')
    await deps.guard()
    if (config.operation === 'rehearse') {
      need(await deps.lookup() === null, 'fixture_already_exists')
      await deps.guard()
      await save('creation_requested')
      const created = await deps.create()
      // Preserve only a syntactically valid ID even if subsequent identity checks
      // fail; it is diagnostic, never a valid recovery authorization.
      if (UUID.test(created?.id ?? '')) { journal.fixture = { siteId: created.id }; await save('creation_returned') }
      const site = assertFixtureSite(created, config.nonce, { createdAfter: journal.startedAt, empty: true })
      journal.fixture = { siteId: site.id, name: fixtureName(config.nonce), hostname: `${fixtureName(config.nonce)}.netlify.app`, accountId: TARGET.accountId, createdAt: site.created_at, deploymentId: null, bodyHash: digest(fixtureFiles(config.nonce)['/index.html']), manifestHash: digest(fixtureManifest(config.nonce)) }
      assertFixtureSite(await deps.site(site.id), config.nonce, { siteId: site.id, createdAfter: journal.startedAt, empty: true })
      journal.creationVerified = true
      await save('creation_verified')
      await deps.guard()
      assertFixtureSite(await deps.site(site.id), config.nonce, { siteId: site.id, createdAfter: journal.startedAt, empty: true })
      await save('deployment_requested')
      const deployment = await deps.createDeploy(site.id)
      if (NONCE.test(deployment?.id ?? '')) { journal.fixture.deploymentId = deployment.id; await save('deployment_returned') }
      assertDeploy(deployment, journal.fixture, config.nonce, false)
      const manifest = fixtureManifest(config.nonce), allowed = new Set(Object.values(manifest))
      need(Array.isArray(deployment.required) && deployment.required.every(hash => allowed.has(hash)) && deployment.required.length <= allowed.size, 'deployment_upload_manifest')
      for (const key of ['required_functions', 'required_edge_functions', 'required_server', 'required_server_functions']) need(deployment[key] == null || Array.isArray(deployment[key]) && deployment[key].length === 0, 'unexpected_function_upload')
      await save('upload_requested')
      for (const hash of new Set(deployment.required)) await deps.upload(deployment.id, hash)
      await deps.waitReady(journal.fixture)
      await poll('before_disable', online)
      await save('baseline_verified')
      await deps.guard()
      need(online(await observe('disable_preflight'), journal.fixture), 'baseline_changed')
      journal.disableRequested = true
      await save('disable_requested')
      journal.disableStatus = await deps.change(journal.fixture.siteId, 'disable')
      await save('disable_returned')
      need(journal.disableStatus === 204, 'disable_not_accepted')
      await poll('after_disable', unavailable)
      await save('disable_observed')
    } else {
      const prior = await deps.loadJournal()
      journal.fixture = prior.fixture
      journal.creationVerified = true
      journal.disableRequested = prior.disableRequested
      journal.disableStatus = prior.disableStatus
      journal.recoverySource = { ...prior.source, journalHash: config.journalHash }
      await save('source_verified')
      const observed = await observe('source_readback')
      if (config.operation === 'inspect') { await save('inspected'); return journal }
      if (online(observed, journal.fixture)) { await save('already_restored'); return journal }
    }
    // Recovery is deliberately enable-only on the exact nonce/deployment-bound
    // fixture. A lost disable response never authorizes a second disable request.
    await deps.guard()
    await observe('enable_preflight')
    await save('enable_requested')
    journal.enableStatus = await deps.change(journal.fixture.siteId, 'enable')
    await save('enable_returned')
    need(journal.enableStatus === 204, 'enable_not_accepted')
    await poll('after_enable', online)
    await save('restored')
    return journal
  } catch (error) {
    journal.failure = error instanceof ControlError ? error.code : 'unclassified'
    // Keep the last mutation phase; do not erase an ambiguous disable/enable.
    await save(journal.phase)
    throw error
  }
}

export function createProviderAccess(env, config, fetcher = fetch) {
  const request = async (url, init = {}, redirect = 'error') => {
    try { return await fetcher(url, { ...init, redirect, cache: 'no-store', signal: AbortSignal.timeout(20_000) }) }
    catch { throw new ControlError('provider_transport') }
  }
  const body = async response => {
    let reader, timer
    try {
      if (!response.body) return ''
      reader = response.body.getReader()
      return await Promise.race([
        (async () => { const chunks = []; let size = 0; while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; need(size <= 256 * 1024, 'response_size'); chunks.push(next.value) } return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)) })(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new ControlError('response_timeout')), 20_000) }),
      ])
    } catch (error) { throw error instanceof ControlError ? error : new ControlError('response_read') }
    finally { clearTimeout(timer); if (reader) { try { void reader.cancel().catch(() => {}) } catch { /* no raw body */ } } }
  }
  const json = async (url, init, optional404 = false) => {
    const response = await request(url, init)
    if (optional404 && response.status === 404) { await response.body?.cancel(); return null }
    need(response.ok, 'provider_http')
    try { return JSON.parse(await body(response)) } catch (error) { throw error instanceof ControlError ? error : new ControlError('response_json') }
  }
  const auth = { authorization: `Bearer ${env.NETLIFY_AUTH_TOKEN}`, accept: 'application/json' }
  const netlify = (resource, method = 'GET', payload, optional404 = false) => json(`https://api.netlify.com/api/v1/${resource}`, { method, headers: { ...auth, ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}) }, optional404)
  const deploy = id => { need(NONCE.test(id ?? ''), 'deployment_id'); return netlify(`deploys/${id}`) }
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
  return {
    now: () => Date.now(), pause,
    guard: async () => {
      const [branch, site] = await Promise.all([
        json(`https://api.github.com/repos/${TARGET.repository}/branches/main`, { headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' } }),
        netlify(`sites/${TARGET.siteId}`),
      ])
      need(branch?.commit?.sha === config.source.releaseSha, 'current_main_changed')
      assertNetlifyTarget(site, { environment: 'staging', configuredSiteId: TARGET.siteId, expectedSiteId: TARGET.siteId, expectedHostname: TARGET.hostname, expectedAccountSlug: TARGET.accountSlug })
      need(site.account_id === TARGET.accountId, 'staging_account_changed')
      if (config.operation === 'restore') {
        const history = await json(`https://api.github.com/repos/${TARGET.repository}/actions/workflows/staging-hosting-control.yml/runs?event=workflow_dispatch&branch=main&head_sha=${config.source.releaseSha}&per_page=100`, { headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' } })
        assertSingleRestoreRun(history, config)
      }
    },
    lookup: () => netlify(`sites/${fixtureName(config.nonce)}.netlify.app`, 'GET', undefined, true),
    site: id => { ownedId(id); return netlify(`sites/${id}`) },
    create: () => netlify(`${TARGET.accountSlug}/sites?configure_dns=false`, 'POST', { name: fixtureName(config.nonce), custom_domain: null, domain_aliases: [] }),
    deploy,
    createDeploy: id => { ownedId(id); return netlify(`sites/${id}/deploys?title=${encodeURIComponent(titleFor(config.nonce))}`, 'POST', { files: fixtureManifest(config.nonce) }) },
    upload: async (id, hash) => {
      need(NONCE.test(id ?? ''), 'deployment_id')
      const name = Object.keys(fixtureManifest(config.nonce)).find(name => fixtureManifest(config.nonce)[name] === hash)
      need(name, 'upload_digest')
      const response = await request(`https://api.netlify.com/api/v1/deploys/${id}/files${name}`, { method: 'PUT', headers: { ...auth, 'content-type': 'application/octet-stream' }, body: fixtureFiles(config.nonce)[name] })
      need(response.ok, 'upload_unconfirmed'); await response.body?.cancel()
    },
    waitReady: async fixture => {
      const deadline = Date.now() + 60_000
      for (let i = 0; i < 20 && Date.now() < deadline; i++) {
        const value = assertDeploy(await deploy(fixture.deploymentId), fixture, config.nonce, false)
        need(!['error', 'rejected'].includes(value.state), 'deployment_failed')
        if (value.state === 'ready') return
        await pause(1000)
      }
      throw new ControlError('deployment_timeout')
    },
    change: async (id, action) => {
      ownedId(id); need(['disable', 'enable'].includes(action), 'hosting_action')
      const suffix = action === 'disable' ? `?reason=${encodeURIComponent(`DailyClarity isolated rehearsal ${config.nonce}`)}` : ''
      const response = await request(`https://api.netlify.com/api/v1/sites/${id}/${action}${suffix}`, { method: 'PUT', headers: auth })
      // 422 is retained only as status; never force, patch, delete or retry it.
      await response.body?.cancel(); return response.status
    },
    publicHttp: async () => {
      // Capture 3xx as observations without following or retaining Location.
      const response = await request(`https://${fixtureName(config.nonce)}.netlify.app/?__dc_hosting=${config.nonce}`, { headers: { accept: 'text/html', 'cache-control': 'no-cache' } }, 'manual')
      return { status: response.status, bodyHash: digest(await body(response)), noindex: /(?:^|[,\s])noindex(?:$|[,\s])/i.test(response.headers.get('x-robots-tag') || '') }
    },
  }
}
async function githubJson(env, resource) {
  const response = await fetch(`https://api.github.com/repos/${TARGET.repository}/${resource}`, { headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' }, redirect: 'error', signal: AbortSignal.timeout(20_000) })
  need(response.ok, 'github_read'); return response.json()
}
async function sourceIdentity(env, config) {
  const artifact = await githubJson(env, `actions/artifacts/${env.SOURCE_ARTIFACT_ID}`)
  const attempt = artifact?.name?.match(new RegExp(`^staging-hosting-journal-${env.SOURCE_RUN_ID}-([1-9][0-9]*)$`))?.[1]
  need(attempt, 'artifact_attempt')
  return assertArtifactSource(await githubJson(env, `actions/runs/${env.SOURCE_RUN_ID}/attempts/${attempt}`), artifact, config, env)
}
export async function run(env = process.env) {
  const config = configuration(env)
  need(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() === config.source.releaseSha && env.GITHUB_TOKEN, 'checkout_identity')
  const ci = await githubJson(env, `actions/workflows/ci.yml/runs?head_sha=${config.source.releaseSha}&status=success&per_page=100`)
  assertReleaseCi(ci.workflow_runs, config.source.releaseSha, TARGET.repository)
  if (process.argv[2] === 'check-source') { need(config.operation !== 'rehearse', 'source_not_needed'); await sourceIdentity(env, config); return }
  need(env.NETLIFY_AUTH_TOKEN, 'staging_credential')
  await mkdir(config.output, { recursive: false, mode: 0o700 })
  const deps = createProviderAccess(env, config)
  deps.save = async journal => {
    await writeFile(path.join(config.output, `${JOURNAL}.tmp`), `${JSON.stringify(journal, null, 2)}\n`, { mode: 0o600 })
    await rename(path.join(config.output, `${JOURNAL}.tmp`), path.join(config.output, JOURNAL))
    console.log(JSON.stringify({ phase: journal.phase, journalHash: digest(journal) }))
  }
  deps.loadJournal = async () => {
    const source = await sourceIdentity(env, config), names = await readdir(config.input)
    need(same(names, [JOURNAL]), 'journal_bundle')
    const filename = path.join(config.input, JOURNAL), stat = await lstat(filename)
    need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size <= 64 * 1024, 'journal_file')
    return validateJournal(JSON.parse(await readFile(filename, 'utf8')), config, source)
  }
  const journal = await orchestrate(config, deps)
  console.log(JSON.stringify({ result: journal.phase, siteId: journal.fixture?.siteId ?? null, journalHash: digest(journal), productionObserverEnabled: false }))
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run().catch(error => { console.error(error instanceof ControlError ? error.message : 'Hosting rehearsal stopped (unclassified). Keep the sanitized journal; provider text and credentials were not retained.'); process.exitCode = 1 })
