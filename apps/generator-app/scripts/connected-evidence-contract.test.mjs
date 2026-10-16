import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { decodeReviewedBase64, validateReviewedEvidence, EVIDENCE_GATES } from './connected-evidence-contract.mjs'

const releaseSha = 'a'.repeat(40), historicalSha = 'b'.repeat(40), digest = 'c'.repeat(64)
const now = Date.parse('2026-10-16T12:00:00.000Z')
const draftEvidenceUrl = 'https://github.com/russlle2/platform-builder/releases/tag/dc-evidence-fixture'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const certificate = () => ({ version: 1, profile: 'rehab-certified', releaseSha, catalogHash: digest, manifestHash: digest, fullGateHash: digest, sourceCatalogHash: digest, templateEvidenceHash: digest, fileEvidenceHash: digest, sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0, customizationDiagnostics: 0, files: 5486, pages: 33963 })
function fixture() {
  const cert = certificate()
  const report = { releaseSha, catalogHash: digest, manifestHash: digest, certificationHash: canonicalDigest(cert), reviewedAt: new Date(now).toISOString(), evidenceUrl: draftEvidenceUrl, checks: Object.fromEntries(EVIDENCE_GATES.map((gate) => [gate, 'passed'])) }
  const facts = [{ stripeTestPayment: true, signedWebhook: true, orderBound: true, amountMinor: 100, currency: 'usd' }, { confirmationEmailReceived: true, liveEmailReceived: true, authLogin: true, messageType: 'confirmation', recipientIndex: 0 }, { orderBound: true, https: true, noindex: true, orderCount: 1, siteCount: 1 }, { authLogin: true, ownedEditPersisted: true, deliveredContentMatched: true, republishMatched: true, foreignAccessDenied: true, previewHash: digest, deliveredHash: digest }, { fulfillmentFailed: true, fulfillmentRecovered: true, sameOrderAndSite: true, noDuplicateOrder: true, refundConfirmed: true, subscriptionCanceled: true, billingStateConverged: true, signedWebhook: true }, { stagingRollback: true, stagingReapply: true, runtimeVerified: true }]
  const support = { version: 1, releaseSha, catalogHash: digest, manifestHash: digest, certificationHash: report.certificationHash, observations: EVIDENCE_GATES.map((gate, index) => ({ id: `observation-${index + 1}`, gate, kind: gate === 'email' ? 'inbox' : gate === 'previewEditing' ? 'browser' : 'provider', executionMode: 'connected-test', scope: 'current', observedAt: '2026-10-16T11:59:00Z', observedReleaseSha: releaseSha, bindingHash: digest, facts: facts[index] })), gateEvidence: Object.fromEntries(EVIDENCE_GATES.map((gate, index) => [gate, [`observation-${index + 1}`]])) }
  return { report, certificate: cert, support, releaseSha, draftEvidenceUrl, now }
}
function addSupplement(f, changes = {}) {
  const value = { ...structuredClone(f.support.observations[0]), id: 'observation-7', kind: 'browser', executionMode: 'no-stripe-simulation', facts: { stripeTestPayment: false, signedWebhook: false, orderBound: true }, ...changes }
  f.support.observations.push(value)
  return value
}

test('decoding preserves exactly reviewed UTF-8 bytes and validates the raw hash', () => {
  const bytes = Buffer.from(' {"note":"Unicode ✓", "value": 1}\n')
  const decoded = decodeReviewedBase64(bytes.toString('base64'), { maximumBytes: bytes.length, expectedHash: hash(bytes) })
  assert.deepEqual(decoded.bytes, bytes)
  assert.deepEqual(decoded.value, { note: 'Unicode ✓', value: 1 })
  assert.deepEqual(decodeReviewedBase64(bytes.toString('base64'), { maximumBytes: 100 }).bytes, bytes)
  assert.throws(() => decodeReviewedBase64(bytes.toString('base64'), { maximumBytes: bytes.length - 1, expectedHash: hash(bytes) }), /oversized|bounded/)
  assert.throws(() => decodeReviewedBase64(bytes.toString('base64'), { maximumBytes: 100, expectedHash: digest }), /SHA-256 differs/)
})

test('decoder rejects ambiguous base64, malformed UTF-8/JSON, duplicate keys and scalar roots', () => {
  const valid = Buffer.from('{}'), options = { maximumBytes: 1000, expectedHash: hash(valid) }
  for (const value of ['', 'e30', 'e30=\n', ' e30=', 'e30===', 'e3_=', 'e3-=', 'e31=']) assert.throws(() => decodeReviewedBase64(value, options))
  for (const bytes of [Buffer.from([0xff, 0xfe]), Buffer.from('{"x":1,}'), Buffer.from('[]'), Buffer.from('null'), Buffer.from('"private string"'), Buffer.from('\ufeff{}'), Buffer.from('{"x":"overwritten-private-value","x":1}'), Buffer.from('{"x":1,"\\u0078":2}'), Buffer.from('{"nested":[{"x":1,"x":2}]}'), Buffer.from('{"deep":' + '['.repeat(18) + '0' + ']'.repeat(18) + '}')]) {
    assert.throws(() => decodeReviewedBase64(bytes.toString('base64'), { maximumBytes: 1000, expectedHash: hash(bytes) }))
  }
  for (const changes of [{ maximumBytes: 0 }, { maximumBytes: 1.5 }, { expectedHash: null }, { expectedHash: '' }, { expectedHash: `sha256:${digest}` }, { expectedHash: digest.toUpperCase() }]) assert.throws(() => decodeReviewedBase64('e30=', { ...options, ...changes }))
})

test('validation returns the unchanged reviewed objects and preserves false observations', () => {
  const f = fixture(), original = structuredClone(f)
  f.support.observations[4].facts.fulfillmentRecovered = false
  f.support.observations.push({ ...structuredClone(f.support.observations[4]), id: 'observation-7', observedAt: '2026-10-16T11:59:30Z', facts: { fulfillmentRecovered: true } })
  f.support.gateEvidence.refundRecovery.push('observation-7')
  const originalSupport = structuredClone(f.support)
  const returned = validateReviewedEvidence(f)
  assert.equal(returned.report, f.report)
  assert.equal(returned.certificate, f.certificate)
  assert.equal(returned.support, f.support)
  assert.equal(returned.support.observations[4].facts.fulfillmentRecovered, false)
  assert.deepEqual(returned.report, original.report)
  assert.deepEqual(returned.support, originalSupport)
})

test('historical connected observations retain their original identity as unselected context only', () => {
  const f = fixture(), observation = addSupplement(f, { executionMode: 'connected-test', scope: 'historical', observedReleaseSha: historicalSha, observedAt: '2025-01-02T03:04:05.123Z', source: { runId: '123', runAttempt: '1', artifactId: '456', artifactDigest: digest } })
  assert.equal(validateReviewedEvidence(f).support.observations[6].observedAt, '2025-01-02T03:04:05.123Z')
  f.support.gateEvidence.stripe.push(observation.id)
  assert.throws(() => validateReviewedEvidence(f), /current-release/)
  f.support.gateEvidence.stripe.pop()
  observation.observedReleaseSha = releaseSha
  assert.throws(() => validateReviewedEvidence(f), /scope/)
})

test('strict UTC timestamps preserve original high precision and reject normalized or future dates', () => {
  const f = fixture(), observation = addSupplement(f, { executionMode: 'connected-test', scope: 'historical', observedReleaseSha: historicalSha })
  for (const timestamp of ['2026-10-15T23:52:55.678444+00:00', '2026-10-15T23:52:55.6784444Z', '2026-10-15T23:52:55.678444444Z']) {
    observation.observedAt = timestamp
    assert.equal(validateReviewedEvidence(f).support.observations[6].observedAt, timestamp)
  }
  for (const timestamp of ['2026-02-30T23:52:55.678444+00:00', '2026-10-15T23:52:55+01:00', '2026-10-15T23:52:55.6784444444Z', '2026-10-16T12:05:00.000000001Z']) {
    observation.observedAt = timestamp
    assert.throws(() => validateReviewedEvidence(f), /timestamp/)
  }
})

test('optional account separation, editing and save-recovery facts retain their observed results', () => {
  const f = fixture()
  Object.assign(f.support.observations[1].facts, { stripeReceiptReceived: true, accountEmailReceivedMessages: true, publicContactEmailNotUsedForAccountMessages: true })
  Object.assign(f.support.observations[3].facts, { textEditPersisted: true, imageEditPersisted: true, customThemePersisted: false, privateAccountEmailUsedForSignIn: true, publicContactEmailVisible: true, privateAccountEmailAbsentFromPublicHtml: true, saveFailureShown: true, retrySavedChanges: true })
  const original = structuredClone(f.support)
  assert.deepEqual(validateReviewedEvidence(f).support, original)
})

test('payment simulation may retain real observed delivery/editing facts without selecting them as release proof', () => {
  const f = fixture(), observation = addSupplement(f, { gate: 'previewEditing', facts: { deliveredContentMatched: true, republishMatched: true, deliveredHash: digest } })
  assert.equal(validateReviewedEvidence(f).support.observations[6].facts.deliveredContentMatched, true)
  f.support.gateEvidence.previewEditing.push(observation.id)
  assert.throws(() => validateReviewedEvidence(f), /current-release/)
})

test('certificate, report and support must bind the same exact current release and draft', async (t) => {
  const mutations = [
    ['extra certificate data', (f) => { f.certificate.privateData = 'private' }],
    ['incomplete certificate', (f) => { delete f.certificate.fullGateHash }],
    ['wrong certificate SHA', (f) => { f.certificate.releaseSha = historicalSha }],
    ['invalid certificate total', (f) => { f.certificate.certifiedTemplates = 60 }],
    ['different draft', (f) => { f.report.evidenceUrl += '-other' }],
    ['run URL', (f) => { f.report.evidenceUrl = f.draftEvidenceUrl = 'https://github.com/russlle2/platform-builder/actions/runs/123' }],
    ['query in draft URL', (f) => { f.report.evidenceUrl = f.draftEvidenceUrl += '?secret=x' }],
    ['foreign draft', (f) => { f.report.evidenceUrl = f.draftEvidenceUrl = 'https://github.com/other/repo/releases/tag/evidence' }],
    ['unfinished attestation', (f) => { f.report.checks.email = 'pending' }],
    ['stale attestation', (f) => { f.report.reviewedAt = '2026-10-14T12:00:00Z' }],
    ['private report field', (f) => { f.report.inbox = 'private@example.invalid' }],
    ...['releaseSha', 'catalogHash', 'manifestHash', 'certificationHash'].map((key) => [`support ${key}`, (f) => { f.support[key] = key === 'releaseSha' ? historicalSha : 'd'.repeat(64) }]),
    ['extra support data', (f) => { f.support.body = 'private body' }],
    ['unknown support version', (f) => { f.support.version = 2 }],
  ]
  for (const [name, change] of mutations) await t.test(name, () => { const f = fixture(); change(f); assert.throws(() => validateReviewedEvidence(f)) })
})

test('observation identity, timestamp, scope and provider provenance fields are bounded', async (t) => {
  const mutations = [
    ['private identifier', (o) => { o.id = 'customer@example.invalid' }],
    ['oversized numeric identifier', (o) => { o.id = 'observation-15551234567' }],
    ['missing field', (o) => { delete o.bindingHash }],
    ['raw provider ID', (o) => { o.orderId = 'cs_test_private' }],
    ['wrong current SHA', (o) => { o.observedReleaseSha = historicalSha }],
    ['wrong historical SHA', (o) => { o.scope = 'historical' }],
    ['bad binding hash', (o) => { o.bindingHash = 'raw order ID' }],
    ['unknown kind', (o) => { o.kind = 'local-test' }],
    ['unknown mode', (o) => { o.executionMode = 'production' }],
    ['unknown gate', (o) => { o.gate = 'localTests' }],
    ['invalid calendar date', (o) => { o.observedAt = '2026-02-30T00:00:00Z' }],
    ['future time', (o) => { o.observedAt = '2026-10-16T12:05:00.001Z' }],
    ['ambiguous time', (o) => { o.observedAt = 'October 16, 2026' }],
    ['private source URL', (o) => { o.source = { runId: '123', runAttempt: '1', artifactId: '456', artifactDigest: digest, url: 'https://private.invalid' } }],
    ['numeric source number', (o) => { o.source = { runId: 123, runAttempt: '1', artifactId: '456', artifactDigest: digest } }],
    ['unsafe source integer', (o) => { o.source = { runId: '9007199254740992', runAttempt: '1', artifactId: '456', artifactDigest: digest } }],
  ]
  for (const [name, change] of mutations) await t.test(name, () => { const f = fixture(); change(f.support.observations[0]); assert.throws(() => validateReviewedEvidence(f)) })
})

test('facts accept only gate-specific known scalar data and require an actual observation', async (t) => {
  const mutations = [
    ['raw inbox', { stripeTestPayment: true, email: 'private@example.invalid' }],
    ['raw response', { stripeTestPayment: true, response: { private: true } }],
    ['coerced boolean', { stripeTestPayment: 'true' }],
    ['fractional amount', { stripeTestPayment: true, amountMinor: 0.1 }],
    ['negative amount', { stripeTestPayment: true, amountMinor: -1 }],
    ['unsafe count', { stripeTestPayment: true, amountMinor: Number.MAX_SAFE_INTEGER + 1 }],
    ['unknown currency shape', { stripeTestPayment: true, currency: 'USD' }],
    ['wrong gate fact', { confirmationEmailReceived: true }],
    ['counts only', { amountMinor: 100, currency: 'usd' }],
    ['empty facts', {}],
    ['array facts', [true]],
  ]
  for (const [name, facts] of mutations) await t.test(name, () => { const f = fixture(); f.support.observations[0].facts = facts; assert.throws(() => validateReviewedEvidence(f)) })
  const f = fixture(); Object.assign(f.support.observations[1].facts, { messageType: 'auth', recipientIndex: 1 })
  assert.doesNotThrow(() => validateReviewedEvidence(f))
  f.support.observations[1].facts.recipientIndex = 2
  assert.throws(() => validateReviewedEvidence(f), /recipient index/)
})

test('every minimum gate fact must be observed true in selected current connected evidence', async (t) => {
  const required = {
    stripe: ['stripeTestPayment', 'signedWebhook', 'orderBound'],
    email: ['confirmationEmailReceived', 'liveEmailReceived', 'authLogin'],
    provisioning: ['orderBound', 'https', 'noindex'],
    previewEditing: ['authLogin', 'ownedEditPersisted', 'deliveredContentMatched', 'republishMatched'],
    refundRecovery: ['fulfillmentFailed', 'fulfillmentRecovered', 'sameOrderAndSite', 'noDuplicateOrder', 'refundConfirmed', 'subscriptionCanceled', 'billingStateConverged', 'signedWebhook'],
    rollback: ['stagingRollback', 'stagingReapply', 'runtimeVerified'],
  }
  for (const [gate, fields] of Object.entries(required)) {
    for (const key of fields) await t.test(`${gate}.${key}`, () => {
      for (const mutation of ['missing', 'false']) {
        const f = fixture(), observation = f.support.observations.find((item) => item.gate === gate)
        if (mutation === 'missing') delete observation.facts[key]
        else observation.facts[key] = false
        assert.throws(() => validateReviewedEvidence(f), /required observed fact/)
      }
    })
  }
  for (const amount of [undefined, 0]) {
    const f = fixture()
    if (amount === undefined) delete f.support.observations[0].facts.amountMinor
    else f.support.observations[0].facts.amountMinor = amount
    assert.throws(() => validateReviewedEvidence(f), /positive payment amount/)
  }
})

test('unrelated positive facts and message types cannot replace required positive gate observations', () => {
  for (const facts of [{ stripeTestPayment: false, signedWebhook: false, orderBound: true, amountMinor: 100 }, { stripeTestPayment: false, signedWebhook: false, orderBound: false, amountMinor: 100 }]) {
    const f = fixture(); f.support.observations[0].facts = facts
    assert.throws(() => validateReviewedEvidence(f), /required observed fact/)
  }
  for (const facts of [{ confirmationEmailReceived: false, liveEmailReceived: false, authLogin: true, accountEmailReceivedMessages: true, publicContactEmailNotUsedForAccountMessages: true }, { messageType: 'confirmation', recipientIndex: 0 }]) {
    const f = fixture(); f.support.observations[1].facts = facts
    assert.throws(() => validateReviewedEvidence(f), /required observed fact/)
  }
})

test('selected observations cannot substantially postdate review, including at sub-millisecond boundaries', () => {
  const f = fixture()
  f.report.reviewedAt = '2026-10-16T11:00:00Z'
  assert.throws(() => validateReviewedEvidence(f), /after the report review/)
  f.report.reviewedAt = '2026-10-16T11:55:00.123456789Z'
  f.support.observations[0].observedAt = '2026-10-16T12:00:00.123456789+00:00'
  assert.doesNotThrow(() => validateReviewedEvidence(f))
  f.support.observations[0].observedAt = '2026-10-16T12:00:00.123456790Z'
  assert.throws(() => validateReviewedEvidence(f), /after the report review/)
})

test('simulations and source review remain supplementary and cannot assert provider execution', () => {
  const f = fixture(), simulation = addSupplement(f)
  assert.doesNotThrow(() => validateReviewedEvidence(f))
  for (const key of ['stripeTestPayment', 'signedWebhook']) {
    simulation.facts[key] = true
    assert.throws(() => validateReviewedEvidence(f), /Simulation/)
    simulation.facts[key] = false
  }
  simulation.kind = 'provider'
  assert.throws(() => validateReviewedEvidence(f), /Simulation/)
  simulation.kind = 'browser'
  f.support.gateEvidence.stripe = [simulation.id]
  assert.throws(() => validateReviewedEvidence(f), /current-release/)
  f.support.gateEvidence.stripe.unshift('observation-1')
  assert.throws(() => validateReviewedEvidence(f), /current-release/)
  f.support.gateEvidence.stripe = ['observation-1']
  Object.assign(simulation, { kind: 'source-review', executionMode: 'source-review', facts: { sourceClosureVerified: true, sourceClosureHash: digest } })
  assert.doesNotThrow(() => validateReviewedEvidence(f))
  delete simulation.facts.sourceClosureHash
  assert.throws(() => validateReviewedEvidence(f), /source closure/)
  simulation.facts = { sourceClosureVerified: false }
  assert.doesNotThrow(() => validateReviewedEvidence(f))
  simulation.facts.refundConfirmed = false
  assert.throws(() => validateReviewedEvidence(f), /outside its gate and execution mode/)
  simulation.facts = { sourceClosureVerified: false }; simulation.kind = 'workflow'
  assert.throws(() => validateReviewedEvidence(f), /must agree/)
})

test('inbox observations require connected email evidence and simulations cannot claim refunds', () => {
  const f = fixture()
  f.support.observations[0].kind = 'inbox'
  assert.throws(() => validateReviewedEvidence(f), /Inbox/)
  f.support.observations[0].kind = 'provider'
  f.support.observations[1].executionMode = 'no-stripe-simulation'
  assert.throws(() => validateReviewedEvidence(f), /Simulation/)
  f.support.observations[1].executionMode = 'connected-test'
  addSupplement(f, { gate: 'refundRecovery', facts: { fulfillmentFailed: true, refundConfirmed: true } })
  assert.throws(() => validateReviewedEvidence(f), /Simulation/)
})

test('workflow observations require the exact source tuple that the uploader verifies independently', () => {
  const f = fixture(), observation = f.support.observations[5]
  observation.kind = 'workflow'
  assert.throws(() => validateReviewedEvidence(f), /Workflow evidence requires/)
  observation.source = { runId: '123', runAttempt: '1', artifactId: '456', artifactDigest: digest }
  assert.doesNotThrow(() => validateReviewedEvidence(f))
  delete observation.source.artifactId
  assert.throws(() => validateReviewedEvidence(f), /exact numeric workflow/)
})

test('six gate mappings reject missing, duplicated, foreign, mismatched or unsupported references', async (t) => {
  const mutations = [
    ['no observations', (f) => { f.support.observations = [] }],
    ['too many observations', (f) => { f.support.observations = Array(65).fill(f.support.observations[0]) }],
    ['duplicate observation ID', (f) => { f.support.observations[1].id = 'observation-1' }],
    ['missing gate', (f) => { delete f.support.gateEvidence.stripe }],
    ['extra gate', (f) => { f.support.gateEvidence.localTests = ['observation-1'] }],
    ['empty gate', (f) => { f.support.gateEvidence.stripe = [] }],
    ['duplicated reference', (f) => { f.support.gateEvidence.stripe = ['observation-1', 'observation-1'] }],
    ['missing reference', (f) => { f.support.gateEvidence.stripe = ['observation-64'] }],
    ['wrong gate', (f) => { f.support.gateEvidence.stripe = ['observation-2'] }],
    ['source review alone', (f) => { const o = f.support.observations[0]; Object.assign(o, { kind: 'source-review', executionMode: 'source-review', facts: { sourceClosureVerified: false } }) }],
  ]
  for (const [name, change] of mutations) await t.test(name, () => { const f = fixture(); change(f); assert.throws(() => validateReviewedEvidence(f)) })
})
