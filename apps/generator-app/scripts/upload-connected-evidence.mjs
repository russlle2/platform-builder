#!/usr/bin/env node
import { lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { reviewedHead } from './certified-catalog-release.mjs'
import { REPOSITORY, assertWorkflow, createGithub, draftAssets, hash } from './catalogue-handoff.mjs'
import { createPreparationGithub } from './prepare-catalogue-transport.mjs'
import { decodeReviewedBase64, validateReviewedEvidence } from './connected-evidence-contract.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const WORKFLOW = '.github/workflows/upload-connected-evidence.yml'
const INPUT_KEYS = ['expected_release_sha', 'connected_release_id', 'report_base64', 'report_sha256', 'support_base64', 'support_sha256', 'certificate_base64']
const ASSETS = ['connected-staging-support.json', 'connected-staging.json']
export const MAX_DISPATCH_BYTES = 60_000
const MAX_REPORT_BYTES = 16 * 1024, MAX_SUPPORT_BYTES = 32 * 1024, MAX_CERTIFICATE_BYTES = 4 * 1024
class EvidenceUploadError extends Error {}
function requireThat(condition, message) { if (!condition) throw new EvidenceUploadError(message) }
const same = (left, right) => canonicalDigest(left) === canonicalDigest(right)
function id(value) { requireThat(typeof value === 'string' && /^[1-9][0-9]{0,15}$/.test(value) && Number.isSafeInteger(Number(value)), 'Invalid evidence provider identity'); return value }

export function validateDispatchInputs(inputs, { draftEvidenceUrl, now = Date.now() } = {}) {
  requireThat(inputs && typeof inputs === 'object' && !Array.isArray(inputs) && Object.keys(inputs).sort().join(',') === [...INPUT_KEYS].sort().join(',') && Object.values(inputs).every((value) => typeof value === 'string'), 'Evidence dispatch must contain exactly the reviewed string inputs')
  requireThat(Buffer.byteLength(JSON.stringify({ ref: 'main', inputs }), 'utf8') < MAX_DISPATCH_BYTES, 'Combined evidence dispatch exceeds the reviewed input limit')
  requireThat(/^[a-f0-9]{40}$/.test(inputs.expected_release_sha), 'An exact reviewed release SHA is required')
  requireThat(/^[a-f0-9]{64}$/.test(inputs.report_sha256) && /^[a-f0-9]{64}$/.test(inputs.support_sha256), 'Approved raw report and support SHA-256 values are required')
  id(inputs.connected_release_id)
  const report = decodeReviewedBase64(inputs.report_base64, { maximumBytes: MAX_REPORT_BYTES, expectedHash: inputs.report_sha256 })
  const support = decodeReviewedBase64(inputs.support_base64, { maximumBytes: MAX_SUPPORT_BYTES, expectedHash: inputs.support_sha256 })
  const certificate = decodeReviewedBase64(inputs.certificate_base64, { maximumBytes: MAX_CERTIFICATE_BYTES })
  validateReviewedEvidence({ report: report.value, certificate: certificate.value, support: support.value, releaseSha: inputs.expected_release_sha, draftEvidenceUrl: draftEvidenceUrl ?? report.value.evidenceUrl, now })
  return { report, support, certificate }
}

export function assertEvidenceWorkflow(env, inputs) {
  const workflow = assertWorkflow(env)
  requireThat(env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_REF === `${REPOSITORY}/${WORKFLOW}@refs/heads/main` && env.GITHUB_WORKFLOW_SHA === workflow.workflowSha && inputs.expected_release_sha === workflow.workflowSha, 'Evidence upload requires this manual workflow and its explicitly reviewed main SHA')
  return workflow
}

// This client exposes no draft creation, publish, overwrite, delete or dispatch.
export function createEvidenceGithub(token, fetcher = fetch) {
  const reader = createGithub(token, fetcher)
  const { assertMain } = createPreparationGithub(token, fetcher)
  return {
    ...reader, assertMain,
    async upload(releaseId, name, bytes) {
      requireThat(ASSETS.includes(name) && Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= (name === ASSETS[0] ? MAX_SUPPORT_BYTES : MAX_REPORT_BYTES), 'Evidence upload is outside the fixed asset allowlist')
      const response = await fetcher(`https://uploads.github.com/repos/${REPOSITORY}/releases/${id(releaseId)}/assets?name=${name}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60_000),
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'content-length': String(bytes.length), 'X-GitHub-Api-Version': '2022-11-28' }, body: bytes,
      })
      requireThat(response.ok, `Evidence asset upload failed (${response.status})`)
      return response.json()
    },
  }
}

/** Verify retained references, not the truth of an operator's factual observations. */
export async function verifyObservationSources(github, support) {
  const records = [], seen = new Set()
  for (const observation of support.observations) {
    const source = observation.source
    if (!source) continue
    const key = canonicalDigest({ ...source, observedReleaseSha: observation.observedReleaseSha })
    if (seen.has(key)) continue
    seen.add(key)
    const [run, artifact] = await Promise.all([
      github.json(`actions/runs/${id(source.runId)}/attempts/${id(source.runAttempt)}`),
      github.json(`actions/artifacts/${id(source.artifactId)}`),
    ])
    requireThat(String(run.id) === source.runId && String(run.run_attempt) === source.runAttempt && run.repository?.full_name === REPOSITORY && run.head_sha === observation.observedReleaseSha && run.head_branch === 'main' && ['workflow_dispatch', 'push'].includes(run.event) && /^\.github\/workflows\/[A-Za-z0-9_-]+\.ya?ml$/.test(run.path ?? '') && run.status === 'completed' && run.conclusion === 'success', 'Retained evidence workflow identity is invalid')
    requireThat(String(artifact.id) === source.artifactId && artifact.expired === false && String(artifact.workflow_run?.id) === source.runId && artifact.workflow_run?.head_sha === observation.observedReleaseSha && artifact.digest === `sha256:${source.artifactDigest}`, 'Retained evidence artifact identity or digest differs from review')
    // Artifacts do not expose run_attempt. Their creation must fall within the
    // immutable attempt's execution window, not a later rerun of the same run.
    const started = Date.parse(run.run_started_at), ended = Date.parse(run.updated_at), created = Date.parse(artifact.created_at)
    requireThat(Number.isFinite(started) && Number.isFinite(ended) && Number.isFinite(created) && ended >= started && created >= started && created <= ended, 'Retained evidence artifact does not bind the reviewed workflow attempt')
    records.push({ ...source, releaseSha: observation.observedReleaseSha, workflow: run.path })
  }
  return records
}

function assetIdentity(asset) {
  const assetId = id(String(asset?.id))
  requireThat(typeof asset.name === 'string' && Number.isSafeInteger(asset.size) && asset.size >= 0 && asset.state === 'uploaded' && (asset.digest == null || /^sha256:[a-f0-9]{64}$/.test(asset.digest)), 'Draft has invalid existing asset metadata')
  return { id: assetId, name: asset.name, bytes: asset.size, digest: asset.digest ?? null }
}

function assertUploaded(asset, expected) {
  const observed = assetIdentity(asset)
  requireThat(observed.name === expected.name && observed.bytes === expected.bytes && (!observed.digest || observed.digest === `sha256:${expected.sha256}`), 'Evidence asset metadata differs from reviewed bytes')
  return observed
}

export async function uploadReviewedEvidence({ github, inputs, readbackRoot, now = () => Date.now() }) {
  // Validate every input before any metadata call, and before either upload.
  const decoded = validateDispatchInputs(inputs, { now: now() })
  const releaseSha = inputs.expected_release_sha, releaseId = inputs.connected_release_id
  await github.assertMain(releaseSha)
  const before = await draftAssets(github, releaseId, releaseSha)
  validateDispatchInputs(inputs, { draftEvidenceUrl: before.release.html_url, now: now() })
  requireThat(before.assets.length === 0, 'Evidence requires an initially empty reviewed draft; existing assets must never be overwritten or mixed into it')
  const originalAssets = before.assets.map(assetIdentity).sort((a, b) => a.id.localeCompare(b.id))
  requireThat(new Set(originalAssets.map((asset) => asset.id)).size === originalAssets.length, 'Draft asset identities are ambiguous')
  const sourceEvidence = await verifyObservationSources(github, decoded.support.value)
  await mkdir(readbackRoot, { recursive: false })
  const uploaded = []
  const readback = async () => {
    const current = await draftAssets(github, releaseId, releaseSha)
    requireThat(current.release.html_url === before.release.html_url && current.release.tag_name === before.release.tag_name, 'Reviewed draft identity changed')
    const expected = [...originalAssets, ...uploaded.map((item) => item.identity)].sort((a, b) => a.id.localeCompare(b.id))
    requireThat(same(expected, current.assets.map(assetIdentity).sort((a, b) => a.id.localeCompare(b.id))), 'Draft asset identities changed during evidence upload')
  }
  for (const [name, data] of [[ASSETS[0], decoded.support], [ASSETS[1], decoded.report]]) {
    await github.assertMain(releaseSha)
    validateDispatchInputs(inputs, { draftEvidenceUrl: before.release.html_url, now: now() })
    requireThat(same(sourceEvidence, await verifyObservationSources(github, decoded.support.value)), 'Retained evidence provenance changed before upload')
    await readback()
    const expected = { name, bytes: data.bytes.length, sha256: hash(data.bytes) }
    const asset = await github.upload(releaseId, name, data.bytes)
    const identity = assertUploaded(asset, expected)
    requireThat(!originalAssets.some((item) => item.id === identity.id) && !uploaded.some((item) => item.identity.id === identity.id), 'Evidence upload reused an existing asset identity')
    const temporary = path.join(readbackRoot, identity.id)
    // Both small evidence assets always receive a byte-for-byte download check.
    const observed = await github.download(asset, temporary)
    requireThat(same(observed, { bytes: expected.bytes, sha256: expected.sha256 }) && (await readFile(temporary)).equals(data.bytes), 'Evidence asset byte readback differs from review')
    await rm(temporary)
    uploaded.push({ ...expected, id: identity.id, identity })
    await readback()
  }
  await github.assertMain(releaseSha)
  requireThat(same(sourceEvidence, await verifyObservationSources(github, decoded.support.value)), 'Retained evidence provenance changed after upload')
  return { releaseSha, releaseId, evidenceUrl: before.release.html_url, certificationHash: decoded.report.value.certificationHash, support: { assetId: uploaded[0].id, sha256: uploaded[0].sha256, bytes: uploaded[0].bytes }, report: { assetId: uploaded[1].id, sha256: uploaded[1].sha256, bytes: uploaded[1].bytes }, retainedSources: sourceEvidence, providerObservationsIndependentlyVerified: false, operatorReportChanged: false, providerPublicationPerformed: false }
}

async function readLocal(file, maximumBytes) {
  requireThat(typeof file === 'string' && path.isAbsolute(file), 'Use explicit absolute local evidence file paths')
  const details = await lstat(file)
  requireThat(details.isFile() && !details.isSymbolicLink() && details.nlink === 1 && details.size > 0 && details.size <= maximumBytes, 'Local evidence must be an unlinked bounded regular file')
  const bytes = await readFile(file)
  requireThat(bytes.length <= maximumBytes, 'Local evidence grew beyond its bound')
  return bytes
}

async function localPreflight(args) {
  const names = ['report', 'support', 'certificate', 'release-sha', 'draft-url', 'release-id', 'output']
  const options = {}
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.slice(2), value = args[index + 1]
    requireThat(args[index]?.startsWith('--') && names.includes(key) && !Object.hasOwn(options, key) && value && !value.startsWith('--'), 'Invalid local evidence validation arguments')
    options[key] = value
  }
  requireThat(names.filter((name) => name !== 'output').every((name) => options[name]), 'Local validation requires report, support, certificate, release SHA, draft URL and draft ID')
  const [report, support, certificate] = await Promise.all([readLocal(options.report, MAX_REPORT_BYTES), readLocal(options.support, MAX_SUPPORT_BYTES), readLocal(options.certificate, MAX_CERTIFICATE_BYTES)])
  const inputs = { expected_release_sha: options['release-sha'], connected_release_id: options['release-id'], report_base64: report.toString('base64'), report_sha256: hash(report), support_base64: support.toString('base64'), support_sha256: hash(support), certificate_base64: certificate.toString('base64') }
  validateDispatchInputs(inputs, { draftEvidenceUrl: options['draft-url'] })
  if (options.output) {
    requireThat(path.isAbsolute(options.output), 'Dispatch output must be an absolute path')
    const parent = await realpath(path.dirname(options.output)), checkout = await realpath(ROOT), resolved = path.join(parent, path.basename(options.output))
    requireThat(resolved === options.output && resolved !== checkout && !resolved.startsWith(`${checkout}${path.sep}`), 'Dispatch output must stay outside the clean checkout')
    await writeFile(options.output, `${JSON.stringify({ ref: 'main', inputs })}\n`, { flag: 'wx', mode: 0o600 })
  }
  console.log(JSON.stringify({ operation: 'validate', releaseSha: inputs.expected_release_sha, releaseId: inputs.connected_release_id, reportSha256: inputs.report_sha256, supportSha256: inputs.support_sha256, dispatchBytes: Buffer.byteLength(JSON.stringify({ ref: 'main', inputs })), providerObservationsIndependentlyVerified: false, providerPublicationPerformed: false }))
}

async function main() {
  const mode = process.argv[2]
  if (mode === 'validate') { await localPreflight(process.argv.slice(3)); return }
  requireThat(mode === 'upload', 'Use explicit local validate or protected upload')
  const env = process.env
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8')), inputs = event.inputs
  validateDispatchInputs(inputs)
  const workflow = assertEvidenceWorkflow(env, inputs)
  requireThat(reviewedHead() === workflow.workflowSha, 'Evidence upload checkout differs from the reviewed main SHA')
  const runner = await realpath(env.RUNNER_TEMP), checkout = await realpath(ROOT)
  requireThat(runner !== checkout && !runner.startsWith(`${checkout}${path.sep}`), 'Evidence artifacts must stay outside the clean checkout')
  const result = await uploadReviewedEvidence({ github: createEvidenceGithub(env.GITHUB_TOKEN), inputs, readbackRoot: path.join(runner, 'connected-evidence-readback') })
  requireThat(reviewedHead() === workflow.workflowSha, 'Evidence upload checkout changed during validation')
  await writeFile(path.join(runner, 'connected-evidence-upload-report.json'), `${JSON.stringify({ ...workflow, ...result }, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ operation: 'upload', releaseSha: result.releaseSha, releaseId: result.releaseId, support: result.support, report: result.report, providerObservationsIndependentlyVerified: false, providerPublicationPerformed: false }))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => {
  console.error(JSON.stringify({ operation: 'connected-evidence', status: 'failed', reason: error instanceof EvidenceUploadError ? error.message : 'Evidence validation or upload failed; input bytes and provider details suppressed', providerPublicationPerformed: false }))
  process.exitCode = 1
})
