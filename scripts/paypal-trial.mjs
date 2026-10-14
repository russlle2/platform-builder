#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const app = resolve(root, 'apps/generator-app')
const appRequire = createRequire(resolve(app, 'package.json'))

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: pnpm paypal:trial\nStarts http://localhost:3001/paypal-test with PayPal Sandbox only.\nPrompts privately for a Sandbox app client ID and secret. Credentials stay in memory.\nOptional environment: PAYPAL_SANDBOX_CLIENT_ID, PAYPAL_SANDBOX_CLIENT_SECRET, PAYPAL_TRIAL_PORT.\nRequires Node 22–24 and pnpm install --frozen-lockfile. No live payments or subscriptions.')
    return
  }
  const nodeMajor = Number(process.versions.node.split('.')[0])
  if (nodeMajor < 22 || nodeMajor >= 25) throw new Error('Use Node 22 or 24 for this repository.')
  let nextBin
  try { nextBin = appRequire.resolve('next/dist/bin/next') } catch {
    throw new Error('Install dependencies first: pnpm install --frozen-lockfile')
  }
  const port = process.env.PAYPAL_TRIAL_PORT || '3001'
  if (!/^\d{4,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
    throw new Error('PAYPAL_TRIAL_PORT must be a port between 1024 and 65535.')
  }
  let clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID?.trim()
  let clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET?.trim()
  console.log('\nDailyClarity PayPal trial — $0 real cost; $1.00 USD of sandbox money.\nGet Sandbox app credentials: https://developer.paypal.com/dashboard/applications/sandbox\nUse a separate Sandbox Personal buyer: https://developer.paypal.com/dashboard/accounts\n')
  if (!clientId || !clientSecret) {
    if (!process.stdin.isTTY) throw new Error('Run this command in a terminal for private credential prompts, or set PAYPAL_SANDBOX_CLIENT_ID and PAYPAL_SANDBOX_CLIENT_SECRET securely in your environment.')
    let muted = false
    const output = new Writable({ write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding)
      callback()
    } })
    const rl = createInterface({ input: process.stdin, output, terminal: true })
    async function privateQuestion(prompt) {
      process.stdout.write(prompt)
      muted = true
      try { return (await rl.question('')).trim() } finally {
        muted = false
        process.stdout.write('\n')
      }
    }
    try {
      clientId ||= await privateQuestion('Sandbox app client ID (hidden): ')
      clientSecret ||= await privateQuestion('Sandbox app secret (hidden): ')
    } finally { rl.close() }
  }
  if (!clientId || !clientSecret || /\s/.test(clientId + clientSecret)) throw new Error('Both Sandbox app credentials are required and must not contain whitespace.')

  // Explicit blanks prevent Next from loading production service values out of
  // existing .env files. The user's files are never modified or copied.
  const isolated = { ...process.env }
  const example = readFileSync(resolve(app, '.env.example'), 'utf8')
  for (const match of example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)) isolated[match[1]] = ''
  Object.assign(isolated, {
    NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1',
    DAILYCLARITY_ENVIRONMENT: 'development',
    NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
    NEXT_PUBLIC_PLATFORM_URL: `http://localhost:${port}`,
    PAYPAL_SANDBOX_SITE_URL: `http://localhost:${port}`,
    PAYPAL_SANDBOX_ENABLED: 'true',
    PAYPAL_SANDBOX_CLIENT_ID: clientId,
    PAYPAL_SANDBOX_CLIENT_SECRET: clientSecret,
    PAYPAL_SANDBOX_SESSION_SECRET: randomBytes(32).toString('hex'),
    BOOKING_KIT_ENABLED: 'false',
    ENABLE_TEST_PURCHASE: 'false',
  })
  console.log(`Open http://localhost:${port}/paypal-test when the server says Ready.\nCredentials are kept only in this process and its local server. Press Ctrl+C to stop.\n`)
  const child = spawn(process.execPath, [nextBin, 'dev', '--hostname', 'localhost', '--port', port], { cwd: app, env: isolated, stdio: 'inherit' })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
  child.on('error', () => { console.error('Could not start the local trial server.'); process.exitCode = 1 })
  child.on('exit', (code) => { process.exitCode = code ?? 0 })
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })
