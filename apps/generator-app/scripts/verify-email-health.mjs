#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertRuntimeReport, stagingProbeOrigin } from './deployed-runtime-report.mjs'

const HEALTH_FIELDS = ['authenticated', 'deliveryType', 'smtpEnabled', 'serverId', 'configuredSenderPresent']

function checkedHealth(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...HEALTH_FIELDS].sort().join(',')
    || typeof value.authenticated !== 'boolean' || typeof value.configuredSenderPresent !== 'boolean') return null
  if (!value.authenticated) {
    if (value.deliveryType !== null || value.smtpEnabled !== null || value.serverId !== null) return null
  } else if (!['Live', 'Sandbox'].includes(value.deliveryType) || typeof value.smtpEnabled !== 'boolean'
    || !Number.isSafeInteger(value.serverId) || value.serverId <= 0) return null
  return Object.fromEntries(HEALTH_FIELDS.map(field => [field, value[field]]))
}

/** Only call after independently validating the matching runtime report. */
export async function probeEmailHealth({ runtime, runtimeReportSha256, adminToken, fetchImpl = fetch, observedAt = new Date().toISOString() }) {
  const empty = { authenticated: false, deliveryType: null, smtpEnabled: null, serverId: null, configuredSenderPresent: false }
  let health = empty, failure = 'unavailable'
  try {
    const response = await fetchImpl(`${runtime.origin}/api/integrations/email`, {
      headers: { authorization: `Bearer ${adminToken}`, accept: 'application/json' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    })
    if (response.status === 401 || response.status === 403) failure = 'admin-authentication-denied'
    else {
      const checked = checkedHealth(await response.json())
      if (!checked || (response.ok && !checked.authenticated) || (!response.ok && checked.authenticated)) failure = 'invalid-response'
      else {
        health = checked
        failure = !health.authenticated ? 'provider-unavailable'
          : health.deliveryType !== 'Live' ? 'sandbox-server'
            : !health.configuredSenderPresent ? 'sender-not-configured' : null
      }
    }
  } catch { /* Transport bodies/errors may contain private data. */ }
  return {
    reportVersion: 1, kind: 'dailyclarity-staging-email-health', observedAt,
    origin: runtime.origin, deploymentSiteId: runtime.deploymentSiteId,
    deploymentReleaseSha: runtime.deploymentReleaseSha, runtimeReportSha256,
    ...health, connectionReadyForAuthHook: failure === null, failure,
    senderAuthorizationVerified: false, deliveryVerified: false,
    verificationBasis: 'Postmark server API only; SMTP availability is informational for the API hook.',
  }
}

export async function verifyEmailHealth(env = process.env, { fetchImpl = fetch } = {}) {
  if (env.DEPLOY_ENVIRONMENT !== 'staging' || !env.INTERNAL_ADMIN_TOKEN?.trim()
    || !env.RUNTIME_PROBE_REPORT_PATH || !env.EMAIL_HEALTH_REPORT_PATH) throw new Error('Email health configuration is incomplete.')
  const origin = stagingProbeOrigin(env.NETLIFY_EXPECTED_SITE_HOSTNAME)
  const bytes = await readFile(env.RUNTIME_PROBE_REPORT_PATH)
  const runtime = assertRuntimeReport(JSON.parse(bytes.toString('utf8')), {
    origin, siteId: env.NETLIFY_EXPECTED_SITE_ID, projectRef: env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF,
    releaseSha: env.NETLIFY_EXPECTED_RELEASE_SHA, catalogProfile: env.NETLIFY_EXPECTED_CATALOG_PROFILE || 'rehab-staging',
    catalogHash: env.NETLIFY_EXPECTED_CATALOG_HASH, manifestHash: env.NETLIFY_EXPECTED_MANIFEST_HASH,
    curatedReportHash: env.NETLIFY_EXPECTED_CURATED_REPORT_HASH || null,
  })
  const report = await probeEmailHealth({ runtime, runtimeReportSha256: createHash('sha256').update(bytes).digest('hex'),
    adminToken: env.INTERNAL_ADMIN_TOKEN.trim(), fetchImpl })
  await writeFile(env.EMAIL_HEALTH_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  return report
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyEmailHealth().then(report => {
    console.log(`[email-health] ${report.connectionReadyForAuthHook ? 'Existing Live server connection verified' : 'Server connection not ready'}; sender authorization and email delivery remain unverified.`)
    if (!report.connectionReadyForAuthHook) process.exitCode = 1
  }).catch(() => { console.error('[email-health] Verification failed; no raw response or credentials retained.'); process.exitCode = 1 })
}
