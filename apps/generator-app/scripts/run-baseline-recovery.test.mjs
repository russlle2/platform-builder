import test from 'node:test'
import assert from 'node:assert/strict'
import { recoveryConfiguration, orchestrateRecovery, assertRecoveryEnvironment, activateWithAttestationRetry } from './run-baseline-recovery.mjs'
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
  assert.deepEqual(h.events, ['read-journal', 'validate-journal', 'save-journal', 'check-release', 'check-future', 'bind', 'activate'])
  h.deps.head = 'c'.repeat(40)
  await assert.rejects(orchestrateRecovery(h.config, h.deps), /exact journal release commit/)
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
