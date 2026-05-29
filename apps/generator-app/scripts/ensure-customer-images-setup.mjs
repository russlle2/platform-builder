#!/usr/bin/env node
/**
 * Verifies Supabase env vars and ensures the customer-images storage bucket exists.
 *
 * Usage (from apps/generator-app):
 *   node scripts/ensure-customer-images-setup.mjs
 *
 * Reads credentials from process.env or .env.local in this directory.
 *
 * Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(__dirname, '..')

function loadEnvLocal() {
  const path = resolve(appRoot, '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'customer-images'

function fail(msg) {
  console.error(`\n✗ ${msg}`)
  process.exit(1)
}

function ok(msg) {
  console.log(`✓ ${msg}`)
}

if (!url) {
  fail('NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local or Netlify env.')
}
if (!key) {
  fail('SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local or Netlify env.')
}

ok(`Supabase URL configured (${url})`)
ok('Service role key configured')

const headers = {
  Authorization: `Bearer ${key}`,
  apikey: key,
}

// List buckets
const listRes = await fetch(`${url}/storage/v1/bucket`, { headers })
if (!listRes.ok) {
  const body = await listRes.text()
  fail(`Could not list storage buckets (${listRes.status}): ${body.slice(0, 200)}`)
}

const buckets = await listRes.json()
const exists = Array.isArray(buckets) && buckets.some((b) => b.id === BUCKET || b.name === BUCKET)

if (exists) {
  ok(`Storage bucket "${BUCKET}" already exists`)
} else {
  console.log(`… Creating bucket "${BUCKET}"…`)
  const createRes = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: 10485760,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    }),
  })
  if (!createRes.ok) {
    const body = await createRes.text()
    console.log('\nBucket API create failed — apply SQL migration in Supabase SQL Editor:')
    console.log('  apps/generator-app/supabase/migrations/20260528000000_customer_images_storage.sql')
    fail(`Create bucket failed (${createRes.status}): ${body.slice(0, 300)}`)
  }
  ok(`Created storage bucket "${BUCKET}"`)
}

// Smoke test upload path (optional tiny check — list folder)
const testList = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prefix: '', limit: 1 }),
})
if (testList.ok) {
  ok('Storage API reachable for customer-images')
} else {
  console.warn(`⚠ List objects returned ${testList.status} — bucket exists but check RLS/policies in dashboard`)
}

console.log('\nDone. Customer image uploads will persist to Supabase Storage.')
console.log('Ensure Netlify production has the same NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy.')
