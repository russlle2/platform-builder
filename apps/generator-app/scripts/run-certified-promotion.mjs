#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { main, connectedTarget, deploymentProofBytes, reviewedHead } from './certified-catalog-release.mjs'

// This is a manual protected workflow entry point, never imported by runtime.
const env = process.env
const bundle = env.RELEASE_BUNDLE
if (!bundle || !env.ROLLBACK_RECORD || !/^[a-f0-9]{64}$/.test(env.RECEIPT_HASH ?? '') || env.DAILYCLARITY_ENVIRONMENT !== 'production') throw new Error('Explicit protected release configuration is incomplete')
if (env.OPERATION === 'rollback') {
  if (env.CONFIRMATION !== 'ROLLBACK CERTIFIED') throw new Error('Explicit rollback confirmation is required')
  await main(['rollback', '--record', path.join(bundle, 'rollback.json'), '--record-hash', env.RECEIPT_HASH])
} else {
  if (!['verify', 'promote'].includes(env.OPERATION)) throw new Error('Unknown release operation')
  if (env.OPERATION === 'promote' && (env.CONFIRMATION !== 'PROMOTE CERTIFIED' || !/^[a-f0-9]{64}$/.test(env.CONNECTED_EVIDENCE_HASH ?? ''))) throw new Error('Explicit promotion confirmation and connected evidence are required')
  const common = ['--root', path.join(bundle, 'library'), '--plan', path.join(bundle, 'promotion-dry-run.json'), '--receipt', path.join(bundle, 'certification.json'), '--receipt-hash', env.RECEIPT_HASH]
  await main(['verify', ...common])
  if (env.OPERATION === 'promote') {
    const evidence = ['--connected-evidence', path.join(bundle, 'connected-staging.json'), '--connected-evidence-hash', env.CONNECTED_EVIDENCE_HASH]
    const recordArgs = ['--record', env.ROLLBACK_RECORD]
    const readRecord = async () => JSON.parse(await readFile(env.ROLLBACK_RECORD, 'utf8'))
    await main(['capture', ...common, ...recordArgs])
    await main(['stage', ...common, ...recordArgs, ...evidence])
    const before = await readRecord()
    if (before.previousProfile === 'launch') await main(['bootstrap', ...common, ...recordArgs, ...evidence])
    await writeFile('apps/generator-app/public/__dailyclarity_release.json', deploymentProofBytes(reviewedHead(), env.RECEIPT_HASH))
    try {
      execFileSync('pnpm', ['--package=netlify-cli@27.4.2', 'dlx', 'netlify', 'deploy', '--build', '--prod', '--context', 'production', '--site', env.NETLIFY_SITE_ID, '--message', `Certified ${env.GITHUB_SHA} receipt ${env.RECEIPT_HASH}`], { stdio: 'inherit', env })
    } finally {
      // If publication succeeded but its CLI/health check failed, save the new
      // deployment ID using only Netlify API identity so rollback still works.
      const { site } = await connectedTarget(env, { readRuntime: false })
      if (site.published_deploy?.id !== before.previousDeploymentId) {
        const record = await readRecord()
        await main(['bind', ...recordArgs, '--record-hash', canonicalDigest(record), '--deployment-id', site.published_deploy.id])
      }
    }
    if (before.previousProfile !== 'launch') await main(['publish', ...common, ...recordArgs, ...evidence])
    const receipt = JSON.parse(await readFile(path.join(bundle, 'certification.json'), 'utf8'))
    execFileSync(process.execPath, ['apps/generator-app/scripts/verify-deployed-runtime.mjs'], { stdio: 'inherit', env: { ...env, NETLIFY_EXPECTED_RELEASE_SHA: env.GITHUB_SHA, NETLIFY_EXPECTED_CATALOG_PROFILE: 'rehab-certified', NETLIFY_EXPECTED_CATALOG_HASH: receipt.catalogHash, NETLIFY_EXPECTED_MANIFEST_HASH: receipt.manifestHash, NETLIFY_EXPECTED_CERTIFICATION_HASH: env.RECEIPT_HASH } })
  }
}
