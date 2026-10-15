#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, readFile, readdir, writeFile, mkdir, open, rm, statfs } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalDigest, validateCertification } from '../src/lib/templates/certified-catalog-contract.mjs'
import { prepareCertification, reviewedHead, validateConnectedEvidence } from './certified-catalog-release.mjs'

export const REPOSITORY = 'russlle2/platform-builder'
export const MAX_BYTES = 40 * 1024 ** 3
export const MAX_PART_BYTES = 256 * 1024 ** 2
export const TRANSPORT_CANARY = Buffer.from('DailyClarity catalogue transfer canary v1\n')
const HASH = /^[a-f0-9]{64}$/, SHA = /^[a-f0-9]{40}$/, ID = /^[1-9][0-9]{0,15}$/
const SCRIPT = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT, '../../..')
const PROOF_FILES = ['.dailyclarity/artifact-tree.json', '.dailyclarity/final-quality-receipt.json']
const HIDDEN_PROOFS = new Set(['artifact-tree.json', 'final-quality-receipt.json', 'rehabilitation.json', 'quality-receipt.json', 'catalog-v3.json', 'design.json', 'content-preset.json', 'theme-preset.json', 'fingerprint.json', 'assets.json', 'fallback-reason.json'])
const TOP_FILES = ['promotion-dry-run.json', 'certification.json']
const gates = ['stripe', 'email', 'provisioning', 'previewEditing', 'refundRecovery', 'rollback']
export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = async (file) => JSON.parse(await readFile(file, 'utf8'))
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
function requireThat(condition, message) { if (!condition) throw new Error(message) }
function requireId(id) { requireThat(ID.test(String(id)) && Number.isSafeInteger(Number(id)), 'Invalid provider ID'); return String(id) }
function outsideCheckout(value) {
  requireThat(typeof value === 'string' && path.isAbsolute(value), 'Use an absolute temporary path outside the checkout')
  const relative = path.relative(ROOT, value)
  requireThat(relative && (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)), 'Release data must stay outside the clean checkout')
  return value
}

export function safeBundlePath(value) {
  requireThat(typeof value === 'string' && value.length <= 1024 && value.split('/').every((part) => /^[A-Za-z0-9._-]+$/.test(part) && !['.', '..'].includes(part) && !part.endsWith('.') && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)), 'Unsafe or nonportable bundle path')
  return value
}

async function fileRecord(root, relative) {
  safeBundlePath(relative)
  const full = path.join(root, ...relative.split('/'))
  const details = await lstat(full)
  requireThat(details.isFile() && !details.isSymbolicLink() && details.nlink === 1, 'Bundle input must be an unlinked regular file')
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(full)) digest.update(chunk)
  return { path: relative, bytes: details.size, sha256: digest.digest('hex') }
}

async function walk(root, relative = '') {
  const details = await lstat(path.join(root, relative))
  requireThat(!details.isSymbolicLink() && details.isDirectory(), 'Bundle directory must not be a link')
  const result = []
  for (const name of (await readdir(path.join(root, relative))).sort()) {
    const key = relative ? `${relative}/${name}` : name
    safeBundlePath(key)
    const item = await lstat(path.join(root, ...key.split('/')))
    requireThat(!item.isSymbolicLink(), 'Bundle links are forbidden')
    if (item.isDirectory()) result.push(...await walk(root, key))
    else { requireThat(item.isFile() && item.nlink === 1, 'Bundle special or linked files are forbidden'); result.push(key) }
  }
  return result
}

export async function verifyCandidate(bundle, expectedReceiptHash, expectedReleaseSha, prepare = prepareCertification) {
  requireThat(HASH.test(expectedReceiptHash ?? '') && SHA.test(expectedReleaseSha ?? ''), 'Explicit certification identity is required')
  const receipt = validateCertification(await json(path.join(bundle, 'certification.json')), { releaseSha: expectedReleaseSha })
  requireThat(canonicalDigest(receipt) === expectedReceiptHash, 'Certification digest differs from approval')
  const prepared = await prepare(path.join(bundle, 'library'), path.join(bundle, 'promotion-dry-run.json'), expectedReleaseSha)
  requireThat(canonicalDigest(prepared.receipt) === expectedReceiptHash, 'Full library differs from certified evidence')
  return { receipt, receiptHash: expectedReceiptHash, prepared }
}

export async function candidateInventory(bundle, prepared) {
  const expected = new Set(['library/_catalog-v3.json', ...TOP_FILES])
  for (const entry of Object.values(prepared.manifest).flat()) {
    for (const file of [...entry.files, ...PROOF_FILES]) expected.add(`library/${entry.dir}/${file}`)
  }
  const actual = await walk(bundle)
  requireThat(actual.length === expected.size && actual.every((key) => expected.has(key)), 'Candidate contains missing or unexpected files')
  const records = []
  for (const relative of actual) {
    const segments = relative.split('/')
    if (segments.some((segment) => segment.startsWith('.'))) requireThat(segments.length === 5 && segments[0] === 'library' && segments[3] === '.dailyclarity' && HIDDEN_PROOFS.has(segments[4]), 'Only the known compiler proof files may be hidden in an uploaded candidate')
    records.push(await fileRecord(bundle, relative))
  }
  return records
}

export function validateManifest(manifest, expectedSha, expectedReceiptHash) {
  requireThat(exactKeys(manifest, ['version', 'format', 'repository', 'releaseSha', 'certificationHash', 'archiveSha256', 'archiveBytes', 'expandedBytes', 'files', 'parts']), 'Unknown transport manifest fields')
  requireThat(manifest.version === 1 && manifest.format === 'tar+gzip' && manifest.repository === REPOSITORY && manifest.releaseSha === expectedSha && SHA.test(expectedSha ?? '') && manifest.certificationHash === expectedReceiptHash && HASH.test(expectedReceiptHash ?? '') && HASH.test(manifest.archiveSha256 ?? ''), 'Transport identity differs from approval')
  requireThat(Number.isSafeInteger(manifest.expandedBytes) && manifest.expandedBytes > 0 && manifest.expandedBytes <= MAX_BYTES && Number.isSafeInteger(manifest.archiveBytes) && manifest.archiveBytes > 0 && manifest.archiveBytes <= MAX_BYTES, 'Transport size exceeds limits')
  requireThat(Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.files.length <= 500_000 && Array.isArray(manifest.parts) && manifest.parts.length > 0 && manifest.parts.length <= 1024, 'Invalid transport inventory')
  const seen = new Set()
  let bytes = 0
  for (const record of manifest.files) {
    requireThat(exactKeys(record, ['path', 'bytes', 'sha256']), 'Invalid file record fields')
    safeBundlePath(record.path)
    requireThat(TOP_FILES.includes(record.path) || record.path.startsWith('library/'), 'Transport contains non-candidate data')
    requireThat(!seen.has(record.path.toLowerCase()) && Number.isSafeInteger(record.bytes) && record.bytes >= 0 && HASH.test(record.sha256 ?? ''), 'Duplicate or malformed file record')
    seen.add(record.path.toLowerCase()); bytes += record.bytes
  }
  requireThat(bytes === manifest.expandedBytes && TOP_FILES.every((file) => seen.has(file)) && seen.has('library/_catalog-v3.json'), 'Transport inventory is incomplete')
  for (const record of manifest.files) {
    const pieces = record.path.toLowerCase().split('/')
    while (pieces.pop() && pieces.length) requireThat(!seen.has(pieces.join('/')), 'File/directory collision')
  }
  let compressed = 0
  manifest.parts.forEach((part, index) => {
    requireThat(exactKeys(part, ['name', 'bytes', 'sha256']) && part.name === `catalogue.part-${String(index).padStart(5, '0')}` && Number.isSafeInteger(part.bytes) && part.bytes > 0 && part.bytes <= MAX_PART_BYTES && HASH.test(part.sha256 ?? ''), 'Malformed or unordered archive part')
    compressed += part.bytes
  })
  requireThat(compressed === manifest.archiveBytes, 'Archive parts have the wrong total size')
  return manifest
}

export function validateConnectedReport(report, receipt, now = Date.now(), draftEvidenceUrl) {
  requireThat(exactKeys(report, ['releaseSha', 'catalogHash', 'manifestHash', 'certificationHash', 'reviewedAt', 'evidenceUrl', 'checks']) && exactKeys(report.checks, gates), 'Connected report must contain only sanitized review fields')
  validateConnectedEvidence(report, receipt)
  const timestamp = Date.parse(report.reviewedAt)
  requireThat(timestamp <= now + 5 * 60_000 && timestamp >= now - 24 * 60 * 60_000, 'Connected review is stale or future dated')
  const retainedRun = /^https:\/\/github\.com\/russlle2\/platform-builder\/actions\/runs\/[1-9][0-9]*$/.test(report.evidenceUrl)
  const retainedDraft = draftEvidenceUrl && report.evidenceUrl === draftEvidenceUrl && /^https:\/\/github\.com\/russlle2\/platform-builder\/releases\/[A-Za-z0-9/_-]+$/.test(draftEvidenceUrl)
  requireThat(retainedRun || retainedDraft, 'Connected evidence must identify a retained repository run or the exact reviewed draft without private URL data')
  return report
}

export function assertWorkflow(env) {
  requireThat(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_REF === 'refs/heads/main' && SHA.test(env.GITHUB_SHA ?? ''), 'Handoff requires the exact main-branch GitHub workflow')
  requireId(env.GITHUB_RUN_ID); requireId(env.GITHUB_RUN_ATTEMPT)
  requireThat(env.GITHUB_TOKEN, 'Normal workflow GitHub authentication is required')
  return { repository: REPOSITORY, runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, workflowSha: env.GITHUB_SHA }
}

export function createGithub(token, fetcher = fetch) {
  requireThat(token, 'GitHub authentication is missing')
  const root = `https://api.github.com/repos/${REPOSITORY}/`
  return {
    async json(resource) {
      requireThat(/^(?:releases\/[1-9][0-9]*(?:\/assets\?per_page=100&page=[1-9][0-9]*)?|actions\/runs\/[1-9][0-9]*(?:\/attempts\/[1-9][0-9]*)?|actions\/artifacts\/[1-9][0-9]*)$/.test(resource), 'Unapproved GitHub resource')
      const response = await fetcher(root + resource, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' }, redirect: 'error', signal: AbortSignal.timeout(30_000) })
      requireThat(response.ok, `GitHub metadata request failed (${response.status})`)
      return response.json()
    },
    async download(asset, output) {
      const id = requireId(asset.id)
      requireThat(Number.isSafeInteger(asset.size) && asset.size > 0 && asset.size <= MAX_PART_BYTES, 'Asset size exceeds limit')
      let response = await fetcher(`${root}releases/assets/${id}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/octet-stream' }, redirect: 'manual', signal: AbortSignal.timeout(300_000) })
      if (response.status === 302) {
        const target = new URL(response.headers.get('location'))
        requireThat(target.protocol === 'https:' && ['release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(target.hostname) && !target.username && !target.password && !target.port, 'GitHub asset redirected outside trusted storage')
        await response.body?.cancel()
        response = await fetcher(target, { redirect: 'error', signal: AbortSignal.timeout(300_000) })
      }
      requireThat(response.status === 200 && response.body, `GitHub asset download failed (${response.status})`)
      const handle = await open(output, 'wx', 0o600), digest = createHash('sha256')
      let bytes = 0
      try {
        for await (const chunk of response.body) {
          bytes += chunk.byteLength
          requireThat(bytes <= asset.size, 'Asset exceeded declared size')
          digest.update(chunk); await handle.writeFile(chunk)
        }
      } finally { await handle.close() }
      const sha256 = digest.digest('hex')
      requireThat(bytes === asset.size && (!asset.digest || asset.digest === `sha256:${sha256}`), 'GitHub asset bytes differ from provider metadata')
      return { bytes, sha256 }
    },
  }
}

export async function draftAssets(github, releaseId, expectedSha) {
  const id = requireId(releaseId)
  const release = await github.json(`releases/${id}`)
  requireThat(String(release.id) === id && release.draft === true && release.published_at === null && release.target_commitish === expectedSha && release.html_url?.startsWith(`https://github.com/${REPOSITORY}/releases/`), 'Release is not the exact unpublished transfer')
  const assets = []
  for (let page = 1; page <= 12; page++) {
    const batch = await github.json(`releases/${id}/assets?per_page=100&page=${page}`)
    requireThat(Array.isArray(batch) && batch.length <= 100, 'Invalid release asset list')
    assets.push(...batch)
    if (batch.length < 100) return { release, assets }
  }
  throw new Error('Release has too many assets')
}

function approvedAsset(assets, id, name, bytes, sha256) {
  const matches = assets.filter((asset) => id ? String(asset.id) === requireId(id) : asset.name === name)
  requireThat(matches.length === 1, 'Release asset identity is missing or ambiguous')
  const asset = matches[0]
  requireId(asset.id)
  requireThat(asset.state === 'uploaded' && asset.name === name && asset.size === bytes && (!asset.digest || asset.digest === `sha256:${sha256}`), 'Release asset metadata differs from approval')
  return asset
}

function python(mode, spec, source, output) {
  const executable = process.env.CATALOGUE_PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
  return JSON.parse(execFileSync(executable, ['-B', path.join(SCRIPT, 'catalogue-archive.py'), mode, spec, source, output], { encoding: 'utf8', maxBuffer: 2 * 1024 ** 2 }))
}

export async function importCandidate({ github, releaseId, manifestAssetId, manifestHash, receiptHash, releaseSha, workRoot }) {
  requireThat(HASH.test(manifestHash ?? '') && HASH.test(receiptHash ?? '') && SHA.test(releaseSha ?? ''), 'Approved transport digests are required')
  await mkdir(workRoot, { recursive: false })
  const before = await draftAssets(github, releaseId, releaseSha)
  const manifestAsset = before.assets.find((asset) => String(asset.id) === requireId(manifestAssetId))
  requireThat(manifestAsset?.state === 'uploaded' && manifestAsset.name === 'transport-manifest.json' && manifestAsset.size <= 128 * 1024 ** 2, 'Transport manifest is not the approved release asset')
  const manifestPath = path.join(workRoot, 'transport-manifest.json')
  const received = await github.download(manifestAsset, manifestPath)
  requireThat(received.sha256 === manifestHash, 'Transport manifest hash differs from approval')
  const manifest = validateManifest(await json(manifestPath), releaseSha, receiptHash)
  const disk = await statfs(workRoot)
  requireThat(disk.bavail * disk.bsize > manifest.archiveBytes + manifest.expandedBytes + 1024 ** 3, 'Insufficient runner disk space for reviewed catalogue')
  const sourceAssets = [{ id: manifestAsset.id, name: manifestAsset.name, bytes: received.bytes, sha256: received.sha256 }]
  for (const part of manifest.parts) {
    const asset = approvedAsset(before.assets, null, part.name, part.bytes, part.sha256)
    const observed = await github.download(asset, path.join(workRoot, part.name))
    requireThat(observed.sha256 === part.sha256, 'Archive part differs from approved digest')
    sourceAssets.push({ id: asset.id, name: asset.name, bytes: observed.bytes, sha256: observed.sha256 })
  }
  const after = await draftAssets(github, releaseId, releaseSha)
  for (const record of sourceAssets) approvedAsset(after.assets, record.id, record.name, record.bytes, record.sha256)
  const bundle = path.join(workRoot, 'bundle')
  python('unpack', manifestPath, workRoot, bundle)
  return { bundle, manifest, source: { releaseId: Number(releaseId), manifestAssetId: Number(manifestAssetId), manifestHash, assets: sourceAssets } }
}

export async function assertArtifactSource(github, runId, artifactId, sha, allowedWorkflow, expectedName) {
  const [run, artifact] = await Promise.all([github.json(`actions/runs/${requireId(runId)}`), github.json(`actions/artifacts/${requireId(artifactId)}`)])
  requireThat(String(run.id) === String(runId) && run.repository?.full_name === REPOSITORY && run.head_sha === sha && run.head_branch === 'main' && run.event === 'workflow_dispatch' && run.path === allowedWorkflow && run.status === 'completed' && run.conclusion === 'success', 'Candidate producer workflow provenance is invalid')
  requireThat(String(artifact.id) === String(artifactId) && artifact.expired === false && artifact.name === expectedName && artifact.workflow_run?.id === Number(runId) && artifact.workflow_run?.head_sha === sha, 'Candidate artifact is not from the approved producer')
  return { runId: String(runId), runAttempt: String(run.run_attempt), workflowSha: sha, artifactId: String(artifactId), artifactDigest: artifact.digest ?? null }
}

export async function checkDraftTransport(github, releaseId, assetId, sha, output) {
  const before = await draftAssets(github, releaseId, sha)
  const asset = approvedAsset(before.assets, assetId, 'catalogue-transfer-canary.txt', TRANSPORT_CANARY.length, hash(TRANSPORT_CANARY))
  const received = await github.download(asset, output)
  requireThat(received.sha256 === hash(TRANSPORT_CANARY), 'Transport canary bytes differ')
  const after = await draftAssets(github, releaseId, sha)
  approvedAsset(after.assets, assetId, asset.name, asset.size, received.sha256)
  return { releaseId: Number(releaseId), assetId: Number(assetId), sha256: received.sha256, draftTokenAccessVerified: true, fullCatalogueVerified: false }
}

export async function finalizeCandidate({ bundle, connectedFile, connectedHash, receiptHash, releaseSha, prepare = prepareCertification, now, draftEvidenceUrl }) {
  const verified = await verifyCandidate(bundle, receiptHash, releaseSha, prepare)
  const inventory = await candidateInventory(bundle, verified.prepared)
  const raw = await readFile(connectedFile)
  requireThat(HASH.test(connectedHash ?? '') && hash(raw) === connectedHash && raw.length <= 16 * 1024, 'Connected evidence bytes differ from approval')
  validateConnectedReport(JSON.parse(raw.toString('utf8')), verified.receipt, now, draftEvidenceUrl)
  await writeFile(path.join(bundle, 'connected-staging.json'), raw, { flag: 'wx', mode: 0o600 })
  return { receipt: verified.receipt, inventoryHash: canonicalDigest(inventory), connectedEvidenceHash: connectedHash }
}

export async function packCandidate({ bundle, output, receiptHash, releaseSha }) {
  const verified = await verifyCandidate(bundle, receiptHash, releaseSha)
  const inventory = await candidateInventory(bundle, verified.prepared)
  const specPath = `${output}.pack-input.json`
  await writeFile(specPath, JSON.stringify({ files: inventory.map((record) => ({ ...record, source: path.join(bundle, ...record.path.split('/')) })) }), { flag: 'wx', mode: 0o600 })
  try {
    const archive = python('pack', specPath, '-', output)
    const manifest = validateManifest({ version: 1, format: 'tar+gzip', repository: REPOSITORY, releaseSha, certificationHash: receiptHash, ...archive, files: inventory }, releaseSha, receiptHash)
    const bytes = Buffer.from(`${JSON.stringify(manifest)}\n`)
    await writeFile(path.join(output, 'transport-manifest.json'), bytes, { flag: 'wx', mode: 0o600 })
    return { manifestHash: hash(bytes), receiptHash, archiveBytes: archive.archiveBytes, expandedBytes: archive.expandedBytes, parts: archive.parts.length, files: inventory.length }
  } finally { await rm(specPath, { force: true }) }
}

async function main() {
  const mode = process.argv[2], env = process.env
  if (!mode) { console.log('Preparation only. Use explicit pack, check-transport, import, source-check, or finalize with documented environment inputs.'); return }
  const head = reviewedHead()
  if (mode === 'pack') {
    requireThat(env.RELEASE_SHA === head, 'Packing requires the exact final clean checkout')
    outsideCheckout(env.RELEASE_BUNDLE); outsideCheckout(env.TRANSPORT_OUTPUT)
    const nested = path.relative(env.RELEASE_BUNDLE, env.TRANSPORT_OUTPUT)
    requireThat(nested && (nested.startsWith(`..${path.sep}`) || path.isAbsolute(nested)), 'Transport output must not be inside candidate input')
    console.log(JSON.stringify(await packCandidate({ bundle: env.RELEASE_BUNDLE, output: env.TRANSPORT_OUTPUT, receiptHash: env.RECEIPT_HASH, releaseSha: head })))
    return
  }
  const workflow = assertWorkflow(env)
  requireThat(head === env.GITHUB_SHA, 'Workflow checkout differs from its main commit')
  const github = createGithub(env.GITHUB_TOKEN)
  if (mode === 'source-check') {
    console.log(JSON.stringify(await assertArtifactSource(github, env.CANDIDATE_RUN_ID, env.CANDIDATE_ARTIFACT_ID, head, '.github/workflows/import-catalogue.yml', `catalogue-candidate-${head}`)))
    return
  }
  let result
  if (mode === 'check-transport') {
    result = { ...workflow, ...await checkDraftTransport(github, env.TRANSPORT_RELEASE_ID, env.TRANSPORT_MANIFEST_ASSET_ID, head, path.join(env.RUNNER_TEMP, 'verified-transport-canary.txt')) }
  } else if (mode === 'import') {
    outsideCheckout(env.TRANSPORT_WORK_ROOT); outsideCheckout(env.HANDOFF_REPORT)
    result = await importCandidate({ github, releaseId: env.TRANSPORT_RELEASE_ID, manifestAssetId: env.TRANSPORT_MANIFEST_ASSET_ID, manifestHash: env.TRANSPORT_MANIFEST_HASH, receiptHash: env.RECEIPT_HASH, releaseSha: head, workRoot: env.TRANSPORT_WORK_ROOT })
    const verified = await verifyCandidate(result.bundle, env.RECEIPT_HASH, head)
    await candidateInventory(result.bundle, verified.prepared)
    result = { ...workflow, source: result.source, certificationHash: env.RECEIPT_HASH, transportVerified: true }
  } else if (mode === 'finalize') {
    outsideCheckout(env.RELEASE_BUNDLE); outsideCheckout(env.HANDOFF_REPORT)
    const source = await assertArtifactSource(github, env.CANDIDATE_RUN_ID, env.CANDIDATE_ARTIFACT_ID, head, '.github/workflows/import-catalogue.yml', `catalogue-candidate-${head}`)
    const draft = await draftAssets(github, env.CONNECTED_RELEASE_ID, head)
    const asset = draft.assets.find((item) => String(item.id) === requireId(env.CONNECTED_ASSET_ID))
    requireThat(asset?.state === 'uploaded' && asset.name === 'connected-staging.json' && asset.size <= 16 * 1024, 'Connected evidence asset is missing or oversized')
    const connected = path.join(env.RUNNER_TEMP, 'approved-connected-staging.json')
    await github.download(asset, connected)
    const report = await json(connected)
    if (report.evidenceUrl !== draft.release.html_url) {
      const match = /^https:\/\/github\.com\/russlle2\/platform-builder\/actions\/runs\/([1-9][0-9]*)$/.exec(report.evidenceUrl ?? '')
      requireThat(match, 'Connected evidence URL is not an approved retained source')
      const run = await github.json(`actions/runs/${requireId(match[1])}`)
      requireThat(run.repository?.full_name === REPOSITORY && run.head_sha === head && run.head_branch === 'main' && run.status === 'completed' && run.conclusion === 'success', 'Connected evidence run is not successful on this release')
    }
    const after = await draftAssets(github, env.CONNECTED_RELEASE_ID, head)
    approvedAsset(after.assets, asset.id, asset.name, asset.size, env.CONNECTED_EVIDENCE_HASH)
    const finalized = await finalizeCandidate({ bundle: env.RELEASE_BUNDLE, connectedFile: connected, connectedHash: env.CONNECTED_EVIDENCE_HASH, receiptHash: env.RECEIPT_HASH, releaseSha: head, draftEvidenceUrl: draft.release.html_url })
    result = { ...workflow, candidate: source, connectedSource: { releaseId: Number(env.CONNECTED_RELEASE_ID), assetId: asset.id }, certificationHash: env.RECEIPT_HASH, ...finalized }
  } else throw new Error('Unknown handoff operation')
  await writeFile(env.HANDOFF_REPORT, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ operation: mode, certificationHash: env.RECEIPT_HASH, providerPublicationPerformed: false }))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Catalogue handoff failed closed. Provider bodies and credentials suppressed.'); process.exitCode = 1 })
