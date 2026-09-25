#!/usr/bin/env node
import { readFile, writeFile, lstat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getStore } from '@netlify/blobs'
import { CERTIFIED_STORE, CERTIFIED_TOTAL, canonicalDigest, createCertifiedPointer, validateCertification, validateCertifiedPointer, assertCatalogDeployment, forEachBounded } from '../src/lib/templates/certified-catalog-contract.mjs'
import { main as validateUpload, manifestDigest, publishRehabStagingCatalog, validateRehabV3StagingCatalogManifest, validateV3QualityReceipt, validateLaunchCatalogManifest } from './upload-templates-to-blobs.mjs'
import { assertNetlifyTarget } from './netlify-target-contract.mjs'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = async (file) => JSON.parse(await readFile(file, 'utf8'))
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export function reviewedHead(repository = REPO) {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim()
  if (!/^[a-f0-9]{40}$/.test(head) || execFileSync('git', ['status', '--porcelain'], { cwd: repository, encoding: 'utf8' }).trim()) throw new Error('Certification requires an exact clean repository commit; keep release artifacts outside the checkout')
  return head
}

export function validateFullGate(plan, catalogHash) {
  const customization = plan?.customizationVerification
  if (!plan || plan.dryRun !== true || plan.publicationPerformed !== false || plan.catalogHash !== catalogHash || !/^[a-f0-9]{64}$/.test(plan.sourceCatalogHash ?? '') || plan.sourceTemplates !== CERTIFIED_TOTAL || plan.aliases !== CERTIFIED_TOTAL || !Number.isSafeInteger(plan.sourcePages) || plan.sourcePages < CERTIFIED_TOTAL || !Number.isSafeInteger(plan.emittedPages) || plan.emittedPages < CERTIFIED_TOTAL || !/\b0 quarantined\b/i.test(plan.uploaderOutput ?? '') || customization?.pass !== true || customization.catalogTemplates !== CERTIFIED_TOTAL || customization.scannedTemplates !== CERTIFIED_TOTAL || customization.pages !== plan.emittedPages || customization.diagnosticCount !== 0 || customization.diagnosticsTruncated !== 0 || !Array.isArray(customization.diagnostics) || customization.diagnostics.length !== 0) throw new Error('Full promotion gate is missing, incomplete, or does not match the catalogue')
}

export function validateConnectedEvidence(report, receipt) {
  if (!report || report.releaseSha !== receipt.releaseSha || report.catalogHash !== receipt.catalogHash || report.manifestHash !== receipt.manifestHash || report.certificationHash !== canonicalDigest(receipt) || typeof report.reviewedAt !== 'string' || !Number.isFinite(Date.parse(report.reviewedAt)) || typeof report.evidenceUrl !== 'string' || !report.evidenceUrl.startsWith('https://')) throw new Error('Connected staging evidence is not bound to this certified release')
  for (const gate of ['stripe', 'email', 'provisioning', 'previewEditing', 'refundRecovery', 'rollback']) if (report.checks?.[gate] !== 'passed') throw new Error(`Connected staging ${gate} evidence is required`)
}

export function validateTemplateEvidence(mapping, receipt, rehab, ruleVersion) {
  if (!receipt || receipt.id !== mapping.qualityReceipt || receipt.legacySlug !== mapping.legacySlug || receipt.niche !== mapping.niche || receipt.ruleVersion !== ruleVersion || rehab?.ruleVersion !== ruleVersion || rehab?.sourceHash !== receipt.sourceHash || rehab?.sourcePreserved !== true || !['primary', 'cloud_fragment'].includes(rehab?.repairMode) || rehab?.renderRemediation === 'neutral') throw new Error(`Missing, mismatched, or neutral-fallback evidence for ${mapping.niche}/${mapping.legacySlug}`)
  const { id, ...body } = receipt
  if (id !== `receipt_${canonicalDigest(body).slice(0, 24)}` || !/^[a-f0-9]{64}$/.test(receipt.artifactHash ?? '') || !/^[a-f0-9]{64}$/.test(receipt.sourceHash ?? '') || receipt.checks?.static !== 'passed' || receipt.checks?.desktop !== 'passed' || receipt.checks?.mobile !== 'passed' || receipt.checks?.criticalDefects !== 0 || receipt.checks?.seriousDefects !== 0) throw new Error('Final browser receipt is invalid')
  return { niche: mapping.niche, slug: mapping.legacySlug, receiptHash: canonicalDigest(receipt), rehabHash: canonicalDigest(rehab), artifactHash: receipt.artifactHash }
}

export function assertReceiptBoundFile(key, bytes, certified) {
  if (!certified || certified.sha256 !== digest(bytes) || certified.bytes !== bytes.length) throw new Error(`File changed after browser receipt validation: ${key}`)
}

export async function prepareCertification(root, planPath, head = reviewedHead()) {
  const validated = await validateUpload(['--root', root, '--rehab-v3-staging', '--dry-run'], {}, { includePlan: true })
  const catalog = JSON.parse(validated.catalogBytes.toString('utf8'))
  const catalogHash = digest(validated.catalogBytes)
  const planBytes = await readFile(planPath)
  const plan = JSON.parse(planBytes.toString('utf8'))
  validateFullGate(plan, catalogHash)
  const evidence = []
  const expectedFiles = new Map()
  for (const mapping of catalog.templates) {
    const dir = path.join(root, mapping.niche, mapping.legacySlug)
    const meta = validated.manifest[mapping.niche].find((entry) => entry.legacySlug === mapping.legacySlug)
    const errors = validateV3QualityReceipt(dir, { ...meta, contractVersion: 3 })
    if (errors.length) throw new Error(`Invalid final receipt: ${errors[0]}`)
    const receipt = await json(path.join(dir, '.dailyclarity/final-quality-receipt.json'))
    const tree = await json(path.join(dir, '.dailyclarity/artifact-tree.json'))
    const records = tree.files.map(({ path: file, sha256, bytes }) => ({ path: file, sha256, bytes })).sort((a, b) => a.path.localeCompare(b.path))
    if (canonicalDigest(records) !== receipt.artifactHash || tree.treeHash !== receipt.artifactHash) throw new Error('Artifact tree changed after final receipt verification')
    for (const record of records) expectedFiles.set(`${mapping.niche}/${mapping.legacySlug}/${record.path}`, record)
    const rehabBytes = await readFile(path.join(dir, '.dailyclarity/rehabilitation.json'))
    if (digest(rehabBytes) !== records.find((record) => record.path === '.dailyclarity/rehabilitation.json')?.sha256) throw new Error('Rehabilitation evidence differs from the browser-certified tree')
    evidence.push(validateTemplateEvidence(mapping, receipt, JSON.parse(rehabBytes.toString('utf8')), catalog.ruleVersion))
  }
  const fileEvidence = []
  const files = []
  for (const record of validated.fileRecords) {
    const stat = await lstat(record.full)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Certified file is not a regular file')
    const bytes = await readFile(record.full)
    const sha256 = digest(bytes)
    const certified = expectedFiles.get(record.key)
    assertReceiptBoundFile(record.key, bytes, certified)
    fileEvidence.push({ key: record.key, bytes: bytes.length, sha256 })
    files.push({ key: record.key, read: async () => {
      const current = await readFile(record.full)
      if (digest(current) !== sha256) throw new Error(`Certified file changed after verification: ${record.key}`)
      return current
    } })
  }
  evidence.sort((a, b) => `${a.niche}/${a.slug}`.localeCompare(`${b.niche}/${b.slug}`))
  fileEvidence.sort((a, b) => a.key.localeCompare(b.key))
  const receipt = { version: 1, profile: 'rehab-certified', releaseSha: head, catalogHash, manifestHash: manifestDigest(validated.manifest), fullGateHash: digest(planBytes), sourceCatalogHash: plan.sourceCatalogHash, templateEvidenceHash: canonicalDigest(evidence), fileEvidenceHash: canonicalDigest(fileEvidence), sourceTemplates: CERTIFIED_TOTAL, certifiedTemplates: evidence.length, neutralFallbacks: 0, customizationDiagnostics: 0, files: files.length, pages: plan.emittedPages }
  validateCertification(receipt)
  return { receipt, manifest: validated.manifest, catalogBytes: validated.catalogBytes, files }
}

export async function verifySnapshot(store, pointer) {
  validateCertifiedPointer(pointer)
  const [catalogBytes, manifest, receipt] = await Promise.all([store.get(pointer.catalogKey, { type: 'arrayBuffer' }), store.get(pointer.manifestKey, { type: 'json' }), store.get(pointer.certificationKey, { type: 'json' })])
  if (!catalogBytes || digest(Buffer.from(catalogBytes)) !== pointer.catalogHash || manifestDigest(manifest) !== pointer.manifestHash || canonicalDigest(receipt) !== pointer.certificationHash) throw new Error('Previous certified snapshot hashes do not match')
  validateCertification(receipt, { releaseSha: pointer.releaseSha, catalogHash: pointer.catalogHash, manifestHash: pointer.manifestHash })
  const validation = validateRehabV3StagingCatalogManifest(manifest, JSON.parse(Buffer.from(catalogBytes).toString('utf8')))
  if (!validation.pass) throw new Error('Previous certified snapshot is incomplete')
  // Rollback also proves every byte, not just catalogue documents.
  const evidence = []
  const fileKeys = Object.values(manifest).flatMap((templates) => templates.flatMap((template) => template.files.map((file) => `${template.dir}/${file}`)))
  await forEachBounded(fileKeys, async (relativeKey) => {
    const key = `catalogs/${pointer.catalogHash}/${relativeKey}`
    const [metadata, bytes] = await Promise.all([store.getMetadata(key), store.get(key, { type: 'arrayBuffer' })])
    if (!bytes || metadata?.metadata?.catalogHash !== pointer.catalogHash || digest(Buffer.from(bytes)) !== metadata?.metadata?.sha256) throw new Error(`Previous certified object is missing or corrupt: ${key}`)
    evidence.push({ key: relativeKey, bytes: Buffer.from(bytes).length, sha256: digest(Buffer.from(bytes)) })
  })
  evidence.sort((a, b) => a.key.localeCompare(b.key))
  if (evidence.length !== receipt.files || canonicalDigest(evidence) !== receipt.fileEvidenceHash) throw new Error('Previous certified file bytes differ from the sealed receipt')
}

export function validateRollback(record, siteId) {
  if (record?.version !== 1 || record.siteId !== siteId || !/^[a-zA-Z0-9_-]+$/.test(record.previousDeploymentId ?? '') || !/^[a-f0-9]{40}$/.test(record.previousReleaseSha ?? '') || !/^[a-f0-9]{64}$/.test(record.nextCertificationHash ?? '')) throw new Error('Rollback identity is incomplete or targets another site')
  if (record.previousProfile === 'rehab-certified') {
    validateCertifiedPointer(record.previousPointer)
    if (record.previousPointer.releaseSha !== record.previousReleaseSha) throw new Error('Previous deployment and catalogue commit do not match')
  } else if (record.previousProfile === 'launch') {
    if (record.previousPointer !== null || !validateLaunchCatalogManifest(record.previousManifest).pass || manifestDigest(record.previousManifest) !== record.previousManifestHash || !/^[a-f0-9]{64}$/.test(record.previousFileEvidenceHash ?? '')) throw new Error('Curated rollback baseline is not the approved immutable manifest')
  } else throw new Error('Rollback profile is unsupported')
  return record
}

export async function verifyLaunchSnapshot(store, manifest) {
  if (!validateLaunchCatalogManifest(manifest).pass) throw new Error('Launch rollback manifest is not approved')
  const evidence = []
  await forEachBounded(Object.values(manifest).flat(), async (entry) => {
    if (!Array.isArray(entry.files) || entry.files.length === 0 || !entry.dir.startsWith('_releases/') || entry.dir.includes('..') || entry.dir.includes('\\')) throw new Error('Launch rollback requires immutable directories and a complete file list')
    const prefix = `${entry.dir}/`, keys = []
    for await (const page of store.list({ prefix, paginate: true })) for (const blob of page.blobs) {
      if (!blob.key.startsWith(prefix) || blob.key.slice(prefix.length).split('/').some((part) => !part || part === '..' || part === '.') || blob.key.includes('\\')) throw new Error('Launch rollback file escaped its immutable template')
      keys.push(blob.key)
    }
    if (new Set(keys).size !== keys.length || entry.files.some((file) => !keys.includes(`${prefix}${file}`))) throw new Error('Launch rollback template is incomplete')
    const tree = createHash('sha256')
    for (const key of keys.sort()) {
      const value = await store.get(key, { type: 'arrayBuffer' })
      if (!value) throw new Error('Launch rollback file is missing')
      const bytes = Buffer.from(value)
      tree.update(key.slice(prefix.length)); tree.update('\0'); tree.update(bytes); tree.update('\0')
      evidence.push({ key, bytes: bytes.length, sha256: digest(bytes) })
    }
    if (tree.digest('hex') !== entry.artifactSha256) throw new Error('Launch rollback bytes differ from the approved artifact receipt')
  })
  evidence.sort((a, b) => a.key.localeCompare(b.key))
  return canonicalDigest(evidence)
}

export function deploymentProofBytes(releaseSha, certificationHash) {
  if (!/^[a-f0-9]{40}$/.test(releaseSha ?? '') || !/^[a-f0-9]{64}$/.test(certificationHash ?? '')) throw new Error('Deployment proof identity is invalid')
  return Buffer.from(`${JSON.stringify({ version: 1, releaseSha, certificationHash })}\n`)
}

export function assertDeploymentProof(deploy, file, record, siteId, deploymentId) {
  const expected = createHash('sha1').update(deploymentProofBytes(record.nextPointer.releaseSha, record.nextCertificationHash)).digest('hex')
  if (deploy?.id !== deploymentId || deploy.site_id !== siteId || deploy.state !== 'ready' || (deploy.commit_ref && deploy.commit_ref !== record.nextPointer.releaseSha) || !['/__dailyclarity_release.json', '__dailyclarity_release.json'].includes(file?.path) || file?.sha !== expected) throw new Error('Immutable deployment artifact does not attest this commit and certification')
}

export async function stageCertifiedCatalog({ store, prepared, approvedReceiptHash }) {
  const receipt = validateCertification(prepared.receipt)
  if (canonicalDigest(receipt) !== approvedReceiptHash) throw new Error('Release files or receipt differ from the approved certification hash')
  if (digest(prepared.catalogBytes) !== receipt.catalogHash || manifestDigest(prepared.manifest) !== receipt.manifestHash || !validateRehabV3StagingCatalogManifest(prepared.manifest, JSON.parse(Buffer.from(prepared.catalogBytes).toString('utf8'))).pass) throw new Error('Publication identities differ from the certified receipt')
  // Read every local file again before the first remote write.
  const fileEvidence = []
  for (const file of prepared.files) {
    const bytes = Buffer.from(await file.read())
    fileEvidence.push({ key: file.key, bytes: bytes.length, sha256: digest(bytes) })
  }
  fileEvidence.sort((a, b) => a.key.localeCompare(b.key))
  if (prepared.files.length !== receipt.files || canonicalDigest(fileEvidence) !== receipt.fileEvidenceHash) throw new Error('Publication files differ from the certified receipt')
  const fileHashes = new Map(fileEvidence.map((file) => [file.key, file.sha256]))
  const verifiedFiles = prepared.files.map((file) => ({ key: file.key, read: async () => {
    const bytes = Buffer.from(await file.read())
    if (digest(bytes) !== fileHashes.get(file.key)) throw new Error('Certified file changed during upload')
    return bytes
  } }))
  const pointer = createCertifiedPointer(receipt)
  const previousReceipt = await store.get(pointer.certificationKey, { type: 'json' })
  if (previousReceipt && canonicalDigest(previousReceipt) !== approvedReceiptHash) throw new Error('Immutable certification object conflicts')
  await publishRehabStagingCatalog({ store, ...prepared, files: verifiedFiles, activate: false })
  if (!previousReceipt) await store.setJSON(pointer.certificationKey, receipt)
  if (canonicalDigest(await store.get(pointer.certificationKey, { type: 'json' })) !== approvedReceiptHash) throw new Error('Certification readback failed')
  return pointer
}

export async function publishCertifiedCatalog({ store, prepared, approvedReceiptHash, rollback, siteId, deploymentId }) {
  const receipt = validateCertification(prepared.receipt)
  if (canonicalDigest(receipt) !== approvedReceiptHash) throw new Error('Approved certification hash does not match activation')
  validateRollback(rollback, siteId)
  if (rollback.nextCertificationHash !== approvedReceiptHash || !/^[a-zA-Z0-9_-]+$/.test(deploymentId ?? '')) throw new Error('Rollback record does not belong to this release')
  const pointer = rollback.nextPointer ?? createCertifiedPointer(receipt)
  validateCertifiedPointer(pointer)
  if (pointer.certificationHash !== approvedReceiptHash) throw new Error('Captured next pointer differs from certification')
  // All potentially slow upload/readback work finishes while the previous app
  // and catalogue are still serving. Activation never uploads template files.
  await verifySnapshot(store, pointer)
  const active = await store.get('_active.json', { type: 'json' })
  const journalKey = `rollbacks/${approvedReceiptHash}/${deploymentId}.json`
  const priorJournal = await store.get(journalKey, { type: 'json' })
  if (active?.certificationHash === approvedReceiptHash && priorJournal && canonicalDigest(active) === canonicalDigest(priorJournal.nextPointer)) return { pointer: active, journalKey }
  if (canonicalDigest(active ?? null) !== canonicalDigest(rollback.previousPointer)) throw new Error('Active catalogue changed after rollback capture')
  if (rollback.previousPointer) await verifySnapshot(store, rollback.previousPointer)
  const journal = { ...rollback, deploymentId, nextPointer: pointer }
  if (priorJournal && canonicalDigest({ ...priorJournal, nextPointer: null }) !== canonicalDigest({ ...journal, nextPointer: null })) throw new Error('Rollback journal conflicts with an existing release')
  if (priorJournal) Object.assign(pointer, priorJournal.nextPointer)
  else await store.setJSON(journalKey, journal)
  if (canonicalDigest(await store.get(journalKey, { type: 'json' })) !== canonicalDigest(priorJournal ?? journal)) throw new Error('Rollback journal readback failed')
  if (canonicalDigest(await store.get('_active.json', { type: 'json' }) ?? null) !== canonicalDigest(rollback.previousPointer)) throw new Error('Active catalogue changed before activation; refused')
  await store.setJSON('_active.json', pointer)
  if (canonicalDigest(await store.get('_active.json', { type: 'json' })) !== canonicalDigest(pointer)) throw new Error('Certified pointer readback failed; use the preserved rollback journal')
  return { pointer, journalKey }
}

export async function rollbackCertifiedCatalog({ store, launchStore, record, siteId, currentDeploymentId, restoreDeployment }) {
  validateRollback(record, siteId)
  validateCertifiedPointer(record.nextPointer)
  if (record.nextPointer.certificationHash !== record.nextCertificationHash || ![record.deploymentId, record.previousDeploymentId].includes(currentDeploymentId)) throw new Error('Rollback would overwrite a different deployment')
  const active = await store.get('_active.json', { type: 'json' })
  if (![canonicalDigest(record.nextPointer), canonicalDigest(record.previousPointer)].includes(canonicalDigest(active ?? null))) throw new Error('Rollback would overwrite a different catalogue')
  if (record.previousPointer) await verifySnapshot(store, record.previousPointer)
  else {
    const current = await launchStore.get('_manifest.json', { type: 'json' })
    if (manifestDigest(current) !== record.previousManifestHash || !validateLaunchCatalogManifest(current).pass) throw new Error('Previous launch baseline changed; rollback refused')
    if (await verifyLaunchSnapshot(launchStore, current) !== record.previousFileEvidenceHash) throw new Error('Previous launch files differ from captured rollback evidence')
  }
  if (record.previousPointer) await store.setJSON('_active.json', record.previousPointer)
  else await store.delete('_active.json')
  if (canonicalDigest(await store.get('_active.json', { type: 'json' }) ?? null) !== canonicalDigest(record.previousPointer)) throw new Error('Rollback pointer readback failed')
  await restoreDeployment(record.previousDeploymentId)
}

async function api(resource, env, method = 'GET') {
  const response = await fetch(`https://api.netlify.com/api/v1/${resource}`, { method, headers: { authorization: `Bearer ${env.NETLIFY_AUTH_TOKEN}` }, signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Netlify release API failed (${response.status})`)
  return response.json()
}

export async function connectedTarget(env, { readRuntime = true } = {}) {
  assertCatalogDeployment({ ...env, SITE_ID: env.NETLIFY_SITE_ID }, 'production')
  if (!env.NETLIFY_AUTH_TOKEN || (readRuntime && !env.INTERNAL_ADMIN_TOKEN)) throw new Error('Release credentials are incomplete')
  const site = await api(`sites/${encodeURIComponent(env.NETLIFY_SITE_ID)}`, env)
  assertNetlifyTarget(site, { environment: 'production', configuredSiteId: env.NETLIFY_SITE_ID, expectedSiteId: env.NETLIFY_EXPECTED_SITE_ID, expectedHostname: env.NETLIFY_EXPECTED_SITE_HOSTNAME, expectedAccountSlug: env.NETLIFY_EXPECTED_ACCOUNT_SLUG })
  const stores = { site, store: getStore({ name: CERTIFIED_STORE, consistency: 'strong', siteID: site.id, token: env.NETLIFY_AUTH_TOKEN }), launchStore: getStore({ name: 'templates', consistency: 'strong', siteID: site.id, token: env.NETLIFY_AUTH_TOKEN }) }
  if (!readRuntime) return stores
  const response = await fetch(`https://${env.NETLIFY_EXPECTED_SITE_HOSTNAME}/api/integrations/status`, { headers: { authorization: `Bearer ${env.INTERNAL_ADMIN_TOKEN}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error('Cannot attest the current deployment before catalogue mutation')
  const runtime = await response.json()
  if (runtime.deploymentSiteId !== site.id || !/^[a-f0-9]{40}$/.test(runtime.deploymentReleaseSha ?? '')) throw new Error('Current deployment identity is unavailable')
  return { ...stores, runtime }
}

export async function main(args = process.argv.slice(2), env = process.env) {
  const [command, ...rest] = args
  const flags = {}
  for (let i = 0; i < rest.length; i += 2) {
    if (!/^--[a-z-]+$/.test(rest[i]) || !rest[i + 1] || Object.hasOwn(flags, rest[i])) throw new Error('Use explicit unique --name value arguments')
    flags[rest[i]] = rest[i + 1]
  }
  if (!['prepare', 'verify', 'capture', 'stage', 'bootstrap', 'publish', 'bind', 'rollback'].includes(command)) throw new Error('Use prepare, verify, capture, stage, bootstrap, publish, bind, or rollback')
  if (command === 'bind') {
    const record = await json(flags['--record'])
    if (canonicalDigest(record) !== flags['--record-hash']) throw new Error('Bootstrap journal differs from the approved hash')
    const { site, store } = await connectedTarget(env, { readRuntime: false })
    validateRollback(record, site.id)
    validateCertifiedPointer(record.nextPointer)
    if (record.nextPointer.certificationHash !== record.nextCertificationHash) throw new Error('Captured pointer and certification differ')
    const deploymentId = flags['--deployment-id']
    if (!/^[a-zA-Z0-9_-]+$/.test(deploymentId ?? '') || site.published_deploy?.id !== deploymentId || ![canonicalDigest(record.nextPointer), canonicalDigest(record.previousPointer)].includes(canonicalDigest(await store.get('_active.json', { type: 'json' }) ?? null))) throw new Error('Cannot bind a journal to another deployment or catalogue')
    const [deploy, file] = await Promise.all([api(`deploys/${deploymentId}`, env), api(`sites/${site.id}/files/__dailyclarity_release.json`, env)])
    assertDeploymentProof(deploy, file, record, site.id, deploymentId)
    if ((await api(`sites/${site.id}`, env)).published_deploy?.id !== deploymentId) throw new Error('Published deployment changed during artifact proof verification')
    // Binding records what was deployed even if the candidate catalogue has
    // become unavailable. Only the previous snapshot must be healthy to roll back.
    const bound = { ...record, deploymentId }
    const key = `rollbacks/${record.nextCertificationHash}/${deploymentId}.json`
    const previous = await store.get(key, { type: 'json' })
    if (previous && canonicalDigest(previous) !== canonicalDigest(bound)) throw new Error('Deployment rollback journal already differs')
    if (!previous) await store.setJSON(key, bound)
    if (canonicalDigest(await store.get(key, { type: 'json' })) !== canonicalDigest(bound)) throw new Error('Bound rollback journal readback failed')
    await writeFile(flags['--record'], `${JSON.stringify(bound, null, 2)}\n`)
    console.log(`Bound rollback deployment ${deploymentId}; record hash ${canonicalDigest(bound)}`)
    return
  }
  if (command === 'rollback') {
    const record = await json(flags['--record'])
    if (canonicalDigest(record) !== flags['--record-hash']) throw new Error('Rollback record differs from the explicitly approved hash')
    const { site, store, launchStore } = await connectedTarget(env, { readRuntime: false })
    return rollbackCertifiedCatalog({ store, launchStore, record, siteId: site.id, currentDeploymentId: site.published_deploy?.id, restoreDeployment: async (id) => {
      await api(`sites/${site.id}/deploys/${id}/restore`, env, 'POST')
      const verified = await api(`sites/${site.id}`, env)
      if (verified.published_deploy?.id !== id) throw new Error('Previous deployment restore is not yet attested; retain rollback record and retry')
    } })
  }
  const head = reviewedHead()
  const prepared = await prepareCertification(path.resolve(flags['--root']), flags['--plan'], head)
  const receiptHash = canonicalDigest(prepared.receipt)
  if (command === 'prepare') {
    await writeFile(flags['--receipt'], `${JSON.stringify(prepared.receipt, null, 2)}\n`, { flag: 'wx' })
    console.log(`Prepared certification ${receiptHash} for commit ${head}; no provider writes`)
    return
  }
  if (flags['--receipt-hash'] !== receiptHash || canonicalDigest(await json(flags['--receipt'])) !== receiptHash) throw new Error('Approved certification differs from repository, evidence, or files')
  if (command === 'verify') { console.log(`Verified complete certification ${receiptHash} at ${head}; no provider writes`); return }
  if (['stage', 'bootstrap', 'publish'].includes(command)) {
    const bytes = await readFile(flags['--connected-evidence'])
    if (digest(bytes) !== flags['--connected-evidence-hash']) throw new Error('Connected evidence does not match its approved digest')
    validateConnectedEvidence(JSON.parse(bytes.toString('utf8')), prepared.receipt)
  }
  const { site, runtime, store, launchStore } = await connectedTarget(env)
  if (command === 'capture') {
    const previousPointer = await store.get('_active.json', { type: 'json' })
    const previousProfile = runtime.templateCatalogProfile
    if (previousProfile === 'rehab-certified') await verifySnapshot(store, previousPointer)
    const previousManifest = previousProfile === 'launch' ? await launchStore.get('_manifest.json', { type: 'json' }) : undefined
    const previousFileEvidenceHash = previousManifest ? await verifyLaunchSnapshot(launchStore, previousManifest) : undefined
    const record = { version: 1, siteId: site.id, previousDeploymentId: site.published_deploy?.id, previousReleaseSha: runtime.deploymentReleaseSha, previousProfile, previousPointer: previousProfile === 'launch' ? null : previousPointer, ...(previousManifest ? { previousManifest, previousManifestHash: manifestDigest(previousManifest), previousFileEvidenceHash } : {}), nextCertificationHash: receiptHash, nextPointer: createCertifiedPointer(prepared.receipt) }
    validateRollback(record, site.id)
    if (previousProfile === 'launch' && previousPointer) throw new Error('Inactive certified pointer exists; explicitly resolve it before capturing a new release')
    await writeFile(flags['--record'], `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' })
    console.log('Captured previous deployment and catalogue; no provider writes')
    return
  }
  const rollback = await json(flags['--record'])
  validateRollback(rollback, site.id)
  if (rollback.nextCertificationHash !== receiptHash) throw new Error('Rollback capture belongs to a different certification')
  if (command === 'stage') {
    if (site.published_deploy?.id !== rollback.previousDeploymentId || runtime.deploymentReleaseSha !== rollback.previousReleaseSha) throw new Error('Previous deployment changed before staging immutable objects')
    await stageCertifiedCatalog({ store, prepared, approvedReceiptHash: receiptHash })
    console.log(`Staged and read back ${receiptHash}; active catalogue is unchanged`)
    return
  }
  if (command === 'bootstrap') {
    if (rollback.previousProfile !== 'launch' || runtime.templateCatalogProfile !== 'launch' || runtime.deploymentReleaseSha !== rollback.previousReleaseSha || site.published_deploy?.id !== rollback.previousDeploymentId) throw new Error('Bootstrap requires the captured launch deployment to remain live')
  } else if (runtime.deploymentReleaseSha !== head || runtime.templateCatalogProfile !== 'rehab-certified' || runtime.bookingKitSalesEnabled !== false || runtime.supabaseSchemaReady !== true || runtime.supabaseSchemaVersion !== '20260903.3' || runtime.bookingKitSchemaVersion !== '20260925.2' || runtime.supabaseProjectRef !== env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF) throw new Error('Published application commit, profile, sales flag, or database does not match the verified release')
  const result = await publishCertifiedCatalog({ store, prepared, approvedReceiptHash: receiptHash, rollback, siteId: site.id, deploymentId: site.published_deploy?.id })
  const journal = await store.get(result.journalKey, { type: 'json' })
  await writeFile(flags['--record'], `${JSON.stringify(journal, null, 2)}\n`)
  console.log(`Activated certification ${receiptHash}; rollback record hash ${canonicalDigest(journal)}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
