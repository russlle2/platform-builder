import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { REPOSITORY, hash } from './catalogue-handoff.mjs'
import { assertPackageTestOnly, assertSourceClosure, assertOriginalImport, certificationCore, rebindCandidate, verifyImportReport } from './rebind-catalogue.mjs'

const sourceSha = 'a'.repeat(40), releaseSha = 'b'.repeat(40), digest = 'c'.repeat(64)
const certificationPath = 'apps/generator-app/scripts/certified-catalog-release.mjs'
const originalSource = `import { getStore } from '@netlify/blobs'
export function prepareCertification() { return 'unchanged certificate computation' }
async function api(resource, env, method = 'GET') { return fetch(resource) }
export async function connectedTarget() { return getStore({}) }
export async function main() { return 'unchanged command gates' }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
`
const packageBefore = () => ({ name: 'closure-fixture', scripts: { test: 'node --test original.test.mjs', build: 'unchanged' }, dependencies: { package: '1.0.0' } })
const testAppend = ' apps/generator-app/scripts/rebind-catalogue.test.mjs apps/generator-app/scripts/release-read-retry.test.mjs'

test('package exception only permits the exact appended release tests, preserving dependencies and other commands', () => {
  const before = packageBefore(), after = structuredClone(before)
  after.scripts.test += testAppend
  assert.doesNotThrow(() => assertPackageTestOnly(before, after))
  after.scripts.test = before.scripts.test + ' && node --test apps/generator-app/scripts/rebind-catalogue.test.mjs'
  assert.doesNotThrow(() => assertPackageTestOnly(before, after))
  const mutations = [
    (value) => { value.dependencies.package = '2.0.0' },
    (value) => { value.scripts.build = 'different build' },
    (value) => { value.scripts.test = 'node --test only-new.test.mjs' },
    (value) => { value.scripts.test += ' && true' },
    (value) => { value.scripts.test += ' --test-only' },
    (value) => { value.scripts.test += ' apps/generator-app/scripts/unapproved.test.mjs' },
  ]
  for (const change of mutations) { const value = structuredClone(after); change(value); assert.throws(() => assertPackageTestOnly(before, value)) }
})

test('certification code exception masks only the explicit retry import, API plumbing and final error handler', () => {
  const changed = "import { withReadRetry, retryBlobReads } from './release-read-retry.mjs'\n" + originalSource.replace('return fetch(resource)', 'return withReadRetry(() => fetch(resource))').replace('console.error(error.message)', 'console.error("sanitized")')
  assert.equal(certificationCore(changed), certificationCore(originalSource))
  for (const changedCore of [originalSource.replace('unchanged certificate computation', 'weakened computation'), originalSource.replace('unchanged command gates', 'bypassed gates'), originalSource.replace("from '@netlify/blobs'", "from './different-dependency.mjs'")]) assert.notEqual(certificationCore(changedCore), certificationCore(originalSource))
  assert.throws(() => certificationCore('missing expected boundaries'))
})

async function sourceFixture() {
  const repository = await mkdtemp(path.join(os.tmpdir(), 'catalogue-source-'))
  const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const put = async (file, bytes) => { await mkdir(path.dirname(path.join(repository, file)), { recursive: true }); await writeFile(path.join(repository, file), bytes) }
  const commit = () => { git('add', '.'); git('-c', 'user.name=Release Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture'); return git('rev-parse', 'HEAD') }
  git('init', '-q')
  await put('package.json', JSON.stringify(packageBefore()))
  await put('pnpm-lock.yaml', 'exact dependency closure')
  await put('apps/generator-app/src/app/page.tsx', 'original application')
  await put('packages/template-factory/compiler.mjs', 'original compiler')
  await put(certificationPath, originalSource)
  const source = commit()
  return { repository, git, put, commit, source }
}

test('whole repository closure accepts only explicit release tooling while preserving app, compiler, dependency and certificate code', async () => {
  const f = await sourceFixture()
  try {
    await f.put('apps/generator-app/scripts/release-read-retry.mjs', 'release-only retry implementation')
    const after = packageBefore(); after.scripts.test += testAppend
    await f.put('package.json', JSON.stringify(after))
    await f.put(certificationPath, "import { withReadRetry } from './release-read-retry.mjs'\n" + originalSource.replace('return fetch(resource)', 'return withReadRetry(() => fetch(resource))'))
    const target = f.commit(), closure = assertSourceClosure(f.repository, f.source, target)
    assert.equal(closure.changed.length, 3)
    assert.equal(closure.protectedFiles, 3)
    assert.equal(closure.certificationCoreHash, hash(certificationCore(originalSource)))
    await f.put('untracked-secret.txt', 'not eligible for workflow')
    assert.throws(() => assertSourceClosure(f.repository, f.source, target), /clean repository/)
  } finally { await rm(f.repository, { recursive: true, force: true }) }
})

test('app, compiler, lockfile, package and certificate computation changes independently block reuse', async () => {
  const mutations = [
    ['apps/generator-app/src/app/page.tsx', 'new application'],
    ['packages/template-factory/compiler.mjs', 'new compiler'],
    ['pnpm-lock.yaml', 'new dependency closure'],
    ['package.json', JSON.stringify({ ...packageBefore(), dependencies: { package: '2.0.0' } })],
    [certificationPath, originalSource.replace('unchanged certificate computation', 'new computation')],
  ]
  for (const [file, bytes] of mutations) {
    const f = await sourceFixture()
    try {
      await f.put(file, bytes)
      assert.throws(() => assertSourceClosure(f.repository, f.source, f.commit()), /non-release|Dependencies|byte-identical/)
    } finally { await rm(f.repository, { recursive: true, force: true }) }
  }
})

function importFixture() {
  const inputs = { sourceSha, runId: '12', artifactId: '13', provenanceId: '14', artifactDigest: digest, receiptHash: 'd'.repeat(64) }
  const run = { id: 12, repository: { full_name: REPOSITORY }, head_sha: sourceSha, head_branch: 'main', event: 'workflow_dispatch', path: '.github/workflows/import-catalogue.yml', status: 'completed', conclusion: 'success', run_attempt: 1 }
  const artifact = { id: 13, name: `catalogue-candidate-${sourceSha}`, expired: false, workflow_run: { id: 12, head_sha: sourceSha }, digest: `sha256:${digest}` }
  const provenance = { ...artifact, id: 14, name: 'catalogue-import-provenance-12-1' }
  const github = { json: async (resource) => resource.includes('/runs/') ? run : resource.endsWith('/13') ? artifact : provenance }
  return { inputs, run, artifact, provenance, github }
}

test('rebind accepts only a successful original import with exact candidate digest and same-attempt provenance', async () => {
  const f = importFixture()
  assert.equal((await assertOriginalImport(f.github, f.inputs)).candidate.artifactId, '13')
  for (const change of [{ artifactDigest: 'e'.repeat(64) }, { artifactDigest: '' }, { provenanceId: '13' }, { sourceSha: releaseSha }]) await assert.rejects(assertOriginalImport(f.github, { ...f.inputs, ...change }))
  f.run.path = '.github/workflows/rebind-catalogue.yml'
  await assert.rejects(assertOriginalImport(f.github, f.inputs), /producer/)
  f.run.path = '.github/workflows/import-catalogue.yml'; f.provenance.name = 'catalogue-import-provenance-12-2'
  await assert.rejects(assertOriginalImport(f.github, f.inputs), /approved producer/)
})

test('original retained import report must bind actual artifact, receipt and successful transport, without extra files', async () => {
  const f = importFixture(), source = await assertOriginalImport(f.github, f.inputs)
  const directory = await mkdtemp(path.join(os.tmpdir(), 'import-provenance-'))
  const report = { repository: REPOSITORY, runId: '12', runAttempt: '1', workflowSha: sourceSha, transportVerified: true, certificationHash: f.inputs.receiptHash, artifact: { id: '13', digest }, source: { releaseId: 10, manifestAssetId: 11, manifestHash: digest, assets: [{}, {}] } }
  const file = path.join(directory, 'catalogue-import-report.json')
  try {
    await writeFile(file, JSON.stringify(report))
    assert.equal((await verifyImportReport(directory, source)).reportHash, hash(JSON.stringify(report)))
    for (const mutation of [{ transportVerified: false }, { workflowSha: releaseSha }, { certificationHash: digest }, { artifact: { id: '14', digest } }, { runAttempt: '2' }]) {
      await writeFile(file, JSON.stringify({ ...report, ...mutation }))
      await assert.rejects(verifyImportReport(directory, source), /differs/)
    }
    await writeFile(file, JSON.stringify(report)); await writeFile(path.join(directory, 'private.json'), '{}')
    await assert.rejects(verifyImportReport(directory, source), /only its import report/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

async function bundleFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'catalogue-rebind-')), bundle = path.join(root, 'bundle')
  const receipt = { version: 1, profile: 'rehab-certified', releaseSha: sourceSha, catalogHash: hash('{}'), manifestHash: digest, fullGateHash: hash('reviewed plan'), sourceCatalogHash: digest, templateEvidenceHash: digest, fileEvidenceHash: digest, sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0, customizationDiagnostics: 0, files: 5486, pages: 5486 }
  const data = { 'certification.json': JSON.stringify(receipt), 'promotion-dry-run.json': 'reviewed plan', 'library/_catalog-v3.json': '{}', 'library/aromatherapy/example/index.html': '<h1>Certified original page</h1>', 'library/aromatherapy/example/.dailyclarity/final-quality-receipt.json': '{"originalBrowserProof":true}' }
  for (const [file, bytes] of Object.entries(data)) { await mkdir(path.dirname(path.join(bundle, file)), { recursive: true }); await writeFile(path.join(bundle, file), bytes) }
  const prepared = { receipt, manifest: { aromatherapy: [{ dir: 'aromatherapy/example', files: ['index.html'], pages: ['index.html'] }] }, catalogBytes: Buffer.from('{}'), artifactFiles: Object.entries(data).filter(([file]) => file.startsWith('library/aromatherapy/')).map(([file, bytes]) => ({ key: file.slice(8), bytes: Buffer.byteLength(bytes), sha256: hash(bytes) })) }
  const calls = [], prepare = async (_root, _plan, sha) => { calls.push(sha); return { ...prepared, receipt: { ...prepared.receipt, releaseSha: sha } } }
  return { root, bundle, data, prepared, calls, prepare, args: { bundle, sourceSha, releaseSha, sourceReceiptHash: canonicalDigest(receipt), prepare } }
}

test('rebind recomputes both certificates and changes only certification.json, retaining historical browser and plan bytes', async () => {
  const f = await bundleFixture()
  try {
    const phases = [], result = await rebindCandidate({ ...f.args, onPhase: (value) => phases.push(value) })
    assert.deepEqual(f.calls, [sourceSha, releaseSha])
    assert.equal(result.certificationHash, canonicalDigest({ ...f.prepared.receipt, releaseSha }))
    assert.deepEqual(result.changedFiles, ['certification.json'])
    assert(phases.includes('verify-old-candidate') && phases.includes('verify-new-inventory'))
    for (const [file, bytes] of Object.entries(f.data)) if (file !== 'certification.json') assert.equal(await readFile(path.join(f.bundle, file), 'utf8'), bytes)
    assert.equal(JSON.parse(await readFile(path.join(f.bundle, 'certification.json'), 'utf8')).releaseSha, releaseSha)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('invalid old bytes or changed recomputed evidence cannot be relabeled as a new source certificate', async () => {
  for (const scenario of ['old-certificate-hash', 'old-browser-bytes', 'new-catalogue-evidence']) {
    const f = await bundleFixture()
    try {
      const args = { ...f.args }
      if (scenario === 'old-certificate-hash') args.sourceReceiptHash = digest
      if (scenario === 'old-browser-bytes') await writeFile(path.join(f.bundle, 'library/aromatherapy/example/.dailyclarity/final-quality-receipt.json'), 'substituted proof')
      if (scenario === 'new-catalogue-evidence') args.prepare = async (root, plan, sha) => { const result = await f.prepare(root, plan, sha); if (sha === releaseSha) result.receipt = { ...result.receipt, pages: 5487 }; return result }
      await assert.rejects(rebindCandidate(args))
      assert.equal(await readFile(path.join(f.bundle, 'certification.json'), 'utf8'), f.data['certification.json'])
    } finally { await rm(f.root, { recursive: true, force: true }) }
  }
})
