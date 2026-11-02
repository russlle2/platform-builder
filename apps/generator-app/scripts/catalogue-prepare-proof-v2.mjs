#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, mkdtemp, readFile, realpath, rmdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { reviewedHead } from './certified-catalog-release.mjs'
import { assertPreparationClosureV2, V2_SOURCE_SHA } from './catalogue-prepare-closure-v2.mjs'
import { fingerprintInstalledDependencies, proveInstalledPair, proofChildEnvironment, installProofDependencies } from './catalogue-prepare-dependencies-v2.mjs'

export { proofChildEnvironment } from './catalogue-prepare-dependencies-v2.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const HASH = /^[a-f0-9]{64}$/
const HELPERS = ['catalogue-prepare-closure.mjs', 'catalogue-prepare-closure-v2.mjs', 'catalogue-prepare-dependencies-v2.mjs', 'catalogue-prepare-runtime-v2.mjs', 'catalogue-prepare-proof-v2.mjs']
const same = (a, b) => canonicalDigest(a) === canonicalDigest(b)
function requireThat(value, message) { if (!value) throw new Error(message) }
const digest = (value) => createHash('sha256').update(value).digest('hex')
const PROOF_PHASES = new Set(['preflight', 'environment', 'proof-path', 'source-closure', 'package-manager', 'workspace-create', 'source-checkout', 'source-install', 'source-cleanliness', 'target-checkout', 'target-install', 'target-cleanliness', 'paired-dependencies', 'paired-cleanliness', 'paired-cleanup', 'current-dependencies', 'proof-validation', 'proof-write'])
const KNOWN_FAILURES = new Map([
  ['Retained dependency proof: checkout path must not be a symlink', 'symlink_checkout'],
  ['Retained dependency proof: unexpected pnpm layout', 'pnpm_layout'],
  ['Retained dependency proof: unexpected workspace project set', 'project_set'],
  ['Retained dependency proof: workspace metadata path escapes the checkout', 'workspace_path'],
  ['Retained dependency proof: unreviewed native platform was installed', 'additional_native_platform'],
  ['Retained dependency proof: installed link resolves outside checkout', 'external_link'],
  ['Retained dependency proof: unsafe generated wrapper path', 'unsafe_wrapper_path'],
  ['Retained dependency proof: generated wrapper embeds paths outside known fields', 'unknown_wrapper_path'],
  ['Retained dependency proof: installed path changed during fingerprint', 'installation_race'],
  ['Retained dependency proof: unfinished installation', 'unfinished_installation'],
  ['Retained dependency proof: unexpected installation scope or hook', 'installation_scope'],
  ['Retained dependency proof: ambient module/loader override is present', 'ambient_loader_override'],
  ['Retained dependency proof: installed lock differs from tracked lock', 'installed_lock_mismatch'],
  ['Retained dependency proof: non-Next installed bytes or resolution topology changed', 'installed_pair_differs'],
  ['Retained dependency proof: protected runtime resolution or outputs changed', 'runtime_pair_differs'],
  ['Retained dependency proof: installed pair changed during runtime proof', 'installation_changed'],
  ['Current installed dependencies differ from the independently paired proof', 'current_installation_differs'],
  ['V2 proof runtime differs from the current runner', 'runtime_mismatch'],
  ['V2 requires the exact reviewed package manager', 'package_manager_mismatch'],
  ['Installation changed tracked or untracked source inputs', 'installation_source_changed'],
  ['Paired source inputs changed during proof', 'installation_source_changed'],
  ['V2 source closure changed before dependency preparation', 'source_closure_changed'],
  ['Source closure changed during dependency preparation', 'source_closure_changed'],
])
class V2ProofStageError extends Error {
  constructor(details) {
    super('V2 dependency proof operation failed')
    Object.defineProperty(this, 'details', { value: Object.freeze(details) })
  }
}

/** Only fixed phase/reason identifiers may reach Actions logs; never child output. */
export function v2ProofFailureDetails(error) {
  if (error instanceof V2ProofStageError) return error.details
  const reason = KNOWN_FAILURES.get(error?.message)
    ?? (error instanceof SyntaxError ? 'invalid_metadata_syntax'
      : error?.code === 'ENOENT' ? 'missing_file_or_command'
      : error?.code === 'ETIMEDOUT' ? 'operation_timeout'
        : Number.isInteger(error?.status) && error.status !== 0 ? 'command_failed' : 'unclassified')
  return Object.freeze({ phase: 'preflight', reason })
}

export async function withV2ProofStage(phase, operation) {
  requireThat(PROOF_PHASES.has(phase), 'Unknown V2 proof phase')
  try { return await operation() }
  catch (error) {
    if (error instanceof V2ProofStageError) throw error
    throw new V2ProofStageError({ phase, reason: v2ProofFailureDetails(error).reason })
  }
}

export function retainV2ProofCleanupFailure(primary, cleanup) {
  return new V2ProofStageError({ ...v2ProofFailureDetails(primary), cleanup: v2ProofFailureDetails(cleanup) })
}

export async function proofVerifierHash(repository) {
  const rows = []
  for (const name of HELPERS) rows.push({ name, sha256: digest(await readFile(path.join(repository, 'apps/generator-app/scripts', name))) })
  return canonicalDigest(rows)
}

export function validateV2ProofRecord(proof, { workflow, closure, verifierHash, fingerprintHash, nodeVersion }) {
  requireThat(proof?.version === 2 && proof.kind === 'reviewed-retained-catalogue-dependency-proof', 'A versioned V2 dependency proof is required')
  requireThat(same(proof.workflow, workflow) && proof.sourceSha === V2_SOURCE_SHA && proof.releaseSha === workflow.workflowSha && proof.closureHash === canonicalDigest(closure) && proof.verifierHash === verifierHash, 'V2 proof is from another source, workflow, verifier or release')
  requireThat(proof.nodeVersion === nodeVersion && proof.pnpmVersion === '11.19.0' && proof.platform === 'linux' && proof.arch === 'x64', 'V2 proof runtime differs from the current runner')
  requireThat(proof.freshPairedInstall === true && proof.compilerExecuted === false && proof.browserChecksRepeated === false && proof.providerMutations === false, 'V2 proof must describe retained evidence and fresh dependency installations truthfully')
  requireThat(HASH.test(fingerprintHash) && proof.dependencies?.source?.fingerprintHash === fingerprintHash && proof.dependencies?.target?.fingerprintHash === fingerprintHash, 'Current installed dependencies differ from the independently paired proof')
  requireThat(proof.dependencies.runtime?.equal === true && HASH.test(proof.dependencies.runtime?.hash), 'V2 requires equal isolated runtime resolution and composition observations')
  return proof
}

async function proofPath(env, repository, { existing = false } = {}) {
  const file = env.DEPENDENCY_PROOF_V2
  requireThat(typeof file === 'string' && path.isAbsolute(file), 'V2 proof path must be absolute')
  const parent = await realpath(path.dirname(file)), resolved = path.join(parent, path.basename(file)), checkout = await realpath(repository)
  requireThat(resolved === file && file !== checkout && !file.startsWith(`${checkout}${path.sep}`), 'V2 proof must be outside the clean checkout with an unlinked parent')
  if (existing) {
    const details = await lstat(file)
    requireThat(details.isFile() && !details.isSymbolicLink() && details.nlink === 1 && details.size > 0 && details.size <= 1024 * 1024, 'V2 proof must be a bounded unlinked regular file')
  }
  return file
}

export async function validateCurrentV2Proof({ repository = ROOT, env = process.env, workflow, closure }) {
  proofChildEnvironment(env)
  const file = await proofPath(env, repository, { existing: true })
  const bytes = await readFile(file)
  const proof = JSON.parse(bytes.toString('utf8'))
  const current = await fingerprintInstalledDependencies(repository, '15.5.28')
  validateV2ProofRecord(proof, { workflow, closure, verifierHash: await proofVerifierHash(repository), fingerprintHash: current.fingerprintHash, nodeVersion: process.version })
  return { fileHash: digest(bytes), proof }
}

export async function createV2Proof({ repository = ROOT, env = process.env, workflow, closure }) {
  const childEnv = await withV2ProofStage('environment', () => {
    requireThat(process.platform === 'linux' && process.arch === 'x64', 'This reviewed V2 migration is limited to the Linux x64 preparation runner')
    return proofChildEnvironment(env)
  })
  const file = await withV2ProofStage('proof-path', () => proofPath(env, repository)), parent = path.dirname(file)
  await withV2ProofStage('source-closure', () => requireThat(reviewedHead(repository) === workflow.workflowSha && same(closure, assertPreparationClosureV2(repository, V2_SOURCE_SHA, workflow.workflowSha)), 'V2 source closure changed before dependency preparation'))
  const execute = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, env: childEnv, encoding: 'utf8', maxBuffer: 4 * 1024 ** 2, timeout: 600_000, stdio: ['ignore', 'pipe', 'pipe'] })
  await withV2ProofStage('package-manager', () => requireThat(execute('corepack', ['pnpm', '--version'], repository).trim() === '11.19.0', 'V2 requires the exact reviewed package manager'))
  const temporary = await withV2ProofStage('workspace-create', () => mkdtemp(path.join(parent, 'catalogue-v2-paired-')))
  const roots = [path.join(temporary, 'source'), path.join(temporary, 'target')]
  const added = []
  let dependencies, primaryFailure
  try {
    for (const [index, sha] of [V2_SOURCE_SHA, workflow.workflowSha].entries()) {
      const side = index === 0 ? 'source' : 'target'
      await withV2ProofStage(`${side}-checkout`, () => execute('git', ['worktree', 'add', '--detach', roots[index], sha], repository))
      added.push(roots[index])
      await withV2ProofStage(`${side}-install`, () => installProofDependencies(roots[index], env))
      await withV2ProofStage(`${side}-cleanliness`, () => requireThat(reviewedHead(roots[index]) === sha, 'Installation changed tracked or untracked source inputs'))
    }
    dependencies = await withV2ProofStage('paired-dependencies', () => proveInstalledPair(roots[0], roots[1]))
    await withV2ProofStage('paired-cleanliness', () => requireThat(reviewedHead(roots[0]) === V2_SOURCE_SHA && reviewedHead(roots[1]) === workflow.workflowSha, 'Paired source inputs changed during proof'))
  } catch (error) {
    primaryFailure = error
  } finally {
    // These are task-created ephemeral checkouts only; retain their paths if a
    // normal clean removal fails. Never force-remove an unexpected dirty tree.
    try {
      await withV2ProofStage('paired-cleanup', async () => {
        for (const root of added.reverse()) execute('git', ['worktree', 'remove', root], repository)
        await rmdir(temporary)
      })
    } catch (error) { throw primaryFailure ? retainV2ProofCleanupFailure(primaryFailure, error) : error }
  }
  if (primaryFailure) throw primaryFailure
  const current = await withV2ProofStage('current-dependencies', () => fingerprintInstalledDependencies(repository, '15.5.28'))
  const proof = {
    version: 2, kind: 'reviewed-retained-catalogue-dependency-proof', workflow,
    sourceSha: V2_SOURCE_SHA, releaseSha: workflow.workflowSha,
    closureHash: canonicalDigest(closure), verifierHash: await proofVerifierHash(repository),
    nodeVersion: process.version, pnpmVersion: '11.19.0', platform: process.platform, arch: process.arch,
    freshPairedInstall: true, compilerExecuted: false, browserChecksRepeated: false, providerMutations: false,
    dependencies,
  }
  await withV2ProofStage('proof-validation', () => {
    validateV2ProofRecord(proof, { workflow, closure, verifierHash: proof.verifierHash, fingerprintHash: current.fingerprintHash, nodeVersion: process.version })
    requireThat(same(closure, assertPreparationClosureV2(repository, V2_SOURCE_SHA, workflow.workflowSha)), 'Source closure changed during dependency preparation')
  })
  await withV2ProofStage('proof-write', () => writeFile(file, `${JSON.stringify(proof, null, 2)}\n`, { flag: 'wx', mode: 0o600 }))
  return { fileHash: digest(await readFile(file)), proof }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Loaded only for the explicit workflow step. Importing this helper has no
  // filesystem mutation, install, provider call or release side effect.
  Promise.resolve().then(async () => {
    const { assertPreparationWorkflow } = await import('./prepare-catalogue-transport.mjs')
    requireThat(process.argv[2] === 'prove' && process.env.PREPARATION_CLOSURE_VERSION === '2', 'Use the explicit V2 prove operation')
    const workflow = assertPreparationWorkflow(process.env)
    const closure = assertPreparationClosureV2(ROOT, process.env.SOURCE_SHA, workflow.workflowSha)
    const result = await createV2Proof({ workflow, closure })
    console.log(JSON.stringify({ version: 2, releaseSha: workflow.workflowSha, proofHash: result.fileHash, compilerExecuted: false, browserChecksRepeated: false, providerMutations: false }))
  }).catch((error) => { console.error(`V2 dependency preparation failed ${JSON.stringify(v2ProofFailureDetails(error))}; no candidate evidence or provider publication was changed.`); process.exitCode = 1 })
}
