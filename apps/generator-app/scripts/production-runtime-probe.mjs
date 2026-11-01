#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertNetlifyTarget } from './netlify-target-contract.mjs'
import { assertReleaseCi } from './verify-release-ci.mjs'

export const PRODUCTION_PROBE = Object.freeze({
  repository: 'russlle2/platform-builder', workflow: '.github/workflows/production-runtime-probe.yml',
  siteId: '4a98d266-bb9f-44ab-bf27-30597d741705', accountId: '6974219b1ab3798c7aed8c8a',
  accountSlug: 'christopherlake96', hostname: 'dailyclarity.org',
})
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/, ID = /^[a-f0-9]{24}$/
const digest = value => createHash('sha256').update(value).digest('hex')
const need = (condition, message) => { if (!condition) throw new Error(message) }
const bool = value => typeof value === 'boolean' ? value : null

export function assertProbeWorkflow(env, head) {
  const p = PRODUCTION_PROBE
  need(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === p.repository && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_REF === `${p.repository}/${p.workflow}@refs/heads/main`
    && SHA.test(head) && env.GITHUB_SHA === head && env.GITHUB_WORKFLOW_SHA === head && env.EXPECTED_RELEASE_SHA === head,
  'The probe requires the exact reviewed manual main workflow')
  need(env.DEPLOY_ENVIRONMENT === 'production' && env.NETLIFY_SITE_ID === p.siteId && env.NETLIFY_EXPECTED_SITE_ID === p.siteId
    && env.NETLIFY_EXPECTED_SITE_HOSTNAME === p.hostname && env.NETLIFY_EXPECTED_ACCOUNT_SLUG === p.accountSlug,
  'The probe requires the fixed production target')
  need([env.GITHUB_RUN_ID, env.GITHUB_RUN_ATTEMPT].every(value => /^[1-9][0-9]*$/.test(value || '') && Number.isSafeInteger(Number(value))), 'Invalid workflow run identity')
  return { repository: p.repository, workflow: p.workflow, workflowSha: head, runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT }
}

export function sanitizedProductionSnapshot(site, deployment) {
  const p = PRODUCTION_PROBE
  assertNetlifyTarget(site, { environment: 'production', configuredSiteId: p.siteId, expectedSiteId: p.siteId, expectedHostname: p.hostname, expectedAccountSlug: p.accountSlug })
  need(site.account_id === p.accountId && ID.test(site.published_deploy?.id || '') && deployment?.id === site.published_deploy.id
    && deployment.site_id === p.siteId, 'Published deployment does not belong to the pinned production account and site')
  const title = typeof deployment.title === 'string' ? deployment.title : ''
  // Arbitrary provider titles can contain private text. Retain known release titles
  // only, plus a commitment for every other title; never echo unknown provider text.
  const recognizedTitle = /^Certified [a-f0-9]{40} receipt [a-f0-9]{64}$/.test(title)
    || /^DailyClarity demo [a-f0-9]{40} [a-f0-9]{64}$/.test(title)
  return {
    siteId: p.siteId, accountId: p.accountId, accountSlug: p.accountSlug, hostname: p.hostname,
    stopBuilds: bool(site.build_settings?.stop_builds), forceSsl: bool(site.force_ssl),
    productionBranchIsMain: site.build_settings?.repo_branch === 'main',
    publishedDeployment: {
      id: deployment.id, commitRef: SHA.test(deployment.commit_ref || '') ? deployment.commit_ref : null,
      state: ['ready', 'error', 'building', 'enqueued', 'processing', 'uploading', 'new'].includes(deployment.state) ? deployment.state : 'unknown',
      context: ['production', 'deploy-preview', 'branch-deploy'].includes(deployment.context) ? deployment.context : 'unknown',
      locked: bool(deployment.locked), title: recognizedTitle ? title : null,
      titleSha256: digest(title), titleWithheld: !recognizedTitle,
    },
  }
}

export function sanitizeMarker(status, bytes) {
  if (status !== 200) return { status, available: false, valid: false }
  let marker
  try { marker = JSON.parse(bytes.toString('utf8')) } catch { return { status, available: true, valid: false, sha256: digest(bytes) } }
  const valid = marker?.version === 1 && SHA.test(marker.releaseSha || '')
  return { status, available: true, valid, sha256: digest(bytes), releaseSha: valid ? marker.releaseSha : null,
    certificationHash: valid && HASH.test(marker.certificationHash || '') ? marker.certificationHash : null }
}

// Readers deliberately expose no arbitrary URL, mutation method, or environment API.
export function createProbeReaders(env, fetcher = fetch) {
  need(env.GITHUB_TOKEN && env.NETLIFY_AUTH_TOKEN, 'Protected read credentials are required')
  const p = PRODUCTION_PROBE
  const read = async (url, token, maximum = 1024 * 1024) => {
    const response = await fetcher(url, { method: 'GET', redirect: 'error', cache: 'no-store',
      headers: { accept: 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, signal: AbortSignal.timeout(20_000) })
    need(!response.redirected, 'Unexpected provider redirect')
    need(!response.headers?.get('content-length') || Number(response.headers.get('content-length')) <= maximum, 'Provider response exceeds the observation limit')
    if (!response.ok) return { status: response.status, bytes: Buffer.alloc(0) }
    const chunks = []; let size = 0
    for await (const chunk of response.body) { size += chunk.length; need(size <= maximum, 'Provider response exceeds the observation limit'); chunks.push(chunk) }
    return { status: response.status, bytes: Buffer.concat(chunks) }
  }
  const json = async (url, token) => { const result = await read(url, token); need(result.status === 200, `Read-only provider request failed (${result.status})`); return JSON.parse(result.bytes.toString('utf8')) }
  return {
    main: () => json(`https://api.github.com/repos/${p.repository}/git/ref/heads/main`, env.GITHUB_TOKEN),
    ci: sha => { need(SHA.test(sha), 'Invalid CI commit'); return json(`https://api.github.com/repos/${p.repository}/actions/workflows/ci.yml/runs?head_sha=${sha}&status=success&per_page=100`, env.GITHUB_TOKEN) },
    site: () => json(`https://api.netlify.com/api/v1/sites/${p.siteId}`, env.NETLIFY_AUTH_TOKEN),
    deployment: id => { need(ID.test(id), 'Invalid deployment ID'); return json(`https://api.netlify.com/api/v1/deploys/${id}`, env.NETLIFY_AUTH_TOKEN) },
    marker: async () => { const result = await read(`https://${p.hostname}/__dailyclarity_release.json`, null, 4096); return sanitizeMarker(result.status, result.bytes) },
  }
}

export async function observeProduction(env, head, readers, now = () => new Date().toISOString()) {
  const workflow = assertProbeWorkflow(env, head)
  const requireMain = async () => { const main = await readers.main(); need(main.ref === 'refs/heads/main' && main.object?.type === 'commit' && main.object.sha === head, 'Main advanced before the production observation completed') }
  await requireMain()
  assertReleaseCi((await readers.ci(head)).workflow_runs, head, PRODUCTION_PROBE.repository)
  const site = await readers.site()
  need(ID.test(site.published_deploy?.id || ''), 'Production has no recognizable published deployment')
  const before = sanitizedProductionSnapshot(site, await readers.deployment(site.published_deploy.id))
  const marker = await readers.marker()
  const afterSite = await readers.site()
  const after = sanitizedProductionSnapshot(afterSite, await readers.deployment(afterSite.published_deploy?.id))
  need(JSON.stringify(before) === JSON.stringify(after), 'Production publication or settings changed during observation')
  await requireMain()
  return { version: 1, kind: 'dailyclarity-production-observation', workflow, observedAt: now(), ...after, marker,
    markerMatchesCommit: marker.valid && after.publishedDeployment.commitRef ? marker.releaseSha === after.publishedDeployment.commitRef : null,
    providerWrites: false, publicationApproved: false, connectedCustomerTestsPerformed: false }
}

async function main() {
  const env = process.env
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  need(env.PRODUCTION_OBSERVATION_PATH && path.isAbsolute(env.PRODUCTION_OBSERVATION_PATH), 'Explicit observation output path required')
  const report = await observeProduction(env, head, createProbeReaders(env))
  await writeFile(env.PRODUCTION_OBSERVATION_PATH, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  console.log('Read-only production observation saved. This is not publication approval or connected customer evidence.')
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => {
  console.error('Production observation failed. No provider response bodies or credentials were retained; no provider write was attempted.')
  process.exitCode = 1
})
