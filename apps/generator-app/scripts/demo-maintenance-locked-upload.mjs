import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { canonicalDigest, markerFor, validateManifest } from './demo-maintenance-contract.mjs'
import { assertAdapterConfigurationEquivalent, findPinnedNetlifyPackage, loadPinnedAdapterTools, validateAdapterConfigurationProof } from './demo-maintenance-adapter-config.mjs'
import { verifyAdapterStaticOutput } from './demo-maintenance-static-output.mjs'

const APP = 'apps/generator-app'
const SITE = '4a98d266-bb9f-44ab-bf27-30597d741705'
const ID = /^[a-f0-9]{24}$/
const HASH = /^[a-f0-9]{64}$/
const phases = ['configuration', 'local-output', 'baseline-lock', 'create-requested', 'candidate-returned', 'candidate-guard', 'blobs-upload', 'package-upload', 'candidate-ready']
const failureCodes = new Set(['baseline-lock-changed', 'candidate-identity-or-context', 'candidate-not-ready', 'provider-http', 'provider-response-too-large', 'adapter-config-changed', 'adapter-semantics-changed', 'static-output-changed', 'production-functions-cache-missing', 'production-functions-cache-invalid', 'production-function-runtime-invalid', 'production-functions-cache-changed', 'production-functions-cache-expired', 'compiled-edge-bundles-missing', 'compiled-edge-bundle-invalid', 'deploy-blobs-upload-failed', 'foreign-deploy-request', 'foreign-site-request', 'unexpected-finalize-request', 'invalid-upload-path', 'invalid-function-upload', 'invalid-function-mode', 'invalid-function-timeout', 'invalid-edge-upload', 'invalid-retry-count', 'packager-returned-foreign-deploy', 'invalid-local-file', 'invalid-source-directory', 'routing-parse-failed', 'functions-directory-missing', 'next-framework-version', 'path-outside-checkout', 'invalid-package-temp', 'package-or-network-failure'])
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const samePath = (left, right) => process.platform === 'win32' ? path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase() : path.resolve(left) === path.resolve(right)
const need = (condition, code) => { if (!condition) throw Object.assign(new Error(code), { lockedUploadCode: code }) }
const exactKeys = (value, expected) => need(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...expected].sort().join('|'), 'invalid-fields')
const boundedTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value))

export function validateLockedUploadRequest(request) {
  exactKeys(request, ['version', 'siteId', 'baselineDeploymentId', 'title', 'adapterConfiguration', 'staticOutput'])
  need(request.version === 1 && request.siteId === SITE && ID.test(request.baselineDeploymentId) && /^Demo [a-f0-9]{40} [1-9][0-9]*\/[1-9][0-9]*$/.test(request.title), 'invalid-request')
  validateAdapterConfigurationProof(request.adapterConfiguration)
  exactKeys(request.staticOutput, ['version', 'publishDirectory', 'fileCount', 'byteCount', 'mediaFiles', 'markerSha256', 'treeSha256'])
  const proof = request.staticOutput
  need(proof.version === 1 && proof.publishDirectory === `${APP}/.netlify/static` && proof.mediaFiles === 24 && Number.isSafeInteger(proof.fileCount) && proof.fileCount >= 25 && proof.fileCount <= 10000 && Number.isSafeInteger(proof.byteCount) && proof.byteCount > 0 && proof.byteCount <= 512 * 1024 * 1024 && HASH.test(proof.markerSha256) && HASH.test(proof.treeSha256), 'invalid-static-proof')
  return request
}

export function assertLockedBaseline(site, request) {
  need(site?.id === request.siteId && site.published_deploy?.id === request.baselineDeploymentId && site.published_deploy.locked === true && site.build_settings?.stop_builds === true, 'baseline-lock-changed')
}

function candidateView(deploy) {
  return {
    deploymentId: ID.test(deploy?.id ?? '') ? deploy.id : null,
    siteId: deploy?.site_id === SITE ? SITE : null,
    context: ['production', 'deploy-preview', 'branch-deploy'].includes(deploy?.context) ? deploy.context : 'other',
    state: ['new', 'pending', 'uploading', 'preparing', 'prepared', 'uploaded', 'processing', 'ready', 'error'].includes(deploy?.state) ? deploy.state : 'other',
    published: Boolean(deploy?.published_at),
    createdAt: boundedTime(deploy?.created_at) ? deploy.created_at : null,
  }
}

export function assertUnpublishedCandidate(deploy, request, expectedId) {
  need(ID.test(deploy?.id ?? '') && deploy.id !== request.baselineDeploymentId && (!expectedId || deploy.id === expectedId) && deploy.site_id === request.siteId && deploy.title === request.title && deploy.context === 'production' && !deploy.published_at && deploy.locked !== true && boundedTime(deploy.created_at), 'candidate-identity-or-context')
}

export function validateLockedUploadCheckpoint(state, requestValue, { requireComplete = false } = {}) {
  const request = validateLockedUploadRequest(requestValue)
  exactKeys(state, ['version', 'siteId', 'baselineDeploymentId', 'title', 'phase', 'candidate', 'complete', 'events', ...(state?.failure ? ['failure'] : [])])
  need(state.version === 1 && state.siteId === request.siteId && state.baselineDeploymentId === request.baselineDeploymentId && state.title === request.title && phases.includes(state.phase) && typeof state.complete === 'boolean' && Array.isArray(state.events) && state.events.length > 0 && state.events.length <= 20, 'invalid-checkpoint')
  for (const event of state.events) { exactKeys(event, ['phase', 'at']); need(phases.includes(event.phase) && boundedTime(event.at), 'invalid-checkpoint-event') }
  if (state.candidate !== null) {
    exactKeys(state.candidate, ['deploymentId', 'siteId', 'context', 'state', 'published', 'createdAt'])
    const value = state.candidate
    need((value.deploymentId === null || ID.test(value.deploymentId)) && (value.siteId === null || value.siteId === SITE) && ['production', 'deploy-preview', 'branch-deploy', 'other'].includes(value.context) && ['new', 'pending', 'uploading', 'preparing', 'prepared', 'uploaded', 'processing', 'ready', 'error', 'other'].includes(value.state) && typeof value.published === 'boolean' && (value.createdAt === null || boundedTime(value.createdAt)), 'invalid-candidate-checkpoint')
  }
  if (state.failure) {
    exactKeys(state.failure, ['phase', 'status', 'category'])
    need(phases.includes(state.failure.phase) && failureCodes.has(state.failure.category) && (state.failure.status === null || Number.isInteger(state.failure.status) && state.failure.status >= 100 && state.failure.status <= 599), 'invalid-failure-checkpoint')
  }
  if (requireComplete || state.complete) need(state.complete === true && state.phase === 'candidate-ready' && !state.failure && state.candidate?.deploymentId !== request.baselineDeploymentId && ID.test(state.candidate?.deploymentId ?? '') && state.candidate.siteId === SITE && state.candidate.context === 'production' && state.candidate.state === 'ready' && state.candidate.published === false && boundedTime(state.candidate.createdAt), 'incomplete-upload-checkpoint')
  return state
}

// The controller owns locking, restoring and unlocking. This operation can only
// create and fill one unpublished production-context deployment under that lock.
// All actual IDs are persisted before validation/upload, including unexpected IDs.
export async function uploadLockedCandidate(requestValue, adapters) {
  const request = validateLockedUploadRequest(requestValue)
  const state = { version: 1, siteId: request.siteId, baselineDeploymentId: request.baselineDeploymentId, title: request.title, phase: 'configuration', candidate: null, complete: false, events: [] }
  const checkpoint = async (phase, fields = {}) => {
    state.phase = phase
    Object.assign(state, fields)
    state.events.push({ phase, at: adapters.now() })
    await adapters.checkpoint(structuredClone(state))
  }
  const guard = async () => assertLockedBaseline(await adapters.site(), request)
  let candidateId
  try {
    await checkpoint('local-output')
    const prepared = await adapters.prepare(request)
    await checkpoint('baseline-lock')
    await guard()
    await checkpoint('create-requested')
    const returned = await adapters.create({ siteId: request.siteId, title: request.title, body: { draft: false } })
    await checkpoint('candidate-returned', { candidate: candidateView(returned) })
    assertUnpublishedCandidate(returned, request)
    candidateId = returned.id
    await checkpoint('candidate-guard')
    await guard()
    assertUnpublishedCandidate(await adapters.deploy(candidateId), request, candidateId)
    await checkpoint('blobs-upload')
    await adapters.blobs(candidateId, prepared)
    await guard()
    assertUnpublishedCandidate(await adapters.deploy(candidateId), request, candidateId)
    await checkpoint('package-upload')
    // The adapter's API facade additionally guards the finalize request and the
    // first byte upload. No restore/unlock/cancel operation is exposed to it.
    const ready = await adapters.upload(candidateId, prepared, guard)
    await guard()
    assertUnpublishedCandidate(ready, request, candidateId)
    need(ready.state === 'ready', 'candidate-not-ready')
    await checkpoint('candidate-ready', { candidate: candidateView(ready), complete: true })
    return { deploymentId: candidateId, createdAt: ready.created_at, context: 'production' }
  } catch (cause) {
    state.complete = false
    const status = Number.isInteger(cause?.status) && cause.status >= 100 && cause.status <= 599 ? cause.status : null
    state.failure = { phase: phases.includes(state.phase) ? state.phase : 'configuration', status, category: failureCodes.has(cause?.lockedUploadCode) ? cause.lockedUploadCode : 'package-or-network-failure' }
    await adapters.checkpoint(structuredClone(state))
    throw Object.assign(new Error('locked-upload-failed'), { lockedUploadFailure: state.failure, candidateId })
  }
}

async function regularBytes(file, limit) {
  const info = await lstat(file)
  need(info.isFile() && !info.isSymbolicLink() && info.size > 0 && info.size <= limit && samePath(await realpath(file), file), 'invalid-local-file')
  return readFile(file)
}

function within(root, file) {
  const rel = path.relative(path.resolve(root), path.resolve(file))
  need(rel && !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`), 'path-outside-checkout')
  return path.resolve(file)
}

export async function loadPinnedUploadTools(packageFile) {
  const pkg = JSON.parse(await readFile(packageFile, 'utf8'))
  need(pkg.name === 'netlify-cli' && pkg.version === '27.4.2', 'unexpected-cli-version')
  const root = path.dirname(packageFile)
  const require = createRequire(packageFile)
  const local = file => import(pathToFileURL(path.join(root, 'dist', file)).href)
  const [adapter, { deploySite }, { getInternalFunctionsDir, getFunctionsManifestPath }, { getFrameworksAPIPaths }, { normalizeFunctionsConfig }, { parseAllRedirects }, { parseAllHeaders }, { runCoreSteps }] = await Promise.all([
    loadPinnedAdapterTools(packageFile),
    local('utils/deploy/deploy-site.js'),
    local('utils/functions/functions.js'),
    local('utils/frameworks-api.js'),
    local('lib/functions/config.js'),
    import(pathToFileURL(require.resolve('@netlify/redirect-parser')).href),
    import(pathToFileURL(require.resolve('@netlify/headers-parser')).href),
    import(pathToFileURL(require.resolve('@netlify/build')).href),
  ])
  return { ...adapter, deploySite, getInternalFunctionsDir, getFunctionsManifestPath, getFrameworksAPIPaths, normalizeFunctionsConfig, parseAllRedirects, parseAllHeaders, runCoreSteps }
}

// Same filtering as CLI 27.4.2's getDeployFilesFilter for a publish directory
// distinct from the repository root. Routing files are folded into netlify.toml.
export function pinnedDeployFilter(publish) {
  return filename => {
    if (filename == null) return false
    if (filename === publish) return true
    const base = path.basename(filename)
    return !((base.startsWith('.') && base !== '.well-known') || base.startsWith('__MACOSX') || base.includes('/.') || base === '_redirects' || base === '_headers')
  }
}

export async function preparePinnedUpload(source, request, tools, { manifest, marker }) {
  need(path.isAbsolute(source) && samePath(source, await realpath(source)), 'invalid-source-directory')
  const app = path.join(source, APP)
  const target = path.join(app, 'netlify.toml')
  const generatedBytes = await regularBytes(path.join(app, '.netlify/netlify.toml'), 2_000_000)
  const targetBytes = await regularBytes(target, 2_000_000)
  need(sha(generatedBytes) === request.adapterConfiguration.generatedConfigSha256 && sha(targetBytes) === request.adapterConfiguration.configSha256 && tools.configVersion === request.adapterConfiguration.configVersion, 'adapter-config-changed')
  const generated = tools.parse(generatedBytes.toString('utf8'))
  const resolved = await tools.resolveConfig({ config: target, cwd: source, repositoryRoot: source, packagePath: APP, context: 'production', offline: true, mode: 'cli', buffer: true })
  need(assertAdapterConfigurationEquivalent(generated, resolved, source, target) === request.adapterConfiguration.semanticSha256, 'adapter-semantics-changed')
  need(canonicalDigest(await verifyAdapterStaticOutput(source, manifest, marker)) === canonicalDigest(request.staticOutput), 'static-output-changed')
  const publish = path.join(app, '.netlify/static')
  const config = structuredClone(resolved.config)
  const [redirects, headers] = await Promise.all([
    tools.parseAllRedirects({ configRedirects: config.redirects, redirectsFiles: [path.join(publish, '_redirects')], minimal: true }),
    tools.parseAllHeaders({ configHeaders: config.headers, headersFiles: [path.join(publish, '_headers')], minimal: true }),
  ])
  need(!redirects.errors?.length && !headers.errors?.length, 'routing-parse-failed')
  config.redirects = redirects.redirects
  config.headers = headers.headers
  const internal = await tools.getInternalFunctionsDir({ base: source, packagePath: APP, ensureExists: true })
  const frameworks = tools.getFrameworksAPIPaths(source, APP)
  await frameworks.functions.ensureExists()
  const functionsDirectory = config.functionsDirectory
  need(typeof functionsDirectory === 'string', 'functions-directory-missing')
  const functions = within(source, path.resolve(source, functionsDirectory))
  need((await lstat(functions)).isDirectory(), 'functions-directory-missing')
  const manifestPath = await tools.getFunctionsManifestPath({ base: source, packagePath: APP })
  need(manifestPath, 'production-functions-cache-missing')
  const cacheBytes = await regularBytes(manifestPath, 2_000_000)
  const cache = JSON.parse(cacheBytes.toString('utf8'))
  need(Number.isFinite(cache.timestamp) && Array.isArray(cache.functions) && cache.functions.length > 0 && cache.functions.length <= 100, 'production-functions-cache-invalid')
  for (const fn of cache.functions) {
    need(typeof fn.name === 'string' && /^[a-zA-Z0-9_-]+$/.test(fn.name) && typeof fn.path === 'string' && fn.runtime === 'js' && (fn.runtimeVersion === undefined || /^nodejs(?:18|20|22|24)\.x$/.test(fn.runtimeVersion)), 'production-function-runtime-invalid')
    await regularBytes(within(source, fn.path), 128 * 1024 * 1024)
  }
  // deploySite silently treats a missing/unreadable edge manifest as no edges.
  // This fixed source has middleware, so require the actual compiled bundles.
  const edgeDirectory = path.join(app, '.netlify/edge-functions-dist')
  const edgeBytes = await regularBytes(path.join(edgeDirectory, 'manifest.json'), 2_000_000)
  const edges = JSON.parse(edgeBytes.toString('utf8'))
  need(Array.isArray(edges.bundles) && edges.bundles.length > 0 && edges.bundles.length <= 100, 'compiled-edge-bundles-missing')
  for (const bundle of edges.bundles) {
    need(typeof bundle.asset === 'string' && typeof bundle.format === 'string' && /^[a-zA-Z0-9_-]{1,40}$/.test(bundle.format), 'compiled-edge-bundle-invalid')
    await regularBytes(within(edgeDirectory, path.resolve(edgeDirectory, bundle.asset)), 128 * 1024 * 1024)
  }
  // pnpm's node_modules/next is normally a link; resolve its package normally,
  // then check the actual immutable package file instead of rejecting that link.
  const nextFile = createRequire(path.join(app, 'package.json')).resolve('next/package.json')
  const next = JSON.parse(await regularBytes(within(source, nextFile), 1_000_000))
  need(next.name === 'next' && /^\d+\.\d+\.\d+/.test(next.version), 'next-framework-version')
  const command = {
    workspacePackage: APP,
    project: { frameworks: new Map([[APP, [{ id: 'next', detected: { package: { version: next.version } } }]]]) },
    getPathInProject: (...parts) => path.join(APP, '.netlify', ...parts),
  }
  const functionsConfig = tools.normalizeFunctionsConfig({ functionsConfig: config.functions, projectRoot: source, siteEnv: {} })
  return { source, app, publish, config, resolved, command, fnDir: [internal, frameworks.functions.path, functions], functionsConfig, manifestPath, cacheHash: sha(cacheBytes), timestamp: cache.timestamp }
}

async function ensureProductionCache(prepared) {
  need(sha(await regularBytes(prepared.manifestPath, 2_000_000)) === prepared.cacheHash, 'production-functions-cache-changed')
  // Pinned deploySite consumes the build cache only for 120s. Do not silently
  // fall back to a different runtime/configuration or rewrite its timestamp.
  need(Date.now() >= prepared.timestamp && Date.now() - prepared.timestamp <= 110_000, 'production-functions-cache-expired')
}

async function apiRequest(token, pathname, { method = 'GET', body, retryCount } = {}) {
  need(pathname.startsWith('/') && !pathname.includes('..'), 'invalid-api-path')
  const data = typeof body === 'function' ? body() : body
  const binary = data && (Buffer.isBuffer(data) || typeof data.pipe === 'function' || typeof data === 'string')
  const response = await fetch(`https://api.netlify.com/api/v1${pathname}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': binary ? 'application/octet-stream' : 'application/json', ...(retryCount === undefined ? {} : { 'X-Nf-Retry-Count': String(retryCount) }) },
    body: data === undefined ? undefined : binary ? data : JSON.stringify(data),
    ...(data && typeof data.pipe === 'function' ? { duplex: 'half' } : {}),
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw Object.assign(new Error('provider-http'), { status: response.status, lockedUploadCode: 'provider-http' })
  }
  const parts = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    need(size <= 2_000_000, 'provider-response-too-large')
    parts.push(chunk)
  }
  return size ? JSON.parse(Buffer.concat(parts).toString('utf8')) : {}
}

export function nativeUploadApi({ token, request, candidateId, guard, requestImpl = apiRequest }) {
  let uploadGuard
  const boundId = params => need(params.deployId === candidateId || params.deploy_id === candidateId, 'foreign-deploy-request')
  const retryCount = params => {
    need(params.xNfRetryCount === undefined || Number.isInteger(params.xNfRetryCount) && params.xNfRetryCount >= 0 && params.xNfRetryCount <= 5, 'invalid-retry-count')
    return params.xNfRetryCount
  }
  const beforeBytes = async () => {
    uploadGuard ??= guard()
    await uploadGuard
  }
  return {
    async updateSiteDeploy(params) {
      boundId(params)
      need(params.siteId === request.siteId && params.body?.draft === false && !('environment' in params.body) && !params.body.branch, 'unexpected-finalize-request')
      await guard()
      const deploy = await requestImpl(token, `/sites/${request.siteId}/deploys/${candidateId}`, { method: 'PUT', body: params.body })
      assertUnpublishedCandidate(deploy, request, candidateId)
      return deploy
    },
    async getSiteDeploy(params) {
      boundId(params)
      need(params.siteId === request.siteId, 'foreign-site-request')
      const deploy = await requestImpl(token, `/sites/${request.siteId}/deploys/${candidateId}`)
      assertUnpublishedCandidate(deploy, request, candidateId)
      return deploy
    },
    async uploadDeployFile(params) {
      boundId(params)
      need(typeof params.path === 'string' && !params.path.includes('..') && !params.path.includes('?') && !params.path.includes('#'), 'invalid-upload-path')
      await beforeBytes()
      return requestImpl(token, `/deploys/${candidateId}/files/${params.path.replace(/^\//, '')}`, { method: 'PUT', body: params.body })
    },
    async uploadDeployFunction(params) {
      boundId(params)
      need(/^[a-zA-Z0-9_%-]+$/.test(params.name) && /^[a-zA-Z0-9._-]+$/.test(params.runtime), 'invalid-function-upload')
      await beforeBytes()
      const query = new URLSearchParams({ runtime: params.runtime })
      if (params.invocationMode) { need(['buffered', 'stream', 'background'].includes(params.invocationMode), 'invalid-function-mode'); query.set('invocation_mode', params.invocationMode) }
      if (params.timeout) { need(Number.isInteger(params.timeout) && params.timeout > 0 && params.timeout <= 900, 'invalid-function-timeout'); query.set('timeout', String(params.timeout)) }
      return requestImpl(token, `/deploys/${candidateId}/functions/${params.name}?${query}`, { method: 'PUT', body: params.body, retryCount: retryCount(params) })
    },
    async uploadDeployEdgeFunction(params) {
      boundId(params)
      need(HASH.test(params.codeSha), 'invalid-edge-upload')
      await beforeBytes()
      return requestImpl(token, `/deploys/${candidateId}/edge_functions/${params.codeSha}`, { method: 'PUT', body: params.body, retryCount: retryCount(params) })
    },
  }
}

export async function runPinnedLockedUpload(source, request, checkpoint, tools, token, evidence) {
  const requestImpl = (pathname, opts) => apiRequest(token, pathname, opts)
  return uploadLockedCandidate(request, {
    now: () => new Date().toISOString(), checkpoint,
    site: () => requestImpl(`/sites/${request.siteId}`),
    create: params => requestImpl(`/sites/${request.siteId}/deploys?title=${encodeURIComponent(params.title)}`, { method: 'POST', body: params.body }),
    deploy: id => requestImpl(`/deploys/${id}`),
    prepare: async () => {
      const prepared = await preparePinnedUpload(source, request, tools, evidence)
      await ensureProductionCache(prepared)
      return prepared
    },
    blobs: async (deployId, prepared) => {
      const siteInfo = await requestImpl(`/sites/${request.siteId}`)
      assertLockedBaseline(siteInfo, request)
      const result = await tools.runCoreSteps(['blobs_upload'], { cachedConfig: { ...prepared.resolved, siteInfo }, packagePath: APP, deployId, siteId: request.siteId, token, quiet: true, buffer: true, context: 'production', offline: true, mode: 'cli', telemetry: false, sendStatus: false })
      need(result.success === true, 'deploy-blobs-upload-failed')
    },
    upload: async (deployId, prepared, guard) => {
      await ensureProductionCache(prepared)
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'demo-locked-packaging-'))
      need(path.dirname(path.resolve(tmpDir)) === path.resolve(os.tmpdir()) && path.basename(tmpDir).startsWith('demo-locked-packaging-'), 'invalid-package-temp')
      const result = await tools.deploySite(prepared.command, nativeUploadApi({ token, request, candidateId: deployId, guard }), request.siteId, prepared.publish, {
        config: prepared.config, fnDir: prepared.fnDir, functionsConfig: prepared.functionsConfig,
        deployId, draft: false, workingDir: prepared.app, siteRoot: source, manifestPath: prepared.manifestPath,
        filter: pinnedDeployFilter(prepared.publish), tmpDir, statusCb: () => {},
        deployTimeout: 15 * 60_000, syncFileLimit: 100,
      })
      need(result.deployId === deployId, 'packager-returned-foreign-deploy')
      return result.deploy
    },
  })
}

async function entry() {
  need(process.argv.length === 5, 'invalid-helper-arguments')
  const [source, requestFile, checkpointFile] = process.argv.slice(2)
  need([source, requestFile, checkpointFile].every(path.isAbsolute) && process.env.RUNNER_TEMP && process.env.NETLIFY_AUTH_TOKEN && !process.env.GITHUB_TOKEN && !process.env.INTERNAL_ADMIN_TOKEN && !process.env.SUPABASE_SERVICE_ROLE_KEY, 'invalid-helper-environment')
  const target = within(process.env.RUNNER_TEMP, checkpointFile)
  within(process.env.RUNNER_TEMP, requestFile)
  need(path.dirname(target) === path.dirname(requestFile) && !target.endsWith('.tmp'), 'invalid-checkpoint-path')
  try { await lstat(target); need(false, 'checkpoint-already-exists') } catch (error) { if (error.code !== 'ENOENT') throw error }
  const request = validateLockedUploadRequest(JSON.parse((await regularBytes(requestFile, 64_000)).toString('utf8')))
  const manifestBytes = await regularBytes(fileURLToPath(new URL('./demo-maintenance-release.json', import.meta.url)), 64_000)
  const manifest = validateManifest(JSON.parse(manifestBytes.toString('utf8')))
  const marker = JSON.parse((await regularBytes(path.join(source, APP, 'public/__dailyclarity_release.json'), 64_000)).toString('utf8'))
  need(canonicalDigest(marker) === canonicalDigest(markerFor(manifest, marker.controllerSha, sha(manifestBytes), marker.producer)), 'invalid-source-marker')
  const [sourceSha, runId, attempt] = /^Demo ([a-f0-9]{40}) ([1-9][0-9]*)\/([1-9][0-9]*)$/.exec(request.title).slice(1)
  need(/^[a-f0-9]{40}$/.test(marker.controllerSha ?? '') && marker.releaseSha === sourceSha && marker.producer?.runId === runId && marker.producer?.runAttempt === attempt, 'title-marker-mismatch')
  await mkdir(path.dirname(target), { recursive: true })
  const checkpoint = async state => {
    const temp = `${target}.tmp`
    within(process.env.RUNNER_TEMP, temp)
    await writeFile(temp, `${JSON.stringify(state)}\n`)
    await rename(temp, target)
  }
  const tools = await loadPinnedUploadTools(await findPinnedNetlifyPackage())
  const result = await runPinnedLockedUpload(source, request, checkpoint, tools, process.env.NETLIFY_AUTH_TOKEN, { manifest, marker })
  process.stdout.write(`${JSON.stringify(result)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  entry().catch(error => {
    // Captured child stdout/stderr is diagnostic only. Never dump package errors,
    // request options, provider responses, logs, environment values or tokens.
    process.stderr.write(`${JSON.stringify({ version: 1, phase: error.lockedUploadFailure?.phase || 'configuration', status: error.lockedUploadFailure?.status || null })}\n`)
    process.exitCode = 1
  })
}
