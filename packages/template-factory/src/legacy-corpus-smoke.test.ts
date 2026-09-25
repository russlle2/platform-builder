import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { join, relative } from 'node:path';
import { repairLegacyTemplate } from './legacy/compose.js';

const corpusRoot = process.env.LEGACY_CORPUS_SMOKE_ROOT;
const niches = ['aromatherapy', 'holistic_medicine', 'private_practice_therapist', 'sound_bath', 'wellness_coach'];

async function readTree(root: string): Promise<Map<string, string | Uint8Array>> {
  const output = new Map<string, string | Uint8Array>();
  const pending = [root];
  while (pending.length) {
    const directory = pending.pop()!;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (entry.isFile()) {
        const path = relative(root, full).replace(/\\/g, '/');
        const bytes = await readFile(full);
        output.set(path, /\.(?:html?|css|js|json|md|txt|xml|svg)$/i.test(path) ? bytes.toString('utf8') : bytes);
      }
    }
  }
  return output;
}

test('real legacy cohort smoke repair remains immutable and produces receipts', { skip: !corpusRoot }, async () => {
  for (const niche of niches) {
    const slugs = (await readdir(join(corpusRoot!, niche), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const chosen: string[] = [];
    for (const slug of slugs) {
      const indexPath = join(corpusRoot!, niche, slug, 'index.html');
      const index = await readFile(indexPath, 'utf8').catch(() => '');
      const cohort = /FOUNDATION:/i.test(index) ? 'foundation' : 'irregular';
      if (!chosen.some((value) => value.startsWith(`${cohort}:`))) chosen.push(`${cohort}:${slug}`);
      if (chosen.length === 2) break;
    }
    for (const entry of chosen) {
      const slug = entry.slice(entry.indexOf(':') + 1);
      const directory = join(corpusRoot!, niche, slug);
      const before = (await stat(directory)).mtimeMs;
      const files = await readTree(directory);
      const result = repairLegacyTemplate({ slug, niche, files });
      assert.ok(result.manifest.pages.length > 0, slug);
      assert.ok(result.editIds.length > 0, slug);
      assert.ok(result.qualityReceipt.id.startsWith('receipt_'), slug);
      assert.notEqual(
        result.qualityReceipt.status,
        'failed',
        `${slug}: ${result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('; ')}`,
      );
      assert.equal((await stat(directory)).mtimeMs, before, `${slug} source directory changed`);
    }
  }
});
