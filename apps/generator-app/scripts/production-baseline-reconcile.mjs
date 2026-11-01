#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalDigest, validateCertifiedPointer, validateCertification } from '../src/lib/templates/certified-catalog-contract.mjs'
import { assertNetlifyTarget } from './netlify-target-contract.mjs'
import { validateRuntime } from './demo-maintenance-contract.mjs'
import { assertReleaseCi } from './verify-release-ci.mjs'

// This is one reviewed app-only repair. It cannot select arbitrary deployments,
// change a catalogue pointer, alter environment variables, or publish new code.
export const RECONCILIATION = Object.freeze({
  repository: 'russlle2/platform-builder', workflow: '.github/workflows/production-baseline-reconcile.yml',
  siteId: '4a98d266-bb9f-44ab-bf27-30597d741705', accountId: '6974219b1ab3798c7aed8c8a', accountSlug: 'christopherlake96',
  hostname: 'dailyclarity.org', projectRef: 'psxmvaushwsboogfnyqi',
  currentDeploymentId: '6ae6a05eda554f3a43ad8f94', currentCommit: 'c1ec11e1fe8607d5b7158043422afd63e287211b',
  baselineDeploymentId: '6ad19c79b1a9ec56fe82b1ce', baselineCommit: 'fafde2dcd12bd6a8a5481a27e6035a510904f75c',
  baselineOrigin: 'https://6ad19c79b1a9ec56fe82b1ce--keen-buttercream-c3c10a.netlify.app',
  certificationHash: 'c707c300a55db5b4eb416309649e2bc8b4a72918ff39c98e1c06dcd0d5455472',
  catalogHash: '5ffeabbf8bd31b2aa864e4d6b43044eec7b3b2d39bf69c15338e84c2a007a4a7',
  manifestHash: '0116b4e0ea7faac5cd4c1430b4db9155fca46e1e119de957b746120f0e6309b5',
  pointerHash: 'e328410d29dcfebeeaf843af7fdca278273780f41a22df796e50eca1c3ec2327',
})
const need = (condition, message) => { if (!condition) throw new Error(message) }
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const SHA = /^[a-f0-9]{40}$/, ID = /^[a-f0-9]{24}$/
const r = RECONCILIATION

export function reconciliationConfiguration(env, head) {
  need(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === r.repository && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_REF === `${r.repository}/${r.workflow}@refs/heads/main`
    && SHA.test(head) && env.GITHUB_SHA === head && env.GITHUB_WORKFLOW_SHA === head && env.EXPECTED_RELEASE_SHA === head,
  'Reconciliation requires the reviewed current-main protected workflow')
  need(env.DEPLOY_ENVIRONMENT === 'production' && env.NETLIFY_SITE_ID === r.siteId && env.NETLIFY_EXPECTED_SITE_ID === r.siteId
    && env.NETLIFY_EXPECTED_SITE_HOSTNAME === r.hostname && env.NETLIFY_EXPECTED_ACCOUNT_SLUG === r.accountSlug, 'Production target differs')
  need(['verify', 'restore'].includes(env.OPERATION), 'Unknown reconciliation operation')
  need(env.OPERATION !== 'restore' || env.CONFIRMATION === 'RESTORE CERTIFIED BASELINE', 'Explicit restoration confirmation required')
  need([env.GITHUB_RUN_ID, env.GITHUB_RUN_ATTEMPT].every(value => /^[1-9][0-9]*$/.test(value || '') && Number.isSafeInteger(Number(value))), 'Invalid workflow producer')
  return { operation: env.OPERATION, controllerSha: head, producer: { runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT } }
}

export function captureProduction(site, deployment) {
  assertNetlifyTarget(site, { environment: 'production', configuredSiteId: r.siteId, expectedSiteId: r.siteId, expectedHostname: r.hostname, expectedAccountSlug: r.accountSlug })
  need(site.account_id === r.accountId && ID.test(site.published_deploy?.id || '') && deployment?.id === site.published_deploy.id
    && deployment.site_id === r.siteId && deployment.state === 'ready' && deployment.context === 'production'
    && [true, false, null].includes(deployment.locked) && typeof site.build_settings?.stop_builds === 'boolean' && site.force_ssl === true,
  'Published production identity, readiness or lock state differs')
  const { stop_builds: _stop, ...build } = site.build_settings
  return { deploymentId: deployment.id, commitRef: SHA.test(deployment.commit_ref || '') ? deployment.commit_ref : null,
    locked: deployment.locked === true, stopBuilds: site.build_settings.stop_builds,
    settingsHash: canonicalDigest({ build, processing: site.processing_settings ?? null, functions: site.functions_config ?? null,
      hostname: site.custom_domain, aliases: [...(site.domain_aliases || [])].sort(), forceSsl: site.force_ssl }) }
}

export function assertBaselineDocuments(pointer, certificate, catalogBytes, manifest) {
  validateCertifiedPointer(pointer)
  validateCertification(certificate, { releaseSha: r.baselineCommit, catalogHash: r.catalogHash, manifestHash: r.manifestHash })
  need(canonicalDigest(pointer) === r.pointerHash && pointer.certificationHash === r.certificationHash
    && canonicalDigest(certificate) === r.certificationHash && hash(catalogBytes) === r.catalogHash && canonicalDigest(manifest) === r.manifestHash,
  'Active catalogue documents differ from the unchanged certified baseline')
  return { pointerHash: r.pointerHash, releaseSha: r.baselineCommit, certificationHash: r.certificationHash,
    catalogHash: r.catalogHash, manifestHash: r.manifestHash, profile: 'rehab-certified', templates: 5486 }
}

export function assertBaselineMarker(marker) {
  need(marker && Object.keys(marker).sort().join('|') === ['version', 'releaseSha', 'certificationHash'].sort().join('|')
    && marker.version === 1 && marker.releaseSha === r.baselineCommit && marker.certificationHash === r.certificationHash,
  'Deployment marker differs from the original certified application')
}

export function assertOwnedBaseline(deployment) {
  need(deployment?.id === r.baselineDeploymentId && deployment.site_id === r.siteId && deployment.state === 'ready'
    && deployment.context === 'production' && (!deployment.commit_ref || deployment.commit_ref === r.baselineCommit)
    && deployment.deploy_ssl_url === r.baselineOrigin && [true, false, null].includes(deployment.locked), 'Baseline deployment identity differs')
}

function assertState(value, initial, deploymentId, locked, stopped) {
  need(value.deploymentId === deploymentId && value.locked === locked && value.stopBuilds === stopped && value.settingsHash === initial.settingsHash,
    'Production publication, lock or unrelated settings changed')
  if (deploymentId === r.currentDeploymentId) need(value.commitRef === r.currentCommit, 'Unexpected current production commit')
  else need(value.commitRef === null || value.commitRef === r.baselineCommit, 'Unexpected baseline commit')
}

export async function reconcileProduction(config, a) {
  const journal = { version: 1, kind: 'dailyclarity-fixed-production-reconciliation', controllerSha: config.controllerSha,
    producer: config.producer, operation: config.operation, phase: 'preflight', attemptedWrites: [],
    targetDeploymentId: r.baselineDeploymentId, targetCommit: r.baselineCommit, certificationHash: r.certificationHash,
    priorDeploymentId: r.currentDeploymentId, priorCommit: r.currentCommit, createdAt: a.now(), publicationApproved: false }
  const save = async phase => { journal.phase = phase; journal.updatedAt = a.now(); await a.save(journal) }
  let initial
  const write = async (phase, expected, action) => {
    await a.controllerGate()
    await a.catalogue()
    assertState(await a.capture(), initial, ...expected)
    journal.attemptedWrites.push(phase)
    await save(`${phase}-requested`)
    await action()
  }
  try {
    await a.controllerGate()
    initial = await a.capture()
    need(initial.deploymentId === r.currentDeploymentId && initial.commitRef === r.currentCommit && initial.locked === false, 'Only the observed unlocked foreign application may be reconciled')
    journal.before = initial
    journal.baseline = await a.verifyBaseline()
    journal.catalogue = await a.catalogue()
    assertState(await a.capture(), initial, r.currentDeploymentId, false, initial.stopBuilds)
    await save('validated')
    if (config.operation === 'verify') return journal

    if (!initial.stopBuilds) {
      await write('stop-builds', [r.currentDeploymentId, false, false], a.stopBuilds)
      assertState(await a.capture(), initial, r.currentDeploymentId, false, true)
      await save('builds-stopped')
    }
    await a.catalogue()
    assertState(await a.capture(), initial, r.currentDeploymentId, false, true)
    await write('lock-current', [r.currentDeploymentId, false, true], () => a.lock(r.currentDeploymentId))
    assertState(await a.capture(), initial, r.currentDeploymentId, true, true)
    await save('current-locked')
    await a.verifyBaseline()
    await a.catalogue()
    assertState(await a.capture(), initial, r.currentDeploymentId, true, true)
    await write('restore-baseline', [r.currentDeploymentId, true, true], () => a.restore(r.baselineDeploymentId))
    const published = await a.waitPublication(r.baselineDeploymentId, true)
    assertState(published, initial, r.baselineDeploymentId, true, true)
    journal.restored = published
    await save('baseline-restored-locked')
    journal.health = await a.verifyPublic()
    await a.catalogue()
    assertState(await a.capture(), initial, r.baselineDeploymentId, true, true)
    await write('unlock-baseline', [r.baselineDeploymentId, true, true], () => a.unlock(r.baselineDeploymentId))
    journal.after = await a.waitPublication(r.baselineDeploymentId, false)
    assertState(journal.after, initial, r.baselineDeploymentId, false, true)
    journal.health = await a.verifyPublic()
    await a.catalogue()
    journal.after = await a.capture()
    assertState(journal.after, initial, r.baselineDeploymentId, false, true)
    await save('complete')
    return journal
  } catch (error) {
    journal.interruptedAtPhase = journal.phase
    journal.requiresReconciliation = journal.attemptedWrites.length > 0
    try { journal.lastObserved = await a.capture() } catch { journal.lastObservationUnavailable = true }
    await save('stopped')
    throw error
  }
}

export function createReconciliationHttp(env, fetcher = fetch) {
  need(env.NETLIFY_AUTH_TOKEN && env.INTERNAL_ADMIN_TOKEN && env.GITHUB_TOKEN, 'Protected provider credentials are incomplete')
  const request = async (url, token, method = 'GET', body) => {
    const response = await fetcher(url, { method, headers: { authorization: `Bearer ${token}`, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25_000) })
    need(response.ok && !response.redirected, 'Provider operation did not return success')
    if (!response.body) return null
    const chunks = []; let size = 0
    for await (const chunk of response.body) { size += chunk.length; need(size <= 1024 * 1024, 'Provider response exceeds safety limit'); chunks.push(chunk) }
    return size ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null
  }
  const netlify = resource => `https://api.netlify.com/api/v1/${resource}`
  return {
    site: () => request(netlify(`sites/${r.siteId}`), env.NETLIFY_AUTH_TOKEN),
    deployment: id => { need(ID.test(id), 'Invalid observed deployment ID'); return request(netlify(`deploys/${id}`), env.NETLIFY_AUTH_TOKEN) },
    stopBuilds: () => request(netlify(`sites/${r.siteId}`), env.NETLIFY_AUTH_TOKEN, 'PATCH', { build_settings: { stop_builds: true } }),
    lock: id => { need(id === r.currentDeploymentId, 'Only the observed current deployment may be locked'); return request(netlify(`deploys/${id}/lock`), env.NETLIFY_AUTH_TOKEN, 'POST') },
    restore: id => { need(id === r.baselineDeploymentId, 'Only the fixed certified baseline may be restored'); return request(netlify(`sites/${r.siteId}/deploys/${id}/restore`), env.NETLIFY_AUTH_TOKEN, 'POST') },
    unlock: id => { need(id === r.baselineDeploymentId, 'Only the restored owned baseline lock may be released'); return request(netlify(`deploys/${id}/unlock`), env.NETLIFY_AUTH_TOKEN, 'POST') },
    runtime: origin => { need([r.baselineOrigin, `https://${r.hostname}`].includes(origin), 'Unapproved runtime origin'); return request(`${origin}/api/integrations/status`, env.INTERNAL_ADMIN_TOKEN) },
    main: () => request(`https://api.github.com/repos/${r.repository}/git/ref/heads/main`, env.GITHUB_TOKEN),
    ci: sha => { need(SHA.test(sha), 'Invalid controller SHA'); return request(`https://api.github.com/repos/${r.repository}/actions/workflows/ci.yml/runs?head_sha=${sha}&status=success&per_page=100`, env.GITHUB_TOKEN) },
  }
}

export async function createReconciliationAdapters(env, config) {
  const http = createReconciliationHttp(env)
  const { getStore } = await import('@netlify/blobs')
  const store = getStore({ name: 'templates-rehab-certified', consistency: 'strong', siteID: r.siteId, token: env.NETLIFY_AUTH_TOKEN })
  const marker = async origin => {
    need([r.baselineOrigin, `https://${r.hostname}`].includes(origin), 'Unapproved marker origin')
    const response = await fetch(`${origin}/__dailyclarity_release.json`, { method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20_000) })
    need(response.ok && !response.redirected, 'Baseline marker is unavailable')
    const chunks = []; let size = 0
    for await (const chunk of response.body) { size += chunk.length; need(size <= 4096, 'Baseline marker is oversized'); chunks.push(chunk) }
    const bytes = Buffer.concat(chunks)
    const value = JSON.parse(bytes.toString('utf8')); assertBaselineMarker(value); return value
  }
  const catalogue = async () => {
    const pointer = await store.get('_active.json', { type: 'json' }); validateCertifiedPointer(pointer)
    const [certificate, bytes, manifest] = await Promise.all([store.get(pointer.certificationKey, { type: 'json' }), store.get(pointer.catalogKey, { type: 'arrayBuffer' }), store.get(pointer.manifestKey, { type: 'json' })])
    return assertBaselineDocuments(pointer, certificate, Buffer.from(bytes || []), manifest)
  }
  const health = async origin => {
    const currentCatalogue = await catalogue(); await marker(origin)
    const runtime = await http.runtime(origin)
    return validateRuntime(runtime, { siteId: r.siteId, projectRef: r.projectRef, appSha: r.baselineCommit, catalogue: currentCatalogue })
  }
  const capture = async () => { const site = await http.site(); return captureProduction(site, await http.deployment(site.published_deploy?.id)) }
  return {
    now: () => new Date().toISOString(), capture, catalogue,
    save: async journal => { const next = `${env.RECONCILIATION_JOURNAL}.next`; await writeFile(next, `${JSON.stringify(journal, null, 2)}\n`, { mode: 0o600 }); await rename(next, env.RECONCILIATION_JOURNAL) },
    controllerGate: async () => { const [main, ci] = await Promise.all([http.main(), http.ci(config.controllerSha)]); need(main.object?.sha === config.controllerSha, 'Current main advanced'); assertReleaseCi(ci.workflow_runs, config.controllerSha, r.repository) },
    verifyBaseline: async () => { const deployment = await http.deployment(r.baselineDeploymentId); assertOwnedBaseline(deployment); need(deployment.locked !== true, 'Baseline already has an unowned lock'); return { deploymentId: r.baselineDeploymentId, origin: r.baselineOrigin, health: await health(r.baselineOrigin) } },
    verifyPublic: () => health(`https://${r.hostname}`),
    stopBuilds: http.stopBuilds, lock: http.lock, restore: http.restore, unlock: http.unlock,
    waitPublication: async (id, locked) => {
      const until = Date.now() + 60_000
      while (true) {
        const observed = await capture()
        need([r.currentDeploymentId, r.baselineDeploymentId].includes(observed.deploymentId), 'An unrelated deployment appeared')
        if (observed.deploymentId === id && observed.locked === locked) return observed
        need(Date.now() < until, 'Publication did not reach the expected observed state')
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    },
  }
}

async function main() {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  need(!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), 'Controller checkout must be clean')
  const config = reconciliationConfiguration(process.env, head)
  need(path.isAbsolute(process.env.RECONCILIATION_JOURNAL || '') && path.relative(process.cwd(), process.env.RECONCILIATION_JOURNAL).startsWith(`..${path.sep}`), 'Journal must be outside the clean checkout')
  await reconcileProduction(config, await createReconciliationAdapters(process.env, config))
  console.log('Fixed production reconciliation completed; inspect the retained journal. No new release or catalogue was published.')
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => {
  console.error('Production reconciliation stopped. Inspect its journal before any retry; no provider response bodies or credentials were retained.')
  process.exitCode = 1
})
