import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { findPinnedNetlifyPackage, stageAdapterConfiguration } from './demo-maintenance-adapter-config.mjs'
import { verifyAdapterStaticOutput } from './demo-maintenance-static-output.mjs'
import { assertLockedBaseline, loadPinnedUploadTools, nativeUploadApi, pinnedDeployFilter, preparePinnedUpload, uploadLockedCandidate, validateLockedUploadCheckpoint, validateLockedUploadRequest } from './demo-maintenance-locked-upload.mjs'

const SITE = '4a98d266-bb9f-44ab-bf27-30597d741705'
const BASELINE = 'a'.repeat(24)
const CANDIDATE = 'b'.repeat(24)
const TITLE = `Demo ${'c'.repeat(40)} 123/1`
const now = '2026-10-20T00:00:00.000Z'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const request = () => ({
  version: 1, siteId: SITE, baselineDeploymentId: BASELINE, title: TITLE,
  adapterConfiguration: { version: 1, netlifyCli: '27.4.2', configVersion: '25.2.7', generatedConfigSha256: 'a'.repeat(64), configSha256: 'b'.repeat(64), semanticSha256: 'c'.repeat(64), normalizedPathCount: 5, offlineEquivalent: true },
  staticOutput: { version: 1, publishDirectory: 'apps/generator-app/.netlify/static', fileCount: 26, byteCount: 1024, mediaFiles: 24, markerSha256: 'd'.repeat(64), treeSha256: 'e'.repeat(64) },
})
const site = () => ({ id: SITE, published_deploy: { id: BASELINE, locked: true }, build_settings: { stop_builds: true } })
const candidate = () => ({ id: CANDIDATE, site_id: SITE, context: 'production', state: 'uploading', title: TITLE, created_at: now, published_at: null, locked: false })
function fixture(overrides = {}) {
  const events = []
  const checkpoints = []
  const adapters = {
    now: () => now,
    checkpoint: async state => { validateLockedUploadCheckpoint(state, request()); checkpoints.push(structuredClone(state)); events.push(`checkpoint:${state.phase}`) },
    prepare: async () => { events.push('prepare'); return {} },
    site: async () => { events.push('site'); return site() },
    create: async params => { events.push('create'); assert.deepEqual(params, { siteId: SITE, title: TITLE, body: { draft: false } }); return candidate() },
    deploy: async () => { events.push('deploy'); return candidate() },
    blobs: async () => { events.push('blobs') },
    upload: async (_id, _prepared, guard) => { events.push('upload'); await guard(); return { ...candidate(), state: 'ready' } },
    ...overrides,
  }
  return { adapters, events, checkpoints }
}

test('only the fixed production target and exact proof fields are accepted', () => {
  assert.equal(validateLockedUploadRequest(request()).siteId, SITE)
  for (const change of [
    value => { value.siteId = 'other' }, value => { value.title = 'arbitrary' },
    value => { value.extra = 'token' }, value => { value.staticOutput.mediaFiles = 23 },
    value => { value.adapterConfiguration.offlineEquivalent = false },
  ]) {
    const value = request(); change(value); assert.throws(() => validateLockedUploadRequest(value))
  }
  for (const changed of [{ ...site(), id: 'other' }, { ...site(), published_deploy: { id: BASELINE, locked: false } }, { ...site(), published_deploy: { id: CANDIDATE, locked: true } }, { ...site(), build_settings: { stop_builds: false } }]) assert.throws(() => assertLockedBaseline(changed, request()))
})

test('returned identity is checkpointed before any blob/package upload and the lock remains mandatory', async () => {
  const f = fixture()
  const result = await uploadLockedCandidate(request(), f.adapters)
  assert.deepEqual(result, { deploymentId: CANDIDATE, createdAt: now, context: 'production' })
  assert.ok(f.events.indexOf('prepare') < f.events.indexOf('create'))
  assert.ok(f.events.indexOf('checkpoint:candidate-returned') < f.events.indexOf('blobs'))
  assert.ok(f.events.indexOf('blobs') < f.events.indexOf('upload'))
  const final = f.checkpoints.at(-1)
  assert.equal(validateLockedUploadCheckpoint(final, request(), { requireComplete: true }).complete, true)
  assert.equal(final.candidate.published, false)
  assert.equal(f.events.filter(event => event === 'create').length, 1)
})

test('local proof failure and missing lock prevent candidate creation', async () => {
  for (const overrides of [
    { prepare: async () => { throw new Error('private local path') } },
    { site: async () => ({ ...site(), published_deploy: { id: BASELINE, locked: false } }) },
  ]) {
    const f = fixture(overrides)
    await assert.rejects(uploadLockedCandidate(request(), f.adapters))
    assert.equal(f.events.includes('create'), false)
    assert.equal(f.checkpoints.at(-1).complete, false)
  }
})

test('unexpected returned context, ID, publication or title is retained but blocks all upload', async () => {
  for (const change of [{ context: 'deploy-preview' }, { id: BASELINE }, { title: 'wrong' }, { published_at: now }, { site_id: 'other' }]) {
    const f = fixture({ create: async () => ({ ...candidate(), ...change }) })
    await assert.rejects(uploadLockedCandidate(request(), f.adapters))
    assert.equal(f.events.includes('blobs'), false)
    assert.equal(f.events.includes('upload'), false)
    assert.equal(f.checkpoints.at(-1).candidate.deploymentId, change.id || CANDIDATE)
    assert.equal(f.checkpoints.at(-1).complete, false)
  }
})

test('uncertain creation is not retried and raw diagnostics cannot leak', async () => {
  let creates = 0
  const f = fixture({ create: async () => { creates++; throw Object.assign(new Error('SECRET_TOKEN private@example.com'), { status: 403, lockedUploadCode: 'SECRET_TOKEN' }) } })
  await assert.rejects(uploadLockedCandidate(request(), f.adapters))
  assert.equal(creates, 1)
  const final = f.checkpoints.at(-1)
  assert.deepEqual(final.failure, { phase: 'create-requested', status: 403, category: 'package-or-network-failure' })
  assert.equal(JSON.stringify(final).includes('SECRET'), false)
  assert.equal(final.candidate, null)
})

test('lock drift after creation or after blobs blocks subsequent steps and preserves identity', async () => {
  for (const driftAt of [2, 3]) {
    let reads = 0
    const f = fixture({ site: async () => (++reads >= driftAt ? { ...site(), published_deploy: { id: BASELINE, locked: false } } : site()) })
    await assert.rejects(uploadLockedCandidate(request(), f.adapters))
    assert.equal(f.events.includes('upload'), false)
    assert.equal(f.checkpoints.at(-1).candidate.deploymentId, CANDIDATE)
  }
})

test('checkpoint cannot claim readiness with missing or changed binding', async () => {
  const f = fixture()
  await uploadLockedCandidate(request(), f.adapters)
  const final = f.checkpoints.at(-1)
  for (const change of [
    value => { value.title = 'other' }, value => { value.candidate.published = true },
    value => { value.candidate.context = 'deploy-preview' }, value => { value.complete = false },
    value => { value.candidate.deploymentId = BASELINE }, value => { value.events[0].token = 'private' },
  ]) {
    const value = structuredClone(final); change(value)
    assert.throws(() => validateLockedUploadCheckpoint(value, request(), { requireComplete: true }))
  }
})

test('native facade binds finalize and uploads to one candidate, with no restore/unlock API', async () => {
  const calls = []
  let guards = 0
  const api = nativeUploadApi({
    token: 'private',
    request: request(), candidateId: CANDIDATE,
    guard: async () => { guards++ },
    requestImpl: async (_token, route, options) => { calls.push({ route, options }); return candidate() },
  })
  assert.equal(api.restoreSiteDeploy, undefined)
  assert.equal(api.unlockDeploy, undefined)
  await api.updateSiteDeploy({ siteId: SITE, deploy_id: CANDIDATE, body: { draft: false, files: {} } })
  await Promise.all([
    api.uploadDeployFile({ deployId: CANDIDATE, path: 'index.html', body: Buffer.from('safe') }),
    api.uploadDeployFunction({ deployId: CANDIDATE, name: 'server', runtime: 'nodejs22.x', body: Buffer.from('zip'), xNfRetryCount: 2 }),
    api.uploadDeployEdgeFunction({ deployId: CANDIDATE, codeSha: 'd'.repeat(64), body: Buffer.from('edge'), xNfRetryCount: 5 }),
  ])
  assert.equal(guards, 2)
  for (const params of [
    { siteId: SITE, deploy_id: BASELINE, body: { draft: false } },
    { siteId: SITE, deploy_id: CANDIDATE, body: { draft: true } },
    { siteId: SITE, deploy_id: CANDIDATE, body: { draft: false, environment: [] } },
    { siteId: SITE, deploy_id: CANDIDATE, body: { draft: false, branch: 'main' } },
  ]) await assert.rejects(api.updateSiteDeploy(params))
  assert.equal(calls.length, 4)
  assert.equal(calls.find(call => call.route.includes('/functions/')).options.retryCount, 2)
  assert.equal(calls.find(call => call.route.includes('/edge_functions/')).options.retryCount, 5)
  for (const xNfRetryCount of [-1, 6, 1.5, 'private']) {
    await assert.rejects(api.uploadDeployFunction({ deployId: CANDIDATE, name: 'server', runtime: 'js', xNfRetryCount }))
    await assert.rejects(api.uploadDeployEdgeFunction({ deployId: CANDIDATE, codeSha: 'd'.repeat(64), xNfRetryCount }))
  }
  assert.equal(calls.length, 4)
})

test('pinned filter preserves the release marker and framework assets, folds routing files into config', () => {
  const filter = pinnedDeployFilter('/publish')
  for (const value of ['/publish', '/publish/__dailyclarity_release.json', '/publish/_next/static/x.js', '/publish/.well-known']) assert.equal(filter(value), true)
  for (const value of [null, '/publish/.env', '/publish/__MACOSX', '/publish/_headers', '/publish/_redirects']) assert.equal(filter(value), false)
})

let packageFile
let tools
try { packageFile = await findPinnedNetlifyPackage(); tools = await loadPinnedUploadTools(packageFile) } catch (error) {
  if (error.message !== 'Pinned Netlify CLI package is unavailable') throw error
}
const integration = { skip: !tools && 'Run through pnpm --package=netlify-cli@27.4.2 dlx node --test' }

test('actual pinned packaging retains public bytes, cached functions, edge bundles, routes and deploy metadata offline', integration, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'demo-locked-test-'))
  const temp = await mkdtemp(path.join(os.tmpdir(), 'demo-locked-package-test-'))
  const validateTemp = (value, prefix) => {
    assert.equal(path.dirname(path.resolve(value)), path.resolve(os.tmpdir()))
    assert.ok(path.basename(value).startsWith(prefix))
  }
  validateTemp(root, 'demo-locked-test-')
  validateTemp(temp, 'demo-locked-package-test-')
  try {
    const app = path.join(root, 'apps/generator-app')
    const publish = path.join(app, '.netlify/static')
    const publicDir = path.join(app, 'public')
    const functionsDir = path.join(root, 'netlify/functions')
    const cacheDir = path.join(app, '.netlify/functions')
    for (const dir of [publish, publicDir, path.join(app, '.next/static'), functionsDir, cacheDir, path.join(app, '.netlify/edge-functions-dist'), path.join(app, '.netlify/deploy-config')]) await mkdir(dir, { recursive: true })
    await writeFile(path.join(root, 'package.json'), '{"private":true}')
    await writeFile(path.join(app, 'package.json'), '{"name":"fixture","private":true}')
    await mkdir(path.join(app, 'node_modules/next'), { recursive: true })
    await writeFile(path.join(app, 'node_modules/next/package.json'), '{"name":"next","version":"15.5.4"}')
    const manifest = { files: [] }
    for (let i = 0; i < 24; i++) {
      const bytes = Buffer.from(`media-${i}`)
      const name = `media-${i}.txt`
      await writeFile(path.join(publicDir, name), bytes)
      await writeFile(path.join(publish, name), bytes)
      manifest.files.push({ path: `apps/generator-app/public/${name}`, bytes: bytes.length, sha256: hash(bytes) })
    }
    const marker = { version: 1, fixture: 'synthetic-local-only' }
    const markerBytes = `${JSON.stringify(marker)}\n`
    await writeFile(path.join(publicDir, '__dailyclarity_release.json'), markerBytes)
    await writeFile(path.join(publish, '__dailyclarity_release.json'), markerBytes)
    await mkdir(path.join(publish, '_next/static'), { recursive: true })
    await writeFile(path.join(app, '.next/static/test.js'), 'console.log(1)')
    await writeFile(path.join(publish, '_next/static/test.js'), 'console.log(1)')
    await writeFile(path.join(root, 'netlify.toml'), '[build]\nbase="/"\npublish="apps/generator-app/.next"\n[functions]\nnode_bundler="nft"\n[[redirects]]\nfrom="/route"\nto="/target"\nstatus=200\n[[headers]]\nfor="/media-*"\n[headers.values]\nCache-Control="public"\n')
    const first = await tools.resolveConfig({ cwd: root, repositoryRoot: root, packagePath: 'apps/generator-app', context: 'production', offline: true, mode: 'cli', buffer: true })
    await writeFile(path.join(app, '.netlify/netlify.toml'), tools.serialize(first.config))
    const adapterConfiguration = await stageAdapterConfiguration(root, tools)
    const staticOutput = await verifyAdapterStaticOutput(root, manifest, marker)
    const require = createRequire(packageFile)
    const { zipFunctions } = await import(pathToFileURL(require.resolve('@netlify/zip-it-and-ship-it')).href)
    await writeFile(path.join(functionsDir, 'server.cjs'), "exports.handler=async()=>({statusCode:200,body:'local-fixture'});")
    const functions = await zipFunctions(functionsDir, cacheDir, { config: { '*': { nodeBundler: 'none', nodeVersion: '22.x' } } })
    functions[0].generator = '@netlify/plugin-nextjs'
    functions[0].routes = [{ pattern: '/*', prefer_static: true }]
    const manifestPath = path.join(cacheDir, 'manifest.json')
    await writeFile(manifestPath, JSON.stringify({ version: 1, timestamp: Date.now(), functions }))
    const edgeDir = path.join(app, '.netlify/edge-functions-dist')
    await writeFile(path.join(edgeDir, 'bundle.eszip'), 'local-edge-fixture')
    await writeFile(path.join(edgeDir, 'manifest.json'), JSON.stringify({ bundles: [{ asset: 'bundle.eszip', format: 'eszip' }], routes: [{ function: 'middleware', pattern: '/*' }] }))
    await writeFile(path.join(app, '.netlify/deploy-config/config.json'), '{"fixture":true}')
    const req = { ...request(), adapterConfiguration, staticOutput }
    const prepared = await preparePinnedUpload(root, req, tools, { manifest, marker })
    // No blob directory exists in this fixture. The actual exported core runner
    // must accept this exact cached production configuration without networking.
    const noBlobs = await tools.runCoreSteps(['blobs_upload'], {
      cachedConfig: { ...prepared.resolved, siteInfo: { id: SITE, account_id: 'local-fixture' } },
      packagePath: 'apps/generator-app', deployId: CANDIDATE, siteId: SITE,
      token: 'local-fixture-token-never-sent', quiet: true, buffer: true,
      context: 'production', offline: true, mode: 'cli', telemetry: false, sendStatus: false,
    })
    assert.equal(noBlobs.success, true)
    let finalBody
    const uploaded = []
    const api = {
      updateSiteDeploy: async ({ body }) => {
        finalBody = body
        return { ...candidate(), required: Object.values(body.files), required_functions: Object.values(body.functions), required_edge_functions: Object.values(body.edge_functions) }
      },
      uploadDeployFile: async params => { uploaded.push({ type: 'file', path: params.path }) },
      uploadDeployFunction: async params => { uploaded.push({ type: 'function', name: params.name, runtime: params.runtime }) },
      uploadDeployEdgeFunction: async params => { uploaded.push({ type: 'edge', sha: params.codeSha }) },
      getSiteDeploy: async () => ({ ...candidate(), state: 'ready' }),
    }
    await tools.deploySite(prepared.command, api, SITE, publish, {
      config: prepared.config, fnDir: prepared.fnDir, functionsConfig: prepared.functionsConfig, deployId: CANDIDATE,
      draft: false, workingDir: app, siteRoot: root, manifestPath, filter: pinnedDeployFilter(publish),
      tmpDir: temp, statusCb: () => {}, deployTimeout: 1000,
    })
    assert.ok(finalBody.files['__dailyclarity_release.json'])
    assert.ok(finalBody.files['_next/static/test.js'])
    assert.ok(finalBody.files['.netlify/deploy-config/config.json'])
    assert.ok(finalBody.files['.netlify/internal/edge-functions/manifest.json'])
    assert.ok(finalBody.edge_functions.eszip)
    assert.equal(finalBody.draft, false)
    assert.equal(finalBody.functions_config.server.generator, '@netlify/plugin-nextjs')
    assert.deepEqual(finalBody.functions_config.server.routes, [{ pattern: '/*', prefer_static: true }])
    assert.ok(finalBody.functions_config.server.build_data)
    assert.equal(uploaded.find(item => item.type === 'function').runtime, 'nodejs22.x')
    assert.ok(uploaded.some(item => item.type === 'edge'))
    assert.equal(prepared.config.redirects[0].from, '/route')
    assert.equal(prepared.config.headers[0].for, '/media-*')
    await writeFile(path.join(app, 'netlify.toml'), 'changed')
    await assert.rejects(preparePinnedUpload(root, req, tools, { manifest, marker }), /adapter-config-changed/)
  } finally {
    validateTemp(root, 'demo-locked-test-')
    validateTemp(temp, 'demo-locked-package-test-')
    await rm(root, { recursive: true, force: true })
    await rm(temp, { recursive: true, force: true })
  }
})
