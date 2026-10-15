import { availableParallelism, cpus, freemem, type CpuInfo } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { MAX_LEGACY_CHROMIUM_WORKERS } from './types.js';

export const RENDER_SYSTEM_RESERVE_BYTES = 4 * 1024 ** 3;
export const RENDER_WORKER_BUDGET_BYTES = 1024 ** 3;
export const RENDER_CPU_RESERVE_FRACTION = 0.2;
export const RENDER_CAPACITY_WAIT_MS = 30_000;
const CPU_SAMPLE_INTERVAL_MS = 250;

export interface RenderResources {
  availableCpuCount: number;
  availableMemoryBytes: number;
  /** The lower idle fraction of two consecutive measured CPU intervals. */
  cpuIdleFraction: number;
}

export interface RenderWorkerDecision {
  workers: number;
  requestedCeiling: number;
  memoryBound: number;
  cpuBound: number;
  reason: 'capacity-available' | 'insufficient-headroom' | 'invalid-resource-reading' | 'invalid-worker-ceiling';
}

/** Admission budget for NEW browser trees; available RAM already excludes live processes. */
export function decideRenderWorkers(requested: number | undefined, resources: RenderResources): RenderWorkerDecision {
  const ceiling = requested ?? MAX_LEGACY_CHROMIUM_WORKERS;
  const unavailable = (reason: RenderWorkerDecision['reason']): RenderWorkerDecision => ({
    workers: 0, requestedCeiling: 0, memoryBound: 0, cpuBound: 0, reason,
  });
  if (!Number.isSafeInteger(ceiling) || ceiling <= 0) return unavailable('invalid-worker-ceiling');
  if (!Number.isSafeInteger(resources.availableCpuCount) || resources.availableCpuCount <= 0
    || !Number.isSafeInteger(resources.availableMemoryBytes) || resources.availableMemoryBytes < 0
    || !Number.isFinite(resources.cpuIdleFraction) || resources.cpuIdleFraction < 0 || resources.cpuIdleFraction > 1) {
    return unavailable('invalid-resource-reading');
  }
  const requestedCeiling = Math.min(ceiling, MAX_LEGACY_CHROMIUM_WORKERS);
  const memoryBound = Math.max(0, Math.floor(
    (resources.availableMemoryBytes - RENDER_SYSTEM_RESERVE_BYTES) / RENDER_WORKER_BUDGET_BYTES,
  ));
  const cpuBound = Math.max(0, Math.min(
    Math.floor(resources.availableCpuCount / 2),
    Math.floor(resources.availableCpuCount * Math.max(0, resources.cpuIdleFraction - RENDER_CPU_RESERVE_FRACTION)),
  ));
  const workers = Math.min(requestedCeiling, memoryBound, cpuBound);
  return { workers, requestedCeiling, memoryBound, cpuBound,
    reason: workers > 0 ? 'capacity-available' : 'insufficient-headroom' };
}

/** Counter deltas work on Windows too, where os.loadavg() is always zero. */
export function cpuIdleFraction(before: readonly CpuInfo['times'][], after: readonly CpuInfo['times'][]): number | null {
  if (before.length === 0 || before.length !== after.length) return null;
  let idle = 0;
  let total = 0;
  for (let index = 0; index < before.length; index += 1) {
    for (const field of ['user', 'nice', 'sys', 'idle', 'irq'] as const) {
      const previous = before[index]![field];
      const current = after[index]![field];
      if (!Number.isFinite(previous) || previous < 0 || !Number.isFinite(current) || current < previous) return null;
      const delta = current - previous;
      total += delta;
      if (field === 'idle') idle += delta;
    }
  }
  return total > 0 && Number.isFinite(total) ? idle / total : null;
}

function availableMemory(): number {
  const free = freemem();
  // Node's availableMemory accounts for the process/container limit when present.
  // A zero reading is genuine pressure, never permission to use host-only RAM.
  return typeof process.availableMemory === 'function' ? Math.min(free, process.availableMemory()) : free;
}

export async function sampleRenderResources(signal?: AbortSignal): Promise<RenderResources> {
  signal?.throwIfAborted();
  let previous = cpus().map((cpu) => cpu.times);
  let idle = 1;
  let memory = availableMemory();
  let parallelism = availableParallelism();
  for (let interval = 0; interval < 2; interval += 1) {
    await sleep(CPU_SAMPLE_INTERVAL_MS, undefined, { signal });
    const current = cpus().map((cpu) => cpu.times);
    idle = Math.min(idle, cpuIdleFraction(previous, current) ?? Number.NaN);
    memory = Math.min(memory, availableMemory());
    parallelism = Math.min(parallelism, availableParallelism());
    previous = current;
  }
  return { availableCpuCount: parallelism, availableMemoryBytes: memory, cpuIdleFraction: idle };
}

interface RenderCapacityOptions {
  signal?: AbortSignal;
  /** Injectable clocks/readings keep resource-pressure tests deterministic. */
  sample?: (signal?: AbortSignal) => Promise<RenderResources>;
  delay?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
  onDecision?: (decision: RenderWorkerDecision, resources: RenderResources) => void;
}

/** Re-sampled at each render batch; never opens a browser under insufficient budget. */
export async function recommendedRenderWorkers(requested?: number, options: RenderCapacityOptions = {}): Promise<number> {
  const { signal, sample = sampleRenderResources, now = () => performance.now(),
    onDecision = (decision, resources) => {
      process.stderr.write(`${JSON.stringify({ event: 'render.worker_admission', policy: 'absolute-budget-v1', ...decision, ...resources })}\n`);
    },
    delay = async (milliseconds, abortSignal) => { await sleep(milliseconds, undefined, { signal: abortSignal }); } } = options;
  signal?.throwIfAborted();
  const deadline = now() + RENDER_CAPACITY_WAIT_MS;
  let reason: RenderWorkerDecision['reason'] = 'invalid-resource-reading';
  while (now() < deadline) {
    signal?.throwIfAborted();
    const resources = await sample(signal);
    const decision = decideRenderWorkers(requested, resources);
    signal?.throwIfAborted();
    if (decision.reason === 'invalid-worker-ceiling') throw new Error('Invalid Chromium worker ceiling.');
    if (now() >= deadline) break;
    if (decision.workers > 0) {
      onDecision(decision, resources);
      return decision.workers;
    }
    reason = decision.reason;
    const remaining = deadline - now();
    if (remaining > 0) await delay(Math.min(1_000, remaining), signal);
  }
  throw new Error(`Browser scheduling stopped after ${RENDER_CAPACITY_WAIT_MS}ms: ${reason}. No browser capacity was admitted.`);
}
