import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { REPOSITORY, TRANSPORT_CANARY, hash, safeBundlePath, validateManifest, validateConnectedReport, assertWorkflow, createGithub, draftAssets, assertArtifactSource, verifyCandidate, candidateInventory, finalizeCandidate, checkDraftTransport } from './catalogue-handoff.mjs'

const sha = 'a'.repeat(40), digest = 'b'.repeat(64)
const receipt = { version: 1, profile: 'rehab-certified', releaseSha: sha, catalogHash: hash('{}'), manifestHash: digest, fullGateHash: hash('{"fixture":true}\n'), sourceCatalogHash: digest, templateEvidenceHash: digest, fileEvidenceHash: digest, sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0, customizationDiagnostics: 0, files: 5486, pages: 5486 }
const receiptHash = canonicalDigest(receipt)
const now = Date.parse('2026-10-15T10:00:00Z')
const connected = () => ({ releaseSha: sha, catalogHash: receipt.catalogHash, manifestHash: digest, certificationHash: receiptHash, reviewedAt: new Date(now).toISOString(), evidenceUrl: `https://github.com/${REPOSITORY}/actions/runs/123`, checks: Object.fromEntries(['stripe', 'email', 'provisioning', 'previewEditing', 'refundRecovery', 'rollback'].map((key) => [key, 'passed'])) })
const manifest = () => ({ version: 1, format: 'tar+gzip', repository: REPOSITORY, releaseSha: sha, certificationHash: receiptHash, archiveSha256: digest, archiveBytes: 20, expandedBytes: 6, files: ['library/_catalog-v3.json', 'promotion-dry-run.json', 'certification.json'].map((file) => ({ path: file, bytes: 2, sha256: digest })), parts: [{ name: 'catalogue.part-00000', bytes: 20, sha256: digest }] })

test('manifest rejects drift, private extras, bounds, traversal, collisions and unordered parts', () => {
  assert.equal(validateManifest(manifest(), sha, receiptHash).files.length, 3)
  const changes = [
    (x) => { x.releaseSha = 'c'.repeat(40) },
    (x) => { x.certificationHash = digest },
    (x) => { x.repository = 'someone/else' },
    (x) => { x.extra = 'private data' },
    (x) => { x.files[0].path = '../outside' },
    (x) => { x.files[0].path = 'private-state.json' },
    (x) => { x.files[1].path = 'LIBRARY/_CATALOG-V3.JSON' },
    (x) => { x.files[0].path = 'library/file'; x.files[1].path = 'library/file/child' },
    (x) => { x.files[0].bytes = -1 },
    (x) => { x.expandedBytes = 41 * 1024 ** 3 },
    (x) => { x.parts[0].bytes = 257 * 1024 ** 2 },
    (x) => { x.parts[0].name = 'catalogue.part-00001' },
  ]
  for (const change of changes) { const value = manifest(); change(value); assert.throws(() => validateManifest(value, sha, receiptHash)) }
  for (const file of ['/absolute', 'C:/drive', 'library/../outside', 'library/a\\b', 'library/a\nb', 'library/CON.txt', 'library/a.', 'library//a']) assert.throws(() => safeBundlePath(file))
})

test('connected report keeps actual six-gate assertions separate and rejects secrets, stale proof and foreign hashes', () => {
  assert.equal(validateConnectedReport(connected(), receipt, now).checks.stripe, 'passed')
  const changes = [
    (x) => { x.checks.refundRecovery = 'pending' },
    (x) => { x.checks.localTests = 'passed' },
    (x) => { x.accessToken = 'not-uploadable' },
    (x) => { x.certificationHash = digest },
    (x) => { x.releaseSha = 'c'.repeat(40) },
    (x) => { x.reviewedAt = '2026-10-13T10:00:00Z' },
    (x) => { x.reviewedAt = '2026-10-15T10:10:00Z' },
    (x) => { x.evidenceUrl += '?token=private' },
    (x) => { x.evidenceUrl = 'https://example.test/claims' },
  ]
  for (const change of changes) { const value = connected(); change(value); assert.throws(() => validateConnectedReport(value, receipt, now)) }
  const draft = `https://github.com/${REPOSITORY}/releases/tag/untagged-reviewed`
  assert.equal(validateConnectedReport({ ...connected(), evidenceUrl: draft }, receipt, now, draft).evidenceUrl, draft)
  assert.throws(() => validateConnectedReport({ ...connected(), evidenceUrl: draft }, receipt, now, `${draft}-other`))
})

test('workflow guard accepts only this repository main and exact normal Actions identity', () => {
  const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: REPOSITORY, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: sha, GITHUB_RUN_ID: '12', GITHUB_RUN_ATTEMPT: '1', GITHUB_TOKEN: 'test-only' }
  assert.equal(assertWorkflow(env).workflowSha, sha)
  for (const changes of [{ GITHUB_REF: 'refs/pull/1/merge' }, { GITHUB_REPOSITORY: 'other/repo' }, { GITHUB_ACTIONS: '' }, { GITHUB_TOKEN: '' }, { GITHUB_RUN_ID: '../2' }]) assert.throws(() => assertWorkflow({ ...env, ...changes }))
})

test('draft release metadata refuses published or wrong-commit transport', async () => {
  const release = { id: 10, draft: true, published_at: null, target_commitish: sha, html_url: `https://github.com/${REPOSITORY}/releases/tag/draft` }
  const github = (data) => ({ json: async (url) => url.includes('/assets?') ? [] : data })
  assert.equal((await draftAssets(github(release), '10', sha)).release.id, 10)
  for (const change of [{ id: 11 }, { draft: false }, { published_at: '2026-10-15' }, { target_commitish: 'main' }, { html_url: 'https://other/repo' }]) await assert.rejects(draftAssets(github({ ...release, ...change }), '10', sha))
})

test('harmless normal-token draft canary proves transport only and rejects a substituted asset', async () => {
  const release = { id: 10, draft: true, published_at: null, target_commitish: sha, html_url: `https://github.com/${REPOSITORY}/releases/tag/draft` }
  const asset = { id: 11, name: 'catalogue-transfer-canary.txt', state: 'uploaded', size: TRANSPORT_CANARY.length, digest: `sha256:${hash(TRANSPORT_CANARY)}` }
  const github = { json: async (resource) => resource.includes('/assets?') ? [asset] : release, download: async () => ({ bytes: TRANSPORT_CANARY.length, sha256: hash(TRANSPORT_CANARY) }) }
  const proof = await checkDraftTransport(github, '10', '11', sha, '/not-used-by-fixture')
  assert.equal(proof.draftTokenAccessVerified, true); assert.equal(proof.fullCatalogueVerified, false)
  await assert.rejects(checkDraftTransport({ ...github, download: async () => ({ sha256: digest }) }, '10', '11', sha, '/not-used-by-fixture'), /canary bytes/)
  await assert.rejects(checkDraftTransport(github, '10', '12', sha, '/not-used-by-fixture'), /identity/)
})

test('binary redirect drops credentials and checks actual bytes, length, digest and storage host', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'handoff-download-'))
  try {
    const content = Buffer.from('reviewed asset'), calls = []
    const github = createGithub('test-secret-not-real', async (url, options) => {
      calls.push({ url: String(url), options })
      return calls.length === 1 ? new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/example?signature=private' } }) : new Response(content)
    })
    const observed = await github.download({ id: 4, size: content.length, digest: `sha256:${hash(content)}` }, path.join(root, 'asset'))
    assert.equal(observed.sha256, hash(content)); assert.equal(calls[1].options.headers, undefined)
    assert.equal(calls[0].options.redirect, 'manual'); assert.equal(calls[1].options.redirect, 'error')
    const hostile = createGithub('test-only', async () => new Response(null, { status: 302, headers: { location: 'https://attacker.test/file' } }))
    await assert.rejects(hostile.download({ id: 4, size: content.length }, path.join(root, 'hostile')), /trusted storage/)
    const oversized = createGithub('test-only', async () => new Response(content))
    await assert.rejects(oversized.download({ id: 4, size: 1 }, path.join(root, 'oversized')), /declared size/)
    await assert.rejects(oversized.download({ id: 4, size: content.length, digest: `sha256:${digest}` }, path.join(root, 'wronghash')), /provider metadata/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('GitHub metadata permits exact historical run attempts but rejects substituted resources', async () => {
  const calls = []
  const github = createGithub('test-only', async (url) => { calls.push(String(url)); return Response.json({ id: 12, run_attempt: 1 }) })
  assert.equal((await github.json('actions/runs/12/attempts/1')).run_attempt, 1)
  assert.equal(calls[0], `https://api.github.com/repos/${REPOSITORY}/actions/runs/12/attempts/1`)
  for (const resource of ['actions/runs/12/attempts/../2', 'actions/runs/12/attempts/0', 'actions/runs/12/attempts/1?token=x', '//other.example/secret', 'actions/runs/12/jobs', 'contents/.env']) await assert.rejects(github.json(resource), /Unapproved/)
  assert.equal(calls.length, 1)
})

test('artifact selection binds successful exact producer run, branch, commit and immutable artifact ID', async () => {
  const run = { id: 12, repository: { full_name: REPOSITORY }, head_sha: sha, head_branch: 'main', event: 'workflow_dispatch', path: '.github/workflows/import-catalogue.yml', status: 'completed', conclusion: 'success', run_attempt: 1 }
  const artifact = { id: 13, name: `catalogue-candidate-${sha}`, expired: false, workflow_run: { id: 12, head_sha: sha }, digest: `sha256:${digest}` }
  const check = (r = run, a = artifact) => assertArtifactSource({ json: async (url) => url.includes('/runs/') ? r : a }, '12', '13', sha, '.github/workflows/import-catalogue.yml', artifact.name)
  assert.equal((await check()).artifactId, '13')
  for (const change of [{ head_sha: 'c'.repeat(40) }, { head_branch: 'other' }, { path: '.github/workflows/other.yml' }, { conclusion: 'failure' }, { status: 'in_progress' }, { event: 'pull_request' }]) await assert.rejects(check({ ...run, ...change }))
  for (const change of [{ expired: true }, { name: 'unexpected' }, { workflow_run: { id: 99, head_sha: sha } }, { id: 99 }]) await assert.rejects(check(run, { ...artifact, ...change }))
})

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'handoff-candidate-'))
  const bundle = path.join(root, 'bundle')
  const dir = 'aromatherapy/example'
  const prepared = { receipt, manifest: { aromatherapy: [{ dir, files: ['index.html'], pages: ['index.html'] }] }, artifactFiles: [] }
  const data = {
    'certification.json': JSON.stringify(receipt, null, 2) + '\n',
    'promotion-dry-run.json': '{"fixture":true}\n',
    'library/_catalog-v3.json': '{}',
    [`library/${dir}/index.html`]: '<h1>Reviewed</h1>',
    [`library/${dir}/.dailyclarity/artifact-tree.json`]: '{}',
    [`library/${dir}/.dailyclarity/final-quality-receipt.json`]: '{}',
  }
  for (const [key, value] of Object.entries(data)) { await mkdir(path.dirname(path.join(bundle, key)), { recursive: true }); await writeFile(path.join(bundle, key), value) }
  prepared.catalogBytes = Buffer.from(data['library/_catalog-v3.json'])
  prepared.certificationBytes = Buffer.from(data['certification.json'])
  prepared.artifactFiles = Object.entries(data).filter(([key]) => key.startsWith(`library/${dir}/`)).map(([key, value]) => ({ key: key.slice('library/'.length), bytes: Buffer.byteLength(value), sha256: hash(value) }))
  return { root, bundle, prepared, prepare: async () => prepared }
}

async function addArtifact(f, file, value = '{}', runtime = false) {
  const template = f.prepared.manifest.aromatherapy[0], key = `${template.dir}/${file}`
  const target = path.join(f.bundle, 'library', key)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, value)
  f.prepared.artifactFiles.push({ key, bytes: Buffer.byteLength(value), sha256: hash(value) })
  if (runtime) template.files.push(file)
}

test('full verification mismatch and unexpected private files or links block candidate acceptance', async () => {
  const f = await fixture()
  try {
    assert.equal((await verifyCandidate(f.bundle, receiptHash, sha, f.prepare)).receiptHash, receiptHash)
    await assert.rejects(verifyCandidate(f.bundle, receiptHash, sha, async () => ({ receipt: { ...receipt, files: 5487 } })), /Full library/)
    const inventory = await candidateInventory(f.bundle, f.prepared)
    assert(inventory.some((item) => item.path.includes('/.dailyclarity/')))
    await writeFile(path.join(f.bundle, 'private-state.json'), '{"secret":"do not upload"}')
    await assert.rejects(candidateInventory(f.bundle, f.prepared), /unexpected files/)
    await rm(path.join(f.bundle, 'private-state.json'))
    await symlink(path.join(f.bundle, 'certification.json'), path.join(f.bundle, 'link.json'))
    await assert.rejects(candidateInventory(f.bundle, f.prepared), /links/)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('even a manifest-listed hidden file must be one of the known compiler proofs', async () => {
  const f = await fixture()
  try {
    await addArtifact(f, '.env', 'not-public', true)
    await assert.rejects(candidateInventory(f.bundle, f.prepared), /known compiler proof/)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('transport keeps exact browser-bound metadata and generated page-relative CSS outside the runtime file list', async () => {
  const f = await fixture()
  try {
    const metadata = ['template.json', 'fields.json', 'README.md', '_spec.json', '_openai_response.json', '.dailyclarity/rehabilitation.json', '.dailyclarity/design.json', '.dailyclarity/content-preset.json', '.dailyclarity/theme-preset.json', '.dailyclarity/catalog-v3.json', '.dailyclarity/quality-receipt.json', '.dailyclarity/fingerprint.json', '.dailyclarity/assets.json']
    for (const file of metadata) await addArtifact(f, file)
    for (const page of ['index.html', 'guides/about.html']) {
      if (page !== 'index.html') {
        await addArtifact(f, page, '<h1>About</h1>', true)
        f.prepared.manifest.aromatherapy[0].pages.push(page)
      }
      const css = path.posix.join(path.posix.dirname(page), `.dc-inline-${hash(`${page}:0`).slice(0, 16)}.css`)
      await addArtifact(f, css, 'h1{color:navy}', true)
    }
    const verified = await verifyCandidate(f.bundle, receiptHash, sha, f.prepare)
    const inventory = await candidateInventory(f.bundle, verified.prepared)
    assert.equal(inventory.length, f.prepared.artifactFiles.length + 3)
    for (const file of metadata) {
      assert(inventory.some((record) => record.path === `library/aromatherapy/example/${file}`))
      assert(!f.prepared.manifest.aromatherapy[0].files.includes(file))
    }
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('missing or changed certified metadata and proof snapshots fail before transport', async () => {
  for (const file of ['template.json', '.dailyclarity/content-preset.json', '.dailyclarity/artifact-tree.json', '.dailyclarity/final-quality-receipt.json']) {
    const f = await fixture()
    try {
      if (!file.endsWith('artifact-tree.json') && !file.endsWith('final-quality-receipt.json')) await addArtifact(f, file)
      const target = path.join(f.bundle, 'library/aromatherapy/example', file)
      await writeFile(target, '[]') // Same byte length as the approved {}, different digest.
      await assert.rejects(candidateInventory(f.bundle, f.prepared), /differs from verified artifact bytes/)
      await rm(target)
      await assert.rejects(candidateInventory(f.bundle, f.prepared), /missing or unexpected files/)
    } finally { await rm(f.root, { recursive: true, force: true }) }
  }
})

test('receipt-bound unknown hidden files and misplaced generated stylesheet names remain forbidden', async () => {
  for (const file of ['.dailyclarity/private.json', '.private/.dc-inline-0123456789abcdef.css', 'assets/.dc-inline-0123456789abcdef.css', '.dc-inline-0123.css']) {
    const f = await fixture()
    try {
      await addArtifact(f, file, '', true)
      await assert.rejects(candidateInventory(f.bundle, f.prepared), /known compiler proof/)
    } finally { await rm(f.root, { recursive: true, force: true }) }
  }
})

test('catalogue, promotion plan, and certification bytes cannot change after candidate verification', async () => {
  for (const file of ['library/_catalog-v3.json', 'promotion-dry-run.json', 'certification.json']) {
    const f = await fixture()
    try {
      const verified = await verifyCandidate(f.bundle, receiptHash, sha, f.prepare)
      const target = path.join(f.bundle, file)
      await writeFile(target, `${await readFile(target, 'utf8')} `)
      await assert.rejects(candidateInventory(f.bundle, verified.prepared), /differs from verified artifact bytes/)
    } finally { await rm(f.root, { recursive: true, force: true }) }
  }
})

test('a full-size nested candidate reaches the exact file allowlist without exceeding the argument limit', { timeout: 180_000 }, async () => {
  const f = await fixture()
  try {
    const directory = path.join(f.bundle, 'library/aromatherapy/example/assets')
    await mkdir(directory)
    const count = 200_000
    const files = f.prepared.manifest.aromatherapy[0].files
    // More files than the production catalogue must survive both the template
    // and library directory merges. Only the last file is deliberately unlisted.
    for (let start = 0; start < count; start += 64) {
      await Promise.all(Array.from({ length: Math.min(64, count - start) }, async (_, offset) => {
        const index = start + offset
        const filename = `${String(index).padStart(6, '0')}.css`
        await writeFile(path.join(directory, filename), '')
        if (index < count - 1) {
          files.push(`assets/${filename}`)
          f.prepared.artifactFiles.push({ key: `aromatherapy/example/assets/${filename}`, bytes: 0, sha256: hash('') })
        }
      }))
    }
    await assert.rejects(candidateInventory(f.bundle, f.prepared), (error) => {
      assert.equal(error.constructor, Error)
      assert.equal(error.message, 'Candidate contains missing or unexpected files')
      return true
    })
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('finalization adds exact reviewed report bytes only after full candidate and six real gates are approved', async () => {
  const f = await fixture()
  try {
    const connectedFile = path.join(f.root, 'connected.json')
    const raw = Buffer.from(JSON.stringify(connected(), null, 2) + '\n')
    await writeFile(connectedFile, raw)
    const args = { ...f, connectedFile, connectedHash: hash(raw), receiptHash, releaseSha: sha, now }
    await assert.rejects(finalizeCandidate({ ...args, connectedHash: digest }), /bytes differ/)
    const before = await readFile(path.join(f.bundle, 'certification.json'))
    const result = await finalizeCandidate(args)
    assert.equal(result.connectedEvidenceHash, hash(raw))
    assert.deepEqual(await readFile(path.join(f.bundle, 'connected-staging.json')), raw)
    assert.deepEqual(await readFile(path.join(f.bundle, 'certification.json')), before)
    await assert.rejects(finalizeCandidate(args), /unexpected files/)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})
