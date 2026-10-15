import test from 'node:test'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('standard-library archive transport preserves hidden proofs and rejects corrupt or unsafe archives', () => {
  const python = process.env.CATALOGUE_PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
  execFileSync(python, ['-B', fileURLToPath(new URL('./catalogue-archive.test.py', import.meta.url))], { stdio: 'pipe' })
})
