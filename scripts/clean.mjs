import { readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const targets = [path.join(repoRoot, 'node_modules')]

for (const workspaceDirectory of ['apps', 'packages']) {
  const workspaceRoot = path.join(repoRoot, workspaceDirectory)
  const entries = await readdir(workspaceRoot, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const packageRoot = path.join(workspaceRoot, entry.name)
    targets.push(
      path.join(packageRoot, 'node_modules'),
      path.join(packageRoot, '.next'),
      path.join(packageRoot, 'dist'),
    )
  }
}

for (const target of targets) {
  const relative = path.relative(repoRoot, path.resolve(target))
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove a path outside the repository: ${target}`)
  }
  await rm(target, { recursive: true, force: true })
}

console.log(`Removed ${targets.length} generated dependency and build directories.`)
