import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { STAGING, stagingConfiguration, publicProfileSnapshot, captureStagingJournal, orchestrateStaging, transitionStaging, validateStagingJournal, stagingDeploymentProof, stagingDeploymentTitle, readPointer, assertJournalArtifactSource } from './run-staging-catalogue.mjs'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { LAUNCH_CATALOG_CONTRACT as launch, LAUNCH_CATALOG_APPROVED_RECEIPT, REHAB_STAGING_CATALOG_CONTRACT, createRehabStagingActivePointer } from './upload-templates-to-blobs.mjs'
const oldSha = 'a'.repeat(40), sha = 'b'.repeat(40), oldId = 'c'.repeat(24), newId = 'd'.repeat(24)
const hash = value => createHash('sha256').update(value).digest('hex')
const clone = structuredClone
const profileKey = 'DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE'
const publicVariable = (key, value) => ({ key, is_secret: false, scopes: ['builds', 'functions', 'post_processing', 'runtime'], values: [{ context: 'production', value }] })
const launchManifest = Object.fromEntries(Object.keys(launch.templatesByNiche).map(niche => [niche, LAUNCH_CATALOG_APPROVED_RECEIPT.templates.filter(row => row.niche === niche).map(row => ({ slug: row.slug, nicheSlug: niche, dir: `${niche}/${row.slug}`, name: row.slug, artifactSha256: row.sha256, catalogReportSha256: launch.curatedReportSha256, editable: true, validation: { status: 'passed', contractVersion: 2, tokens: ['BUSINESS_NAME'] } }))]))
function candidateFixture() {
  const manifest = {}, gallery = {}, mappings = [], files = [], evidence = []
  for (const [niche, count] of Object.entries(REHAB_STAGING_CATALOG_CONTRACT.templatesByNiche)) {
    manifest[niche] = []; gallery[niche] = []
    for (let index = 0; index < count; index++) {
      const slug = `${niche}-${String(index).padStart(4, '0')}`
      const mapping = { legacySlug: slug, niche, designId: `design_${slug}`, contentPresetId: `content_${slug}`, themePresetId: `theme_${slug}`, qualityReceipt: `receipt_${slug}`, canonicalLegacySlug: slug, disposition: 'canonical' }
      manifest[niche].push({ ...mapping, slug, nicheSlug: niche, dir: `${niche}/${slug}`, name: slug, editable: true, validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] }, pages: ['index.html'], files: ['index.html'], fields: [{ name: 'BUSINESS_NAME', label: 'Business name', type: 'text' }] })
      gallery[niche].push(slug); mappings.push(mapping)
      const key = `${niche}/${slug}/index.html`, value = Buffer.from(key)
      files.push({ key, read: async () => value }); evidence.push({ key, bytes: value.length, sha256: hash(value) })
    }
  }
  const catalogBytes = Buffer.from(JSON.stringify({ contractVersion: 3, ruleVersion: 'test-only', generatedAt: '2026-10-15T00:00:00.000Z', sourceTemplates: 5486, canonicalDesigns: 5486, templates: mappings, gallery }))
  evidence.sort((a, b) => a.key.localeCompare(b.key))
  const receipt = { version: 1, profile: 'rehab-certified', releaseSha: sha, catalogHash: hash(catalogBytes), manifestHash: canonicalDigest(manifest), fullGateHash: '1'.repeat(64), sourceCatalogHash: '2'.repeat(64), templateEvidenceHash: '3'.repeat(64), fileEvidenceHash: canonicalDigest(evidence), sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0, customizationDiagnostics: 0, files: files.length, pages: files.length }
  return { manifest, catalogBytes, files, receipt }
}
const prepared = candidateFixture()
class Store {
  data = new Map(); metadata = new Map(); writes = []; beforeSet = null
  async get(key, options) { const value = this.data.get(key); return value === undefined ? null : options?.type === 'json' ? JSON.parse(value.toString()) : Buffer.from(value) }
  async getMetadata(key) { return this.data.has(key) ? { metadata: clone(this.metadata.get(key) ?? {}) } : null }
  async set(key, value, options = {}) { await this.beforeSet?.(key); this.data.set(key, Buffer.from(value)); this.metadata.set(key, clone(options.metadata ?? {})); this.writes.push(key) }
  async setJSON(key, value) { return this.set(key, JSON.stringify(value)) }
  async delete(key) { await this.beforeSet?.(key); this.data.delete(key); this.metadata.delete(key); this.writes.push(key) }
}
const env = () => ({ GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'russlle2/platform-builder', GITHUB_SHA: sha, DAILYCLARITY_ENVIRONMENT: 'staging', DEPLOY_ENVIRONMENT: 'staging', NETLIFY_SITE_ID: STAGING.siteId, NETLIFY_EXPECTED_SITE_ID: STAGING.siteId, NETLIFY_EXPECTED_SITE_HOSTNAME: STAGING.hostname, NETLIFY_EXPECTED_ACCOUNT_SLUG: STAGING.accountSlug, NETLIFY_EXPECTED_SUPABASE_PROJECT_REF: STAGING.projectRef, NETLIFY_EXPECTED_SUPABASE_URL: `https://${STAGING.projectRef}.supabase.co`, CANDIDATE_BUNDLE: '/tmp/candidate', STAGING_JOURNAL_OUTPUT: '/tmp/staging-journal.json', RECEIPT_HASH: canonicalDigest(prepared.receipt), EXPECTED_PREVIOUS_DEPLOYMENT_ID: oldId, EXPECTED_PREVIOUS_RELEASE_SHA: oldSha })
function fixture() {
  const events = [], site = { id: STAGING.siteId, account_id: STAGING.accountId, account_slug: STAGING.accountSlug, name: 'dailyclarity-staging', ssl_url: `https://${STAGING.hostname}`, published_deploy: { id: oldId, state: 'ready' }, build_settings: { stop_builds: true }, privateProviderData: 'DO-NOT-RETAIN' }
  let variables = [publicVariable(profileKey, 'launch'), { key: 'UNRELATED_PRIVATE', is_secret: true, values: [{ value: 'DO-NOT-RETAIN' }] }], journal
  const store = new Store(), audit = new Store(), launchStore = new Store()
  launchStore.data.set('_manifest.json', Buffer.from(JSON.stringify(launchManifest)))
  const runtime = async () => {
    const next = site.published_deploy.id === newId
    return { deploymentSiteId: STAGING.siteId, supabaseProjectRef: STAGING.projectRef, deploymentReleaseSha: next ? sha : oldSha, supabaseSchemaVersion: '20260903.4', bookingKitSchemaVersion: '20260925.2', supabaseSchemaReady: true, templateCheckoutReady: true, fulfillmentReady: true, emailReady: true, templateCatalogReady: true, templateCatalogProfile: next ? 'rehab-staging' : 'launch', templateCatalogHash: next ? prepared.receipt.catalogHash : launch.templateIdentitySha256, templateManifestHash: next ? prepared.receipt.manifestHash : canonicalDigest(launchManifest), templateCuratedReportHash: next ? null : launch.curatedReportSha256, templateCertificationHash: null, templateCatalogueReleaseSha: null, publishedTemplateCount: next ? 5486 : 60, expectedTemplateCount: next ? 5486 : 60, missingRequirements: [], privateProviderData: 'DO-NOT-RETAIN' }
  }
  const deps = { store, audit, launch: launchStore, site: async () => clone(site), environment: async () => clone(variables), runtime,
    authProbe: async () => events.push('auth-probe'), checkRelease: async () => events.push('ci'), verifyCandidate: async () => ({ prepared }),
    saveJournal: async value => { events.push('save'); journal = clone(value) }, loadJournal: async () => clone(journal),
    writeProof: async () => { events.push('proof') },
    deploy: async () => { events.push('deploy'); site.published_deploy.id = newId },
    deployment: async id => ({ id, site_id: STAGING.siteId, state: 'ready', commit_ref: null, title: stagingDeploymentTitle(journal) }),
    deploymentFile: async () => ({ path: '/__dailyclarity_release.json', sha: createHash('sha1').update(stagingDeploymentProof(journal)).digest('hex') }),
    setProfile: async (key, value) => { events.push(`env:${key}`); variables = variables.filter(item => item.key !== key); if (value) variables.push(clone(value)) },
    restore: async id => { events.push('restore'); site.published_deploy.id = id },
  }
  const config = stagingConfiguration({ ...env(), OPERATION: 'stage', CONFIRMATION: 'STAGE FULL CATALOGUE' })
  return { deps, events, site, config, get journal() { return journal }, get variables() { return variables }, set variables(value) { variables = value } }
}
async function stage() { const f = fixture(); await orchestrateStaging(f.config, f.deps); return f }

test('configuration defaults to verify and rejects production, unrelated main or missing explicit approval', () => {
  assert.equal(stagingConfiguration(env()).operation, 'verify')
  for (const [key, value] of Object.entries({ NETLIFY_SITE_ID: '4a98d266-bb9f-44ab-bf27-30597d741705', DAILYCLARITY_ENVIRONMENT: 'production', NETLIFY_EXPECTED_SUPABASE_PROJECT_REF: 'psxmvaushwsboogfnyqi', GITHUB_REF: 'refs/heads/other' })) assert.throws(() => stagingConfiguration({ ...env(), [key]: value }))
  for (const operation of ['stage', 'rollback', 'reapply']) assert.throws(() => stagingConfiguration({ ...env(), OPERATION: operation }), /confirmation/)
})
test('public snapshots reject secret/profile context substitution and omit unrelated data', () => {
  const f = fixture(); assert.equal(JSON.stringify(publicProfileSnapshot(f.variables)).includes('DO-NOT-RETAIN'), false)
  for (const change of [row => { row.is_secret = true }, row => { row.values[0].context = 'branch:evil' }, row => { row.values[0].value = 'rehab-certified' }, row => { row.scopes = ['functions'] }]) {
    const vars = clone(f.variables); change(vars[0]); assert.throws(() => publicProfileSnapshot(vars))
  }
})
test('actual Netlify all-context profile variables preserve all four API scope names', () => {
  const variables = [publicVariable(profileKey, 'launch'), publicVariable('DAILYCLARITY_STAGING_SITE_ID', STAGING.siteId)]
  for (const variable of variables) variable.values[0].context = 'all'
  const snapshot = publicProfileSnapshot(variables)
  for (const variable of variables) assert.deepEqual(snapshot[variable.key], variable)
  variables[0].scopes[2] = 'post-processing'
  assert.throws(() => publicProfileSnapshot(variables), /readable in builds and functions/)
})
test('verify checks the exact candidate without any provider mutation', async () => {
  const f = fixture(); const result = await orchestrateStaging({ ...f.config, operation: 'verify' }, f.deps)
  assert.equal(result.providerWrites, false); assert.deepEqual(f.events, ['ci']); assert.deepEqual(f.deps.store.writes, []); assert.deepEqual(f.deps.audit.writes, [])
})
test('capture refuses wrong previous deployment, unhealthy runtime and non-launch profile before writes', async () => {
  for (const mutate of [f => { f.site.published_deploy.id = 'f'.repeat(24) }, f => { f.site.account_id = 'wrong' }, f => { f.variables[0].values[0].value = 'rehab-staging' }, f => { const original = f.deps.runtime; f.deps.runtime = async () => ({ ...await original(), emailReady: false }) }]) {
    const f = fixture(); mutate(f); await assert.rejects(captureStagingJournal(f.deps, prepared, f.config)); assert.deepEqual(f.deps.audit.writes, []); assert.deepEqual(f.deps.store.writes, [])
  }
})
test('unstopped or unknown Git auto-build state blocks capture and journal-based restoration before writes', async () => {
  for (const value of [false, undefined, 'true']) {
    const f = fixture(); f.site.build_settings.stop_builds = value
    await assert.rejects(captureStagingJournal(f.deps, prepared, f.config), /auto-builds must be stopped/)
    assert.deepEqual(f.deps.audit.writes, []); assert.deepEqual(f.deps.store.writes, [])
  }
  const f = await stage(), writes = f.deps.store.writes.length
  f.site.build_settings.stop_builds = false
  await assert.rejects(transitionStaging(f.deps, f.journal, false), /auto-builds must be stopped/)
  assert.equal(f.deps.store.writes.length, writes); assert.equal(f.site.published_deploy.id, newId)
})
test('real 5486-object staging preserves launch bytes, seals a journal before activation and binds exact deployment', async () => {
  const f = await stage(); const journal = f.journal
  assert.equal(JSON.stringify(journal).includes('DO-NOT-RETAIN'), false)
  assert.equal(validateStagingJournal(journal, canonicalDigest(journal)), journal)
  assert.ok(f.events.indexOf('save') < f.events.indexOf('deploy'))
  assert.equal(f.site.published_deploy.id, newId); assert.deepEqual(f.deps.launch.writes, [])
  assert.deepEqual(await readPointer(f.deps.store), journal.nextPointer)
  assert.ok(f.deps.audit.writes.some(key => key.endsWith('/deployment.json')))
})
test('CLI failure after actual publication still binds for rollback; capture is never repeated', async () => {
  const f = fixture(); f.deps.deploy = async () => { f.site.published_deploy.id = newId; throw new Error('CLI transport lost') }
  await assert.rejects(orchestrateStaging(f.config, f.deps), /CLI transport lost/)
  assert.ok(f.deps.audit.writes.some(key => key.endsWith('/deployment.json')))
  const result = await transitionStaging(f.deps, f.journal, false)
  assert.equal(result.templates, 60); assert.equal(f.site.published_deploy.id, oldId)
})
test('failure before publication remains rollbackable and cannot reapply an unbound candidate', async () => {
  const f = fixture(); f.deps.deploy = async () => { throw new Error('build failed') }
  await assert.rejects(orchestrateStaging(f.config, f.deps), /build failed/)
  await assert.rejects(transitionStaging(f.deps, f.journal, true), /not been bound/)
  await transitionStaging(f.deps, f.journal, false)
  assert.equal(f.variables.some(item => item.key === 'DAILYCLARITY_STAGING_SITE_ID'), false)
  assert.equal(await f.deps.store.get('_active.json'), null)
})
test('rollback restores exact old raw pointer/metadata, public settings and deployment; reapply reuses the binding', async () => {
  const f = fixture(); const original = Buffer.from('  '+JSON.stringify(createRehabStagingActivePointer({catalogHash:'4'.repeat(64),manifestHash:'5'.repeat(64),activatedAt:'2026-10-01T00:00:00.000Z'}))+'\n')
  f.deps.store.data.set('_active.json', original); f.deps.store.metadata.set('_active.json', { contractVersion: 3 })
  await orchestrateStaging(f.config, f.deps)
  await transitionStaging(f.deps, f.journal, false)
  assert.deepEqual(await f.deps.store.get('_active.json'), original)
  assert.deepEqual((await f.deps.store.getMetadata('_active.json')).metadata, { contractVersion: 3 })
  assert.equal(f.site.published_deploy.id, oldId)
  await transitionStaging(f.deps, f.journal, true)
  assert.equal(f.site.published_deploy.id, newId)
  assert.equal(f.events.filter(item => item === 'deploy').length, 1)
  assert.deepEqual(f.deps.launch.writes, [])
})
test('foreign pointer, deployment, profile or changed launch bytes block restoration', async () => {
  for (const mutate of [f => { f.site.published_deploy.id = 'f'.repeat(24) }, f => { f.deps.store.data.set('_active.json', Buffer.from('false')) }, f => { f.variables.find(item => item.key === profileKey).values[0].value = 'unexpected' }, f => { f.deps.launch.data.set('_manifest.json', Buffer.from('{}')) }]) {
    const f = await stage(); mutate(f); const before = f.events.length; await assert.rejects(transitionStaging(f.deps, f.journal, false)); assert.equal(f.events.slice(before).includes('restore'), false)
  }
})
test('deployment race during pointer restoration is detected before any deployment restore', async () => {
  const f = await stage(); f.deps.store.beforeSet = async key => { if (key === '_active.json') f.site.published_deploy.id = 'f'.repeat(24) }
  await assert.rejects(transitionStaging(f.deps, f.journal, false), /Unrelated staging deployment/)
  assert.equal(f.events.includes('restore'), false)
})
test('foreign publish cannot be bound even with the right commit and ready state', async () => {
  const f = fixture(); f.deps.deploymentFile = async () => ({ path: '/__dailyclarity_release.json', sha: '0'.repeat(40) })
  await assert.rejects(orchestrateStaging(f.config, f.deps), /not owned/)
  assert.equal(f.deps.audit.writes.some(key => key.endsWith('/deployment.json')), false)
})
test('rollback bypasses current CI and candidate bundle but requires the exact saved journal hash', async () => {
  const f = await stage(); f.deps.checkRelease = async () => assert.fail('rollback must not require future CI'); f.deps.verifyCandidate = async () => assert.fail('rollback must not require candidate artifact')
  const config = { ...f.config, operation: 'rollback', journalHash: canonicalDigest(f.journal) }
  await assert.rejects(orchestrateStaging({ ...config, journalHash: '0'.repeat(64) }, f.deps), /journal identity/)
  assert.equal((await orchestrateStaging(config, f.deps)).templates, 60)
})
test('reapply rechecks every immutable candidate byte and refuses corruption before changing the active state', async () => {
  const f = await stage(); await transitionStaging(f.deps, f.journal, false)
  f.deps.store.data.set(`catalogs/${prepared.receipt.catalogHash}/${prepared.files[0].key}`, Buffer.from('corrupt'))
  const original = await readPointer(f.deps.store)
  await assert.rejects(transitionStaging(f.deps, f.journal, true), /missing or corrupt/)
  assert.deepEqual(await readPointer(f.deps.store), original); assert.equal(f.site.published_deploy.id, oldId)
})

test('journal artifact permits interrupted protected runs but rejects other publishers and mismatched attempts', () => {
  const run = { id: 123, run_attempt: 2, repository: { full_name: 'russlle2/platform-builder' }, head_branch: 'main', head_sha: sha, event: 'workflow_dispatch', path: '.github/workflows/staging-catalogue.yml', status: 'completed', conclusion: 'failure' }
  const artifact = { id: 456, expired: false, name: 'staging-catalogue-journal-123-2', workflow_run: { id: 123, head_sha: sha } }
  assert.equal(assertJournalArtifactSource(run, artifact, '123', '456').releaseSha, sha)
  for (const change of [{ path: '.github/workflows/other.yml' }, { head_branch: 'branch' }, { status: 'in_progress' }]) assert.throws(() => assertJournalArtifactSource({ ...run, ...change }, artifact, '123', '456'))
  assert.throws(() => assertJournalArtifactSource(run, { ...artifact, name: 'staging-catalogue-journal-123-1' }, '123', '456'))
})

test('an unhealthy anonymous Auth route blocks initial capture and prevents a false final attestation', async () => {
  const f = fixture(); f.deps.authProbe = async () => { throw new Error('Auth adapter unavailable') }
  await assert.rejects(captureStagingJournal(f.deps, prepared, f.config), /Auth adapter/)
  assert.deepEqual(f.deps.audit.writes, [])
  const staged = await stage(); staged.deps.authProbe = f.deps.authProbe
  await assert.rejects(transitionStaging(staged.deps, staged.journal, false), /Auth adapter/)
  assert.equal(staged.deps.audit.writes.some(key => key.endsWith('/rollback-attested.json')), false)
})

test('captured and imported journals refuse opaque pointer content, metadata and extra runtime fields', async () => {
  for (const mutate of [f => { f.deps.store.data.set('_active.json', Buffer.from('{"private":"opaque"}')) }, f => { const pointer = createRehabStagingActivePointer({ catalogHash:'4'.repeat(64),manifestHash:'5'.repeat(64),activatedAt:'2026-10-01T00:00:00.000Z' }); f.deps.store.data.set('_active.json',Buffer.from(JSON.stringify(pointer))); f.deps.store.metadata.set('_active.json',{sha256:'opaque-private'}) }]) {
    const f=fixture();mutate(f);await assert.rejects(captureStagingJournal(f.deps,prepared,f.config));assert.deepEqual(f.deps.audit.writes,[])
  }
  const f=fixture();const journal=await captureStagingJournal(f.deps,prepared,f.config)
  for(const mutate of [j=>{j.extra='opaque'},j=>{j.previousRuntime.extra='opaque'},j=>{j.receipt.extra='opaque'}]){
    const changed=clone(journal);mutate(changed);assert.throws(()=>validateStagingJournal(changed,canonicalDigest(changed)))
  }
})
