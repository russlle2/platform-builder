import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RENDER_CAPACITY_WAIT_MS,
  RENDER_CPU_RESERVE_FRACTION,
  RENDER_SYSTEM_RESERVE_BYTES,
  RENDER_WORKER_BUDGET_BYTES,
  cpuIdleFraction,
  decideRenderWorkers,
  recommendedRenderWorkers,
  sampleRenderResources,
  type RenderResources,
} from './render-scheduling.js';

const GiB = 1024 ** 3;
const windows: RenderResources = { availableCpuCount: 24, availableMemoryBytes: Math.floor(10.35 * GiB), cpuIdleFraction: 0.88 };
const quietLargeHost = { ...windows, availableMemoryBytes: 32 * GiB, cpuIdleFraction: 0.95 };
const noLog = () => undefined;

test('absolute RAM budget admits six on the measured laptop while respecting every lower ceiling', () => {
  for (const requested of [1, 3, 4, 6, 8, 12, 99]) {
    const decision = decideRenderWorkers(requested, windows);
    assert.equal(decision.workers, Math.min(requested, 6));
    assert.equal(decision.memoryBound, 6);
    assert.equal(decision.cpuBound, 12);
    assert.equal(decision.requestedCeiling, Math.min(requested, 12));
  }
  assert.equal(decideRenderWorkers(undefined, quietLargeHost).workers, 12);
  assert.equal(decideRenderWorkers(99, quietLargeHost).workers, 12);
});

test('memory/CPU pressure reduces admission instead of guaranteeing a minimum browser count', () => {
  assert.equal(decideRenderWorkers(12, { ...quietLargeHost, availableMemoryBytes: 5 * GiB }).workers, 1);
  assert.equal(decideRenderWorkers(12, { ...quietLargeHost, availableMemoryBytes: 5 * GiB - 1 }).workers, 0);
  assert.equal(decideRenderWorkers(12, { ...quietLargeHost, availableMemoryBytes: 0 }).workers, 0);
  assert.equal(decideRenderWorkers(12, { ...quietLargeHost, cpuIdleFraction: 0.3 }).workers, 2);
  assert.equal(decideRenderWorkers(12, { ...quietLargeHost, cpuIdleFraction: 0.2 }).workers, 0);
  assert.equal(decideRenderWorkers(12, { ...quietLargeHost, availableCpuCount: 5 }).workers, 2);
  assert.equal(decideRenderWorkers(12, { ...quietLargeHost, availableCpuCount: 4 }).workers, 2);
  assert.equal(decideRenderWorkers(12, { ...quietLargeHost, availableCpuCount: 2 }).workers, 1);
  assert.equal(decideRenderWorkers(12, { ...quietLargeHost, availableCpuCount: 1 }).workers, 0);
});

test('all decisions preserve the explicit RAM, CPU headroom, host, and operator budgets', () => {
  for (const availableCpuCount of [1, 2, 4, 5, 8, 24, 64]) {
    for (const availableMemoryBytes of [0, 4 * GiB, 5 * GiB, 10 * GiB, 16 * GiB, 64 * GiB]) {
      for (const idle of [0, 0.2, 0.35, 0.5, 0.9, 1]) {
        for (const requested of [1, 4, 6, 8, 12, 99]) {
          const decision = decideRenderWorkers(requested, { availableCpuCount, availableMemoryBytes, cpuIdleFraction: idle });
          assert.ok(Number.isSafeInteger(decision.workers) && decision.workers >= 0);
          assert.ok(decision.workers <= Math.min(12, requested, Math.floor(availableCpuCount / 2)));
          assert.ok(decision.workers <= Math.floor(availableCpuCount * Math.max(0, idle - RENDER_CPU_RESERVE_FRACTION)));
          if (decision.workers > 0) {
            assert.ok(decision.workers * RENDER_WORKER_BUDGET_BYTES + RENDER_SYSTEM_RESERVE_BYTES <= availableMemoryBytes);
          }
        }
      }
    }
  }
});

test('malformed readings and worker limits never fall back to optimistic concurrency', () => {
  for (const invalid of [Number.NaN, Infinity, -1, 0.5]) {
    assert.equal(decideRenderWorkers(12, { ...windows, availableCpuCount: invalid }).reason, 'invalid-resource-reading');
    assert.equal(decideRenderWorkers(12, { ...windows, availableMemoryBytes: invalid }).workers, 0);
    assert.equal(decideRenderWorkers(invalid, windows).reason, 'invalid-worker-ceiling');
  }
  for (const invalid of [Number.NaN, Infinity, -0.1, 1.1]) {
    assert.equal(decideRenderWorkers(12, { ...windows, cpuIdleFraction: invalid }).workers, 0);
  }
  assert.equal(decideRenderWorkers(0, windows).reason, 'invalid-worker-ceiling');
});

test('CPU counter sampling measures interval headroom and rejects resets/missing deltas', () => {
  const zero = { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
  const first = { user: 20, nice: 0, sys: 10, idle: 70, irq: 0 };
  assert.equal(cpuIdleFraction([zero], [first]), 0.7);
  assert.equal(cpuIdleFraction([zero, zero], [first, { ...first, idle: 170 }]), 0.8);
  assert.equal(cpuIdleFraction([], []), null);
  assert.equal(cpuIdleFraction([zero], [zero]), null);
  assert.equal(cpuIdleFraction([first], [zero]), null);
  assert.equal(cpuIdleFraction([zero], [first, first]), null);
  assert.equal(cpuIdleFraction([zero], [{ ...first, idle: Number.NaN }]), null);
  assert.equal(cpuIdleFraction([zero], [{ ...first, user: -1 }]), null);
});

test('admission waits for a valid budget, logs only the actual decision, and samples again on the next batch', async () => {
  let time = 0;
  let samples = 0;
  const admitted: number[] = [];
  const options = {
    now: () => time,
    delay: async (milliseconds: number) => { time += milliseconds; },
    sample: async () => {
      samples += 1;
      return samples === 1 ? { ...windows, availableMemoryBytes: 4 * GiB } : windows;
    },
    onDecision: (decision: { workers: number }) => { admitted.push(decision.workers); },
  };
  assert.equal(await recommendedRenderWorkers(12, options), 6);
  assert.equal(samples, 2);
  assert.deepEqual(admitted, [6]);
  assert.equal(await recommendedRenderWorkers(12, { ...options,
    sample: async () => ({ ...windows, availableMemoryBytes: 5 * GiB }) }), 1);
  assert.deepEqual(admitted, [6, 1]);
});

test('persistent invalid/low resources stop within the fixed admission deadline without a false success', async () => {
  for (const snapshot of [{ ...windows, cpuIdleFraction: Number.NaN }, { ...windows, availableMemoryBytes: 0 }]) {
    let time = 0;
    let admissions = 0;
    await assert.rejects(recommendedRenderWorkers(12, {
      sample: async () => snapshot,
      now: () => time,
      delay: async (milliseconds) => { time += milliseconds; },
      onDecision: () => { admissions += 1; },
    }), /Browser scheduling stopped after 30000ms/);
    assert.equal(time, RENDER_CAPACITY_WAIT_MS);
    assert.equal(admissions, 0);
  }
  await assert.rejects(recommendedRenderWorkers(-1, { sample: async () => windows, onDecision: noLog }), /Invalid Chromium worker ceiling/);
});

test('cancellation interrupts both CPU sampling and admission waits before allocating render resources', async () => {
  const before = AbortSignal.abort(new Error('cancel before sample'));
  await assert.rejects(sampleRenderResources(before), /cancel before sample/);
  const controller = new AbortController();
  const sample = sampleRenderResources(controller.signal);
  controller.abort();
  await assert.rejects(sample, { name: 'AbortError' });
  const admission = new AbortController();
  let decisions = 0;
  await assert.rejects(recommendedRenderWorkers(12, {
    signal: admission.signal,
    sample: async () => ({ ...windows, availableMemoryBytes: 0 }),
    delay: async () => { admission.abort(new Error('cancel admission')); },
    onDecision: () => { decisions += 1; },
  }), /cancel admission/);
  assert.equal(decisions, 0);
});
