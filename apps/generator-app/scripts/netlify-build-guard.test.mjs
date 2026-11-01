import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm, symlink, link } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertProtectedBuild, ignoreBuildExitCode, protectedBuildKind, readUntrackedMarker } from './netlify-build-guard.mjs'

const sha = 'a'.repeat(40), hash = 'b'.repeat(64)
const production = '4a98d266-bb9f-44ab-bf27-30597d741705', staging = 'e5f283c4-d2f2-4fc9-965d-f67f9875c074'
const workflow = name => `russlle2/platform-builder/.github/workflows/${name}@refs/heads/main`
const base = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'russlle2/platform-builder', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_SHA: sha, GITHUB_WORKFLOW_SHA: sha, GITHUB_WORKFLOW_REF: workflow('deploy.yml'), DEPLOY_ENVIRONMENT: 'production',
  NETLIFY_SITE_ID: production, NETLIFY_EXPECTED_SITE_ID: production, NETLIFY_EXPECTED_ACCOUNT_SLUG: 'christopherlake96', NETLIFY_EXPECTED_SITE_HOSTNAME: 'dailyclarity.org',
  OPERATION: 'promote', CONFIRMATION: 'PROMOTE CERTIFIED', RECEIPT_HASH: hash, CONNECTED_EVIDENCE_HASH: 'c'.repeat(64) }
const marker = { version: 1, releaseSha: sha, certificationHash: hash }
const staged = { ...base, NETLIFY_SITE_ID: staging, NETLIFY_EXPECTED_SITE_ID: staging, DEPLOY_ENVIRONMENT: 'staging', NETLIFY_EXPECTED_SITE_HOSTNAME: 'dailyclarity-staging.netlify.app' }
const entry = fileURLToPath(new URL('./netlify-build-guard.mjs', import.meta.url))

test('hosted production and build-hook contexts stop; explicit previews continue', () => {
  for (const env of [{}, { CONTEXT: 'production' }, { CONTEXT: 'production', INCOMING_HOOK_TITLE: 'manual' }, { CONTEXT: 'dev' }]) assert.equal(ignoreBuildExitCode(env), 0)
  for (const CONTEXT of ['deploy-preview', 'branch-deploy']) assert.equal(ignoreBuildExitCode({ CONTEXT }), 1)
  const result = spawnSync(process.execPath, [entry, 'build'], { env: { PATH: process.env.PATH, CONTEXT: 'production', NETLIFY: 'true', INCOMING_HOOK_TITLE: 'bypass-ignore' }, encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Production-context build stopped/)
})

test('only exact protected workflow, ref, commit, site and intended operation may build', () => {
  assert.equal(assertProtectedBuild(base, sha, marker), 'certified')
  for (const patch of [{ GITHUB_ACTIONS: '' }, { GITHUB_EVENT_NAME: 'push' }, { GITHUB_REF: 'refs/heads/feature' }, { GITHUB_SHA: 'd'.repeat(40) },
    { GITHUB_WORKFLOW_SHA: 'd'.repeat(40) }, { GITHUB_REPOSITORY: 'foreign/repository' }, { GITHUB_WORKFLOW_REF: workflow('ci.yml') },
    { NETLIFY_SITE_ID: staging }, { NETLIFY_EXPECTED_SITE_ID: staging }, { NETLIFY_EXPECTED_ACCOUNT_SLUG: 'foreign' },
    { NETLIFY_EXPECTED_SITE_HOSTNAME: 'foreign.example' }, { DEPLOY_ENVIRONMENT: 'staging' }, { OPERATION: 'verify' }, { CONFIRMATION: '' }, { CONNECTED_EVIDENCE_HASH: '' }]) {
    assert.throws(() => assertProtectedBuild({ ...base, ...patch }, sha, marker))
  }
  for (const value of [{ ...marker, releaseSha: 'd'.repeat(40) }, { ...marker, certificationHash: 'e'.repeat(64) }, { ...marker, extra: true }, { version: 1, releaseSha: sha }]) assert.throws(() => assertProtectedBuild(base, sha, value))
})

test('existing certified, recovery and full-staging marker formats remain supported', () => {
  assert.equal(assertProtectedBuild({ ...base, GITHUB_WORKFLOW_REF: workflow('recover-baseline.yml'), OPERATION: 'recover', CONFIRMATION: 'RECOVER BASELINE' }, sha,
    { version: 1, profile: 'launch-recovery', releaseSha: sha, recoveryHash: hash }), 'recovery')
  assert.equal(assertProtectedBuild({ ...staged, GITHUB_WORKFLOW_REF: workflow('staging-catalogue.yml'), OPERATION: 'stage', CONFIRMATION: 'STAGE FULL CATALOGUE' }, sha,
    { version: 1, profile: 'rehab-staging-candidate', releaseSha: sha, certificationHash: hash, journalHash: 'd'.repeat(64) }), 'staging-catalogue')
  const env = { ...staged, GITHUB_WORKFLOW_REF: workflow('deploy-staging.yml'), STAGING_BUILD_CONFIRMATION: 'STAGE' }
  assert.equal(assertProtectedBuild(env, sha, { version: 1, kind: 'dailyclarity-staging-launch', releaseSha: sha, siteId: staging }), 'staging-launch')
  assert.throws(() => assertProtectedBuild(env, sha, marker))
  assert.throws(() => protectedBuildKind({ ...base, GITHUB_WORKFLOW_REF: workflow('deploy-staging.yml'), STAGING_BUILD_CONFIRMATION: 'STAGE' }, sha))
})

async function fixture(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'dc-build-guard-'))
  const git = args => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  try {
    git(['init', '-q']); await writeFile(path.join(directory, 'tracked.txt'), 'reviewed\n'); git(['add', 'tracked.txt'])
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture'])
    const head = git(['rev-parse', 'HEAD']); await mkdir(path.join(directory, 'apps/generator-app/public'), { recursive: true })
    await run({ directory, git, head, file: path.join(directory, 'apps/generator-app/public/__dailyclarity_release.json') })
  } finally { await rm(directory, { recursive: true, force: true }) }
}

test('marker reader rejects committed, symlinked, hardlinked and oversized evidence', async () => fixture(async ({ directory, file, git }) => {
  await writeFile(file, JSON.stringify(marker)); assert.deepEqual(await readUntrackedMarker(directory), marker)
  git(['add', 'apps/generator-app/public/__dailyclarity_release.json']); await assert.rejects(readUntrackedMarker(directory), /never committed/)
  git(['reset', '-q', 'HEAD', '--', 'apps/generator-app/public/__dailyclarity_release.json'])
  await rm(file); const original = path.join(directory, 'source.json'); await writeFile(original, JSON.stringify(marker))
  await symlink(original, file); await assert.rejects(readUntrackedMarker(directory)); await rm(file)
  await link(original, file); await assert.rejects(readUntrackedMarker(directory)); await rm(file)
  await writeFile(file, ' '.repeat(4097)); await assert.rejects(readUntrackedMarker(directory))
}))

test('real command accepts generated protected marker and rejects changed tracked checkout', async () => fixture(async ({ directory, file, head }) => {
  await writeFile(file, JSON.stringify({ ...marker, releaseSha: head }))
  const env = { PATH: process.env.PATH, ...base, GITHUB_SHA: head, GITHUB_WORKFLOW_SHA: head }
  assert.equal(spawnSync(process.execPath, [entry, 'build'], { cwd: directory, env }).status, 0)
  await writeFile(path.join(directory, 'tracked.txt'), 'changed\n')
  assert.equal(spawnSync(process.execPath, [entry, 'build'], { cwd: directory, env }).status, 1)
}))

test('legacy staging marker is generated once and cannot impersonate a certificate', async () => fixture(async ({ directory, head }) => {
  const env = { PATH: process.env.PATH, ...staged, GITHUB_SHA: head, GITHUB_WORKFLOW_SHA: head, GITHUB_WORKFLOW_REF: workflow('deploy-staging.yml'), STAGING_BUILD_CONFIRMATION: 'STAGE' }
  assert.equal(spawnSync(process.execPath, [entry, 'write-staging-marker'], { cwd: directory, env }).status, 0)
  const proof = await readUntrackedMarker(directory)
  assert.equal(proof.kind, 'dailyclarity-staging-launch'); assert.equal(proof.siteId, staging); assert.equal(proof.certificationHash, undefined)
  assert.equal(spawnSync(process.execPath, [entry, 'write-staging-marker'], { cwd: directory, env }).status, 1)
}))

test('default and production build commands enforce guard while previews remain available', () => {
  const toml = readFileSync(new URL('../../../netlify.toml', import.meta.url), 'utf8')
  for (const section of ['build', 'context.production']) {
    const block = toml.split(`[${section}]`)[1]?.split(/^\[/m)[0]
    assert.match(block, /command = "node apps\/generator-app\/scripts\/netlify-build-guard\.mjs build && pnpm install --frozen-lockfile/)
  }
  assert.match(toml, /ignore = "node \.\/apps\/generator-app\/scripts\/netlify-build-guard\.mjs ignore"/)
  for (const context of ['deploy-preview', 'branch-deploy']) assert.match(toml.split(`[context.${context}]`)[1]?.split(/^\[/m)[0], /command = "pnpm install --frozen-lockfile/)
  const workflowSource = readFileSync(new URL('../../../.github/workflows/deploy-staging.yml', import.meta.url), 'utf8')
  assert.match(workflowSource, /github\.ref == 'refs\/heads\/main'/)
  assert.match(workflowSource, /write-staging-marker/)
  assert.ok(workflowSource.indexOf('Verify the exact staging Netlify site') < workflowSource.indexOf('write-staging-marker'))
})
