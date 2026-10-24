import test from 'node:test'
import assert from 'node:assert/strict'
import { PREPARATION_REQUIRED_FILES, PREPARATION_RUNTIME_FILES } from './catalogue-prepare-closure.mjs'
import { assertPreparationClosureV2, assertRetainedTreeV2, V2_DEPENDENCY_BLOBS, V2_SOURCE_SHA } from './catalogue-prepare-closure-v2.mjs'

function fixture() {
  const files = [...new Set([...PREPARATION_REQUIRED_FILES, ...Object.keys(V2_DEPENDENCY_BLOBS), 'packages/template-factory/foundations/example.html'])]
  const before = new Map(files.map((file) => [file, { path: file, mode: '100644', type: 'blob', object: V2_DEPENDENCY_BLOBS[file]?.[0] ?? 'a'.repeat(40) }]))
  const after = new Map([...before].map(([file, value]) => [file, { ...value, object: V2_DEPENDENCY_BLOBS[file]?.[1] ?? value.object }]))
  return { before, after }
}

test('V2 accepts only the three exact reviewed dependency blobs while retaining all other tree inputs', () => {
  const f = fixture(), result = assertRetainedTreeV2(f.before, f.after)
  assert.deepEqual(result.changed.map((entry) => entry.path).sort(), Object.keys(V2_DEPENDENCY_BLOBS).sort())
  assert(result.protectedRecords.some((record) => record.path === 'packages/template-factory/foundations/example.html'))
  assert.equal(result.protectedRecords.length, f.before.size - 2) // root package and certification core validated separately
})

test('no arbitrary Next patch, lock change, Windows-only integrity edit, manifest script or source substitution is accepted', async (t) => {
  for (const file of Object.keys(V2_DEPENDENCY_BLOBS)) for (const side of ['before', 'after']) await t.test(`${side}: ${file}`, () => {
    const f = fixture()
    f[side].set(file, { ...f[side].get(file), object: 'b'.repeat(40) })
    assert.throws(() => assertRetainedTreeV2(f.before, f.after), /Unreviewed V2 dependency transition/)
  })
})

test('all retained composer, factory, data and config bytes remain immutable', async (t) => {
  for (const file of [...PREPARATION_RUNTIME_FILES, 'packages/template-factory/src/legacy/customer-preview-adapter.ts', 'packages/template-factory/foundations/example.html', 'apps/generator-app/src/lib/compiler-compatibility-runtime.ts', 'pnpm-workspace.yaml', 'tsconfig.base.json', 'packages/template-factory/package.json']) await t.test(file, () => {
    const f = fixture()
    f.after.set(file, { ...f.after.get(file), object: 'c'.repeat(40) })
    assert.throws(() => assertRetainedTreeV2(f.before, f.after), /input changed/)
  })
})

test('added or removed resolution inputs cannot evade the full union check', async (t) => {
  for (const file of ['.npmrc', '.pnpmfile.cjs', 'patches/new.patch', '.yarn/plugins/new.cjs', 'apps/generator-app/src/tsconfig.json', 'apps/generator-app/src/lib/template-preview-composition.js', 'apps/generator-app/src/lib/compiler-compatibility-runtime/index.js', 'packages/another/package.json', '.node-version', '.gitattributes', 'apps/generator-app/next.config.js']) for (const side of ['before', 'after']) await t.test(`${side}: ${file}`, () => {
    const f = fixture()
    f[side].set(file, { path: file, mode: '100644', type: 'blob', object: 'd'.repeat(40) })
    assert.throws(() => assertRetainedTreeV2(f.before, f.after), /regular tracked file/)
  })
})

test('reviewed blobs cannot change mode, become symlinks or disappear', async (t) => {
  for (const file of Object.keys(V2_DEPENDENCY_BLOBS)) for (const mutation of ['mode', 'link', 'delete']) await t.test(`${file}: ${mutation}`, () => {
    const f = fixture()
    if (mutation === 'delete') f.after.delete(file)
    else f.after.set(file, { ...f.after.get(file), mode: mutation === 'link' ? '120000' : '100755' })
    assert.throws(() => assertRetainedTreeV2(f.before, f.after), /regular tracked file|mode changed/)
  })
})

test('V2 rejects reuse of the old dependency set and an unreviewed original source', () => {
  const f = fixture()
  assert.throws(() => assertRetainedTreeV2(f.before, f.before), /Unreviewed V2 dependency transition/)
  assert.throws(() => assertPreparationClosureV2('/nonexistent', 'a'.repeat(40), 'b'.repeat(40)), /exact reviewed original source/)
  assert.match(V2_SOURCE_SHA, /^[a-f0-9]{40}$/)
})
