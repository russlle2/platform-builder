import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { lstat, readFile, realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

const need = (ok, message) => { if (!ok) throw new Error(message) }
const hash = value => createHash('sha256').update(value).digest('hex')
const packagePath = 'apps/generator-app'
const configVersions = ['25.2.6', '25.2.7'] // Reviewed path/config resolver implementations match.
const phases = ['load-pinned-tools', 'read-generated', 'normalize', 'serialize', 'stage', 'offline-resolve', 'equivalence', 'recheck']
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)

export function adapterFailurePhase(cause) {
  const bytes = cause?.stderr
  if (!(typeof bytes === 'string' || Buffer.isBuffer(bytes)) || Buffer.byteLength(bytes) > 4096) return 'unknown'
  try {
    const diagnostic = JSON.parse(bytes.toString().trim())
    if (Object.keys(diagnostic).sort().join('|') === 'phase|version' && diagnostic.version === 1 && phases.includes(diagnostic.phase)) return diagnostic.phase
  } catch { /* Only the helper's exact static envelope is accepted. */ }
  return 'unknown'
}

async function inPhase(phase, action) {
  try { return await action() } catch (error) { error.adapterPhase = phase; throw error }
}

export function validateAdapterConfigurationProof(proof) {
  const keys = ['version', 'netlifyCli', 'configVersion', 'generatedConfigSha256', 'configSha256', 'semanticSha256', 'normalizedPathCount', 'offlineEquivalent']
  need(proof && Object.keys(proof).sort().join('|') === keys.sort().join('|') && proof.version === 1 && proof.netlifyCli === '27.4.2' && configVersions.includes(proof.configVersion) && proof.offlineEquivalent === true, 'Invalid adapter configuration proof')
  for (const key of ['generatedConfigSha256', 'configSha256', 'semanticSha256']) need(/^[a-f0-9]{64}$/.test(proof[key]), 'Invalid adapter configuration digest')
  need(Number.isSafeInteger(proof.normalizedPathCount) && proof.normalizedPathCount >= 2 && proof.normalizedPathCount <= 100, 'Invalid adapter path count')
  return proof
}

// CLI 27.4.2 serializes its resolved configuration, including absolute paths.
// @netlify/config interprets leading '/' in TOML as repository-relative on the
// next read. Only undo that path normalization; never discard adapter settings.
export function normalizeAdapterConfiguration(generated, source, paths = path) {
  need(generated && typeof generated === 'object' && !Array.isArray(generated), 'Invalid generated adapter configuration')
  const result = structuredClone(generated)
  const root = paths.resolve(source)
  need(paths.isAbsolute(source) && generated.build?.base === root, 'Generated adapter base differs from the reviewed repository root')
  need(typeof generated.build.publish === 'string', 'Generated adapter publish directory is missing')
  const recognized = new Set(['build.base'])
  let normalizedPathCount = 1
  const convert = (object, key, field) => {
    if (object?.[key] === undefined) return
    const original = object[key]
    need(typeof original === 'string' && paths.isAbsolute(original) && !original.includes('\0'), 'Generated adapter path is not a resolved absolute path')
    const relative = paths.relative(root, original)
    need(!paths.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${paths.sep}`), 'Generated adapter path escapes the reviewed repository')
    need(paths.resolve(root, relative) === original, 'Generated adapter path is not canonical')
    object[key] = relative.split(paths.sep).join('/') || '.'
    recognized.add(field)
    normalizedPathCount++
  }
  // The reviewed source base is the repository root. Omitting this redundant
  // field also prevents config's second base lookup from selecting the original
  // root netlify.toml instead of this package's just-built adapter configuration.
  delete result.build.base
  for (const key of ['publish', 'edge_functions', 'functions']) convert(result.build, key, `build.${key}`)
  convert(result, 'functionsDirectory', 'functionsDirectory')
  // Pinned config's dot-prop lookup uses the literal '*' entry, not a glob.
  convert(result.functions?.['*'], 'deno_import_map', 'functions.*.deno_import_map')
  convert(result.database?.migrations, 'path', 'database.migrations.path')
  // Routing URLs are not filesystem paths. Reject unhandled filesystem-shaped
  // fields or an embedded runner root instead of silently rewriting free text.
  const inspect = (value, trail = []) => {
    if (typeof value === 'string') {
      const field = trail.join('.')
      if (recognized.has(field)) return
      if (/^edge_functions\.\d+\.(?:path|pattern|excludedPath|excludedPattern)(?:\.\d+)?$/.test(field) || /^(?:redirects|headers)\.\d+\./.test(field)) return // URL/HTTP rule, never a local file
      const key = trail.findLast(part => !/^\d+$/.test(part)) || ''
      const pathKey = /(?:^|_)(?:path|paths|directory|directories|dir|dirs|file|files|base|publish|import_map)$/.test(key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`))
      need(!value.includes(root) && !paths.isAbsolute(value) && !/^[A-Za-z]:[/\\]/.test(value) && !(pathKey && value.split(/[/\\]/).includes('..')), 'Generated adapter contains an unrecognized filesystem path')
    } else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) inspect(item, [...trail, key])
    }
  }
  inspect(result)
  return { config: result, normalizedPathCount }
}

function semantics(config, source) {
  const result = structuredClone(config)
  result.build.base ??= source
  // These are resolver provenance labels, not build/routing/function settings.
  for (const key of ['commandOrigin', 'publishOrigin']) delete result.build[key]
  for (const key of ['headersOrigin', 'redirectsOrigin', 'functionsDirectoryOrigin']) delete result[key]
  return result
}

export function assertAdapterConfigurationEquivalent(generated, resolved, source, target, paths = path) {
  need(resolved.context === 'production' && paths.resolve(resolved.buildDir) === paths.resolve(source) && paths.resolve(resolved.repositoryRoot) === paths.resolve(source), 'Offline adapter resolution changed context or directories')
  need(paths.resolve(resolved.configPath) === paths.resolve(target), 'Offline adapter resolution selected another configuration')
  const expected = semantics(generated, source)
  const actual = semantics(resolved.config, source)
  need(isDeepStrictEqual(actual, expected), 'Offline adapter configuration is not semantically equivalent')
  return hash(canonical(expected))
}

// Invoked inside the same pinned pnpm dlx environment used for build/upload.
// No package is added to either reviewed checkout or its dependency lockfile.
export async function findPinnedNetlifyPackage(searchPath = process.env.PATH || '') {
  for (const directory of searchPath.split(path.delimiter)) {
    if (path.basename(directory) !== '.bin' || path.basename(path.dirname(directory)) !== 'node_modules') continue
    const file = path.join(directory, '..', 'netlify-cli', 'package.json')
    try {
      const pkg = JSON.parse(await readFile(file, 'utf8'))
      need(pkg.name === 'netlify-cli' && pkg.version === '27.4.2', 'Unexpected pinned Netlify CLI version')
      return realpath(file)
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
  }
  throw new Error('Pinned Netlify CLI package is unavailable')
}

export async function loadPinnedAdapterTools(packageFile) {
  const pkg = JSON.parse(await readFile(packageFile, 'utf8'))
  need(pkg.name === 'netlify-cli' && pkg.version === '27.4.2', 'Unexpected pinned Netlify CLI version')
  const require = createRequire(packageFile)
  const configEntry = require.resolve('@netlify/config')
  const configRequire = createRequire(configEntry)
  const configPackage = JSON.parse(await readFile(path.join(path.dirname(configEntry), '../package.json'), 'utf8'))
  need(configPackage.name === '@netlify/config' && configVersions.includes(configPackage.version), 'Unexpected pinned Netlify config version')
  const [{ parse }, { default: tomlify }, { resolveConfig }] = await Promise.all([
    import(pathToFileURL(configRequire.resolve('smol-toml')).href),
    import(pathToFileURL(configRequire.resolve('tomlify-j0.4')).href),
    import(pathToFileURL(configEntry).href),
  ])
  return { parse, serialize: value => tomlify.toToml(value), resolveConfig, configVersion: configPackage.version }
}

export async function stageAdapterConfiguration(source, tools) {
  const app = path.join(source, packagePath)
  const generatedFile = path.join(app, '.netlify/netlify.toml')
  const { bytes, generated } = await inPhase('read-generated', async () => {
    const stat = await lstat(generatedFile)
    need(stat.isFile() && stat.size > 0 && stat.size < 2_000_000, 'Production adapter did not emit a bounded regular configuration')
    const bytes = await readFile(generatedFile)
    return { bytes, generated: tools.parse(bytes.toString('utf8')) }
  })
  const { config, normalizedPathCount } = await inPhase('normalize', () => normalizeAdapterConfiguration(generated, source))
  const staged = await inPhase('serialize', () => {
    const staged = Buffer.from(tools.serialize(config))
    // smol-toml returns null-prototype tables; compare values, not JS prototypes.
    need(staged.length > 0 && staged.length < 2_000_000 && canonical(tools.parse(staged.toString('utf8'))) === canonical(config), 'Adapter configuration serialization changed values')
    return staged
  })
  const target = path.join(app, 'netlify.toml')
  await inPhase('stage', () => writeFile(target, staged, { flag: 'wx' }))
  const resolved = await inPhase('offline-resolve', () => tools.resolveConfig({ config: target, cwd: source, repositoryRoot: source, packagePath, context: 'production', offline: true, mode: 'cli', buffer: true }))
  const semanticSha256 = await inPhase('equivalence', () => assertAdapterConfigurationEquivalent(generated, resolved, source, target))
  await inPhase('recheck', async () => need(hash(await readFile(target)) === hash(staged) && hash(await readFile(generatedFile)) === hash(bytes), 'Adapter configuration changed during offline verification'))
  return validateAdapterConfigurationProof({ version: 1, netlifyCli: '27.4.2', configVersion: tools.configVersion, generatedConfigSha256: hash(bytes), configSha256: hash(staged), semanticSha256, normalizedPathCount, offlineEquivalent: true })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    need(process.argv.length === 3 && path.isAbsolute(process.argv[2]), 'Unexpected adapter helper arguments')
    need(!process.env.NETLIFY_AUTH_TOKEN && !process.env.GITHUB_TOKEN && !process.env.INTERNAL_ADMIN_TOKEN && !process.env.SUPABASE_SERVICE_ROLE_KEY, 'Adapter helper must not inherit administrative credentials')
    const tools = await inPhase('load-pinned-tools', async () => loadPinnedAdapterTools(await findPinnedNetlifyPackage()))
    process.stdout.write(`${JSON.stringify(await stageAdapterConfiguration(process.argv[2], tools))}\n`)
  } catch (error) {
    // The resolver can include runner paths and configuration values in errors.
    process.stderr.write(`${JSON.stringify({ version: 1, phase: phases.includes(error.adapterPhase) ? error.adapterPhase : 'unknown' })}\n`)
    process.exitCode = 1
  }
}
