import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { canonicalDigest, createCertifiedPointer, PRODUCTION_NETLIFY_SITE_ID } from '../src/lib/templates/certified-catalog-contract.mjs'
import { REHAB_STAGING_CATALOG_CONTRACT, manifestDigest, LAUNCH_CATALOG_APPROVED_RECEIPT, LAUNCH_CATALOG_CONTRACT } from './upload-templates-to-blobs.mjs'
import { validateFullGate, validateTemplateEvidence, validateConnectedEvidence, stageCertifiedCatalog, publishCertifiedCatalog, rollbackCertifiedCatalog, verifySnapshot, reviewedHead, connectedTarget, deploymentProofBytes, assertDeploymentProof, verifyLaunchSnapshot, assertReceiptBoundFile } from './certified-catalog-release.mjs'
import { assertDeployedRuntime } from './deployed-runtime-contract.mjs'
import { assertReleaseCi } from './verify-release-ci.mjs'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const head = 'a'.repeat(40)
function plan(version = 'one') {
  const manifest = {}, templates = [], gallery = {}, files = [], evidence = []
  for (const [niche, count] of Object.entries(REHAB_STAGING_CATALOG_CONTRACT.templatesByNiche)) {
    manifest[niche] = []; gallery[niche] = []
    for (let i = 0; i < count; i++) {
      const slug = `source-${String(i).padStart(4, '0')}`
      const mapping = { legacySlug: slug, niche, designId: `design_${niche}_${i}`, contentPresetId: `content_${i}`, themePresetId: `theme_${i}`, qualityReceipt: `receipt_${i}`, canonicalLegacySlug: slug, disposition: 'canonical' }
      manifest[niche].push({ ...mapping, slug, nicheSlug: niche, dir: `${niche}/${slug}`, name: version, pages: ['index.html'], files: ['index.html'], fields: [{ name: 'BUSINESS_NAME', type: 'text' }], editable: true, validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] } })
      templates.push(mapping); gallery[niche].push(slug)
      const key = `${niche}/${slug}/index.html`, bytes = Buffer.from(`${key}:${version}`)
      files.push({ key, read: async () => bytes }); evidence.push({ key, bytes: bytes.length, sha256: sha(bytes) })
    }
  }
  evidence.sort((a, b) => a.key.localeCompare(b.key))
  const catalogBytes = Buffer.from(JSON.stringify({ contractVersion: 3, ruleVersion: version, generatedAt: '2026-09-25T00:00:00Z', sourceTemplates: 5486, canonicalDesigns: 5486, templates, gallery }))
  const receipt = { version: 1, profile: 'rehab-certified', releaseSha: head, catalogHash: sha(catalogBytes), manifestHash: manifestDigest(manifest), fullGateHash: 'b'.repeat(64), sourceCatalogHash: 'c'.repeat(64), templateEvidenceHash: 'd'.repeat(64), fileEvidenceHash: canonicalDigest(evidence), sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0, customizationDiagnostics: 0, files: files.length, pages: 5486 }
  return { manifest, catalogBytes, files, receipt }
}
class Store {
  values = new Map(); metadata = new Map(); writes = []
  async get(key, options) { const value = this.values.get(key); if (value === undefined) return null; return options?.type === 'json' ? structuredClone(value) : value }
  async getMetadata(key) { return this.metadata.has(key) ? { metadata: this.metadata.get(key) } : null }
  async set(key, value, options) { this.writes.push(key); this.values.set(key, Buffer.from(value)); this.metadata.set(key, options?.metadata ?? {}) }
  async setJSON(key, value) { this.writes.push(key); this.values.set(key, structuredClone(value)) }
  async delete(key) { this.writes.push(key); this.values.delete(key) }
  async *list({ prefix }) { yield { blobs: [...this.values.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })) } }
}
function rollback(previous, next) { return { version: 1, siteId: PRODUCTION_NETLIFY_SITE_ID, previousDeploymentId: 'previous-deploy', previousReleaseSha: head, previousProfile: 'rehab-certified', previousPointer: previous, nextCertificationHash: canonicalDigest(next.receipt) } }
function gate() { return { dryRun: true, publicationPerformed: false, catalogHash: 'a'.repeat(64), sourceCatalogHash: 'b'.repeat(64), sourceTemplates: 5486, aliases: 5486, sourcePages: 6000, emittedPages: 6000, uploaderOutput: '5486 passing; 0 quarantined', customizationVerification: { pass: true, catalogTemplates: 5486, scannedTemplates: 5486, pages: 6000, diagnosticCount: 0, diagnosticsTruncated: 0, diagnostics: [] } } }

test('full gate refuses missing, partial, stale, or nonzero diagnostic evidence', () => {
  assert.doesNotThrow(() => validateFullGate(gate(), 'a'.repeat(64)))
  for (const mutate of [(g) => g.sourceTemplates = 60, (g) => g.aliases--, (g) => g.catalogHash = 'c'.repeat(64), (g) => g.customizationVerification.scannedTemplates--, (g) => g.customizationVerification.pages--, (g) => g.customizationVerification.diagnostics.push({ code: 'unsafe' }), (g) => g.uploaderOutput = '1 quarantined', (g) => g.publicationPerformed = true]) {
    const broken = gate(); mutate(broken); assert.throws(() => validateFullGate(broken, 'a'.repeat(64)))
  }
  assert.throws(() => validateFullGate(null, 'a'.repeat(64)))
})
test('final receipts reject neutral replacement, swapped source or identity, and fabricated digests', () => {
  const body = { legacySlug: 'source', niche: 'sound_bath', sourceHash: 'a'.repeat(64), artifactHash: 'b'.repeat(64), ruleVersion: 'rule', checks: { static: 'passed', desktop: 'passed', mobile: 'passed', criticalDefects: 0, seriousDefects: 0 } }
  const receipt = { ...body, id: `receipt_${canonicalDigest(body).slice(0, 24)}` }
  const mapping = { legacySlug: 'source', niche: 'sound_bath', qualityReceipt: receipt.id }
  const rehab = { ruleVersion: 'rule', sourceHash: body.sourceHash, sourcePreserved: true, repairMode: 'primary' }
  assert.doesNotThrow(() => validateTemplateEvidence(mapping, receipt, rehab, 'rule'))
  for (const changes of [{ repairMode: 'neutral_fallback' }, { renderRemediation: 'neutral' }, { sourcePreserved: false }, { sourceHash: 'c'.repeat(64) }]) assert.throws(() => validateTemplateEvidence(mapping, receipt, { ...rehab, ...changes }, 'rule'))
  assert.throws(() => validateTemplateEvidence({ ...mapping, legacySlug: 'other' }, receipt, rehab, 'rule'))
  assert.throws(() => validateTemplateEvidence(mapping, { ...receipt, artifactHash: 'd'.repeat(64) }, rehab, 'rule'))
})
test('stage leaves active pointer untouched; activation is pointer-last and retries are stable', async () => {
  const store = new Store(), previous = plan('old'), next = plan('new')
  const prior = await stageCertifiedCatalog({ store, prepared: previous, approvedReceiptHash: canonicalDigest(previous.receipt) })
  assert.equal(await store.get('_active.json'), null)
  await store.setJSON('_active.json', prior)
  await stageCertifiedCatalog({ store, prepared: next, approvedReceiptHash: canonicalDigest(next.receipt) })
  assert.deepEqual(await store.get('_active.json'), prior)
  store.writes = []
  const args = { store, prepared: next, approvedReceiptHash: canonicalDigest(next.receipt), rollback: rollback(prior, next), siteId: PRODUCTION_NETLIFY_SITE_ID, deploymentId: 'new-deploy' }
  const result = await publishCertifiedCatalog(args)
  assert.equal(store.writes.at(-1), '_active.json')
  assert.equal(store.writes.length, 2, 'activation only records rollback and switches pointer; no template upload')
  store.writes = []
  assert.deepEqual(await publishCertifiedCatalog(args), result)
  assert.deepEqual(store.writes, [])
  const journal = await store.get(result.journalKey)
  const restored = []
  await rollbackCertifiedCatalog({ store, record: journal, siteId: PRODUCTION_NETLIFY_SITE_ID, currentDeploymentId: 'new-deploy', restoreDeployment: async (id) => restored.push(id) })
  assert.deepEqual(await store.get('_active.json'), prior)
  assert.deepEqual(restored, ['previous-deploy'])
})
test('missing files, altered bytes and mismatched identity are rejected before writes', async () => {
  const good = plan(), store = new Store()
  for (const broken of [{ ...good, files: good.files.slice(1) }, { ...good, catalogBytes: Buffer.from('{}') }, { ...good, files: [{ ...good.files[0], read: async () => Buffer.from('changed') }, ...good.files.slice(1)] }]) {
    await assert.rejects(stageCertifiedCatalog({ store, prepared: broken, approvedReceiptHash: canonicalDigest(good.receipt) }))
    assert.deepEqual(store.writes, [])
  }
})
test('rollback detects remote content and metadata swapped together, before mutation', async () => {
  const prepared = plan(), store = new Store()
  const pointer = await stageCertifiedCatalog({ store, prepared, approvedReceiptHash: canonicalDigest(prepared.receipt) })
  const key = `catalogs/${pointer.catalogHash}/${prepared.files[0].key}`
  store.values.set(key, Buffer.from('forged'))
  store.metadata.set(key, { ...store.metadata.get(key), sha256: sha('forged') })
  store.writes = []
  await assert.rejects(verifySnapshot(store, pointer), /sealed receipt/)
  assert.deepEqual(store.writes, [])
})
test('activation refuses unstaged or concurrently changed catalogues and wrong rollback site', async () => {
  const prepared = plan(), store = new Store(), previous = createCertifiedPointer(plan('old').receipt)
  const args = { store, prepared, approvedReceiptHash: canonicalDigest(prepared.receipt), rollback: rollback(previous, prepared), siteId: PRODUCTION_NETLIFY_SITE_ID, deploymentId: 'new' }
  await assert.rejects(publishCertifiedCatalog(args), /snapshot/)
  assert.deepEqual(store.writes, [])
  await stageCertifiedCatalog({ store, prepared, approvedReceiptHash: canonicalDigest(prepared.receipt) })
  await store.setJSON('_active.json', { unexpected: true }); store.writes = []
  await assert.rejects(publishCertifiedCatalog(args), /changed after/)
  await assert.rejects(publishCertifiedCatalog({ ...args, siteId: 'wrong-site' }), /another site/)
  assert.deepEqual(store.writes, [])
})
test('rollback target check does not call unhealthy application or need its admin token', async () => {
  const priorFetch = globalThis.fetch, calls = []
  globalThis.fetch = async (url) => {
    calls.push(url)
    if (!String(url).startsWith('https://api.netlify.com/')) throw new Error('app unavailable')
    return Response.json({ id: PRODUCTION_NETLIFY_SITE_ID, account_slug: 'account', custom_domain: 'dailyclarity.org', published_deploy: { id: 'broken-deploy' } })
  }
  try {
    await connectedTarget({ DAILYCLARITY_ENVIRONMENT: 'production', NETLIFY_SITE_ID: PRODUCTION_NETLIFY_SITE_ID, NETLIFY_EXPECTED_SITE_ID: PRODUCTION_NETLIFY_SITE_ID, NETLIFY_EXPECTED_ACCOUNT_SLUG: 'account', NETLIFY_EXPECTED_SITE_HOSTNAME: 'dailyclarity.org', NETLIFY_AUTH_TOKEN: 'test-only' }, { readRuntime: false })
    assert.equal(calls.length, 1)
  } finally { globalThis.fetch = priorFetch }
})
test('certification binds actual clean Git HEAD and rejects uncommitted source', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cert-head-'))
  const git = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  try {
    git(['init']); await writeFile(path.join(dir, 'source.txt'), 'reviewed'); git(['add', '.']); git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture'])
    assert.equal(reviewedHead(dir), git(['rev-parse', 'HEAD']))
    await writeFile(path.join(dir, 'source.txt'), 'changed')
    assert.throws(() => reviewedHead(dir), /clean repository/)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
test('runtime attestation and operator evidence cannot accept a curated baseline or wrong release', () => {
  const receipt = plan().receipt
  const expected = { siteId: 'site', projectRef: 'project', releaseSha: head, catalogProfile: 'rehab-certified', catalogHash: receipt.catalogHash, manifestHash: receipt.manifestHash, certificationHash: canonicalDigest(receipt) }
  const runtime = { deploymentSiteId: 'site', supabaseProjectRef: 'project', deploymentReleaseSha: head, supabaseSchemaVersion: '20260903.3', bookingKitSchemaVersion: '20260925.2', supabaseSchemaReady: true, templateCatalogReady: true, publishedTemplateCount: 5486, expectedTemplateCount: 5486, templateCatalogProfile: 'rehab-certified', templateCatalogHash: receipt.catalogHash, templateManifestHash: receipt.manifestHash, templateCertificationHash: canonicalDigest(receipt), templateCatalogueReleaseSha: head }
  assert.doesNotThrow(() => assertDeployedRuntime(runtime, expected))
  for (const changes of [{ publishedTemplateCount: 60 }, { templateCatalogProfile: 'launch' }, { templateCatalogHash: 'f'.repeat(64) }, { templateCatalogueReleaseSha: 'b'.repeat(40) }, { templateCatalogReady: false }]) assert.throws(() => assertDeployedRuntime({ ...runtime, ...changes }, expected))
  assert.throws(() => assertDeployedRuntime(runtime, { siteId: 'site', projectRef: 'project', releaseSha: head }))
  const report = { ...receipt, certificationHash: canonicalDigest(receipt), reviewedAt: '2026-09-25T12:00:00Z', evidenceUrl: 'https://example.invalid/review', checks: Object.fromEntries(['stripe', 'email', 'provisioning', 'previewEditing', 'refundRecovery', 'rollback'].map((key) => [key, 'passed'])) }
  assert.doesNotThrow(() => validateConnectedEvidence(report, receipt))
  assert.throws(() => validateConnectedEvidence({ ...report, checks: { ...report.checks, stripe: 'not-tested' } }, receipt))
  assert.throws(() => validateConnectedEvidence({ ...report, releaseSha: 'b'.repeat(40) }, receipt))
})
test('production requires genuine successful CI for this exact main commit', () => {
  const run = { head_sha: head, status: 'completed', conclusion: 'success', event: 'push', head_branch: 'main', path: '.github/workflows/ci.yml', head_repository: { full_name: 'owner/repo' } }
  assert.doesNotThrow(() => assertReleaseCi([run], head, 'owner/repo'))
  for (const change of [{ head_sha: 'b'.repeat(40) }, { conclusion: 'failure' }, { conclusion: 'skipped' }, { status: 'queued' }, { event: 'pull_request' }, { head_branch: 'feature' }, { path: '.github/workflows/netlify-preview.yml' }, { head_repository: { full_name: 'fork/repo' } }]) assert.throws(() => assertReleaseCi([{ ...run, ...change }], head, 'owner/repo'))
  assert.throws(() => assertReleaseCi([], head, 'owner/repo'))
})
test('binding needs API-side immutable deployment proof for the commit and certification', () => {
  const receipt = plan().receipt, record = { nextPointer: createCertifiedPointer(receipt), nextCertificationHash: canonicalDigest(receipt) }
  const deploy = { id: 'new', site_id: 'site', state: 'ready' }
  const file = { path: '/__dailyclarity_release.json', sha: createHash('sha1').update(deploymentProofBytes(head, record.nextCertificationHash)).digest('hex') }
  assert.doesNotThrow(() => assertDeploymentProof(deploy, file, record, 'site', 'new'))
  assert.throws(() => assertDeploymentProof({ ...deploy, commit_ref: 'f'.repeat(40) }, file, record, 'site', 'new'))
  assert.throws(() => assertDeploymentProof(deploy, { ...file, sha: createHash('sha1').update(deploymentProofBytes('f'.repeat(40), record.nextCertificationHash)).digest('hex') }, record, 'site', 'new'))
  assert.throws(() => assertDeploymentProof(deploy, { ...file, sha: createHash('sha1').update(deploymentProofBytes(head, 'e'.repeat(64))).digest('hex') }, record, 'site', 'new'))
  assert.throws(() => assertDeploymentProof(deploy, null, record, 'site', 'new'))
  assert.throws(() => assertDeploymentProof(deploy, file, record, 'site', 'unrelated'))
})
test('approved launch identities do not authorize substituted remote bytes with matching metadata', async () => {
  const manifest = {}, store = new Store()
  for (const template of LAUNCH_CATALOG_APPROVED_RECEIPT.templates) {
    const dir = `_releases/${LAUNCH_CATALOG_CONTRACT.templateIdentitySha256}/${template.niche}/${template.slug}`
    ;(manifest[template.niche] ??= []).push({ slug: template.slug, nicheSlug: template.niche, dir, sourceDir: `${template.niche}/${template.slug}`, artifactSha256: template.sha256, catalogReportSha256: LAUNCH_CATALOG_CONTRACT.curatedReportSha256, editable: true, validation: { status: 'passed', contractVersion: 2, tokens: ['BUSINESS_NAME'] }, files: ['index.html'] })
    store.values.set(`${dir}/index.html`, Buffer.from('substituted'))
    store.metadata.set(`${dir}/index.html`, { sha256: sha('substituted') })
  }
  await assert.rejects(verifyLaunchSnapshot(store, manifest), /approved artifact receipt/)
  manifest.aromatherapy[0].files = []
  await assert.rejects(verifyLaunchSnapshot(store, manifest), /complete file list/)
  assert.deepEqual(store.writes, [])
})
test('bytes reread after browser QA must still match that receipt artifact tree', () => {
  const original = Buffer.from('browser-certified'), treeRecord = { sha256: sha(original), bytes: original.length }
  assert.doesNotThrow(() => assertReceiptBoundFile('niche/slug/index.html', original, treeRecord))
  assert.throws(() => assertReceiptBoundFile('niche/slug/index.html', Buffer.from('modified-after-qa'), treeRecord), /after browser receipt/)
  assert.throws(() => assertReceiptBoundFile('niche/slug/extra.html', original, undefined), /after browser receipt/)
})
