import { readFile, readdir, lstat, readlink, realpath } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execute = promisify(execFile)
const HASH = (value) => createHash('sha256').update(value).digest('hex')
const canonical = (value) => JSON.stringify(value, (_key, entry) => entry && !Array.isArray(entry) && typeof entry === 'object' ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : entry)
const digest = (value) => HASH(canonical(value))
const requireThat = (condition, reason) => { if (!condition) throw new Error(`Retained dependency proof: ${reason}`) }
const VERSIONS = new Set(['15.5.27', '15.5.28'])
const FAMILIES = ['next', '@next/env', '@next/swc-darwin-arm64', '@next/swc-darwin-x64', '@next/swc-linux-arm64-gnu', '@next/swc-linux-arm64-musl', '@next/swc-linux-x64-gnu', '@next/swc-linux-x64-musl', '@next/swc-win32-arm64-msvc', '@next/swc-win32-x64-msvc']
const PHYSICAL = ['next', '@next/env', '@next/swc-linux-x64-gnu']
const BLOCKED_ENV = ['NODE_OPTIONS', 'NODE_PATH', 'TSX_TSCONFIG_PATH', 'TSX_DISABLE_CACHE', 'ESBUILD_BINARY_PATH', 'PLAYWRIGHT_BROWSERS_PATH', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH', 'NODE_PRESERVE_SYMLINKS', 'PNPM_HOME', 'npm_config_node_options']
const SAFE_ENV = ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'USER', 'LOGNAME', 'SHELL', 'CI', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'REQUESTS_CA_BUNDLE', 'NODE_USE_ENV_PROXY']
const ROOTS = ['node_modules', 'apps/client-template/node_modules', 'apps/generator-app/node_modules', 'packages/image-optimizer/node_modules', 'packages/scripts/node_modules', 'packages/template-factory/node_modules', 'packages/ui-components/node_modules', 'packages/utils/node_modules']
const METADATA = new Set(['node_modules/.modules.yaml', 'node_modules/.package-map.json', 'node_modules/.pnpm-workspace-state-v1.json'])

export function assertDependencyProofEnvironment(env = process.env) {
  requireThat(BLOCKED_ENV.every((key) => !Object.hasOwn(env, key)), 'ambient module/loader override is present')
  requireThat(process.platform === 'linux' && process.arch === 'x64' && Boolean(process.report.getReport().header.glibcVersionRuntime), 'only the reviewed Linux x64 glibc installation is supported')
  requireThat(/^v(?:22|24)\./.test(process.version), 'unsupported Node runtime')
}

function projectPath(root, value) {
  requireThat(value === root || value.startsWith(`${root}/`), 'workspace metadata path escapes the checkout')
  return `<checkout>${value.slice(root.length)}`
}

function transformKeys(value, keyTransform) {
  const result = {}
  for (const [key, entry] of Object.entries(value)) {
    const next = keyTransform(key)
    requireThat(!Object.hasOwn(result, next), 'normalization collision')
    result[next] = entry
  }
  return result
}

/** This verifier is bound by its caller to the exact reviewed Git blob pair. */
export async function fingerprintInstalledDependencies(repository, version) {
  assertDependencyProofEnvironment()
  requireThat(VERSIONS.has(version), 'unreviewed Next version')
  const root = await realpath(repository)
  requireThat(root === path.resolve(repository), 'checkout path must not be a symlink')
  const json = async (relative) => JSON.parse(await readFile(path.join(root, relative), 'utf8'))
  const rootPackage = await json('package.json')
  requireThat(rootPackage.packageManager === 'pnpm@11.19.0', 'package manager is not pinned')
  const modules = await json('node_modules/.modules.yaml')
  const packageMap = await json('node_modules/.package-map.json')
  const state = await json('node_modules/.pnpm-workspace-state-v1.json')
  requireThat(modules.packageManager === 'pnpm@11.19.0' && modules.layoutVersion === 5 && modules.nodeLinker === 'isolated' && modules.virtualStoreDir === '.pnpm' && modules.virtualStoreDirMaxLength === 40, 'unexpected pnpm layout')
  requireThat(Array.isArray(modules.pendingBuilds) && modules.pendingBuilds.length === 0 && Array.isArray(modules.ignoredBuilds) && modules.ignoredBuilds.length === 0, 'unfinished installation')
  requireThat(state.filteredInstall === false && state.settings?.enableGlobalVirtualStore === false && Array.isArray(state.pnpmfiles) && state.pnpmfiles.length === 0, 'unexpected installation scope or hook')
  requireThat(packageMap && Object.keys(packageMap).length === 1 && packageMap.packages && typeof packageMap.packages === 'object', 'invalid package map')
  for (const app of ['apps/client-template', 'apps/generator-app']) requireThat((await json(`${app}/package.json`)).dependencies?.next === version, 'application Next version differs')
  const { stdout: tracked } = await execute('git', ['show', 'HEAD:pnpm-lock.yaml'], { cwd: root, encoding: 'buffer', maxBuffer: 2 * 1024 * 1024 })
  const lock = await readFile(path.join(root, 'pnpm-lock.yaml'))
  requireThat(lock.equals(tracked) && lock.equals(await readFile(path.join(root, 'node_modules/.pnpm/lock.yaml'))), 'installed lock differs from tracked lock')

  const idMappings = new Map(), pathMappings = new Map(), excluded = new Set()
  let nextPhysical
  for (const family of FAMILIES) {
    const prefix = `${family}@${version}`
    const ids = Object.keys(packageMap.packages).filter((key) => key === prefix || key.startsWith(`${prefix}(`))
    requireThat(ids.length === 1, 'changed component identity is ambiguous')
    const id = ids[0], record = packageMap.packages[id]
    requireThat(record && Object.keys(record).sort().join(',') === 'dependencies,url' && typeof record.url === 'string' && record.dependencies?.[family] === id, 'changed component package map is invalid')
    const suffix = `/node_modules/${family}`
    requireThat(record.url.startsWith('./.pnpm/') && record.url.endsWith(suffix), 'changed component path is invalid')
    const virtual = record.url.slice('./.pnpm/'.length, -suffix.length)
    requireThat(virtual && !virtual.includes('/') && (family === 'next' ? /^next@15_[a-f0-9]{32}$/.test(virtual) : virtual === `${family.replace('/', '+')}@${version}`), 'unreviewed virtual store identity')
    idMappings.set(id, `${family}@<reviewed-next>${id.slice(prefix.length)}`)
    pathMappings.set(virtual, `${family.replace('/', '+')}@<reviewed-next>`)
    const physical = path.join(root, 'node_modules/.pnpm', virtual, 'node_modules', family)
    if (PHYSICAL.includes(family)) {
      requireThat((await realpath(physical)) === physical && (await lstat(physical)).isDirectory(), 'changed component is not a physical package directory')
      const manifest = JSON.parse(await readFile(path.join(physical, 'package.json'), 'utf8'))
      requireThat(manifest.name === family && manifest.version === version, 'changed package manifest differs')
      excluded.add(path.relative(root, physical))
      if (family === 'next') nextPhysical = physical
      const appLink = family === 'next' ? path.join(root, 'apps/generator-app/node_modules/next') : path.join(path.dirname(nextPhysical), family)
      requireThat((await realpath(appLink)) === physical, 'changed package dependency link differs')
    } else {
      let present = false
      try { await lstat(physical); present = true } catch (error) { if (error.code !== 'ENOENT') throw error }
      requireThat(!present, 'unreviewed native platform was installed')
    }
  }
  requireThat((await realpath(path.join(root, 'apps/client-template/node_modules/next'))) === (await realpath(path.join(root, 'apps/generator-app/node_modules/next'))), 'apps resolve different Next installations')
  const normalizeId = (value) => idMappings.get(value) ?? value
  const normalizePath = (value) => {
    requireThat(typeof value === 'string', 'non-string path')
    let result = value.replaceAll(`${root}/`, '<checkout>/')
    if (result === root) result = '<checkout>'
    for (const [from, to] of pathMappings) result = result.split('/').map((part) => part === from ? to : part).join('/')
    return result
  }
  const metadata = (relative, value) => {
    if (relative === 'node_modules/.modules.yaml') {
      requireThat(typeof value.prunedAt === 'string' && Number.isFinite(Date.parse(value.prunedAt)), 'invalid pnpm prune timestamp')
      return { ...value, prunedAt: '<timestamp>', hoistedDependencies: transformKeys(value.hoistedDependencies, normalizeId), skipped: value.skipped.map(normalizeId) }
    }
    if (relative === 'node_modules/.package-map.json') {
      const packages = transformKeys(value.packages, normalizeId)
      for (const [key, entry] of Object.entries(packages)) {
        requireThat(entry && Object.keys(entry).sort().join(',') === 'dependencies,url' && typeof entry.url === 'string' && entry.dependencies && typeof entry.dependencies === 'object', 'unsupported package map entry')
        packages[key] = { url: normalizePath(entry.url), dependencies: Object.fromEntries(Object.entries(entry.dependencies).map(([name, id]) => [name, normalizeId(id)])) }
      }
      return { packages }
    }
    requireThat(Number.isFinite(value.lastValidatedTimestamp) && value.lastValidatedTimestamp > 0 && value.projects && typeof value.projects === 'object', 'invalid workspace timestamp/projects')
    const projects = transformKeys(value.projects, (key) => projectPath(root, key))
    requireThat(Object.keys(projects).sort().join('\n') === ROOTS.map((entry) => `<checkout>${entry === 'node_modules' ? '' : `/${entry.slice(0, -'/node_modules'.length)}`}`).sort().join('\n'), 'unexpected workspace project set')
    return { ...value, lastValidatedTimestamp: '<timestamp>', projects }
  }

  const records = [], seen = new Set()
  let bytes = 0
  async function visit(relative) {
    const absolute = path.join(root, relative), before = await lstat(absolute)
    requireThat(records.length < 100000 && bytes <= 2 * 1024 ** 3, 'installation exceeds proof bounds')
    const normalized = normalizePath(relative)
    requireThat(!seen.has(normalized), 'normalized installed path collision')
    seen.add(normalized)
    const mode = before.mode & 0o777
    if (before.isSymbolicLink()) {
      const target = await readlink(absolute), resolved = await realpath(absolute)
      requireThat(resolved.startsWith(`${root}/`) && path.isAbsolute(resolved), 'installed link resolves outside checkout')
      records.push({ path: normalized, kind: 'link', mode, target: normalizePath(target), resolved: normalizePath(resolved) })
    } else if (before.isDirectory()) {
      records.push({ path: normalized, kind: excluded.has(relative) ? 'reviewed-next-component' : 'directory', mode })
      if (!excluded.has(relative)) for (const name of (await readdir(absolute)).sort()) await visit(`${relative}/${name}`)
    } else {
      requireThat(before.isFile() && before.size <= 128 * 1024 ** 2, 'unsupported installed file')
      const content = await readFile(absolute)
      bytes += content.length
      let compared = content
      if (relative === 'node_modules/.pnpm/lock.yaml') compared = Buffer.from('verified-exact-tracked-lock')
      else if (METADATA.has(relative)) compared = Buffer.from(canonical(metadata(relative, JSON.parse(content))))
      else if (/\/node_modules\/\.bin\/[^/]+$/.test(`/${relative}`)) {
        const wrapper = content.toString('utf8')
        requireThat(wrapper.startsWith('#!/bin/sh\nbasedir=$(dirname '), 'unrecognized generated executable wrapper')
        let nodePathLines = 0, targetLines = 0
        const safeWrapperPath = (value) => {
          requireThat(value.startsWith(`${root}/`) && path.normalize(value) === value && !/[\x00-\x20\"$`\\]/.test(value), 'unsafe generated wrapper path')
          return normalizePath(value)
        }
        const lines = wrapper.split('\n').map((line) => {
          if (line.startsWith('  export NODE_PATH=')) {
            const match = /^  export NODE_PATH=\"([^\"]*)\"$/.exec(line)
            requireThat(Boolean(match), 'invalid generated wrapper assignment')
            const entries = match[1].split(':')
            const inherited = entries.at(-1) === '$NODE_PATH' ? entries.pop() : null
            requireThat(entries.length > 0 && entries.length < 32, 'invalid wrapper module path list')
            nodePathLines++
            return `  export NODE_PATH=\"${entries.map(safeWrapperPath).join(':')}${inherited ? ':$NODE_PATH' : ''}\"`
          }
          if (line.startsWith('# cmd-shim-target=')) {
            targetLines++
            return `# cmd-shim-target=${safeWrapperPath(line.slice('# cmd-shim-target='.length))}`
          }
          requireThat(!line.includes(root) && ![...pathMappings.keys()].some((segment) => line.includes(segment)), 'generated wrapper embeds paths outside known fields')
          return line
        })
        requireThat(nodePathLines === 2 && targetLines === 1, 'generated wrapper fields are incomplete')
        compared = Buffer.from(lines.join('\n'))
      }
      records.push({ path: normalized, kind: 'file', mode, bytes: compared.length, sha256: HASH(compared) })
    }
    const after = await lstat(absolute)
    requireThat(before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs, 'installed path changed during fingerprint')
  }
  for (const entry of ROOTS) {
    let exists = true
    try { await lstat(path.join(root, entry)) } catch (error) { if (error.code === 'ENOENT') exists = false; else throw error }
    if (exists) await visit(entry)
    else records.push({ path: entry, kind: 'absent' })
  }
  requireThat(records.length > 100 && excluded.size === 3, 'installation is incomplete')
  records.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
  return { version: 2, fingerprintHash: digest(records), trackedLockHash: HASH(lock), entries: records.length, comparedBytes: bytes, excludedComponents: [...excluded].map(normalizePath).sort(), runtime: { node: process.version, platform: process.platform, arch: process.arch, libc: 'glibc', pnpm: '11.19.0' } }
}

async function runtimeProof(root) {
  const env = Object.fromEntries(SAFE_ENV.filter((key) => Object.hasOwn(process.env, key)).map((key) => [key, process.env[key]]))
  const script = fileURLToPath(new URL('./catalogue-prepare-runtime-v2.mjs', import.meta.url))
  const { stdout } = await execute(process.execPath, ['--experimental-import-meta-resolve', script, root], { cwd: root, env, timeout: 60000, maxBuffer: 2 * 1024 * 1024 })
  const result = JSON.parse(stdout)
  requireThat(result.version === 2 && result.node === process.version && result.directEdges === 29 && result.esmImports > 100 && result.cjsResolutions > 100 && /^[a-f0-9]{64}$/.test(result.fingerprintHash), 'runtime proof is incomplete')
  return result
}

export async function proveInstalledPair(sourceRoot, targetRoot) {
  assertDependencyProofEnvironment()
  const source = await fingerprintInstalledDependencies(sourceRoot, '15.5.27')
  const target = await fingerprintInstalledDependencies(targetRoot, '15.5.28')
  requireThat(source.fingerprintHash === target.fingerprintHash, 'non-Next installed bytes or resolution topology changed')
  const oldRuntime = await runtimeProof(sourceRoot), newRuntime = await runtimeProof(targetRoot)
  requireThat(canonical(oldRuntime) === canonical(newRuntime), 'protected runtime resolution or outputs changed')
  const sourceAfter = await fingerprintInstalledDependencies(sourceRoot, '15.5.27')
  const targetAfter = await fingerprintInstalledDependencies(targetRoot, '15.5.28')
  requireThat(canonical(source) === canonical(sourceAfter) && canonical(target) === canonical(targetAfter), 'installed pair changed during runtime proof')
  return { version: 2, source, target, runtime: { equal: true, hash: digest(oldRuntime), ...oldRuntime }, compilerExecuted: false, browserChecksRepeated: false, providerMutations: false }
}
