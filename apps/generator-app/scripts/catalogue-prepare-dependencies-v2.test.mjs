import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, chmod, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { installProofDependencies, fingerprintInstalledDependencies, assertDependencyProofEnvironment, assertRuntimeProofCompleteness } from './catalogue-prepare-dependencies-v2.mjs'

const FAMILIES = ['next', '@next/env', '@next/swc-darwin-arm64', '@next/swc-darwin-x64', '@next/swc-linux-arm64-gnu', '@next/swc-linux-arm64-musl', '@next/swc-linux-x64-gnu', '@next/swc-linux-x64-musl', '@next/swc-win32-arm64-msvc', '@next/swc-win32-x64-msvc']
const PROJECTS = ['', 'apps/client-template', 'apps/generator-app', 'packages/image-optimizer', 'packages/scripts', 'packages/template-factory', 'packages/ui-components', 'packages/utils']
const BLOCKED = ['NODE_OPTIONS', 'NODE_PATH', 'TSX_TSCONFIG_PATH', 'TSX_DISABLE_CACHE', 'ESBUILD_BINARY_PATH', 'PLAYWRIGHT_BROWSERS_PATH', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH', 'NODE_PRESERVE_SYMLINKS', 'PNPM_HOME', 'npm_config_node_options']
const cleanEnvironment = () => {
  const existing = Object.fromEntries(BLOCKED.filter((key) => Object.hasOwn(process.env, key)).map((key) => [key, process.env[key]]))
  for (const key of BLOCKED) delete process.env[key]
  return () => { for (const key of BLOCKED) delete process.env[key]; Object.assign(process.env, existing) }
}
async function put(root, name, content) {
  await mkdir(path.dirname(path.join(root, name)), { recursive: true })
  await writeFile(path.join(root, name), content)
}
async function fixture(base, version) {
  const root = path.join(base, version), packages = {}, virtuals = {}
  await mkdir(root)
  for (const family of FAMILIES) {
    const virtual = family === 'next' ? `next@15_${version.endsWith('27') ? 'a'.repeat(32) : 'b'.repeat(32)}` : `${family.replace('/', '+')}@${version}`
    const id = `${family}@${version}`
    packages[id] = { url: `./.pnpm/${virtual}/node_modules/${family}`, dependencies: { [family]: id } }
    virtuals[family] = virtual
  }
  const physical = (family) => `node_modules/.pnpm/${virtuals[family]}/node_modules/${family}`
  for (const family of ['next', '@next/env', '@next/swc-linux-x64-gnu']) await put(root, `${physical(family)}/package.json`, JSON.stringify({ name: family, version }))
  for (const family of ['@next/env', '@next/swc-linux-x64-gnu']) {
    const link = path.join(root, 'node_modules/.pnpm', virtuals.next, 'node_modules', family)
    await mkdir(path.dirname(link), { recursive: true })
    await symlink(path.relative(path.dirname(link), path.join(root, physical(family))), link)
  }
  for (const project of ['apps/client-template', 'apps/generator-app']) {
    await put(root, `${project}/package.json`, JSON.stringify({ dependencies: { next: version } }))
    await mkdir(path.join(root, project, 'node_modules/.bin'), { recursive: true })
    const link = path.join(root, project, 'node_modules/next')
    await symlink(path.relative(path.dirname(link), path.join(root, physical('next'))), link)
    await put(root, `${project}/node_modules/.bin/next`, `#!/bin/sh\nbasedir=$(dirname "$0")\n  export NODE_PATH="${root}/node_modules/.pnpm/${virtuals.next}/node_modules"\n  export NODE_PATH="${root}/node_modules/.pnpm/${virtuals.next}/node_modules:$NODE_PATH"\nexec node "$basedir/index.js"\n# cmd-shim-target=${root}/apps/generator-app/node_modules/next/dist/bin/next\n`)
    await chmod(path.join(root, project, 'node_modules/.bin/next'), 0o755)
  }
  // A realistic unrelated package with multiple files makes complete tree
  // coverage observable, including files not imported by the runtime sample.
  for (let i = 0; i < 105; i++) await put(root, `node_modules/.pnpm/stable@1.0.0/node_modules/stable/file-${i}.js`, `export default ${i}\n`)
  await put(root, 'node_modules/.pnpm/stable@1.0.0/node_modules/stable/package.json', '{"name":"stable","version":"1.0.0"}\n')
  await symlink('.pnpm/stable@1.0.0/node_modules/stable', path.join(root, 'node_modules/stable'))
  packages['stable@1.0.0'] = { url: './.pnpm/stable@1.0.0/node_modules/stable', dependencies: { stable: 'stable@1.0.0' } }
  await put(root, 'package.json', '{"packageManager":"pnpm@11.19.0"}\n')
  const lock = `lockfileVersion: '9.0'\nreviewedFixtureVersion: '${version}'\n`
  await put(root, 'pnpm-lock.yaml', lock)
  await put(root, 'node_modules/.pnpm/lock.yaml', lock)
  await put(root, 'node_modules/.modules.yaml', JSON.stringify({ packageManager: 'pnpm@11.19.0', layoutVersion: 5, nodeLinker: 'isolated', virtualStoreDir: '.pnpm', virtualStoreDirMaxLength: 40, pendingBuilds: [], ignoredBuilds: [], prunedAt: version.endsWith('27') ? '2026-10-24T00:00:00Z' : '2026-10-24T01:00:00Z', hoistedDependencies: { [`next@${version}`]: { next: 'private' }, 'stable@1.0.0': { stable: 'private' } }, skipped: FAMILIES.filter((name) => !['next', '@next/env', '@next/swc-linux-x64-gnu'].includes(name)).map((name) => `${name}@${version}`) }))
  await put(root, 'node_modules/.package-map.json', JSON.stringify({ packages }))
  await put(root, 'node_modules/.pnpm-workspace-state-v1.json', JSON.stringify({ filteredInstall: false, settings: { enableGlobalVirtualStore: false }, pnpmfiles: [], lastValidatedTimestamp: version.endsWith('27') ? 10000 : 20000, projects: Object.fromEntries(PROJECTS.map((entry) => [path.join(root, entry), { name: entry || 'root', version: '1.0.0' }])) }))
  execFileSync('git', ['init', '-q'], { cwd: root })
  execFileSync('git', ['add', 'pnpm-lock.yaml'], { cwd: root })
  execFileSync('git', ['-c', 'user.name=Proof fixture', '-c', 'user.email=proof@example.invalid', 'commit', '-qm', 'lock'], { cwd: root })
  return root
}

test('checkout and paired installs use the same frozen install and exclude ambient registry settings and credentials', async (t) => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'dc-v2-install-'))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  const stub = path.join(cwd, 'corepack')
  await writeFile(stub, `#!/bin/sh
printf '%s\\n' "$@" > args
printf '%s\\n' "$CI" "$npm_config_userconfig" "$npm_config_globalconfig" > config
test -z "$GITHUB_TOKEN" && test -z "$npm_config_registry" && test -z "$GITHUB_ACTIONS"
`, { mode: 0o700 })
  const env = { PATH: cwd, GITHUB_TOKEN: 'fixture-only', npm_config_registry: 'fixture', GITHUB_ACTIONS: 'true' }
  installProofDependencies(cwd, env)
  assert.equal(await readFile(path.join(cwd, 'args'), 'utf8'), 'pnpm\ninstall\n--frozen-lockfile\n--no-side-effects-cache\n')
  assert.equal(await readFile(path.join(cwd, 'config'), 'utf8'), 'true\n/dev/null\n/dev/null\n')
  assert.throws(() => installProofDependencies(cwd, { ...env, NODE_OPTIONS: '' }), /Unexpected ambient dependency loader setting/)
})

test('installed proof rejects ambient resolution and loader overrides including empty values', () => {
  for (const key of BLOCKED) assert.throws(() => assertDependencyProofEnvironment({ [key]: '' }), /ambient module\/loader override/)
  assert.doesNotThrow(() => assertDependencyProofEnvironment({ HTTPS_PROXY: 'http://proxy.invalid' }))
})

test('complete installed comparison recognizes only the exact Next component partition', async (t) => {
  const restore = cleanEnvironment()
  const base = await mkdtemp(path.join(tmpdir(), 'dc-installed-v2-'))
  t.after(async () => { restore(); await rm(base, { recursive: true, force: true }) })
  const oldRoot = await fixture(base, '15.5.27'), newRoot = await fixture(base, '15.5.28')
  const original = await fingerprintInstalledDependencies(oldRoot, '15.5.27')
  const baseline = await fingerprintInstalledDependencies(newRoot, '15.5.28')
  assert.equal(original.fingerprintHash, baseline.fingerprintHash)
  assert.notEqual(original.trackedLockHash, baseline.trackedLockHash)
  assert.equal(original.excludedComponents.length, 3)
  await t.test('normalizes only pnpm omitted empty ignored-build metadata', async () => {
    const oldFile = path.join(oldRoot, 'node_modules/.modules.yaml'), newFile = path.join(newRoot, 'node_modules/.modules.yaml')
    const oldContent = await readFile(oldFile), newContent = await readFile(newFile)
    const oldValue = JSON.parse(oldContent), newValue = JSON.parse(newContent)
    const omitted = (value) => { const copy = { ...value }; delete copy.ignoredBuilds; return copy }
    try {
      await writeFile(oldFile, JSON.stringify(omitted(oldValue)))
      assert.equal((await fingerprintInstalledDependencies(oldRoot, '15.5.27')).fingerprintHash, baseline.fingerprintHash)
      await writeFile(newFile, JSON.stringify(omitted(newValue)))
      assert.equal((await fingerprintInstalledDependencies(newRoot, '15.5.28')).fingerprintHash, baseline.fingerprintHash)
      await writeFile(oldFile, oldContent)
      assert.equal((await fingerprintInstalledDependencies(oldRoot, '15.5.27')).fingerprintHash, (await fingerprintInstalledDependencies(newRoot, '15.5.28')).fingerprintHash)
      for (const ignoredBuilds of [null, false, '', {}, ['unbuilt-package@1.0.0']]) {
        await writeFile(newFile, JSON.stringify({ ...newValue, ignoredBuilds }))
        await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /unfinished installation/)
      }
      for (const pendingBuilds of [null, false, '', {}, ['pending-package@1.0.0']]) {
        await writeFile(newFile, JSON.stringify({ ...omitted(newValue), pendingBuilds }))
        await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /unfinished installation/)
      }
      const missingPending = omitted(newValue); delete missingPending.pendingBuilds
      await writeFile(newFile, JSON.stringify(missingPending))
      await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /unfinished installation/)
      await writeFile(newFile, JSON.stringify({ ...omitted(newValue), unexpectedMetadata: true }))
      assert.notEqual((await fingerprintInstalledDependencies(newRoot, '15.5.28')).fingerprintHash, baseline.fingerprintHash)
    } finally {
      await writeFile(oldFile, oldContent); await writeFile(newFile, newContent)
    }
  })
  await t.test('detects unrelated unimported package bytes and file mode changes', async () => {
    const file = path.join(newRoot, 'node_modules/.pnpm/stable@1.0.0/node_modules/stable/file-104.js'), content = await readFile(file), originalMode = (await stat(file)).mode & 0o777
    await writeFile(file, 'export default "changed"\n')
    assert.notEqual((await fingerprintInstalledDependencies(newRoot, '15.5.28')).fingerprintHash, baseline.fingerprintHash)
    await writeFile(file, content)
    await chmod(file, 0o755)
    assert.notEqual((await fingerprintInstalledDependencies(newRoot, '15.5.28')).fingerprintHash, baseline.fingerprintHash)
    await chmod(file, originalMode)
  })
  await t.test('detects changed internal hoist target and rejects ambient link targets', async () => {
    const link = path.join(newRoot, 'node_modules/stable')
    await rm(link)
    await symlink('.pnpm/stable@1.0.0/node_modules', link)
    assert.notEqual((await fingerprintInstalledDependencies(newRoot, '15.5.28')).fingerprintHash, baseline.fingerprintHash)
    await rm(link)
    await symlink(base, link)
    await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /outside checkout/)
    await rm(link)
    await symlink('.pnpm/stable@1.0.0/node_modules/stable', link)
  })
  await t.test('rejects installed-lock drift even when another lock copy is changed with it', async () => {
    const rootLock = path.join(newRoot, 'pnpm-lock.yaml'), installed = path.join(newRoot, 'node_modules/.pnpm/lock.yaml'), content = await readFile(rootLock)
    await writeFile(installed, 'changed\n')
    await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /installed lock differs/)
    await writeFile(rootLock, 'changed\n')
    await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /installed lock differs/)
    await writeFile(rootLock, content); await writeFile(installed, content)
  })
  await t.test('preserves non-Next metadata and rejects invalid timestamp normalization', async () => {
    const file = path.join(newRoot, 'node_modules/.modules.yaml'), content = await readFile(file), value = JSON.parse(content)
    await writeFile(file, JSON.stringify({ ...value, hoistedDependencies: { ...value.hoistedDependencies, 'stable@1.0.0': { stable: 'public' } } }))
    assert.notEqual((await fingerprintInstalledDependencies(newRoot, '15.5.28')).fingerprintHash, baseline.fingerprintHash)
    await writeFile(file, JSON.stringify({ ...value, prunedAt: 'not a timestamp' }))
    await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /invalid pnpm prune timestamp/)
    await writeFile(file, content)
  })
  await t.test('generated wrapper normalization never removes command changes or code-bearing paths', async () => {
    const file = path.join(newRoot, 'apps/generator-app/node_modules/.bin/next'), content = await readFile(file, 'utf8')
    await writeFile(file, content.replace('exec node ', 'exec echo '))
    assert.notEqual((await fingerprintInstalledDependencies(newRoot, '15.5.28')).fingerprintHash, baseline.fingerprintHash)
    await writeFile(file, content + `echo '${newRoot}/node_modules'\n`)
    await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /outside known fields/)
    await writeFile(file, content.replace('export NODE_PATH=\"', 'export NODE_PATH=\"$(echo injected)'))
    await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /unsafe generated wrapper path/)
    await writeFile(file, content)
  })
  await t.test('only the complete reviewed nested esbuild wrapper can omit NODE_PATH', async () => {
    const template = await readFile(new URL('./fixtures/pnpm-11.19.0-esbuild-0.28.1-shim.sh', import.meta.url), 'utf8')
    const scope = 'node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild'
    const shim = `${scope}/node_modules/.bin/esbuild`, binary = `${scope}/bin/esbuild`
    const wrapper = (root) => template.replace('<checkout>', root)
    const file = path.join(newRoot, shim), target = path.join(newRoot, binary)
    try {
      for (const root of [oldRoot, newRoot]) {
        await put(root, binary, 'fixture binary')
        await chmod(path.join(root, binary), 0o755)
        await put(root, shim, wrapper(root))
        await chmod(path.join(root, shim), 0o755)
      }
      const withWrapper = await fingerprintInstalledDependencies(oldRoot, '15.5.27')
      assert.equal((await fingerprintInstalledDependencies(newRoot, '15.5.28')).fingerprintHash, withWrapper.fingerprintHash)
      assert.notEqual(withWrapper.fingerprintHash, baseline.fingerprintHash)
      for (const text of [
        wrapper(newRoot).replace('exec node ', 'exec echo '),
        wrapper(newRoot).replace(newRoot + '/' + binary, newRoot + '/package.json'),
        wrapper(newRoot).replaceAll('../../bin/esbuild', '../../bin/other'),
        wrapper(newRoot) + 'exit 0\n',
      ]) {
        await writeFile(file, text)
        await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /unreviewed esbuild install shim/)
      }
      await writeFile(file, wrapper(oldRoot))
      await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /unsafe generated wrapper path/)
      await writeFile(file, wrapper(newRoot))
      await chmod(file, 0o644)
      await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /invalid esbuild install shim type or mode/)
      await chmod(file, 0o755)
      const extra = path.join(newRoot, scope, 'node_modules/.bin/unreviewed')
      await writeFile(extra, wrapper(newRoot))
      await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /generated wrapper fields are incomplete/)
      await rm(extra)
      await rm(target)
      await symlink(path.join(newRoot, 'package.json'), target)
      await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /invalid esbuild install shim target/)
      await rm(file)
      await symlink(path.join(newRoot, 'package.json'), file)
      await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /invalid esbuild install shim type or mode/)
    } finally {
      for (const root of [oldRoot, newRoot]) await rm(path.join(root, 'node_modules/.pnpm/esbuild@0.28.1'), { recursive: true, force: true })
    }
  })
  await t.test('rejects forged changed-component manifest and unreviewed version', async () => {
    const entry = JSON.parse(await readFile(path.join(newRoot, 'node_modules/.package-map.json'))).packages['@next/env@15.5.28']
    const file = path.join(newRoot, 'node_modules', entry.url, 'package.json'), content = await readFile(file)
    await writeFile(file, '{"name":"other","version":"15.5.28"}')
    await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.28'), /changed package manifest differs/)
    await writeFile(file, content)
    await assert.rejects(fingerprintInstalledDependencies(newRoot, '15.5.29'), /unreviewed Next version/)
  })
  assert.equal((await fingerprintInstalledDependencies(newRoot, '15.5.28')).fingerprintHash, baseline.fingerprintHash)
})

test('runtime proof requires the actual adapter, both loaders, native binding and explicit preload observations', () => {
  const preloads = [
    'apps/generator-app/src/lib/template-preview-composition.ts',
    'apps/generator-app/src/lib/customer-preview-document.ts',
    'apps/generator-app/src/lib/customer-preview-editor-runtime.ts',
  ]
  const paths = [
    ...preloads,
    'packages/template-factory/src/legacy/customer-preview-adapter.ts',
    'packages/template-factory/src/legacy/render.ts',
    'node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/cjs/api/index.cjs',
    'node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/esm/api/index.cjs',
    'node_modules/.pnpm/@img+sharp-linux-x64@0.35.5/node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64-0.35.5.node',
  ]
  const bind = (modules) => createHash('sha256').update(JSON.stringify(modules)).digest('hex')
  const modules = paths.map((entry) => ({ path: entry, sha256: '1'.repeat(64) }))
  const valid = { version: 2, node: process.version, directEdges: 29, esmImports: 37, cjsResolutions: 228, fingerprintHash: '2'.repeat(64), mandatoryModules: modules, mandatoryModulesHash: bind(modules), probeConfiguration: { loader: 'tsx-cjs-and-esm', sequentialPreload: preloads, defaultAdapterInvoked: true } }
  assert.doesNotThrow(() => assertRuntimeProofCompleteness(valid))
  for (let index = 0; index < modules.length; index++) {
    const incomplete = modules.filter((_entry, position) => position !== index)
    assert.throws(() => assertRuntimeProofCompleteness({ ...valid, mandatoryModules: incomplete, mandatoryModulesHash: bind(incomplete) }), /mandatory runtime module observation/)
  }
  assert.throws(() => assertRuntimeProofCompleteness({ ...valid, mandatoryModulesHash: '0'.repeat(64) }), /unbound/)
  assert.throws(() => assertRuntimeProofCompleteness({ ...valid, probeConfiguration: { ...valid.probeConfiguration, defaultAdapterInvoked: false } }), /configuration differs/)
})
