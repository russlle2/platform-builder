import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { canonicalDigest, forEachBounded, PRODUCTION_NETLIFY_SITE_ID } from '../src/lib/templates/certified-catalog-contract.mjs'
import { reviewedHead, verifyLaunchSnapshot } from './certified-catalog-release.mjs'
import { main as validateUpload, buildReleaseManifest, validateLaunchCatalogManifest, uploadMetadataForFile, LAUNCH_CATALOG_CONTRACT } from './upload-templates-to-blobs.mjs'
import { assertNetlifyTarget } from './netlify-target-contract.mjs'

export const RECOVERY_STORE = 'dailyclarity-baseline-recovery'
export const LEGACY_COUNTS = Object.freeze({ aromatherapy: 1291, holistic_medicine: 1002, private_practice_therapist: 1087, sound_bath: 1001, wellness_coach: 1104 })
const SHA = /^[a-f0-9]{64}$/
const COMMIT = /^[a-f0-9]{40}$/
export const hashBytes = (value) => createHash('sha256').update(value).digest('hex')
const jsonBytes = (value) => Buffer.from(JSON.stringify(value))
const bytesOf = (value) => value == null ? null : Buffer.from(value)
const runtimeFields = ['deploymentSiteId', 'deploymentReleaseSha', 'supabaseProjectRef', 'supabaseSchemaVersion', 'bookingKitSchemaVersion', 'supabaseSchemaReady', 'templateCatalogProfile', 'publishedTemplateCount', 'expectedTemplateCount', 'templateCatalogReady', 'checkoutReady', 'customBuildCheckoutReady', 'bookingKitSalesEnabled', 'salesPaused']
const snapshotRuntime = (runtime) => Object.fromEntries(runtimeFields.filter((key) => runtime[key] !== undefined).map((key) => [key, runtime[key]]))

export function validateLegacyManifest(bytes) {
  let manifest
  try { manifest = JSON.parse(Buffer.from(bytes).toString('utf8')) } catch { throw new Error('Legacy manifest is not JSON') }
  if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object' || canonicalDigest(Object.keys(manifest).sort()) !== canonicalDigest(Object.keys(LEGACY_COUNTS).sort())) throw new Error('Legacy manifest niches are unexpected')
  for (const [niche, count] of Object.entries(LEGACY_COUNTS)) {
    if (!Array.isArray(manifest[niche]) || manifest[niche].length !== count || manifest[niche].some((entry) => !entry || typeof entry !== 'object' || Array.isArray(entry))) throw new Error(`Legacy manifest count or entries are unexpected for ${niche}`)
  }
  if (validateLaunchCatalogManifest(manifest).pass) throw new Error('A healthy launch baseline must not be recovered')
  return manifest
}

function validateReceipt(receipt, current = true) {
  if (!receipt || receipt.version !== 1 || receipt.profile !== 'launch-recovery' || !COMMIT.test(receipt.releaseSha ?? '') || receipt.templateCount !== 60 || !Number.isSafeInteger(receipt.files) || receipt.files < 60) throw new Error('Recovery receipt identity is invalid')
  for (const field of ['curatedIdentityHash', 'manifestHash', 'manifestRawHash', 'fileEvidenceHash']) if (!SHA.test(receipt[field] ?? '')) throw new Error(`Recovery receipt ${field} is invalid`)
  if (current && receipt.curatedIdentityHash !== LAUNCH_CATALOG_CONTRACT.templateIdentitySha256) throw new Error('Recovery export is not the currently reviewed curated catalogue')
  return receipt
}

export async function prepareRecovery(root, head = reviewedHead()) {
  if (!COMMIT.test(head)) throw new Error('Recovery requires an exact reviewed commit')
  const plan = await validateUpload(['--root', root, '--dry-run'], {}, { includePlan: true })
  const manifest = buildReleaseManifest(plan.manifest)
  if (!validateLaunchCatalogManifest(manifest).pass) throw new Error('Recovery requires the exact approved 60-template export')
  const prefix = `_releases/${LAUNCH_CATALOG_CONTRACT.templateIdentitySha256}`
  const evidence = [], files = []
  for (const record of plan.fileRecords) {
    const key = `${prefix}/${record.key}`
    const bytes = await readFile(record.full)
    const sha256 = hashBytes(bytes)
    evidence.push({ key, bytes: bytes.length, sha256 })
    files.push({ key, read: async () => {
      const current = await readFile(record.full)
      if (hashBytes(current) !== sha256) throw new Error(`Recovery file changed after validation: ${key}`)
      return current
    } })
  }
  evidence.sort((a, b) => a.key.localeCompare(b.key))
  const manifestBytes = jsonBytes(manifest)
  const receipt = { version: 1, profile: 'launch-recovery', releaseSha: head, templateCount: 60, curatedIdentityHash: LAUNCH_CATALOG_CONTRACT.templateIdentitySha256, manifestHash: canonicalDigest(manifest), manifestRawHash: hashBytes(manifestBytes), fileEvidenceHash: canonicalDigest(evidence), files: files.length }
  validateReceipt(receipt)
  return { receipt, manifest, manifestBytes, files }
}

function assertTarget(site, target) {
  assertNetlifyTarget(site, { environment: 'production', configuredSiteId: PRODUCTION_NETLIFY_SITE_ID, expectedSiteId: PRODUCTION_NETLIFY_SITE_ID, expectedAccountSlug: target.expectedAccountSlug, expectedHostname: target.expectedHostname })
  if (!site.published_deploy?.id || site.published_deploy.state !== 'ready') throw new Error('The currently published production deployment is not ready')
}

function assertRuntime(runtime, target, releaseSha) {
  if (runtime?.deploymentSiteId !== PRODUCTION_NETLIFY_SITE_ID || !COMMIT.test(runtime.deploymentReleaseSha ?? '') || (releaseSha && runtime.deploymentReleaseSha !== releaseSha) || runtime.supabaseProjectRef !== target.expectedSupabaseProjectRef || !target.expectedSupabaseProjectRef || runtime.supabaseSchemaVersion !== '20260903.4' || runtime.bookingKitSchemaVersion !== '20260925.2' || runtime.supabaseSchemaReady !== true) throw new Error('Production runtime identity or live database schema is not verified')
  if (runtime.templateCatalogProfile !== 'launch' || runtime.expectedTemplateCount !== 60) throw new Error('Recovery applies only to the launch-profile application')
}

function targetOf(journal) {
  return { expectedAccountSlug: journal.accountSlug, expectedHostname: journal.hostname, expectedSupabaseProjectRef: journal.projectRef }
}

export function validateRecoveryJournal(journal, approvedJournalHash) {
  if (!journal || journal.version !== 1 || journal.kind !== 'legacy-launch-recovery' || journal.siteId !== PRODUCTION_NETLIFY_SITE_ID || !COMMIT.test(journal.previousReleaseSha ?? '') || !/^[A-Za-z0-9_-]+$/.test(journal.previousDeploymentId ?? '') || !SHA.test(journal.id ?? '') || journal.backupPrefix !== `recoveries/${journal.id}` || !SHA.test(journal.previousManifestSha256 ?? '') || !SHA.test(journal.previousMetadataHash ?? '') || !journal.accountSlug || !journal.hostname || !journal.projectRef) throw new Error('Recovery journal identity is invalid')
  validateReceipt(journal.nextReceipt, false)
  const old = journal.previousRuntime
  assertRuntime(old, targetOf(journal), journal.previousReleaseSha)
  if (old.templateCatalogReady !== false || old.publishedTemplateCount !== 0) throw new Error('Recovery journal does not describe the broken zero-serving baseline')
  if (!SHA.test(approvedJournalHash ?? '') || canonicalDigest(journal) !== approvedJournalHash) throw new Error('Recovery journal differs from its approved hash')
  return journal
}

async function immutableBytes(store, key, bytes, metadata) {
  const prior = bytesOf(await store.get(key, { type: 'arrayBuffer' }))
  if (prior && hashBytes(prior) !== hashBytes(bytes)) throw new Error(`Immutable recovery object conflicts: ${key}`)
  if (prior && metadata && canonicalDigest((await store.getMetadata(key))?.metadata ?? {}) !== canonicalDigest(metadata)) throw new Error(`Immutable recovery metadata conflicts: ${key}`)
  if (!prior) await store.set(key, bytes, metadata ? { metadata } : undefined)
  const actual = bytesOf(await store.get(key, { type: 'arrayBuffer' }))
  if (!actual || hashBytes(actual) !== hashBytes(bytes)) throw new Error(`Immutable recovery readback failed: ${key}`)
  if (metadata && canonicalDigest((await store.getMetadata(key))?.metadata ?? {}) !== canonicalDigest(metadata)) throw new Error(`Immutable recovery metadata readback failed: ${key}`)
}

async function assertNoCertifiedPointer(certifiedStore) {
  if (await certifiedStore.get('_active.json', { type: 'arrayBuffer' }) !== null) throw new Error('Recovery refuses an existing certified catalogue pointer')
}

async function readManifest(store) {
  const value = await store.getWithMetadata('_manifest.json', { type: 'arrayBuffer' })
  const bytes = bytesOf(value?.data)
  if (!bytes) throw new Error('The current legacy manifest is missing')
  return { bytes, metadata: value.metadata ?? {} }
}

export async function captureRecovery({ launchStore, certifiedStore, auditStore, prepared, expectedLegacyHash, expectedPreviousDeploymentId, expectedPreviousReleaseSha, target, inspect, now = new Date().toISOString() }) {
  validateReceipt(prepared.receipt)
  if (!SHA.test(expectedLegacyHash ?? '')) throw new Error('An independently reviewed raw legacy manifest SHA-256 is required')
  const { site, runtime } = await inspect()
  assertTarget(site, target)
  assertRuntime(runtime, target)
  if (!expectedPreviousDeploymentId || !COMMIT.test(expectedPreviousReleaseSha ?? '') || site.published_deploy.id !== expectedPreviousDeploymentId || runtime.deploymentReleaseSha !== expectedPreviousReleaseSha) throw new Error('Previous deployment differs from the independently reviewed recovery identity')
  if (runtime.templateCatalogReady !== false || runtime.publishedTemplateCount !== 0) throw new Error('Recovery refuses a healthy or unexpected serving catalogue')
  if (site.published_deploy.commit_ref && site.published_deploy.commit_ref !== runtime.deploymentReleaseSha) throw new Error('Published deployment and runtime commit disagree')
  await assertNoCertifiedPointer(certifiedStore)
  const original = await readManifest(launchStore)
  if (hashBytes(original.bytes) !== expectedLegacyHash) throw new Error('Legacy manifest differs from the reviewed raw hash')
  validateLegacyManifest(original.bytes)
  const identity = { siteId: site.id, previousDeploymentId: site.published_deploy.id, previousManifestSha256: expectedLegacyHash, nextReceipt: prepared.receipt, capturedAt: now }
  const id = canonicalDigest(identity)
  const journal = { version: 1, kind: 'legacy-launch-recovery', id, backupPrefix: `recoveries/${id}`, ...identity, accountSlug: target.expectedAccountSlug, hostname: target.expectedHostname, projectRef: target.expectedSupabaseProjectRef, previousReleaseSha: runtime.deploymentReleaseSha, previousMetadataHash: canonicalDigest(original.metadata), previousRuntime: snapshotRuntime(runtime) }
  validateRecoveryJournal(journal, canonicalDigest(journal))
  await immutableBytes(auditStore, `${journal.backupPrefix}/legacy-manifest.bin`, original.bytes)
  await immutableBytes(auditStore, `${journal.backupPrefix}/legacy-metadata.json`, jsonBytes(original.metadata))
  await immutableBytes(auditStore, `${journal.backupPrefix}/journal.json`, jsonBytes(journal))
  await assertOriginalState({ launchStore, certifiedStore, journal, inspect })
  return journal
}

async function verifyBackup(auditStore, journal) {
  const bytes = bytesOf(await auditStore.get(`${journal.backupPrefix}/legacy-manifest.bin`, { type: 'arrayBuffer' }))
  const metadataBytes = bytesOf(await auditStore.get(`${journal.backupPrefix}/legacy-metadata.json`, { type: 'arrayBuffer' }))
  const saved = await auditStore.get(`${journal.backupPrefix}/journal.json`, { type: 'json' })
  if (!bytes || hashBytes(bytes) !== journal.previousManifestSha256 || !metadataBytes || canonicalDigest(saved) !== canonicalDigest(journal)) throw new Error('Durable recovery backup is missing or changed')
  const metadata = JSON.parse(metadataBytes.toString('utf8'))
  if (canonicalDigest(metadata) !== journal.previousMetadataHash) throw new Error('Legacy metadata backup changed')
  validateLegacyManifest(bytes)
  return { bytes, metadata }
}

async function assertOriginalState({ launchStore, certifiedStore, journal, inspect }) {
  const { site, runtime } = await inspect()
  assertTarget(site, targetOf(journal))
  assertRuntime(runtime, targetOf(journal), journal.previousReleaseSha)
  if (site.published_deploy.id !== journal.previousDeploymentId || runtime.publishedTemplateCount !== 0 || runtime.templateCatalogReady !== false) throw new Error('Original deployment or broken-catalogue state changed concurrently')
  await assertNoCertifiedPointer(certifiedStore)
  const current = await readManifest(launchStore)
  if (hashBytes(current.bytes) !== journal.previousManifestSha256 || canonicalDigest(current.metadata) !== journal.previousMetadataHash) throw new Error('Legacy manifest or metadata changed concurrently')
}

export async function stageRecovery({ launchStore, certifiedStore, auditStore, prepared, journal, approvedJournalHash, inspect }) {
  validateRecoveryJournal(journal, approvedJournalHash)
  validateReceipt(prepared.receipt)
  if (canonicalDigest(prepared.receipt) !== canonicalDigest(journal.nextReceipt) || canonicalDigest(prepared.manifest) !== prepared.receipt.manifestHash || hashBytes(prepared.manifestBytes) !== prepared.receipt.manifestRawHash || !validateLaunchCatalogManifest(prepared.manifest).pass) throw new Error('Staged recovery files do not match the approved journal')
  await verifyBackup(auditStore, journal)
  await assertOriginalState({ launchStore, certifiedStore, journal, inspect })
  const prefix = `_releases/${prepared.receipt.curatedIdentityHash}/`
  const evidence = [], files = [], keys = new Set()
  for (const file of prepared.files) {
    if (!file.key.startsWith(prefix) || file.key.split('/').some((part) => !part || part === '.' || part === '..') || file.key.includes('\\') || keys.has(file.key)) throw new Error('Recovery file escapes or repeats its immutable namespace')
    keys.add(file.key)
    const bytes = Buffer.from(await file.read())
    evidence.push({ key: file.key, bytes: bytes.length, sha256: hashBytes(bytes) })
    files.push({ key: file.key, bytes })
  }
  evidence.sort((a, b) => a.key.localeCompare(b.key))
  if (files.length !== prepared.receipt.files || canonicalDigest(evidence) !== prepared.receipt.fileEvidenceHash) throw new Error('Recovery file bytes differ from the approved receipt')
  // No active pointer is written by staging, including on partial failure.
  await forEachBounded(files, (file) => immutableBytes(launchStore, file.key, file.bytes, uploadMetadataForFile(file.key.slice(prefix.length), hashBytes(file.bytes), prepared.manifest)))
  if (await verifyLaunchSnapshot(launchStore, prepared.manifest) !== prepared.receipt.fileEvidenceHash) throw new Error('Staged catalogue contains unexpected or changed files')
  await immutableBytes(launchStore, `${prefix}_manifest.json`, prepared.manifestBytes)
  await assertOriginalState({ launchStore, certifiedStore, journal, inspect })
  await immutableBytes(auditStore, `${journal.backupPrefix}/staged.json`, jsonBytes({ journalHash: approvedJournalHash, fileEvidenceHash: prepared.receipt.fileEvidenceHash }))
}

export function recoveryDeploymentProofBytes(journal) {
  validateRecoveryJournal(journal, canonicalDigest(journal))
  return Buffer.from(`${JSON.stringify({ version: 1, profile: 'launch-recovery', releaseSha: journal.nextReceipt.releaseSha, recoveryHash: canonicalDigest(journal) })}\n`)
}

export async function bindRecoveryDeployment({ launchStore, certifiedStore, auditStore, journal, approvedJournalHash, site, deploy, file }) {
  validateRecoveryJournal(journal, approvedJournalHash)
  assertTarget(site, targetOf(journal))
  await assertNoCertifiedPointer(certifiedStore)
  await verifyBackup(auditStore, journal)
  const current = await readManifest(launchStore)
  if (![journal.previousManifestSha256, journal.nextReceipt.manifestRawHash].includes(hashBytes(current.bytes))) throw new Error('Recovery binding refuses a foreign manifest')
  const proofHash = createHash('sha1').update(recoveryDeploymentProofBytes(journal)).digest('hex')
  if (deploy?.id !== site.published_deploy.id || deploy.id === journal.previousDeploymentId || deploy.site_id !== journal.siteId || deploy.state !== 'ready' || (deploy.commit_ref && deploy.commit_ref !== journal.nextReceipt.releaseSha) || !['/__dailyclarity_release.json', '__dailyclarity_release.json'].includes(file?.path) || file.sha !== proofHash) throw new Error('Current deployment is not owned by this recovery journal')
  const binding = { deploymentId: deploy.id, releaseSha: journal.nextReceipt.releaseSha, proofHash, journalHash: approvedJournalHash }
  await immutableBytes(auditStore, `${journal.backupPrefix}/deployment.json`, jsonBytes(binding))
  return binding
}

async function ownedDeployment(auditStore, journal, site) {
  assertTarget(site, targetOf(journal))
  const binding = await auditStore.get(`${journal.backupPrefix}/deployment.json`, { type: 'json' })
  if (!binding || binding.journalHash !== canonicalDigest(journal) || binding.releaseSha !== journal.nextReceipt.releaseSha || binding.deploymentId !== site.published_deploy.id) throw new Error('Current deployment does not match the durable recovery binding')
  return binding
}

async function verifyStagedMetadata(store, journal, manifest) {
  const prefix = `_releases/${journal.nextReceipt.curatedIdentityHash}/`
  for await (const page of store.list({ prefix, paginate: true })) {
    await forEachBounded(page.blobs.filter(({ key }) => key !== `${prefix}_manifest.json`), async ({ key }) => {
      const metadata = (await store.getMetadata(key))?.metadata
      if (!metadata || !SHA.test(metadata.sha256 ?? '')) throw new Error('Staged recovery metadata is missing')
      const expected = uploadMetadataForFile(key.slice(prefix.length), metadata.sha256, manifest)
      if (canonicalDigest(metadata) !== canonicalDigest(expected)) throw new Error('Staged recovery metadata changed')
      const bytes = bytesOf(await store.get(key, { type: 'arrayBuffer' }))
      if (!bytes || hashBytes(bytes) !== metadata.sha256) throw new Error('Staged recovery bytes differ from their metadata')
    })
  }
}

export async function activateRecovery({ launchStore, certifiedStore, auditStore, journal, approvedJournalHash, inspect }) {
  validateRecoveryJournal(journal, approvedJournalHash)
  await verifyBackup(auditStore, journal)
  await assertNoCertifiedPointer(certifiedStore)
  const { site, runtime } = await inspect()
  const binding = await ownedDeployment(auditStore, journal, site)
  assertRuntime(runtime, targetOf(journal), journal.nextReceipt.releaseSha)
  if (runtime.salesPaused !== true || runtime.checkoutReady !== false || runtime.customBuildCheckoutReady !== false || runtime.bookingKitSalesEnabled !== false) throw new Error('The recovered application must pause new paid sales before activation')
  const stagedBytes = bytesOf(await launchStore.get(`_releases/${journal.nextReceipt.curatedIdentityHash}/_manifest.json`, { type: 'arrayBuffer' }))
  if (!stagedBytes || hashBytes(stagedBytes) !== journal.nextReceipt.manifestRawHash) throw new Error('Staged recovery manifest is missing or changed')
  const manifest = JSON.parse(stagedBytes.toString('utf8'))
  if (canonicalDigest(manifest) !== journal.nextReceipt.manifestHash || await verifyLaunchSnapshot(launchStore, manifest) !== journal.nextReceipt.fileEvidenceHash) throw new Error('Staged recovery snapshot changed')
  await verifyStagedMetadata(launchStore, journal, manifest)
  await immutableBytes(auditStore, `${journal.backupPrefix}/activation-intent.json`, jsonBytes({ journalHash: approvedJournalHash, deploymentId: binding.deploymentId, manifestRawHash: journal.nextReceipt.manifestRawHash }))
  const latest = await inspect()
  await ownedDeployment(auditStore, journal, latest.site)
  assertRuntime(latest.runtime, targetOf(journal), journal.nextReceipt.releaseSha)
  if (latest.runtime.salesPaused !== true || latest.runtime.checkoutReady !== false || latest.runtime.customBuildCheckoutReady !== false || latest.runtime.bookingKitSalesEnabled !== false) throw new Error('Sales pause changed before recovery activation')
  await assertNoCertifiedPointer(certifiedStore)
  const current = await readManifest(launchStore)
  const currentHash = hashBytes(current.bytes)
  if (![journal.previousManifestSha256, journal.nextReceipt.manifestRawHash].includes(currentHash)) throw new Error('Manifest changed concurrently before recovery activation')
  if (currentHash === journal.previousManifestSha256) {
    if (canonicalDigest(current.metadata) !== journal.previousMetadataHash) throw new Error('Legacy metadata changed before recovery activation')
    await launchStore.set('_manifest.json', stagedBytes)
  }
  if (hashBytes((await readManifest(launchStore)).bytes) !== journal.nextReceipt.manifestRawHash) throw new Error('Activated recovery manifest readback failed')
  await assertNoCertifiedPointer(certifiedStore)
  const after = await inspect()
  await ownedDeployment(auditStore, journal, after.site)
  assertRuntime(after.runtime, targetOf(journal), journal.nextReceipt.releaseSha)
  if (after.runtime.salesPaused !== true || after.runtime.checkoutReady !== false || after.runtime.customBuildCheckoutReady !== false || after.runtime.bookingKitSalesEnabled !== false) throw new Error('Sales pause was lost after recovery activation; retain the journal for rollback')
  if (after.runtime.publishedTemplateCount !== 60 || after.runtime.templateCatalogReady !== true) throw new Error('Recovery activation is not yet attested; retain the journal for retry or rollback')
  await assertNoCertifiedPointer(certifiedStore)
  await immutableBytes(auditStore, `${journal.backupPrefix}/activated.json`, jsonBytes({ journalHash: approvedJournalHash, deploymentId: binding.deploymentId, templates: 60, fullCatalogueCertified: false }))
  return { templates: 60, fullCatalogueCertified: false, salesPaused: true }
}

export async function rollbackRecovery({ launchStore, certifiedStore, auditStore, journal, approvedJournalHash, inspectSite, restoreDeployment, inspect }) {
  validateRecoveryJournal(journal, approvedJournalHash)
  const backup = await verifyBackup(auditStore, journal)
  await assertNoCertifiedPointer(certifiedStore)
  const site = await inspectSite()
  assertTarget(site, targetOf(journal))
  if (site.published_deploy.id !== journal.previousDeploymentId) await ownedDeployment(auditStore, journal, site)
  const current = await readManifest(launchStore)
  if (![journal.previousManifestSha256, journal.nextReceipt.manifestRawHash].includes(hashBytes(current.bytes))) throw new Error('Rollback would overwrite a foreign manifest')
  await immutableBytes(auditStore, `${journal.backupPrefix}/rollback-intent.json`, jsonBytes({ journalHash: approvedJournalHash, previousDeploymentId: journal.previousDeploymentId, previousManifestSha256: journal.previousManifestSha256 }))
  const latest = await inspectSite()
  if (latest.published_deploy.id !== site.published_deploy.id) throw new Error('Deployment changed concurrently before rollback')
  if (hashBytes((await readManifest(launchStore)).bytes) !== hashBytes(current.bytes)) throw new Error('Manifest changed concurrently before rollback')
  await assertNoCertifiedPointer(certifiedStore)
  await launchStore.set('_manifest.json', backup.bytes, { metadata: backup.metadata })
  const restored = await readManifest(launchStore)
  if (hashBytes(restored.bytes) !== journal.previousManifestSha256 || canonicalDigest(restored.metadata) !== journal.previousMetadataHash) throw new Error('Raw legacy manifest rollback readback failed')
  await assertNoCertifiedPointer(certifiedStore)
  const beforeRestore = await inspectSite()
  assertTarget(beforeRestore, targetOf(journal))
  if (beforeRestore.published_deploy.id !== site.published_deploy.id) throw new Error('Deployment changed concurrently before deployment restoration')
  if (site.published_deploy.id !== journal.previousDeploymentId) await restoreDeployment(journal.previousDeploymentId)
  const after = await inspect()
  assertTarget(after.site, targetOf(journal))
  assertRuntime(after.runtime, targetOf(journal), journal.previousReleaseSha)
  if (after.site.published_deploy.id !== journal.previousDeploymentId || after.runtime.publishedTemplateCount !== 0 || after.runtime.templateCatalogReady !== false) throw new Error('Original broken deployment restoration is not yet attested')
  await assertNoCertifiedPointer(certifiedStore)
  await immutableBytes(auditStore, `${journal.backupPrefix}/rolled-back.json`, jsonBytes({ journalHash: approvedJournalHash, deploymentId: journal.previousDeploymentId, templates: 0, originalBrokenStateRestored: true }))
  return { templates: 0, originalBrokenStateRestored: true }
}
