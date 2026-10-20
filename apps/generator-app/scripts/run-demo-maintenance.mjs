#!/usr/bin/env node
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertNetlifyTarget, assertNetlifyRuntimeEnvironment } from './netlify-target-contract.mjs'
import { assertReleaseCi } from './verify-release-ci.mjs'
import { CERTIFIED_STORE } from '../src/lib/templates/certified-catalog-contract.mjs'
import { classifyDemoUploadFailure } from './demo-maintenance-diagnostics.mjs'
import { validateAdapterConfigurationProof, adapterFailurePhase } from './demo-maintenance-adapter-config.mjs'
import { verifyAdapterStaticOutput } from './demo-maintenance-static-output.mjs'
import { validateManifest, verifySource, verifyControllerCompatibility, validateCatalogue, validateRuntime, markerFor, validateBaseline, assertUnchanged, validateRecord, candidateTitle, parseArtifactSource, validateArtifactMetadata, validateQa, cleanBuildEnvironment, canonicalDigest, digest, MARKER } from './demo-maintenance-contract.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const controllerRoot = path.resolve(scriptDir, '../../..')
const required = (ok, message) => { if (!ok) throw new Error(message) }
const save = async (file, value) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`) }
const confirms = { prepare: 'PREPARE DEMO DRAFT', 'verify-draft': 'VERIFY DEMO DRAFT', promote: 'PROMOTE DEMO DRAFT', rollback: 'ROLLBACK DEMO' }

export function demoDraftArguments(siteId, title, source) {
  // CLI 27.4.2 rejects --context together with --no-build. Configuration still
  // resolves with CONTEXT=production from cleanBuildEnvironment; the separate
  // credential-free adapter build retains its explicit --context production.
  // Next's onEnd restores raw .next after the offline build. Its complete CDN
  // output remains in .netlify/static; never upload the restored server output.
  required(typeof source === 'string' && path.isAbsolute(source), 'Fixed source checkout is required for draft upload')
  return ['--package=netlify-cli@27.4.2', 'dlx', 'netlify', 'deploy', '--no-build', '--filter', '@platform-builder/generator-app', '--dir', path.join(source, 'apps/generator-app/.netlify/static'), '--site', siteId, '--message', title, '--json']
}

export function demoAdapterConfigurationArguments(source) {
  return ['--package=netlify-cli@27.4.2', 'dlx', 'node', path.join(scriptDir, 'demo-maintenance-adapter-config.mjs'), source]
}

// Orchestration has no provider globals. Tests inject adapters and assert both
// absence of writes on failed gates and binding after ambiguous write failures.
export async function executeMaintenance(ctx, a) {
  const { operation, manifest, manifestHash, controllerSha, producer } = ctx
  required(confirms[operation] === ctx.confirmation, 'Explicit maintenance operation confirmation is required')
  const preflight = { version: 1, operation, producer, controllerSha, manifestHash, phase: 'controller-gate', providerWriteAttempted: false }
  await a.writeState(preflight)
  await a.controllerGate()
  if (operation === 'prepare') {
    preflight.phase = 'source-gate'; await a.writeState(preflight)
    await a.sourceGate()
    preflight.phase = 'baseline-read'; await a.writeState(preflight)
    const baseline = await a.snapshot(manifest.baselineSha)
    validateBaseline(baseline, manifest)
    preflight.phase = 'baseline-auth'; await a.writeState(preflight)
    const auth = await a.auth()
    const state = { version: 1, operation, producer, controllerSha, manifestHash, phase: 'baseline-captured', baseline, baselineAuth: auth, providerWriteAttempted: false }
    await a.writeState(state)
    const marker = markerFor(manifest, controllerSha, manifestHash, producer)
    state.phase = 'build-requested'; await a.writeState(state)
    state.build = await a.build(marker)
    state.phase = 'build-completed'; await a.writeState(state)
    await a.controllerGate()
    assertUnchanged(await a.snapshot(manifest.baselineSha), baseline)
    state.phase = 'draft-requested'; state.providerWriteAttempted = true
    await a.writeState(state)
    let candidate
    try {
      candidate = await a.draft(candidateTitle(manifest, producer), async observed => {
        state.returnedCandidate = observed
        await a.writeState(state)
      })
    } finally {
      // Always retain actual provider readback even when upload/CLI fails. This
      // record never calls a partially observed deployment prepared or healthy.
      try {
        state.observation = await a.observe(candidateTitle(manifest, producer))
        state.phase = 'draft-observed'
      } catch {
        state.phase = 'draft-observation-unavailable'
        state.observationUnavailable = true
      }
      await a.writeState(state)
    }
    required(candidate && state.observation?.publishedDeploymentId === baseline.deploymentId, 'Draft preparation unexpectedly changed publication or returned no deployment')
    const record = { version: 1, kind: 'dailyclarity-demo-maintenance', controllerSha, producer, manifestHash, sourceSha: manifest.sourceSha, sourceTreeSha: manifest.sourceTreeSha, baseline, candidate, preparedAt: a.now() }
    validateRecord(record, ctx)
    await a.candidate(record)
    assertUnchanged(await a.snapshot(manifest.baselineSha), baseline)
    await a.writeRecord(record)
    state.phase = 'prepared'; state.recordHash = canonicalDigest(record)
    await a.writeState(state)
    return record
  }
  preflight.phase = 'record-provenance'; await a.writeState(preflight)
  const record = await a.loadRecord()
  await a.recordControllerGate(record.controllerSha)
  validateRecord(record, { ...ctx, controllerSha: record.controllerSha })
  await a.writeRecord(record) // Preserve exact immutable source before any action.
  const state = { version: 1, operation, producer, controllerSha, manifestHash, phase: 'record-verified', recordHash: canonicalDigest(record), baseline: record.baseline, providerWriteAttempted: false }
  await a.writeState(state)
  if (operation === 'verify-draft') {
    assertUnchanged(await a.snapshot(manifest.baselineSha), record.baseline)
    await a.candidate(record)
    const report = await a.media(record.candidate.origin, record)
    const qa = { version: 1, kind: 'dailyclarity-demo-maintenance-qa', controllerSha, producer, manifestHash, recordHash: canonicalDigest(record), sourceSha: manifest.sourceSha, deploymentId: record.candidate.deploymentId, report }
    await a.validateQa(qa, record)
    assertUnchanged(await a.snapshot(manifest.baselineSha), record.baseline)
    await a.writeQa(qa)
    state.phase = 'draft-verified'; state.qaHash = canonicalDigest(qa)
    await a.writeState(state)
    return qa
  }
  required(['promote', 'rollback'].includes(operation), 'Unsupported maintenance operation')
  if (operation === 'promote') {
    const qa = await a.loadQa()
    await a.validateQa(qa, record)
    await a.candidate(record)
    assertUnchanged(await a.snapshot(manifest.baselineSha), record.baseline)
    state.baselineAuth = await a.auth()
  } else {
    // Rollback must work even if the candidate runtime is unhealthy. Read the
    // provider/catalogue/config identity without requiring candidate readiness.
    const current = await a.snapshot(null)
    required([record.baseline.deploymentId, record.candidate.deploymentId].includes(current.deploymentId), 'Rollback would replace an unrelated deployment')
    assertUnchanged(current, record.baseline, { deploymentId: current.deploymentId, appSha: current.appSha })
    await a.baselineDeployment(record)
  }
  await a.controllerGate()
  const last = await a.snapshot(operation === 'promote' ? manifest.baselineSha : null)
  if (operation === 'promote') assertUnchanged(last, record.baseline)
  else {
    required([record.baseline.deploymentId, record.candidate.deploymentId].includes(last.deploymentId), 'Production changed before rollback')
    assertUnchanged(last, record.baseline, { deploymentId: last.deploymentId, appSha: last.appSha })
  }
  const target = operation === 'promote' ? record.candidate.deploymentId : record.baseline.deploymentId
  state.phase = 'restore-requested'; state.targetDeploymentId = target; state.providerWriteAttempted = true
  await a.writeState(state)
  try { await a.restore(target) } finally {
    try {
      state.observation = await a.observe(record.candidate.title)
      state.phase = 'restore-observed'
    } catch {
      state.phase = 'restore-observation-unavailable'
      state.observationUnavailable = true
    }
    await a.writeState(state)
  }
  required(state.observation?.publishedDeploymentId === target, 'Selected immutable deployment is not published; retain the actual transition record')
  const appSha = operation === 'promote' ? manifest.sourceSha : manifest.baselineSha
  const finalSnapshot = await a.snapshot(appSha)
  assertUnchanged(finalSnapshot, record.baseline, { deploymentId: target, appSha })
  state.finalRuntime = finalSnapshot.runtime
  state.finalDeploymentId = finalSnapshot.deploymentId
  state.finalMarkerHash = finalSnapshot.markerHash
  await a.writeState(state)
  if (operation === 'promote') {
    state.finalMedia = await a.media(`https://${record.baseline.hostname}`, record)
    await a.writeState(state)
  }
  state.finalAuth = await a.auth()
  await a.writeState(state)
  await a.publishedMarker(record, operation)
  state.phase = operation === 'promote' ? 'promoted' : 'rolled-back'
  state.verifiedAt = a.now()
  await a.writeState(state)
  return state
}

export async function createAdapters(ctx, env, fetchImpl = fetch) {
  let buildConfigHash
  let staticOutputProof
  let lastState
  const ghRoot = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}`
  const boundedBytes = async (response, max) => {
    required(Number(response.headers.get('content-length') || 0) <= max, 'Response exceeds size bound')
    const chunks = []; let size = 0
    for await (const chunk of response.body) {
      size += chunk.length
      required(size <= max, 'Response exceeds size bound')
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }
  const request = async (url, token, { method = 'GET', max = 2_000_000 } = {}) => {
    const response = await fetchImpl(url, { method, headers: token ? { authorization: `Bearer ${token}`, accept: 'application/json' } : {}, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30_000) })
    if (!response.ok) {
      const error = new Error('Protected provider request failed')
      error.maintenanceFailure = { category: 'provider-http', service: new URL(url).hostname === 'api.github.com' ? 'github' : new URL(url).hostname === 'api.netlify.com' ? 'netlify' : 'runtime', status: response.status }
      throw error
    }
    const bytes = await boundedBytes(response, max)
    return JSON.parse(bytes.toString('utf8'))
  }
  const gh = route => request(`${ghRoot}/${route}`, env.GITHUB_TOKEN)
  const api = (route, options) => request(`https://api.netlify.com/api/v1/${route}`, env.NETLIFY_AUTH_TOKEN, options)
  const site = async () => {
    const s = await api(`sites/${encodeURIComponent(env.NETLIFY_SITE_ID)}`)
    assertNetlifyTarget(s, { environment: 'production', configuredSiteId: env.NETLIFY_SITE_ID, expectedSiteId: env.NETLIFY_EXPECTED_SITE_ID, expectedHostname: env.NETLIFY_EXPECTED_SITE_HOSTNAME, expectedAccountSlug: env.NETLIFY_EXPECTED_ACCOUNT_SLUG })
    required(s.build_settings?.stop_builds === true && s.published_deploy?.state === 'ready', 'Production Git builds must be stopped and published deployment ready')
    return s
  }
  const runtime = async (origin, appSha, catalogue) => validateRuntime(await request(`${origin}/api/integrations/status`, env.INTERNAL_ADMIN_TOKEN), { siteId: env.NETLIFY_SITE_ID, projectRef: env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF, appSha, catalogue })
  const production = `https://${env.NETLIFY_EXPECTED_SITE_HOSTNAME}`
  const output = env.RECORD_OUTPUT
  required(output && path.basename(output) === 'record.json' && path.resolve(output).startsWith(`${path.resolve(env.RUNNER_TEMP) }${path.sep}`), 'Record output must be in the runner evidence directory')
  const readArtifact = async (sourceJson, kind) => {
    const source = parseArtifactSource(sourceJson, kind)
    const [run, artifact, jobs] = await Promise.all([gh(`actions/runs/${source.runId}/attempts/${source.runAttempt}`), gh(`actions/artifacts/${source.artifactId}`), gh(`actions/runs/${source.runId}/attempts/${source.runAttempt}/jobs?per_page=100`)])
    verifyControllerCompatibility(controllerRoot, run.head_sha, ctx.controllerSha)
    validateArtifactMetadata({ run, artifact, source, kind, controllerSha: run.head_sha, repository: env.GITHUB_REPOSITORY })
    required(jobs.total_count === 1 && jobs.jobs?.[0]?.conclusion === 'success' && jobs.jobs[0].status === 'completed', 'Artifact producer job did not complete successfully')
    // GitHub redirects archive downloads to a signed URL. Do not forward the
    // GitHub credential across that boundary or retain the private signed URL.
    const redirect = await fetchImpl(`${ghRoot}/actions/artifacts/${source.artifactId}/zip`, { headers: { authorization: `Bearer ${env.GITHUB_TOKEN}` }, redirect: 'manual', signal: AbortSignal.timeout(20_000) })
    required(redirect.status === 302, 'Artifact archive did not provide an authenticated redirect')
    const location = new URL(redirect.headers.get('location'))
    required(location.protocol === 'https:' && !location.username && !location.password, 'Artifact archive redirect is invalid')
    const download = await fetchImpl(location, { redirect: 'error', signal: AbortSignal.timeout(30_000) })
    required(download.ok, 'Artifact archive unavailable')
    const bytes = await boundedBytes(download, 2_000_000)
    required(bytes.length === artifact.size_in_bytes && digest(bytes) === source.artifactDigest, 'Artifact archive digest differs from immutable metadata')
    const temp = await mkdtemp(path.join(env.RUNNER_TEMP, 'demo-artifact-'))
    try {
      const zip = path.join(temp, 'evidence.zip')
      await writeFile(zip, bytes)
      const python = `import json,sys,zipfile,stat\nwith zipfile.ZipFile(sys.argv[1]) as z:\n names=z.namelist()\n allowed={'record.json','baseline.json'} if sys.argv[2]=='record' else {'qa.json'}\n assert len(names)==len(set(names)) and set(names).issubset(allowed) and sys.argv[2]+'.json' in names\n assert sum(i.file_size for i in z.infolist())<2000000\n assert all(not i.is_dir() and not stat.S_ISLNK(i.external_attr>>16) and i.file_size<2000000 for i in z.infolist())\n data=z.read(sys.argv[2]+'.json')\n print(json.dumps(json.loads(data)))\n`
      const value = JSON.parse(execFileSync('python3', ['-c', python, zip, kind], { encoding: 'utf8', maxBuffer: 2_000_000, stdio: ['ignore', 'pipe', 'pipe'] }))
      required(canonicalDigest(value) === source[kind === 'record' ? 'recordHash' : 'qaHash'] && value.controllerSha === run.head_sha && value.producer?.runId === source.runId && value.producer?.runAttempt === source.runAttempt, 'Artifact canonical value/producer differs')
      const observed = kind === 'record' ? value.preparedAt : value.report?.checkedAt
      required(Date.parse(observed) >= Date.parse(jobs.jobs[0].started_at) && Date.parse(observed) <= Date.parse(jobs.jobs[0].completed_at), 'Evidence timestamp is outside actual producer job')
      return value
    } finally { await rm(temp, { recursive: true, force: true }) }
  }
  const marker = origin => request(`${origin}/${MARKER}`, null)
  const readMedia = async (origin, manifest) => {
    for (const file of manifest.files.filter(f => f.path.startsWith('apps/generator-app/public/'))) {
      const route = file.path.replace('apps/generator-app/public', '')
      const res = await fetchImpl(`${origin}${route}`, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60_000) })
      required(res.status === 200, 'Candidate media is unavailable')
      const bytes = await boundedBytes(res, file.bytes)
      required(bytes.length === file.bytes && digest(bytes) === file.sha256, 'Candidate media bytes differ')
    }
  }
  const readyDeploy = async id => {
    const d = await api(`deploys/${encodeURIComponent(id)}`)
    required(d.id === id && d.site_id === env.NETLIFY_SITE_ID && d.state === 'ready', 'Deployment is not a ready member of the exact production site')
    return d
  }
  const a = {
    now: () => new Date().toISOString(),
    async controllerGate() {
      required(env.GITHUB_REPOSITORY === 'russlle2/platform-builder' && env.GITHUB_REF === 'refs/heads/main' && env.DAILYCLARITY_ENVIRONMENT === 'production' && env.GITHUB_TOKEN && env.NETLIFY_AUTH_TOKEN && env.INTERNAL_ADMIN_TOKEN, 'Protected maintenance credentials/controller are incomplete')
      required(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: controllerRoot, encoding: 'utf8' }).trim() === ctx.controllerSha, 'Controller checkout changed')
      const [head, ci] = await Promise.all([gh('git/ref/heads/main'), gh(`actions/workflows/ci.yml/runs?head_sha=${ctx.controllerSha}&status=success&per_page=100`)])
      required(head.object?.sha === ctx.controllerSha, 'Controller is no longer current main')
      assertReleaseCi(ci.workflow_runs, ctx.controllerSha, env.GITHUB_REPOSITORY)
    },
    sourceGate: () => verifySource(env.SOURCE_CHECKOUT, ctx.manifest),
    recordControllerGate: sha => verifyControllerCompatibility(controllerRoot, sha, ctx.controllerSha),
    async snapshot(appSha) {
      const s = await site()
      const vars = await api(`accounts/${encodeURIComponent(s.account_slug)}/env?site_id=${encodeURIComponent(s.id)}`, { max: 1_000_000 })
      assertNetlifyRuntimeEnvironment(vars, { context: 'production', expectedSupabaseUrl: env.NETLIFY_EXPECTED_SUPABASE_URL, expectedSupabaseProjectRef: env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF, expectedDeploymentEnvironment: 'production', expectedCatalogProfile: 'rehab-certified', expectedSiteId: s.id })
      const { getStore } = await import('@netlify/blobs')
      const store = getStore({ name: CERTIFIED_STORE, consistency: 'strong', siteID: s.id, token: env.NETLIFY_AUTH_TOKEN })
      const pointer = await store.get('_active.json', { type: 'json' })
      // Validate namespace before using the key in another read.
      const { validateCertifiedPointer } = await import('../src/lib/templates/certified-catalog-contract.mjs')
      validateCertifiedPointer(pointer)
      const certificate = await store.get(pointer.certificationKey, { type: 'json' })
      const catalogue = validateCatalogue(pointer, certificate, ctx.manifest)
      const currentMarker = appSha ? await marker(production) : null
      const currentApp = appSha
      if (appSha) required(currentMarker.releaseSha === currentApp && currentMarker.certificationHash === catalogue.certificationHash, 'Published marker identity differs')
      const proof = appSha ? await runtime(production, appSha, catalogue) : null
      const normalizedVars = vars.map(v => ({ key: v.key, secret: v.is_secret === true, scopes: [...(v.scopes || [])].sort(), values: (v.values || []).map(x => ({ context: x.context, value: x.value, context_parameter: x.context_parameter ?? null })).sort((x, y) => canonicalDigest(x).localeCompare(canonicalDigest(y))) })).sort((x, y) => x.key.localeCompare(y.key))
      const result = { siteId: s.id, hostname: env.NETLIFY_EXPECTED_SITE_HOSTNAME, deploymentId: s.published_deploy.id, appSha: currentApp, accountHash: canonicalDigest({ id: s.account_id, slug: s.account_slug }), settingsHash: canonicalDigest({ build: s.build_settings, processing: s.processing_settings, functions: s.functions_config, domains: [s.custom_domain, ...(s.domain_aliases || [])].sort(), forceSsl: s.force_ssl }), environmentHash: canonicalDigest(normalizedVars), projectRefHash: digest(env.NETLIFY_EXPECTED_SUPABASE_PROJECT_REF), catalogue, markerHash: currentMarker ? canonicalDigest(currentMarker) : null, runtime: proof, capturedAt: a.now() }
      required((await site()).published_deploy.id === s.published_deploy.id, 'Published deployment changed during baseline capture')
      return result
    },
    async auth() {
      const { verifyAuthEntrypoint } = await import('./verify-auth-entrypoint.mjs')
      const result = await verifyAuthEntrypoint(production)
      return { checkedAt: a.now(), dashboardRedirect: result.dashboardRedirect === true, callbackRedirect: result.callbackRedirect === true, invalidCallbackRedirect: result.invalidCallbackRedirect === true, signInPage: result.signInPage === true, signInForm: result.signInForm === true, blockedMutationRequests: result.blockedMutationRequests, emailRequested: result.emailSent === true }
    },
    async build(proof) {
      await writeFile(path.join(env.SOURCE_CHECKOUT, 'apps/generator-app/public', MARKER), `${JSON.stringify(proof)}\n`, { flag: 'wx' })
      const clean = cleanBuildEnvironment(env, ctx.manifest)
      try {
        execFileSync('pnpm', ['--package=netlify-cli@27.4.2', 'dlx', 'netlify', 'build', '--offline', '--context', 'production', '--filter', '@platform-builder/generator-app'], { cwd: env.SOURCE_CHECKOUT, env: clean, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 12_000_000, timeout: 30 * 60_000 })
      } catch (cause) {
        const error = new Error('Credential-free production adapter build failed; no draft was requested')
        error.maintenanceFailure = { category: 'adapter-build', exitCode: Number.isSafeInteger(cause.status) ? cause.status : null }
        throw error
      }
      let adapterConfiguration
      try {
        const raw = execFileSync('pnpm', demoAdapterConfigurationArguments(env.SOURCE_CHECKOUT), { cwd: env.SOURCE_CHECKOUT, env: clean, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 128_000, timeout: 5 * 60_000 })
        adapterConfiguration = validateAdapterConfigurationProof(JSON.parse(raw.toString('utf8')))
      } catch (cause) {
        const error = new Error('Adapter configuration normalization or offline equivalence failed; no draft was requested')
        error.maintenanceFailure = { category: 'adapter-config', phase: adapterFailurePhase(cause), exitCode: Number.isSafeInteger(cause.status) ? cause.status : null }
        throw error
      }
      buildConfigHash = adapterConfiguration.configSha256
      try {
        staticOutputProof = await verifyAdapterStaticOutput(env.SOURCE_CHECKOUT, ctx.manifest, proof)
      } catch {
        const error = new Error('Adapter static output verification failed; no draft was requested')
        error.maintenanceFailure = { category: 'static-output', phase: 'post-build' }
        throw error
      }
      return { configSha256: buildConfigHash, sourceSha: ctx.manifest.sourceSha, netlifyCli: '27.4.2', productionContext: true, adminCredentialsInherited: false, adapterConfiguration, staticOutput: staticOutputProof }
    },
    async draft(title, onReturned) {
      required(buildConfigHash && digest(await readFile(path.join(env.SOURCE_CHECKOUT, 'apps/generator-app/netlify.toml'))) === buildConfigHash, 'Generated adapter configuration changed before upload')
      try {
        const current = await verifyAdapterStaticOutput(env.SOURCE_CHECKOUT, ctx.manifest, markerFor(ctx.manifest, ctx.controllerSha, ctx.manifestHash, ctx.producer))
        required(staticOutputProof && canonicalDigest(current) === canonicalDigest(staticOutputProof), 'Adapter static output changed before upload')
      } catch {
        const error = new Error('Adapter static output changed or failed validation before upload')
        error.maintenanceFailure = { category: 'static-output', phase: 'pre-upload' }
        throw error
      }
      const upload = { ...cleanBuildEnvironment(env, ctx.manifest), NETLIFY_AUTH_TOKEN: env.NETLIFY_AUTH_TOKEN }
      let raw
      try {
        raw = execFileSync('pnpm', demoDraftArguments(env.NETLIFY_SITE_ID, title, env.SOURCE_CHECKOUT), { cwd: env.SOURCE_CHECKOUT, env: upload, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 12_000_000, timeout: 30 * 60_000 })
      } catch (cause) {
        const error = new Error('Draft upload did not complete; inspect the retained sanitized provider observation before further action')
        error.maintenanceFailure = { category: 'draft-upload', exitCode: Number.isSafeInteger(cause.status) ? cause.status : null, diagnostics: classifyDemoUploadFailure(cause) }
        throw error
      }
      let parsed
      try { parsed = JSON.parse(raw.toString()) } catch { throw new Error('Draft CLI response could not be safely parsed') }
      required(/^[a-zA-Z0-9_-]+$/.test(parsed.deploy_id ?? ''), 'Draft did not return a deployment identity')
      await onReturned({ deploymentId: parsed.deploy_id, observedAt: a.now(), source: 'cli-returned-unverified' })
      const d = await readyDeploy(parsed.deploy_id)
      required(d.title === title, 'Draft does not carry this exact producer title')
      return { deploymentId: d.id, origin: new URL(d.deploy_ssl_url).origin, markerHash: canonicalDigest(markerFor(ctx.manifest, ctx.controllerSha, ctx.manifestHash, ctx.producer)), buildConfigHash, createdAt: d.created_at, title }
    },
    async observe(title) {
      const s = await site()
      const deployments = await api(`sites/${s.id}/deploys?per_page=100`)
      return { observedAt: a.now(), publishedDeploymentId: s.published_deploy.id, matchingDrafts: deployments.filter(d => d.title === title && d.site_id === s.id).map(d => ({ deploymentId: d.id, state: d.state, createdAt: d.created_at })) }
    },
    async candidate(record) {
      const d = await readyDeploy(record.candidate.deploymentId)
      required(d.title === record.candidate.title && new URL(d.deploy_ssl_url).origin === record.candidate.origin && d.created_at === record.candidate.createdAt, 'Candidate provider provenance changed')
      required(canonicalDigest(await marker(record.candidate.origin)) === record.candidate.markerHash, 'Immutable candidate marker differs')
      await runtime(record.candidate.origin, record.sourceSha, record.baseline.catalogue)
      await readMedia(record.candidate.origin, ctx.manifest)
    },
    async baselineDeployment(record) {
      const d = await readyDeploy(record.baseline.deploymentId)
      required(canonicalDigest(await marker(new URL(d.deploy_ssl_url).origin)) === record.baseline.markerHash, 'Immutable rollback marker differs')
    },
    restore: id => api(`sites/${encodeURIComponent(env.NETLIFY_SITE_ID)}/deploys/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
    async publishedMarker(record, operation) {
      required(canonicalDigest(await marker(production)) === (operation === 'promote' ? record.candidate.markerHash : record.baseline.markerHash), 'Public release marker did not match the selected immutable deployment')
    },
    loadRecord: () => readArtifact(env.RECORD_SOURCE_JSON, 'record'),
    loadQa: () => readArtifact(env.QA_SOURCE_JSON, 'qa'),
    async validateQa(qa, record) {
      const { assertMediaReport } = await import('./verify-demo-maintenance-media.mjs')
      verifyControllerCompatibility(controllerRoot, qa.controllerSha, ctx.controllerSha)
      return validateQa(qa, { ...ctx, controllerSha: qa.controllerSha, record, reportValidator: (report, expected) => assertMediaReport(report, { ...expected, manifest: ctx.manifest }) })
    },
    async media(origin, record) {
      const { verifyDemoMaintenanceMedia } = await import('./verify-demo-maintenance-media.mjs')
      return verifyDemoMaintenanceMedia({ manifest: ctx.manifest, origin, sourceSha: record.sourceSha, recordHash: canonicalDigest(record), deploymentId: record.candidate.deploymentId, mode: origin === production ? 'published' : 'draft' })
    },
    writeRecord: record => save(output, record),
    writeState: async state => { lastState = structuredClone(state); await save(path.join(path.dirname(output), 'baseline.json'), state) },
    async failure(error) {
      const failure = error.maintenanceFailure || { category: 'guard-or-read', phase: lastState?.phase || 'configuration' }
      await save(path.join(path.dirname(output), 'baseline.json'), { ...lastState, failedAt: a.now(), failure })
    },
    writeQa: qa => save(env.QA_OUTPUT, qa),
  }
  return a
}

export async function main(args = process.argv.slice(2), env = process.env) {
  required(args.length <= 1, 'Only a fixed maintenance operation is accepted')
  const operation = args[0] || env.OPERATION
  const bytes = await readFile(path.join(scriptDir, 'demo-maintenance-release.json'))
  const manifest = validateManifest(JSON.parse(bytes))
  if (operation === 'validate-source') { await verifySource(env.SOURCE_CHECKOUT, manifest); console.log('Verified immutable production baseline plus thirty demo paths'); return }
  const ctx = { operation, manifest, manifestHash: digest(bytes), controllerSha: env.GITHUB_SHA, producer: { runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT }, confirmation: env.CONFIRMATION }
  required(/^[a-f0-9]{40}$/.test(ctx.controllerSha ?? '') && /^[1-9][0-9]*$/.test(ctx.producer.runId ?? '') && /^[1-9][0-9]*$/.test(ctx.producer.runAttempt ?? ''), 'Actual workflow producer identity is required')
  const a = await createAdapters(ctx, env)
  try { await executeMaintenance(ctx, a) } catch (error) { await a.failure(error); throw error }
  console.log(`Completed guarded demo maintenance ${operation}; inspect the immutable evidence artifact`)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Demo maintenance operation failed. Retain the sanitized record/baseline artifact and inspect its actual phase before another action.'); process.exitCode = 1 })
