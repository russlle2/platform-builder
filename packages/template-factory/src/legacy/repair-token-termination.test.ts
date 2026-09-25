import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('literal defaults cannot recursively personalize existing or newly generated SVG bindings', () => {
  // A child-process deadline catches synchronous runaway replacement, which
  // a node:test promise timeout cannot interrupt. This froze the recovered
  // pilot while re-attesting wellness_coach-2026-02-16T04-06-46-658Z-017.
  const program = `
    import assert from 'node:assert/strict';
    import { repairLegacyTemplate } from './src/legacy/compose.ts';
    const result = repairLegacyTemplate({
      slug: 'svg-state-binding', niche: 'wellness_coach',
      files: new Map([
        ['index.html', '<!doctype html><html><head><title>Studio</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><svg xmlns="http://www.w3.org/2000/svg"><text>State</text><text>{{STATE}}</text><text>{{<tspan>STATE</tspan>}}</text></svg><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
        ['fields.json', JSON.stringify({ STATE: 'State', BUSINESS_NAME: 'Local Studio', EMAIL: 'care@example.com' })],
      ]),
    });
    const again = repairLegacyTemplate({ slug: 'svg-state-binding', niche: 'wellness_coach', files: result.files });
    for (const value of [result.files.get('index.html'), again.files.get('index.html')]) {
      assert.match(String(value), /STATE/);
      assert.doesNotMatch(String(value), /\\{\\{\\{/);
      assert.ok(String(value).length < 20_000);
    }
  `;
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', program], {
    cwd: new URL('../../', import.meta.url),
    timeout: 10_000,
    encoding: 'utf8',
  });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, child.stderr || child.stdout);
});
