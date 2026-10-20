import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open, opendir, realpath } from 'node:fs/promises'
import path from 'node:path'

const APP = 'apps/generator-app'
const PUBLIC = `${APP}/public/`
const PUBLISH = `${APP}/.netlify/static`
const MARKER = '__dailyclarity_release.json'
const MAX_FILES = 10_000
const MAX_ENTRIES = 20_000
const MAX_DEPTH = 32
const MAX_FILE_BYTES = 128 * 1024 * 1024
const MAX_TREE_BYTES = 512 * 1024 * 1024
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
class StaticOutputError extends Error {}
const need = (condition, message) => { if (!condition) throw new StaticOutputError(message) }
const samePath = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
const comparePath = (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0
const validRelative = value => typeof value === 'string' && value.length > 0 && value.length <= 2048 &&
  !/[\\:\x00-\x1f\x7f]/.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..')

// Reject symlinks and junctions in the roots and every ancestor, including the
// source checkout itself. The per-entry checks below also reject nested links.
async function physicalDirectory(directory) {
  const absolute = path.resolve(directory)
  const root = path.parse(absolute).root
  let cursor = root
  for (const component of absolute.slice(root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component)
    const stat = await lstat(cursor)
    need(!stat.isSymbolicLink() && stat.isDirectory(), 'Adapter static path must contain only physical directories')
  }
  need(samePath(await realpath(absolute), absolute), 'Adapter static path resolves outside its physical location')
  return absolute
}

const sameStat = (a, b) => a.dev === b.dev && a.ino === b.ino && a.size === b.size &&
  a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs

async function hashRegularFile(file) {
  need(samePath(await realpath(file.absolute), file.absolute), 'Adapter static file resolves through a link')
  const handle = await open(file.absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const before = await handle.stat()
    need(before.isFile() && sameStat(before, file.stat), 'Adapter static file changed before verification')
    let bytes = 0
    const hash = createHash('sha256')
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      bytes += chunk.length
      need(bytes <= file.stat.size && bytes <= MAX_FILE_BYTES, 'Adapter static file exceeded its byte bound')
      hash.update(chunk)
    }
    need(bytes === file.stat.size && sameStat(before, await handle.stat()), 'Adapter static file changed during verification')
    const after = await lstat(file.absolute)
    need(!after.isSymbolicLink() && after.isFile() && sameStat(before, after), 'Adapter static file identity changed')
    return { path: file.path, bytes, sha256: hash.digest('hex') }
  } finally {
    await handle.close()
  }
}

async function scanTree(directory) {
  const root = await physicalDirectory(directory)
  const files = []
  let entries = 0
  let byteCount = 0
  async function walk(relative, depth) {
    need(depth <= MAX_DEPTH, 'Adapter static tree exceeds its depth bound')
    const current = path.join(root, ...relative.split('/').filter(Boolean))
    const stream = await opendir(current)
    for await (const entry of stream) {
      entries++
      need(entries <= MAX_ENTRIES, 'Adapter static tree exceeds its entry bound')
      const name = relative ? `${relative}/${entry.name}` : entry.name
      need(validRelative(name), 'Adapter static tree contains an unsafe relative name')
      const absolute = path.join(root, ...name.split('/'))
      const stat = await lstat(absolute)
      need(!stat.isSymbolicLink(), 'Adapter static tree contains a symbolic link')
      need(samePath(await realpath(absolute), absolute), 'Adapter static tree resolves through a link')
      if (stat.isDirectory()) {
        await walk(name, depth + 1)
      } else {
        need(stat.isFile(), 'Adapter static tree contains a non-regular entry')
        need(Number.isSafeInteger(stat.size) && stat.size >= 0 && stat.size <= MAX_FILE_BYTES, 'Adapter static file exceeds its byte bound')
        byteCount += stat.size
        files.push({ path: name, absolute, stat })
        need(files.length <= MAX_FILES && byteCount <= MAX_TREE_BYTES, 'Adapter static tree exceeds its file or byte bound')
      }
    }
  }
  await walk('', 0)
  // Check bounds from metadata before reading any possibly large file.
  files.sort(comparePath)
  const records = []
  for (const file of files) records.push(await hashRegularFile(file))
  await physicalDirectory(root)
  return records
}

/**
 * Verify the restored adapter static directory, never the raw .next directory.
 * Netlify's reviewed non-export adapter copies public/** and .next/static/**
 * into this directory. Other page content is stored in deployment blobs.
 * This proof describes observed bytes; it does not claim deployment success.
 */
export async function verifyAdapterStaticOutput(source, manifest, marker) {
  try {
    need(typeof source === 'string' && path.isAbsolute(source), 'Adapter static source must be an absolute checkout')
    const root = await physicalDirectory(source)
    need(Array.isArray(manifest?.files), 'Adapter static manifest is unavailable')
    const media = manifest.files.filter(file => typeof file?.path === 'string' && file.path.startsWith(PUBLIC))
    need(media.length === 24 && new Set(media.map(file => file.path)).size === 24, 'Adapter static manifest must seal exactly 24 media files')
    for (const file of media) {
      need(validRelative(file.path.slice(PUBLIC.length)) && typeof file.sha256 === 'string' && /^[a-f0-9]{64}$/.test(file.sha256) &&
        Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= MAX_FILE_BYTES,
      'Adapter static media identity is invalid')
    }
    need(marker && typeof marker === 'object' && !Array.isArray(marker), 'Adapter static release marker is invalid')
    const markerBytes = Buffer.from(`${JSON.stringify(marker)}\n`)
    need(markerBytes.length <= 64 * 1024, 'Adapter static release marker exceeds its byte bound')
    const markerSha256 = sha256(markerBytes)
    const publicFiles = await scanTree(path.join(root, APP, 'public'))
    const nextFiles = await scanTree(path.join(root, APP, '.next/static'))
    need(nextFiles.length > 0, 'Adapter static Next assets are missing')
    const publicByPath = new Map(publicFiles.map(file => [file.path, file]))
    const publicMarker = publicByPath.get(MARKER)
    need(publicMarker?.bytes === markerBytes.length && publicMarker.sha256 === markerSha256, 'Adapter static public marker bytes differ')
    for (const file of media) {
      const actual = publicByPath.get(file.path.slice(PUBLIC.length))
      need(actual?.bytes === file.bytes && actual.sha256 === file.sha256, 'Adapter static public media bytes differ')
    }
    const expected = [...publicFiles, ...nextFiles.map(file => ({ ...file, path: `_next/static/${file.path}` }))].sort(comparePath)
    need(new Set(expected.map(file => file.path)).size === expected.length, 'Adapter static input trees have colliding paths')
    need(expected.length <= MAX_FILES && expected.reduce((sum, file) => sum + file.bytes, 0) <= MAX_TREE_BYTES, 'Adapter static combined tree exceeds its bound')
    const actual = await scanTree(path.join(root, PUBLISH))
    need(actual.length === expected.length && actual.every((file, index) =>
      file.path === expected[index].path && file.bytes === expected[index].bytes && file.sha256 === expected[index].sha256),
    'Adapter static output differs from the complete public and Next asset trees')
    // Stable path ordering and alphabetically ordered object keys form the
    // canonical tree digest. No filesystem paths or provider values are returned.
    const canonicalTree = actual.map(file => ({ bytes: file.bytes, path: file.path, sha256: file.sha256 }))
    return {
      version: 1,
      publishDirectory: PUBLISH,
      fileCount: actual.length,
      byteCount: actual.reduce((sum, file) => sum + file.bytes, 0),
      mediaFiles: 24,
      markerSha256,
      treeSha256: sha256(JSON.stringify(canonicalTree)),
    }
  } catch (error) {
    if (error instanceof StaticOutputError) throw error
    // Native filesystem/JSON errors can include private absolute paths or values.
    throw new StaticOutputError('Adapter static output could not be verified')
  }
}
