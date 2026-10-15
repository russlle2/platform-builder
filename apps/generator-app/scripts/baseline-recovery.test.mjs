import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalDigest, PRODUCTION_NETLIFY_SITE_ID } from '../src/lib/templates/certified-catalog-contract.mjs'
import { LEGACY_COUNTS, prepareRecovery, hashBytes, captureRecovery, stageRecovery, bindRecoveryDeployment, activateRecovery, rollbackRecovery, recoveryDeploymentProofBytes, validateRecoveryJournal } from './baseline-recovery.mjs'

const oldSha = 'a'.repeat(40), newSha = 'b'.repeat(40)
const target = { expectedAccountSlug: 'reviewed-account', expectedHostname: 'dailyclarity.org', expectedSupabaseProjectRef: 'reviewedproject' }
let scratch, prepared
before(async () => {
  scratch = await mkdtemp(path.join(tmpdir(), 'dailyclarity-baseline-recovery-'))
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  const factory = path.join(repo, 'packages/template-factory')
  const tsx = createRequire(path.join(factory, 'package.json')).resolve('tsx')
  execFileSync(process.execPath, ['--import', tsx, path.join(factory, 'src/curated-export.ts'), '--output', path.join(scratch, 'curated')], { cwd: repo, stdio: 'pipe', timeout: 180_000 })
  prepared = await prepareRecovery(path.join(scratch, 'curated'), newSha)
})
after(async () => { if (scratch) await rm(scratch, { recursive: true, force: true }) })

class Store {
  values = new Map(); metadata = new Map(); writes = []; beforeSet = null
  async get(key, options) {
    const bytes = this.values.get(key)
    if (bytes === undefined) return null
    return options?.type === 'json' ? JSON.parse(bytes.toString('utf8')) : Buffer.from(bytes)
  }
  async getWithMetadata(key, options) { const data = await this.get(key, options); return data === null ? null : { data, metadata: structuredClone(this.metadata.get(key) ?? {}) } }
  async getMetadata(key) { return this.values.has(key) ? { metadata: structuredClone(this.metadata.get(key) ?? {}) } : null }
  async set(key, bytes, options = {}) { await this.beforeSet?.(key); this.values.set(key, Buffer.from(bytes)); this.metadata.set(key, structuredClone(options.metadata ?? {})); this.writes.push(key) }
  async *list({ prefix }) { yield { blobs: [...this.values.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })) } }
}
function state() {
  const launchStore = new Store(), certifiedStore = new Store(), auditStore = new Store()
  const legacy = Object.fromEntries(Object.entries(LEGACY_COUNTS).map(([niche, count]) => [niche, Array.from({ length: count }, (_, i) => ({ slug: `legacy-${i}` }))]))
  const raw = Buffer.from(`  ${JSON.stringify(legacy, null, 1)}\n`)
  launchStore.values.set('_manifest.json', raw)
  launchStore.metadata.set('_manifest.json', { original: 'legacy-metadata' })
  const site = { id: PRODUCTION_NETLIFY_SITE_ID, account_slug: target.expectedAccountSlug, custom_domain: target.expectedHostname, published_deploy: { id: 'old-deploy', state: 'ready', commit_ref: oldSha }, build_settings: { env: { SECRET_MUST_NOT_BE_SAVED: 'secret' } } }
  const runtime = { deploymentSiteId: site.id, deploymentReleaseSha: oldSha, supabaseProjectRef: target.expectedSupabaseProjectRef, supabaseSchemaVersion: '20260903.4', bookingKitSchemaVersion: '20260925.2', supabaseSchemaReady: true, templateCatalogProfile: 'launch', publishedTemplateCount: 0, expectedTemplateCount: 60, templateCatalogReady: false, checkoutReady: false, customBuildCheckoutReady: true, bookingKitSalesEnabled: false, FUTURE_SECRET: 'not-journal-data' }
  const inspect = async () => ({ site: structuredClone(site), runtime: structuredClone(runtime) })
  return { launchStore, certifiedStore, auditStore, raw, site, runtime, inspect }
}
async function capture(fixture) {
  const journal = await captureRecovery({ ...fixture, prepared, target, expectedLegacyHash: hashBytes(fixture.raw), expectedPreviousDeploymentId: 'old-deploy', expectedPreviousReleaseSha: oldSha })
  return { ...fixture, journal, approvedJournalHash: canonicalDigest(journal) }
}
async function bind(fixture) {
  fixture.site.published_deploy = { id: 'new-deploy', state: 'ready', commit_ref: newSha }
  Object.assign(fixture.runtime, { deploymentReleaseSha: newSha, salesPaused: true, checkoutReady: false, customBuildCheckoutReady: false })
  await bindRecoveryDeployment({ ...fixture, deploy: { id: 'new-deploy', site_id: fixture.site.id, state: 'ready', commit_ref: newSha }, file: { path: '/__dailyclarity_release.json', sha: createHash('sha1').update(recoveryDeploymentProofBytes(fixture.journal)).digest('hex') } })
}

test('full recovery stages the actual approved export and restores exact raw legacy bytes on rollback', async () => {
  const f = await capture(state())
  assert.deepEqual(f.launchStore.writes, [], 'capture changes only the separate backup store')
  assert.equal(f.journal.previousRuntime.customBuildCheckoutReady, true, 'old unsupported pause state is recorded truthfully')
  assert.equal(JSON.stringify(f.journal).includes('SECRET'), false)
  assert.equal(JSON.stringify(f.journal).includes('not-journal-data'), false)
  await stageRecovery({ ...f, prepared })
  assert.ok(f.launchStore.writes.every((key) => key.startsWith('_releases/')))
  assert.deepEqual(await f.launchStore.get('_manifest.json'), f.raw)
  await bind(f)
  const inspect = async () => {
    const activated = hashBytes(await f.launchStore.get('_manifest.json')) === prepared.receipt.manifestRawHash
    return { site: structuredClone(f.site), runtime: { ...f.runtime, publishedTemplateCount: activated ? 60 : 0, templateCatalogReady: activated } }
  }
  assert.deepEqual(await activateRecovery({ ...f, inspect }), { templates: 60, fullCatalogueCertified: false, salesPaused: true })
  assert.ok(f.auditStore.writes.includes(`${f.journal.backupPrefix}/activation-intent.json`))
  assert.equal(f.launchStore.writes.at(-1), '_manifest.json')
  const restoreDeployment = async (id) => { assert.equal(id, 'old-deploy'); f.site.published_deploy = { id, state: 'ready', commit_ref: oldSha }; Object.assign(f.runtime, f.journal.previousRuntime) }
  assert.deepEqual(await rollbackRecovery({ ...f, inspectSite: async () => structuredClone(f.site), restoreDeployment }), { templates: 0, originalBrokenStateRestored: true })
  assert.deepEqual(await f.launchStore.get('_manifest.json'), f.raw, 'whitespace and newlines remain byte-for-byte intact')
  assert.deepEqual((await f.launchStore.getMetadata('_manifest.json')).metadata, { original: 'legacy-metadata' })
  assert.equal(f.launchStore.values.has(prepared.files[0].key), true, 'rollback preserves the staged immutable catalogue')
  await rollbackRecovery({ ...f, inspectSite: async () => structuredClone(f.site), restoreDeployment: async () => assert.fail('already-restored deployment must not be changed') })
})

test('capture rejects wrong targets, current deployment, healthy serving state, counts, hash and any certified pointer before writes', async () => {
  const cases = [
    (f) => { f.site.id = '00000000-0000-0000-0000-000000000000' },
    (f) => { f.site.account_slug = 'other' },
    (f) => { f.site.published_deploy.id = 'unexpected' },
    (f) => { f.runtime.supabaseSchemaReady = false },
    (f) => { f.runtime.templateCatalogReady = true; f.runtime.publishedTemplateCount = 60 },
    (f) => { f.runtime.templateCatalogProfile = 'rehab-certified' },
    (f) => { f.launchStore.values.set('_manifest.json', Buffer.from('{}')) },
    (f) => { f.certifiedStore.values.set('_active.json', Buffer.from('null')) },
    (f) => { f.certifiedStore.values.set('_active.json', Buffer.from('false')) },
    (f) => { f.certifiedStore.values.set('_active.json', Buffer.from('invalid-json')) },
  ]
  for (const mutate of cases) {
    const f = state(); mutate(f)
    await assert.rejects(capture(f))
    assert.deepEqual(f.auditStore.writes, [])
    assert.deepEqual(f.launchStore.writes, [])
  }
})

test('altered receipt, backup, local files and dirty journal never authorize staging', async () => {
  for (const reason of ['journal', 'receipt', 'backup', 'files']) {
    const f = await capture(state())
    let next = prepared
    if (reason === 'journal') f.journal.previousDeploymentId = 'tampered'
    if (reason === 'receipt') next = { ...prepared, receipt: { ...prepared.receipt, files: prepared.receipt.files + 1 } }
    if (reason === 'backup') f.auditStore.values.set(`${f.journal.backupPrefix}/legacy-manifest.bin`, Buffer.from('{}'))
    if (reason === 'files') next = { ...prepared, files: [{ ...prepared.files[0], read: async () => Buffer.from('changed-after-review') }, ...prepared.files.slice(1)] }
    await assert.rejects(stageRecovery({ ...f, prepared: next }))
    assert.deepEqual(f.launchStore.writes, [])
  }
})

test('staging refuses conflicting existing bytes or metadata and never changes the active manifest', async () => {
  for (const metadataConflict of [false, true]) {
    const f = await capture(state()), file = prepared.files[0]
    f.launchStore.values.set(file.key, metadataConflict ? await file.read() : Buffer.from('foreign-bytes'))
    f.launchStore.metadata.set(file.key, { sha256: 'f'.repeat(64) })
    await assert.rejects(stageRecovery({ ...f, prepared }), /conflict/)
    assert.deepEqual(await f.launchStore.get('_manifest.json'), f.raw)
    assert.equal(f.launchStore.writes.includes('_manifest.json'), false)
  }
})

test('binding refuses unrelated deployments, wrong commit and forged proof without needing healthy functions', async () => {
  const f = await capture(state())
  f.site.published_deploy = { id: 'new-deploy', state: 'ready' }
  for (const changes of [{ id: 'foreign' }, { site_id: 'foreign' }, { state: 'error' }, { commit_ref: oldSha }]) {
    await assert.rejects(bindRecoveryDeployment({ ...f, deploy: { id: 'new-deploy', site_id: f.site.id, state: 'ready', ...changes }, file: { path: '/__dailyclarity_release.json', sha: 'f'.repeat(40) } }))
  }
  await bind(f)
  assert.ok(f.auditStore.values.has(`${f.journal.backupPrefix}/deployment.json`))
})

test('rollback recovers deploy-before-activation and refuses unowned state or an uncertified journal', async () => {
  const f = await capture(state())
  await bind(f)
  assert.throws(() => validateRecoveryJournal(f.journal, 'f'.repeat(64)))
  f.site.published_deploy.id = 'outside-deploy'
  await assert.rejects(rollbackRecovery({ ...f, inspectSite: async () => f.site, restoreDeployment: async () => assert.fail('foreign deploy must remain untouched') }), /binding/)
  f.site.published_deploy.id = 'new-deploy'
  f.launchStore.values.set('_manifest.json', Buffer.from('outside-manifest'))
  await assert.rejects(rollbackRecovery({ ...f, inspectSite: async () => f.site, restoreDeployment: async () => assert.fail() }), /foreign manifest/)
  f.launchStore.values.set('_manifest.json', f.raw)
  await rollbackRecovery({ ...f, inspectSite: async () => f.site, restoreDeployment: async () => { f.site.published_deploy = { id: 'old-deploy', state: 'ready' }; Object.assign(f.runtime, f.journal.previousRuntime) } })
})

test('rollback rechecks a new certified pointer immediately before changing the raw manifest', async () => {
  const f = await capture(state())
  await bind(f)
  f.auditStore.beforeSet = async (key) => { if (key.endsWith('/rollback-intent.json')) f.certifiedStore.values.set('_active.json', Buffer.from('null')) }
  await assert.rejects(rollbackRecovery({ ...f, inspectSite: async () => f.site, restoreDeployment: async () => assert.fail() }), /certified catalogue pointer/)
  assert.deepEqual(f.launchStore.writes, [])
})

test('activation requires paused new paid sales before any serving pointer changes', async () => {
  const f = await capture(state())
  await bind(f)
  f.runtime.salesPaused = false
  await assert.rejects(activateRecovery(f), /pause new paid sales/)
  assert.deepEqual(f.launchStore.writes, [])
})

test('activation rechecks catalogue ownership and paused runtime after recording its intent', async () => {
  for (const change of ['certified-pointer', 'sales-pause', 'manifest']) {
    const f = await capture(state())
    await stageRecovery({ ...f, prepared })
    await bind(f)
    f.launchStore.writes = []
    f.auditStore.beforeSet = async (key) => {
      if (!key.endsWith('/activation-intent.json')) return
      if (change === 'certified-pointer') f.certifiedStore.values.set('_active.json', Buffer.from('false'))
      if (change === 'sales-pause') f.runtime.salesPaused = false
      if (change === 'manifest') f.launchStore.values.set('_manifest.json', Buffer.from('outside-write'))
    }
    await assert.rejects(activateRecovery(f), /certified catalogue pointer|Sales pause changed|Manifest changed concurrently/)
    assert.deepEqual(f.launchStore.writes, [], 'recovery never overwrites concurrent state')
  }
})

test('journal permits explicit rollback across pointer-write and postactivation probe failures', async () => {
  for (const failure of ['before-pointer', 'after-pointer']) {
    const f = await capture(state())
    await stageRecovery({ ...f, prepared })
    await bind(f)
    f.launchStore.beforeSet = async (key) => { if (failure === 'before-pointer' && key === '_manifest.json') throw new Error('write unavailable') }
    const inspect = async () => {
      if (failure === 'after-pointer' && hashBytes(await f.launchStore.get('_manifest.json')) === prepared.receipt.manifestRawHash) throw new Error('functions unavailable after pointer write')
      return f.inspect()
    }
    await assert.rejects(activateRecovery({ ...f, inspect }), /unavailable/)
    assert.ok(f.auditStore.values.has(`${f.journal.backupPrefix}/activation-intent.json`))
    f.launchStore.beforeSet = null
    await rollbackRecovery({ ...f, inspectSite: async () => f.site, restoreDeployment: async () => { f.site.published_deploy = { id: 'old-deploy', state: 'ready' }; Object.assign(f.runtime, f.journal.previousRuntime) } })
    assert.deepEqual(await f.launchStore.get('_manifest.json'), f.raw)
  }
})

test('restoration is not called successful just because a deployment restore API resolves', async () => {
  const f = await capture(state())
  await bind(f)
  await assert.rejects(rollbackRecovery({ ...f, inspectSite: async () => f.site, restoreDeployment: async () => {} }), /runtime identity|not yet attested/)
  assert.equal(f.auditStore.values.has(`${f.journal.backupPrefix}/rolled-back.json`), false)
  assert.deepEqual(await f.launchStore.get('_manifest.json'), f.raw)
})

test('rollback refuses a deployment published concurrently during manifest restoration', async () => {
  const f = await capture(state())
  await bind(f)
  f.launchStore.beforeSet = async (key) => { if (key === '_manifest.json') f.site.published_deploy.id = 'outside-deploy' }
  await assert.rejects(rollbackRecovery({ ...f, inspectSite: async () => structuredClone(f.site), restoreDeployment: async () => assert.fail('must not overwrite the outside deployment') }), /Deployment changed concurrently before deployment restoration/)
  assert.equal(f.site.published_deploy.id, 'outside-deploy')
  assert.equal(f.auditStore.values.has(`${f.journal.backupPrefix}/rolled-back.json`), false)
})

test('a pause lost after activation is an immediate failure, not a cache-propagation retry', async () => {
  const f = await capture(state())
  await stageRecovery({ ...f, prepared })
  await bind(f)
  const inspect = async () => {
    const active = hashBytes(await f.launchStore.get('_manifest.json')) === prepared.receipt.manifestRawHash
    return { site: structuredClone(f.site), runtime: { ...f.runtime, publishedTemplateCount: active ? 60 : 0, templateCatalogReady: active, salesPaused: !active } }
  }
  await assert.rejects(activateRecovery({ ...f, inspect }), /Sales pause was lost after recovery activation/)
  assert.equal(f.auditStore.values.has(`${f.journal.backupPrefix}/activated.json`), false)
})
