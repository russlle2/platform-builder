import { assertDeployedRuntime } from './deployed-runtime-contract.mjs'
import { readFileSync } from 'node:fs'

const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
const SHA = /^[a-f0-9]{40}$/
const HASH = /^[a-f0-9]{64}$/
const REF = /^[a-z0-9]{20}$/
const launchContract = JSON.parse(readFileSync(new URL('../src/lib/templates/launch-catalog-contract.json', import.meta.url), 'utf8'))
if (launchContract.totalTemplates !== 60 || !HASH.test(launchContract.templateIdentitySha256) || !HASH.test(launchContract.curatedReportSha256)) throw new Error('Runtime report launch contract is invalid.')
export const LAUNCH_RUNTIME_APPROVAL = Object.freeze({
  templateCount: 60, catalogHash: launchContract.templateIdentitySha256,
  curatedReportHash: launchContract.curatedReportSha256,
})
const REPORT_KEYS = [
  'reportVersion', 'kind', 'environment', 'observedAt', 'origin', 'source',
  'deploymentSiteId', 'deploymentReleaseSha', 'supabaseProjectRef',
  'supabaseSchemaVersion', 'bookingKitSchemaVersion', 'supabaseSchemaReady',
  'templateCheckoutReady', 'fulfillmentReady', 'emailReady', 'templateCatalogReady',
  'templateCatalogProfile', 'templateCatalogHash', 'templateManifestHash',
  'templateCuratedReportHash', 'catalogProofScope', 'full5486Certification',
  'templateCertificationHash', 'templateCatalogueReleaseSha',
  'publishedTemplateCount', 'expectedTemplateCount', 'missingRequirementCount',
]
const BOOL_FIELDS = ['supabaseSchemaReady', 'templateCheckoutReady', 'fulfillmentReady', 'emailReady', 'templateCatalogReady']

function requireValue(condition, code) {
  // Never interpolate response data into a diagnostic: it may contain secrets.
  if (!condition) throw new Error(`Runtime report rejected: ${code}.`)
}

export function stagingProbeOrigin(hostname) {
  requireValue(typeof hostname === 'string' && /^[a-z0-9][a-z0-9-]+\.netlify\.app$/.test(hostname), 'staging_origin')
  return `https://${hostname}`
}

function exactKeys(value, keys, code) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), code)
  requireValue(Object.keys(value).sort().join(',') === [...keys].sort().join(','), code)
}

function validateSource(source) {
  if (source?.kind === 'github-actions') {
    exactKeys(source, ['kind', 'repository', 'workflow', 'runId', 'runAttempt', 'workflowSha'], 'source_fields')
    requireValue(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repository ?? ''), 'source_repository')
    requireValue(source.workflow === '.github/workflows/staging-runtime-probe.yml', 'source_workflow')
    requireValue(/^[1-9][0-9]*$/.test(source.runId ?? '') && /^[1-9][0-9]*$/.test(source.runAttempt ?? ''), 'source_run')
    requireValue(SHA.test(source.workflowSha ?? ''), 'source_sha')
  } else {
    exactKeys(source, ['kind'], 'source_fields')
    requireValue(source.kind === 'direct', 'source_kind')
  }
}

function validateShape(report) {
  exactKeys(report, REPORT_KEYS, 'fields')
  requireValue(report.reportVersion === 2 && report.kind === 'dailyclarity-staging-runtime-probe' && report.environment === 'staging', 'version_or_environment')
  requireValue(typeof report.observedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(report.observedAt) && Number.isFinite(Date.parse(report.observedAt)), 'timestamp')
  let origin
  try { origin = new URL(report.origin) } catch { throw new Error('Runtime report rejected: origin.') }
  requireValue(report.origin === stagingProbeOrigin(origin.hostname), 'origin')
  requireValue(ID.test(report.deploymentSiteId ?? '') && SHA.test(report.deploymentReleaseSha ?? '') && REF.test(report.supabaseProjectRef ?? ''), 'identity_shape')
  requireValue(/^\d{8}\.\d+$/.test(report.supabaseSchemaVersion ?? '') && /^\d{8}\.\d+$/.test(report.bookingKitSchemaVersion ?? ''), 'schema_shape')
  for (const field of BOOL_FIELDS) requireValue(typeof report[field] === 'boolean', 'readiness_shape')
  requireValue(['rehab-staging', 'launch'].includes(report.templateCatalogProfile), 'catalog_profile')
  for (const field of ['templateCatalogHash', 'templateManifestHash']) requireValue(HASH.test(report[field] ?? ''), 'catalog_hash')
  requireValue(report.templateCuratedReportHash === null || HASH.test(report.templateCuratedReportHash ?? ''), 'curated_report_hash')
  requireValue(report.catalogProofScope === (report.templateCatalogProfile === 'launch' ? 'launch60-runtime-readiness-only' : 'rehab5486-runtime-readiness-only'), 'catalog_scope')
  requireValue(report.full5486Certification === false, 'certification_scope')
  requireValue(report.templateCertificationHash === null || HASH.test(report.templateCertificationHash ?? ''), 'certification_hash')
  requireValue(report.templateCatalogueReleaseSha === null || SHA.test(report.templateCatalogueReleaseSha ?? ''), 'catalog_release')
  requireValue(report.templateCertificationHash === null && report.templateCatalogueReleaseSha === null, 'unexpected_certified_catalog_evidence')
  for (const field of ['publishedTemplateCount', 'expectedTemplateCount', 'missingRequirementCount']) requireValue(Number.isSafeInteger(report[field]) && report[field] >= 0 && report[field] <= 100_000, 'count_shape')
  validateSource(report.source)
}

/** Select known scalar fields; never spread the endpoint response or provider details. */
export function createRuntimeReport(readiness, { origin, observedAt = new Date().toISOString(), source = { kind: 'direct' } }) {
  requireValue(Array.isArray(readiness?.missingRequirements), 'missing_requirements_shape')
  const report = {
    reportVersion: 2,
    kind: 'dailyclarity-staging-runtime-probe',
    environment: 'staging',
    observedAt,
    origin,
    source: source.kind === 'github-actions' ? {
      kind: source.kind, repository: source.repository, workflow: source.workflow,
      runId: source.runId, runAttempt: source.runAttempt, workflowSha: source.workflowSha,
    } : { kind: source.kind },
    deploymentSiteId: readiness.deploymentSiteId,
    deploymentReleaseSha: readiness.deploymentReleaseSha,
    supabaseProjectRef: readiness.supabaseProjectRef,
    supabaseSchemaVersion: readiness.supabaseSchemaVersion,
    bookingKitSchemaVersion: readiness.bookingKitSchemaVersion,
    supabaseSchemaReady: readiness.supabaseSchemaReady,
    templateCheckoutReady: readiness.templateCheckoutReady,
    fulfillmentReady: readiness.fulfillmentReady,
    emailReady: readiness.emailReady,
    templateCatalogReady: readiness.templateCatalogReady,
    templateCatalogProfile: readiness.templateCatalogProfile,
    templateCatalogHash: readiness.templateCatalogHash,
    templateManifestHash: readiness.templateManifestHash,
    templateCuratedReportHash: readiness.templateCuratedReportHash ?? null,
    catalogProofScope: readiness.templateCatalogProfile === 'launch' ? 'launch60-runtime-readiness-only' : 'rehab5486-runtime-readiness-only',
    full5486Certification: false,
    templateCertificationHash: readiness.templateCertificationHash ?? null,
    templateCatalogueReleaseSha: readiness.templateCatalogueReleaseSha ?? null,
    publishedTemplateCount: readiness.publishedTemplateCount,
    expectedTemplateCount: readiness.expectedTemplateCount,
    missingRequirementCount: readiness.missingRequirements.length,
  }
  validateShape(report)
  return report
}

/** A report's provenance comes from its protected Actions artifact, not its JSON alone. */
export function assertRuntimeReport(report, expected, { now = Date.now(), maxAgeMs = 15 * 60_000 } = {}) {
  validateShape(report)
  requireValue(report.origin === expected.origin, 'expected_origin')
  requireValue(Number.isFinite(now) && maxAgeMs > 0 && maxAgeMs <= 15 * 60_000, 'clock_configuration')
  const age = now - Date.parse(report.observedAt)
  requireValue(age >= -30_000 && age <= maxAgeMs, 'stale_or_future')
  assertDeployedRuntime(report, {
    siteId: expected.siteId, projectRef: expected.projectRef, releaseSha: expected.releaseSha,
  })
  // The default remains the complete staging catalog. Never infer the selected
  // profile or expected hashes from the report that is being verified.
  const profile = expected.catalogProfile ?? 'rehab-staging'
  requireValue(['rehab-staging', 'launch'].includes(profile) && report.templateCatalogProfile === profile, 'expected_catalog_profile')
  const count = profile === 'launch' ? LAUNCH_RUNTIME_APPROVAL.templateCount : 5486
  requireValue((expected.templateCount ?? count) === count && report.publishedTemplateCount === count && report.expectedTemplateCount === count, 'expected_catalog_count')
  for (const [field, value] of Object.entries({ templateCatalogHash: expected.catalogHash, templateManifestHash: expected.manifestHash })) {
    requireValue(typeof value === 'string' && HASH.test(value) && report[field] === value, 'expected_catalog_hash')
  }
  if (profile === 'launch') {
    requireValue(report.templateCatalogHash === LAUNCH_RUNTIME_APPROVAL.catalogHash, 'approved_launch_identity')
    requireValue(expected.curatedReportHash === LAUNCH_RUNTIME_APPROVAL.curatedReportHash && report.templateCuratedReportHash === expected.curatedReportHash, 'approved_launch_report')
  } else {
    requireValue(report.templateCuratedReportHash === null && (expected.curatedReportHash == null), 'unexpected_launch_report')
  }
  for (const field of BOOL_FIELDS) requireValue(report[field] === true, 'runtime_not_ready')
  requireValue(report.missingRequirementCount === 0, 'missing_requirements')
  if (expected.github) {
    requireValue(report.source.kind === 'github-actions', 'github_source_required')
    for (const field of ['repository', 'runId', 'runAttempt', 'workflowSha']) {
      requireValue(typeof expected.github[field] === 'string' && report.source[field] === expected.github[field], 'github_provenance')
    }
  }
  return report
}
