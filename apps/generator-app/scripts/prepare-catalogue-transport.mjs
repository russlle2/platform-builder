#!/usr/bin/env node
import { createReadStream } from 'node:fs'
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, statfs, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalDigest, validateCertification } from '../src/lib/templates/certified-catalog-contract.mjs'
import { prepareCertification, reviewedHead } from './certified-catalog-release.mjs'
import { REPOSITORY, MAX_PART_BYTES, TRANSPORT_CANARY, assertWorkflow, candidateInventory, createGithub, draftAssets, hash, packCandidate, validateManifest, verifyCandidate } from './catalogue-handoff.mjs'
import { assertOriginalImport, verifyImportReport } from './rebind-catalogue.mjs'
import { assertPreparationClosure } from './catalogue-prepare-closure.mjs'
import { assertReleaseCi } from './verify-release-ci.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const WORKFLOW = '.github/workflows/prepare-catalogue.yml'
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/
class PreparationError extends Error {}
function requireThat(condition, message) { if (!condition) throw new PreparationError(message) }
const json = async (file) => JSON.parse(await readFile(file, 'utf8'))
const same = (left, right) => canonicalDigest(left) === canonicalDigest(right)
function id(value) { requireThat(/^[1-9][0-9]{0,15}$/.test(String(value)) && Number.isSafeInteger(Number(value)), 'Invalid provider identity'); return String(value) }

export function assertPreparationWorkflow(env) {
  const workflow = assertWorkflow(env)
  requireThat(env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_REF === `${REPOSITORY}/${WORKFLOW}@refs/heads/main` && env.GITHUB_WORKFLOW_SHA === workflow.workflowSha && env.EXPECTED_RELEASE_SHA === workflow.workflowSha, 'Preparation requires this manual workflow and its explicitly reviewed main SHA')
  return workflow
}

// Fixed API methods deliberately provide no publish, overwrite, delete or dispatch operation.
export function createPreparationGithub(token, fetcher = fetch) {
  const reader = createGithub(token, fetcher)
  const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  const request = async (url, options = {}) => {
    const response = await fetcher(url, { headers, redirect: 'error', signal: AbortSignal.timeout(300_000), ...options })
    requireThat(response.ok, `GitHub preparation request failed (${response.status})`)
    return response.json()
  }
  return {
    ...reader,
    async assertMain(releaseSha) {
      requireThat(SHA.test(releaseSha), 'An exact release SHA is required')
      const base = `https://api.github.com/repos/${REPOSITORY}/`
      const [branch, ci] = await Promise.all([
        request(`${base}git/ref/heads/main`),
        request(`${base}actions/workflows/ci.yml/runs?head_sha=${releaseSha}&status=success&per_page=100`),
      ])
      requireThat(branch.ref === 'refs/heads/main' && branch.object?.type === 'commit' && branch.object.sha === releaseSha, 'Main advanced; prepare a new exact-main transport')
      assertReleaseCi(ci.workflow_runs, releaseSha, REPOSITORY)
    },
    async createDraft(releaseSha, runId, runAttempt) {
      requireThat(SHA.test(releaseSha), 'An exact release SHA is required')
      const tag = `dc-transport-${releaseSha}-${id(runId)}-${id(runAttempt)}`
      return request(`https://api.github.com/repos/${REPOSITORY}/releases`, {
        method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ tag_name: tag, target_commitish: releaseSha, name: `Catalogue transport ${releaseSha}`, body: 'Unpublished transport only. Requires independent protected catalogue import and all existing deployment gates.', draft: true, prerelease: true }),
      })
    },
    async upload(releaseId, name, bytes, source) {
      requireThat(/^(?:catalogue-transfer-canary\.txt|transport-manifest\.json|catalogue\.part-[0-9]{5})$/.test(name) && Number.isSafeInteger(bytes) && bytes > 0 && bytes <= MAX_PART_BYTES, 'Upload is outside the transport allowlist')
      const body = Buffer.isBuffer(source) ? source : createReadStream(source)
      try {
        return await request(`https://uploads.github.com/repos/${REPOSITORY}/releases/${id(releaseId)}/assets?name=${encodeURIComponent(name)}`, {
          method: 'POST', headers: { ...headers, 'content-type': 'application/octet-stream', 'content-length': String(bytes) }, body, duplex: 'half',
        })
      } finally { if (!Buffer.isBuffer(body)) body.destroy() }
    },
  }
}

export function validateCustomization(result, receipt, root) {
  requireThat(result?.root === root && result.pass === true && result.catalogHash === receipt.catalogHash && result.manifestHash === receipt.manifestHash && result.catalogTemplates === 5486 && result.scannedTemplates === 5486 && result.pages === receipt.pages && result.diagnosticCount === 0 && result.diagnosticsTruncated === 0 && Array.isArray(result.diagnostics) && result.diagnostics.length === 0 && result.diagnosticCountsByCode && Object.keys(result.diagnosticCountsByCode).length === 0, 'Current full-catalogue customization verification is incomplete or differs from the candidate')
  const counts = {}
  for (const key of ['stylesheets', 'contentEntries', 'imageSlots', 'themeTokens']) {
    requireThat(Number.isSafeInteger(result[key]) && result[key] >= 0, 'Customization counts are invalid')
    counts[key] = result[key]
  }
  return { pass: true, catalogHash: result.catalogHash, manifestHash: result.manifestHash, catalogTemplates: result.catalogTemplates, scannedTemplates: result.scannedTemplates, pages: result.pages, ...counts, diagnosticCount: 0, diagnosticsTruncated: 0 }
}

function runCustomization(root) {
  const require = createRequire(path.join(ROOT, 'packages/template-factory/package.json'))
  const stdout = execFileSync(process.execPath, [require.resolve('tsx/cli'), path.join(ROOT, 'apps/generator-app/scripts/verify-rehab-customization.ts'), '--root', root, '--workers', '8', '--json'], { cwd: path.join(ROOT, 'apps/generator-app'), encoding: 'utf8', maxBuffer: 2 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'] })
  return JSON.parse(stdout)
}

export async function prepareFreshCandidate({ sourceBundle, bundle, sourceSha, sourceReceiptHash, releaseSha, prepare = prepareCertification, customize = runCustomization }) {
  requireThat(SHA.test(releaseSha) && releaseSha !== sourceSha, 'Fresh preparation requires a distinct exact release SHA')
  const original = await verifyCandidate(sourceBundle, sourceReceiptHash, sourceSha, prepare)
  const before = await candidateInventory(sourceBundle, original.prepared)
  const disk = await statfs(path.dirname(bundle))
  // Keep one expanded library. Tar headers, padding and incompressible gzip can
  // exceed the content size, so reserve a conservative archive bound plus 1 GiB.
  const archiveBudget = Math.ceil(before.reduce((sum, file) => sum + Math.ceil(file.bytes / 512) * 512 + 4096, 0) * 1.02) + 1024 ** 3
  requireThat(disk.bavail * disk.bsize > archiveBudget, 'Insufficient space for the packed transport and verification headroom')
  await mkdir(bundle, { recursive: false })
  // Same-filesystem rename preserves every source byte without a second 4.9 GB
  // copy. The original certificate remains untouched in the source directory.
  await rename(path.join(sourceBundle, 'library'), path.join(bundle, 'library'))
  await rename(path.join(sourceBundle, 'promotion-dry-run.json'), path.join(bundle, 'promotion-dry-run.json'))
  const root = path.join(bundle, 'library')
  const customization = validateCustomization(await customize(root), original.receipt, root)
  const prepared = await prepare(root, path.join(bundle, 'promotion-dry-run.json'), releaseSha)
  const receipt = validateCertification(prepared.receipt, { releaseSha })
  const content = ({ releaseSha: _sha, ...value }) => value
  requireThat(same(content(original.receipt), content(receipt)), 'Fresh certification changed catalogue evidence beyond release identity')
  const certificationBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`)
  await writeFile(path.join(bundle, 'certification.json'), certificationBytes, { flag: 'wx', mode: 0o600 })
  const after = await candidateInventory(bundle, { ...prepared, certificationBytes })
  const unchanged = (inventory) => inventory.filter((file) => file.path !== 'certification.json')
  requireThat(same(unchanged(before), unchanged(after)), 'Fresh preparation changed source template or promotion evidence bytes')
  requireThat((await readFile(path.join(sourceBundle, 'certification.json'))).equals(original.prepared.certificationBytes), 'Original certificate changed during preparation')
  return { certificationHash: canonicalDigest(receipt), receipt, customization, originalInventoryHash: canonicalDigest(before), inventoryHash: canonicalDigest(after), unchangedInventoryHash: canonicalDigest(unchanged(after)), files: after.length, compilerExecuted: false, browserChecksRepeated: false, customizationChecksRepeated: true }
}

async function fileDigest(file, maximum = MAX_PART_BYTES) {
  const details = await lstat(file)
  requireThat(details.isFile() && !details.isSymbolicLink() && details.nlink === 1 && details.size > 0 && details.size <= maximum, 'Transport file must be an unlinked bounded regular file')
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(file)) digest.update(chunk)
  return { bytes: details.size, sha256: digest.digest('hex') }
}

export async function verifyTransport(output, releaseSha, receiptHash, manifestHash) {
  requireThat(HASH.test(manifestHash), 'Explicit packed manifest hash is required')
  const details = await lstat(output)
  requireThat(details.isDirectory() && !details.isSymbolicLink(), 'Transport directory must not be linked')
  const manifestFile = path.join(output, 'transport-manifest.json')
  const observed = await fileDigest(manifestFile, 128 * 1024 ** 2)
  requireThat(observed.sha256 === manifestHash, 'Packed manifest bytes changed')
  const manifest = validateManifest(await json(manifestFile), releaseSha, receiptHash)
  requireThat(same((await readdir(output)).sort(), ['transport-manifest.json', ...manifest.parts.map((part) => part.name)].sort()), 'Unexpected transport file')
  const archive = createHash('sha256')
  for (const part of manifest.parts) {
    const file = path.join(output, part.name)
    requireThat(same(await fileDigest(file), { bytes: part.bytes, sha256: part.sha256 }), 'Packed archive part changed')
    for await (const chunk of createReadStream(file)) archive.update(chunk)
  }
  requireThat(archive.digest('hex') === manifest.archiveSha256, 'Packed archive digest changed')
  return [...manifest.parts, { name: 'transport-manifest.json', ...observed }]
}

function assertAsset(asset, expected) {
  id(asset?.id)
  requireThat(asset.state === 'uploaded' && asset.name === expected.name && asset.size === expected.bytes && (!asset.digest || asset.digest === `sha256:${expected.sha256}`), 'Uploaded asset differs from the prepared bytes')
}

export async function uploadTransport({ github, output, releaseSha, receiptHash, manifestHash, runId, runAttempt, readbackRoot }) {
  const files = await verifyTransport(output, releaseSha, receiptHash, manifestHash)
  await github.assertMain(releaseSha)
  await mkdir(readbackRoot, { recursive: false })
  const created = await github.createDraft(releaseSha, runId, runAttempt)
  const releaseId = id(created.id)
  const expectedTag = `dc-transport-${releaseSha}-${id(runId)}-${id(runAttempt)}`
  requireThat(created.draft === true && created.published_at === null && created.target_commitish === releaseSha && created.tag_name === expectedTag, 'Created release is not the requested new draft')
  const uploaded = []
  const assertDraft = async () => {
    const current = await draftAssets(github, releaseId, releaseSha)
    requireThat(current.release.tag_name === expectedTag && current.assets.length === uploaded.length, 'Draft transport identity or assets changed')
    for (const file of uploaded) {
      const asset = current.assets.find((item) => String(item.id) === file.id)
      assertAsset(asset, file)
    }
  }
  await assertDraft()
  const canary = { name: 'catalogue-transfer-canary.txt', bytes: TRANSPORT_CANARY.length, sha256: hash(TRANSPORT_CANARY) }
  for (const file of [canary, ...files]) {
    await github.assertMain(releaseSha)
    await assertDraft()
    const source = file === canary ? TRANSPORT_CANARY : path.join(output, file.name)
    if (file !== canary) requireThat(same(await fileDigest(source), { bytes: file.bytes, sha256: file.sha256 }), 'Transport bytes changed before upload')
    const asset = await github.upload(releaseId, file.name, file.bytes, source)
    assertAsset(asset, file)
    const record = { ...file, id: id(asset.id) }
    requireThat(!uploaded.some((item) => item.id === record.id), 'Provider reused an uploaded asset identity')
    // Always exercise the canary download. Older provider responses without a
    // digest require an actual bounded download/hash for every affected asset.
    if (file === canary || !asset.digest) {
      const temporary = path.join(readbackRoot, record.id)
      const received = await github.download(asset, temporary)
      requireThat(same(received, { bytes: file.bytes, sha256: file.sha256 }), 'Uploaded asset readback differs from prepared bytes')
      await rm(temporary)
    }
    uploaded.push(record)
    await assertDraft()
  }
  await github.assertMain(releaseSha)
  return { releaseId, tag: expectedTag, releaseSha, certificationHash: receiptHash, manifestHash, canaryAssetId: uploaded[0].id, manifestAssetId: uploaded.at(-1).id, assets: uploaded, draft: true, providerPublicationPerformed: false }
}

async function artifactPaths(env) {
  const keys = ['SOURCE_BUNDLE', 'SOURCE_PROVENANCE_DIR', 'RELEASE_BUNDLE', 'TRANSPORT_OUTPUT', 'PREPARATION_REPORT', 'HANDOFF_REPORT', 'UPLOAD_READBACK_ROOT']
  const paths = []
  const checkout = await realpath(ROOT)
  for (const key of keys) {
    const value = env[key]
    requireThat(typeof value === 'string' && path.isAbsolute(value), 'Artifact paths must be absolute')
    // Parents exist on the runner; reject symlink parents and overlapping paths.
    const parent = await realpath(path.dirname(value))
    const resolved = path.join(parent, path.basename(value))
    requireThat(resolved === value && ![checkout, ...paths].some((other) => value === other || value.startsWith(`${other}${path.sep}`) || other.startsWith(`${value}${path.sep}`)), 'Artifact paths must be distinct and outside the checkout')
    paths.push(value)
  }
}

async function main() {
  const env = process.env, mode = process.argv[2]
  requireThat(['source-check', 'prepare', 'upload'].includes(mode), 'Use explicit source-check, prepare or upload')
  const workflow = assertPreparationWorkflow(env), head = reviewedHead()
  requireThat(head === workflow.workflowSha, 'Preparation checkout differs from the workflow SHA')
  const github = createPreparationGithub(env.GITHUB_TOKEN)
  await github.assertMain(head)
  const inputs = { sourceSha: env.SOURCE_SHA, runId: env.SOURCE_RUN_ID, artifactId: env.SOURCE_ARTIFACT_ID, provenanceId: env.SOURCE_PROVENANCE_ID, artifactDigest: env.SOURCE_ARTIFACT_DIGEST, receiptHash: env.SOURCE_RECEIPT_HASH }
  const closure = assertPreparationClosure(ROOT, inputs.sourceSha, head)
  const source = await assertOriginalImport(github, inputs)
  if (mode === 'source-check') { console.log(JSON.stringify({ workflow, source, closure })); return }
  await artifactPaths(env)
  const provenance = await verifyImportReport(env.SOURCE_PROVENANCE_DIR, source)
  let result
  if (mode === 'prepare') {
    const candidate = await prepareFreshCandidate({ sourceBundle: env.SOURCE_BUNDLE, bundle: env.RELEASE_BUNDLE, sourceSha: inputs.sourceSha, sourceReceiptHash: inputs.receiptHash, releaseSha: head })
    const transport = await packCandidate({ bundle: env.RELEASE_BUNDLE, output: env.TRANSPORT_OUTPUT, receiptHash: candidate.certificationHash, releaseSha: head })
    result = { ...workflow, source, provenance, closure, candidate, transport, providerPublicationPerformed: false }
  } else {
    const prepared = await json(env.PREPARATION_REPORT)
    requireThat(same(prepared.source, source) && same(prepared.closure, closure) && same(prepared.provenance, provenance) && ['repository', 'runId', 'runAttempt', 'workflowSha'].every((key) => prepared[key] === workflow[key]), 'Preparation report is from a different run, source or checkout')
    requireThat(prepared.candidate.customizationChecksRepeated === true && prepared.candidate.compilerExecuted === false && prepared.candidate.browserChecksRepeated === false && prepared.providerPublicationPerformed === false && prepared.transport.receiptHash === prepared.candidate.certificationHash, 'Preparation evidence is incomplete')
    const transport = await uploadTransport({ github, output: env.TRANSPORT_OUTPUT, releaseSha: head, receiptHash: prepared.candidate.certificationHash, manifestHash: prepared.transport.manifestHash, runId: workflow.runId, runAttempt: workflow.runAttempt, readbackRoot: env.UPLOAD_READBACK_ROOT })
    result = { ...prepared, transport, providerPublicationPerformed: false }
  }
  requireThat(same(source, await assertOriginalImport(github, inputs)) && same(closure, assertPreparationClosure(ROOT, inputs.sourceSha, head)), 'Source identity changed during preparation')
  await github.assertMain(head)
  await writeFile(mode === 'prepare' ? env.PREPARATION_REPORT : env.HANDOFF_REPORT, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ operation: mode, releaseSha: head, certificationHash: result.candidate.certificationHash, transport: result.transport, providerPublicationPerformed: false }))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => {
  console.error(JSON.stringify({ operation: 'catalogue-prepare', status: 'failed', reason: error instanceof PreparationError ? error.message : 'Preparation failed; raw candidate and provider details suppressed', providerPublicationPerformed: false }))
  process.exitCode = 1
})
