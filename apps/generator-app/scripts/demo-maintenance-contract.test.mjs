import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { validateManifest, validateRuntime, validateRecord, markerFor, candidateTitle, canonicalDigest, digest, assertUnchanged, cleanBuildEnvironment, parseArtifactSource, validateArtifactMetadata, validateQa, CONTROLLER_CLOSURE, assertControllerCompatibility } from './demo-maintenance-contract.mjs'
import { executeMaintenance, demoDraftArguments, demoAdapterConfigurationArguments } from './run-demo-maintenance.mjs'

const manifestBytes = await readFile(new URL('./demo-maintenance-release.json', import.meta.url))
const manifest = JSON.parse(manifestBytes)
const hash = 'a'.repeat(64)
const controllerSha = 'b'.repeat(40)
const producer = { runId: '100', runAttempt: '1' }
const time = '2026-10-20T00:00:00.000Z'
const catalogue = { pointerHash: hash, releaseSha: manifest.baselineSha, certificationHash: manifest.expectedBaselineCertificationHash, catalogHash: hash, manifestHash: hash, profile: 'rehab-certified', templates: 5486 }
const ctx = { manifest, manifestHash: digest(manifestBytes), controllerSha, producer, operation: 'prepare', confirmation: 'PREPARE DEMO DRAFT' }
const baseline = { siteId: '4a98d266-bb9f-44ab-bf27-30597d741705', hostname: 'dailyclarity.org', deploymentId: '1'.repeat(24), appSha: manifest.baselineSha, accountHash: hash, settingsHash: hash, environmentHash: hash, projectRefHash: hash, catalogue, markerHash: hash, runtime: { appSha: manifest.baselineSha, catalogueReleaseSha: manifest.baselineSha, certificationHash: manifest.expectedBaselineCertificationHash, schemaReady: true, templates: 5486, missingRequirements: 0 }, capturedAt: time }
const candidate = { deploymentId: '2'.repeat(24), origin: `https://${'2'.repeat(24)}--fixture.netlify.app`, markerHash: canonicalDigest(markerFor(manifest, controllerSha, ctx.manifestHash, producer)), buildConfigHash: hash, createdAt: time, title: candidateTitle(manifest, producer), runtimeContext: 'production' }
const publicationLock = { deploymentId: baseline.deploymentId, wasLocked: false, acquiredAt: time }
const record = { version: 1, kind: 'dailyclarity-demo-maintenance', controllerSha, producer, manifestHash: ctx.manifestHash, sourceSha: manifest.sourceSha, sourceTreeSha: manifest.sourceTreeSha, baseline, publicationLock, candidate, preparedAt: time }
const clone = value => structuredClone(value)
function adapters({ initialLocked = false, initialPublished = baseline.deploymentId, ...overrides } = {}) {
  const calls = []
  let published = initialPublished
  let locked = initialLocked
  const a = {
    calls, now: () => time,
    controllerGate: async () => { calls.push('controller') },
    recordControllerGate: async () => { calls.push('record-controller') },
    sourceGate: async () => { calls.push('source') },
    snapshot: async appSha => ({ ...baseline, deploymentId: published, appSha: appSha ?? null }),
    publication: async () => ({ deploymentId: published, locked, observedAt: time }),
    assertPublication: async (id, expected) => { assert.equal(published, id); assert.equal(locked, expected) },
    lock: async id => { assert.equal(published, id); assert.equal(locked, false); calls.push(`lock:${id}`); locked = true },
    unlock: async id => { assert.equal(published, id); assert.equal(locked, true); calls.push(`unlock:${id}`); locked = false },
    auth: async () => { calls.push('auth'); return { signInForm: true, emailSent: false } },
    writeState: async s => { calls.push({ state: clone(s) }) },
    build: async () => { calls.push('build') },
    draft: async () => { calls.push('draft'); return candidate },
    observe: async () => ({ observedAt: time, publishedDeploymentId: published, matchingDrafts: [] }),
    candidate: async () => { calls.push('candidate') },
    writeRecord: async r => { calls.push({ record: clone(r) }) },
    loadRecord: async () => clone(record),
    loadQa: async () => ({ bound: true }),
    validateQa: async () => { calls.push('qa') },
    media: async () => { calls.push('media'); return { checkedAt: time } },
    writeQa: async () => { calls.push('write-qa') },
    baselineDeployment: async () => { calls.push('baseline-deployment') },
    restore: async id => { calls.push(`restore:${id}`); published = id },
    publishedMarker: async () => { calls.push('public-marker') },
    ...overrides,
  }
  return a
}

test('fixed manifest seals exactly 24 media files and six UI files', () => {
  assert.equal(validateManifest(manifest).files.length, 30)
  for (const edit of [m => m.files.pop(), m => { m.files[0].path = 'apps/generator-app/src/app/api/stripe/route.ts' }, m => { m.files[0].mode = '120000' }, m => { m.siteToken = 'secret' }]) {
    const m = clone(manifest); edit(m); assert.throws(() => validateManifest(m))
  }
})
test('prior main controller requires ancestry and the complete identical dependency closure', () => {
  const entries = CONTROLLER_CLOSURE.map(path => ({ path, entry: `100644 blob ${controllerSha}\t${path}` }))
  const input = { priorSha: 'c'.repeat(40), currentSha: controllerSha, ancestor: true, priorEntries: entries, currentEntries: entries }
  assertControllerCompatibility(input)
  assert.throws(() => assertControllerCompatibility({ ...input, ancestor: false }))
  assert.throws(() => assertControllerCompatibility({ ...input, priorEntries: entries.slice(1) }))
  for (const target of ['pnpm-lock.yaml', '.github/workflows/demo-maintenance.yml', 'apps/generator-app/scripts/verify-auth-entrypoint.mjs', 'apps/generator-app/scripts/demo-maintenance-release.json']) {
    const priorEntries = clone(entries); priorEntries.find(x => x.path === target).entry = 'changed'
    assert.throws(() => assertControllerCompatibility({ ...input, priorEntries }))
  }
})
test('record admits separate app and original catalogue identities only', () => {
  assert.equal(validateRecord(record, ctx).sourceSha, manifest.sourceSha)
  for (const edit of [r => { r.baseline.catalogue.releaseSha = manifest.sourceSha }, r => { r.candidate.origin = 'https://dailyclarity.org' }, r => { r.candidate.origin = 'https://attacker.invalid' }, r => { r.candidate.markerHash = hash }, r => { r.baseline.siteId = 'other' }, r => { r.sourceSha = controllerSha }, r => { r.candidate.title += '-copied' }]) {
    const r = clone(record); edit(r); assert.throws(() => validateRecord(r, ctx))
  }
})
test('runtime requires new app SHA while old certificate and readiness remain unchanged', () => {
  const ready = { deploymentSiteId: baseline.siteId, supabaseProjectRef: 'project', deploymentReleaseSha: manifest.sourceSha, supabaseSchemaReady: true, supabaseSchemaVersion: '20260903.4', bookingKitSchemaVersion: '20260925.2', checkoutReady: true, templateCheckoutReady: true, customBuildCheckoutReady: true, fulfillmentReady: true, emailReady: true, templateCatalogReady: true, missingRequirements: [], salesPaused: false, bookingKitSalesEnabled: false, templateCatalogProfile: 'rehab-certified', templateCatalogueReleaseSha: manifest.baselineSha, templateCertificationHash: catalogue.certificationHash, templateCatalogHash: hash, templateManifestHash: hash, publishedTemplateCount: 5486, expectedTemplateCount: 5486, templateCatalogIssues: [] }
  const expected = { siteId: baseline.siteId, projectRef: 'project', appSha: manifest.sourceSha, catalogue }
  assert.equal(validateRuntime(ready, expected).appSha, manifest.sourceSha)
  for (const field of ['deploymentReleaseSha', 'templateCatalogueReleaseSha', 'templateCertificationHash', 'emailReady', 'supabaseSchemaReady', 'bookingKitSalesEnabled', 'publishedTemplateCount']) {
    assert.throws(() => validateRuntime({ ...ready, [field]: field === 'bookingKitSalesEnabled' ? true : false }, expected))
  }
})
test('source build env cannot inherit GitHub, provider, payment or internal credentials', () => {
  const clean = cleanBuildEnvironment({ PATH: 'bin', HOME: '/runner', NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NETLIFY_SITE_ID: baseline.siteId, GITHUB_TOKEN: 'private', NETLIFY_AUTH_TOKEN: 'private', SUPABASE_SERVICE_ROLE_KEY: 'private', INTERNAL_ADMIN_TOKEN: 'private', STRIPE_SECRET_KEY: 'private', NODE_OPTIONS: '--import=hostile', GITHUB_SHA: controllerSha }, manifest)
  assert.equal(clean.NEXT_PUBLIC_RELEASE_SHA, manifest.sourceSha)
  assert.equal(clean.DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE, 'rehab-certified')
  assert(!JSON.stringify(clean).includes('private'))
  assert.equal(clean.NODE_OPTIONS, undefined)
  assert.equal(clean.GITHUB_SHA, undefined)
})
test('adapter normalization runs only the fixed controller helper inside the pinned CLI environment', () => {
  const args = demoAdapterConfigurationArguments('/reviewed/source')
  assert.deepEqual(args.slice(0, 3), ['--package=netlify-cli@27.4.2', 'dlx', 'node'])
  assert.match(args[3], /[/\\]scripts[/\\]demo-maintenance-adapter-config\.mjs$/)
  assert.equal(args[4], '/reviewed/source')
  assert.equal(args.length, 5)
  assert(!args.includes('--shell-mode'))
})
test('prebuilt upload uses only the reviewed helper with separate absolute request and journal', () => {
  const source = path.resolve('reviewed-source')
  const request = path.resolve('request.json')
  const checkpoint = path.resolve('checkpoint.json')
  const args = demoDraftArguments(source, request, checkpoint)
  assert.deepEqual(args.slice(0, 3), ['--package=netlify-cli@27.4.2', 'dlx', 'node'])
  assert.match(args[3], /[/\\]scripts[/\\]demo-maintenance-locked-upload\.mjs$/)
  assert.deepEqual(args.slice(4), [source, request, checkpoint])
  for (const flag of ['--context', '--build', '--prod', '--prod-if-unlocked', '--trigger']) assert.ok(!args.includes(flag))
  assert.throws(() => demoDraftArguments(source, request))
  assert.throws(() => demoDraftArguments('relative-source', request, checkpoint))
  assert.throws(() => demoDraftArguments(source, request, request))
  assert.equal(cleanBuildEnvironment({ NETLIFY_SITE_ID: baseline.siteId }, manifest).CONTEXT, 'production')
})

test('settings/catalogue/deployment mutation invalidates unchanged baseline guard', () => {
  assertUnchanged(baseline, baseline)
  for (const field of ['siteId', 'accountHash', 'settingsHash', 'environmentHash', 'projectRefHash', 'deploymentId', 'appSha']) assert.throws(() => assertUnchanged({ ...baseline, [field]: 'changed' }, baseline))
  assert.throws(() => assertUnchanged({ ...baseline, catalogue: { ...catalogue, pointerHash: 'f'.repeat(64) } }, baseline))
})
test('artifact sources require exact identity objects without executable paths', () => {
  const source = { runId: '1', runAttempt: '2', artifactId: '3', artifactDigest: hash, recordHash: hash }
  assert.deepEqual(parseArtifactSource(JSON.stringify(source), 'record'), source)
  for (const bad of [{ ...source, path: '/tmp/evidence' }, { ...source, runId: 1 }, { ...source, artifactDigest: `sha256:${hash}` }, { ...source, runAttempt: '../1' }]) assert.throws(() => parseArtifactSource(JSON.stringify(bad), 'record'))
})
test('artifact metadata rejects expired, cross-run, PR and failed evidence', () => {
  const source = { runId: '1', runAttempt: '2', artifactId: '3', artifactDigest: hash, recordHash: hash }
  const run = { id: 1, run_attempt: 2, status: 'completed', conclusion: 'success', event: 'workflow_dispatch', path: '.github/workflows/demo-maintenance.yml', head_branch: 'main', head_sha: controllerSha, head_repository: { full_name: 'russlle2/platform-builder' }, run_started_at: time, updated_at: time }
  const artifact = { id: 3, name: 'demo-maintenance-record-1-2', digest: `sha256:${hash}`, expired: false, expires_at: '2026-11-01T00:00:00Z', size_in_bytes: 1000, workflow_run: { id: 1, head_sha: controllerSha }, created_at: time }
  const input = { run, artifact, source, kind: 'record', controllerSha, repository: 'russlle2/platform-builder', now: Date.parse(time) }
  validateArtifactMetadata(input)
  for (const delta of [{ run: { ...run, conclusion: 'failure' } }, { run: { ...run, run_attempt: 1 } }, { run: { ...run, event: 'pull_request' } }, { artifact: { ...artifact, expired: true } }, { artifact: { ...artifact, digest: `sha256:${'f'.repeat(64)}` } }, { artifact: { ...artifact, workflow_run: { id: 8, head_sha: controllerSha } } }]) assert.throws(() => validateArtifactMetadata({ ...input, ...delta }))
})
test('QA must bind exact record and fresh producer chronology, not only passed=true', () => {
  let validations = 0
  const report = { checkedAt: time, passed: true }
  const qa = { version: 1, kind: 'dailyclarity-demo-maintenance-qa', controllerSha, producer, manifestHash: ctx.manifestHash, recordHash: canonicalDigest(record), sourceSha: manifest.sourceSha, deploymentId: candidate.deploymentId, report }
  const config = { ...ctx, record, reportValidator: () => { validations++ }, now: Date.parse(time) }
  validateQa(qa, config); assert.equal(validations, 1)
  assert.throws(() => validateQa({ ...qa, recordHash: hash }, config))
  assert.throws(() => validateQa(qa, { ...config, now: Date.parse(time) + 25 * 3600000 }))
  assert.throws(() => validateQa(qa, { ...config, reportValidator: () => { throw new Error('incomplete actual playback') } }))
})
test('prepare persists healthy baseline before any write and validates candidate before record', async () => {
  const a = adapters(); const result = await executeMaintenance(ctx, a)
  assert.equal(result.sourceSha, manifest.sourceSha)
  assert(a.calls.findIndex(v => v.state?.phase === 'baseline-captured') < a.calls.indexOf('draft'))
  assert(a.calls.indexOf('candidate') < a.calls.findIndex(v => v.record))
  assert.equal(a.calls.at(-1).state.phase, 'prepared')
})
test('source rejection and changed baseline forbid creating draft', async () => {
  const a = adapters({ sourceGate: async () => { throw new Error('source changed') } })
  await assert.rejects(executeMaintenance(ctx, a)); assert(!a.calls.includes('draft'))
  let count = 0
  const b = adapters({ snapshot: async () => ++count === 1 ? baseline : { ...baseline, settingsHash: 'changed' } })
  await assert.rejects(executeMaintenance(ctx, b)); assert(!b.calls.includes('draft'))
})
test('failed static output validation during build forbids draft request', async () => {
  const a = adapters({ build: async () => { throw new Error('Static output differs') } })
  await assert.rejects(executeMaintenance(ctx, a))
  assert(!a.calls.includes('draft'))
  assert(!a.calls.some(v => v.record))
  assert.equal(a.calls.at(-1).state.phase, 'build-requested')
  assert.equal(a.calls.at(-1).state.providerWriteAttempted, false)
})
test('failed draft retains observed partial identity without a prepared record', async () => {
  const a = adapters({ draft: async () => { throw new Error('ambiguous CLI failure') }, observe: async () => ({ publishedDeploymentId: baseline.deploymentId, matchingDrafts: [{ deploymentId: candidate.deploymentId, state: 'uploading' }] }) })
  await assert.rejects(executeMaintenance(ctx, a))
  assert.equal(a.calls.at(-1).state.observation.matchingDrafts[0].deploymentId, candidate.deploymentId)
  assert(!a.calls.some(v => v.record))
})
test('promotion refuses missing QA before any restore', async () => {
  const a = adapters({ validateQa: async () => { throw new Error('no actual QA') } })
  await assert.rejects(executeMaintenance({ ...ctx, operation: 'promote', confirmation: 'PROMOTE DEMO DRAFT' }, a))
  assert(!a.calls.some(v => typeof v === 'string' && v.startsWith('restore:')))
})
test('promotion restores the same draft and verifies media/auth/public marker', async () => {
  const a = adapters({ initialLocked: true })
  const result = await executeMaintenance({ ...ctx, operation: 'promote', confirmation: 'PROMOTE DEMO DRAFT' }, a)
  assert.equal(result.phase, 'promoted')
  assert(a.calls.includes(`restore:${candidate.deploymentId}`))
  assert(!a.calls.includes('build') && !a.calls.includes('draft'))
  assert(a.calls.indexOf('media') > a.calls.indexOf(`restore:${candidate.deploymentId}`))
  assert(a.calls.includes('public-marker'))
  assert.deepEqual(result.finalMedia, { checkedAt: time })
  assert.deepEqual(result.finalAuth, { signInForm: true, emailSent: false })
  assert(a.calls.indexOf(`unlock:${candidate.deploymentId}`) > a.calls.indexOf('public-marker'))
  assert.equal(result.finalPublication.locked, false)
})
test('ambiguous restore failure always retains observed actual publication', async () => {
  const a = adapters({ initialLocked: true, restore: async () => { throw new Error('network after publication') }, observe: async () => ({ publishedDeploymentId: candidate.deploymentId, matchingDrafts: [] }) })
  await assert.rejects(executeMaintenance({ ...ctx, operation: 'promote', confirmation: 'PROMOTE DEMO DRAFT' }, a))
  assert.equal(a.calls.at(-1).state.observation.publishedDeploymentId, candidate.deploymentId)
  assert.equal(a.calls.at(-1).state.phase, 'restore-observed')
})
test('rollback can restore baseline without healthy candidate runtime and refuses unrelated deploy', async () => {
  const a = adapters()
  const result = await executeMaintenance({ ...ctx, operation: 'rollback', confirmation: 'ROLLBACK DEMO' }, a)
  assert.equal(result.phase, 'rolled-back')
  assert(a.calls.includes(`restore:${baseline.deploymentId}`))
  assert(a.calls.includes('baseline-deployment'))
  const b = adapters({ snapshot: async () => ({ ...baseline, deploymentId: '3'.repeat(24), appSha: null }) })
  await assert.rejects(executeMaintenance({ ...ctx, operation: 'rollback', confirmation: 'ROLLBACK DEMO' }, b))
  assert(!b.calls.some(v => typeof v === 'string' && v.startsWith('restore:')))
})

test('record requires a new owned baseline lock and actual production runtime context', () => {
  for (const edit of [
    r => { delete r.publicationLock },
    r => { r.publicationLock.wasLocked = true },
    r => { r.publicationLock.deploymentId = candidate.deploymentId },
    r => { r.publicationLock.acquiredAt = '2026-10-19T23:00:00Z' },
    r => { r.publicationLock.acquiredAt = '2026-10-20T01:00:00Z' },
    r => { r.publicationLock.extra = true },
    r => { r.candidate.runtimeContext = 'deploy-preview' },
  ]) { const copy = clone(record); edit(copy); assert.throws(() => validateRecord(copy, ctx)) }
})
test('prepare refuses an existing lock and never unlocks after a partial upload', async () => {
  const existing = adapters({ initialLocked: true })
  await assert.rejects(executeMaintenance(ctx, existing))
  assert(!existing.calls.includes('build') && !existing.calls.includes('draft'))
  const partial = adapters({ draft: async (_title, onReturned) => { await onReturned({ deploymentId: candidate.deploymentId }); throw new Error('upload stopped') } })
  await assert.rejects(executeMaintenance(ctx, partial))
  assert.equal((await partial.publication()).locked, true)
  assert.equal(partial.calls.at(-1).state.returnedCandidate.deploymentId, candidate.deploymentId)
  assert(!partial.calls.some(v => typeof v === 'string' && v.startsWith('unlock:')))
})
test('lock failure forbids upload and retains actual publication observation', async () => {
  const a = adapters({ lock: async () => { throw new Error('ambiguous lock request') } })
  await assert.rejects(executeMaintenance(ctx, a))
  assert(!a.calls.includes('draft'))
  assert.equal(a.calls.at(-1).state.phase, 'publication-lock-requested')
  assert.equal(a.calls.at(-1).state.lockObservation.deploymentId, baseline.deploymentId)
  assert.equal(a.calls.at(-1).state.providerWriteAttempted, true)
})
test('draft QA requires retained lock and does not change publication', async () => {
  const operation = { ...ctx, operation: 'verify-draft', confirmation: 'VERIFY DEMO DRAFT' }
  const good = adapters({ initialLocked: true })
  await executeMaintenance(operation, good)
  assert.equal((await good.publication()).locked, true)
  assert(good.calls.includes('write-qa'))
  const bad = adapters()
  await assert.rejects(executeMaintenance(operation, bad))
  assert(!bad.calls.includes('media'))
  const drift = adapters({ initialLocked: true, media: async () => { await drift.unlock(baseline.deploymentId); return { checkedAt: time } } })
  await assert.rejects(executeMaintenance(operation, drift))
  assert(!drift.calls.includes('write-qa'))
})
test('promotion refuses an unlocked baseline and retains lock when final checks fail', async () => {
  const operation = { ...ctx, operation: 'promote', confirmation: 'PROMOTE DEMO DRAFT' }
  const unlocked = adapters()
  await assert.rejects(executeMaintenance(operation, unlocked))
  assert(!unlocked.calls.some(v => typeof v === 'string' && v.startsWith('restore:')))
  const failed = adapters({ initialLocked: true, media: async () => { throw new Error('public media failed') } })
  await assert.rejects(executeMaintenance(operation, failed))
  assert.deepEqual(await failed.publication(), { deploymentId: candidate.deploymentId, locked: true, observedAt: time })
  assert(!failed.calls.some(v => typeof v === 'string' && v.startsWith('unlock:')))
})
test('rollback acquires lock on the published candidate and releases only the verified baseline', async () => {
  const a = adapters({ initialPublished: candidate.deploymentId })
  await executeMaintenance({ ...ctx, operation: 'rollback', confirmation: 'ROLLBACK DEMO' }, a)
  assert(a.calls.indexOf(`lock:${candidate.deploymentId}`) < a.calls.indexOf(`restore:${baseline.deploymentId}`))
  assert(a.calls.indexOf(`unlock:${baseline.deploymentId}`) > a.calls.indexOf('public-marker'))
  assert.deepEqual(await a.publication(), { deploymentId: baseline.deploymentId, locked: false, observedAt: time })
})
