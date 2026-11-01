import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createRequire, Module, builtinModules } from 'node:module'
import crypto from 'node:crypto'
const requireThat = (condition, reason) => { if (!condition) throw new Error(`Retained runtime proof: ${reason}`) }
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex')
const canonical = (value) => JSON.stringify(value, (_key, entry) => entry && !Array.isArray(entry) && typeof entry === 'object' ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : entry)
// These exact source parents/edges are bound by the unchanged factory/source guard.
const DIRECT_EDGES = [
  {
    "parent": "packages/template-factory/src/legacy/cloud-repair-integration.ts",
    "specifier": "parse5",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/compose.ts",
    "specifier": "parse5",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/compose.ts",
    "specifier": "postcss",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/dedupe.ts",
    "specifier": "parse5",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/dedupe.ts",
    "specifier": "postcss",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/foundation-alignment.ts",
    "specifier": "parse5",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/foundation-alignment.ts",
    "specifier": "postcss",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/pipeline.ts",
    "specifier": "parse5",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/pipeline.ts",
    "specifier": "tsx/cli",
    "kind": "require-resolve"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-content-clip.ts",
    "specifier": "parse5",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-content-clip.ts",
    "specifier": "postcss",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-content-clip.ts",
    "specifier": "postcss-selector-parser",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-main-styles.ts",
    "specifier": "postcss",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-main-styles.ts",
    "specifier": "postcss-selector-parser",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-overflow.ts",
    "specifier": "parse5",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-overflow.ts",
    "specifier": "postcss",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-overflow.ts",
    "specifier": "postcss-selector-parser",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-static-content.ts",
    "specifier": "postcss",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-svg-image-size.ts",
    "specifier": "parse5",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/primary-svg-image-size.ts",
    "specifier": "postcss",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/pseudo-layer.ts",
    "specifier": "postcss",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/render.ts",
    "specifier": "axe-core",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/render.ts",
    "specifier": "@playwright/test",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/render.ts",
    "specifier": "sharp",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/repair.ts",
    "specifier": "parse5",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/repair.ts",
    "specifier": "postcss",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/legacy/repair.ts",
    "specifier": "postcss-selector-parser",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/template-contract.ts",
    "specifier": "parse5",
    "kind": "import"
  },
  {
    "parent": "packages/template-factory/src/template-contract.ts",
    "specifier": "postcss",
    "kind": "import"
  }
]

async function main() {
  requireThat(process.execArgv.includes('--experimental-import-meta-resolve'), 'parent-specific import resolution flag is absent')
  requireThat(['NODE_OPTIONS', 'NODE_PATH', 'TSX_TSCONFIG_PATH', 'TSX_DISABLE_CACHE', 'ESBUILD_BINARY_PATH', 'PLAYWRIGHT_BROWSERS_PATH', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'].every((name) => !Object.hasOwn(process.env, name)), 'ambient loader configuration is present')
  const root = fs.realpathSync(process.argv[2])
  requireThat(root === path.resolve(process.argv[2]), 'checkout alias is forbidden')
  const norm = (value) => typeof value === 'string' ? value.replaceAll(`${root}/`, '<checkout>/') : value
  const record = (url) => {
    if (url.startsWith('node:') && builtinModules.includes(url.slice(5))) return { builtin: url }
    const file = url.startsWith('file:') ? fileURLToPath(url) : url
    requireThat(path.isAbsolute(file), 'resolved module is not a file')
    const resolved = fs.realpathSync(file)
    requireThat(resolved.startsWith(`${root}/`) && !/\/node_modules\/(?:next\/|@next\/)/.test(resolved), 'ambient or Next module resolved')
    requireThat(fs.statSync(resolved).isFile(), 'module is not regular')
    return { path: norm(resolved), sha256: hash(fs.readFileSync(resolved)) }
  }
  const edges = DIRECT_EDGES.map((edge) => {
    const parent = path.join(root, edge.parent), require = createRequire(parent)
    return { ...edge, esm: record(import.meta.resolve(edge.specifier, pathToFileURL(parent).href)), cjs: record(require.resolve(edge.specifier)) }
  })
  process.chdir(path.join(root, 'packages/template-factory'))
  const loaded = new Map(), imports = new Set()
  const original = Module._resolveFilename
  Module._resolveFilename = function (specifier, parent, ...rest) {
    const resolved = Reflect.apply(original, this, [specifier, parent, ...rest])
    if (typeof resolved === 'string' && path.isAbsolute(resolved)) {
      const entry = { parent: norm(parent?.filename ?? ''), specifier: norm(specifier), ...record(resolved) }
      loaded.set(canonical(entry), entry)
    }
    return resolved
  }
  const require = createRequire(path.join(root, 'packages/template-factory/package.json'))
  // The real tsx CLI registers both CJS and ESM paths; the app package is
  // CommonJS while the factory is ESM. ESM-only registration is insufficient
  // on Node 22's require(esm) bridge. Keep both package loaders in the proof.
  const unregisterCjs = require('tsx/cjs/api').register()
  const { register } = require('tsx/esm/api')
  const unregister = register({ onImport: (url) => imports.add(url) })
  const sequentialPreload = [
    'apps/generator-app/src/lib/template-preview-composition.ts',
    'apps/generator-app/src/lib/customer-preview-document.ts',
    'apps/generator-app/src/lib/customer-preview-editor-runtime.ts',
  ]
  let output
  try {
    // The default adapter loads these pure modules concurrently. Prime their
    // shared dependencies deterministically so first-loader parent observations
    // do not depend on scheduling; then exercise the unchanged default adapter.
    for (const relative of sequentialPreload) await import(pathToFileURL(path.join(root, relative)).href)
    const adapter = await import(pathToFileURL(path.join(root, 'packages/template-factory/src/legacy/customer-preview-adapter.ts')).href)
    const composers = await adapter.loadCustomerPreviewComposers()
    const editor = composers.getCustomerPreviewEditorScript('index.html')
    const preview = composers.composeTemplatePreview({ html: '<!doctype html><html><head><title>Probe</title></head><body><main><h1 data-edit-id="title">Probe title</h1><p>Small deterministic composition probe.</p></main></body></html>', page: 'index.html', fields: [], values: {}, colorScheme: 'original', fontVariation: 'original', structureVariation: 'original', customTheme: null })
    const document = composers.composeCustomerPreviewDocument({ ...preview, assetBase: 'https://example.invalid/probe/', trustedEditorScript: editor })
    await import(pathToFileURL(path.join(root, 'packages/template-factory/src/legacy/render.ts')).href)
    const sharp = require('sharp')
    const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#ffffff' } }).png().toBuffer()
    output = { editorHash: hash(editor), previewHash: hash(canonical(preview)), documentHash: hash(document), nativePngHash: hash(png), sharpVersions: sharp.versions }
  } finally {
    await unregister()
    unregisterCjs()
    Module._resolveFilename = original
  }
  const esm = [...imports].map((url) => record(url.split('?')[0])).sort((a, b) => canonical(a).localeCompare(canonical(b)))
  const cjs = [...loaded.values()].sort((a, b) => canonical(a).localeCompare(canonical(b)))
  const requiredPaths = [
    ...sequentialPreload,
    'packages/template-factory/src/legacy/customer-preview-adapter.ts',
    'packages/template-factory/src/legacy/render.ts',
    'node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/cjs/api/index.cjs',
    'node_modules/.pnpm/tsx@4.22.4/node_modules/tsx/dist/esm/api/index.cjs',
    'node_modules/.pnpm/@img+sharp-linux-x64@0.35.5/node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64-0.35.5.node',
  ]
  const mandatoryModules = requiredPaths.map((relative) => {
    const observed = [...esm, ...cjs].filter((entry) => entry.path === `<checkout>/${relative}`)
    requireThat(observed.length > 0 && new Set(observed.map((entry) => entry.sha256)).size === 1, 'required runtime module is absent or changed')
    return { path: relative, sha256: observed[0].sha256 }
  })
  const probeConfiguration = { loader: 'tsx-cjs-and-esm', sequentialPreload, defaultAdapterInvoked: true }
  const proof = { probeConfiguration, mandatoryModules, edges, esm, cjs, output }
  console.log(canonical({ version: 2, node: process.version, fingerprintHash: hash(canonical(proof)), directEdges: edges.length, esmImports: esm.length, cjsResolutions: cjs.length, outputHash: hash(canonical(output)), probeConfiguration, mandatoryModules, mandatoryModulesHash: hash(canonical(mandatoryModules)), compilerExecuted: false, browserChecksRepeated: false }))
}

main().catch(() => { console.error('Retained runtime proof failed; private runtime details suppressed'); process.exitCode = 1 })
