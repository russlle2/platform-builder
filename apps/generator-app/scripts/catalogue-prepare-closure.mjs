import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { reviewedHead } from './certified-catalog-release.mjs'
import { certificationCore } from './rebind-catalogue.mjs'

const SHA = /^[a-f0-9]{40}$/
const CERTIFICATION = 'apps/generator-app/scripts/certified-catalog-release.mjs'
const FACTORY = 'packages/template-factory/'
const hash = (value) => createHash('sha256').update(value).digest('hex')

// These are the complete transitive source dependencies of the three modules
// loaded by the factory's customer-preview-adapter. Retained browser receipts
// cannot authorize changes to any of their implementation bytes.
export const PREPARATION_RUNTIME_FILES = Object.freeze([
  'compiler-theme.ts',
  'custom-theme.ts',
  'customer-preview-document.ts',
  'customer-preview-editor-runtime.ts',
  'image-owner.ts',
  'image-swaps.ts',
  'inline-edits.ts',
  'template-preview-composition.ts',
  'template-preview-security.ts',
  'templates/template-hydration.ts',
  'templates/variations.ts',
].map((file) => `apps/generator-app/src/lib/${file}`))

export const PREPARATION_REQUIRED_FILES = Object.freeze([
  ...PREPARATION_RUNTIME_FILES,
  'packages/template-factory/src/legacy/customer-preview-adapter.ts',
  // repair.ts reexports this app-owned script into the emitted template bytes.
  'apps/generator-app/src/lib/compiler-compatibility-runtime.ts',
  'apps/generator-app/scripts/upload-templates-to-blobs.mjs',
  'apps/generator-app/scripts/verify-rehab-customization.ts',
  'apps/generator-app/src/lib/rehab-customization-verifier.ts',
  'apps/generator-app/src/lib/templates/certified-catalog-contract.mjs',
  // The uploader reads these documents directly at module initialization;
  // they are validation inputs even though no import statement names them.
  'apps/generator-app/src/lib/templates/launch-catalog-contract.json',
  'apps/generator-app/src/lib/templates/launch-catalog-approved-receipt.json',
  'apps/generator-app/src/lib/templates/rehab-catalog-contract.json',
  'apps/generator-app/src/lib/templates/niche-meta.ts',
  'package.json',
  'apps/generator-app/package.json',
  'packages/template-factory/package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  'tsconfig.base.json',
  'apps/generator-app/tsconfig.json',
  'packages/template-factory/tsconfig.json',
  CERTIFICATION,
])

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

/**
 * Reuse already reviewed browser evidence only while its compiler, renderer,
 * validation and dependency inputs remain unchanged. Other application changes
 * still need fresh whole-catalogue customization and connected staging checks.
 */
export function assertPreparationClosure(repository, sourceSha, releaseSha) {
  requireThat(SHA.test(sourceSha ?? '') && SHA.test(releaseSha ?? ''), 'Preparation requires exact source and release commits')
  requireThat(reviewedHead(repository) === releaseSha, 'Preparation target must be the exact clean checkout')
  try { git(repository, ['merge-base', '--is-ancestor', sourceSha, releaseSha]) }
  catch { throw new Error('Preparation source must be an ancestor of the target commit') }
  const before = tree(repository, sourceSha), after = tree(repository, releaseSha)
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
    if (file === 'package.json' || file === CERTIFICATION) continue
    requireThat(identical, `Preparation compiler, renderer or dependency input changed: ${file}`)
    protectedRecords.push(newRecord)
  }
  const protectedPackage = normalizedPackage(repository, releaseSha)
  requireThat(canonicalDigest(normalizedPackage(repository, sourceSha)) === canonicalDigest(protectedPackage), 'Only the root package test command may change; dependencies and other package fields must remain identical')
  const originalCore = certificationCore(git(repository, ['show', `${sourceSha}:${CERTIFICATION}`]))
  const currentCore = certificationCore(git(repository, ['show', `${releaseSha}:${CERTIFICATION}`]))
  requireThat(originalCore === currentCore, 'Certification computations, byte checks, publication and CLI commands must remain byte-identical')
  return {
    version: 1,
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
