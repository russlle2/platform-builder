import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { REPOSITORY, TRANSPORT_CANARY, hash } from './catalogue-handoff.mjs'
import { assertPreparationWorkflow, createPreparationGithub, prepareFreshCandidate, uploadTransport, validateCustomization, verifyTransport } from './prepare-catalogue-transport.mjs'

const sourceSha = 'a'.repeat(40), releaseSha = 'b'.repeat(40), digest = 'c'.repeat(64)
const receipt = { version: 1, profile: 'rehab-certified', releaseSha: sourceSha, catalogHash: hash('{}'), manifestHash: digest, fullGateHash: hash('{"fixture":true}\n'), sourceCatalogHash: digest, templateEvidenceHash: digest, fileEvidenceHash: digest, sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0, customizationDiagnostics: 0, files: 5486, pages: 5486 }
const customization = (root) => ({ root, pass: true, catalogHash: receipt.catalogHash, manifestHash: receipt.manifestHash, catalogTemplates: 5486, scannedTemplates: 5486, pages: receipt.pages, stylesheets: 1, contentEntries: 1, imageSlots: 1, themeTokens: 1, diagnosticCount: 0, diagnosticsTruncated: 0, diagnostics: [], diagnosticCountsByCode: {} })

test('manual preparation is bound to its own reviewed workflow and exact SHA', () => {
  const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: REPOSITORY, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: releaseSha, GITHUB_RUN_ID: '12', GITHUB_RUN_ATTEMPT: '1', GITHUB_TOKEN: 'fixture-only', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: `${REPOSITORY}/.github/workflows/prepare-catalogue.yml@refs/heads/main`, GITHUB_WORKFLOW_SHA: releaseSha, EXPECTED_RELEASE_SHA: releaseSha }
  assert.equal(assertPreparationWorkflow(env).workflowSha, releaseSha)
  for (const change of [{ GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_WORKFLOW_SHA: sourceSha }, { EXPECTED_RELEASE_SHA: sourceSha }, { GITHUB_WORKFLOW_REF: `${REPOSITORY}/.github/workflows/rebind-catalogue.yml@refs/heads/main` }]) assert.throws(() => assertPreparationWorkflow({ ...env, ...change }))
})

test('customization must cover every template/page and exact catalogue with no hidden diagnostics', () => {
  assert.equal(validateCustomization(customization('/fixture'), receipt, '/fixture').scannedTemplates, 5486)
  for (const change of [{ root: '/other' }, { pass: false }, { catalogHash: digest }, { manifestHash: hash('other') }, { scannedTemplates: 5485 }, { catalogTemplates: 5485 }, { pages: 5487 }, { diagnosticCount: 1 }, { diagnosticsTruncated: 1 }, { diagnostics: [{}] }, { diagnosticCountsByCode: { ignored: 1 } }, { stylesheets: -1 }]) assert.throws(() => validateCustomization({ ...customization('/fixture'), ...change }, receipt, '/fixture'))
})

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prepare-catalogue-'))
  const sourceBundle = path.join(root, 'source'), bundle = path.join(root, 'fresh')
  const dir = 'aromatherapy/example'
  const files = {
    'certification.json': `${JSON.stringify(receipt, null, 2)}\n`,
    'promotion-dry-run.json': '{"fixture":true}\n',
    'library/_catalog-v3.json': '{}',
    [`library/${dir}/index.html`]: '<h1>Reviewed</h1>',
    [`library/${dir}/.dailyclarity/artifact-tree.json`]: '{}',
    [`library/${dir}/.dailyclarity/final-quality-receipt.json`]: '{}',
  }
  for (const [file, value] of Object.entries(files)) { await mkdir(path.dirname(path.join(sourceBundle, file)), { recursive: true }); await writeFile(path.join(sourceBundle, file), value) }
  const prepared = { manifest: { aromatherapy: [{ dir, files: ['index.html'], pages: ['index.html'] }] }, catalogBytes: Buffer.from('{}'), artifactFiles: Object.entries(files).filter(([file]) => file.startsWith(`library/${dir}/`)).map(([file, value]) => ({ key: file.slice(8), bytes: Buffer.byteLength(value), sha256: hash(value) })) }
  return { root, sourceBundle, bundle, files, sourceSha, sourceReceiptHash: canonicalDigest(receipt), releaseSha, prepare: async (_root, _plan, sha) => ({ ...prepared, receipt: { ...receipt, releaseSha: sha } }), customize: customization }
}

test('fresh certificate preserves every library/plan byte and original certificate without duplicating the expanded catalogue', async () => {
  const f = await fixture()
  try {
    const result = await prepareFreshCandidate(f)
    assert.equal(result.receipt.releaseSha, releaseSha)
    assert.equal(result.browserChecksRepeated, false)
    assert.equal(result.customizationChecksRepeated, true)
    assert.equal(await readFile(path.join(f.sourceBundle, 'certification.json'), 'utf8'), f.files['certification.json'])
    for (const [file, value] of Object.entries(f.files).filter(([file]) => file !== 'certification.json')) assert.equal(await readFile(path.join(f.bundle, file), 'utf8'), value)
    await assert.rejects(readFile(path.join(f.sourceBundle, 'library/_catalog-v3.json')), { code: 'ENOENT' })
    assert.notEqual(result.certificationHash, f.sourceReceiptHash)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('failed current customization, changed source content or changed certificate evidence cannot complete preparation', async () => {
  for (const scenario of ['customization', 'template', 'evidence']) {
    const f = await fixture()
    try {
      if (scenario === 'customization') f.customize = (root) => ({ ...customization(root), pages: 1 })
      if (scenario === 'template') f.customize = async (root) => { await writeFile(path.join(root, 'aromatherapy/example/index.html'), 'changed'); return customization(root) }
      if (scenario === 'evidence') { const prepare = f.prepare; f.prepare = async (...args) => { const value = await prepare(...args); if (args[2] === releaseSha) value.receipt.files++; return value } }
      await assert.rejects(prepareFreshCandidate(f))
      assert.equal(await readFile(path.join(f.sourceBundle, 'certification.json'), 'utf8'), f.files['certification.json'])
    } finally { await rm(f.root, { recursive: true, force: true }) }
  }
})

async function transportFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'prepare-upload-'))
  const output = path.join(root, 'parts'); await mkdir(output)
  const archive = Buffer.from('fixture archive bytes')
  const manifest = { version: 1, format: 'tar+gzip', repository: REPOSITORY, releaseSha, certificationHash: digest, archiveSha256: hash(archive), archiveBytes: archive.length, expandedBytes: 6, files: ['library/_catalog-v3.json', 'promotion-dry-run.json', 'certification.json'].map((file) => ({ path: file, bytes: 2, sha256: digest })), parts: [{ name: 'catalogue.part-00000', bytes: archive.length, sha256: hash(archive) }] }
  const bytes = Buffer.from(`${JSON.stringify(manifest)}\n`)
  await writeFile(path.join(output, manifest.parts[0].name), archive)
  await writeFile(path.join(output, 'transport-manifest.json'), bytes)
  const release = { id: 20, draft: true, published_at: null, target_commitish: releaseSha, tag_name: `dc-transport-${releaseSha}-12-1`, html_url: `https://github.com/${REPOSITORY}/releases/tag/fixture` }
  const assets = [], calls = [], contents = new Map()
  const github = {
    assertMain: async () => { calls.push('main') },
    createDraft: async () => { calls.push('create'); return release },
    json: async (resource) => resource.includes('/assets?') ? assets : release,
    upload: async (_id, name, _bytes, source) => {
      calls.push(name)
      const data = Buffer.isBuffer(source) ? source : await readFile(source)
      const asset = { id: 30 + assets.length, name, state: 'uploaded', size: data.length, digest: `sha256:${hash(data)}` }
      assets.push(asset); contents.set(asset.id, data); return asset
    },
    download: async (asset, destination) => { calls.push(`download:${asset.name}`); const data = contents.get(asset.id); await writeFile(destination, data, { flag: 'wx' }); return { bytes: data.length, sha256: hash(data) } },
  }
  return { root, output, releaseSha, receiptHash: digest, manifestHash: hash(bytes), runId: '12', runAttempt: '1', readbackRoot: path.join(root, 'readback'), github, assets, release, calls }
}

test('upload uses a fresh draft, verifies its canary, uploads parts then manifest and returns exact immutable IDs', async () => {
  const f = await transportFixture()
  try {
    const result = await uploadTransport(f)
    assert.deepEqual(f.calls.filter((value) => value !== 'main'), ['create', 'catalogue-transfer-canary.txt', 'download:catalogue-transfer-canary.txt', 'catalogue.part-00000', 'transport-manifest.json'])
    assert.equal(result.manifestAssetId, '32')
    assert.equal(result.canaryAssetId, '30')
    assert.equal(result.providerPublicationPerformed, false)
    assert.equal(result.draft, true)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('missing server digests require byte readbacks, not unverified metadata acceptance', async () => {
  const f = await transportFixture()
  try {
    const upload = f.github.upload
    f.github.upload = async (...args) => { const asset = await upload(...args); delete asset.digest; return asset }
    await uploadTransport(f)
    assert.equal(f.calls.filter((value) => value.startsWith('download:')).length, 3)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('wrong bytes, extra files and links fail before any draft creation', async () => {
  for (const scenario of ['part', 'manifest', 'extra', 'link']) {
    const f = await transportFixture()
    try {
      if (scenario === 'part') await writeFile(path.join(f.output, 'catalogue.part-00000'), 'tampered')
      if (scenario === 'manifest') f.manifestHash = hash('wrong')
      if (scenario === 'extra') await writeFile(path.join(f.output, 'private.env'), 'fixture')
      if (scenario === 'link') { const file = path.join(f.output, 'catalogue.part-00000'); await rm(file); await symlink('/etc/hosts', file) }
      await assert.rejects(uploadTransport(f))
      assert.deepEqual(f.calls, [])
    } finally { await rm(f.root, { recursive: true, force: true }) }
  }
})

test('main drift, published drafts, substituted assets and failed canary stop before the archive', async () => {
  for (const scenario of ['main', 'published', 'digest', 'canary', 'extra']) {
    const f = await transportFixture()
    try {
      if (scenario === 'main') f.github.assertMain = async () => { throw new Error('advanced main') }
      if (scenario === 'published') f.release.draft = false
      if (scenario === 'digest' || scenario === 'extra') {
        const upload = f.github.upload
        f.github.upload = async (...args) => { const asset = await upload(...args); if (scenario === 'digest') asset.digest = `sha256:${digest}`; else f.assets.push({ ...asset, id: 90 }); return asset }
      }
      if (scenario === 'canary') f.github.download = async () => ({ bytes: TRANSPORT_CANARY.length, sha256: digest })
      await assert.rejects(uploadTransport(f))
      assert.equal(f.calls.includes('catalogue.part-00000'), false)
    } finally { await rm(f.root, { recursive: true, force: true }) }
  }
})

test('preparation client checks remote main and push CI and restricts all mutations to draft creation and transport assets', async () => {
  const calls = []
  const ci = { head_sha: releaseSha, status: 'completed', conclusion: 'success', event: 'push', head_branch: 'main', path: '.github/workflows/ci.yml', head_repository: { full_name: REPOSITORY } }
  let main = releaseSha
  const github = createPreparationGithub('fixture-only', async (url, options) => {
    calls.push({ url, options })
    if (url.includes('git/ref/heads/main')) return Response.json({ ref: 'refs/heads/main', object: { type: 'commit', sha: main } })
    if (url.includes('ci.yml/runs?')) return Response.json({ workflow_runs: [ci] })
    return Response.json({ id: 20 })
  })
  await github.assertMain(releaseSha)
  main = sourceSha; await assert.rejects(github.assertMain(releaseSha), /Main advanced/)
  main = releaseSha; ci.event = 'pull_request'; await assert.rejects(github.assertMain(releaseSha), /successful GitHub CI push/)
  await github.createDraft(releaseSha, '12', '1')
  const creation = calls.at(-1)
  assert.equal(creation.options.method, 'POST')
  assert.equal(JSON.parse(creation.options.body).draft, true)
  assert.equal(JSON.parse(creation.options.body).target_commitish, releaseSha)
  await github.upload('20', 'catalogue-transfer-canary.txt', TRANSPORT_CANARY.length, TRANSPORT_CANARY)
  assert.equal(calls.at(-1).url, `https://uploads.github.com/repos/${REPOSITORY}/releases/20/assets?name=catalogue-transfer-canary.txt`)
  assert.equal(calls.at(-1).options.redirect, 'error')
  const count = calls.length
  await assert.rejects(github.upload('20', 'private.env', 1, Buffer.from('x')))
  await assert.rejects(github.createDraft('main', '12', '1'))
  assert.equal(calls.length, count)
})

test('archive aggregate digest must match even when individual part hashes are valid', async () => {
  const f = await transportFixture()
  try {
    const file = path.join(f.output, 'transport-manifest.json')
    const manifest = JSON.parse(await readFile(file, 'utf8')); manifest.archiveSha256 = digest
    const bytes = Buffer.from(`${JSON.stringify(manifest)}\n`); await writeFile(file, bytes)
    await assert.rejects(verifyTransport(f.output, releaseSha, digest, hash(bytes)), /archive digest/)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('manual workflow keeps protected execution, pinned actions and source checks before the large download', async () => {
  const workflow = await readFile(new URL('../../../.github/workflows/prepare-catalogue.yml', import.meta.url), 'utf8')
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}/)
  assert.match(workflow, /environment: staging/)
  assert.match(workflow, /group: dailyclarity-catalogue-import\n  cancel-in-progress: false/)
  assert.match(workflow, /persist-credentials: false\n\s+fetch-depth: 0/)
  assert.match(workflow, /GITHUB_TOKEN: \$\{\{ github.token \}\}/)
  assert.doesNotMatch(workflow, /secrets\.|workflow_run:|pull_request_target:|contents: inherit|--clobber/)
  const pins = [...workflow.matchAll(/uses: (\S+)/g)].map((match) => match[1])
  assert.ok(pins.length >= 4 && pins.every((action) => /^actions\/(?:checkout|setup-node|download-artifact|upload-artifact)@[a-f0-9]{40}$/.test(action)))
  assert.ok(workflow.indexOf('prepare-catalogue-transport.mjs source-check') < workflow.indexOf('uses: actions/download-artifact'))
  assert.ok(workflow.indexOf('prepare-catalogue-transport.mjs prepare') < workflow.indexOf('prepare-catalogue-transport.mjs upload'))
})
