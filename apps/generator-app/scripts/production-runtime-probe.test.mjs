import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PRODUCTION_PROBE as p, assertProbeWorkflow, createProbeReaders, observeProduction, sanitizedProductionSnapshot, sanitizeMarker } from './production-runtime-probe.mjs'

const sha = 'a'.repeat(40), id = 'b'.repeat(24), hash = 'c'.repeat(64)
const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: p.repository, GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_WORKFLOW_REF: `${p.repository}/${p.workflow}@refs/heads/main`, GITHUB_SHA: sha, GITHUB_WORKFLOW_SHA: sha, EXPECTED_RELEASE_SHA: sha,
  GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2', DEPLOY_ENVIRONMENT: 'production', NETLIFY_SITE_ID: p.siteId, NETLIFY_EXPECTED_SITE_ID: p.siteId,
  NETLIFY_EXPECTED_SITE_HOSTNAME: p.hostname, NETLIFY_EXPECTED_ACCOUNT_SLUG: p.accountSlug, GITHUB_TOKEN: 'github-private-sentinel', NETLIFY_AUTH_TOKEN: 'netlify-private-sentinel' }
const site = { id: p.siteId, account_id: p.accountId, account_slug: p.accountSlug, custom_domain: p.hostname, published_deploy: { id },
  build_settings: { stop_builds: false, repo_branch: 'main', env: { SECRET: 'private-environment-sentinel' } }, force_ssl: true }
const deployment = { id, site_id: p.siteId, commit_ref: sha, state: 'ready', context: 'production', locked: false,
  title: `Certified ${sha} receipt ${hash}`, secret: 'private-deployment-sentinel' }
const main = { ref: 'refs/heads/main', object: { type: 'commit', sha } }
const ci = { workflow_runs: [{ head_sha: sha, status: 'completed', conclusion: 'success', event: 'push', head_branch: 'main',
  path: '.github/workflows/ci.yml', head_repository: { full_name: p.repository } }] }
const readers = (overrides = {}) => ({ main: async () => main, ci: async () => ci, site: async () => site,
  deployment: async () => deployment, marker: async () => sanitizeMarker(404, Buffer.alloc(0)), ...overrides })

test('manual current-main controller and fixed protected target are mandatory', () => {
  assert.equal(assertProbeWorkflow(env, sha).runAttempt, '2')
  for (const patch of [{ GITHUB_ACTIONS: '' }, { GITHUB_EVENT_NAME: 'push' }, { GITHUB_REF: 'refs/heads/feature' }, { GITHUB_WORKFLOW_REF: 'foreign/workflow' },
    { GITHUB_SHA: 'd'.repeat(40) }, { GITHUB_WORKFLOW_SHA: 'd'.repeat(40) }, { EXPECTED_RELEASE_SHA: 'd'.repeat(40) }, { GITHUB_RUN_ID: '0' },
    { GITHUB_RUN_ATTEMPT: '1.5' }, { DEPLOY_ENVIRONMENT: 'staging' }, { NETLIFY_SITE_ID: 'foreign' }, { NETLIFY_EXPECTED_SITE_ID: 'foreign' },
    { NETLIFY_EXPECTED_SITE_HOSTNAME: 'foreign.example' }, { NETLIFY_EXPECTED_ACCOUNT_SLUG: 'foreign' }]) assert.throws(() => assertProbeWorkflow({ ...env, ...patch }, sha))
})

test('observation truthfully reports running Git builds and absent marker without granting release approval', async () => {
  const report = await observeProduction(env, sha, readers(), () => '2026-11-01T03:00:00.000Z')
  assert.equal(report.stopBuilds, false); assert.equal(report.publishedDeployment.id, id)
  assert.equal(report.marker.available, false); assert.equal(report.markerMatchesCommit, null)
  assert.equal(report.providerWrites, false); assert.equal(report.publicationApproved, false); assert.equal(report.connectedCustomerTestsPerformed, false)
  for (const value of ['private-environment-sentinel', 'private-deployment-sentinel', env.GITHUB_TOKEN, env.NETLIFY_AUTH_TOKEN]) assert.ok(!JSON.stringify(report).includes(value))
})

test('foreign account/site/domain/deployment metadata cannot establish an observation', () => {
  for (const patch of [{ id: 'foreign' }, { account_id: 'foreign' }, { account_slug: 'foreign' }, { custom_domain: 'foreign.example' }, { published_deploy: { id: 'd'.repeat(24) } }]) {
    assert.throws(() => sanitizedProductionSnapshot({ ...site, ...patch }, deployment))
  }
  assert.throws(() => sanitizedProductionSnapshot(site, { ...deployment, site_id: 'foreign' }))
})

test('unrecognized provider titles and marker fields never enter retained output', () => {
  const report = sanitizedProductionSnapshot(site, { ...deployment, title: 'Private person private@example.invalid secret-token' })
  assert.equal(report.publishedDeployment.title, null); assert.equal(report.publishedDeployment.titleWithheld, true)
  assert.match(report.publishedDeployment.titleSha256, /^[a-f0-9]{64}$/)
  const marker = sanitizeMarker(200, Buffer.from(JSON.stringify({ version: 1, releaseSha: sha, certificationHash: hash, token: 'private-marker-sentinel' })))
  assert.equal(marker.valid, true); assert.ok(!JSON.stringify(marker).includes('private-marker-sentinel'))
  assert.equal(sanitizeMarker(200, Buffer.from('not json secret')).valid, false)
  assert.equal(sanitizeMarker(200, Buffer.from('{"version":1,"releaseSha":"private"}')).releaseSha, null)
})

test('exact successful push CI is required before any provider reads', async () => {
  let providerReads = 0
  await assert.rejects(observeProduction(env, sha, readers({ ci: async () => ({ workflow_runs: [] }), site: async () => { providerReads++; return site } })))
  assert.equal(providerReads, 0)
  await assert.rejects(observeProduction(env, sha, readers({ ci: async () => ({ workflow_runs: [{ ...ci.workflow_runs[0], event: 'pull_request' }] }) })))
})

test('publication, settings, lock, marker and current main are rechecked without mutations', async () => {
  for (const change of [{ build_settings: { stop_builds: true, repo_branch: 'main' } }, { published_deploy: { id: 'd'.repeat(24) } }]) {
    let count = 0
    await assert.rejects(observeProduction(env, sha, readers({ site: async () => ++count === 1 ? site : { ...site, ...change } })))
  }
  let deployments = 0
  await assert.rejects(observeProduction(env, sha, readers({ deployment: async () => ++deployments === 1 ? deployment : { ...deployment, locked: true } })))
  let mains = 0
  await assert.rejects(observeProduction(env, sha, readers({ main: async () => ++mains === 1 ? main : { ...main, object: { type: 'commit', sha: 'd'.repeat(40) } } })))
  const mismatch = await observeProduction(env, sha, readers({ marker: async () => sanitizeMarker(200, Buffer.from(JSON.stringify({ version: 1, releaseSha: 'd'.repeat(40) }))) }))
  assert.equal(mismatch.markerMatchesCommit, false)
})

test('real readers issue only fixed GETs, never send provider credentials to the public marker, and retain no bodies on errors', async () => {
  const calls = []
  const fetcher = async (url, options) => {
    calls.push({ url, options })
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error')
    if (url.startsWith('https://api.github.com/')) {
      assert.equal(options.headers.authorization, `Bearer ${env.GITHUB_TOKEN}`)
      return new Response(JSON.stringify(url.includes('/actions/') ? ci : main))
    }
    if (url.startsWith('https://api.netlify.com/')) {
      assert.equal(options.headers.authorization, `Bearer ${env.NETLIFY_AUTH_TOKEN}`)
      return new Response(JSON.stringify(url.includes('/deploys/') ? deployment : site))
    }
    assert.equal(url, 'https://dailyclarity.org/__dailyclarity_release.json')
    assert.equal(options.headers.authorization, undefined)
    return new Response('private error page', { status: 404 })
  }
  const actual = createProbeReaders(env, fetcher)
  await observeProduction(env, sha, actual)
  assert.equal(calls.length, 8)
  assert.ok(calls.every(call => !call.url.includes('/env') && !call.options.body))
  assert.throws(() => actual.deployment('../foreign'))
  assert.throws(() => actual.ci('../foreign'))
  await assert.rejects(createProbeReaders(env, async () => new Response('private error', { status: 403 })).site(), /403/)
})

test('readers reject redirects and oversized declared or streamed responses', async () => {
  const redirected = new Response('{}'); Object.defineProperty(redirected, 'redirected', { value: true })
  await assert.rejects(createProbeReaders(env, async () => redirected).site(), /redirect/)
  await assert.rejects(createProbeReaders(env, async () => new Response('{}', { headers: { 'content-length': '1048577' } })).site(), /limit/)
  await assert.rejects(createProbeReaders(env, async () => new Response('a'.repeat(4097))).marker(), /limit/)
})

test('probe workflow is manual, production-protected, serialized, read-only and narrowly retains observations', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/production-runtime-probe.yml', import.meta.url), 'utf8')
  assert.match(workflow, /workflow_dispatch:/); assert.doesNotMatch(workflow, /^  (push|pull_request|schedule|workflow_run):/m)
  assert.match(workflow, /environment: production/); assert.match(workflow, /group: dailyclarity-production/)
  assert.match(workflow, /github\.ref == 'refs\/heads\/main' && github\.repository == 'russlle2\/platform-builder'/)
  assert.doesNotMatch(workflow, /contents: write|actions: write|permissions: write-all|SUPABASE|INTERNAL_ADMIN_TOKEN|STRIPE/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /production-observation-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/)
  assert.match(workflow, /path: \$\{\{ runner\.temp \}\}\/production-observation\.json/)
  for (const [, action] of workflow.matchAll(/uses: ([^\s#]+)/g)) assert.match(action, /^[a-z0-9/-]+@[a-f0-9]{40}$/i)
})
