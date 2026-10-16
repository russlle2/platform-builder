import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { REPOSITORY, hash } from './catalogue-handoff.mjs'
import { assertEvidenceWorkflow, createEvidenceGithub, MAX_DISPATCH_BYTES, uploadReviewedEvidence, validateDispatchInputs, verifyObservationSources } from './upload-connected-evidence.mjs'

const releaseSha = 'a'.repeat(40), digest = 'b'.repeat(64), now = Date.now()
const draftUrl = `https://github.com/${REPOSITORY}/releases/untagged-fixture`
const gates = ['stripe', 'email', 'provisioning', 'previewEditing', 'refundRecovery', 'rollback']
function fixture() {
  const certificate = { version: 1, profile: 'rehab-certified', releaseSha, catalogHash: digest, manifestHash: digest, fullGateHash: digest, sourceCatalogHash: digest, templateEvidenceHash: digest, fileEvidenceHash: digest, sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0, customizationDiagnostics: 0, files: 5486, pages: 5486 }
  const bindings = { releaseSha, catalogHash: digest, manifestHash: digest, certificationHash: canonicalDigest(certificate) }
  const report = { ...bindings, reviewedAt: new Date(now).toISOString(), evidenceUrl: draftUrl, checks: Object.fromEntries(gates.map((gate) => [gate, 'passed'])) }
  const facts = [{ stripeTestPayment: true, signedWebhook: true, orderBound: true, amountMinor: 5900, currency: 'usd' }, { confirmationEmailReceived: true, liveEmailReceived: true, authLogin: true, recipientIndex: 0 }, { orderBound: true, https: true, noindex: true }, { authLogin: true, ownedEditPersisted: true, deliveredContentMatched: true, republishMatched: true }, { fulfillmentFailed: true, fulfillmentRecovered: true, sameOrderAndSite: true, noDuplicateOrder: true, refundConfirmed: true, subscriptionCanceled: true, billingStateConverged: true, signedWebhook: true }, { stagingRollback: true, stagingReapply: true, runtimeVerified: true }]
  const support = { version: 1, ...bindings, observations: gates.map((gate, index) => ({ id: `observation-${index + 1}`, gate, kind: 'browser', executionMode: 'connected-test', scope: 'current', observedAt: new Date(now - 1000).toISOString(), observedReleaseSha: releaseSha, bindingHash: digest, facts: facts[index] })), gateEvidence: Object.fromEntries(gates.map((gate, index) => [gate, [`observation-${index + 1}`]])) }
  const encode = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
  const inputs = () => {
    const reportBytes = encode(report), supportBytes = encode(support)
    return { expected_release_sha: releaseSha, connected_release_id: '10', report_base64: reportBytes.toString('base64'), report_sha256: hash(reportBytes), support_base64: supportBytes.toString('base64'), support_sha256: hash(supportBytes), certificate_base64: encode(certificate).toString('base64') }
  }
  return { report, support, certificate, inputs }
}

test('all three exact reviewed inputs bind to one certificate without modifying report bytes', () => {
  const f = fixture(), inputs = f.inputs()
  const validated = validateDispatchInputs(inputs, { now, draftEvidenceUrl: draftUrl })
  assert.deepEqual(validated.report.value, f.report)
  assert.deepEqual(validated.report.bytes, Buffer.from(inputs.report_base64, 'base64'))
  assert.equal(validated.support.value.observations.length, 6)
  for (const change of [{ report_sha256: '' }, { support_sha256: '' }, { report_sha256: digest }, { support_sha256: digest }, { expected_release_sha: 'c'.repeat(40) }, { connected_release_id: '../10' }, { privateEmail: 'should-never-be-uploaded' }, { certificate_base64: Buffer.from('{}').toString('base64') }]) assert.throws(() => validateDispatchInputs({ ...inputs, ...change }, { now }))
  assert.throws(() => validateDispatchInputs(inputs, { now, draftEvidenceUrl: `${draftUrl}-other` }))
})

test('combined dispatch cap rejects payloads whose individually bounded files together exceed Actions input capacity', () => {
  const inputs = fixture().inputs()
  const padded = (base64, size) => Buffer.from(Buffer.from(base64, 'base64').toString().padEnd(size, ' '))
  const report = padded(inputs.report_base64, 16 * 1024), support = padded(inputs.support_base64, 32 * 1024), certificate = padded(inputs.certificate_base64, 4 * 1024)
  const large = { ...inputs, report_base64: report.toString('base64'), report_sha256: hash(report), support_base64: support.toString('base64'), support_sha256: hash(support), certificate_base64: certificate.toString('base64') }
  assert.ok(Buffer.byteLength(JSON.stringify({ ref: 'main', inputs: large })) > MAX_DISPATCH_BYTES)
  assert.throws(() => validateDispatchInputs(large, { now }), /Combined evidence dispatch/)
})

test('only the reviewed manual evidence workflow may upload', () => {
  const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: REPOSITORY, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: releaseSha, GITHUB_RUN_ID: '2', GITHUB_RUN_ATTEMPT: '1', GITHUB_TOKEN: 'fixture-only', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: `${REPOSITORY}/.github/workflows/upload-connected-evidence.yml@refs/heads/main`, GITHUB_WORKFLOW_SHA: releaseSha }
  assert.equal(assertEvidenceWorkflow(env, fixture().inputs()).workflowSha, releaseSha)
  for (const change of [{ GITHUB_REF: 'refs/pull/1/merge' }, { GITHUB_WORKFLOW_SHA: 'c'.repeat(40) }, { GITHUB_EVENT_NAME: 'push' }, { GITHUB_WORKFLOW_REF: `${REPOSITORY}/.github/workflows/finalize-catalogue.yml@refs/heads/main` }]) assert.throws(() => assertEvidenceWorkflow({ ...env, ...change }, fixture().inputs()))
})

async function uploadFixture() {
  const f = fixture(), root = await mkdtemp(path.join(os.tmpdir(), 'connected-upload-'))
  const release = { id: 10, draft: true, published_at: null, target_commitish: releaseSha, html_url: draftUrl, tag_name: 'exact-reviewed-draft' }
  const assets = [], contents = new Map(), calls = []
  const github = {
    assertMain: async () => { calls.push('main') },
    json: async (resource) => resource.includes('/assets?') ? assets : release,
    upload: async (_releaseId, name, bytes) => {
      calls.push(`upload:${name}`)
      const asset = { id: 20 + assets.length, name, size: bytes.length, digest: `sha256:${hash(bytes)}`, state: 'uploaded' }
      assets.push(asset); contents.set(asset.id, Buffer.from(bytes)); return asset
    },
    download: async (asset, output) => { calls.push(`download:${asset.name}`); const bytes = contents.get(asset.id); await writeFile(output, bytes, { flag: 'wx' }); return { bytes: bytes.length, sha256: hash(bytes) } },
  }
  return { ...f, root, release, assets, calls, github, options: () => ({ github, inputs: f.inputs(), readbackRoot: path.join(root, 'readback'), now: () => now }) }
}

test('support is uploaded and byte-verified before the unchanged report in an initially empty draft', async () => {
  const f = await uploadFixture()
  try {
    const result = await uploadReviewedEvidence(f.options())
    assert.deepEqual(f.calls.filter((call) => call !== 'main'), ['upload:connected-staging-support.json', 'download:connected-staging-support.json', 'upload:connected-staging.json', 'download:connected-staging.json'])
    assert.equal(result.support.assetId, '20'); assert.equal(result.report.assetId, '21')
    assert.equal(result.report.sha256, f.inputs().report_sha256)
    assert.equal(result.providerObservationsIndependentlyVerified, false)
    assert.equal(result.operatorReportChanged, false)
    assert.equal(f.assets.length, 2)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('unreviewed bytes, private fields, foreign drafts and existing names fail before any upload', async () => {
  for (const scenario of ['hash', 'private', 'draft-url', 'published', 'existing-support', 'existing-report', 'existing-unrelated', 'main']) {
    const f = await uploadFixture()
    try {
      const options = f.options()
      if (scenario === 'hash') options.inputs.report_sha256 = digest
      if (scenario === 'private') { f.support.observations[0].facts.email = 'private@example.invalid'; options.inputs = f.inputs() }
      if (scenario === 'draft-url') f.release.html_url = `${draftUrl}-other`
      if (scenario === 'published') f.release.draft = false
      if (scenario.startsWith('existing-')) f.assets.push({ id: 20, name: scenario === 'existing-support' ? 'connected-staging-support.json' : scenario === 'existing-report' ? 'connected-staging.json' : 'catalogue.part-00000', size: 1, state: 'uploaded', digest: null })
      if (scenario === 'main') f.github.assertMain = async () => { throw new Error('main advanced') }
      await assert.rejects(uploadReviewedEvidence(options))
      assert.equal(f.calls.some((call) => call.startsWith('upload:')), false)
    } finally { await rm(f.root, { recursive: true, force: true }) }
  }
})

test('support readback failure, draft mutation, main drift or stale review never uploads the report', async () => {
  for (const scenario of ['readback', 'unexpected-asset', 'main-drift', 'stale-review']) {
    const f = await uploadFixture()
    try {
      const upload = f.github.upload
      f.github.upload = async (...args) => {
        const result = await upload(...args)
        if (scenario === 'unexpected-asset') f.assets.push({ ...result, id: 90, name: 'unexpected.json' })
        if (scenario === 'main-drift') f.github.assertMain = async () => { throw new Error('main advanced') }
        return result
      }
      if (scenario === 'readback') f.github.download = async (_asset, output) => { await writeFile(output, 'different'); return { bytes: 1, sha256: digest } }
      const options = f.options()
      if (scenario === 'stale-review') { let count = 0; options.now = () => ++count <= 3 ? now : now + 25 * 60 * 60_000 }
      await assert.rejects(uploadReviewedEvidence(options))
      assert.equal(f.calls.includes('upload:connected-staging.json'), false)
    } finally { await rm(f.root, { recursive: true, force: true }) }
  }
})

test('retained workflow references require exact successful main attempt, artifact digest and creation window', async () => {
  const f = fixture()
  f.support.observations[0].source = { runId: '90', runAttempt: '2', artifactId: '91', artifactDigest: digest }
  const run = { id: 90, run_attempt: 2, repository: { full_name: REPOSITORY }, head_sha: releaseSha, head_branch: 'main', event: 'workflow_dispatch', path: '.github/workflows/staging-runtime-probe.yml', status: 'completed', conclusion: 'success', run_started_at: new Date(now - 60000).toISOString(), updated_at: new Date(now - 1000).toISOString() }
  const artifact = { id: 91, expired: false, workflow_run: { id: 90, head_sha: releaseSha }, digest: `sha256:${digest}`, created_at: new Date(now - 10000).toISOString() }
  const verify = (r = run, a = artifact) => verifyObservationSources({ json: async (resource) => resource.includes('/attempts/') ? r : a }, f.support)
  assert.equal((await verify())[0].runAttempt, '2')
  for (const change of [{ head_sha: 'c'.repeat(40) }, { run_attempt: 3 }, { head_branch: 'feature' }, { conclusion: 'failure' }, { event: 'pull_request' }, { path: 'https://untrusted.example/workflow' }]) await assert.rejects(verify({ ...run, ...change }))
  for (const change of [{ expired: true }, { id: 92 }, { digest: `sha256:${'c'.repeat(64)}` }, { created_at: new Date(now + 1000).toISOString() }, { workflow_run: { id: 89, head_sha: releaseSha } }]) await assert.rejects(verify(run, { ...artifact, ...change }))
})

test('evidence network client permits only fixed small-asset POSTs and has no publisher methods', async () => {
  const calls = []
  const github = createEvidenceGithub('fixture-only', async (url, options) => { calls.push({ url, options }); return Response.json({ id: 21 }) })
  await github.upload('10', 'connected-staging.json', Buffer.from('{}'))
  assert.equal(calls[0].url, `https://uploads.github.com/repos/${REPOSITORY}/releases/10/assets?name=connected-staging.json`)
  assert.equal(calls[0].options.method, 'POST'); assert.equal(calls[0].options.redirect, 'error')
  for (const name of ['private.env', 'certification.json', '../connected-staging.json', 'catalogue.part-00000']) await assert.rejects(github.upload('10', name, Buffer.from('{}')))
  await assert.rejects(github.upload('10', 'connected-staging.json', Buffer.alloc(16 * 1024 + 1)))
  assert.equal(calls.length, 1)
  for (const method of ['createDraft', 'publish', 'delete', 'dispatch']) assert.equal(github[method], undefined)
})

test('local preflight writes an exclusive bounded dispatch file only after validation and never sends it', async () => {
  const f = fixture(), root = await mkdtemp(path.join(os.tmpdir(), 'connected-preflight-'))
  const script = fileURLToPath(new URL('./upload-connected-evidence.mjs', import.meta.url))
  try {
    for (const [name, value] of Object.entries({ report: f.report, support: f.support, certificate: f.certificate })) await writeFile(path.join(root, `${name}.json`), JSON.stringify(value))
    const output = path.join(root, 'dispatch.json')
    const args = [script, 'validate', '--report', path.join(root, 'report.json'), '--support', path.join(root, 'support.json'), '--certificate', path.join(root, 'certificate.json'), '--release-sha', releaseSha, '--draft-url', draftUrl, '--release-id', '10', '--output', output]
    const stdout = execFileSync(process.execPath, args, { encoding: 'utf8' })
    const result = JSON.parse(stdout), payload = JSON.parse(await readFile(output, 'utf8'))
    assert.equal(result.operation, 'validate'); assert.equal(result.providerPublicationPerformed, false)
    assert.equal(payload.ref, 'main'); assert.equal(payload.inputs.expected_release_sha, releaseSha)
    assert.doesNotMatch(stdout, /report_base64|support_base64|confirmationEmailReceived/)
    assert.throws(() => execFileSync(process.execPath, args, { stdio: 'pipe' }))
    f.support.privateToken = 'must-never-leave-local'; await writeFile(path.join(root, 'support.json'), JSON.stringify(f.support))
    const rejectedOutput = path.join(root, 'rejected.json'); args[args.length - 1] = rejectedOutput
    assert.throws(() => execFileSync(process.execPath, args, { stdio: 'pipe' }))
    await assert.rejects(readFile(rejectedOutput), { code: 'ENOENT' })
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('workflow keeps payloads out of shell/env expansion and existing finalizer contract remains unchanged', async () => {
  const workflow = await readFile(new URL('../../../.github/workflows/upload-connected-evidence.yml', import.meta.url), 'utf8')
  assert.match(workflow, /environment: staging/)
  assert.match(workflow, /group: dailyclarity-catalogue-finalize\n  cancel-in-progress: false/)
  assert.match(workflow, /if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}/)
  assert.match(workflow, /GITHUB_TOKEN: \$\{\{ github.token \}\}/)
  assert.doesNotMatch(workflow, /\$\{\{ inputs\.|secrets\.|--clobber/)
  assert.ok([...workflow.matchAll(/uses: (\S+)/g)].every((match) => /^actions\/(?:checkout|setup-node|upload-artifact)@[a-f0-9]{40}$/.test(match[1])))
  const finalizer = await readFile(new URL('../../../.github/workflows/finalize-catalogue.yml', import.meta.url), 'utf8')
  assert.match(finalizer, /connected_evidence_hash:/)
  assert.match(finalizer, /node apps\/generator-app\/scripts\/catalogue-handoff\.mjs finalize/)
})
