#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getStore } from '@netlify/blobs'
import * as core from './baseline-recovery.mjs'
import { connectedTarget, reviewedHead } from './certified-catalog-release.mjs'
import { canonicalDigest, PRODUCTION_NETLIFY_SITE_ID } from '../src/lib/templates/certified-catalog-contract.mjs'
import { assertNetlifyRuntimeEnvironment } from './netlify-target-contract.mjs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const HASH = /^[a-f0-9]{64}$/
const confirmations = { recover: 'RECOVER BASELINE', activate: 'ACTIVATE BASELINE', rollback: 'ROLLBACK BASELINE' }

export async function activateWithAttestationRetry(activate, { pause = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try { return await activate() } catch (error) {
      if (error.message !== 'Recovery activation is not yet attested; retain the journal for retry or rollback' || attempt === 5) throw error
      // The application may retain its previously empty catalogue for five
      // seconds. Every attempt revalidates ownership, bytes, schema, and pause.
      await pause(2_000)
    }
  }
}

export function recoveryConfiguration(env) {
  const operation = env.OPERATION || 'verify'
  if (!['verify', 'recover', 'activate', 'rollback'].includes(operation)) throw new Error('Unknown baseline recovery operation')
  if (operation !== 'verify' && env.CONFIRMATION !== confirmations[operation]) throw new Error('Explicit baseline recovery confirmation is required')
  if (env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_REPOSITORY !== 'russlle2/platform-builder' || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')) throw new Error('Baseline recovery requires the exact main repository commit')
  if (env.DAILYCLARITY_ENVIRONMENT !== 'production' || env.DEPLOY_ENVIRONMENT !== 'production' || env.NETLIFY_SITE_ID !== PRODUCTION_NETLIFY_SITE_ID || env.NETLIFY_EXPECTED_SITE_ID !== PRODUCTION_NETLIFY_SITE_ID || env.NETLIFY_EXPECTED_SITE_HOSTNAME !== 'dailyclarity.org' || env.NETLIFY_EXPECTED_ACCOUNT_SLUG !== 'christopherlake96' || env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF !== 'psxmvaushwsboogfnyqi' || env.NETLIFY_EXPECTED_SUPABASE_URL !== 'https://psxmvaushwsboogfnyqi.supabase.co') throw new Error('Baseline recovery requires the reviewed production site, account, host, and database')
  if (operation === 'recover' && (!HASH.test(env.RECEIPT_HASH ?? '') || !HASH.test(env.LEGACY_MANIFEST_HASH ?? ''))) throw new Error('Reviewed recovery receipt and raw legacy manifest hashes are required')
  if (operation === 'recover' && (!/^[A-Za-z0-9_-]+$/.test(env.EXPECTED_PREVIOUS_DEPLOYMENT_ID ?? '') || !/^[a-f0-9]{40}$/.test(env.EXPECTED_PREVIOUS_RELEASE_SHA ?? ''))) throw new Error('The reviewed original deployment ID and release SHA are required')
  if (['activate', 'rollback'].includes(operation) && !HASH.test(env.JOURNAL_HASH ?? '')) throw new Error('Reviewed recovery journal hash is required')
  for (const name of ['RECOVERY_BUNDLE', 'RECOVERY_JOURNAL', 'RECOVERY_RECEIPT']) {
    const value = env[name]
    if (!value || !path.isAbsolute(value) || !path.relative(REPO, value).startsWith(`..${path.sep}`)) throw new Error(`${name} must be an explicit path outside the checkout`)
  }
  return { operation, bundle: env.RECOVERY_BUNDLE, journalPath: env.RECOVERY_JOURNAL, receiptPath: env.RECOVERY_RECEIPT,
    receiptHash: env.RECEIPT_HASH, legacyHash: env.LEGACY_MANIFEST_HASH, journalHash: env.JOURNAL_HASH,
    previousDeploymentId: env.EXPECTED_PREVIOUS_DEPLOYMENT_ID, previousReleaseSha: env.EXPECTED_PREVIOUS_RELEASE_SHA,
    target: { expectedAccountSlug: env.NETLIFY_EXPECTED_ACCOUNT_SLUG, expectedHostname: env.NETLIFY_EXPECTED_SITE_HOSTNAME, expectedSupabaseProjectRef: env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF } }
}

/** Ordered orchestration; dependencies are injected for failure-path rehearsal. */
export async function orchestrateRecovery(config, deps) {
  const { operation } = config
  let journal, prepared
  if (operation === 'rollback' || operation === 'activate') {
    journal = await deps.readJournal()
    deps.validateJournal(journal, config.journalHash)
    await deps.saveJournal(journal)
  }
  if (operation !== 'rollback') {
    await deps.checkRelease()
    if (operation === 'activate' && journal.nextReceipt.releaseSha !== deps.head) throw new Error('Activation must use the exact journal release commit')
    await deps.checkFutureEnvironment()
  }
  if (operation === 'verify' || operation === 'recover') {
    prepared = await deps.prepare()
    const receiptHash = canonicalDigest(prepared.receipt)
    await deps.saveReceipt(prepared.receipt)
    if (operation === 'verify') return { receiptHash, ...await deps.describeBaseline(), providerWrites: false }
    if (receiptHash !== config.receiptHash) throw new Error('Recovery export differs from the reviewed receipt hash')
    journal = await deps.capture(prepared)
    // Persist locally before staging/deployment; capture already durably backed
    // up exact legacy bytes, metadata, and the journal in the recovery store.
    await deps.saveJournal(journal)
    await deps.stage(prepared, journal)
    await deps.writeProof(journal)
    try {
      await deps.deploy(journal)
    } finally {
      // A CLI error can happen after publication. Bind through immutable
      // provider file evidence, without requiring healthy application routes.
      await deps.bindIfChanged(journal)
    }
    const result = await deps.activate(journal)
    return { ...result, journalHash: canonicalDigest(journal) }
  }
  // Rollback must remain possible when the current app is broken, CI changed,
  // or the CLI failed after publishing but before saving a deployment binding.
  await deps.bindIfChanged(journal)
  const result = operation === 'rollback' ? await deps.rollback(journal) : await deps.activate(journal)
  return { ...result, journalHash: canonicalDigest(journal) }
}

async function api(resource, env, method = 'GET') {
  const response = await fetch(`https://api.netlify.com/api/v1/${resource}`, { method,
    headers: { authorization: `Bearer ${env.NETLIFY_AUTH_TOKEN}`, accept: 'application/json' },
    redirect: 'error', signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Netlify recovery API failed (${response.status})`)
  return response.json()
}

export function assertRecoveryEnvironment(variables, env) {
  assertNetlifyRuntimeEnvironment(variables, { context: 'production', expectedSupabaseUrl: env.NETLIFY_EXPECTED_SUPABASE_URL,
    expectedSupabaseProjectRef: env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF, expectedDeploymentEnvironment: 'production' })
  for (const [key, expected] of Object.entries({ DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'launch', DAILYCLARITY_SALES_PAUSED: 'true', BOOKING_KIT_ENABLED: 'false' })) {
    const variable = variables.find(entry => entry?.key === key)
    const value = variable?.values?.find(entry => entry.context === 'production') ?? variable?.values?.find(entry => entry.context === 'all')
    if (!variable || variable.is_secret || !variable.scopes?.includes('builds') || !variable.scopes?.includes('functions') || value?.value !== expected) throw new Error(`Recovery requires ${key}=${expected} in Netlify builds and functions`)
  }
}

export async function runBaselineRecovery(env = process.env) {
  const config = recoveryConfiguration(env)
  if (!env.NETLIFY_AUTH_TOKEN || !env.INTERNAL_ADMIN_TOKEN) throw new Error('Recovery provider credentials are incomplete')
  const head = reviewedHead()
  if (head !== env.GITHUB_SHA) throw new Error('Checked-out commit differs from the requested release')
  const { site, store: certifiedStore, launchStore } = await connectedTarget(env, { readRuntime: false })
  const auditStore = getStore({ name: core.RECOVERY_STORE, consistency: 'strong', siteID: site.id, token: env.NETLIFY_AUTH_TOKEN })
  const stores = { launchStore, certifiedStore, auditStore }
  const inspect = async () => connectedTarget(env)
  const inspectSite = async () => (await connectedTarget(env, { readRuntime: false })).site
  const inspectOriginal = async () => {
    const current = await inspect()
    if (current.site.published_deploy?.id !== config.previousDeploymentId || current.runtime.deploymentReleaseSha !== config.previousReleaseSha) throw new Error('Original deployment differs from the independently reviewed ID/SHA; use the saved journal to activate or roll back an interrupted recovery')
    return current
  }
  const approved = journal => ({ ...stores, journal, approvedJournalHash: canonicalDigest(journal) })
  const bindIfChanged = async journal => {
    const current = await inspectSite()
    const deploymentId = current.published_deploy?.id
    if (deploymentId === journal.previousDeploymentId) return
    if (!/^[A-Za-z0-9_-]+$/.test(deploymentId ?? '')) throw new Error('Current production deployment identity is unavailable')
    const binding = await auditStore.get(`${journal.backupPrefix}/deployment.json`, { type: 'json' })
    if (binding?.deploymentId === deploymentId && binding.journalHash === canonicalDigest(journal)) return
    const [deploy, file] = await Promise.all([api(`deploys/${deploymentId}`, env), api(`sites/${site.id}/files/__dailyclarity_release.json`, env)])
    const latest = await inspectSite()
    if (latest.published_deploy?.id !== deploymentId) throw new Error('Production deployment changed during recovery artifact verification')
    await core.bindRecoveryDeployment({ ...approved(journal), site: latest, deploy, file })
  }
  const result = await orchestrateRecovery(config, {
    head,
    readJournal: async () => JSON.parse(await readFile(path.join(config.bundle, 'recovery-journal.json'), 'utf8')),
    validateJournal: core.validateRecoveryJournal,
    checkRelease: async () => {
      execFileSync(process.execPath, ['apps/generator-app/scripts/verify-release-ci.mjs'], { cwd: REPO, stdio: 'inherit', env })
      execFileSync(process.execPath, ['apps/generator-app/scripts/verify-launch-schema.mjs'], { cwd: REPO, stdio: 'inherit', env })
    },
    checkFutureEnvironment: async () => assertRecoveryEnvironment(await api(`accounts/${encodeURIComponent(site.account_slug)}/env?site_id=${encodeURIComponent(site.id)}&context_name=production`, env), env),
    prepare: async () => core.prepareRecovery(path.join(config.bundle, 'library'), head),
    describeBaseline: async () => {
      const current = await inspect()
      const raw = await launchStore.get('_manifest.json', { type: 'arrayBuffer' })
      if (raw === null || current.runtime.templateCatalogReady !== false || current.runtime.publishedTemplateCount !== 0) throw new Error('Read-only verification does not identify the expected broken baseline')
      core.validateLegacyManifest(raw)
      return { previousDeploymentId: current.site.published_deploy.id, previousReleaseSha: current.runtime.deploymentReleaseSha,
        legacyManifestHash: core.hashBytes(Buffer.from(raw)), previousRuntime: core.describePreviousRuntime(current.runtime, config.target) }
    },
    saveReceipt: receipt => writeFile(config.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 }),
    saveJournal: journal => writeFile(config.journalPath, `${JSON.stringify(journal, null, 2)}\n`, { flag: 'wx', mode: 0o600 }),
    capture: prepared => core.captureRecovery({ ...stores, prepared, target: config.target, expectedLegacyHash: config.legacyHash,
      expectedPreviousDeploymentId: config.previousDeploymentId, expectedPreviousReleaseSha: config.previousReleaseSha, inspect: inspectOriginal }),
    stage: (prepared, journal) => core.stageRecovery({ ...approved(journal), prepared, inspect: inspectOriginal }),
    writeProof: journal => writeFile(path.join(REPO, 'apps/generator-app/public/__dailyclarity_release.json'), core.recoveryDeploymentProofBytes(journal)),
    deploy: async journal => {
      await inspectOriginal()
      execFileSync('pnpm', ['--package=netlify-cli@27.4.2', 'dlx', 'netlify', 'deploy', '--build', '--prod', '--context', 'production', '--site', env.NETLIFY_SITE_ID,
        '--message', `Baseline recovery ${head} journal ${canonicalDigest(journal)}`], { cwd: REPO, stdio: 'inherit', env: { ...env, NEXT_PUBLIC_RELEASE_SHA: head } })
    },
    bindIfChanged,
    activate: journal => activateWithAttestationRetry(() => core.activateRecovery({ ...approved(journal), inspect })),
    rollback: journal => core.rollbackRecovery({ ...approved(journal), inspect, inspectSite, restoreDeployment: id => api(`sites/${site.id}/deploys/${id}/restore`, env, 'POST') }),
  })
  // Only hashes/counts/state: never print credentials or provider responses.
  console.log(JSON.stringify({ operation: config.operation, ...result }))
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runBaselineRecovery().catch(error => { console.error(error.message); process.exitCode = 1 })
}
