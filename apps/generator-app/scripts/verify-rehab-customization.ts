#!/usr/bin/env node

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  verifyRehabCustomizationStaging,
  type RehabCustomizationVerification,
} from '../src/lib/rehab-customization-verifier'

export interface VerifyRehabCustomizationCliOptions {
  root: string
  workers?: number
  maxDiagnostics?: number
  json: boolean
}

export interface VerifyRehabCustomizationIo {
  stdout(value: string): void
  stderr(value: string): void
}

const USAGE = [
  'Usage: pnpm verify:rehab-customization -- --root <staging-root> [options]',
  '',
  'Options:',
  '  --workers <1-64>             Concurrent template readers (default: 8)',
  '  --max-diagnostics <1-10000>  Maximum diagnostic records printed (default: 100)',
  '  --json                       Print the bounded machine-readable result',
  '  --help                       Show this help',
].join('\n')

function requiredValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`)
  return value
}

function positiveInteger(value: string, flag: string, maximum: number): number {
  if (!/^\d+$/.test(value)) throw new Error(`${flag} must be an integer`)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${flag} must be between 1 and ${maximum}`)
  }
  return parsed
}

export function parseVerifyRehabCustomizationArgs(args: readonly string[]): VerifyRehabCustomizationCliOptions | null {
  let root: string | undefined
  let workers: number | undefined
  let maxDiagnostics: number | undefined
  let json = false
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--') continue
    if (argument === '--help' || argument === '-h') return null
    if (argument === '--json') {
      json = true
      continue
    }
    if (argument === '--root') {
      if (root !== undefined) throw new Error('--root may be specified only once')
      root = requiredValue(args, index, argument)
      index += 1
      continue
    }
    if (argument === '--workers') {
      workers = positiveInteger(requiredValue(args, index, argument), argument, 64)
      index += 1
      continue
    }
    if (argument === '--max-diagnostics') {
      maxDiagnostics = positiveInteger(requiredValue(args, index, argument), argument, 10_000)
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${argument}`)
  }
  if (!root) throw new Error('--root is required; the verifier never guesses a staging directory')
  return { root: resolve(root), workers, maxDiagnostics, json }
}

function humanResult(result: RehabCustomizationVerification): string {
  const lines = [
    `${result.pass ? 'PASS' : 'FAIL'} legacy catalogue customization gate`,
    `root: ${result.root}`,
    `templates: ${result.scannedTemplates}/${result.catalogTemplates}`,
    `pages: ${result.pages}; stylesheets: ${result.stylesheets}`,
    `content entries: ${result.contentEntries}; image slots: ${result.imageSlots}; theme tokens: ${result.themeTokens}`,
    `diagnostics: ${result.diagnosticCount}${result.diagnosticsTruncated ? ` (${result.diagnosticsTruncated} omitted)` : ''}`,
  ]
  for (const diagnostic of result.diagnostics) {
    const location = [diagnostic.template, diagnostic.page, diagnostic.targetId].filter(Boolean).join(' :: ')
    lines.push(`- ${diagnostic.code}${location ? ` [${location}]` : ''}: ${diagnostic.detail}`)
  }
  return lines.join('\n')
}

export async function runVerifyRehabCustomizationCli(
  args: readonly string[],
  io: VerifyRehabCustomizationIo = {
    stdout: (value) => console.log(value),
    stderr: (value) => console.error(value),
  },
): Promise<number> {
  let options: VerifyRehabCustomizationCliOptions | null
  try {
    options = parseVerifyRehabCustomizationArgs(args)
  } catch (error) {
    io.stderr(`Error: ${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`)
    return 2
  }
  if (!options) {
    io.stdout(USAGE)
    return 0
  }
  try {
    const result = await verifyRehabCustomizationStaging(options)
    io.stdout(options.json ? JSON.stringify(result, null, 2) : humanResult(result))
    return result.pass ? 0 : 1
  } catch (error) {
    io.stderr(`Verification could not run: ${error instanceof Error ? error.message : String(error)}`)
    return 2
  }
}

const executable = process.argv[1]
if (executable && pathToFileURL(resolve(executable)).href === import.meta.url) {
  void runVerifyRehabCustomizationCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code
  })
}
