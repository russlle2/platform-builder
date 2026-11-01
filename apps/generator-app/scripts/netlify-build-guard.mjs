#!/usr/bin/env node
// Dependency-free: Netlify runs ignore commands under Node 18 before install.
import { execFileSync } from 'node:child_process'
import { lstat, readFile, realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPOSITORY = 'russlle2/platform-builder'
const PRODUCTION = '4a98d266-bb9f-44ab-bf27-30597d741705'
const STAGING = 'e5f283c4-d2f2-4fc9-965d-f67f9875c074'
const MARKER = 'apps/generator-app/public/__dailyclarity_release.json'
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/
const need = (condition, message) => { if (!condition) throw new Error(message) }
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())

export function ignoreBuildExitCode(env) {
  // The local protected CLI does not use Netlify's hosted ignore phase.
  // Unknown hosted contexts stop as well; only explicit previews auto-build.
  return ['deploy-preview', 'branch-deploy'].includes(env.CONTEXT) ? 1 : 0
}

export function protectedBuildKind(env, head) {
  need(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_EVENT_NAME === 'workflow_dispatch'
    && env.GITHUB_REF === 'refs/heads/main' && SHA.test(head) && env.GITHUB_SHA === head && env.GITHUB_WORKFLOW_SHA === head,
  'Production-context builds require the reviewed manual main workflow')
  need(env.NETLIFY_EXPECTED_SITE_ID === env.NETLIFY_SITE_ID && env.NETLIFY_EXPECTED_ACCOUNT_SLUG === 'christopherlake96', 'Build target differs from the protected workflow target')
  const workflow = env.GITHUB_WORKFLOW_REF
  const expectedWorkflow = name => `${REPOSITORY}/.github/workflows/${name}@refs/heads/main`
  if (env.NETLIFY_SITE_ID === PRODUCTION && env.NETLIFY_EXPECTED_SITE_HOSTNAME === 'dailyclarity.org'
    && env.DEPLOY_ENVIRONMENT === 'production') {
    if (workflow === expectedWorkflow('deploy.yml') && env.OPERATION === 'promote' && env.CONFIRMATION === 'PROMOTE CERTIFIED'
      && HASH.test(env.RECEIPT_HASH || '') && HASH.test(env.CONNECTED_EVIDENCE_HASH || '')) return 'certified'
    if (workflow === expectedWorkflow('recover-baseline.yml') && env.OPERATION === 'recover' && env.CONFIRMATION === 'RECOVER BASELINE'
      && HASH.test(env.RECEIPT_HASH || '')) return 'recovery'
  }
  if (env.NETLIFY_SITE_ID === STAGING && env.NETLIFY_EXPECTED_SITE_HOSTNAME === 'dailyclarity-staging.netlify.app'
    && env.DEPLOY_ENVIRONMENT === 'staging') {
    if (workflow === expectedWorkflow('staging-catalogue.yml') && env.OPERATION === 'stage' && env.CONFIRMATION === 'STAGE FULL CATALOGUE'
      && HASH.test(env.RECEIPT_HASH || '')) return 'staging-catalogue'
    if (workflow === expectedWorkflow('deploy-staging.yml') && env.STAGING_BUILD_CONFIRMATION === 'STAGE') return 'staging-launch'
  }
  throw new Error('Production-context build is outside the supported protected release workflows')
}

export function assertProtectedBuild(env, head, marker) {
  const kind = protectedBuildKind(env, head)
  need(marker?.version === 1 && marker.releaseSha === head, 'Generated deployment marker does not identify this checkout')
  const valid = kind === 'certified'
    ? exactKeys(marker, ['version', 'releaseSha', 'certificationHash']) && marker.certificationHash === env.RECEIPT_HASH
    : kind === 'recovery'
      ? exactKeys(marker, ['version', 'profile', 'releaseSha', 'recoveryHash']) && marker.profile === 'launch-recovery' && HASH.test(marker.recoveryHash || '')
      : kind === 'staging-catalogue'
        ? exactKeys(marker, ['version', 'profile', 'releaseSha', 'certificationHash', 'journalHash']) && marker.profile === 'rehab-staging-candidate'
          && marker.certificationHash === env.RECEIPT_HASH && HASH.test(marker.journalHash || '')
        : exactKeys(marker, ['version', 'kind', 'releaseSha', 'siteId']) && marker.kind === 'dailyclarity-staging-launch' && marker.siteId === STAGING
  need(valid, 'Generated deployment marker is not the expected protected release kind')
  return kind
}

const git = (repository, args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
export async function readUntrackedMarker(repository) {
  need(git(repository, ['ls-files', '--', MARKER]) === '', 'A deployment marker must be generated, never committed')
  const file = path.join(repository, MARKER), details = await lstat(file)
  need(details.isFile() && !details.isSymbolicLink() && details.nlink === 1 && details.size > 0 && details.size <= 4096, 'Generated marker must be a bounded unlinked regular file')
  need(await realpath(file) === path.join(await realpath(repository), MARKER), 'Generated marker must remain inside the checkout')
  return JSON.parse(await readFile(file, 'utf8'))
}

async function main() {
  const mode = process.argv[2]
  if (mode === 'ignore') { process.exitCode = ignoreBuildExitCode(process.env); return }
  need(['build', 'write-staging-marker'].includes(mode), 'Unknown build guard operation')
  const repository = git(process.cwd(), ['rev-parse', '--show-toplevel'])
  const head = git(repository, ['rev-parse', 'HEAD'])
  git(repository, ['diff', '--quiet', 'HEAD'])
  if (mode === 'write-staging-marker') {
    need(protectedBuildKind(process.env, head) === 'staging-launch', 'Only the existing isolated staging launch workflow may create this marker')
    need(git(repository, ['ls-files', '--', MARKER]) === '', 'Deployment markers must not be tracked')
    const marker = { version: 1, kind: 'dailyclarity-staging-launch', releaseSha: head, siteId: STAGING }
    await writeFile(path.join(repository, MARKER), `${JSON.stringify(marker)}\n`, { flag: 'wx', mode: 0o600 })
  }
  assertProtectedBuild(process.env, head, await readUntrackedMarker(repository))
  console.log('Protected release build context verified. GitHub environment approval and release checks remain authoritative.')
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => {
  console.error('Production-context build stopped. Publish through the protected DailyClarity release workflows; deploy previews remain available.')
  process.exitCode = 1
})
