import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, truncate, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { verifyAdapterStaticOutput } from './demo-maintenance-static-output.mjs'

const APP = 'apps/generator-app'
const PUBLISH = `${APP}/.netlify/static`
const MARKER = '__dailyclarity_release.json'
const digest = value => createHash('sha256').update(value).digest('hex')

function checkedFixturePath(root, target, allowRoot = false) {
  const absoluteRoot = path.resolve(root)
  assert.equal(path.dirname(absoluteRoot), path.resolve(os.tmpdir()))
  assert.match(path.basename(absoluteRoot), /^dc-static-output-[A-Za-z0-9]+$/)
  const absoluteTarget = path.resolve(target)
  const relative = path.relative(absoluteRoot, absoluteTarget)
  assert.ok(!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  assert.ok(allowRoot || relative !== '')
  return absoluteTarget
}

async function removeFixturePath(root, target, options, allowRoot = false) {
  await rm(checkedFixturePath(root, target, allowRoot), options)
}

async function moveFixturePath(root, from, to) {
  await rename(checkedFixturePath(root, from), checkedFixturePath(root, to))
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dc-static-output-'))
  // Only this test-owned directory is removed; production/source checkouts are
  // never mutated by these tests.
  checkedFixturePath(root, root, true)
  t.after(() => removeFixturePath(root, root, { recursive: true, force: true }, true))
  const app = path.join(root, APP)
  const pub = path.join(app, 'public')
  const next = path.join(app, '.next/static')
  const output = path.join(root, PUBLISH)
  await mkdir(path.join(pub, 'demo-videos/posters'), { recursive: true })
  await mkdir(path.join(next, 'chunks'), { recursive: true })
  await mkdir(path.join(next, 'css'), { recursive: true })
  const marker = { version: 1, kind: 'synthetic-test-only', producer: { runId: 'fixture', runAttempt: '1' } }
  const manifest = { files: [] }
  const expected = []
  async function add(directory, relative, bytes, outputPath = relative) {
    await writeFile(path.join(directory, relative), bytes)
    expected.push({ bytes: Buffer.byteLength(bytes), path: outputPath, sha256: digest(bytes) })
  }
  for (let i = 0; i < 6; i++) {
    for (const extension of ['mp4', 'txt', 'vtt', 'jpg']) {
      const relative = extension === 'jpg' ? `demo-videos/posters/demo-${i}.jpg` : `demo-videos/demo-${i}.${extension}`
      const bytes = `synthetic media ${i}/${extension}\n`
      await add(pub, relative, bytes)
      manifest.files.push({ path: `${APP}/public/${relative}`, bytes: Buffer.byteLength(bytes), sha256: digest(bytes) })
    }
  }
  await add(pub, MARKER, `${JSON.stringify(marker)}\n`)
  await add(pub, '__forms.html', '<form>synthetic</form>')
  await add(pub, 'logo.png', 'synthetic logo')
  await add(next, 'chunks/main.js', 'console.log("synthetic")', '_next/static/chunks/main.js')
  await add(next, 'css/main.css', 'body{color:green}', '_next/static/css/main.css')
  await cp(pub, output, { recursive: true })
  await cp(next, path.join(output, '_next/static'), { recursive: true })
  expected.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
  return { root, app, pub, next, output, manifest, marker, expected }
}

test('accepts only the complete transformed mirror and returns a canonical privacy-safe proof', async t => {
  const f = await fixture(t)
  const proof = await verifyAdapterStaticOutput(f.root, f.manifest, f.marker)
  assert.deepEqual(proof, {
    version: 1,
    publishDirectory: PUBLISH,
    fileCount: f.expected.length,
    byteCount: f.expected.reduce((sum, file) => sum + file.bytes, 0),
    mediaFiles: 24,
    markerSha256: digest(`${JSON.stringify(f.marker)}\n`),
    treeSha256: digest(JSON.stringify(f.expected)),
  })
  assert.equal(JSON.stringify(proof).includes(f.root), false)
  // Re-creation order cannot affect the digest.
  const original = await readFile(path.join(f.output, 'logo.png'))
  await removeFixturePath(f.root, path.join(f.output, 'logo.png'))
  await writeFile(path.join(f.output, 'logo.png'), original)
  assert.deepEqual(await verifyAdapterStaticOutput(f.root, f.manifest, f.marker), proof)
})

test('does not accept raw .next as the static output', async t => {
  const f = await fixture(t)
  await removeFixturePath(f.root, f.output, { recursive: true })
  await cp(path.join(f.app, '.next'), f.output, { recursive: true })
  await writeFile(path.join(f.output, 'BUILD_ID'), 'synthetic build id')
  await assert.rejects(verifyAdapterStaticOutput(f.root, f.manifest, f.marker), /complete public and Next asset trees/)
})

test('a later matching mirror with changed build bytes has a different proof', async t => {
  const f = await fixture(t)
  const original = await verifyAdapterStaticOutput(f.root, f.manifest, f.marker)
  await writeFile(path.join(f.next, 'chunks/main.js'), 'console.log("changed build")')
  await cp(path.join(f.next, 'chunks/main.js'), path.join(f.output, '_next/static/chunks/main.js'))
  const changed = await verifyAdapterStaticOutput(f.root, f.manifest, f.marker)
  assert.notEqual(changed.treeSha256, original.treeSha256)
  assert.equal(changed.markerSha256, original.markerSha256)
})

test('rejects missing output directory and does not expose the checkout path', async t => {
  const f = await fixture(t)
  await removeFixturePath(f.root, f.output, { recursive: true })
  await assert.rejects(verifyAdapterStaticOutput(f.root, f.manifest, f.marker), error =>
    error.message === 'Adapter static output could not be verified' && !error.message.includes(f.root))
})

for (const target of ['public', 'output']) {
  for (const change of ['missing', 'different', 'same-json-different-bytes']) {
    test(`rejects ${change} ${target} release marker`, async t => {
      const f = await fixture(t)
      const destination = path.join(target === 'public' ? f.pub : f.output, MARKER)
      if (change === 'missing') await removeFixturePath(f.root, destination)
      if (change === 'different') await writeFile(destination, '{"version":999}\n')
      if (change === 'same-json-different-bytes') await writeFile(destination, JSON.stringify(f.marker, null, 2))
      await assert.rejects(verifyAdapterStaticOutput(f.root, f.manifest, f.marker))
    })
  }
}

for (const [label, mutate] of [
  ['missing public media', f => removeFixturePath(f.root, path.join(f.pub, 'demo-videos/demo-0.mp4'))],
  ['different public and output media despite matching mirrors', async f => {
    for (const dir of [f.pub, f.output]) await writeFile(path.join(dir, 'demo-videos/demo-0.mp4'), 'tampered media')
  }],
  ['missing output media', f => removeFixturePath(f.root, path.join(f.output, 'demo-videos/demo-0.vtt'))],
  ['different output media', f => writeFile(path.join(f.output, 'demo-videos/demo-0.txt'), 'changed transcript')],
  ['missing generated Next file', f => removeFixturePath(f.root, path.join(f.output, '_next/static/chunks/main.js'))],
  ['different generated Next file', f => writeFile(path.join(f.output, '_next/static/css/main.css'), 'body{color:red}')],
  ['extra raw Next metadata', f => writeFile(path.join(f.output, 'app-build-manifest.json'), '{}')],
  ['unexpected extra static file', f => writeFile(path.join(f.output, 'unexpected.txt'), 'extra')],
  ['missing original public asset', f => removeFixturePath(f.root, path.join(f.output, 'logo.png'))],
  ['empty Next static tree', async f => { await removeFixturePath(f.root, f.next, { recursive: true }); await mkdir(f.next) }],
]) {
  test(`rejects ${label}`, async t => {
    const f = await fixture(t)
    await mutate(f)
    await assert.rejects(verifyAdapterStaticOutput(f.root, f.manifest, f.marker))
  })
}

test('rejects colliding public and generated asset paths', async t => {
  const f = await fixture(t)
  await mkdir(path.join(f.pub, '_next/static/chunks'), { recursive: true })
  await cp(path.join(f.next, 'chunks/main.js'), path.join(f.pub, '_next/static/chunks/main.js'))
  await assert.rejects(verifyAdapterStaticOutput(f.root, f.manifest, f.marker), /colliding paths/)
})

test('requires exactly 24 distinct sealed media files with strict byte and digest identities', async t => {
  const f = await fixture(t)
  for (const update of [
    m => m.files.pop(),
    m => m.files.push(m.files[0]),
    m => { m.files[1] = m.files[0] },
    m => { m.files[0].sha256 = 'A'.repeat(64) },
    m => { m.files[0].bytes = true },
    m => { m.files[0].bytes = 1.5 },
    m => { m.files[0].path = `${APP}/public/../outside` },
  ]) {
    const manifest = structuredClone(f.manifest)
    update(manifest)
    await assert.rejects(verifyAdapterStaticOutput(f.root, manifest, f.marker))
  }
})

test('rejects oversized files before attempting to read their bytes', async t => {
  const f = await fixture(t)
  const large = path.join(f.output, 'large.bin')
  await writeFile(large, '')
  await truncate(large, 128 * 1024 * 1024 + 1)
  await assert.rejects(verifyAdapterStaticOutput(f.root, f.manifest, f.marker), /byte bound/)
})

test('rejects an oversized aggregate tree from metadata without reading sparse content', async t => {
  const f = await fixture(t)
  for (let i = 0; i < 5; i++) {
    const large = path.join(f.output, `large-${i}.bin`)
    await writeFile(large, '')
    await truncate(large, 128 * 1024 * 1024)
  }
  await assert.rejects(verifyAdapterStaticOutput(f.root, f.manifest, f.marker), /file or byte bound/)
})

test('rejects deeply nested unexpected output', async t => {
  const f = await fixture(t)
  await mkdir(path.join(f.output, ...Array(34).fill('d')), { recursive: true })
  await assert.rejects(verifyAdapterStaticOutput(f.root, f.manifest, f.marker), /depth bound/)
})

for (const location of ['output-root', 'output-child', 'public-child', 'next-root', 'source-ancestor']) {
  test(`rejects directory links at ${location}`, async t => {
    const f = await fixture(t)
    let source = f.root
    let link
    let target
    if (location === 'output-root') {
      link = f.output; target = `${f.output}-real`; await moveFixturePath(f.root, link, target)
    } else if (location === 'next-root') {
      link = f.next; target = `${f.next}-real`; await moveFixturePath(f.root, link, target)
    } else if (location === 'source-ancestor') {
      link = path.join(f.root, 'linked-checkout'); target = f.app
      await symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir')
      source = path.join(link, 'nested')
      await mkdir(path.join(target, 'nested'))
    } else {
      link = path.join(location === 'output-child' ? f.output : f.pub, 'linked-assets')
      target = f.next
    }
    if (location !== 'source-ancestor') await symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir')
    await assert.rejects(verifyAdapterStaticOutput(source, f.manifest, f.marker), /physical directories|symbolic link/)
  })
}
