import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ensureWorkLayout, resolveLegacyConfig } from './config.js';
import { LegacyLedger } from './ledger.js';
import {
  applyCloudRepairPatches,
  executeCloudRepairLane,
  planCloudRepairFragments,
} from './cloud-repair-integration.js';
import type { CloudBatchRecord, CloudRepairBatchClient } from './cloud-lane.js';

test('cloud planning accepts only bounded page-local copy failures', () => {
  const files = new Map<string, string | Uint8Array>([[
    'index.html',
    '<!doctype html><html><body><main><p data-dc-edit-id="old">hello@example.com</p></main></body></html>',
  ]]);
  const eligible = planCloudRepairFragments({
    files,
    errors: [{
      code: 'publication_contract',
      detail: 'index.html: contains a hard-coded email address',
    }],
    niche: 'wellness_coach',
    pageRoles: { 'index.html': 'home' },
    templateId: 7,
    attempt: 1,
  });
  assert.equal(eligible.eligible, true);
  if (!eligible.eligible) return;
  assert.equal(eligible.fragments.length, 1);
  assert.match(eligible.fragments[0]!.fragment, /data-dc-node-id="cloud-n0"/);
  assert.doesNotMatch(eligible.fragments[0]!.fragment, /data-dc-edit-id/);
  assert.equal(eligible.fragments[0]!.pageRole, 'home');

  const structural = planCloudRepairFragments({
    files,
    errors: [{ code: 'compatibility_runtime_count', page: 'index.html', detail: 'missing runtime' }],
    niche: 'wellness_coach',
    pageRoles: {},
    templateId: 7,
    attempt: 1,
  });
  assert.deepEqual(structural, {
    eligible: false,
    reason: 'Deterministic failure compatibility_runtime_count is not safe for fragment repair',
  });
});

test('cloud recipe fingerprints include niche and page-role boundaries', () => {
  const files = new Map<string, string | Uint8Array>([[
    'index.html',
    '<!doctype html><html><body><main><p>hello@example.com</p></main></body></html>',
  ]]);
  const plan = (niche: string, pageRole: string) => planCloudRepairFragments({
    files,
    errors: [{ code: 'publication_contract', page: 'index.html', detail: 'index.html: contains a hard-coded email address' }],
    niche,
    pageRoles: { 'index.html': pageRole },
    templateId: 7,
    attempt: 1,
  });
  const home = plan('wellness_coach', 'home');
  const contact = plan('wellness_coach', 'contact');
  const otherNiche = plan('aromatherapy', 'home');
  assert.equal(home.eligible && contact.eligible && otherNiche.eligible, true);
  if (!home.eligible || !contact.eligible || !otherNiche.eligible) return;
  assert.notEqual(home.fragments[0]!.issueFingerprint, contact.fragments[0]!.issueFingerprint);
  assert.notEqual(home.fragments[0]!.issueFingerprint, otherNiche.fragments[0]!.issueFingerprint);
});

test('patch replay enforces exact member preconditions and strips temporary IDs', () => {
  const html = '<!doctype html><html><body><main><p>hello@example.com</p></main></body></html>';
  const files = new Map<string, string | Uint8Array>([['index.html', html]]);
  const plan = planCloudRepairFragments({
    files,
    errors: [{ code: 'publication_contract', page: 'index.html', detail: 'index.html: contains a hard-coded email address' }],
    niche: 'wellness_coach',
    pageRoles: { 'index.html': 'home' },
    templateId: 8,
    attempt: 1,
  });
  assert.equal(plan.eligible, true);
  if (!plan.eligible) return;
  const member = plan.members[0]!;
  const outcome = {
    kind: 'patch' as const,
    issueFingerprint: member.fragment.issueFingerprint,
    fragmentIds: [member.fragment.id],
    attempt: 1,
    requestKey: 'request-safe',
    patch: {
      issueFingerprint: member.fragment.issueFingerprint,
      operations: [{ op: 'replace_text' as const, nodeId: 'cloud-n1', value: 'Contact us for current details.' }],
      explanation: 'Removed literal contact data.',
    },
  };
  const applied = applyCloudRepairPatches(files, plan, [outcome]);
  assert.equal(applied.appliedMembers, 1);
  assert.match(String(applied.files.get('index.html')), /Contact us for current details/);
  assert.doesNotMatch(String(applied.files.get('index.html')), /data-dc-node-id/);

  const changed = new Map(files);
  changed.set('index.html', html.replace('<main>', '<main class="changed">'));
  assert.throws(() => applyCloudRepairPatches(changed, plan, [outcome]), /changed after cloud repair preparation/);
});

class CompletedFakeClient implements CloudRepairBatchClient {
  uploaded = 0;
  created = 0;
  retrieved = 0;
  customId = '';
  fingerprint = '';

  async uploadJsonl(_filename: string, jsonl: string): Promise<string> {
    this.uploaded += 1;
    const line = JSON.parse(jsonl.trim()) as { custom_id: string; body: { input: string } };
    this.customId = line.custom_id;
    this.fingerprint = line.body.input.match(/Issue fingerprint: ([a-f0-9]+)/i)?.[1] ?? '';
    return 'file-input_fake';
  }

  async create(inputFileId: string): Promise<CloudBatchRecord> {
    this.created += 1;
    return { id: 'batch_fake_1', status: 'in_progress', input_file_id: inputFileId };
  }

  async retrieve(): Promise<CloudBatchRecord> {
    this.retrieved += 1;
    return {
      id: 'batch_fake_1',
      status: 'completed',
      input_file_id: 'file-input_fake',
      output_file_id: 'file-output_fake',
      usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
    };
  }

  async downloadFile(): Promise<string> {
    return `${JSON.stringify({
      custom_id: this.customId,
      response: {
        status_code: 200,
        body: {
          id: 'resp_fake_1',
          output: [{ content: [{ text: JSON.stringify({
            issueFingerprint: this.fingerprint,
            operations: [{ op: 'replace_text', nodeId: 'cloud-n1', value: 'Safe copy' }],
            explanation: 'Neutralized unsafe copy.',
          }) }] }],
        },
      },
    })}\n`;
  }
}

test('explicit execution prepares, submits, and reconciles through an injected offline client', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'cloud-integration-'));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  await mkdir(sourceRoot);
  const config = resolveLegacyConfig({ sourceRoot, workRoot, databasePath: 'ledger.sqlite', cloudRepair: true });
  await ensureWorkLayout(config);
  const ledger = new LegacyLedger({ databasePath: config.databasePath });
  try {
    const run = ledger.createRun({ command: 'run', ruleVersion: config.ruleVersion, sourceRoot, workRoot });
    const template = ledger.upsertTemplate(run.id, {
      legacySlug: 'cloud-test',
      niche: 'wellness_coach',
      sourcePath: join(sourceRoot, 'cloud-test'),
      sourceHash: 'source-cloud-test',
      pageCount: 1,
      stage: 'repair_pending',
    }, config.ruleVersion);
    const files = new Map<string, string | Uint8Array>([[
      'index.html', '<!doctype html><html><body><main><p>hello@example.com</p></main></body></html>',
    ]]);
    const plan = planCloudRepairFragments({
      files,
      errors: [{ code: 'publication_contract', page: 'index.html', detail: 'index.html: contains a hard-coded email address' }],
      niche: 'wellness_coach',
      pageRoles: { 'index.html': 'home' },
      templateId: template.id,
      attempt: 1,
    });
    assert.equal(plan.eligible, true);
    if (!plan.eligible) return;
    const client = new CompletedFakeClient();
    const outcomes = await executeCloudRepairLane({
      config,
      ledger,
      client,
      runId: run.id,
      laneId: 'integration-offline-a1',
      fragments: plan.fragments,
      pollIntervalMs: 1,
    });
    assert.equal(outcomes[0]?.kind, 'patch');
    assert.equal(client.uploaded, 1);
    assert.equal(client.created, 1);
    assert.equal(client.retrieved, 1);
    assert.equal(ledger.modelBudgetSnapshot().actualTokens, 120);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
