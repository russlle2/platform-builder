#!/usr/bin/env node
/**
 * Copies the monorepo's `platform-builder/` template library into
 * `apps/generator-app/public/_templates/` so the files are published as
 * STATIC ASSETS to Netlify's CDN — instead of being traced into the SSR
 * function bundle (which would exceed the 250 MB hard limit).
 *
 * Runtime template reads (e.g. /api/templates/.../html) fall back to
 * fetching these URLs because `next.config.js` excludes them from the
 * function bundle via `outputFileTracingExcludes`.
 *
 * Skips files whose destination mtime matches the source mtime — keeps
 * incremental builds + dev startups fast.
 */
import { promises as fsp, statSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(APP_ROOT, '..', '..')
const SRC = path.join(REPO_ROOT, 'platform-builder')
const DEST = path.join(APP_ROOT, 'public', '_templates')

if (!existsSync(SRC)) {
  console.error(`[copy-templates] Source not found: ${SRC}`)
  process.exit(1)
}

let copied = 0
let skipped = 0
let dirs = 0

async function walk(src, dest) {
  const entries = await fsp.readdir(src, { withFileTypes: true })
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
    dirs++
  }
  for (const entry of entries) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await walk(s, d)
    } else if (entry.isFile()) {
      const ss = statSync(s)
      let needsCopy = true
      if (existsSync(d)) {
        try {
          const ds = statSync(d)
          if (ds.size === ss.size && Math.floor(ds.mtimeMs) === Math.floor(ss.mtimeMs)) {
            needsCopy = false
          }
        } catch {
          needsCopy = true
        }
      }
      if (needsCopy) {
        await fsp.copyFile(s, d)
        // Preserve mtime so skip-logic works on next run.
        await fsp.utimes(d, ss.atime, ss.mtime)
        copied++
      } else {
        skipped++
      }
    }
  }
}

const t0 = Date.now()
await walk(SRC, DEST)
const dt = ((Date.now() - t0) / 1000).toFixed(1)
console.log(
  `[copy-templates] ${SRC} -> ${DEST}  (copied=${copied} skipped=${skipped} dirs=${dirs} in ${dt}s)`,
)
