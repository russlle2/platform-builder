import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workflow = readFileSync(new URL('../../../.github/workflows/demo-maintenance.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const steps = workflow.split(/^      - /m).slice(1)
const namedStep = name => {
  const step = steps.find(value => value.startsWith(`name: ${name}\n`))
  assert.ok(step, `Missing guarded step: ${name}`)
  return step
}

test('maintenance uses the production environment, exact main controller, read permissions and shared serialization', () => {
  assert.match(workflow, /^  workflow_dispatch:/m)
  assert.doesNotMatch(workflow, /^  (push|pull_request|schedule|workflow_run):/m)
  assert.match(workflow, /^  contents: read$/m)
  assert.match(workflow, /^  actions: read$/m)
  assert.doesNotMatch(workflow, /permissions: write-all|contents: write|actions: write/)
  assert.match(workflow, /^  group: dailyclarity-production$/m)
  assert.match(workflow, /^  cancel-in-progress: false$/m)
  assert.match(workflow, /^    environment: production$/m)
  assert.match(workflow, /github\.ref == 'refs\/heads\/main' && github\.repository == 'russlle2\/platform-builder'/)
  const gate = namedStep('Require successful CI and the actual current main controller')
  assert.match(gate, /verify-release-ci\.mjs/)
  assert.match(gate, /git\/ref\/heads\/main/)
  assert.match(gate, /object\?\.sha !== sha/)
  assert.doesNotMatch(gate, /^        if:/m)
})

test('all actions are immutable and the source is fixed, credential-free and guarded before execution', () => {
  const uses = [...workflow.matchAll(/^\s*(?:- )?uses: ([^\s#]+)/gm)].map(match => match[1])
  assert.ok(uses.length >= 5)
  for (const action of uses) assert.match(action, /^[a-z0-9/-]+@[a-f0-9]{40}$/i)
  for (const step of steps.filter(step => step.includes('actions/checkout@'))) assert.match(step, /persist-credentials: false/)
  const source = namedStep('Check out only the manifest source without retained credentials')
  assert.match(source, /ref: \$\{\{ steps\.locations\.outputs\.source_sha \}\}/)
  assert.doesNotMatch(source, /inputs\.(?!operation)/)
  const guard = namedStep('Prove the exact source tree and every permitted change before running source code')
  assert.match(guard, /run-demo-maintenance\.mjs validate-source/)
  const guardIndex = steps.indexOf(guard)
  for (const [index, step] of steps.entries()) if (step.includes('working-directory: source')) {
    assert.ok(index > guardIndex, 'Source execution preceded immutable source validation')
    assert.match(step, /inputs\.operation == 'prepare'/)
    assert.doesNotMatch(step, /GITHUB_TOKEN|NETLIFY_AUTH_TOKEN|INTERNAL_ADMIN_TOKEN|SERVICE_ROLE|STRIPE_SECRET/)
  }
  assert.match(namedStep('Install frozen source dependencies without release credentials'), /pnpm install --frozen-lockfile/)
})

test('dispatch data is environment-only and admin credentials are scoped to the controller operation', () => {
  assert.match(workflow, /RECORD_SOURCE_JSON: \$\{\{ inputs\.record_source \}\}/)
  assert.match(workflow, /QA_SOURCE_JSON: \$\{\{ inputs\.qa_source \}\}/)
  for (const step of steps) {
    const script = step.match(/^        run:([\s\S]*)/m)?.[1] ?? ''
    const runBeforeFollowingEnv = script.split(/^        env:/m)[0]
    assert.doesNotMatch(runBeforeFollowingEnv, /\$\{\{\s*inputs\./)
    if (/NETLIFY_AUTH_TOKEN|INTERNAL_ADMIN_TOKEN/.test(step)) assert.ok(step.startsWith('name: Run the guarded maintenance operation\n'))
  }
  assert.match(namedStep('Exercise maintenance guards'), /node --test apps\/generator-app\/scripts\/demo-maintenance\*\.test\.mjs/)
})

test('real build and public tests precede preparation and only bounded records are uploaded', () => {
  const operationIndex = steps.indexOf(namedStep('Run the guarded maintenance operation'))
  for (const name of ['Lint the exact maintenance source', 'Typecheck the exact maintenance source', 'Run the exact maintenance source unit tests', 'Check public routes locally without checkout or customer writes', 'Verify the source build without release credentials']) {
    assert.ok(steps.indexOf(namedStep(name)) < operationIndex)
  }
  assert.match(namedStep('Check public routes locally without checkout or customer writes'), /playwright test e2e\/public-routes\.spec\.ts/)
  const record = namedStep('Preserve the actual baseline and transition record after any interruption')
  assert.match(record, /if: \$\{\{ always\(\) \}\}/)
  assert.match(record, /name: demo-maintenance-record-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/)
  assert.match(record, /\/record\.json/)
  assert.match(record, /\/baseline\.json/)
  assert.doesNotMatch(record, /\.netlify|source\/|\*\*/)
  const qa = namedStep('Preserve actual draft browser and media verification')
  assert.match(qa, /inputs\.operation == 'verify-draft'/)
  assert.match(qa, /name: demo-maintenance-qa-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/)
  assert.match(qa, /path: \$\{\{ env\.QA_OUTPUT \}\}/)
})
