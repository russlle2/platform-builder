import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { LegacyLedger, type CloudRepairRecipeKey } from './ledger.js';

const baseKey: CloudRepairRecipeKey = {
  ruleVersion: 'rule-cache-v1',
  niche: 'wellness_coach',
  pageRole: 'home',
  issueFingerprint: 'a'.repeat(64),
};

const patch = {
  issueFingerprint: baseKey.issueFingerprint,
  operations: [{ op: 'replace_text', nodeId: 'cloud-n1', value: 'Safe copy' }],
  explanation: 'Replaced unsupported copy.',
};

test('recipe claims coalesce concurrent writers and survive restart', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-recipe-coalesce-'));
  const databasePath = join(scratch, 'ledger.sqlite');
  const ledgers = Array.from({ length: 8 }, () => new LegacyLedger({ databasePath }));
  try {
    const claims = await Promise.all(ledgers.map(async (ledger, index) => ledger.claimCloudRepairRecipe({
      ...baseKey,
      attempt: 1,
      ownerLaneId: `lane-${index}`,
      ownerRequestKey: `request-${index}`,
    })));
    assert.equal(claims.filter((claim) => claim.kind === 'claimed').length, 1);
    assert.equal(claims.filter((claim) => claim.kind === 'pending').length, 7);
    const owner = claims.find((claim) => claim.kind === 'claimed')!.record;
    assert.equal(ledgers[0]!.completeCloudRepairRecipe({
      ...baseKey,
      attempt: 1,
      ownerRequestKey: 'not-the-owner',
      patch,
    }), false);
    assert.equal(ledgers[0]!.completeCloudRepairRecipe({
      ...baseKey,
      attempt: 1,
      ownerRequestKey: owner.ownerRequestKey,
      patch,
    }), true);
    ledgers.forEach((ledger) => ledger.close());

    const resumed = new LegacyLedger({ databasePath });
    try {
      const cached = resumed.getCloudRepairRecipe(baseKey);
      assert.equal(cached?.status, 'completed');
      assert.deepEqual(cached?.patch, patch);
      assert.match(cached?.patchChecksum ?? '', /^[a-f0-9]{64}$/);
      assert.equal(resumed.claimCloudRepairRecipe({
        ...baseKey,
        attempt: 1,
        ownerLaneId: 'later-lane',
        ownerRequestKey: 'later-request',
      }).kind, 'completed');
    } finally {
      resumed.close();
    }
  } finally {
    for (const ledger of ledgers) {
      try { ledger.close(); } catch { /* already closed */ }
    }
    await rm(scratch, { recursive: true, force: true });
  }
});

test('recipe identity cannot cross rule, niche, or page-role boundaries', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-recipe-boundaries-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    const keys = [
      baseKey,
      { ...baseKey, ruleVersion: 'rule-cache-v2' },
      { ...baseKey, niche: 'aromatherapy' },
      { ...baseKey, pageRole: 'contact' },
    ];
    const claims = keys.map((key, index) => ledger.claimCloudRepairRecipe({
      ...key,
      attempt: 1,
      ownerLaneId: `boundary-${index}`,
      ownerRequestKey: `boundary-request-${index}`,
    }));
    assert.deepEqual(claims.map((claim) => claim.kind), ['claimed', 'claimed', 'claimed', 'claimed']);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('failed recipes allow exactly one new owner on attempt two', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-recipe-attempts-'));
  const ledger = new LegacyLedger({ databasePath: join(scratch, 'ledger.sqlite') });
  try {
    assert.equal(ledger.claimCloudRepairRecipe({
      ...baseKey,
      attempt: 1,
      ownerLaneId: 'first-lane',
      ownerRequestKey: 'first-request',
    }).kind, 'claimed');
    assert.equal(ledger.failCloudRepairRecipe({
      ...baseKey,
      attempt: 1,
      ownerRequestKey: 'first-request',
      reason: 'invalid_patch',
      detail: 'Schema mismatch',
    }), true);
    assert.equal(ledger.claimCloudRepairRecipe({
      ...baseKey,
      attempt: 1,
      ownerLaneId: 'duplicate-first',
      ownerRequestKey: 'duplicate-first-request',
    }).kind, 'failed');
    assert.equal(ledger.claimCloudRepairRecipe({
      ...baseKey,
      attempt: 2,
      ownerLaneId: 'second-lane',
      ownerRequestKey: 'second-request',
    }).kind, 'claimed');
    assert.equal(ledger.claimCloudRepairRecipe({
      ...baseKey,
      attempt: 2,
      ownerLaneId: 'duplicate-second',
      ownerRequestKey: 'duplicate-second-request',
    }).kind, 'pending');
    assert.throws(() => ledger.claimCloudRepairRecipe({
      ...baseKey,
      attempt: 3,
      ownerLaneId: 'third-lane',
      ownerRequestKey: 'third-request',
    } as never), /attempt must be 1 or 2/);
  } finally {
    ledger.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test('completed recipe patches fail closed when stored bytes are tampered', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'legacy-recipe-checksum-'));
  const databasePath = join(scratch, 'ledger.sqlite');
  const ledger = new LegacyLedger({ databasePath });
  try {
    ledger.claimCloudRepairRecipe({
      ...baseKey,
      attempt: 1,
      ownerLaneId: 'checksum-lane',
      ownerRequestKey: 'checksum-request',
    });
    assert.equal(ledger.completeCloudRepairRecipe({
      ...baseKey,
      attempt: 1,
      ownerRequestKey: 'checksum-request',
      patch,
    }), true);
  } finally {
    ledger.close();
  }

  const database = new DatabaseSync(databasePath);
  database.prepare('UPDATE cloud_repair_recipes SET patch_json = ?').run('{"tampered":true}');
  database.close();
  const reopened = new LegacyLedger({ databasePath });
  try {
    assert.throws(() => reopened.getCloudRepairRecipe(baseKey), /checksum mismatch/);
  } finally {
    reopened.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
