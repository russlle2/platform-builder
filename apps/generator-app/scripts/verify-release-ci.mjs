#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function assertReleaseCi(runs, releaseSha, repository) {
  if (!/^[a-f0-9]{40}$/.test(releaseSha ?? '') || !Array.isArray(runs) || !runs.some((run) => run.head_sha === releaseSha && run.status === 'completed' && run.conclusion === 'success' && run.event === 'push' && run.head_branch === 'main' && run.path === '.github/workflows/ci.yml' && run.head_repository?.full_name === repository)) throw new Error('The exact release commit requires a successful GitHub CI push run on main; previews, PR merge refs, and unrelated checks do not qualify')
}
async function main() {
  const { GITHUB_REPOSITORY: repository, GITHUB_SHA: sha, GITHUB_TOKEN: token } = process.env
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '') || !/^[a-f0-9]{40}$/.test(sha ?? '') || !token) throw new Error('GitHub release identity and actions-read credential are required')
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/ci.yml/runs?head_sha=${sha}&status=success&per_page=100`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`GitHub CI evidence unavailable (${response.status})`)
  assertReleaseCi((await response.json()).workflow_runs, sha, repository)
  console.log(`Verified successful GitHub CI on main at ${sha}`)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
