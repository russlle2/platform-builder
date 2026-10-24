import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { reviewedHead } from './certified-catalog-release.mjs'
import { certificationCore } from './rebind-catalogue.mjs'

const SHA = /^[a-f0-9]{40}$/
const CERTIFICATION = 'apps/generator-app/scripts/certified-catalog-release.mjs'
const FACTORY = 'packages/template-factory/'
export const V2_SOURCE_SHA = '2bc0bd7af293a1cf7de11821baa77ea11613506d'
export const V2_MIGRATION = 'next-15.5.27-to-15.5.28-reviewed-2026-10-24'
export const V2_DEPENDENCY_BLOBS = Object.freeze({
  'apps/client-template/package.json': ['33853168f98473109bdc5299f377e2332b88b45f', '8109496e18e1e07a03ff68a8172ee3e1c186970e'],
  'apps/generator-app/package.json': ['605c9a5422de29f618d7a7e47f319d5362ab7b7a', 'e0e285af77d814eb8f0e6b9773bd7297e1d30c1f'],
  'pnpm-lock.yaml': ['0d4b4483e6db4c0efb21b0f1100e20dcac9e783e', 'b383c66d09718f69b65bdd3d2639da7bf3fc3798'],
})
const hash = (value) => createHash('sha256').update(value).digest('hex')

// V1 remains unmodified. This migration adds only three exact reviewed blob pairs.
import { PREPARATION_REQUIRED_FILES } from './catalogue-prepare-closure.mjs'

const required = new Set(PREPARATION_REQUIRED_FILES)
const moduleStems = PREPARATION_REQUIRED_FILES
  .filter((file) => /\.(?:ts|mjs)$/.test(file))
  .map((file) => file.replace(/\.(?:ts|mjs)$/, ''))
const moduleExtensions = new Set(['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.json', '.node'])

function requireThat(condition, message) { if (!condition) throw new Error(message) }
function git(repository, args) {
  return execFileSync('git', args, { cwd: repository, encoding: 'utf8', maxBuffer: 32 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'] })
}

function tree(repository, sha) {
  const records = new Map()
  for (const record of git(repository, ['ls-tree', '-r', '-z', '--full-tree', sha]).split('\0').filter(Boolean)) {
    const split = record.indexOf('\t'), fields = record.slice(0, split).split(' '), file = record.slice(split + 1)
    requireThat(split > 0 && fields.length === 3 && SHA.test(fields[2]) && file && !records.has(file), 'Malformed preparation source tree')
    records.set(file, { path: file, mode: fields[0], type: fields[1], object: fields[2] })
  }
  return records
}

function isResolutionInput(file) {
  const name = file.slice(file.lastIndexOf('/') + 1)
  // Inspect the union of both trees so newly introduced configuration, packages,
  // patches and competing extensionless-module targets cannot evade the check.
  if (/^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.ya?ml|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|bun\.lockb?|deno\.(?:jsonc?|lock))$/.test(name)) return true
  if (/^(?:\.npmrc|\.yarnrc(?:\.yml)?|\.?pnpmfile\.[cm]?js|\.pnp\.(?:cjs|loader\.mjs)|\.node-version|\.nvmrc|\.tool-versions|\.gitattributes|\.gitmodules)$/.test(name)) return true
  if (/^(?:tsconfig[^/]*\.json|jsconfig[^/]*\.json|\.babelrc(?:\.[cm]?js|\.json)?|babel\.config\.[cm]?js|\.swcrc|(?:next|postcss|tailwind|webpack|rollup|vite|esbuild)\.config\.[cm]?[jt]s)$/.test(name)) return true
  if (/(?:^|\/)(?:patches|\.yarn)(?:\/|$)/.test(file)) return true
  return moduleStems.some((stem) => file.startsWith(`${stem}/`) || file.startsWith(stem) && moduleExtensions.has(file.slice(stem.length)))
}

function assertRegular(record, file) {
  requireThat(record?.type === 'blob' && ['100644', '100755'].includes(record.mode), `Preparation closure requires a regular tracked file: ${file}`)
}

function normalizedPackage(repository, sha) {
  const value = JSON.parse(git(repository, ['show', `${sha}:package.json`]))
  requireThat(value && !Array.isArray(value) && value.scripts && !Array.isArray(value.scripts) && typeof value.scripts.test === 'string', 'Root package test command must remain an explicit string')
  return { ...value, scripts: { ...value.scripts, test: '' } }
}

// Pure tree comparison supports adversarial mutation tests without changing the
// fixed production source/target identity checks. Values originate from git ls-tree.
export function assertRetainedTreeV2(before, after) {
  for (const file of PREPARATION_REQUIRED_FILES) {
    assertRegular(before.get(file), file)
    assertRegular(after.get(file), file)
  }
  const protectedRecords = [], changed = []
  for (const file of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const oldRecord = before.get(file), newRecord = after.get(file)
    const identical = canonicalDigest(oldRecord ?? null) === canonicalDigest(newRecord ?? null)
    if (!identical) changed.push({ path: file, before: oldRecord ?? null, after: newRecord ?? null })
    if (!required.has(file) && !file.startsWith(FACTORY) && !isResolutionInput(file)) continue
    assertRegular(oldRecord, file)
    assertRegular(newRecord, file)
    requireThat(oldRecord.mode === newRecord.mode, `Preparation closure file mode changed: ${file}`)
    if (Object.hasOwn(V2_DEPENDENCY_BLOBS, file)) {
      const [sourceBlob, targetBlob] = V2_DEPENDENCY_BLOBS[file]
      requireThat(oldRecord.object === sourceBlob && newRecord.object === targetBlob, `Unreviewed V2 dependency transition: ${file}`)
      protectedRecords.push(newRecord)
      continue
    }
    if (file === 'package.json' || file === CERTIFICATION) continue
    requireThat(identical, `Preparation compiler, renderer or dependency input changed: ${file}`)
    protectedRecords.push(newRecord)
  }
  return { protectedRecords, changed }
}

/**
 * Reuse already reviewed browser evidence only while its compiler, renderer,
 * validation and dependency inputs remain unchanged. Other application changes
 * still need fresh whole-catalogue customization and connected staging checks.
 */
export function assertPreparationClosureV2(repository, sourceSha, releaseSha) {
  requireThat(sourceSha === V2_SOURCE_SHA, 'V2 requires the exact reviewed original source commit')
  requireThat(SHA.test(sourceSha ?? '') && SHA.test(releaseSha ?? ''), 'Preparation requires exact source and release commits')
  requireThat(reviewedHead(repository) === releaseSha, 'Preparation target must be the exact clean checkout')
  try { git(repository, ['merge-base', '--is-ancestor', sourceSha, releaseSha]) }
  catch { throw new Error('Preparation source must be an ancestor of the target commit') }
  const before = tree(repository, sourceSha), after = tree(repository, releaseSha)
  const { protectedRecords, changed } = assertRetainedTreeV2(before, after)
  const protectedPackage = normalizedPackage(repository, releaseSha)
  requireThat(canonicalDigest(normalizedPackage(repository, sourceSha)) === canonicalDigest(protectedPackage), 'Only the root package test command may change; dependencies and other package fields must remain identical')
  const originalCore = certificationCore(git(repository, ['show', `${sourceSha}:${CERTIFICATION}`]))
  const currentCore = certificationCore(git(repository, ['show', `${releaseSha}:${CERTIFICATION}`]))
  requireThat(originalCore === currentCore, 'Certification computations, byte checks, publication and CLI commands must remain byte-identical')
  return {
    version: 2,
    migration: V2_MIGRATION,
    dependencyBlobPairs: V2_DEPENDENCY_BLOBS,
    sourceSha,
    releaseSha,
    protectedFiles: protectedRecords.length,
    protectedRecords,
    protectedTreeHash: canonicalDigest(protectedRecords),
    protectedPackageHash: canonicalDigest(protectedPackage),
    certificationCoreHash: hash(currentCore),
    changed,
  }
}
