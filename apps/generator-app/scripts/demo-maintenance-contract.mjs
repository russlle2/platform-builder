import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm, lstat, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { canonicalDigest, validateCertifiedPointer, validateCertification, PRODUCTION_NETLIFY_SITE_ID } from '../src/lib/templates/certified-catalog-contract.mjs'

export { canonicalDigest }
export const WORKFLOW = '.github/workflows/demo-maintenance.yml'
export const MARKER = '__dailyclarity_release.json'
// Complete local implementation/dependency closure used by this controller.
// A future main may reuse an immutable record only while this stays identical.
export const CONTROLLER_CLOSURE = [
  '.github/workflows/demo-maintenance.yml', '.github/workflows/ci.yml', 'package.json', 'pnpm-lock.yaml',
  'pnpm-workspace.yaml', '.npmrc', '.pnpmfile.cjs', '.node-version', '.nvmrc',
  'patches', 'packages', 'apps/generator-app/package.json',
  'apps/generator-app/.npmrc', 'apps/generator-app/.pnpmfile.cjs',
  ...['demo-maintenance-release.json', 'demo-maintenance-contract.mjs', 'run-demo-maintenance.mjs', 'verify-demo-maintenance-media.mjs', 'netlify-target-contract.mjs', 'verify-release-ci.mjs', 'verify-auth-entrypoint.mjs'].map(p => `apps/generator-app/scripts/${p}`),
  'apps/generator-app/src/lib/templates/certified-catalog-contract.mjs',
]
const SHA = /^[a-f0-9]{40}$/
const HASH = /^[a-f0-9]{64}$/
const ID = /^[a-zA-Z0-9_-]{1,100}$/
export const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const need = (ok, message) => { if (!ok) throw new Error(message) }
const keys = (value, expected) => need(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...expected].sort().join('|'), 'Unexpected maintenance contract fields')
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const decimal = value => typeof value === 'string' && /^[1-9][0-9]{0,19}$/.test(value)
export function assertControllerCompatibility({ priorSha, currentSha, ancestor, priorEntries, currentEntries }) {
  need(SHA.test(priorSha) && SHA.test(currentSha) && ancestor === true && Array.isArray(priorEntries) && Array.isArray(currentEntries), 'Prior controller is not an ancestor of current main')
  need(priorEntries.length === CONTROLLER_CLOSURE.length && currentEntries.length === CONTROLLER_CLOSURE.length, 'Controller closure is incomplete')
  for (let i = 0; i < CONTROLLER_CLOSURE.length; i++) need(priorEntries[i]?.path === CONTROLLER_CLOSURE[i] && currentEntries[i]?.path === CONTROLLER_CLOSURE[i] && priorEntries[i].entry === currentEntries[i].entry, 'Prior controller dependency closure differs from current main')
  for (const p of CONTROLLER_CLOSURE.filter(p => p.endsWith('.mjs') || p.endsWith('.json') || p === 'pnpm-lock.yaml' || p === WORKFLOW)) need(currentEntries.find(e => e.path === p)?.entry, 'A required controller closure file is missing')
}
export function verifyControllerCompatibility(repo, priorSha, currentSha) {
  need(SHA.test(priorSha) && SHA.test(currentSha), 'Invalid controller commit')
  const git = args => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1_000_000 }).trim()
  let ancestor = false
  try { git(['merge-base', '--is-ancestor', priorSha, currentSha]); ancestor = true } catch { /* fail closed below */ }
  const entries = sha => CONTROLLER_CLOSURE.map(p => ({ path: p, entry: git(['ls-tree', sha, '--', p]) }))
  assertControllerCompatibility({ priorSha, currentSha, ancestor, priorEntries: entries(priorSha), currentEntries: entries(currentSha) })
}
export const mediaNames = ['aromatherapy', 'holistic-medicine', 'platform-builder', 'private-practice-therapist', 'sound-bath', 'wellness-coach']
export const allowedPaths = [
  ...mediaNames.flatMap(name => ['mp4', 'txt', 'vtt'].map(ext => `apps/generator-app/public/demo-videos/${name}-walkthrough.${ext}`).concat(`apps/generator-app/public/demo-videos/posters/${name}-walkthrough.jpg`)),
  ...['app/demo/[niche]/page.tsx', 'app/demo/page.tsx', 'app/demo/platform-builder/page.tsx', 'app/page.tsx', 'components/demo/DemoVideoPlayer.tsx', 'lib/demo-videos.ts'].map(p => `apps/generator-app/src/${p}`),
].sort()

export function validateManifest(m) {
  keys(m, ['version', 'id', 'baselineSha', 'mediaPatchCommit', 'mediaPatchSha256', 'sourceSha', 'sourceTreeSha', 'expectedBaselineCertificationHash', 'mediaVersion', 'files'])
  need(m.version === 1 && /^[a-z0-9-]{1,100}$/.test(m.id) && /^[a-z0-9-]{1,60}$/.test(m.mediaVersion), 'Invalid maintenance manifest identity')
  for (const k of ['baselineSha', 'mediaPatchCommit', 'sourceSha', 'sourceTreeSha']) need(SHA.test(m[k]), `Invalid manifest ${k}`)
  for (const k of ['mediaPatchSha256', 'expectedBaselineCertificationHash']) need(HASH.test(m[k]), `Invalid manifest ${k}`)
  need(m.sourceSha !== m.baselineSha && Array.isArray(m.files) && m.files.length === 30 && m.files.map(f => f.path).sort().join('|') === allowedPaths.join('|'), 'Maintenance scope must contain exactly the thirty demo paths')
  for (const f of m.files) {
    keys(f, ['path', 'beforeBlob', 'afterBlob', 'sha256', 'bytes', 'mode'])
    need((f.beforeBlob === null || SHA.test(f.beforeBlob)) && SHA.test(f.afterBlob) && HASH.test(f.sha256) && Number.isSafeInteger(f.bytes) && f.bytes > 0 && f.bytes < 40_000_000 && f.mode === '100644', 'Invalid reviewed file identity')
  }
  return m
}

// CLI27.4.2 saves plugin mutations here but deploy --no-build does not discover
// that hidden file. Its normal monorepo discovery DOES select package netlify.toml.
// Stage only those just-built bytes, never overwrite a reviewed source config.
export async function stageAdapterConfiguration(source) {
  const app = path.join(source, 'apps/generator-app')
  const generated = path.join(app, '.netlify/netlify.toml')
  const stat = await lstat(generated)
  need(stat.isFile() && stat.size > 0 && stat.size < 2_000_000, 'Production adapter did not emit a bounded regular configuration')
  const bytes = await readFile(generated)
  const target = path.join(app, 'netlify.toml')
  await writeFile(target, bytes, { flag: 'wx' })
  need(digest(await readFile(target)) === digest(bytes), 'Generated adapter configuration copy differs')
  return digest(bytes)
}

// No dependency installation or source script runs before this guard. Rebuild the
// reviewed binary patch in an isolated index; compare the entire resulting tree.
export async function verifySource(source, manifest, { allowBuildOutputs = false } = {}) {
  const m = validateManifest(manifest)
  const git = (args, options = {}) => execFileSync('git', ['-C', source, ...args], { encoding: null, maxBuffer: 200_000_000, stdio: ['pipe', 'pipe', 'pipe'], ...options })
  need(git(['rev-parse', 'HEAD']).toString().trim() === m.sourceSha, 'Source checkout is not the reviewed commit')
  need(git(['show', '-s', '--format=%T %P', 'HEAD']).toString().trim() === `${m.sourceTreeSha} ${m.baselineSha}`, 'Source parent/tree is not the production baseline plus demo patch')
  need(!git(['diff', '--name-only', 'HEAD']).length, 'Tracked source checkout was modified')
  need(!git(['ls-files', '--others', '--exclude-standard']).length, 'Source checkout contains unreviewed files')
  need(!git(['config', '--list', '--local']).toString().split('\n').some(line => /^(http\..*extraheader|credential\.)/i.test(line)), 'Source checkout retained Git credentials')
  const patch = git(['diff', '--binary', `${m.mediaPatchCommit}^1`, m.mediaPatchCommit])
  need(digest(patch) === m.mediaPatchSha256, 'Reviewed original media patch differs')
  const temp = await mkdtemp(path.join(os.tmpdir(), 'demo-index-'))
  try {
    const env = { ...process.env, GIT_INDEX_FILE: path.join(temp, 'index') }
    git(['read-tree', m.baselineSha], { env })
    git(['apply', '--cached', '--binary', '--whitespace=nowarn', '-'], { env, input: patch })
    need(git(['write-tree'], { env }).toString().trim() === m.sourceTreeSha, 'Source contains changes beyond the original demo patch')
  } finally { await rm(temp, { recursive: true, force: true }) }
  const changed = git(['diff', '--name-only', '-z', m.baselineSha, m.sourceSha]).toString().split('\0').filter(Boolean).sort()
  need(changed.join('|') === allowedPaths.join('|'), 'Changed file scope differs')
  for (const file of m.files) {
    const before = git(['ls-tree', m.baselineSha, '--', file.path]).toString().trim()
    const after = git(['ls-tree', m.sourceSha, '--', file.path]).toString().trim()
    need(before === (file.beforeBlob ? `100644 blob ${file.beforeBlob}\t${file.path}` : '') && after === `100644 blob ${file.afterBlob}\t${file.path}`, 'Reviewed Git file identity differs')
    const local = path.join(source, file.path)
    need((await lstat(local)).isFile(), 'Reviewed source file is not a regular file')
    const bytes = await readFile(local)
    need(bytes.length === file.bytes && digest(bytes) === file.sha256, 'Source bytes differ from manifest')
  }
  // Ignored .env or linked Netlify state may otherwise override production inputs.
  for (const dir of [source, path.join(source, 'apps/generator-app')]) {
    for (const entry of await readdir(dir)) need(!/^\.env(?:\.|$)/.test(entry) || entry.endsWith('.example'), 'Source checkout contains environment overrides')
    if (!allowBuildOutputs) need(!(await readdir(dir)).includes('.netlify'), 'Source checkout contains stale Netlify state')
  }
  return { sourceSha: m.sourceSha, sourceTreeSha: m.sourceTreeSha, files: 30 }
}

export function validateCatalogue(pointer, certificate, m) {
  validateCertifiedPointer(pointer)
  validateCertification(certificate, { releaseSha: m.baselineSha, catalogHash: pointer.catalogHash, manifestHash: pointer.manifestHash })
  need(pointer.releaseSha === m.baselineSha && pointer.certificationHash === m.expectedBaselineCertificationHash && canonicalDigest(certificate) === pointer.certificationHash, 'Existing catalogue does not match the approved production certification')
  return { pointerHash: canonicalDigest(pointer), releaseSha: pointer.releaseSha, certificationHash: pointer.certificationHash, catalogHash: pointer.catalogHash, manifestHash: pointer.manifestHash, profile: 'rehab-certified', templates: 5486 }
}

// Deliberately separate app and catalogue identities. No old certificate is
// relabelled; the unchanged catalogue continues to certify its original SHA.
export function validateRuntime(runtime, { siteId, projectRef, appSha, catalogue }) {
  need(runtime?.deploymentSiteId === siteId && runtime.supabaseProjectRef === projectRef && runtime.deploymentReleaseSha === appSha, 'Maintenance application runtime identity differs')
  need(runtime.supabaseSchemaReady === true && runtime.supabaseSchemaVersion === '20260903.4' && runtime.bookingKitSchemaVersion === '20260925.2', 'Runtime schema is not healthy')
  for (const k of ['checkoutReady', 'templateCheckoutReady', 'customBuildCheckoutReady', 'fulfillmentReady', 'emailReady', 'templateCatalogReady']) need(runtime[k] === true, `Runtime ${k} is not ready`)
  need(Array.isArray(runtime.missingRequirements) && runtime.missingRequirements.length === 0 && runtime.salesPaused === false && runtime.bookingKitSalesEnabled === false, 'Runtime sales/readiness policy changed')
  need(runtime.templateCatalogProfile === 'rehab-certified' && runtime.templateCatalogueReleaseSha === catalogue.releaseSha && runtime.templateCertificationHash === catalogue.certificationHash && runtime.templateCatalogHash === catalogue.catalogHash && runtime.templateManifestHash === catalogue.manifestHash && runtime.publishedTemplateCount === 5486 && runtime.expectedTemplateCount === 5486 && Array.isArray(runtime.templateCatalogIssues) && runtime.templateCatalogIssues.length === 0, 'Unchanged certified catalogue runtime is not healthy')
  return { appSha, catalogueReleaseSha: catalogue.releaseSha, catalogueHash: catalogue.catalogHash, certificationHash: catalogue.certificationHash, schemaReady: true, checkoutReady: true, fulfillmentReady: true, emailReady: true, templates: 5486, missingRequirements: 0 }
}

export function markerFor(m, controllerSha, manifestHash, producer) {
  return { version: 1, kind: 'dailyclarity-demo-maintenance', releaseSha: m.sourceSha, sourceTreeSha: m.sourceTreeSha, controllerSha, manifestHash, catalogueReleaseSha: m.baselineSha, certificationHash: m.expectedBaselineCertificationHash, mediaVersion: m.mediaVersion, producer }
}
export function validateBaseline(b, m) {
  keys(b, ['siteId', 'hostname', 'deploymentId', 'appSha', 'accountHash', 'settingsHash', 'environmentHash', 'projectRefHash', 'catalogue', 'markerHash', 'runtime', 'capturedAt'])
  need(b.siteId === PRODUCTION_NETLIFY_SITE_ID && b.hostname === 'dailyclarity.org' && ID.test(b.deploymentId) && b.appSha === m.baselineSha && validTime(b.capturedAt), 'Baseline deployment identity differs')
  for (const k of ['accountHash', 'settingsHash', 'environmentHash', 'projectRefHash', 'markerHash']) need(HASH.test(b[k]), 'Baseline commitment is invalid')
  keys(b.catalogue, ['pointerHash', 'releaseSha', 'certificationHash', 'catalogHash', 'manifestHash', 'profile', 'templates'])
  need(b.catalogue.releaseSha === m.baselineSha && b.catalogue.certificationHash === m.expectedBaselineCertificationHash && b.catalogue.profile === 'rehab-certified' && b.catalogue.templates === 5486, 'Baseline catalogue identity differs')
  for (const k of ['pointerHash', 'catalogHash', 'manifestHash']) need(HASH.test(b.catalogue[k]), 'Baseline catalogue hash invalid')
  need(b.runtime?.appSha === m.baselineSha && b.runtime.catalogueReleaseSha === m.baselineSha && b.runtime.certificationHash === m.expectedBaselineCertificationHash && b.runtime.schemaReady === true && b.runtime.templates === 5486 && b.runtime.missingRequirements === 0, 'Baseline runtime proof invalid')
  return b
}
export function assertUnchanged(current, baseline, { deploymentId = baseline.deploymentId, appSha = baseline.appSha } = {}) {
  for (const k of ['siteId', 'hostname', 'accountHash', 'settingsHash', 'environmentHash', 'projectRefHash']) need(current[k] === baseline[k], `Production ${k} changed`)
  need(canonicalDigest(current.catalogue) === canonicalDigest(baseline.catalogue) && current.deploymentId === deploymentId && current.appSha === appSha, 'Production deployment or catalogue changed')
}
export function validateRecord(r, { manifest: m, manifestHash, controllerSha }) {
  keys(r, ['version', 'kind', 'controllerSha', 'producer', 'manifestHash', 'sourceSha', 'sourceTreeSha', 'baseline', 'candidate', 'preparedAt'])
  need(r.version === 1 && r.kind === 'dailyclarity-demo-maintenance' && r.controllerSha === controllerSha && r.manifestHash === manifestHash && r.sourceSha === m.sourceSha && r.sourceTreeSha === m.sourceTreeSha && validTime(r.preparedAt), 'Maintenance record identity differs')
  keys(r.producer, ['runId', 'runAttempt'])
  need(decimal(r.producer.runId) && decimal(r.producer.runAttempt), 'Record producer invalid')
  validateBaseline(r.baseline, m)
  keys(r.candidate, ['deploymentId', 'origin', 'markerHash', 'buildConfigHash', 'createdAt', 'title'])
  need(ID.test(r.candidate.deploymentId) && r.candidate.deploymentId !== r.baseline.deploymentId && validTime(r.candidate.createdAt) && HASH.test(r.candidate.markerHash) && HASH.test(r.candidate.buildConfigHash), 'Candidate deployment invalid')
  const url = new URL(r.candidate.origin)
  need(url.protocol === 'https:' && !url.username && !url.password && !url.port && url.pathname === '/' && !url.search && !url.hash && url.hostname.startsWith(`${r.candidate.deploymentId}--`) && url.hostname.endsWith('.netlify.app'), 'Candidate origin is not its immutable deployment hostname')
  const marker = markerFor(m, controllerSha, manifestHash, r.producer)
  need(r.candidate.markerHash === canonicalDigest(marker) && r.candidate.title === candidateTitle(m, r.producer), 'Candidate proof is not bound to its producer')
  return r
}
export const candidateTitle = (m, p) => `Demo ${m.sourceSha} ${p.runId}/${p.runAttempt}`
export function parseArtifactSource(json, kind) {
  const s = JSON.parse(json || 'null')
  keys(s, ['runId', 'runAttempt', 'artifactId', 'artifactDigest', kind === 'record' ? 'recordHash' : 'qaHash'])
  need(decimal(s.runId) && decimal(s.runAttempt) && decimal(s.artifactId) && HASH.test(s.artifactDigest) && HASH.test(s[kind === 'record' ? 'recordHash' : 'qaHash']), 'Immutable artifact source invalid')
  return s
}
export function validateArtifactMetadata({ run, artifact, source, kind, controllerSha, repository, now = Date.now() }) {
  need(String(run.id) === source.runId && String(run.run_attempt) === source.runAttempt && run.status === 'completed' && run.conclusion === 'success' && run.event === 'workflow_dispatch' && run.path === WORKFLOW && run.head_branch === 'main' && run.head_sha === controllerSha && run.head_repository?.full_name === repository && validTime(run.run_started_at) && validTime(run.updated_at), 'Artifact producer is not the successful exact controller workflow attempt')
  need(String(artifact.id) === source.artifactId && artifact.name === `demo-maintenance-${kind}-${source.runId}-${source.runAttempt}` && artifact.digest === `sha256:${source.artifactDigest}` && artifact.expired === false && Date.parse(artifact.expires_at) > now && artifact.size_in_bytes > 0 && artifact.size_in_bytes < 2_000_000 && String(artifact.workflow_run?.id) === source.runId && artifact.workflow_run?.head_sha === controllerSha && Date.parse(artifact.created_at) >= Date.parse(run.run_started_at), 'Artifact metadata does not bind the immutable reviewed producer')
}
export function validateQa(qa, { record, manifestHash, controllerSha, reportValidator, now = Date.now() }) {
  keys(qa, ['version', 'kind', 'controllerSha', 'producer', 'manifestHash', 'recordHash', 'sourceSha', 'deploymentId', 'report'])
  need(qa.version === 1 && qa.kind === 'dailyclarity-demo-maintenance-qa' && qa.controllerSha === controllerSha && qa.manifestHash === manifestHash && qa.recordHash === canonicalDigest(record) && qa.sourceSha === record.sourceSha && qa.deploymentId === record.candidate.deploymentId, 'QA does not attest this prepared draft')
  need(decimal(qa.producer?.runId) && decimal(qa.producer?.runAttempt) && validTime(qa.report?.checkedAt) && Date.parse(qa.report.checkedAt) >= Date.parse(record.preparedAt) && Date.parse(qa.report.checkedAt) <= now + 60_000 && now - Date.parse(qa.report.checkedAt) <= 24 * 60 * 60 * 1000, 'Draft QA is stale or has invalid chronology')
  reportValidator(qa.report, { origin: record.candidate.origin, sourceSha: record.sourceSha, recordHash: canonicalDigest(record), deploymentId: record.candidate.deploymentId })
  return qa
}

export function cleanBuildEnvironment(env, m) {
  const result = {}
  for (const k of ['PATH', 'HOME', 'USERPROFILE', 'SystemRoot', 'TEMP', 'TMP', 'TMPDIR', 'CI', 'PNPM_HOME', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'DAILYCLARITY_SUPABASE_PROJECT_REF']) if (env[k]) result[k] = env[k]
  return { ...result, CI: 'true', NEXT_TELEMETRY_DISABLED: '1', NETLIFY_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SITE_URL: 'https://dailyclarity.org', NEXT_PUBLIC_RELEASE_SHA: m.sourceSha, DAILYCLARITY_ENVIRONMENT: 'production', DAILY_CLARITY_TEMPLATE_CATALOG_PROFILE: 'rehab-certified', SITE_ID: env.NETLIFY_SITE_ID, NETLIFY_SITE_ID: env.NETLIFY_SITE_ID, CONTEXT: 'production' }
}
