import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { probeEmailHealth, verifyEmailHealth } from './verify-email-health.mjs'
import { createRuntimeReport, LAUNCH_RUNTIME_APPROVAL } from './deployed-runtime-report.mjs'

const runtime = { origin: 'https://dailyclarity-staging.netlify.app', deploymentSiteId: '11111111-2222-3333-4444-555555555555', deploymentReleaseSha: 'a'.repeat(40) }
const token = 'PRIVATE-ADMIN-FIXTURE'
const healthy = { authenticated: true, deliveryType: 'Live', smtpEnabled: false, serverId: 123, configuredSenderPresent: true }
const probe = fetchImpl => probeEmailHealth({ runtime, runtimeReportSha256: 'b'.repeat(64), adminToken: token, fetchImpl })

test('the read-only API connection probe is pinned, token-safe, and does not require SMTP or claim delivery', async () => {
  const report = await probe(async (url, options) => {
    assert.equal(url, `${runtime.origin}/api/integrations/email`)
    assert.equal(options.headers.authorization, `Bearer ${token}`)
    assert.equal(options.redirect, 'error')
    assert.equal(options.cache, 'no-store')
    return Response.json(healthy)
  })
  assert.equal(report.connectionReadyForAuthHook, true)
  assert.equal(report.smtpEnabled, false)
  assert.equal(report.senderAuthorizationVerified, false)
  assert.equal(report.deliveryVerified, false)
  assert.equal(JSON.stringify(report).includes(token), false)
})

test('sandbox, absent sender, provider failure, and malformed bodies cannot establish hook readiness', async () => {
  for (const body of [{ ...healthy, deliveryType: 'Sandbox' }, { ...healthy, configuredSenderPresent: false },
    { ...healthy, ApiTokens: [token] }, { ...healthy, serverId: token }, { ...healthy, authenticated: token }, null, []]) {
    const report = await probe(async () => Response.json(body))
    assert.equal(report.connectionReadyForAuthHook, false)
    assert.equal(JSON.stringify(report).includes(token), false)
  }
  const unavailable = { authenticated: false, deliveryType: null, smtpEnabled: null, serverId: null, configuredSenderPresent: true }
  const failed = await probe(async () => Response.json(unavailable, { status: 502 }))
  assert.equal(failed.failure, 'provider-unavailable')
  assert.equal(failed.configuredSenderPresent, true)
})

test('credentials and private transport bodies are discarded on denial, timeout, or response parsing failure', async () => {
  for (const fetchImpl of [async () => { throw new Error(token) }, async () => new Response(token),
    async () => new Response(token, { status: 403 })]) {
    const report = await probe(fetchImpl)
    assert.equal(report.connectionReadyForAuthHook, false)
    assert.equal(JSON.stringify(report).includes(token), false)
  }
})

test('a changed or stale runtime identity prevents any email API request or report write', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'email-health-'))
  try {
    const record = createRuntimeReport({
      ...runtime, supabaseProjectRef: 'a'.repeat(20), supabaseSchemaVersion: '20260903.4', bookingKitSchemaVersion: '20260925.2',
      supabaseSchemaReady: true, templateCheckoutReady: true, fulfillmentReady: true, emailReady: true, templateCatalogReady: true,
      templateCatalogProfile: 'launch', templateCatalogHash: LAUNCH_RUNTIME_APPROVAL.catalogHash, templateManifestHash: 'c'.repeat(64),
      templateCuratedReportHash: LAUNCH_RUNTIME_APPROVAL.curatedReportHash, publishedTemplateCount: 60, expectedTemplateCount: 60, missingRequirements: [],
    }, { origin: runtime.origin })
    const input = path.join(directory, 'runtime.json'), output = path.join(directory, 'health.json')
    await writeFile(input, JSON.stringify(record))
    const env = {
      DEPLOY_ENVIRONMENT: 'staging', INTERNAL_ADMIN_TOKEN: token, RUNTIME_PROBE_REPORT_PATH: input, EMAIL_HEALTH_REPORT_PATH: output,
      NETLIFY_EXPECTED_SITE_HOSTNAME: new URL(runtime.origin).hostname, NETLIFY_EXPECTED_SITE_ID: runtime.deploymentSiteId,
      NETLIFY_EXPECTED_SUPABASE_PROJECT_REF: record.supabaseProjectRef, NETLIFY_EXPECTED_RELEASE_SHA: runtime.deploymentReleaseSha,
      NETLIFY_EXPECTED_CATALOG_PROFILE: 'launch', NETLIFY_EXPECTED_CATALOG_HASH: record.templateCatalogHash,
      NETLIFY_EXPECTED_MANIFEST_HASH: record.templateManifestHash, NETLIFY_EXPECTED_CURATED_REPORT_HASH: record.templateCuratedReportHash,
    }
    let requests = 0
    const dependencies = { fetchImpl: async () => { requests++; return Response.json(healthy) } }
    await assert.rejects(verifyEmailHealth({ ...env, NETLIFY_EXPECTED_RELEASE_SHA: 'f'.repeat(40) }, dependencies))
    await writeFile(input, JSON.stringify({ ...record, observedAt: '2020-01-01T00:00:00.000Z' }))
    await assert.rejects(verifyEmailHealth(env, dependencies))
    assert.equal(requests, 0)
    await assert.rejects(readFile(output), { code: 'ENOENT' })
    await writeFile(input, JSON.stringify(record))
    await verifyEmailHealth(env, dependencies)
    assert.equal(requests, 1)
    assert.equal(JSON.parse(await readFile(output, 'utf8')).connectionReadyForAuthHook, true)
    await assert.rejects(verifyEmailHealth(env, dependencies), { code: 'EEXIST' })
  } finally { await rm(directory, { recursive: true, force: true }) }
})
