import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEGACY_MODEL_FRAMING_TOKEN_ALLOWANCE,
  ModelBudget,
  buildBatchInput,
  buildBatchJsonl,
  estimateBatchInputReservation,
  estimateTokens,
  promptFingerprint,
  validateFragment,
  validateStructuredPatch,
  type UnresolvedFragment,
} from './model.js';

const fragment: UnresolvedFragment = {
  id: 'fragment-1',
  issueFingerprint: '0123456789abcdef0123456789abcdef',
  issueCodes: ['ambiguous_copy'],
  niche: 'wellness_coach',
  pageRole: 'services',
  fragment: '<section data-dc-node-id="x"><p>Ambiguous claim</p></section>',
  attempt: 1,
};

test('batch input is fragment-only, schema constrained, and uses the configured model', () => {
  const line = buildBatchInput(fragment);
  assert.equal(line.url, '/v1/responses');
  assert.equal(line.body.model, 'gpt-5.6-terra');
  assert.equal(line.body.store, false);
  assert.match(JSON.stringify(line.body), /json_schema/);
  assert.doesNotThrow(() => validateFragment(fragment));
  assert.match(promptFingerprint(fragment), /^[a-f0-9]{64}$/);
});

test('reservation covers the complete serialized batch line and non-ASCII bytes without a tokenizer', () => {
  const nonAscii = { ...fragment, fragment: '<p data-dc-node-id="x">明晰さ 🌿 café</p>' };
  const line = buildBatchInput(nonAscii);
  const serialized = `${JSON.stringify(line)}\n`;
  const estimate = estimateBatchInputReservation(line);
  assert.equal(estimateTokens('🌿'), Buffer.byteLength('🌿', 'utf8'));
  assert.equal(
    estimate.inputTokens,
    Buffer.byteLength(serialized, 'utf8') + LEGACY_MODEL_FRAMING_TOKEN_ALLOWANCE,
  );
  assert.ok(estimate.inputTokens > Buffer.byteLength(nonAscii.fragment, 'utf8'));
  assert.equal(estimate.totalTokens, estimate.inputTokens + estimate.outputTokens);
});

test('whole template documents are never accepted into the cloud lane', () => {
  assert.throws(
    () => validateFragment({ ...fragment, fragment: '<html><body>whole template</body></html>' }),
    /never a complete template/,
  );
});

test('matching issue clusters reuse one recipe and hard budgets fall back safely', () => {
  const budget = new ModelBudget({}, { maxTotalTokens: 5_000, maxUsd: 25 });
  const result = buildBatchJsonl([
    fragment,
    { ...fragment, id: 'fragment-2', fragment: '<p>Same issue elsewhere</p>' },
  ], budget);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.jsonl.trim().split('\n').length, 1);

  const tiny = new ModelBudget({}, { maxTotalTokens: 10, maxUsd: 25 });
  const stopped = buildBatchJsonl([fragment], tiny);
  assert.equal(stopped.accepted.length, 0);
  assert.equal(stopped.fallback[0]?.reason, 'token_ceiling');
});

test('an unexpected actual overage saturates the in-memory budget before rejecting it', () => {
  const estimate = estimateBatchInputReservation(buildBatchInput(fragment));
  const budget = new ModelBudget({}, { maxTotalTokens: estimate.totalTokens, maxUsd: 25 });
  const reservation = budget.reserve(fragment);
  assert.equal(reservation.allowed, true);
  assert.equal(budget.reconcile(reservation, {
    inputTokens: estimate.inputTokens + 1,
    outputTokens: estimate.outputTokens,
    totalTokens: estimate.totalTokens + 1,
    costUsd: estimate.costUsd,
  }), false);
  assert.equal(budget.usage.totalTokens, estimate.totalTokens);
  assert.equal(budget.reserve({ ...fragment, id: 'fragment-after-overage' }).allowed, false);
});

test('unsafe structured fragments are rejected after model output', () => {
  assert.throws(() => validateStructuredPatch({
    issueFingerprint: fragment.issueFingerprint,
    explanation: 'unsafe',
    operations: [{ op: 'replace_fragment', nodeId: 'x', safeHtml: '<script>alert(1)</script>' }],
  }), /unsafe markup/);
});
