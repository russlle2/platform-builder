import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { AssetVendor } from './assets.js';
import type { CloudBatchRecord, CloudRepairBatchClient } from './cloud-lane.js';
import { ensureWorkLayout, resolveLegacyConfig } from './config.js';
import { inventoryLegacyTemplate } from './inventory.js';
import { LegacyLedger } from './ledger.js';
import { repairOne } from './pipeline.js';
import type { LegacyCommandContext } from './types.js';

class PipelineCloudClient implements CloudRepairBatchClient {
  calls = 0;
  customId = '';
  fingerprint = '';

  async uploadJsonl(_filename: string, jsonl: string): Promise<string> {
    this.calls += 1;
    const line = JSON.parse(jsonl.trim()) as { custom_id: string; body: { input: string } };
    this.customId = line.custom_id;
    this.fingerprint = line.body.input.match(/Issue fingerprint: ([a-f0-9]+)/i)?.[1] ?? '';
    return 'file-pipeline_input';
  }

  async create(inputFileId: string): Promise<CloudBatchRecord> {
    this.calls += 1;
    return { id: 'batch_pipeline_1', status: 'in_progress', input_file_id: inputFileId };
  }

  async retrieve(): Promise<CloudBatchRecord> {
    this.calls += 1;
    return {
      id: 'batch_pipeline_1',
      status: 'completed',
      input_file_id: 'file-pipeline_input',
      output_file_id: 'file-pipeline_output',
      usage: { input_tokens: 80, output_tokens: 20, total_tokens: 100 },
    };
  }

  async downloadFile(): Promise<string> {
    this.calls += 1;
    return `${JSON.stringify({
      custom_id: this.customId,
      response: {
        status_code: 200,
        body: {
          id: 'resp_pipeline_1',
          output: [{ content: [{ text: JSON.stringify({
            issueFingerprint: this.fingerprint,
            operations: [{
              op: 'replace_text',
              nodeId: 'cloud-n2',
              value: 'Contact the practice for current details.',
            }],
            explanation: 'Replaced an unmatched template expression with neutral copy.',
          }) }] }],
        },
      },
    })}\n`;
  }
}

async function fixture(cloudRepair: boolean): Promise<{
  scratch: string;
  context: LegacyCommandContext;
  ledger: LegacyLedger;
  vendor: AssetVendor;
  lease: NonNullable<ReturnType<LegacyLedger['leaseTemplates']>[number]>;
}> {
  const scratch = await mkdtemp(join(tmpdir(), `legacy-pipeline-cloud-${cloudRepair ? 'on' : 'off'}-`));
  const sourceRoot = join(scratch, 'source');
  const workRoot = join(scratch, 'work');
  const templateRoot = join(sourceRoot, 'wellness_coach', 'literal-contact-copy');
  await mkdir(templateRoot, { recursive: true });
  await writeFile(join(templateRoot, 'index.html'), [
    '<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body>',
    '<main><h1>{{BUSINESS_NAME}}</h1><p>Unresolved editorial copy {{ broken</p>',
    '<a href="mailto:{{EMAIL}}">Contact us</a></main></body></html>',
  ].join(''));
  await writeFile(join(templateRoot, 'template.json'), JSON.stringify({
    slug: 'literal-contact-copy',
    niche: 'wellness_coach',
    pages: ['index.html'],
  }));
  await writeFile(join(templateRoot, 'fields.json'), JSON.stringify({
    fields: [
      { name: 'BUSINESS_NAME', default: 'Example Wellness' },
      { name: 'EMAIL', default: 'contact@example.test' },
    ],
  }));
  const config = resolveLegacyConfig({
    sourceRoot,
    workRoot,
    databasePath: 'ledger.sqlite',
    ruleVersion: 'cloud-integration-test',
    cloudRepair,
  });
  await ensureWorkLayout(config);
  const ledger = new LegacyLedger({ databasePath: config.databasePath });
  const run = ledger.createRun({ command: 'run', ruleVersion: config.ruleVersion, sourceRoot, workRoot });
  const inventory = await inventoryLegacyTemplate(sourceRoot, 'wellness_coach', 'literal-contact-copy');
  ledger.upsertTemplate(run.id, {
    legacySlug: inventory.slug,
    niche: inventory.niche,
    sourcePath: inventory.sourceDir,
    sourceHash: inventory.sourceTreeHash,
    pageCount: inventory.pages.length,
    stage: 'repair_pending',
  }, config.ruleVersion);
  const lease = ledger.leaseTemplates({
    stages: ['repair_pending'],
    claimedStage: 'repairing',
    owner: 'cloud-pipeline-test',
    limit: 1,
    leaseMs: 15 * 60_000,
    runId: run.id,
  })[0]!;
  const vendor = new AssetVendor(join(workRoot, 'asset-cache'));
  await vendor.initialize();
  return {
    scratch,
    ledger,
    vendor,
    lease,
    context: {
      command: 'run',
      config,
      flags: { resume: false, dryRun: false, json: false, cloudRepair },
      ledger,
      runId: run.id,
    },
  };
}

test('repairOne invokes the opt-in lane only for an unresolved eligible fragment and recompiles its patch', async () => {
  const setup = await fixture(true);
  const client = new PipelineCloudClient();
  setup.context.cloudRepairClient = client;
  try {
    const result = await repairOne(setup.context, setup.lease, setup.vendor);
    assert.equal(result, 'repaired');
    assert.equal(client.calls, 4);
    const template = setup.ledger.getTemplate(setup.lease.id)!;
    assert.equal(template.stage, 'render_pending');
    assert.equal(setup.ledger.modelBudgetSnapshot().actualTokens, 100);
    const artifact = setup.ledger.listArtifacts({ templateId: template.id, kind: 'candidate-template' })[0]!;
    const root = resolve(setup.context.config.workRoot, artifact.relativePath);
    const html = await readFile(join(root, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /\{\{ broken/);
    assert.match(html, /Contact the practice for current details/);
    const metadata = JSON.parse(await readFile(join(root, '.dailyclarity', 'rehabilitation.json'), 'utf8')) as {
      repairMode: string;
      cloudRepair: { enabled: boolean; attempted: boolean; attempts: number; laneIds: string[]; passed: boolean };
    };
    assert.equal(metadata.repairMode, 'cloud_fragment');
    assert.equal(metadata.cloudRepair.enabled, true);
    assert.equal(metadata.cloudRepair.attempted, true);
    assert.equal(metadata.cloudRepair.attempts, 1);
    assert.equal(metadata.cloudRepair.laneIds.length, 1);
    assert.equal(metadata.cloudRepair.passed, true);
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});

test('repairOne remains offline by default and uses its deterministic neutral fallback', async () => {
  const setup = await fixture(false);
  const client = new PipelineCloudClient();
  setup.context.cloudRepairClient = client;
  try {
    const result = await repairOne(setup.context, setup.lease, setup.vendor);
    assert.equal(result, 'neutral_fallback');
    assert.equal(client.calls, 0);
  } finally {
    setup.ledger.close();
    await rm(setup.scratch, { recursive: true, force: true });
  }
});
