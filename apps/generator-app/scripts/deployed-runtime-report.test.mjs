import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { assertRuntimeReport, createRuntimeReport, stagingProbeOrigin, LAUNCH_RUNTIME_APPROVAL } from './deployed-runtime-report.mjs'

const now = Date.parse('2026-10-15T01:00:00.000Z')
const expected = {
  origin: 'https://dailyclarity-isolated-test.netlify.app',
  siteId: '123e4567-e89b-42d3-a456-426614174000',
  projectRef: 'a'.repeat(20), releaseSha: 'b'.repeat(40),
  catalogHash: 'd'.repeat(64), manifestHash: 'e'.repeat(64),
}
const source = { kind: 'github-actions', repository: 'russlle2/platform-builder', workflow: '.github/workflows/staging-runtime-probe.yml', runId: '12345', runAttempt: '1', workflowSha: 'c'.repeat(40) }
const readiness = {
  deploymentSiteId: expected.siteId, deploymentReleaseSha: expected.releaseSha,
  supabaseProjectRef: expected.projectRef, supabaseSchemaVersion: '20260903.4',
  bookingKitSchemaVersion: '20260925.2', supabaseSchemaReady: true,
  templateCheckoutReady: true, fulfillmentReady: true, emailReady: true,
  templateCatalogReady: true, templateCatalogProfile: 'rehab-staging',
  templateCatalogHash: 'd'.repeat(64), templateManifestHash: 'e'.repeat(64),
  templateCertificationHash: null, templateCatalogueReleaseSha: null,
  publishedTemplateCount: 5486, expectedTemplateCount: 5486, missingRequirements: [],
}
const report = (changes = {}) => createRuntimeReport({ ...readiness, ...changes }, { origin: expected.origin, source, observedAt: new Date(now).toISOString() })

test('actual endpoint fields become a minimal report with matching deployment and Actions provenance', () => {
  const value = report()
  assert.equal(assertRuntimeReport(value, { ...expected, github: source }, { now }), value)
  assert.equal(value.templateCatalogHash, readiness.templateCatalogHash)
  assert.equal(value.publishedTemplateCount, 5486)
  assert.equal(value.catalogProofScope, 'rehab5486-runtime-readiness-only')
  assert.equal(value.full5486Certification, false)
})

test('launch60 requires deliberate selection, exact approved identity/report and independently pinned active manifest', () => {
  const launch = report({
    templateCatalogProfile: 'launch', publishedTemplateCount: 60, expectedTemplateCount: 60,
    templateCatalogHash: LAUNCH_RUNTIME_APPROVAL.catalogHash,
    templateCuratedReportHash: LAUNCH_RUNTIME_APPROVAL.curatedReportHash,
  })
  const selected = { ...expected, catalogProfile: 'launch', templateCount: 60,
    catalogHash: LAUNCH_RUNTIME_APPROVAL.catalogHash, curatedReportHash: LAUNCH_RUNTIME_APPROVAL.curatedReportHash }
  assert.equal(assertRuntimeReport(launch, selected, { now }), launch)
  assert.equal(launch.catalogProofScope, 'launch60-runtime-readiness-only')
  assert.equal(launch.full5486Certification, false)
  assert.throws(() => assertRuntimeReport(launch, expected, { now }), /expected_catalog_profile/)
  for (const changes of [
    { catalogHash: undefined }, { manifestHash: undefined }, { manifestHash: 'f'.repeat(64) },
    { curatedReportHash: undefined }, { curatedReportHash: 'f'.repeat(64) }, { templateCount: 5486 },
  ]) assert.throws(() => assertRuntimeReport(launch, { ...selected, ...changes }, { now }))
  for (const changes of [
    { templateCatalogHash: 'f'.repeat(64) }, { templateCuratedReportHash: null },
    { templateCuratedReportHash: 'f'.repeat(64) }, { publishedTemplateCount: 59 },
    { expectedTemplateCount: 5486 }, { full5486Certification: true },
    { templateCertificationHash: 'f'.repeat(64) }, { templateCatalogueReleaseSha: expected.releaseSha },
    { catalogProofScope: 'rehab5486-runtime-readiness-only' },
  ]) assert.throws(() => assertRuntimeReport({ ...launch, ...changes }, selected, { now }))
  // Matching arbitrary values cannot replace the checked-in launch approval.
  assert.throws(() => assertRuntimeReport({ ...launch, templateCatalogHash: 'f'.repeat(64) }, { ...selected, catalogHash: 'f'.repeat(64) }, { now }), /approved_launch_identity/)
})

test('default full catalog still needs all5486 templates and separately expected active hashes', () => {
  assert.throws(() => assertRuntimeReport(report({ publishedTemplateCount: 60, expectedTemplateCount: 60 }), expected, { now }), /expected_catalog_count/)
  assert.throws(() => assertRuntimeReport(report(), { ...expected, catalogHash: undefined }, { now }), /expected_catalog_hash/)
  assert.throws(() => assertRuntimeReport(report(), { ...expected, manifestHash: 'f'.repeat(64) }, { now }), /expected_catalog_hash/)
  assert.throws(() => assertRuntimeReport(report({ templateCertificationHash: 'f'.repeat(64) }), expected, { now }), /unexpected_certified_catalog_evidence/)
})

test('response/provider extras and missing-requirement contents never enter the report', () => {
  const sensitive = 'PRIVATE-ADMIN-TOKEN-OR-PROVIDER-DETAIL'
  const value = report({ integrations: [{ detail: sensitive }], adminToken: sensitive, secret: sensitive, readinessBasis: sensitive, templateCatalogIssues: [sensitive], missingRequirements: [sensitive] })
  assert.equal(JSON.stringify(value).includes(sensitive), false)
  assert.equal(value.missingRequirementCount, 1)
  assert.throws(() => assertRuntimeReport(value, expected, { now }), /missing_requirements/)
  assert.throws(() => createRuntimeReport({ ...readiness, templateCatalogHash: sensitive }, { origin: expected.origin }), /catalog_hash/)
  assert.throws(() => assertRuntimeReport({ ...report(), integrations: [{ detail: sensitive }] }, expected, { now }), /fields/)
  assert.throws(() => assertRuntimeReport({ ...report(), source: { ...source, secret: sensitive } }, expected, { now }), /source_fields/)
})

test('wrong origin, site, database, commit, workflow, or run cannot authorize the harness', () => {
  for (const changes of [
    { origin: 'https://other.netlify.app' }, { siteId: '999e4567-e89b-42d3-a456-426614174000' },
    { projectRef: 'z'.repeat(20) }, { releaseSha: 'f'.repeat(40) },
    { github: { ...source, runId: '98765' } }, { github: { ...source, repository: 'foreign/repo' } },
    { github: { ...source, runAttempt: '2' } }, { github: { ...source, workflowSha: 'f'.repeat(40) } },
  ]) assert.throws(() => assertRuntimeReport(report(), { ...expected, ...changes }, { now }))
  assert.throws(() => assertRuntimeReport({ ...report(), source: { ...source, workflow: '.github/workflows/foreign.yml' } }, expected, { now }))
  assert.throws(() => assertRuntimeReport({ ...report(), source: { kind: 'direct' } }, { ...expected, github: source }, { now }), /github_source_required/)
})

test('expired reports, future timestamps, unsafe origins, and widened validity are rejected', () => {
  assert.throws(() => assertRuntimeReport(report(), expected, { now: now + 900_001 }), /stale_or_future/)
  assert.throws(() => assertRuntimeReport(report(), expected, { now: now - 30_001 }), /stale_or_future/)
  assert.throws(() => assertRuntimeReport(report(), expected, { now, maxAgeMs: 900_001 }), /clock_configuration/)
  for (const origin of ['http://dailyclarity-isolated-test.netlify.app', `${expected.origin}/`, `${expected.origin}?token=secret`, 'https://secret@dailyclarity-isolated-test.netlify.app', 'https://dailyclarity.org']) {
    assert.throws(() => assertRuntimeReport({ ...report(), origin }, { ...expected, origin }, { now }))
  }
  assert.throws(() => stagingProbeOrigin('dailyclarity-isolated-test.netlify.app/steal'))
})

test('actual unready status, old schema, or partial catalog cannot be presented as ready', () => {
  for (const changes of [
    { templateCheckoutReady: false }, { fulfillmentReady: false }, { emailReady: false },
    { supabaseSchemaReady: false }, { templateCatalogReady: false }, { publishedTemplateCount: 10 },
    { expectedTemplateCount: 10 }, { supabaseSchemaVersion: '20260903.3' },
    { templateCatalogProfile: 'rehab-certified', templateCertificationHash: 'f'.repeat(64), templateCatalogueReleaseSha: expected.releaseSha },
  ]) assert.throws(() => assertRuntimeReport(report(changes), expected, { now }))
})

test('probe writes only a fresh sanitized report; malformed provider bodies never leak', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'dc-runtime-report-'))
  try {
    const mockPath = path.join(directory, 'fetch.mjs')
    const reportPath = path.join(directory, 'report.json')
    const sentinel = 'PRIVATE-CREDENTIAL-SHOULD-NEVER-BE-EXPORTED'
    await writeFile(mockPath, `globalThis.fetch = async (url, options) => {
      if (url !== 'https://dailyclarity-isolated-test.netlify.app/api/integrations/status' || options.redirect !== 'error' || options.headers.authorization !== 'Bearer ${sentinel}') throw new Error('mock_probe_contract');
      return new Response(process.env.PROBE_FIXTURE_BODY, { status: 200 });
    }`)
    const script = fileURLToPath(new URL('./verify-deployed-runtime.mjs', import.meta.url))
    const env = {
      ...process.env, GITHUB_ACTIONS: 'false', DEPLOY_ENVIRONMENT: 'staging',
      INTERNAL_ADMIN_TOKEN: sentinel, NETLIFY_EXPECTED_SITE_HOSTNAME: new URL(expected.origin).hostname,
      NETLIFY_EXPECTED_SITE_ID: expected.siteId, NETLIFY_EXPECTED_SUPABASE_PROJECT_REF: expected.projectRef,
      NETLIFY_EXPECTED_RELEASE_SHA: expected.releaseSha, RUNTIME_PROBE_REPORT_PATH: reportPath,
      NETLIFY_EXPECTED_CATALOG_PROFILE: '', NETLIFY_EXPECTED_CATALOG_HASH: expected.catalogHash,
      NETLIFY_EXPECTED_MANIFEST_HASH: expected.manifestHash, NETLIFY_EXPECTED_CERTIFICATION_HASH: '',
      NETLIFY_EXPECTED_CURATED_REPORT_HASH: '',
      PROBE_FIXTURE_BODY: JSON.stringify({ ...readiness, integrations: [{ detail: sentinel }], secret: sentinel }),
    }
    const success = spawnSync(process.execPath, ['--import', mockPath, script], { env, encoding: 'utf8' })
    assert.equal(success.status, 0, success.stderr)
    const written = await readFile(reportPath, 'utf8')
    assert.equal(`${written}${success.stdout}${success.stderr}`.includes(sentinel), false)
    assertRuntimeReport(JSON.parse(written), expected)
    const launchPath = path.join(directory, 'launch.json')
    const launchReadiness = { ...readiness, templateCatalogProfile: 'launch', publishedTemplateCount: 60, expectedTemplateCount: 60,
      templateCatalogHash: LAUNCH_RUNTIME_APPROVAL.catalogHash, templateCuratedReportHash: LAUNCH_RUNTIME_APPROVAL.curatedReportHash }
    const launchProbe = spawnSync(process.execPath, ['--import', mockPath, script], {
      env: { ...env, RUNTIME_PROBE_REPORT_PATH: launchPath, NETLIFY_EXPECTED_CATALOG_PROFILE: 'launch',
        NETLIFY_EXPECTED_CATALOG_HASH: LAUNCH_RUNTIME_APPROVAL.catalogHash,
        NETLIFY_EXPECTED_CURATED_REPORT_HASH: LAUNCH_RUNTIME_APPROVAL.curatedReportHash,
        PROBE_FIXTURE_BODY: JSON.stringify(launchReadiness) }, encoding: 'utf8',
    })
    assert.equal(launchProbe.status, 0, launchProbe.stderr)
    assert.equal(JSON.parse(await readFile(launchPath, 'utf8')).catalogProofScope, 'launch60-runtime-readiness-only')
    const production = spawnSync(process.execPath, ['--import', mockPath, script], {
      env: { ...env, RUNTIME_PROBE_REPORT_PATH: '', DEPLOY_ENVIRONMENT: 'production', NETLIFY_EXPECTED_CATALOG_PROFILE: 'rehab-certified',
        NETLIFY_EXPECTED_CERTIFICATION_HASH: 'f'.repeat(64), PROBE_FIXTURE_BODY: JSON.stringify({ ...readiness,
          templateCatalogProfile: 'rehab-certified', templateCertificationHash: 'f'.repeat(64), templateCatalogueReleaseSha: expected.releaseSha }) }, encoding: 'utf8',
    })
    assert.equal(production.status, 0, production.stderr)
    const rejected = spawnSync(process.execPath, ['--import', mockPath, script], {
      env: { ...env, RUNTIME_PROBE_REPORT_PATH: path.join(directory, 'bad.json'), PROBE_FIXTURE_BODY: sentinel }, encoding: 'utf8',
    })
    assert.equal(rejected.status, 1)
    assert.equal(`${rejected.stdout}${rejected.stderr}`.includes(sentinel), false)
    await assert.rejects(readFile(path.join(directory, 'bad.json')), { code: 'ENOENT' })
  } finally { await rm(directory, { recursive: true, force: true }) }
})
