#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getStore } from '@netlify/blobs'
import { canonicalDigest, createCertifiedPointer, validateCertification } from '../src/lib/templates/certified-catalog-contract.mjs'
import { reviewedHead, verifySnapshot } from './certified-catalog-release.mjs'
import { verifyCandidate, candidateInventory, createGithub } from './catalogue-handoff.mjs'
import { publishRehabStagingCatalog, createRehabStagingActivePointer, validateLaunchCatalogManifest } from './upload-templates-to-blobs.mjs'
import { assertNetlifyTarget, assertNetlifyRuntimeEnvironment } from './netlify-target-contract.mjs'
import { createRuntimeReport, assertRuntimeReport, LAUNCH_RUNTIME_APPROVAL } from './deployed-runtime-report.mjs'
import { createReleaseReadAccess, createReleaseDiagnostics, ReleaseHttpError } from './release-read-retry.mjs'
import { reuseStagingSnapshot } from './reuse-staging-snapshot.mjs'

export const STAGING = Object.freeze({ siteId: 'e5f283c4-d2f2-4fc9-965d-f67f9875c074', accountId: '6974219b1ab3798c7aed8c8a', accountSlug: 'christopherlake96', hostname: 'dailyclarity-staging.netlify.app', projectRef: 'yuviqftugmasjypkhrpo', store: 'templates-rehab-staging', auditStore: 'dailyclarity-staging-catalogue-journals' })
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const HASH = /^[a-f0-9]{64}$/, SHA = /^[a-f0-9]{40}$/, ID = /^[a-f0-9]{24}$/
const POINTER = '_active.json'
const PROFILE_KEYS = ['DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE', 'DAILYCLARITY_STAGING_SITE_ID']
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const bytes = value => Buffer.from(JSON.stringify(value))
const must = (condition, message) => { if (!condition) throw new Error(message) }
const same = (left, right) => canonicalDigest(left) === canonicalDigest(right)
const recordPrefix = journal => `journals/${canonicalDigest(journal)}`
const confirms = { stage: 'STAGE FULL CATALOGUE', rollback: 'ROLLBACK STAGING CATALOGUE', reapply: 'REAPPLY STAGING CATALOGUE' }
const phase = (deps, name, operation, detail) => deps.diagnostics ? deps.diagnostics.run(name, operation, detail) : operation()

export function stagingConfiguration(env) {
  const operation = env.OPERATION || 'verify'
  must(['verify', 'stage', 'rollback', 'reapply'].includes(operation), 'Unknown staging catalogue operation')
  must(operation === 'verify' || env.CONFIRMATION === confirms[operation], 'Explicit staging catalogue confirmation is required')
  must(env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_REPOSITORY === 'russlle2/platform-builder' && SHA.test(env.GITHUB_SHA ?? ''), 'Staging catalogue requires the exact main repository commit')
  must(env.DAILYCLARITY_ENVIRONMENT === 'staging' && env.DEPLOY_ENVIRONMENT === 'staging' && env.NETLIFY_SITE_ID === STAGING.siteId && env.NETLIFY_EXPECTED_SITE_ID === STAGING.siteId && env.NETLIFY_EXPECTED_SITE_HOSTNAME === STAGING.hostname && env.NETLIFY_EXPECTED_ACCOUNT_SLUG === STAGING.accountSlug && env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF === STAGING.projectRef && env.NETLIFY_EXPECTED_SUPABASE_URL === `https://${STAGING.projectRef}.supabase.co`, 'Staging catalogue target must match the isolated reviewed site, account, host and database')
  for (const key of ['CANDIDATE_BUNDLE', 'STAGING_JOURNAL_OUTPUT']) must(path.isAbsolute(env[key] || '') && path.relative(ROOT, env[key]).startsWith(`..${path.sep}`), `${key} must be outside the clean checkout`)
  if (['verify', 'stage'].includes(operation)) must(HASH.test(env.RECEIPT_HASH ?? ''), 'Exact candidate certification hash is required')
  if (operation === 'stage') must(ID.test(env.EXPECTED_PREVIOUS_DEPLOYMENT_ID ?? '') && SHA.test(env.EXPECTED_PREVIOUS_RELEASE_SHA ?? ''), 'Reviewed previous staging deployment and release are required')
  if (env.EXISTING_RECEIPT_HASH) must(operation === 'stage' && HASH.test(env.EXISTING_RECEIPT_HASH), 'Existing remote certification hash is invalid or used outside staging')
  if (['rollback', 'reapply'].includes(operation)) must(HASH.test(env.JOURNAL_HASH ?? ''), 'Exact saved staging journal hash is required')
  return { operation, bundle: env.CANDIDATE_BUNDLE, output: env.STAGING_JOURNAL_OUTPUT, receiptHash: env.RECEIPT_HASH, existingReceiptHash: env.EXISTING_RECEIPT_HASH || null, journalHash: env.JOURNAL_HASH, previousDeploymentId: env.EXPECTED_PREVIOUS_DEPLOYMENT_ID, previousReleaseSha: env.EXPECTED_PREVIOUS_RELEASE_SHA, head: env.GITHUB_SHA }
}

export function assertStagingSite(site) {
  assertNetlifyTarget(site, { environment: 'staging', configuredSiteId: STAGING.siteId, expectedSiteId: STAGING.siteId, expectedHostname: STAGING.hostname, expectedAccountSlug: STAGING.accountSlug })
  must(site.account_id === STAGING.accountId && ID.test(site.published_deploy?.id ?? '') && site.published_deploy.state === 'ready', 'Staging account or ready deployment differs from the reviewed target')
  must(site.build_settings?.stop_builds === true, 'Staging Git auto-builds must be stopped before catalogue transitions')
}

// Only these two public settings are captured or changed. No provider object,
// transport value or arbitrary environment variable is serialized in a journal.
export function publicProfileSnapshot(variables) {
  return Object.fromEntries(PROFILE_KEYS.map(key => {
    const matches = variables.filter(entry => entry?.key === key)
    must(matches.length <= 1, 'Duplicate staging profile variable')
    if (!matches.length) return [key, null]
    const item = matches[0]
    must(item.is_secret === false && Array.isArray(item.scopes) && item.scopes.includes('builds') && item.scopes.includes('functions') && item.scopes.every(scope => ['builds', 'functions', 'runtime', 'post_processing'].includes(scope)), 'Staging profile variables must be readable in builds and functions')
    must(Array.isArray(item.values) && item.values.length > 0 && item.values.every(value => ['all', 'production'].includes(value.context) && !value.context_parameter && typeof value.value === 'string' && (key === PROFILE_KEYS[0] ? ['launch', 'rehab-staging'].includes(value.value) : value.value === STAGING.siteId)), 'Staging profile variable has unsupported contexts or values')
    must(new Set(item.values.map(value => value.context)).size === item.values.length, 'Duplicate staging profile context')
    return [key, { key, is_secret: false, scopes: [...item.scopes].sort(), values: item.values.map(value => ({ context: value.context, value: value.value })).sort((a, b) => a.context.localeCompare(b.context)) }]
  }))
}
const activeValue = variable => variable?.values.find(value => value.context === 'production')?.value ?? variable?.values.find(value => value.context === 'all')?.value
export function candidateProfile(previous) {
  return Object.fromEntries(PROFILE_KEYS.map(key => {
    const old = previous[key]
    const values = (old?.values ?? []).filter(value => value.context !== 'production')
    values.push({ context: 'production', value: key === PROFILE_KEYS[0] ? 'rehab-staging' : STAGING.siteId })
    return [key, { key, is_secret: false, scopes: old?.scopes ?? ['builds', 'functions'], values: values.sort((a, b) => a.context.localeCompare(b.context)) }]
  }))
}

export async function readPointer(store) {
  const raw = await store.get(POINTER, { type: 'arrayBuffer' })
  if (raw === null) return { base64: null, sha256: null, metadata: null }
  const value = Buffer.from(raw)
  must(value.length > 0 && value.length <= 64 * 1024, 'Existing staging pointer is unexpectedly large or empty')
  const metadata = (await store.getMetadata(POINTER))?.metadata ?? {}
  must(Buffer.byteLength(JSON.stringify(metadata)) <= 4096, 'Staging pointer metadata exceeds the journal limit')
  const record = { base64: value.toString('base64'), sha256: digest(value), metadata }
  validatePointerRecord(record)
  return record
}
function pointerRecord(pointer) { const value = bytes(pointer); return { base64: value.toString('base64'), sha256: digest(value), metadata: {} } }
function validatePointerRecord(record) {
  must(record && Object.keys(record).sort().join(',') === 'base64,metadata,sha256', 'Saved pointer shape is invalid')
  if (record.base64 === null) must(record.sha256 === null && record.metadata === null, 'Absent pointer evidence is inconsistent')
  else {
    must(typeof record.base64 === 'string' && record.base64.length <= 90_000 && HASH.test(record.sha256 ?? '') && digest(Buffer.from(record.base64, 'base64')) === record.sha256 && record.metadata && !Array.isArray(record.metadata) && typeof record.metadata === 'object', 'Saved pointer bytes differ from their hash')
    const pointer = JSON.parse(Buffer.from(record.base64, 'base64').toString('utf8'))
    must(same(pointer, createRehabStagingActivePointer(pointer)), 'Inactive staging pointer shape is invalid')
    must(Object.entries(record.metadata).every(([key, value]) => key === 'contractVersion' ? value === 3 : ['sha256', 'catalogHash'].includes(key) && HASH.test(value ?? '')), 'Inactive staging pointer metadata is not an approved public shape')
  }
}

export function validateStagingJournal(journal, expectedHash) {
  must(HASH.test(expectedHash ?? '') && canonicalDigest(journal) === expectedHash && journal?.version === 1 && journal.kind === 'staging-catalogue-transition' && same(journal.target, STAGING), 'Staging journal identity or hash is invalid')
  must(Object.keys(journal).sort().join(',') === ['version','kind','target','createdAt','receipt','receiptHash','previousDeploymentId','previousReleaseSha','previousRuntime','launchManifestHash','previousPointer','nextPointer','previousProfile','nextProfile'].sort().join(','), 'Staging journal has unexpected fields')
  validateCertification(journal.receipt)
  must(Object.keys(journal.receipt).sort().join(',') === ['version','profile','releaseSha','catalogHash','manifestHash','fullGateHash','sourceCatalogHash','templateEvidenceHash','fileEvidenceHash','sourceTemplates','certifiedTemplates','neutralFallbacks','customizationDiagnostics','files','pages'].sort().join(','), 'Staging journal receipt has unexpected fields')
  must(journal.receiptHash === canonicalDigest(journal.receipt) && ID.test(journal.previousDeploymentId ?? '') && SHA.test(journal.previousReleaseSha ?? '') && HASH.test(journal.launchManifestHash ?? ''), 'Staging journal release evidence is incomplete')
  const previous = journal.previousRuntime
  assertRuntimeReport(previous, { origin: `https://${STAGING.hostname}`, siteId: STAGING.siteId, projectRef: STAGING.projectRef, releaseSha: journal.previousReleaseSha, catalogProfile: 'launch', catalogHash: LAUNCH_RUNTIME_APPROVAL.catalogHash, manifestHash: previous?.templateManifestHash, curatedReportHash: LAUNCH_RUNTIME_APPROVAL.curatedReportHash }, { now: Date.parse(previous?.observedAt) })
  must(previous.source.kind === 'direct', 'Captured staging runtime has unexpected provenance')
  validatePointerRecord(journal.previousPointer); validatePointerRecord(journal.nextPointer)
  must(same(journal.nextPointer, pointerRecord(createRehabStagingActivePointer({ catalogHash: journal.receipt.catalogHash, manifestHash: journal.receipt.manifestHash, activatedAt: journal.createdAt }))), 'Staging journal candidate pointer is not receipt-bound')
  must(same(publicProfileSnapshot(Object.values(journal.previousProfile).filter(Boolean)), journal.previousProfile) && activeValue(journal.previousProfile[PROFILE_KEYS[0]]) === 'launch' && same(candidateProfile(journal.previousProfile), journal.nextProfile), 'Staging journal profile transition is invalid')
  return journal
}

export function stagingDeploymentProof(journal) {
  return bytes({ version: 1, profile: 'rehab-staging-candidate', releaseSha: journal.receipt.releaseSha, certificationHash: journal.receiptHash, journalHash: canonicalDigest(journal) })
}
export function stagingDeploymentTitle(journal) { return `Staging catalogue ${journal.receipt.releaseSha} journal ${canonicalDigest(journal)}` }

function runtimeEvidence(runtime, profile, releaseSha, catalogHash, manifestHash) {
  const report = createRuntimeReport(runtime, { origin: `https://${STAGING.hostname}` })
  assertRuntimeReport(report, { origin: report.origin, siteId: STAGING.siteId, projectRef: STAGING.projectRef, releaseSha, catalogProfile: profile, catalogHash, manifestHash, curatedReportHash: profile === 'launch' ? LAUNCH_RUNTIME_APPROVAL.curatedReportHash : null })
  return report
}
async function immutableJson(store, key, value) {
  const existing = await store.get(key, { type: 'json' })
  if (existing !== null) must(same(existing, value), 'Immutable staging journal object conflict')
  else await store.setJSON(key, value)
  must(same(await store.get(key, { type: 'json' }), value), 'Staging journal durable readback failed')
}
async function preserveJournal(deps, journal) {
  await immutableJson(deps.audit, `${recordPrefix(journal)}/journal.json`, journal)
  await deps.saveJournal(journal)
}
async function assertLaunchUnchanged(deps, journal) {
  const raw = await deps.launch.get('_manifest.json', { type: 'arrayBuffer' })
  must(raw !== null && digest(Buffer.from(raw)) === journal.launchManifestHash, 'Original launch catalogue changed during staging transition')
}
async function guardedState(deps, journal, binding) {
  const site = await deps.site(); assertStagingSite(site)
  must([journal.previousDeploymentId, binding?.deploymentId].filter(Boolean).includes(site.published_deploy.id), 'Unrelated staging deployment detected; no restore or overwrite is allowed')
  const pointer = await readPointer(deps.store)
  must(same(pointer, journal.previousPointer) || same(pointer, journal.nextPointer), 'Unrelated staging catalogue pointer detected')
  const profile = publicProfileSnapshot(await deps.environment())
  for (const key of PROFILE_KEYS) must(same(profile[key], journal.previousProfile[key]) || same(profile[key], journal.nextProfile[key]), 'Unrelated staging profile change detected')
  await assertLaunchUnchanged(deps, journal)
  return { site, pointer, profile }
}
async function bindingFor(deps, journal) {
  const binding = await deps.audit.get(`${recordPrefix(journal)}/deployment.json`, { type: 'json' })
  if (binding !== null) must(binding.journalHash === canonicalDigest(journal) && ID.test(binding.deploymentId ?? '') && binding.deploymentId !== journal.previousDeploymentId, 'Saved staging deployment binding is invalid')
  return binding
}
export async function bindStagingDeployment(deps, journal) {
  const site = await deps.site(); assertStagingSite(site)
  const existing = await bindingFor(deps, journal)
  if (site.published_deploy.id === journal.previousDeploymentId) return existing
  if (existing) { must(existing.deploymentId === site.published_deploy.id, 'Unrelated staging deployment cannot replace the saved binding'); return existing }
  const deploymentId = site.published_deploy.id
  const [deploy, file] = await Promise.all([deps.deployment(deploymentId), deps.deploymentFile()])
  must(deploy.id === deploymentId && deploy.site_id === STAGING.siteId && deploy.state === 'ready' && (!deploy.commit_ref || deploy.commit_ref === journal.receipt.releaseSha) && deploy.title === stagingDeploymentTitle(journal) && ['__dailyclarity_release.json', '/__dailyclarity_release.json'].includes(file?.path) && file.sha === createHash('sha1').update(stagingDeploymentProof(journal)).digest('hex'), 'Published staging application is not owned by this journal')
  must((await deps.site()).published_deploy.id === deploymentId, 'Staging deployment changed during immutable proof verification')
  const binding = { version: 1, journalHash: canonicalDigest(journal), deploymentId }
  await immutableJson(deps.audit, `${recordPrefix(journal)}/deployment.json`, binding)
  return binding
}

export async function captureStagingJournal(deps, prepared, config) {
  const site = await deps.site(); assertStagingSite(site)
  must(site.published_deploy.id === config.previousDeploymentId, 'Staging deployment differs from the independently reviewed original')
  const raw = await deps.launch.get('_manifest.json', { type: 'arrayBuffer' })
  must(raw !== null && validateLaunchCatalogManifest(JSON.parse(Buffer.from(raw).toString('utf8'))).pass, 'Initial staging capture requires the approved healthy launch catalogue')
  const manifestHash = canonicalDigest(JSON.parse(Buffer.from(raw).toString('utf8')))
  const runtime = runtimeEvidence(await deps.runtime(), 'launch', config.previousReleaseSha, LAUNCH_RUNTIME_APPROVAL.catalogHash, manifestHash)
  await deps.authProbe()
  const previousProfile = publicProfileSnapshot(await deps.environment())
  must(activeValue(previousProfile[PROFILE_KEYS[0]]) === 'launch', 'Initial staging capture requires the explicit launch profile')
  const createdAt = new Date().toISOString()
  const journal = { version: 1, kind: 'staging-catalogue-transition', target: STAGING, createdAt, receipt: prepared.receipt, receiptHash: canonicalDigest(prepared.receipt), previousDeploymentId: site.published_deploy.id, previousReleaseSha: runtime.deploymentReleaseSha, previousRuntime: runtime, launchManifestHash: digest(Buffer.from(raw)), previousPointer: await readPointer(deps.store), nextPointer: pointerRecord(createRehabStagingActivePointer({ catalogHash: prepared.receipt.catalogHash, manifestHash: prepared.receipt.manifestHash, activatedAt: createdAt })), previousProfile, nextProfile: candidateProfile(previousProfile) }
  validateStagingJournal(journal, canonicalDigest(journal))
  await guardedState(deps, journal, null)
  await preserveJournal(deps, journal)
  return journal
}

async function writePointer(deps, journal, binding, next) {
  await guardedState(deps, journal, binding)
  const expected = next ? journal.nextPointer : journal.previousPointer
  if (expected.base64 === null) await deps.store.delete(POINTER)
  else await deps.store.set(POINTER, Buffer.from(expected.base64, 'base64'), { metadata: expected.metadata })
  must(same(await readPointer(deps.store), expected), 'Staging pointer exact byte/metadata readback failed')
}
async function writeProfile(deps, journal, binding, next) {
  for (const key of PROFILE_KEYS) {
    const state = await guardedState(deps, journal, binding)
    const expected = (next ? journal.nextProfile : journal.previousProfile)[key]
    if (!same(state.profile[key], expected)) await deps.setProfile(key, expected)
    must(same(publicProfileSnapshot(await deps.environment())[key], expected), 'Staging public profile readback failed')
  }
}
async function attest(deps, journal, binding, next) {
  const state = await guardedState(deps, journal, binding)
  must(state.site.published_deploy.id === (next ? binding?.deploymentId : journal.previousDeploymentId) && same(state.pointer, next ? journal.nextPointer : journal.previousPointer) && same(state.profile, next ? journal.nextProfile : journal.previousProfile), 'Staging transition state is not converged')
  const receipt = journal.receipt
  const report = runtimeEvidence(await deps.runtime(), next ? 'rehab-staging' : 'launch', next ? receipt.releaseSha : journal.previousReleaseSha, next ? receipt.catalogHash : journal.previousRuntime.templateCatalogHash, next ? receipt.manifestHash : journal.previousRuntime.templateManifestHash)
  await deps.authProbe()
  const after = await guardedState(deps, journal, binding)
  must(after.site.published_deploy.id === state.site.published_deploy.id && same(after.pointer, state.pointer) && same(after.profile, state.profile), 'Staging state changed during runtime attestation')
  return { journalHash: canonicalDigest(journal), receiptHash: journal.receiptHash, deploymentId: state.site.published_deploy.id, profile: report.templateCatalogProfile, templates: report.publishedTemplateCount, releaseSha: report.deploymentReleaseSha, fullCatalogueProductionApproval: false }
}
export async function transitionStaging(deps, journal, next) {
  const binding = await phase(deps, 'bind-deployment', () => bindStagingDeployment(deps, journal))
  if (next) { must(binding, 'Candidate deployment has not been bound; use rollback after an interrupted build'); await phase(deps, 'verify-snapshot', () => verifySnapshot(deps.store, createCertifiedPointer(journal.receipt)), { expectedFiles: journal.receipt.files }) }
  deps.diagnostics?.phase('restore-transition')
  await guardedState(deps, journal, binding)
  await immutableJson(deps.audit, `${recordPrefix(journal)}/${next ? 'reapply' : 'rollback'}-intent.json`, { journalHash: canonicalDigest(journal), destination: next ? 'candidate' : 'original' })
  await writePointer(deps, journal, binding, next)
  await writeProfile(deps, journal, binding, next)
  // Re-read deployment immediately before restore; never overwrite an external publish.
  const current = await guardedState(deps, journal, binding)
  const desired = next ? binding.deploymentId : journal.previousDeploymentId
  if (current.site.published_deploy.id !== desired) await deps.restore(desired)
  const result = await phase(deps, 'attest-runtime', () => attest(deps, journal, binding, next))
  await phase(deps, 'preserve-attestation', () => immutableJson(deps.audit, `${recordPrefix(journal)}/${next ? 'reapply' : 'rollback'}-attested.json`, result))
  return result
}

export async function orchestrateStaging(config, deps) {
  if (['rollback', 'reapply'].includes(config.operation)) {
    const journal = await phase(deps, 'load-journal', async () => validateStagingJournal(await deps.loadJournal(), config.journalHash))
    must(config.operation === 'rollback' || journal.receipt.releaseSha === config.head, 'Reapply requires the original candidate release commit')
    await phase(deps, 'preserve-journal', () => preserveJournal(deps, journal))
    if (config.operation === 'reapply') await phase(deps, 'check-release', () => deps.checkRelease())
    return transitionStaging(deps, journal, config.operation === 'reapply')
  }
  await phase(deps, 'check-release', () => deps.checkRelease())
  const { prepared } = await phase(deps, 'verify-candidate', () => deps.verifyCandidate())
  must(canonicalDigest(prepared.receipt) === config.receiptHash && prepared.receipt.releaseSha === config.head, 'Candidate verification does not match approved receipt and commit')
  if (config.operation === 'verify') {
    const site = await deps.site(); assertStagingSite(site)
    const runtime = await deps.runtime()
    must(SHA.test(runtime.deploymentReleaseSha ?? ''), 'Staging runtime release is unavailable')
    return { receiptHash: config.receiptHash, previousDeploymentId: site.published_deploy.id, previousReleaseSha: runtime.deploymentReleaseSha, providerWrites: false }
  }
  const journal = await phase(deps, 'capture-baseline', () => captureStagingJournal(deps, prepared, config))
  await phase(deps, 'guard-before-upload', () => guardedState(deps, journal, null))
  if (config.existingReceiptHash) {
    await phase(deps, 'reuse-snapshot', () => reuseStagingSnapshot({ store: deps.store, receipt: journal.receipt, existingReceiptHash: config.existingReceiptHash }), { expectedFiles: journal.receipt.files })
  } else {
    await phase(deps, 'upload-snapshot', () => publishRehabStagingCatalog({ store: deps.store, ...prepared, activate: false, activatedAt: journal.createdAt }), { expectedFiles: journal.receipt.files })
    await phase(deps, 'write-certification', () => immutableJson(deps.store, `certifications/${journal.receiptHash}.json`, journal.receipt))
    await phase(deps, 'verify-snapshot', () => verifySnapshot(deps.store, createCertifiedPointer(journal.receipt)), { expectedFiles: journal.receipt.files })
  }
  await phase(deps, 'activate-pointer', () => writePointer(deps, journal, null, true))
  await phase(deps, 'activate-profile', () => writeProfile(deps, journal, null, true))
  await phase(deps, 'write-deployment-proof', () => deps.writeProof(journal))
  try {
    await phase(deps, 'guard-before-deploy', () => guardedState(deps, journal, null))
    await phase(deps, 'deploy-application', () => deps.deploy(journal))
  } finally { await phase(deps, 'bind-deployment', () => bindStagingDeployment(deps, journal)) }
  const result = await phase(deps, 'attest-runtime', async () => attest(deps, journal, await bindingFor(deps, journal), true))
  await phase(deps, 'preserve-attestation', () => immutableJson(deps.audit, `${recordPrefix(journal)}/stage-attested.json`, result))
  return result
}

export async function runStagingCatalogue(env = process.env, diagnostics = createReleaseDiagnostics('staging-catalogue')) {
  const config = stagingConfiguration(env)
  must(env.NETLIFY_AUTH_TOKEN && env.INTERNAL_ADMIN_TOKEN, 'Protected staging provider credentials are incomplete')
  const head = reviewedHead(); must(head === config.head, 'Workflow checkout differs from its exact main commit')
  const reads = createReleaseReadAccess({ onRead: diagnostics.read, onRetry: diagnostics.retry })
  const api = async (resource, method = 'GET', body) => {
    const request = async () => {
      const response = await reads.fetch(`https://api.netlify.com/api/v1/${resource}`, { method, headers: { authorization: `Bearer ${env.NETLIFY_AUTH_TOKEN}`, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(30_000) })
      if (!response.ok) throw new ReleaseHttpError(response.status)
      return response.status === 204 ? null : response.json()
    }
    return method === 'GET' ? reads.read(request) : request()
  }
  const accountPath = `accounts/${STAGING.accountId}/env`
  const envPath = `${accountPath}?site_id=${STAGING.siteId}`
  const environment = async () => {
    const variables = await api(envPath)
    assertNetlifyRuntimeEnvironment(variables, { context: 'production', expectedSupabaseUrl: `https://${STAGING.projectRef}.supabase.co`, expectedSupabaseProjectRef: STAGING.projectRef, expectedDeploymentEnvironment: 'staging' })
    must(activeValue(variables.find(item => item.key === 'BOOKING_KIT_ENABLED')) !== 'true', 'Booking Kit must remain disabled during catalogue transition')
    return variables
  }
  const store = name => reads.store(getStore({ name, consistency: 'strong', siteID: STAGING.siteId, token: env.NETLIFY_AUTH_TOKEN, fetch: reads.fetch }))
  const deps = {
    diagnostics,
    store: store(STAGING.store), launch: store('templates'), audit: store(STAGING.auditStore),
    site: () => api(`sites/${STAGING.siteId}`), environment,
    runtime: () => reads.read(async () => {
      const response = await reads.fetch(`https://${STAGING.hostname}/api/integrations/status`, { headers: { authorization: `Bearer ${env.INTERNAL_ADMIN_TOKEN}` }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25_000) })
      if (!response.ok) throw new ReleaseHttpError(response.status)
      return response.json()
    }),
    deployment: id => api(`deploys/${id}`), deploymentFile: () => api(`sites/${STAGING.siteId}/files/__dailyclarity_release.json`),
    restore: id => api(`sites/${STAGING.siteId}/deploys/${id}/restore`, 'POST'),
    setProfile: async (key, desired) => {
      must(PROFILE_KEYS.includes(key), 'Only reviewed public profile variables may change')
      const existing = (await environment()).some(item => item.key === key)
      if (desired === null) { if (existing) await api(`${accountPath}/${key}?site_id=${STAGING.siteId}`, 'DELETE') }
      else if (existing) await api(`${accountPath}/${key}?site_id=${STAGING.siteId}`, 'PUT', desired)
      else await api(envPath, 'POST', [desired])
    },
    authProbe: async () => execFileSync(process.execPath, ['apps/generator-app/scripts/verify-auth-entrypoint.mjs'], { cwd: ROOT, env, stdio: 'inherit' }),
    checkRelease: async () => {
      execFileSync(process.execPath, ['apps/generator-app/scripts/verify-release-ci.mjs'], { cwd: ROOT, env, stdio: 'inherit' })
      execFileSync(process.execPath, ['apps/generator-app/scripts/verify-launch-schema.mjs'], { cwd: ROOT, env, stdio: 'inherit' })
    },
    verifyCandidate: async () => { const verified = await verifyCandidate(config.bundle, config.receiptHash, head); await candidateInventory(config.bundle, verified.prepared); return verified },
    loadJournal: async () => JSON.parse(await readFile(path.join(config.bundle, 'staging-journal.json'), 'utf8')),
    saveJournal: journal => writeFile(config.output, `${JSON.stringify(journal, null, 2)}\n`, { flag: 'wx', mode: 0o600 }),
    writeProof: journal => writeFile(path.join(ROOT, 'apps/generator-app/public/__dailyclarity_release.json'), stagingDeploymentProof(journal)),
    deploy: async journal => execFileSync('pnpm', ['--package=netlify-cli@27.4.2', 'dlx', 'netlify', 'deploy', '--filter', '@platform-builder/generator-app', '--build', '--prod', '--context', 'production', '--site', STAGING.siteId, '--message', stagingDeploymentTitle(journal)], { cwd: ROOT, stdio: 'inherit', env: { ...env, NEXT_PUBLIC_RELEASE_SHA: head } }),
  }
  const result = await orchestrateStaging(config, deps)
  diagnostics.phase('completed')
  console.log(JSON.stringify({ operation: config.operation, ...result }))
  return result
}
export function assertJournalArtifactSource(run, artifact, runId, artifactId) {
  must(/^[1-9][0-9]*$/.test(runId ?? '') && /^[1-9][0-9]*$/.test(artifactId ?? ''), 'Exact journal artifact IDs are required')
  must(String(run?.id) === runId && run.repository?.full_name === 'russlle2/platform-builder' && run.head_branch === 'main' && SHA.test(run.head_sha ?? '') && run.event === 'workflow_dispatch' && run.path === '.github/workflows/staging-catalogue.yml' && run.status === 'completed' && ['success', 'failure', 'cancelled'].includes(run.conclusion), 'Journal producer is not the protected staging catalogue workflow')
  must(String(artifact?.id) === artifactId && artifact.expired === false && artifact.name === `staging-catalogue-journal-${runId}-${run.run_attempt}` && artifact.workflow_run?.id === Number(runId) && artifact.workflow_run?.head_sha === run.head_sha, 'Journal artifact does not belong to the exact reviewed workflow run')
  return { runId, runAttempt: String(run.run_attempt), artifactId, releaseSha: run.head_sha }
}
async function checkJournalSource(env) {
  stagingConfiguration(env)
  const github = createGithub(env.GITHUB_TOKEN)
  must(/^[1-9][0-9]*$/.test(env.CANDIDATE_RUN_ID ?? '') && /^[1-9][0-9]*$/.test(env.CANDIDATE_ARTIFACT_ID ?? ''), 'Exact journal artifact IDs are required')
  const artifact = await github.json(`actions/artifacts/${env.CANDIDATE_ARTIFACT_ID}`)
  const attempt = String(artifact.name ?? '').match(new RegExp(`^staging-catalogue-journal-${env.CANDIDATE_RUN_ID}-([1-9][0-9]*)$`))?.[1]
  must(attempt, 'Saved journal artifact attempt is missing')
  // A failed first attempt remains usable after a later workflow rerun. Verify
  // that exact attempt, not the mutable latest-attempt summary for its run ID.
  const run = await github.json(`actions/runs/${env.CANDIDATE_RUN_ID}/attempts/${attempt}`)
  console.log(JSON.stringify(assertJournalArtifactSource(run, artifact, env.CANDIDATE_RUN_ID, env.CANDIDATE_ARTIFACT_ID)))
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const diagnostics = createReleaseDiagnostics('staging-catalogue')
  const task = process.argv[2] === 'check-journal-source' ? diagnostics.run('check-journal-source', () => checkJournalSource(process.env)) : runStagingCatalogue(process.env, diagnostics)
  task.catch(error => { diagnostics.failure(error); console.error('Staging catalogue operation failed; retain its journal and verify the current deployment, pointer and profile before retrying. Provider details suppressed.'); process.exitCode = 1 })
}
