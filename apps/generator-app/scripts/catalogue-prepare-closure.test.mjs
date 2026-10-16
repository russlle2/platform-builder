import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { assertPreparationClosure, PREPARATION_REQUIRED_FILES, PREPARATION_RUNTIME_FILES } from './catalogue-prepare-closure.mjs'

const CERTIFICATION = 'apps/generator-app/scripts/certified-catalog-release.mjs'
const certification = `import { getStore } from '@netlify/blobs'
export function prepareCertification() { return 'unchanged certificate computation' }
async function api(resource) { return fetch(resource) }
export async function connectedTarget() { return getStore({}) }
export async function main() { return 'unchanged command gates' }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
`
const packageValue = () => ({ name: 'preparation-fixture', scripts: { test: 'node --test original.test.mjs', build: 'unchanged' }, dependencies: { package: '1.0.0' }, packageManager: 'pnpm@11.19.0' })

async function fixture() {
  const repository = await mkdtemp(path.join(os.tmpdir(), 'catalogue-preparation-closure-'))
  const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const put = async (file, bytes) => { await mkdir(path.dirname(path.join(repository, file)), { recursive: true }); await writeFile(path.join(repository, file), bytes) }
  const commit = () => { git('add', '.'); git('-c', 'user.name=Preparation Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture'); return git('rev-parse', 'HEAD') }
  git('init', '-q')
  for (const file of PREPARATION_REQUIRED_FILES) await put(file, file.endsWith('package.json') ? JSON.stringify(packageValue()) : `original ${file}`)
  await put(CERTIFICATION, certification)
  await put('apps/generator-app/src/app/page.tsx', 'original UI')
  await put('packages/template-factory/foundations/example.html', '<main>original foundation</main>')
  const source = commit()
  return { repository, git, put, commit, source }
}

test('fresh preparation accepts UI changes and root test changes while recording unchanged closure', async () => {
  const f = await fixture()
  try {
    await f.put('apps/generator-app/src/app/page.tsx', 'improved UI')
    const pkg = packageValue(); pkg.scripts.test += ' && node --test preparation.test.mjs'
    await f.put('package.json', JSON.stringify(pkg, null, 2))
    const target = f.commit(), result = assertPreparationClosure(f.repository, f.source, target)
    assert.equal(PREPARATION_RUNTIME_FILES.length, 11)
    assert.equal(result.sourceSha, f.source)
    assert.equal(result.releaseSha, target)
    assert.equal(result.protectedTreeHash, canonicalDigest(result.protectedRecords))
    assert(result.protectedRecords.some((record) => record.path.endsWith('/foundations/example.html')))
    assert.equal(result.protectedFiles, result.protectedRecords.length)
    assert.deepEqual(result.changed.map((record) => record.path), ['apps/generator-app/src/app/page.tsx', 'package.json'])
    assert.deepEqual(assertPreparationClosure(f.repository, f.source, target), result)
    assert.equal(assertPreparationClosure(f.repository, target, target).protectedTreeHash, result.protectedTreeHash)
  } finally { await rm(f.repository, { recursive: true, force: true }) }
})

test('retained renderer files, factory code/assets and independent validation gates cannot drift', async (t) => {
  for (const file of [
    ...PREPARATION_RUNTIME_FILES,
    'apps/generator-app/src/lib/compiler-compatibility-runtime.ts',
    'packages/template-factory/src/legacy/customer-preview-adapter.ts',
    'packages/template-factory/foundations/example.html',
    'apps/generator-app/scripts/upload-templates-to-blobs.mjs',
    'apps/generator-app/src/lib/templates/certified-catalog-contract.mjs',
    'apps/generator-app/src/lib/templates/launch-catalog-contract.json',
    'apps/generator-app/src/lib/templates/launch-catalog-approved-receipt.json',
    'apps/generator-app/src/lib/templates/rehab-catalog-contract.json',
    'apps/generator-app/src/lib/templates/niche-meta.ts',
  ]) await t.test(file, async () => {
    const f = await fixture()
    try {
      await f.put(file, 'changed implementation')
      assert.throws(() => assertPreparationClosure(f.repository, f.source, f.commit()), /input changed/)
    } finally { await rm(f.repository, { recursive: true, force: true }) }
  })
})

test('dependency, install and TypeScript resolution changes are rejected, including new inputs', async (t) => {
  for (const file of [
    'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.base.json',
    'apps/generator-app/package.json', 'packages/template-factory/package.json',
    'packages/new-package/package.json', '.npmrc', '.pnpmfile.cjs', '.yarnrc.yml',
    'apps/generator-app/src/tsconfig.json', 'apps/generator-app/tsconfig.build.json',
    'apps/generator-app/next.config.js', 'apps/generator-app/src/.gitattributes',
    'patches/parse5.patch', '.yarn/plugins/plugin.cjs',
    'apps/generator-app/src/lib/template-preview-composition.js',
    'apps/generator-app/src/lib/template-preview-composition/index.js',
    'apps/generator-app/src/lib/compiler-compatibility-runtime.js',
    'packages/template-factory/new-compiler.ts',
  ]) await t.test(file, async () => {
    const f = await fixture()
    try {
      await f.put(file, '{}')
      assert.throws(() => assertPreparationClosure(f.repository, f.source, f.commit()), /input changed|regular tracked file/)
    } finally { await rm(f.repository, { recursive: true, force: true }) }
  })
})

test('the root package exception never permits dependency, install, package-manager or build changes', async (t) => {
  for (const [name, mutate] of [
    ['dependency', (pkg) => { pkg.dependencies.package = '2.0.0' }],
    ['install hook', (pkg) => { pkg.scripts.postinstall = 'node altered.mjs' }],
    ['build', (pkg) => { pkg.scripts.build = 'changed' }],
    ['package manager', (pkg) => { pkg.packageManager = 'pnpm@12.0.0' }],
  ]) await t.test(name, async () => {
    const f = await fixture()
    try {
      const pkg = packageValue(); mutate(pkg)
      await f.put('package.json', JSON.stringify(pkg))
      assert.throws(() => assertPreparationClosure(f.repository, f.source, f.commit()), /Only the root package test command/)
    } finally { await rm(f.repository, { recursive: true, force: true }) }
  })
})

test('protected deletions, symlinks and file mode changes fail closed', async (t) => {
  for (const kind of ['delete', 'symlink', 'mode']) await t.test(kind, async () => {
    const f = await fixture(), file = PREPARATION_RUNTIME_FILES[0]
    try {
      if (kind === 'mode') f.git('update-index', '--chmod=+x', file)
      else {
        await rm(path.join(f.repository, file))
        if (kind === 'symlink') await symlink('custom-theme.ts', path.join(f.repository, file))
      }
      // Preserve the staged executable-bit change instead of restaging it.
      if (kind === 'mode') f.git('-c', 'user.name=Preparation Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture mode')
      else f.commit()
      // Match the mode in the working tree to retain the clean-head invariant.
      if (kind === 'mode') f.git('checkout-index', '--force', file)
      assert.throws(() => assertPreparationClosure(f.repository, f.source, f.git('rev-parse', 'HEAD')), /regular tracked file|file mode changed/)
    } finally { await rm(f.repository, { recursive: true, force: true }) }
  })
})

test('certification provider plumbing may vary but preparation and command gates remain identical', async () => {
  const f = await fixture()
  try {
    await f.put(CERTIFICATION, "import { withReadRetry } from './release-read-retry.mjs'\n" + certification.replace('return fetch(resource)', 'return withReadRetry(() => fetch(resource))').replace('console.error(error.message)', 'console.error("sanitized")'))
    assert.doesNotThrow(() => assertPreparationClosure(f.repository, f.source, f.commit()))
    await f.put(CERTIFICATION, certification.replace('unchanged certificate computation', 'weakened computation'))
    assert.throws(() => assertPreparationClosure(f.repository, f.source, f.commit()), /byte-identical/)
    await f.put(CERTIFICATION, certification.replace('unchanged command gates', 'bypassed gates'))
    assert.throws(() => assertPreparationClosure(f.repository, f.source, f.commit()), /byte-identical/)
  } finally { await rm(f.repository, { recursive: true, force: true }) }
})

test('preparation requires valid commits, exact clean HEAD and source ancestry', async () => {
  const f = await fixture()
  try {
    assert.throws(() => assertPreparationClosure(f.repository, 'main', f.source), /exact source/)
    await f.put('apps/generator-app/src/app/page.tsx', 'target UI')
    const target = f.commit()
    assert.throws(() => assertPreparationClosure(f.repository, f.source, f.source), /exact clean checkout/)
    await f.put('untracked.txt', 'dirty')
    assert.throws(() => assertPreparationClosure(f.repository, f.source, target), /clean repository/)
    await rm(path.join(f.repository, 'untracked.txt'))
    await f.put('apps/generator-app/src/app/page.tsx', 'uncommitted UI')
    assert.throws(() => assertPreparationClosure(f.repository, f.source, target), /clean repository/)
    f.git('checkout', '--', 'apps/generator-app/src/app/page.tsx')
    f.git('checkout', '-qb', 'other-history', f.source)
    await f.put('apps/generator-app/src/app/page.tsx', 'divergent UI')
    const other = f.commit()
    assert.throws(() => assertPreparationClosure(f.repository, target, other), /ancestor/)
  } finally { await rm(f.repository, { recursive: true, force: true }) }
})
