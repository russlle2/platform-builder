import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { proofChildEnvironment, validateV2ProofRecord, withV2ProofStage, v2ProofFailureDetails, retainV2ProofCleanupFailure } from './catalogue-prepare-proof-v2.mjs'
import { V2_SOURCE_SHA } from './catalogue-prepare-closure-v2.mjs'

function fixture() {
  const workflow = { repository: 'russlle2/platform-builder', workflowSha: 'a'.repeat(40), runId: '1234', runAttempt: '1' }
  const closure = { version: 2, sourceSha: V2_SOURCE_SHA, releaseSha: workflow.workflowSha }
  const context = { workflow, closure, verifierHash: 'b'.repeat(64), fingerprintHash: 'c'.repeat(64), nodeVersion: 'v22.0.0' }
  const proof = { version: 2, kind: 'reviewed-retained-catalogue-dependency-proof', workflow, sourceSha: V2_SOURCE_SHA, releaseSha: workflow.workflowSha, closureHash: canonicalDigest(closure), verifierHash: context.verifierHash, nodeVersion: context.nodeVersion, pnpmVersion: '11.19.0', platform: 'linux', arch: 'x64', freshPairedInstall: true, compilerExecuted: false, browserChecksRepeated: false, providerMutations: false, dependencies: { source: { fingerprintHash: context.fingerprintHash }, target: { fingerprintHash: context.fingerprintHash }, runtime: { equal: true, hash: 'd'.repeat(64) } } }
  return { proof, context }
}

test('proof binds original source, current release, verifier, exact runner and unchanged installed closure', () => {
  const { proof, context } = fixture()
  assert.equal(validateV2ProofRecord(proof, context), proof)
})

test('stale, fabricated, partial and foreign V2 observations fail before reuse', async (t) => {
  for (const [label, mutate] of [
    ['old version', (p) => { p.version = 1 }],
    ['another source', (p) => { p.sourceSha = 'e'.repeat(40) }],
    ['another final head', (p) => { p.releaseSha = 'e'.repeat(40) }],
    ['another run attempt', (p) => { p.workflow.runAttempt = '2' }],
    ['changed source proof', (p) => { p.closureHash = 'e'.repeat(64) }],
    ['changed verifier', (p) => { p.verifierHash = 'e'.repeat(64) }],
    ['another node', (p) => { p.nodeVersion = 'v24.0.0' }],
    ['another pnpm', (p) => { p.pnpmVersion = '11.25.0' }],
    ['another platform', (p) => { p.platform = 'win32' }],
    ['stale install', (p) => { p.freshPairedInstall = false }],
    ['false compiler claim', (p) => { p.compilerExecuted = true }],
    ['false browser claim', (p) => { p.browserChecksRepeated = true }],
    ['provider writes', (p) => { p.providerMutations = true }],
    ['changed old package bytes', (p) => { p.dependencies.source.fingerprintHash = 'e'.repeat(64) }],
    ['changed target package bytes', (p) => { p.dependencies.target.fingerprintHash = 'e'.repeat(64) }],
    ['failed runtime equality', (p) => { p.dependencies.runtime.equal = false }],
    ['missing runtime proof', (p) => { delete p.dependencies.runtime }],
  ]) await t.test(label, () => {
    const { proof, context } = fixture(), changed = structuredClone(proof)
    mutate(changed)
    assert.throws(() => validateV2ProofRecord(changed, context))
  })
})

test('probe/install children omit provider secrets while preserving normal proxy and trust settings', () => {
  const child = proofChildEnvironment({ HOME: '/safe/home', PATH: '/safe/bin', HTTPS_PROXY: 'proxy-fixture', NODE_EXTRA_CA_CERTS: '/safe/ca.pem', GITHUB_TOKEN: 'fixture-only', NETLIFY_AUTH_TOKEN: 'fixture-only', STRIPE_SECRET_KEY: 'fixture-only', SUPABASE_SERVICE_ROLE_KEY: 'fixture-only' })
  assert.deepEqual(child, { HOME: '/safe/home', PATH: '/safe/bin', HTTPS_PROXY: 'proxy-fixture', NODE_EXTRA_CA_CERTS: '/safe/ca.pem', CI: 'true', npm_config_userconfig: '/dev/null', npm_config_globalconfig: '/dev/null' })
})

test('ambient package and loader overrides cannot silently alter the paired proof', async (t) => {
  for (const name of ['NODE_OPTIONS', 'NODE_PATH', 'TSX_TSCONFIG_PATH', 'TSX_DISABLE_CACHE', 'ESBUILD_BINARY_PATH', 'PLAYWRIGHT_BROWSERS_PATH', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH', 'NODE_PRESERVE_SYMLINKS', 'PNPM_HOME', 'npm_config_node_options']) await t.test(name, () => {
    assert.throws(() => proofChildEnvironment({ [name]: '' }), /Unexpected ambient dependency loader setting/)
  })
})

test('failure diagnostics expose only fixed phases and known reasons, never child or provider data', async () => {
  const secret = 'private-token-and-provider-url'
  const raw = Object.assign(new Error(secret), { stdout: secret, stderr: secret, env: { TOKEN: secret }, phase: secret, reason: secret })
  for (const error of [raw, null, secret, { message: secret, stdout: secret }]) {
    await assert.rejects(withV2ProofStage('source-install', () => { throw error }), (failure) => {
      assert.deepEqual(v2ProofFailureDetails(failure), { phase: 'source-install', reason: 'unclassified' })
      assert.equal(JSON.stringify(v2ProofFailureDetails(failure)).includes(secret), false)
      return true
    })
  }
  await assert.rejects(withV2ProofStage('paired-dependencies', () => { throw new Error('Retained dependency proof: unfinished installation') }), (failure) => {
    assert.deepEqual(v2ProofFailureDetails(failure), { phase: 'paired-dependencies', reason: 'unfinished_installation' })
    return true
  })
  assert.deepEqual(v2ProofFailureDetails(new Error(`Retained dependency proof: generated wrapper fields are incomplete: ${secret} (1,0)`)), { phase: 'preflight', reason: 'wrapper_fields_incomplete' })
  assert.deepEqual(v2ProofFailureDetails(new SyntaxError(secret)), { phase: 'preflight', reason: 'invalid_metadata_syntax' })
  assert.deepEqual(v2ProofFailureDetails(Object.assign(raw, { status: 1 })), { phase: 'preflight', reason: 'command_failed' })
  assert.deepEqual(v2ProofFailureDetails({ code: 'ETIMEDOUT', message: secret }), { phase: 'preflight', reason: 'operation_timeout' })
  assert.deepEqual(v2ProofFailureDetails({ code: 'ENOENT', message: secret }), { phase: 'preflight', reason: 'missing_file_or_command' })
  await assert.rejects(withV2ProofStage(secret, () => {}), /Unknown V2 proof phase/)
})

test('cleanup diagnostics preserve the primary failure without exporting either raw exception', async () => {
  let primary, cleanup
  try { await withV2ProofStage('paired-dependencies', () => { throw new Error('Retained dependency proof: non-Next installed bytes or resolution topology changed') }) } catch (error) { primary = error }
  try { await withV2ProofStage('paired-cleanup', () => { throw Object.assign(new Error('private cleanup stderr'), { status: 128 }) }) } catch (error) { cleanup = error }
  assert.deepEqual(v2ProofFailureDetails(retainV2ProofCleanupFailure(primary, cleanup)), {
    phase: 'paired-dependencies', reason: 'installed_pair_differs',
    cleanup: { phase: 'paired-cleanup', reason: 'command_failed' },
  })
  assert.equal(await withV2ProofStage('proof-validation', () => 'verified'), 'verified')
})
