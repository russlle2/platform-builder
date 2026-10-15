#!/usr/bin/env node
import { assertDeployedRuntime } from './deployed-runtime-contract.mjs'
import { writeFile } from 'node:fs/promises'
import { assertRuntimeReport, createRuntimeReport, stagingProbeOrigin } from './deployed-runtime-report.mjs'

let phase = 'configuration'
async function main() {
  const hostname = process.env.NETLIFY_EXPECTED_SITE_HOSTNAME?.trim().toLowerCase()
  const expectedSiteId = process.env.NETLIFY_EXPECTED_SITE_ID?.trim().toLowerCase()
  const expectedProjectRef = process.env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF?.trim().toLowerCase()
  const expectedReleaseSha = process.env.NETLIFY_EXPECTED_RELEASE_SHA?.trim().toLowerCase()
  const adminToken = process.env.INTERNAL_ADMIN_TOKEN?.trim()
  const reportPath = process.env.RUNTIME_PROBE_REPORT_PATH?.trim()
  const catalogProfile = process.env.NETLIFY_EXPECTED_CATALOG_PROFILE?.trim() || 'rehab-staging'
  const catalogHash = process.env.NETLIFY_EXPECTED_CATALOG_HASH?.trim()
  const manifestHash = process.env.NETLIFY_EXPECTED_MANIFEST_HASH?.trim()
  const curatedReportHash = process.env.NETLIFY_EXPECTED_CURATED_REPORT_HASH?.trim() || null

  if (!hostname || !expectedSiteId || !expectedProjectRef || !expectedReleaseSha || !adminToken) {
    throw new Error('Deployed-runtime attestation configuration is incomplete.')
  }

  // A pinned bare DNS hostname cannot smuggle a token into another URL component.
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(hostname)) throw new Error('Invalid deployed-runtime hostname.')
  if (reportPath && process.env.DEPLOY_ENVIRONMENT !== 'staging') throw new Error('Runtime reports require the staging environment.')
  const origin = reportPath ? stagingProbeOrigin(hostname) : `https://${hostname}`
  phase = 'request_runtime_status'
  const response = await fetch(`${origin}/api/integrations/status`, {
    headers: {
      authorization: `Bearer ${adminToken}`,
      accept: 'application/json',
    },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    phase = `http_${response.status}`
    throw new Error(`Deployed runtime attestation failed (${response.status}).`)
  }

  phase = 'decode_runtime_status'
  const readiness = await response.json()
  phase = 'verify_runtime_identity_and_schema'
  assertDeployedRuntime(readiness, { siteId: expectedSiteId, projectRef: expectedProjectRef, releaseSha: expectedReleaseSha,
    ...(!reportPath ? { catalogProfile: process.env.NETLIFY_EXPECTED_CATALOG_PROFILE, catalogHash,
      manifestHash, certificationHash: process.env.NETLIFY_EXPECTED_CERTIFICATION_HASH } : {}) })

  if (reportPath) {
    phase = 'verify_report_and_workflow_identity'
    if (process.env.GITHUB_ACTIONS === 'true' && (
      process.env.GITHUB_REF !== 'refs/heads/main' ||
      process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
      process.env.GITHUB_WORKFLOW_REF !== `${process.env.GITHUB_REPOSITORY}/.github/workflows/staging-runtime-probe.yml@refs/heads/main`
    )) throw new Error('Runtime report must come from the protected staging probe workflow.')
    const source = process.env.GITHUB_ACTIONS === 'true' ? {
      kind: 'github-actions', repository: process.env.GITHUB_REPOSITORY,
      workflow: '.github/workflows/staging-runtime-probe.yml',
      runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT,
      workflowSha: process.env.GITHUB_SHA,
    } : { kind: 'direct' }
    const report = createRuntimeReport(readiness, { origin, source })
    assertRuntimeReport(report, { origin, siteId: expectedSiteId, projectRef: expectedProjectRef, releaseSha: expectedReleaseSha,
      catalogProfile, catalogHash, manifestHash, curatedReportHash })
    phase = 'write_sanitized_report'
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600, flag: 'wx' })
    console.log('[runtime-gate] Wrote the sanitized staging runtime report.')
  }

  console.log(
    `[runtime-gate] Verified Netlify site ${expectedSiteId} against Supabase ${expectedProjectRef} at schema ${readiness.supabaseSchemaVersion}.`,
  )
}

await main().catch(() => {
  // Provider bodies and JSON parse errors may contain private configuration.
  console.error(`[runtime-gate] Deployed runtime verification failed at ${phase}. No raw response or credentials were retained.`)
  process.exitCode = 1
})
