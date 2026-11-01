import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { normalizeAdapterConfiguration, assertAdapterConfigurationEquivalent, stageAdapterConfiguration, validateAdapterConfigurationProof, findPinnedNetlifyPackage, loadPinnedAdapterTools, adapterFailurePhase } from './demo-maintenance-adapter-config.mjs'

const root = '/home/runner/work/example/source'
const fixture = () => ({
  build: { base: root, publish: `${root}/apps/generator-app/.netlify/static`, edge_functions: `${root}/apps/generator-app/.netlify/edge-functions`, functions: `${root}/apps/generator-app/functions`, command: 'pnpm generator:build', environment: { NODE_VERSION: '22' }, commandOrigin: 'config', publishOrigin: 'inline' },
  functionsDirectory: `${root}/apps/generator-app/functions`, functionsDirectoryOrigin: 'config-v1',
  functions: { '*': { deno_import_map: `${root}/import_map.json`, node_bundler: 'nft' }, server: { included_files: ['node_modules/**'], memory: 1024 } },
  database: { migrations: { path: `${root}/migrations` } },
  headers: [{ for: '/demo-videos/*', values: { 'Cache-Control': 'public, max-age=3600' } }],
  redirects: [{ from: '/*', to: '/.netlify/functions/server', status: 200, force: true }],
  edge_functions: [{ function: 'middleware', path: '/*', excludedPath: ['/demo-videos/*'] }, { function: 'pattern-route', pattern: '/hello/(.*)', excludedPattern: ['/hello/private/(.*)'] }], plugins: [],
})
const resolved = (config = fixture()) => ({ context: 'production', buildDir: root, repositoryRoot: root, configPath: `${root}/apps/generator-app/netlify.toml`, config })

test('Linux generated absolute paths must be denormalized before the normal config reader', () => {
  // Exact pinned resolver rule: strip leading slash, then resolve beneath root.
  const reread = value => path.posix.resolve(root, value.replace(/^\/+/, ''))
  assert.equal(reread(fixture().build.base), root + root)
  assert.notEqual(reread(fixture().build.publish), fixture().build.publish)
  const { config, normalizedPathCount } = normalizeAdapterConfiguration(fixture(), root, path.posix)
  assert.equal(config.build.base, undefined)
  assert.equal(normalizedPathCount, 7)
  for (const [actual, expected] of [[config.build.publish, fixture().build.publish], [config.build.edge_functions, fixture().build.edge_functions], [config.functionsDirectory, fixture().functionsDirectory], [config.build.functions, fixture().build.functions], [config.functions['*'].deno_import_map, fixture().functions['*'].deno_import_map], [config.database.migrations.path, fixture().database.migrations.path]]) assert.equal(reread(actual), expected)
  assert.deepEqual(config.redirects, fixture().redirects)
  assert.deepEqual(config.headers, fixture().headers)
  assert.deepEqual(config.edge_functions, fixture().edge_functions)
  assert.deepEqual(config.functions.server, fixture().functions.server)
  assert.equal(fixture().build.base, root)
})

test('unexpected base, relative, escaping and unrecognized filesystem paths fail closed', () => {
  for (const update of [
    c => { c.build.base = `${root}/apps/generator-app` },
    c => { c.build.publish = '.netlify/static' },
    c => { c.build.publish = '/outside/static' },
    c => { c.build.edge_functions = `${root}/../escape` },
    c => { c.new_directory = '/outside' },
    c => { c.newDirectory = '../outside' },
    c => { c.unknown = '/outside' },
    c => { c.build.future_path = `${root}/new-feature` },
    c => { c.functions.server.included_files = [`${root}/private/**`] },
    c => { c.functions.server.deno_import_map = `${root}/private.json` },
    c => { c.functions.server.deno_import_map = '/outside.json' },
    c => { c.build.publish = `${root}/static\0` },
  ]) {
    const value = fixture(); update(value)
    assert.throws(() => normalizeAdapterConfiguration(value, root, path.posix))
  }
})

test('failed normalization records only a bounded static phase, never resolver text or paths', () => {
  assert.equal(adapterFailurePhase({ stderr: Buffer.from('{"version":1,"phase":"equivalence"}') }), 'equivalence')
  for (const stderr of ['{"version":1,"phase":"equivalence","path":"/private/secret"}', '{"version":1,"phase":"secret-token"}', 'private resolver error', Buffer.alloc(4097), {}]) assert.equal(adapterFailurePhase({ stderr }), 'unknown')
})

test('whole resolved semantics require the same routes, functions, environment and actual selected config', () => {
  const actual = resolved()
  delete actual.config.build.base
  actual.config.build.publishOrigin = 'config'
  assert.match(assertAdapterConfigurationEquivalent(fixture(), actual, root, actual.configPath, path.posix), /^[a-f0-9]{64}$/)
  for (const update of [
    r => { r.config.redirects[0].status = 301 },
    r => { r.config.functions.server.memory = 2048 },
    r => { r.config.build.environment.NODE_VERSION = '24' },
    r => { r.config.headers = [] },
    r => { r.config.edge_functions = [] },
    r => { r.context = 'dev' },
    r => { r.buildDir = `${root}/apps/generator-app` },
    r => { r.configPath = `${root}/netlify.toml` },
  ]) {
    const value = resolved(); update(value)
    assert.throws(() => assertAdapterConfigurationEquivalent(fixture(), value, root, `${root}/apps/generator-app/netlify.toml`, path.posix))
  }
})

test('public proof cannot retain paths, extra fields or a claimed partial verification', () => {
  const proof = { version: 1, netlifyCli: '27.4.2', configVersion: '25.2.6', generatedConfigSha256: 'a'.repeat(64), configSha256: 'b'.repeat(64), semanticSha256: 'c'.repeat(64), normalizedPathCount: 7, offlineEquivalent: true }
  assert.deepEqual(validateAdapterConfigurationProof(proof), proof)
  for (const bad of [{ ...proof, path: root }, { ...proof, offlineEquivalent: false }, { ...proof, configSha256: root }, { ...proof, configVersion: 'future' }, { ...proof, normalizedPathCount: 0 }]) assert.throws(() => validateAdapterConfigurationProof(bad))
})

let tools
try { tools = await loadPinnedAdapterTools(await findPinnedNetlifyPackage()) } catch (error) {
  if (error.message !== 'Pinned Netlify CLI package is unavailable') throw error
}

test('pinned CLI parser and complete offline resolver preserve the actual adapter configuration', { skip: !tools && 'Run this integration test through pnpm --package=netlify-cli@27.4.2 dlx node --test' }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'demo-adapter-config-'))
  try {
    const app = path.join(directory, 'apps/generator-app')
    await mkdir(path.join(app, '.netlify/static'), { recursive: true })
    await mkdir(path.join(app, '.netlify/edge-functions'), { recursive: true })
    await mkdir(path.join(directory, 'netlify/functions'), { recursive: true })
    await writeFile(path.join(directory, 'import_map.json'), '{}')
    await writeFile(path.join(directory, 'netlify.toml'), '[build]\nbase="/"\npublish="apps/generator-app/.next"\ncommand="pnpm generator:build"\n[functions."*"]\ndeno_import_map="import_map.json"\nnode_bundler="nft"\n[functions.server]\nincluded_files=["node_modules/**"]\n[[plugins]]\npackage="@netlify/plugin-nextjs"\n[[headers]]\nfor="/demo-videos/*"\n[headers.values]\nCache-Control="public, max-age=3600"\n[[redirects]]\nfrom="/*"\nto="/.netlify/functions/server"\nstatus=200\nforce=true\n[[edge_functions]]\nfunction="middleware"\npath="/*"\n')
    const first = await tools.resolveConfig({ cwd: directory, repositoryRoot: directory, packagePath: 'apps/generator-app', context: 'production', offline: true, mode: 'cli', buffer: true })
    const generated = structuredClone(first.config)
    generated.build.publish = path.join(app, '.netlify/static')
    generated.build.edge_functions = path.join(app, '.netlify/edge-functions')
    const bytes = tools.serialize(generated)
    await writeFile(path.join(app, '.netlify/netlify.toml'), bytes)
    const proof = await stageAdapterConfiguration(directory, tools)
    assert.equal(proof.offlineEquivalent, true)
    assert.notEqual(proof.configSha256, proof.generatedConfigSha256)
    assert.equal(await readFile(path.join(app, '.netlify/netlify.toml'), 'utf8'), bytes)
    assert.equal(tools.parse(await readFile(path.join(app, 'netlify.toml'), 'utf8')).build.base, undefined)
    await assert.rejects(stageAdapterConfiguration(directory, tools), /EEXIST/)
    // Exercise the exact fixed child entrypoint and its actual dlx discovery.
    await rm(path.join(app, 'netlify.toml'))
    const child = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('./demo-maintenance-adapter-config.mjs', import.meta.url)), directory], { cwd: directory, env: { PATH: process.env.PATH, HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP, CI: 'true', CONTEXT: 'production' }, stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 }).toString('utf8'))
    assert.deepEqual(validateAdapterConfigurationProof(child), proof)
    await writeFile(path.join(app, '.netlify/netlify.toml'), '')
    await assert.rejects(stageAdapterConfiguration(directory, tools), /bounded regular/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})
