import { createHash } from 'node:crypto'
import { canonicalDigest, validateCertification } from '../src/lib/templates/certified-catalog-contract.mjs'
import { validateConnectedReport } from './catalogue-handoff.mjs'

const HASH = /^[a-f0-9]{64}$/
const SHA = /^[a-f0-9]{40}$/
const SOURCE_ID = /^[1-9][0-9]{0,15}$/
const OBSERVATION_ID = /^observation-(?:[1-9]|[1-5][0-9]|6[0-4])$/
const DRAFT_URL = /^https:\/\/github\.com\/russlle2\/platform-builder\/releases\/[A-Za-z0-9/_-]+$/
export const EVIDENCE_GATES = Object.freeze(['stripe', 'email', 'provisioning', 'previewEditing', 'refundRecovery', 'rollback'])
const KINDS = new Set(['provider', 'browser', 'inbox', 'workflow', 'source-review'])
const MODES = new Set(['connected-test', 'no-stripe-simulation', 'source-review'])
const CERTIFICATE_FIELDS = ['version', 'profile', 'releaseSha', 'catalogHash', 'manifestHash', 'fullGateHash', 'sourceCatalogHash', 'templateEvidenceHash', 'fileEvidenceHash', 'sourceTemplates', 'certifiedTemplates', 'neutralFallbacks', 'customizationDiagnostics', 'files', 'pages']
const SUPPORT_FIELDS = ['version', 'releaseSha', 'catalogHash', 'manifestHash', 'certificationHash', 'observations', 'gateEvidence']
const OBSERVATION_FIELDS = ['id', 'gate', 'kind', 'executionMode', 'scope', 'observedAt', 'observedReleaseSha', 'bindingHash', 'facts']
const BOOLEAN_FACTS = new Set(['stripeTestPayment', 'signedWebhook', 'orderBound', 'confirmationEmailReceived', 'liveEmailReceived', 'stripeReceiptReceived', 'authLogin', 'ownedEditPersisted', 'deliveredContentMatched', 'republishMatched', 'foreignAccessDenied', 'https', 'noindex', 'fulfillmentFailed', 'fulfillmentRecovered', 'sameOrderAndSite', 'noDuplicateOrder', 'refundConfirmed', 'subscriptionCanceled', 'billingStateConverged', 'stagingRollback', 'stagingReapply', 'runtimeVerified', 'sourceClosureVerified', 'accountEmailReceivedMessages', 'publicContactEmailNotUsedForAccountMessages', 'textEditPersisted', 'imageEditPersisted', 'customThemePersisted', 'privateAccountEmailUsedForSignIn', 'publicContactEmailVisible', 'privateAccountEmailAbsentFromPublicHtml', 'saveFailureShown', 'retrySavedChanges'])
const COUNT_FACTS = new Set(['amountMinor', 'orderCount', 'siteCount'])
const HASH_FACTS = new Set(['previewHash', 'deliveredHash', 'sourceClosureHash'])
const MESSAGE_TYPES = new Set(['confirmation', 'live', 'auth', 'stripe-receipt'])
const GATE_FACTS = {
  stripe: new Set(['stripeTestPayment', 'signedWebhook', 'orderBound', 'amountMinor', 'currency']),
  email: new Set(['confirmationEmailReceived', 'liveEmailReceived', 'stripeReceiptReceived', 'authLogin', 'messageType', 'recipientIndex', 'accountEmailReceivedMessages', 'publicContactEmailNotUsedForAccountMessages']),
  provisioning: new Set(['orderBound', 'https', 'noindex', 'orderCount', 'siteCount']),
  previewEditing: new Set(['authLogin', 'ownedEditPersisted', 'deliveredContentMatched', 'republishMatched', 'foreignAccessDenied', 'previewHash', 'deliveredHash', 'textEditPersisted', 'imageEditPersisted', 'customThemePersisted', 'privateAccountEmailUsedForSignIn', 'publicContactEmailVisible', 'privateAccountEmailAbsentFromPublicHtml', 'saveFailureShown', 'retrySavedChanges']),
  refundRecovery: new Set(['fulfillmentFailed', 'fulfillmentRecovered', 'sameOrderAndSite', 'noDuplicateOrder', 'refundConfirmed', 'subscriptionCanceled', 'billingStateConverged', 'signedWebhook', 'orderBound', 'amountMinor', 'orderCount', 'siteCount', 'currency']),
  rollback: new Set(['stagingRollback', 'stagingReapply', 'runtimeVerified']),
}
const SOURCE_FACTS = new Set(['sourceClosureVerified', 'sourceClosureHash'])
const MINIMUM_GATE_FACTS = {
  stripe: ['stripeTestPayment', 'signedWebhook', 'orderBound'],
  email: ['confirmationEmailReceived', 'liveEmailReceived', 'authLogin'],
  provisioning: ['orderBound', 'https', 'noindex'],
  previewEditing: ['authLogin', 'ownedEditPersisted', 'deliveredContentMatched', 'republishMatched'],
  refundRecovery: ['fulfillmentFailed', 'fulfillmentRecovered', 'sameOrderAndSite', 'noDuplicateOrder', 'refundConfirmed', 'subscriptionCanceled', 'billingStateConverged', 'signedWebhook'],
  rollback: ['stagingRollback', 'stagingReapply', 'runtimeVerified'],
}

function requireThat(condition, message) { if (!condition) throw new Error(message) }
function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value))
}
function exactKeys(value, fields) {
  return object(value) && Reflect.ownKeys(value).length === fields.length
    && Reflect.ownKeys(value).every((key) => typeof key === 'string' && fields.includes(key))
}
function matches(pattern, value) { return typeof value === 'string' && pattern.test(value) }

// JSON.parse discards earlier duplicate keys. Reject them before any original
// bytes can be retained, including escaped spellings of the same property.
function assertUniqueJsonKeys(text) {
  const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/g) ?? []
  let cursor = 0
  const consume = (depth) => {
    requireThat(depth <= 16, 'Reviewed JSON nesting exceeds the evidence schema')
    const token = tokens[cursor++]
    if (token === '{') {
      const keys = new Set()
      while (tokens[cursor] !== '}') {
        const key = JSON.parse(tokens[cursor++])
        requireThat(!keys.has(key), 'Reviewed JSON contains duplicate object keys')
        keys.add(key)
        cursor++ // Colon; JSON.parse has already checked the full grammar.
        consume(depth + 1)
        if (tokens[cursor] !== ',') break
        cursor++
      }
      cursor++
    } else if (token === '[') {
      while (tokens[cursor] !== ']') {
        consume(depth + 1)
        if (tokens[cursor] !== ',') break
        cursor++
      }
      cursor++
    }
  }
  consume(0)
  requireThat(cursor === tokens.length, 'Reviewed JSON structure could not be verified')
}

/**
 * Decode exact reviewed bytes; no whitespace, URL-safe alphabet or repair.
 * Report/support require their supplied raw hash. A certificate may omit it
 * here because validateReviewedEvidence checks its approved canonical digest.
 */
export function decodeReviewedBase64(value, { maximumBytes, expectedHash } = {}) {
  requireThat(Number.isSafeInteger(maximumBytes) && maximumBytes > 0 && (expectedHash === undefined || matches(HASH, expectedHash)), 'Reviewed input size or SHA-256 is invalid')
  requireThat(typeof value === 'string' && value.length > 0 && value.length <= Math.ceil(maximumBytes / 3) * 4
    && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value), 'Reviewed input must be bounded canonical base64')
  const bytes = Buffer.from(value, 'base64')
  requireThat(bytes.length <= maximumBytes && bytes.toString('base64') === value, 'Reviewed input is oversized or noncanonical base64')
  if (expectedHash !== undefined) requireThat(createHash('sha256').update(bytes).digest('hex') === expectedHash, 'Reviewed input SHA-256 differs from approval')
  let text, parsed
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    parsed = JSON.parse(text)
  } catch { throw new Error('Reviewed input must be valid UTF-8 JSON') }
  requireThat(object(parsed), 'Reviewed input must be a JSON object')
  assertUniqueJsonKeys(text)
  return { bytes, value: parsed }
}

function validateTimestamp(value, now) {
  const parts = typeof value === 'string' && /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(?:Z|\+00:00)$/.exec(value)
  const timestamp = parts ? Date.parse(value) : NaN
  const fraction = parts?.[2] ?? '', latest = now + 5 * 60_000
  requireThat(Number.isFinite(timestamp) && new Date(timestamp).toISOString() === `${parts?.[1]}.${fraction.slice(0, 3).padEnd(3, '0')}Z`
    && (timestamp < latest || timestamp === latest && !/[1-9]/.test(fraction.slice(3))), 'Evidence timestamp must be a real UTC ISO time no more than five minutes ahead')
}

// Called only after strict timestamp validation. Preserve sub-millisecond
// precision when comparing original observation times to the review boundary.
function timestampNanoseconds(value) {
  const fraction = /\.(\d{1,9})/.exec(value)?.[1] ?? ''
  return BigInt(Date.parse(value)) * 1_000_000n + BigInt(fraction.slice(3).padEnd(6, '0'))
}

function validateFacts(observation) {
  const { facts, executionMode, gate } = observation
  requireThat(object(facts) && Reflect.ownKeys(facts).length > 0, 'Evidence facts must be a nonempty object')
  const allowed = executionMode === 'source-review' ? SOURCE_FACTS : GATE_FACTS[gate]
  let hasObservation = false
  for (const key of Reflect.ownKeys(facts)) {
    requireThat(typeof key === 'string' && allowed.has(key), 'Evidence contains an unknown fact or a fact outside its gate and execution mode')
    const value = facts[key]
    if (BOOLEAN_FACTS.has(key)) {
      requireThat(typeof value === 'boolean', 'Evidence boolean fact has the wrong type')
      hasObservation = true
    } else if (COUNT_FACTS.has(key)) {
      requireThat(Number.isSafeInteger(value) && value >= 0, 'Evidence count must be a nonnegative safe integer')
    } else if (HASH_FACTS.has(key)) {
      requireThat(matches(HASH, value), 'Evidence fact hash must be a lowercase SHA-256')
    } else if (key === 'recipientIndex') {
      requireThat(value === 0 || value === 1, 'Evidence recipient index must be zero or one')
    } else if (key === 'messageType') {
      requireThat(MESSAGE_TYPES.has(value), 'Evidence message type is unsupported')
      hasObservation = true
    } else if (key === 'currency') requireThat(matches(/^[a-z]{3}$/, value), 'Evidence currency must be a three-letter lowercase code')
  }
  requireThat(hasObservation, 'Evidence must contain an observed boolean or message type, not only hashes and counts')
  if (executionMode === 'no-stripe-simulation') {
    requireThat(!['stripeTestPayment', 'signedWebhook', 'refundConfirmed'].some((key) => facts[key] === true), 'Simulation cannot assert a real Stripe payment, webhook or refund')
  }
  if (executionMode === 'source-review' && facts.sourceClosureVerified === true) {
    requireThat(matches(HASH, facts.sourceClosureHash), 'Verified source closure requires its SHA-256')
  }
}

function validateObservation(observation, releaseSha, now) {
  requireThat(exactKeys(observation, OBSERVATION_FIELDS) || exactKeys(observation, [...OBSERVATION_FIELDS, 'source']), 'Evidence observation contains missing or unknown fields')
  requireThat(matches(OBSERVATION_ID, observation.id) && EVIDENCE_GATES.includes(observation.gate)
    && KINDS.has(observation.kind) && MODES.has(observation.executionMode), 'Evidence observation identity or classification is invalid')
  requireThat(['current', 'historical'].includes(observation.scope) && matches(SHA, observation.observedReleaseSha)
    && (observation.scope === 'current' ? observation.observedReleaseSha === releaseSha : observation.observedReleaseSha !== releaseSha), 'Evidence scope must preserve the actual observed release SHA')
  requireThat(matches(HASH, observation.bindingHash), 'Evidence binding must be an opaque SHA-256')
  validateTimestamp(observation.observedAt, now)
  requireThat((observation.kind === 'source-review') === (observation.executionMode === 'source-review'), 'Source review kind and execution mode must agree')
  if (observation.executionMode === 'no-stripe-simulation') requireThat(['browser', 'workflow'].includes(observation.kind), 'Simulation cannot be provider or inbox evidence')
  if (observation.kind === 'inbox') requireThat(observation.gate === 'email' && observation.executionMode === 'connected-test', 'Inbox evidence requires a connected email observation')
  if (observation.kind === 'workflow') requireThat(Object.hasOwn(observation, 'source'), 'Workflow evidence requires its exact source run, attempt and artifact identity')
  if (Object.hasOwn(observation, 'source')) {
    const source = observation.source
    requireThat(exactKeys(source, ['runId', 'runAttempt', 'artifactId', 'artifactDigest'])
      && ['runId', 'runAttempt', 'artifactId'].every((key) => matches(SOURCE_ID, source[key]) && Number.isSafeInteger(Number(source[key])))
      && matches(HASH, source.artifactDigest), 'Evidence source must contain only exact numeric workflow/artifact IDs and a SHA-256')
  }
  validateFacts(observation)
}

/**
 * Validate reviewed assertions without converting observations into passes.
 * Historical observations retain their original SHA and timestamp. Simulation
 * mode describes the payment path: real delivery/editing results may still be
 * recorded honestly in that mode. Historical, simulated and source-review
 * observations remain unselected context; every selected gate observation must
 * come from an actual connected test of this exact current release.
 */
export function validateReviewedEvidence({ report, certificate, support, releaseSha, draftEvidenceUrl, now = Date.now() }) {
  requireThat(matches(SHA, releaseSha) && Number.isSafeInteger(now), 'Reviewed release identity and clock are required')
  requireThat(exactKeys(certificate, CERTIFICATE_FIELDS), 'Certification must contain exactly its existing public contract fields')
  validateCertification(certificate, { releaseSha })
  requireThat(matches(DRAFT_URL, draftEvidenceUrl) && report?.evidenceUrl === draftEvidenceUrl, 'Connected evidence must identify this exact unpublished draft URL')
  validateConnectedReport(report, certificate, now, draftEvidenceUrl)
  validateTimestamp(report.reviewedAt, now)
  const latestReviewedObservation = timestampNanoseconds(report.reviewedAt) + 300_000_000_000n
  requireThat(exactKeys(support, SUPPORT_FIELDS) && support.version === 1, 'Supporting evidence must contain exactly the sanitized version-one fields')
  requireThat(support.releaseSha === releaseSha && support.catalogHash === report.catalogHash && support.manifestHash === report.manifestHash
    && support.certificationHash === report.certificationHash && support.certificationHash === canonicalDigest(certificate), 'Supporting evidence hashes do not match the reviewed report and certificate')
  requireThat(Array.isArray(support.observations) && support.observations.length > 0 && support.observations.length <= 64, 'Supporting evidence requires at most 64 observations')
  const observations = new Map()
  for (const observation of support.observations) {
    validateObservation(observation, releaseSha, now)
    requireThat(!observations.has(observation.id), 'Supporting evidence observation IDs must be unique')
    observations.set(observation.id, observation)
  }
  requireThat(exactKeys(support.gateEvidence, EVIDENCE_GATES), 'Supporting evidence must map exactly the six release gates')
  for (const gate of EVIDENCE_GATES) {
    const ids = support.gateEvidence[gate]
    requireThat(Array.isArray(ids) && ids.length > 0 && ids.length <= 64 && new Set(ids).size === ids.length
      && ids.every((id) => matches(OBSERVATION_ID, id) && observations.get(id)?.gate === gate), 'Gate evidence must reference distinct existing observations from that same gate')
    requireThat(ids.every((id) => {
      const observation = observations.get(id)
      return observation.executionMode === 'connected-test' && observation.scope === 'current' && observation.observedReleaseSha === releaseSha
    }), 'Selected gate evidence requires current-release connected-test observations; historical, simulation and source review stay unselected')
    const selected = ids.map((id) => observations.get(id))
    requireThat(selected.every((observation) => timestampNanoseconds(observation.observedAt) <= latestReviewedObservation), 'Selected evidence was observed after the report review time and allowed five-minute clock skew')
    requireThat(MINIMUM_GATE_FACTS[gate].every((key) => selected.some((observation) => observation.facts[key] === true)), `Selected ${gate} evidence lacks a required observed fact`)
    if (gate === 'stripe') requireThat(selected.some((observation) => observation.facts.amountMinor > 0), 'Selected Stripe evidence requires an observed positive payment amount')
  }
  return { report, certificate, support }
}
