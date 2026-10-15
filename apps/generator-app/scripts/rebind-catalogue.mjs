#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { lstat, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalDigest, validateCertification } from '../src/lib/templates/certified-catalog-contract.mjs'
import { prepareCertification, reviewedHead } from './certified-catalog-release.mjs'
import { REPOSITORY, assertArtifactSource, assertWorkflow, candidateInventory, createGithub, hash, verifyCandidate } from './catalogue-handoff.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/
const IMPORT = '.github/workflows/import-catalogue.yml'
// No app, compiler, dependency, lockfile, build configuration or asset may drift.
// Keep this list explicit: a directory-wide exception would lose that guarantee.
export const RELEASE_ONLY_PATHS = Object.freeze([
  '.github/workflows/rebind-catalogue.yml',
  '.github/workflows/staging-catalogue.yml',
  'apps/generator-app/scripts/certified-catalog-release.mjs',
  'apps/generator-app/scripts/certified-catalog-release.test.mjs',
  ...['catalogue-handoff', 'run-staging-catalogue', 'rebind-catalogue', 'release-read-retry', 'reuse-staging-snapshot'].flatMap((name) => [`apps/generator-app/scripts/${name}.mjs`, `apps/generator-app/scripts/${name}.test.mjs`]),
])
const ADDED_TESTS = ['rebind-catalogue', 'release-read-retry', 'reuse-staging-snapshot'].map((name) => `apps/generator-app/scripts/${name}.test.mjs`)
class RebindValidationError extends Error {}
function requireThat(condition, message) { if (!condition) throw new RebindValidationError(message) }
function git(repository, args) { return execFileSync('git', args, { cwd: repository, encoding: 'utf8', maxBuffer: 32 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'] }) }

export function certificationCore(source) {
  const importPattern = /^import \{ [A-Za-z, ]+ \} from '\.\/release-read-retry\.mjs'\n/gm
  const normalized = source.replace(importPattern, '')
  const start = normalized.indexOf('\nasync function api('), end = normalized.indexOf('\nexport async function main(')
  const cli = normalized.indexOf('\nif (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(')
  requireThat(start > 0 && end > start && cli > end, 'Certification source boundaries are unavailable')
  // Everything which computes or checks a certificate, validates bytes, controls
  // publication, or implements CLI commands is retained exactly. Only provider
  // read plumbing and the final error-reporting handler are release plumbing.
  return normalized.slice(0, start) + '\n[provider read plumbing]\n' + normalized.slice(end, cli) + '\n[CLI error reporting]\n'
}

export function assertPackageTestOnly(before, after) {
  const oldScript = before?.scripts?.test, newScript = after?.scripts?.test
  requireThat(typeof oldScript === 'string' && typeof newScript === 'string' && newScript.startsWith(oldScript), 'Package changes may only append the reviewed release tests')
  const normalize = (value) => ({ ...value, scripts: { ...value.scripts, test: '' } })
  requireThat(canonicalDigest(normalize(before)) === canonicalDigest(normalize(after)), 'Dependencies and all other package fields must remain identical')
  const suffix = newScript.slice(oldScript.length)
  if (!suffix) return
  const argumentsOnly = suffix.startsWith(' && node --test ') ? suffix.slice(' && node --test '.length) : suffix.startsWith(' ') ? suffix.slice(1) : ''
  const added = argumentsOnly.split(' ')
  requireThat(added.length > 0 && new Set(added).size === added.length && added.every((item) => ADDED_TESTS.includes(item)), 'Only the exact new release test files may be appended')
}

function tree(repository, sha) {
  return new Map(git(repository, ['ls-tree', '-r', '-z', '--full-tree', sha]).split('\0').filter(Boolean).map((record) => {
    const split = record.indexOf('\t'), fields = record.slice(0, split).split(' '), file = record.slice(split + 1)
    requireThat(split > 0 && fields.length === 3 && SHA.test(fields[2]) && file, 'Malformed tracked source tree')
    return [file, { path: file, mode: fields[0], type: fields[1], object: fields[2] }]
  }))
}

export function assertSourceClosure(repository, sourceSha, releaseSha) {
  requireThat(SHA.test(sourceSha ?? '') && SHA.test(releaseSha ?? '') && sourceSha !== releaseSha, 'Rebind requires distinct exact source and target commits')
  requireThat(reviewedHead(repository) === releaseSha, 'Rebind target must be the exact clean checkout')
  git(repository, ['merge-base', '--is-ancestor', sourceSha, releaseSha])
  const before = tree(repository, sourceSha), after = tree(repository, releaseSha)
  const changed = [], protectedTree = []
  for (const file of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const oldRecord = before.get(file), newRecord = after.get(file)
    if (canonicalDigest(oldRecord ?? null) === canonicalDigest(newRecord ?? null)) {
      if (!RELEASE_ONLY_PATHS.includes(file) && file !== 'package.json') protectedTree.push(newRecord)
      continue
    }
    requireThat(RELEASE_ONLY_PATHS.includes(file) || file === 'package.json', 'Source reuse is forbidden after a non-release change')
    requireThat(newRecord?.type === 'blob' && ['100644', '100755'].includes(newRecord.mode) && (!oldRecord || oldRecord.type === 'blob' && oldRecord.mode === newRecord.mode), 'Release tooling cannot be deleted, linked, or change file mode')
    if (file === 'package.json') {
      requireThat(oldRecord, 'Existing package configuration is required')
      assertPackageTestOnly(JSON.parse(git(repository, ['show', `${sourceSha}:package.json`])), JSON.parse(git(repository, ['show', `${releaseSha}:package.json`])))
    }
    if (file === 'apps/generator-app/scripts/certified-catalog-release.mjs') {
      requireThat(oldRecord, 'The original certification implementation is required')
      const originalCore = certificationCore(git(repository, ['show', `${sourceSha}:${file}`]))
      const currentCore = certificationCore(git(repository, ['show', `${releaseSha}:${file}`]))
      requireThat(originalCore === currentCore, 'Certification computations, byte checks, publication and CLI commands must remain byte-identical')
    }
    changed.push({ path: file, before: oldRecord?.object ?? null, after: newRecord.object })
  }
  requireThat(changed.length > 0, 'No reviewed release-tooling change requires a source rebind')
  // Include the package fields in the protected closure, apart from its explicitly
  // checked test command. pnpm-lock.yaml remains in protectedTree byte-for-byte.
  const pkg = JSON.parse(git(repository, ['show', `${releaseSha}:package.json`]))
  const protectedPackage = { ...pkg, scripts: { ...pkg.scripts, test: '' } }
  const certification = 'apps/generator-app/scripts/certified-catalog-release.mjs'
  const certificationCoreHash = hash(certificationCore(git(repository, ['show', `${releaseSha}:${certification}`])))
  return { sourceSha, releaseSha, protectedFiles: protectedTree.length, protectedTreeHash: canonicalDigest(protectedTree), protectedPackageHash: canonicalDigest(protectedPackage), certificationCoreHash, changed }
}

export async function assertOriginalImport(github, inputs) {
  requireThat(SHA.test(inputs.sourceSha ?? '') && HASH.test(inputs.receiptHash ?? '') && HASH.test(inputs.artifactDigest ?? ''), 'Explicit original source and artifact digests are required')
  const candidate = await assertArtifactSource(github, inputs.runId, inputs.artifactId, inputs.sourceSha, IMPORT, `catalogue-candidate-${inputs.sourceSha}`)
  requireThat(candidate.artifactDigest === `sha256:${inputs.artifactDigest}`, 'Original immutable artifact digest differs from approval')
  const provenance = await assertArtifactSource(github, inputs.runId, inputs.provenanceId, inputs.sourceSha, IMPORT, `catalogue-import-provenance-${candidate.runId}-${candidate.runAttempt}`)
  requireThat(provenance.runAttempt === candidate.runAttempt && provenance.artifactId !== candidate.artifactId, 'Import provenance does not bind the same original attempt')
  return { candidate, provenance, certificationHash: inputs.receiptHash }
}

export async function verifyImportReport(directory, source) {
  const entries = await readdir(directory)
  requireThat(entries.length === 1 && entries[0] === 'catalogue-import-report.json', 'Original provenance artifact must contain only its import report')
  const file = path.join(directory, entries[0]), details = await lstat(file)
  requireThat(details.isFile() && !details.isSymbolicLink() && details.nlink === 1 && details.size <= 128 * 1024, 'Original import report is invalid or oversized')
  const raw = await readFile(file), report = JSON.parse(raw.toString('utf8')), expected = source.candidate
  requireThat(report.repository === REPOSITORY && report.runId === expected.runId && report.runAttempt === expected.runAttempt && report.workflowSha === expected.workflowSha && report.transportVerified === true && report.certificationHash === source.certificationHash && report.artifact?.id === expected.artifactId && `sha256:${report.artifact?.digest}` === expected.artifactDigest, 'Original import report differs from the approved producer and artifact')
  requireThat(Number.isSafeInteger(report.source?.releaseId) && Number.isSafeInteger(report.source?.manifestAssetId) && HASH.test(report.source?.manifestHash ?? '') && Array.isArray(report.source?.assets) && report.source.assets.length > 1, 'Original transport provenance is incomplete')
  return { reportHash: hash(raw), transportManifestHash: report.source.manifestHash }
}

export async function rebindCandidate({ bundle, sourceReceiptHash, sourceSha, releaseSha, prepare = prepareCertification, onPhase = () => {} }) {
  requireThat(SHA.test(releaseSha ?? '') && releaseSha !== sourceSha, 'A distinct target release is required')
  onPhase('verify-old-candidate')
  const original = await verifyCandidate(bundle, sourceReceiptHash, sourceSha, prepare)
  onPhase('verify-old-inventory')
  const before = await candidateInventory(bundle, original.prepared)
  onPhase('prepare-new-certificate')
  const prepared = await prepare(path.join(bundle, 'library'), path.join(bundle, 'promotion-dry-run.json'), releaseSha)
  const receipt = validateCertification(prepared.receipt, { releaseSha })
  const contentIdentity = (value) => { const { releaseSha: _releaseSha, ...content } = value; return canonicalDigest(content) }
  requireThat(contentIdentity(original.receipt) === contentIdentity(receipt), 'Recomputed catalogue evidence changed beyond its release identity')
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`)
  const target = path.join(bundle, 'certification.json'), temporary = `${bundle}.certification-rebind.tmp`
  requireThat((await readFile(target)).equals(original.prepared.certificationBytes), 'Original certificate changed during verification')
  onPhase('replace-verified-certificate')
  try {
    await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 })
    await rename(temporary, target)
  } finally { await rm(temporary, { force: true }) }
  onPhase('verify-new-inventory')
  const after = await candidateInventory(bundle, { ...prepared, certificationBytes: bytes })
  const withoutCertificate = (inventory) => inventory.filter((record) => record.path !== 'certification.json')
  requireThat(canonicalDigest(withoutCertificate(before)) === canonicalDigest(withoutCertificate(after)), 'Rebind changed candidate bytes beyond the certificate')
  return { certificationHash: canonicalDigest(receipt), receipt, originalInventoryHash: canonicalDigest(before), inventoryHash: canonicalDigest(after), unchangedInventoryHash: canonicalDigest(withoutCertificate(after)), files: after.length, changedFiles: ['certification.json'] }
}

function outsideCheckout(value) {
  requireThat(typeof value === 'string' && path.isAbsolute(value), 'Use absolute release paths outside the checkout')
  const relative = path.relative(ROOT, value)
  requireThat(relative && (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)), 'Release artifacts must remain outside the clean checkout')
}

let phase = 'initialization'
function enterPhase(value) { phase = value; console.log(JSON.stringify({ operation: 'catalogue-rebind', phase, startedAt: new Date().toISOString() })) }
async function main() {
  const env = process.env, mode = process.argv[2]
  requireThat(['source-check', 'rebind'].includes(mode), 'Explicit source-check or rebind operation is required')
  const workflow = assertWorkflow(env), head = reviewedHead()
  requireThat(head === env.GITHUB_SHA, 'Workflow differs from the exact main checkout')
  enterPhase('source-closure')
  const closure = assertSourceClosure(ROOT, env.SOURCE_SHA, head)
  const github = createGithub(env.GITHUB_TOKEN)
  const inputs = { sourceSha: env.SOURCE_SHA, runId: env.SOURCE_RUN_ID, artifactId: env.SOURCE_ARTIFACT_ID, provenanceId: env.SOURCE_PROVENANCE_ID, artifactDigest: env.SOURCE_ARTIFACT_DIGEST, receiptHash: env.SOURCE_RECEIPT_HASH }
  enterPhase('source-provenance')
  const source = await assertOriginalImport(github, inputs)
  if (mode === 'source-check') { console.log(JSON.stringify({ ...source, closure })); return }
  for (const value of [env.RELEASE_BUNDLE, env.SOURCE_PROVENANCE_DIR, env.HANDOFF_REPORT]) outsideCheckout(value)
  enterPhase('provenance-report')
  const provenance = await verifyImportReport(env.SOURCE_PROVENANCE_DIR, source)
  const result = await rebindCandidate({ bundle: env.RELEASE_BUNDLE, sourceReceiptHash: inputs.receiptHash, sourceSha: inputs.sourceSha, releaseSha: head, onPhase: enterPhase })
  enterPhase('source-provenance-readback')
  requireThat(canonicalDigest(source) === canonicalDigest(await assertOriginalImport(github, inputs)), 'Original provider provenance changed during rebind')
  enterPhase('source-closure-readback')
  requireThat(canonicalDigest(closure) === canonicalDigest(assertSourceClosure(ROOT, inputs.sourceSha, head)), 'Source closure changed during rebind')
  enterPhase('report')
  await writeFile(env.HANDOFF_REPORT, `${JSON.stringify({ ...workflow, source, provenance, closure, ...result, compilerExecuted: false, browserChecksRepeated: false, providerPublicationPerformed: false }, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ operation: mode, certificationHash: result.certificationHash, files: result.files, changedFiles: result.changedFiles, providerPublicationPerformed: false }))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => {
  console.error(JSON.stringify({ operation: 'catalogue-rebind', phase, status: 'failed', reason: error instanceof RebindValidationError ? error.message : 'Operation failed; raw provider and candidate details suppressed', errorClass: ['Error', 'TypeError', 'SyntaxError', 'RangeError'].includes(error?.constructor?.name) ? error.constructor.name : 'OtherError', candidatePublished: false }))
  process.exitCode = 1
})
