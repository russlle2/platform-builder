#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, mkdtemp, readFile, realpath, rmdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { reviewedHead } from './certified-catalog-release.mjs'
import { assertPreparationClosureV2, V2_SOURCE_SHA } from './catalogue-prepare-closure-v2.mjs'
import { fingerprintInstalledDependencies, proveInstalledPair } from './catalogue-prepare-dependencies-v2.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const HASH = /^[a-f0-9]{64}$/
const HELPERS = ['catalogue-prepare-closure.mjs', 'catalogue-prepare-closure-v2.mjs', 'catalogue-prepare-dependencies-v2.mjs', 'catalogue-prepare-runtime-v2.mjs', 'catalogue-prepare-proof-v2.mjs']
const same = (a, b) => canonicalDigest(a) === canonicalDigest(b)
function requireThat(value, message) { if (!value) throw new Error(message) }
const digest = (value) => createHash('sha256').update(value).digest('hex')

export function proofChildEnvironment(env) {
  // Dependency installers and historical source probes never receive provider
  // credentials. Proxy/CA configuration is preserved for normal network access.
  for (const name of ['NODE_OPTIONS', 'NODE_PATH', 'TSX_TSCONFIG_PATH', 'TSX_DISABLE_CACHE', 'ESBUILD_BINARY_PATH', 'PLAYWRIGHT_BROWSERS_PATH', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH', 'NODE_PRESERVE_SYMLINKS', 'PNPM_HOME', 'npm_config_node_options']) {
    requireThat(!Object.hasOwn(env, name), `Unexpected ambient dependency loader setting: ${name}`)
  }
  const names = ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'COREPACK_HOME', 'XDG_CACHE_HOME', 'XDG_DATA_HOME', 'XDG_CONFIG_HOME', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'NODE_EXTRA_CA_CERTS', 'NODE_USE_ENV_PROXY', 'SYSTEMROOT', 'WINDIR']
  return { ...Object.fromEntries(names.filter((name) => Object.hasOwn(env, name)).map((name) => [name, env[name]])), CI: 'true', npm_config_userconfig: '/dev/null', npm_config_globalconfig: '/dev/null' }
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
  const childEnv = proofChildEnvironment(env)
  requireThat(process.platform === 'linux' && process.arch === 'x64', 'This reviewed V2 migration is limited to the Linux x64 preparation runner')
  const file = await proofPath(env, repository), parent = path.dirname(file)
  requireThat(reviewedHead(repository) === workflow.workflowSha && same(closure, assertPreparationClosureV2(repository, V2_SOURCE_SHA, workflow.workflowSha)), 'V2 source closure changed before dependency preparation')
  const execute = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, env: childEnv, encoding: 'utf8', maxBuffer: 4 * 1024 ** 2, timeout: 600_000, stdio: ['ignore', 'pipe', 'pipe'] })
  requireThat(execute('corepack', ['pnpm', '--version'], repository).trim() === '11.19.0', 'V2 requires the exact reviewed package manager')
  const temporary = await mkdtemp(path.join(parent, 'catalogue-v2-paired-'))
  const roots = [path.join(temporary, 'source'), path.join(temporary, 'target')]
  const added = []
  let dependencies
  try {
    for (const [index, sha] of [V2_SOURCE_SHA, workflow.workflowSha].entries()) {
      execute('git', ['worktree', 'add', '--detach', roots[index], sha], repository)
      added.push(roots[index])
      execute('corepack', ['pnpm', 'install', '--frozen-lockfile'], roots[index])
      requireThat(reviewedHead(roots[index]) === sha, 'Installation changed tracked or untracked source inputs')
    }
    dependencies = await proveInstalledPair(roots[0], roots[1])
    requireThat(reviewedHead(roots[0]) === V2_SOURCE_SHA && reviewedHead(roots[1]) === workflow.workflowSha, 'Paired source inputs changed during proof')
  } finally {
    // These are task-created ephemeral checkouts only; retain their paths if a
    // normal clean removal fails. Never force-remove an unexpected dirty tree.
    for (const root of added.reverse()) execute('git', ['worktree', 'remove', root], repository)
    await rmdir(temporary)
  }
  const current = await fingerprintInstalledDependencies(repository, '15.5.28')
  const proof = {
    version: 2, kind: 'reviewed-retained-catalogue-dependency-proof', workflow,
    sourceSha: V2_SOURCE_SHA, releaseSha: workflow.workflowSha,
    closureHash: canonicalDigest(closure), verifierHash: await proofVerifierHash(repository),
    nodeVersion: process.version, pnpmVersion: '11.19.0', platform: process.platform, arch: process.arch,
    freshPairedInstall: true, compilerExecuted: false, browserChecksRepeated: false, providerMutations: false,
    dependencies,
  }
  validateV2ProofRecord(proof, { workflow, closure, verifierHash: proof.verifierHash, fingerprintHash: current.fingerprintHash, nodeVersion: process.version })
  requireThat(same(closure, assertPreparationClosureV2(repository, V2_SOURCE_SHA, workflow.workflowSha)), 'Source closure changed during dependency preparation')
  await writeFile(file, `${JSON.stringify(proof, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
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
  }).catch(() => { console.error('V2 dependency preparation failed; no candidate evidence or provider publication was changed.'); process.exitCode = 1 })
}
