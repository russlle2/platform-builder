import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { recoveryConfiguration, orchestrateRecovery, assertRecoveryEnvironment, activateWithAttestationRetry, inspectRecoveryResumeSource, verifyRecoveryResumeSource, validateRecoveryJournalSource } from './run-baseline-recovery.mjs'
import { canonicalDigest, PRODUCTION_NETLIFY_SITE_ID } from '../src/lib/templates/certified-catalog-contract.mjs'

const sha = 'a'.repeat(40)
const originalSha = 'b'.repeat(40)
const env = () => ({
  GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'russlle2/platform-builder', GITHUB_SHA: sha,
  DAILYCLARITY_ENVIRONMENT: 'production', DEPLOY_ENVIRONMENT: 'production',
  NETLIFY_SITE_ID: PRODUCTION_NETLIFY_SITE_ID, NETLIFY_EXPECTED_SITE_ID: PRODUCTION_NETLIFY_SITE_ID,
  NETLIFY_EXPECTED_SITE_HOSTNAME: 'dailyclarity.org', NETLIFY_EXPECTED_ACCOUNT_SLUG: 'christopherlake96',
  NETLIFY_EXPECTED_SUPABASE_PROJECT_REF: 'psxmvaushwsboogfnyqi', NETLIFY_EXPECTED_SUPABASE_URL: 'https://psxmvaushwsboogfnyqi.supabase.co',
  RECOVERY_BUNDLE: '/tmp/recovery-input', RECOVERY_RECEIPT: '/tmp/recovery-receipt.json', RECOVERY_JOURNAL: '/tmp/recovery-journal.json',
})

function harness(operation = 'recover') {
  const events = []
  const receipt = { releaseSha: sha, profile: 'launch-recovery' }
  const journal = { nextReceipt: receipt, previousDeploymentId: 'original', previousReleaseSha: originalSha }
  const prepared = { receipt }
  const step = (name, value) => async () => { events.push(name); return value }
  const deps = {
    head: sha, checkRelease: step('check-release'), checkFutureEnvironment: step('check-future'),
    prepare: step('prepare', prepared), saveReceipt: step('save-receipt'),
    describeBaseline: step('describe-baseline', { previousDeploymentId: 'original' }),
    capture: step('capture', journal), saveJournal: step('save-journal'), stage: step('stage'), writeProof: step('proof'),
    deploy: step('deploy'), bindIfChanged: step('bind'), activate: step('activate', { templates: 60, salesPaused: true }),
    readJournal: step('read-journal', journal), validateJournal: () => events.push('validate-journal'),
    checkActivationSource: step('check-activation-source'),
    rollback: step('rollback', { templates: 0, originalBrokenStateRestored: true }),
  }
  return { deps, events, receipt, journal, config: { operation, receiptHash: canonicalDigest(receipt), journalHash: canonicalDigest(journal) } }
}

test('default operation is read-only and every write requires an explicit matching confirmation', () => {
  assert.equal(recoveryConfiguration(env()).operation, 'verify')
  for (const operation of ['recover', 'activate', 'rollback']) {
    assert.throws(() => recoveryConfiguration({ ...env(), OPERATION: operation }), /confirmation/)
  }
  assert.throws(() => recoveryConfiguration({ ...env(), OPERATION: 'promote' }), /Unknown/)
})

test('recovery requires reviewed original identity as well as both content hashes', () => {
  const candidate = { ...env(), OPERATION: 'recover', CONFIRMATION: 'RECOVER BASELINE', RECEIPT_HASH: 'a'.repeat(64), LEGACY_MANIFEST_HASH: 'b'.repeat(64) }
  assert.throws(() => recoveryConfiguration(candidate), /original deployment ID and release SHA/)
  const complete = { ...candidate, EXPECTED_PREVIOUS_DEPLOYMENT_ID: 'old-deploy', EXPECTED_PREVIOUS_RELEASE_SHA: originalSha }
  assert.equal(recoveryConfiguration(complete).previousDeploymentId, 'old-deploy')
  for (const key of ['RECEIPT_HASH', 'LEGACY_MANIFEST_HASH']) assert.throws(() => recoveryConfiguration({ ...complete, [key]: '' }), /hashes/)
})

test('target and checkout identity cannot drift to staging or another repository/branch', () => {
  for (const [key, value] of Object.entries({
    NETLIFY_EXPECTED_ACCOUNT_SLUG: 'other-team', NETLIFY_EXPECTED_SITE_HOSTNAME: 'preview.example.test',
    NETLIFY_EXPECTED_SUPABASE_PROJECT_REF: 'yuviqftugmasjypkhrpo', GITHUB_REF: 'refs/heads/feature', GITHUB_REPOSITORY: 'other/platform-builder',
  })) assert.throws(() => recoveryConfiguration({ ...env(), [key]: value }), /requires/)
  assert.throws(() => recoveryConfiguration({ ...env(), RECOVERY_JOURNAL: `${process.cwd()}/journal.json` }), /outside the checkout/)
})

test('verify produces a receipt and source identity without any mutation operation', async () => {
  const h = harness('verify')
  const previousRuntime = { supabaseSchemaReady: false, supabaseSchemaVersion: null, bookingKitSchemaVersion: null, schemaProbeFailure: 'missing-project-ref' }
  h.deps.describeBaseline = async () => { h.events.push('describe-baseline'); return { previousDeploymentId: 'original', previousRuntime } }
  const result = await orchestrateRecovery(h.config, h.deps)
  assert.equal(result.providerWrites, false)
  assert.equal(result.receiptHash, canonicalDigest(h.receipt))
  assert.deepEqual(result.previousRuntime, previousRuntime)
  assert.deepEqual(h.events, ['check-release', 'check-future', 'prepare', 'save-receipt', 'describe-baseline'])
})

test('an unapproved export cannot capture, stage, or publish', async () => {
  const h = harness()
  await assert.rejects(orchestrateRecovery({ ...h.config, receiptHash: '0'.repeat(64) }, h.deps), /reviewed receipt hash/)
  assert.equal(h.events.includes('capture'), false)
})

test('recovery persists rollback evidence before deployment and binds before activation', async () => {
  const h = harness()
  await orchestrateRecovery(h.config, h.deps)
  assert.deepEqual(h.events.slice(4), ['capture', 'save-journal', 'stage', 'proof', 'deploy', 'bind', 'activate'])
})

test('a CLI failure after publication still attempts binding and never activates', async () => {
  const h = harness()
  h.deps.deploy = async () => { h.events.push('deploy-published-then-error'); throw new Error('CLI connection lost') }
  await assert.rejects(orchestrateRecovery(h.config, h.deps), /CLI connection lost/)
  assert.deepEqual(h.events.slice(-2), ['deploy-published-then-error', 'bind'])
  assert.ok(h.events.includes('save-journal'))
  assert.equal(h.events.includes('activate'), false)
})

test('staging and binding failures cannot activate a partially verified catalogue', async () => {
  for (const failing of ['stage', 'bindIfChanged']) {
    const h = harness()
    h.deps[failing] = async () => { throw new Error(`${failing} failed`) }
    await assert.rejects(orchestrateRecovery(h.config, h.deps), new RegExp(`${failing} failed`))
    assert.equal(h.events.includes('activate'), false)
    if (failing === 'stage') assert.equal(h.events.includes('deploy'), false)
  }
})

test('activation resumes the same journal without preparing, recapturing, or redeploying', async () => {
  const h = harness('activate')
  await orchestrateRecovery(h.config, h.deps)
  assert.deepEqual(h.events, ['read-journal', 'validate-journal', 'save-journal', 'check-release', 'check-activation-source', 'check-future', 'bind', 'activate'])
})

test('unverified activation source cannot bind or write, and verified provenance preserves the original journal', async () => {
  const h = harness('activate')
  h.deps.checkActivationSource = async () => { throw new Error('source changed') }
  await assert.rejects(orchestrateRecovery(h.config, h.deps), /source changed/)
  assert.equal(h.events.includes('bind'), false)
  assert.equal(h.events.includes('activate'), false)
  const before = structuredClone(h.journal)
  const proof = { deploymentReleaseSha: sha, executorReleaseSha: originalSha, recoverySource: { runId: 123 }, activationSource: { unchangedNonControllerSource: true } }
  h.deps.checkActivationSource = async () => proof
  const result = await orchestrateRecovery(h.config, h.deps)
  assert.deepEqual(h.journal, before)
  assert.equal(result.deploymentReleaseSha, sha)
  assert.equal(result.executorReleaseSha, originalSha)
  assert.deepEqual(result.recoverySource, proof.recoverySource)
})

async function gitFixture(t) {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'recovery-resume-'))
  t.after(() => rm(repo, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  git('init', '-b', 'main'); git('config', 'user.name', 'Recovery tests'); git('config', 'user.email', 'recovery@example.test')
  const put = async (file, value) => { await mkdir(path.dirname(path.join(repo, file)), { recursive: true }); await writeFile(path.join(repo, file), value) }
  await put('apps/generator-app/src/app/page.tsx', 'original application')
  await put('.github/workflows/import-catalogue.yml', 'original workflow')
  git('add', '.'); git('commit', '-m', 'original main')
  const original = git('rev-parse', 'HEAD')
  const commit = () => { git('add', '.'); git('commit', '-m', 'reviewed next main'); return git('rev-parse', 'HEAD') }
  return { repo, git, put, original, commit }
}

function passingCi(releaseSha) {
  return { id: 1234, head_sha: releaseSha, status: 'completed', conclusion: 'success', event: 'push', head_branch: 'main', path: '.github/workflows/ci.yml', head_repository: { full_name: 'russlle2/platform-builder' } }
}

test('real Git ancestry and exact changed paths allow controller-only resumption with original main CI', async t => {
  const f = await gitFixture(t)
  await f.put('.github/workflows/import-catalogue.yml', 'correct path initialization')
  await f.put('apps/generator-app/scripts/run-baseline-recovery.mjs', 'reviewed controller')
  const head = f.commit()
  const result = await verifyRecoveryResumeSource(f.original, head, { repo: f.repo, loadCiRuns: async original => { assert.equal(original, f.original); return [passingCi(original)] } })
  assert.equal(result.journalReleaseSha, f.original)
  assert.equal(result.executorReleaseSha, head)
  assert.equal(result.originalCiRunId, 1234)
  assert.equal(result.unchangedNonControllerSource, true)
  assert.notEqual(result.journalTree, result.executorTree)
  assert.deepEqual(result.changedControlPaths, ['.github/workflows/import-catalogue.yml', 'apps/generator-app/scripts/run-baseline-recovery.mjs'])
})

test('real Git source comparison refuses app, core, dependencies and whitespace-disguised paths', async t => {
  const f = await gitFixture(t)
  for (const file of ['apps/generator-app/src/app/page.tsx', 'apps/generator-app/scripts/baseline-recovery.mjs', 'pnpm-lock.yaml', ' docs/BASELINE_RECOVERY.md']) {
    f.git('reset', '--hard', f.original)
    await f.put(file, 'unapproved changed source')
    const head = f.commit()
    assert.throws(() => inspectRecoveryResumeSource(f.original, head, f.repo), /unapproved source changed/)
  }
})

test('matching files on another branch and unavailable history cannot substitute for main ancestry', async t => {
  const f = await gitFixture(t)
  await f.put('docs/BASELINE_RECOVERY.md', 'original branch'); const divergent = f.commit()
  f.git('checkout', '-b', 'other', f.original)
  await f.put('docs/BASELINE_RECOVERY.md', 'another branch'); const head = f.commit()
  assert.throws(() => inspectRecoveryResumeSource(divergent, head, f.repo), /ancestor/)
  assert.throws(() => inspectRecoveryResumeSource('e'.repeat(40), head, f.repo), /ancestor/)
  assert.throws(() => inspectRecoveryResumeSource('--all', head, f.repo), /exact original/)
})

test('source equivalence alone never bypasses exact successful original push CI', async t => {
  const f = await gitFixture(t)
  for (const mutation of [{ conclusion: 'failure' }, { event: 'pull_request' }, { head_branch: 'feature' }, { head_sha: sha }, { path: '.github/workflows/other.yml' }, { head_repository: { full_name: 'other/repo' } }]) {
    await assert.rejects(verifyRecoveryResumeSource(f.original, f.original, { repo: f.repo, loadCiRuns: async () => [{ ...passingCi(f.original), ...mutation }] }), /successful GitHub CI/)
  }
  await assert.rejects(verifyRecoveryResumeSource(f.original, f.original, { repo: f.repo, loadCiRuns: async () => [{ ...passingCi(f.original), id: null }] }), /run identity/)
})

test('journal provenance binds the original workflow attempt, exact artifact and original application SHA', () => {
  const artifact = { id: 456, name: 'baseline-recovery-123-1', expired: false, digest: `sha256:${'a'.repeat(64)}`, workflow_run: { id: 123, head_sha: sha, head_branch: 'main' } }
  const run = { id: 123, run_attempt: 1, head_sha: sha, head_branch: 'main', path: '.github/workflows/recover-baseline.yml', event: 'workflow_dispatch', status: 'completed', conclusion: 'failure', head_repository: { full_name: 'russlle2/platform-builder' } }
  const input = { artifact, run, runId: '123', artifactId: '456', releaseSha: sha }
  assert.deepEqual(validateRecoveryJournalSource(input), { runId: 123, attempt: 1, artifactId: 456, artifactDigest: artifact.digest, releaseSha: sha })
  for (const changed of [{ run: { ...run, run_attempt: 2 } }, { run: { ...run, head_sha: originalSha } }, { run: { ...run, path: '.github/workflows/other.yml' } }, { run: { ...run, head_repository: { full_name: 'other/repo' } } }, { artifact: { ...artifact, expired: true } }, { artifact: { ...artifact, id: 999 } }, { artifact: { ...artifact, name: 'baseline-recovery-999-1' } }, { artifact: { ...artifact, workflow_run: { ...artifact.workflow_run, head_sha: originalSha } } }]) {
    assert.throws(() => validateRecoveryJournalSource({ ...input, ...changed }), /original recovery workflow/)
  }
})

test('rollback preserves the journal and does not require current CI or healthy future configuration', async () => {
  const h = harness('rollback')
  h.deps.checkRelease = async () => { throw new Error('CI unavailable') }
  h.deps.checkFutureEnvironment = async () => { throw new Error('new configuration broken') }
  const result = await orchestrateRecovery(h.config, h.deps)
  assert.equal(result.originalBrokenStateRestored, true)
  assert.deepEqual(h.events, ['read-journal', 'validate-journal', 'save-journal', 'bind', 'rollback'])
})

test('rollback refuses a foreign deployment before any restore operation', async () => {
  const h = harness('rollback')
  h.deps.bindIfChanged = async () => { throw new Error('foreign deployment proof') }
  await assert.rejects(orchestrateRecovery(h.config, h.deps), /foreign deployment/)
  assert.equal(h.events.includes('rollback'), false)
})

test('future runtime must keep both launch profile and sales pause in builds and functions', () => {
  const variables = [
    ...Object.entries({ NEXT_PUBLIC_SUPABASE_URL: env().NETLIFY_EXPECTED_SUPABASE_URL, DAILYCLARITY_SUPABASE_PROJECT_REF: env().NETLIFY_EXPECTED_SUPABASE_PROJECT_REF,
      DAILYCLARITY_ENVIRONMENT: 'production', DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'launch', DAILYCLARITY_SALES_PAUSED: 'true', BOOKING_KIT_ENABLED: 'false' })
      .map(([key, value]) => ({ key, is_secret: false, scopes: ['builds', 'functions'], values: [{ context: 'production', value }] })),
    { key: 'SUPABASE_SERVICE_ROLE_KEY', is_secret: true, scopes: ['functions'] },
  ]
  assert.doesNotThrow(() => assertRecoveryEnvironment(variables, env()))
  for (const key of ['DAILYCLARITY_SALES_PAUSED', 'DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE', 'BOOKING_KIT_ENABLED']) {
    assert.throws(() => assertRecoveryEnvironment(variables.filter(entry => entry.key !== key), env()), new RegExp(key))
  }
  const buildOnly = structuredClone(variables)
  buildOnly.find(entry => entry.key === 'DAILYCLARITY_SALES_PAUSED').scopes = ['builds']
  assert.throws(() => assertRecoveryEnvironment(buildOnly, env()), /DAILYCLARITY_SALES_PAUSED/)
})

test('activation retries only the bounded final catalogue-cache attestation', async () => {
  let attempts = 0
  const waits = []
  const result = await activateWithAttestationRetry(async () => {
    attempts++
    if (attempts < 3) throw new Error('Recovery activation is not yet attested; retain the journal for retry or rollback')
    return { templates: 60 }
  }, { pause: async ms => { waits.push(ms) } })
  assert.equal(result.templates, 60)
  assert.equal(attempts, 3)
  assert.deepEqual(waits, [2_000, 2_000])
})

test('activation never retries changed ownership, unsafe sales flags, or schema errors', async () => {
  for (const message of [
    'Current deployment does not match the durable recovery binding',
    'Sales pause was lost after recovery activation; retain the journal for rollback',
    'Production runtime identity or live database schema is not verified',
  ]) {
    let attempts = 0
    await assert.rejects(activateWithAttestationRetry(async () => {
      attempts++
      throw new Error(message)
    }, { pause: async () => { throw new Error('must not wait') } }), error => error.message === message)
    assert.equal(attempts, 1)
  }
})

test('activation attestation cannot retry indefinitely or report an unproved success', async () => {
  let attempts = 0
  await assert.rejects(activateWithAttestationRetry(async () => {
    attempts++
    throw new Error('Recovery activation is not yet attested; retain the journal for retry or rollback')
  }, { pause: async () => {} }), /not yet attested/)
  assert.equal(attempts, 6)
})
