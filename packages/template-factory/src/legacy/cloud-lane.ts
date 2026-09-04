import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import {
  LEGACY_MODEL_POLICY,
  buildBatchInput,
  estimateTokens,
  parseBatchOutput,
  promptFingerprint,
  validateFragment,
  validateStructuredPatch,
  type OpenAIBatchRecord,
  type StructuredRepairPatch,
  type UnresolvedFragment,
} from './model.js';
import { assertWorkPath, atomicWriteFile, isPathWithin } from './config.js';
import type {
  ClaimCloudRepairRecipeInput,
  ClaimCloudRepairRecipeResult,
  CloudRepairRecipeKey,
  CloudRepairRecipeRecord,
} from './ledger.js';
import type {
  LegacyCompilerConfig,
  ModelBudgetSnapshot,
  ModelUsageInput,
} from './types.js';

/**
 * Durable orchestration for the optional OpenAI Batch/Responses repair lane.
 *
 * This module intentionally has no environment-variable or SDK dependency. A
 * caller must explicitly inject a client, which keeps preparation and all tests
 * offline and prevents this layer from ever reading or logging an API key.
 */

export const CLOUD_LANE_STATE_VERSION = 1 as const;
export const CLOUD_LANE_DIRECTORY = 'cloud-lane';
export const CONSERVATIVE_USD_PER_MILLION_TOKENS = 25;

const MAX_BATCH_REQUESTS = 50_000;
const MAX_BATCH_BYTES = 200 * 1024 * 1024;
const FILE_ID_PATTERN = /^file-[A-Za-z0-9_-]+$/;
const BATCH_ID_PATTERN = /^batch_[A-Za-z0-9_-]+$/;
const LANE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;
const FRAGMENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const ISSUE_FINGERPRINT_PATTERN = /^[a-f0-9]{16,128}$/i;

const BATCH_TERMINAL_STATUSES = new Set(['completed', 'failed', 'expired', 'cancelled']);
const BATCH_STATUSES = new Set([
  'validating',
  'failed',
  'in_progress',
  'finalizing',
  'completed',
  'expired',
  'cancelling',
  'cancelled',
]);

export interface CloudRepairFragment extends UnresolvedFragment {
  /** Optional attribution for the single clustered model request in the ledger. */
  templateId?: number | null;
}

export interface CloudApiUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export interface CloudBatchRecord extends OpenAIBatchRecord {
  input_file_id?: string | null;
  usage?: CloudApiUsage | null;
  request_counts?: {
    total?: number;
    completed?: number;
    failed?: number;
  } | null;
}

/** Transport boundary implemented by the private-credential native client. */
export interface CloudRepairBatchClient {
  uploadJsonl(filename: string, jsonl: string): Promise<string>;
  create(inputFileId: string, laneId?: string): Promise<CloudBatchRecord>;
  retrieve(batchId: string): Promise<CloudBatchRecord>;
  downloadFile(fileId: string): Promise<string>;
  /**
   * Optional authoritative recovery for the only non-transactional boundary:
   * a process can stop after batch creation succeeds but before its id is saved.
   * When absent, this lifecycle refuses to create a possible duplicate batch.
   */
  recoverBatchByInputFileId?(inputFileId: string, laneId: string): Promise<CloudBatchRecord | null>;
}

/** The existing LegacyLedger satisfies this interface without an adapter. */
export interface CloudLaneLedger {
  reserveModelUsage(input: Omit<ModelUsageInput, 'status'>): boolean;
  reconcileModelUsage(input: ModelUsageInput): void;
  modelBudgetSnapshot(): ModelBudgetSnapshot;
  getCloudRepairRecipe?(key: CloudRepairRecipeKey): CloudRepairRecipeRecord | null;
  claimCloudRepairRecipe?(input: ClaimCloudRepairRecipeInput): ClaimCloudRepairRecipeResult;
  completeCloudRepairRecipe?(input: CloudRepairRecipeKey & {
    attempt: 1 | 2;
    ownerRequestKey: string;
    patch: unknown;
  }): boolean;
  failCloudRepairRecipe?(input: CloudRepairRecipeKey & {
    attempt: 1 | 2;
    ownerRequestKey: string;
    reason: string;
    detail?: string | null;
  }): boolean;
}

export type CloudLanePhase =
  | 'prepared'
  | 'uploading'
  | 'uploaded'
  | 'creating'
  | 'submitted'
  | 'settling'
  | 'settled';

export type CloudFailureReason =
  | 'token_ceiling'
  | 'cost_ceiling'
  | 'attempt_ceiling'
  | 'batch_failed'
  | 'batch_expired'
  | 'batch_cancelled'
  | 'missing_output'
  | 'request_failed'
  | 'invalid_patch'
  | 'output_integrity';

export type CloudLaneOutcome =
  | {
      kind: 'pending';
      issueFingerprint: string;
      fragmentIds: string[];
      attempt: number;
      requestKey: string;
    }
  | {
      kind: 'patch';
      issueFingerprint: string;
      fragmentIds: string[];
      attempt: number;
      requestKey: string;
      patch: StructuredRepairPatch;
    }
  | {
      kind: 'retry';
      issueFingerprint: string;
      fragmentIds: string[];
      attempt: number;
      requestKey: string;
      reason: Exclude<CloudFailureReason, 'token_ceiling' | 'cost_ceiling' | 'attempt_ceiling'>;
      nextAttempt: 2;
      detail?: string;
    }
  | {
      kind: 'neutral_fallback';
      issueFingerprint: string;
      fragmentIds: string[];
      attempt: number;
      requestKey?: string;
      reason: 'token_ceiling' | 'cost_ceiling' | 'attempt_ceiling';
      detail?: string;
    };

export interface CloudLaneArtifact {
  remoteFileId: string;
  relativePath: string;
  sha256: string;
  byteSize: number;
}

export interface CloudLaneRequestState {
  requestKey: string;
  customId: string;
  issueFingerprint: string;
  promptFingerprint: string;
  attempt: 1 | 2;
  representativeFragmentId: string;
  fragmentIds: string[];
  allowedNodeIds: string[];
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  recipeKey?: CloudRepairRecipeKey;
  ledgerStatus: 'reserved' | 'submitted' | 'completed' | 'failed' | 'cancelled';
  outcome: CloudLaneOutcome;
  responseId?: string;
  actualInputTokens?: number;
  actualOutputTokens?: number;
  actualCostUsd?: number;
}

export interface CloudLaneRecipeWaiter {
  recipeKey: CloudRepairRecipeKey;
  issueFingerprint: string;
  fragmentIds: string[];
  attempt: 1 | 2;
  requestKey: string;
  memberAllowedNodeIds: Array<{ fragmentId: string; allowedNodeIds: string[] }>;
  outcome: CloudLaneOutcome;
}

export interface CloudLaneState {
  schemaVersion: typeof CLOUD_LANE_STATE_VERSION;
  laneId: string;
  runId: string;
  model: string;
  phase: CloudLanePhase;
  inputSetHash: string;
  requestArtifact?: {
    relativePath: string;
    sha256: string;
    byteSize: number;
    requestCount: number;
  };
  remote: {
    inputFileId?: string;
    batchId?: string;
    status?: string;
    outputFileId?: string;
    errorFileId?: string;
    usage?: Required<CloudApiUsage>;
    requestCounts?: {
      total: number;
      completed: number;
      failed: number;
    };
  };
  outputArtifact?: CloudLaneArtifact;
  errorArtifact?: CloudLaneArtifact;
  requests: CloudLaneRequestState[];
  recipeWaiters?: CloudLaneRecipeWaiter[];
  immediateOutcomes: CloudLaneOutcome[];
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudLaneResult {
  state: CloudLaneState;
  outcomes: CloudLaneOutcome[];
  pending: boolean;
}

export interface PrepareCloudRepairLaneOptions {
  config: LegacyCompilerConfig;
  ledger: CloudLaneLedger;
  runId: string;
  laneId: string;
  fragments: readonly CloudRepairFragment[];
  now?: () => Date;
}

export interface SubmitCloudRepairLaneOptions {
  config: LegacyCompilerConfig;
  ledger: CloudLaneLedger;
  client: CloudRepairBatchClient;
  laneId: string;
  now?: () => Date;
}

export interface ReconcileCloudRepairLaneOptions extends SubmitCloudRepairLaneOptions {
  /**
   * Inject exact model pricing at integration time. The default deliberately
   * retains model.ts's pessimistic $25/million accounting policy.
   */
  calculateCostUsd?: (usage: NormalizedCloudUsage, model: string) => number;
}

export interface NormalizedCloudUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface PersistedStateEnvelope {
  schemaVersion: typeof CLOUD_LANE_STATE_VERSION;
  checksum: string;
  state: CloudLaneState;
}

interface PreparedCluster {
  issueFingerprint: string;
  niche: string;
  pageRole: string;
  attempt: number;
  representative: CloudRepairFragment;
  members: CloudRepairFragment[];
  promptHash?: string;
  requestKey?: string;
  customId?: string;
  allowedNodeIds?: string[];
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  estimatedCostUsd?: number;
  jsonLine?: string;
  recipeKey?: CloudRepairRecipeKey;
}

interface ParsedBatchLine {
  customId: string;
  patch?: StructuredRepairPatch;
  responseId?: string;
  usage?: NormalizedCloudUsage;
  error?: string;
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizedJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function currentIso(now: (() => Date) | undefined): string {
  return (now?.() ?? new Date()).toISOString();
}

function boundedError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 2_000);
}

function assertLaneId(laneId: string): void {
  if (!LANE_ID_PATTERN.test(laneId)) {
    throw new Error('Cloud repair lane id must contain only safe filename characters');
  }
}

function laneRoot(config: LegacyCompilerConfig, laneId: string): string {
  assertLaneId(laneId);
  return assertWorkPath(config, join(config.workRoot, CLOUD_LANE_DIRECTORY, laneId));
}

type RecipeLedger = Required<Pick<
  CloudLaneLedger,
  'getCloudRepairRecipe' | 'claimCloudRepairRecipe' | 'completeCloudRepairRecipe' | 'failCloudRepairRecipe'
>>;

function recipeLedger(ledger: CloudLaneLedger): RecipeLedger | null {
  return (
    typeof ledger.getCloudRepairRecipe === 'function'
    && typeof ledger.claimCloudRepairRecipe === 'function'
    && typeof ledger.completeCloudRepairRecipe === 'function'
    && typeof ledger.failCloudRepairRecipe === 'function'
  ) ? ledger as CloudLaneLedger & RecipeLedger : null;
}

function recipeKey(config: LegacyCompilerConfig, cluster: PreparedCluster): CloudRepairRecipeKey {
  return {
    ruleVersion: config.ruleVersion,
    niche: cluster.niche,
    pageRole: cluster.pageRole,
    issueFingerprint: cluster.issueFingerprint,
  };
}

export function cloudLaneStatePath(config: LegacyCompilerConfig, laneId: string): string {
  return join(laneRoot(config, laneId), 'state.json');
}

function relativeWorkPath(config: LegacyCompilerConfig, targetPath: string): string {
  return relative(config.workRoot, assertWorkPath(config, targetPath)).replace(/\\/g, '/');
}

function resolveLaneArtifact(config: LegacyCompilerConfig, laneId: string, relativePath: string): string {
  if (!relativePath || relativePath.includes('\0')) throw new Error('Cloud lane state contains an invalid artifact path');
  const target = assertWorkPath(config, resolve(config.workRoot, relativePath));
  if (!isPathWithin(laneRoot(config, laneId), target)) {
    throw new Error('Cloud lane state references an artifact outside its lane directory');
  }
  return target;
}

async function persistState(
  config: LegacyCompilerConfig,
  state: CloudLaneState,
  now?: () => Date,
): Promise<CloudLaneState> {
  const normalized = normalizedJson({ ...state, updatedAt: currentIso(now) });
  const envelope: PersistedStateEnvelope = {
    schemaVersion: CLOUD_LANE_STATE_VERSION,
    checksum: sha256(canonicalJson(normalized)),
    state: normalized,
  };
  await atomicWriteFile(config, cloudLaneStatePath(config, state.laneId), `${JSON.stringify(envelope, null, 2)}\n`);
  return normalized;
}

function assertSafeRemoteIds(state: CloudLaneState): void {
  if (state.remote.inputFileId && !FILE_ID_PATTERN.test(state.remote.inputFileId)) throw new Error('Invalid persisted input file id');
  if (state.remote.outputFileId && !FILE_ID_PATTERN.test(state.remote.outputFileId)) throw new Error('Invalid persisted output file id');
  if (state.remote.errorFileId && !FILE_ID_PATTERN.test(state.remote.errorFileId)) throw new Error('Invalid persisted error file id');
  if (state.remote.batchId && !BATCH_ID_PATTERN.test(state.remote.batchId)) throw new Error('Invalid persisted batch id');
}

function assertStateShape(state: CloudLaneState, laneId: string): void {
  const phases: readonly CloudLanePhase[] = ['prepared', 'uploading', 'uploaded', 'creating', 'submitted', 'settling', 'settled'];
  if (state.schemaVersion !== CLOUD_LANE_STATE_VERSION || state.laneId !== laneId) throw new Error('Cloud lane state identity is invalid');
  if (!phases.includes(state.phase)) throw new Error('Cloud lane state phase is invalid');
  if (typeof state.runId !== 'string' || !state.runId.trim() || state.runId.length > 200) throw new Error('Cloud lane run id is invalid');
  if (state.model !== LEGACY_MODEL_POLICY.model) throw new Error('Cloud lane state model does not match policy');
  if (!/^[a-f0-9]{64}$/.test(state.inputSetHash)) throw new Error('Cloud lane input-set hash is invalid');
  if (!Array.isArray(state.requests) || !Array.isArray(state.immediateOutcomes)) throw new Error('Cloud lane state request lists are invalid');
  if (state.recipeWaiters !== undefined && !Array.isArray(state.recipeWaiters)) throw new Error('Cloud lane recipe waiters are invalid');
  assertSafeRemoteIds(state);
}

export async function loadCloudRepairLaneState(
  config: LegacyCompilerConfig,
  laneId: string,
): Promise<CloudLaneState | null> {
  assertLaneId(laneId);
  let raw: string;
  try {
    raw = await readFile(cloudLaneStatePath(config, laneId), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  const envelope = JSON.parse(raw) as PersistedStateEnvelope;
  if (envelope.schemaVersion !== CLOUD_LANE_STATE_VERSION || !envelope.state || typeof envelope.checksum !== 'string') {
    throw new Error('Cloud lane state envelope is invalid');
  }
  const expected = sha256(canonicalJson(envelope.state));
  if (expected !== envelope.checksum) throw new Error('Cloud lane state checksum mismatch');
  assertStateShape(envelope.state, laneId);
  if (envelope.state.requestArtifact) resolveLaneArtifact(config, laneId, envelope.state.requestArtifact.relativePath);
  if (envelope.state.outputArtifact) resolveLaneArtifact(config, laneId, envelope.state.outputArtifact.relativePath);
  if (envelope.state.errorArtifact) resolveLaneArtifact(config, laneId, envelope.state.errorArtifact.relativePath);
  return envelope.state;
}

function validateFragmentIdentity(fragment: CloudRepairFragment): void {
  if (!FRAGMENT_ID_PATTERN.test(fragment.id)) throw new Error('Invalid fragment id');
  if (!ISSUE_FINGERPRINT_PATTERN.test(fragment.issueFingerprint)) throw new Error('Invalid issue fingerprint');
  if (!Number.isSafeInteger(fragment.attempt) || fragment.attempt < 1) throw new Error('Fragment attempt must be a positive integer');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(fragment.niche)) throw new Error('Fragment niche is invalid');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(fragment.pageRole)) throw new Error('Fragment page role is invalid');
}

function clusterFragments(fragments: readonly CloudRepairFragment[]): PreparedCluster[] {
  const ids = new Set<string>();
  const byFingerprint = new Map<string, CloudRepairFragment[]>();
  for (const fragment of fragments) {
    validateFragmentIdentity(fragment);
    if (ids.has(fragment.id)) throw new Error(`Duplicate cloud repair fragment id: ${fragment.id}`);
    ids.add(fragment.id);
    const clusterKey = `${fragment.niche}\0${fragment.pageRole}\0${fragment.issueFingerprint}`;
    const cluster = byFingerprint.get(clusterKey) ?? [];
    cluster.push(fragment);
    byFingerprint.set(clusterKey, cluster);
  }

  return [...byFingerprint.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([_clusterKey, unsorted]) => {
      const members = [...unsorted].sort((left, right) => left.id.localeCompare(right.id));
      const attempts = new Set(members.map((fragment) => fragment.attempt));
      const issueFingerprint = members[0]!.issueFingerprint;
      if (attempts.size !== 1) throw new Error(`Cloud repair cluster ${issueFingerprint} mixes attempt numbers`);
      return {
        issueFingerprint,
        niche: members[0]!.niche,
        pageRole: members[0]!.pageRole,
        attempt: members[0]!.attempt,
        representative: members[0]!,
        members,
      };
    });
}

function extractAllowedNodeIds(fragment: string): string[] {
  const ids = new Set<string>();
  const pattern = /\bdata-(?:dc-node-id|dc-edit-id|pb-edit-id|dc-image-id)\s*=\s*(["'])([^"']+)\1/gi;
  for (const match of fragment.matchAll(pattern)) {
    const id = match[2]?.trim();
    if (id && id.length <= 160) ids.add(id);
  }
  return [...ids].sort();
}

function reservationEstimate(fragment: CloudRepairFragment): {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
} {
  const inputTokens = estimateTokens(fragment.fragment) + 500;
  const outputTokens = LEGACY_MODEL_POLICY.maxOutputTokensPerFragment;
  return {
    inputTokens,
    outputTokens,
    costUsd: ((inputTokens + outputTokens) / 1_000_000) * CONSERVATIVE_USD_PER_MILLION_TOKENS,
  };
}

function classifyBudgetRefusal(
  snapshot: ModelBudgetSnapshot,
  estimatedTokens: number,
  estimatedCostUsd: number,
): 'token_ceiling' | 'cost_ceiling' {
  if (estimatedTokens > snapshot.tokensRemaining) return 'token_ceiling';
  if (estimatedCostUsd > snapshot.dollarsRemaining) return 'cost_ceiling';
  return snapshot.tokensRemaining <= 0 ? 'token_ceiling' : 'cost_ceiling';
}

function inputSetHash(runId: string, laneId: string, clusters: readonly PreparedCluster[]): string {
  return sha256(canonicalJson({
    policy: LEGACY_MODEL_POLICY,
    runId,
    laneId,
    clusters: clusters.map((cluster) => ({
      issueFingerprint: cluster.issueFingerprint,
      niche: cluster.niche,
      pageRole: cluster.pageRole,
      attempt: cluster.attempt,
      members: cluster.members.map((fragment) => ({
        id: fragment.id,
        promptFingerprint: promptFingerprint(fragment),
      })),
    })),
  }));
}

function resultFromState(state: CloudLaneState): CloudLaneResult {
  const outcomes = [
    ...state.immediateOutcomes,
    ...state.requests.map((request) => request.outcome),
    ...(state.recipeWaiters ?? []).map((waiter) => waiter.outcome),
  ].sort((left, right) => left.issueFingerprint.localeCompare(right.issueFingerprint));
  return { state, outcomes, pending: state.phase !== 'settled' };
}

async function verifyArtifact(path: string, expectedHash: string, expectedBytes: number): Promise<string> {
  const contents = await readFile(path, 'utf8');
  if (Buffer.byteLength(contents) !== expectedBytes || sha256(contents) !== expectedHash) {
    throw new Error(`Cloud lane artifact failed integrity verification: ${path}`);
  }
  return contents;
}

function validateRecipePatchForMembers(
  patchValue: unknown,
  issueFingerprint: string,
  members: readonly CloudRepairFragment[],
): StructuredRepairPatch {
  const patch = normalizedJson(patchValue) as StructuredRepairPatch;
  for (const member of members) {
    validateCloudRepairPatch(patch, issueFingerprint, extractAllowedNodeIds(member.fragment));
  }
  return patch;
}

function cachedRecipeFailureReason(value: string | null): Exclude<CloudFailureReason, 'token_ceiling' | 'cost_ceiling' | 'attempt_ceiling'> {
  const allowed = new Set<Exclude<CloudFailureReason, 'token_ceiling' | 'cost_ceiling' | 'attempt_ceiling'>>([
    'batch_failed',
    'batch_expired',
    'batch_cancelled',
    'missing_output',
    'request_failed',
    'invalid_patch',
    'output_integrity',
  ]);
  return allowed.has(value as never) ? value as Exclude<CloudFailureReason, 'token_ceiling' | 'cost_ceiling' | 'attempt_ceiling'> : 'request_failed';
}

function outcomeFromCachedRecipe(
  record: CloudRepairRecipeRecord,
  cluster: PreparedCluster,
): CloudLaneOutcome {
  const request = {
    issueFingerprint: cluster.issueFingerprint,
    fragmentIds: cluster.members.map((member) => member.id),
    attempt: cluster.attempt as 1 | 2,
    requestKey: record.ownerRequestKey,
  };
  if (record.status === 'completed') {
    try {
      return {
        kind: 'patch',
        ...request,
        patch: validateRecipePatchForMembers(record.patch, cluster.issueFingerprint, cluster.members),
      };
    } catch (error) {
      return failedOutcome(request, 'invalid_patch', boundedError(error));
    }
  }
  if (record.status === 'failed') {
    return failedOutcome(request, cachedRecipeFailureReason(record.failureReason), record.detail ?? undefined);
  }
  return { kind: 'pending', ...request };
}

function recipeWaiter(record: CloudRepairRecipeRecord, cluster: PreparedCluster): CloudLaneRecipeWaiter {
  return {
    recipeKey: cluster.recipeKey!,
    issueFingerprint: cluster.issueFingerprint,
    fragmentIds: cluster.members.map((member) => member.id),
    attempt: cluster.attempt as 1 | 2,
    requestKey: record.ownerRequestKey,
    memberAllowedNodeIds: cluster.members.map((member) => ({
      fragmentId: member.id,
      allowedNodeIds: extractAllowedNodeIds(member.fragment),
    })),
    outcome: {
      kind: 'pending',
      issueFingerprint: cluster.issueFingerprint,
      fragmentIds: cluster.members.map((member) => member.id),
      attempt: cluster.attempt,
      requestKey: record.ownerRequestKey,
    },
  };
}

export async function prepareCloudRepairLane(
  options: PrepareCloudRepairLaneOptions,
): Promise<CloudLaneResult> {
  const { config, ledger, laneId, fragments, runId, now } = options;
  assertLaneId(laneId);
  if (!runId.trim() || runId.length > 200) throw new Error('Cloud repair run id is required and must be at most 200 characters');
  const clusters = clusterFragments(fragments);
  const setHash = inputSetHash(runId, laneId, clusters);
  const existing = await loadCloudRepairLaneState(config, laneId);
  if (existing) {
    if (existing.runId !== runId || existing.inputSetHash !== setHash) {
      throw new Error(`Cloud repair lane ${laneId} already belongs to a different immutable input set`);
    }
    if (existing.requestArtifact) {
      await verifyArtifact(
        resolveLaneArtifact(config, laneId, existing.requestArtifact.relativePath),
        existing.requestArtifact.sha256,
        existing.requestArtifact.byteSize,
      );
    }
    return resultFromState(existing);
  }

  const candidates: PreparedCluster[] = [];
  const immediateOutcomes: CloudLaneOutcome[] = [];
  for (const cluster of clusters) {
    const fragmentIds = cluster.members.map((fragment) => fragment.id);
    if (cluster.attempt > LEGACY_MODEL_POLICY.maxAttemptsPerFragment) {
      immediateOutcomes.push({
        kind: 'neutral_fallback',
        issueFingerprint: cluster.issueFingerprint,
        fragmentIds,
        attempt: cluster.attempt,
        reason: 'attempt_ceiling',
      });
      continue;
    }

    for (const member of cluster.members) validateFragment(member);
    const promptHash = promptFingerprint(cluster.representative);
    const cacheKey = recipeKey(config, cluster);
    const requestKey = `legacy-cloud-recipe:${sha256(canonicalJson({
      ...cacheKey,
      model: LEGACY_MODEL_POLICY.model,
      attempt: cluster.attempt,
    }))}`;
    const customId = `dc-${cluster.attempt}-${sha256(requestKey).slice(0, 48)}`;
    const estimate = reservationEstimate(cluster.representative);
    const batchLine = buildBatchInput(cluster.representative);
    batchLine.custom_id = customId;
    candidates.push({
      ...cluster,
      promptHash,
      requestKey,
      customId,
      allowedNodeIds: extractAllowedNodeIds(cluster.representative.fragment),
      estimatedInputTokens: estimate.inputTokens,
      estimatedOutputTokens: estimate.outputTokens,
      estimatedCostUsd: estimate.costUsd,
      jsonLine: JSON.stringify(batchLine),
      recipeKey: cacheKey,
    });
  }

  if (candidates.length > MAX_BATCH_REQUESTS) throw new Error(`Cloud batch exceeds ${MAX_BATCH_REQUESTS} requests`);
  const potentialBytes = Buffer.byteLength(candidates.map((candidate) => candidate.jsonLine).join('\n')) + (candidates.length ? 1 : 0);
  if (potentialBytes > MAX_BATCH_BYTES) throw new Error(`Cloud batch exceeds ${MAX_BATCH_BYTES} bytes`);

  const accepted: PreparedCluster[] = [];
  const recipeWaiters: CloudLaneRecipeWaiter[] = [];
  const recipes = recipeLedger(ledger);
  for (const candidate of candidates) {
    const requestKey = candidate.requestKey!;
    const estimatedInputTokens = candidate.estimatedInputTokens!;
    const estimatedOutputTokens = candidate.estimatedOutputTokens!;
    const estimatedCostUsd = candidate.estimatedCostUsd!;
    if (recipes) {
      const existingRecipe = recipes.getCloudRepairRecipe(candidate.recipeKey!);
      if (existingRecipe?.status === 'completed') {
        immediateOutcomes.push(outcomeFromCachedRecipe(existingRecipe, candidate));
        continue;
      }
      if (
        existingRecipe?.status === 'pending'
        && (
          existingRecipe.ownerLaneId !== laneId
          || existingRecipe.ownerRequestKey !== requestKey
          || existingRecipe.attempt !== candidate.attempt
        )
      ) {
        recipeWaiters.push(recipeWaiter(existingRecipe, candidate));
        continue;
      }
      if (existingRecipe?.status === 'failed' && candidate.attempt <= existingRecipe.attempt) {
        immediateOutcomes.push(outcomeFromCachedRecipe(existingRecipe, candidate));
        continue;
      }
    }
    const snapshot = ledger.modelBudgetSnapshot();
    const reserved = ledger.reserveModelUsage({
      runId,
      templateId: candidate.representative.templateId ?? null,
      requestKey,
      model: LEGACY_MODEL_POLICY.model,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostUsd,
    });
    if (!reserved) {
      immediateOutcomes.push({
        kind: 'neutral_fallback',
        issueFingerprint: candidate.issueFingerprint,
        fragmentIds: candidate.members.map((fragment) => fragment.id),
        attempt: candidate.attempt,
        requestKey,
        reason: classifyBudgetRefusal(snapshot, estimatedInputTokens + estimatedOutputTokens, estimatedCostUsd),
      });
      continue;
    }
    if (recipes) {
      const claim = recipes.claimCloudRepairRecipe({
        ...candidate.recipeKey!,
        attempt: candidate.attempt as 1 | 2,
        ownerLaneId: laneId,
        ownerRequestKey: requestKey,
      });
      if (claim.kind === 'completed' || claim.kind === 'failed') {
        immediateOutcomes.push(outcomeFromCachedRecipe(claim.record, candidate));
        continue;
      }
      if (claim.kind === 'pending') {
        recipeWaiters.push(recipeWaiter(claim.record, candidate));
        continue;
      }
    }
    accepted.push(candidate);
  }

  const timestamp = currentIso(now);
  const state: CloudLaneState = {
    schemaVersion: CLOUD_LANE_STATE_VERSION,
    laneId,
    runId,
    model: LEGACY_MODEL_POLICY.model,
    phase: accepted.length ? 'prepared' : recipeWaiters.length ? 'submitted' : 'settled',
    inputSetHash: setHash,
    remote: {},
    requests: accepted.map((candidate) => ({
      requestKey: candidate.requestKey!,
      customId: candidate.customId!,
      issueFingerprint: candidate.issueFingerprint,
      promptFingerprint: candidate.promptHash!,
      attempt: candidate.attempt as 1 | 2,
      representativeFragmentId: candidate.representative.id,
      fragmentIds: candidate.members.map((fragment) => fragment.id),
      allowedNodeIds: candidate.allowedNodeIds!,
      estimatedInputTokens: candidate.estimatedInputTokens!,
      estimatedOutputTokens: candidate.estimatedOutputTokens!,
      estimatedCostUsd: candidate.estimatedCostUsd!,
      recipeKey: candidate.recipeKey,
      ledgerStatus: 'reserved',
      outcome: {
        kind: 'pending',
        issueFingerprint: candidate.issueFingerprint,
        fragmentIds: candidate.members.map((fragment) => fragment.id),
        attempt: candidate.attempt,
        requestKey: candidate.requestKey!,
      },
    })),
    recipeWaiters,
    immediateOutcomes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (accepted.length) {
    const jsonl = `${accepted.map((candidate) => candidate.jsonLine).join('\n')}\n`;
    const requestHash = sha256(jsonl);
    const requestPath = join(laneRoot(config, laneId), `request-${requestHash}.jsonl`);
    await atomicWriteFile(config, requestPath, jsonl);
    state.requestArtifact = {
      relativePath: relativeWorkPath(config, requestPath),
      sha256: requestHash,
      byteSize: Buffer.byteLength(jsonl),
      requestCount: accepted.length,
    };
  }

  return resultFromState(await persistState(config, state, now));
}

async function persistFailure(
  config: LegacyCompilerConfig,
  state: CloudLaneState,
  error: unknown,
  now?: () => Date,
): Promise<never> {
  state.lastError = boundedError(error);
  await persistState(config, state, now);
  throw error;
}

function captureRemoteRecord(state: CloudLaneState, record: CloudBatchRecord): void {
  if (!BATCH_ID_PATTERN.test(record.id)) throw new Error('OpenAI batch response returned an invalid batch id');
  if (state.remote.batchId && state.remote.batchId !== record.id) throw new Error('Retrieved batch id does not match persisted state');
  if (record.input_file_id && state.remote.inputFileId && record.input_file_id !== state.remote.inputFileId) {
    throw new Error('OpenAI batch belongs to a different input file');
  }
  if (record.output_file_id && !FILE_ID_PATTERN.test(record.output_file_id)) throw new Error('OpenAI batch returned an invalid output file id');
  if (record.error_file_id && !FILE_ID_PATTERN.test(record.error_file_id)) throw new Error('OpenAI batch returned an invalid error file id');
  if (!BATCH_STATUSES.has(record.status)) throw new Error('OpenAI batch returned an invalid status');
  state.remote.batchId = record.id;
  state.remote.status = record.status;
  if (record.output_file_id) state.remote.outputFileId = record.output_file_id;
  if (record.error_file_id) state.remote.errorFileId = record.error_file_id;
  if (record.request_counts) {
    const total = normalizeTokenCount(record.request_counts.total);
    const completed = normalizeTokenCount(record.request_counts.completed);
    const failed = normalizeTokenCount(record.request_counts.failed);
    if (total === undefined || completed === undefined || failed === undefined || completed + failed > total) {
      throw new Error('OpenAI batch returned invalid request counts');
    }
    state.remote.requestCounts = { total, completed, failed };
  }
  const usage = normalizeApiUsage(record.usage);
  if (usage) {
    state.remote.usage = {
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
    };
  }
}

export async function submitCloudRepairLane(
  options: SubmitCloudRepairLaneOptions,
): Promise<CloudLaneResult> {
  const { config, ledger, client, laneId, now } = options;
  let state = await loadCloudRepairLaneState(config, laneId);
  if (!state) throw new Error(`Cloud repair lane ${laneId} has not been prepared`);
  if (!state.requestArtifact) {
    state.phase = refreshRecipeWaiters(ledger, state) ? 'submitted' : 'settled';
    return resultFromState(await persistState(config, state, now));
  }
  const recoveringUncertainCreate = state.phase === 'creating' && !state.remote.batchId;

  try {
    const requestPath = resolveLaneArtifact(config, laneId, state.requestArtifact.relativePath);
    const jsonl = await verifyArtifact(requestPath, state.requestArtifact.sha256, state.requestArtifact.byteSize);

    if (!state.remote.inputFileId) {
      state.phase = 'uploading';
      state.lastError = undefined;
      state = await persistState(config, state, now);
      const inputFileId = await client.uploadJsonl(basename(requestPath), jsonl);
      if (!FILE_ID_PATTERN.test(inputFileId)) throw new Error('OpenAI upload returned an invalid file id');
      state.remote.inputFileId = inputFileId;
      state.phase = 'uploaded';
      state = await persistState(config, state, now);
    }

    if (!state.remote.batchId) {
      let record: CloudBatchRecord;
      if (recoveringUncertainCreate) {
        if (!client.recoverBatchByInputFileId) {
          throw new Error('Cloud batch creation outcome is uncertain; refusing a possible duplicate without authoritative recovery');
        }
        const recovered = await client.recoverBatchByInputFileId(state.remote.inputFileId!, laneId);
        if (!recovered) {
          throw new Error('Cloud batch creation outcome remains uncertain; no authoritative matching batch was recovered');
        }
        record = recovered;
      } else {
        state.phase = 'creating';
        state.lastError = undefined;
        state = await persistState(config, state, now);
        record = await client.create(state.remote.inputFileId!, laneId);
      }
      captureRemoteRecord(state, record);
      state.phase = 'submitted';
      state = await persistState(config, state, now);
    }

    for (const request of state.requests) {
      if (request.ledgerStatus !== 'reserved') continue;
      ledger.reconcileModelUsage({
        runId: state.runId,
        requestKey: request.requestKey,
        model: state.model,
        status: 'submitted',
        batchId: state.remote.batchId,
      });
      request.ledgerStatus = 'submitted';
    }
    state.phase = 'submitted';
    state.lastError = undefined;
    return resultFromState(await persistState(config, state, now));
  } catch (error) {
    return persistFailure(config, state, error, now);
  }
}

function normalizeTokenCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function normalizeApiUsage(usage: CloudApiUsage | null | undefined): NormalizedCloudUsage | undefined {
  if (!usage || typeof usage !== 'object') return undefined;
  let inputTokens = normalizeTokenCount(usage.input_tokens);
  let outputTokens = normalizeTokenCount(usage.output_tokens);
  const suppliedTotal = normalizeTokenCount(usage.total_tokens);
  if (inputTokens === undefined && outputTokens === undefined && suppliedTotal === undefined) return undefined;
  inputTokens ??= suppliedTotal ?? 0;
  outputTokens ??= 0;
  const summed = inputTokens + outputTokens;
  if (suppliedTotal !== undefined && suppliedTotal > summed) outputTokens += suppliedTotal - summed;
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}

function extractResponseUsage(body: Record<string, unknown> | undefined): NormalizedCloudUsage | undefined {
  return normalizeApiUsage(body?.usage as CloudApiUsage | undefined);
}

function parseErrorFile(jsonl: string): Map<string, string> {
  const errors = new Map<string, string>();
  for (const [index, line] of jsonl.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line) as Record<string, unknown>;
      if (typeof record.custom_id !== 'string') continue;
      const error = record.error as Record<string, unknown> | null | undefined;
      const message = typeof error?.message === 'string' ? error.message : `Batch error output line ${index + 1}`;
      errors.set(record.custom_id, message.slice(0, 1_000));
    } catch {
      // The success output remains independently verifiable; malformed remote
      // diagnostics must never become executable or block valid patches.
    }
  }
  return errors;
}

function parseBatchLines(jsonl: string, expectedCustomIds: ReadonlySet<string>): {
  lines: Map<string, ParsedBatchLine>;
  integrityError?: string;
} {
  const lines = new Map<string, ParsedBatchLine>();
  for (const [index, line] of jsonl.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      return { lines, integrityError: `Batch output line ${index + 1} is not valid JSON` };
    }
    const customId = record.custom_id;
    if (typeof customId !== 'string' || !expectedCustomIds.has(customId)) {
      return { lines, integrityError: `Batch output line ${index + 1} has an unexpected custom id` };
    }
    if (lines.has(customId)) return { lines, integrityError: `Batch output repeats custom id ${customId}` };

    const response = record.response as Record<string, unknown> | null | undefined;
    const body = response?.body as Record<string, unknown> | undefined;
    const statusCode = typeof response?.status_code === 'number' ? response.status_code : undefined;
    const remoteError = record.error as Record<string, unknown> | null | undefined;
    const responseId = typeof body?.id === 'string'
      ? body.id
      : typeof response?.request_id === 'string'
        ? response.request_id
        : undefined;
    const usage = extractResponseUsage(body);
    if (remoteError || statusCode === undefined || statusCode < 200 || statusCode >= 300) {
      const message = typeof remoteError?.message === 'string'
        ? remoteError.message
        : `Batch response returned HTTP ${statusCode ?? 'unknown'}`;
      lines.set(customId, { customId, responseId, usage, error: message.slice(0, 1_000) });
      continue;
    }

    try {
      const parsed = parseBatchOutput(`${line}\n`).get(customId);
      if (!parsed) throw new Error('Response contains no structured patch');
      lines.set(customId, { customId, patch: parsed, responseId, usage });
    } catch (error) {
      lines.set(customId, { customId, responseId, usage, error: boundedError(error) });
    }
  }
  return { lines };
}

function exactKeys(record: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} does not match the allowed schema`);
  }
}

/** Strict local validation supplements the server-side Structured Outputs schema. */
export function validateCloudRepairPatch(
  patch: StructuredRepairPatch,
  expectedIssueFingerprint: string,
  allowedNodeIds: readonly string[],
): void {
  validateStructuredPatch(patch);
  const record = patch as unknown as Record<string, unknown>;
  exactKeys(record, ['issueFingerprint', 'operations', 'explanation'], 'Patch');
  if (patch.issueFingerprint !== expectedIssueFingerprint) throw new Error('Patch issue fingerprint does not match its request');
  if (!patch.explanation.trim() || patch.explanation.length > 500) throw new Error('Patch explanation is invalid');
  const allowedTargets = new Set(allowedNodeIds);
  for (const operation of patch.operations) {
    const operationRecord = operation as unknown as Record<string, unknown>;
    if (!operation.nodeId || operation.nodeId.length > 160 || !allowedTargets.has(operation.nodeId)) {
      throw new Error(`Patch targets a node id absent from its supplied fragment: ${operation.nodeId}`);
    }
    switch (operation.op) {
      case 'replace_text':
        exactKeys(operationRecord, ['op', 'nodeId', 'value'], 'replace_text operation');
        if (typeof operation.value !== 'string' || operation.value.length > 2_000) throw new Error('replace_text value is invalid');
        break;
      case 'replace_attribute':
        exactKeys(operationRecord, ['op', 'nodeId', 'attribute', 'value'], 'replace_attribute operation');
        if (!['aria-label', 'alt', 'title'].includes(operation.attribute)) throw new Error('replace_attribute attribute is invalid');
        if (typeof operation.value !== 'string' || operation.value.length > 500) throw new Error('replace_attribute value is invalid');
        break;
      case 'remove_node':
        exactKeys(operationRecord, ['op', 'nodeId'], 'remove_node operation');
        break;
      case 'replace_fragment':
        exactKeys(operationRecord, ['op', 'nodeId', 'safeHtml'], 'replace_fragment operation');
        if (typeof operation.safeHtml !== 'string' || operation.safeHtml.length > 8_000) throw new Error('replace_fragment HTML is invalid');
        if (/<(?:base|embed|form|iframe|link|meta|object|script|style)\b|\bon\w+\s*=|\bsrcdoc\s*=|(?:javascript|data\s*:\s*text\/html)\s*:/i.test(operation.safeHtml)) {
          throw new Error('Replacement fragment contains active or unsafe markup');
        }
        break;
    }
  }
}

function allocateInteger(total: number, weights: readonly number[]): number[] {
  if (weights.length === 0) return [];
  if (total <= 0) return weights.map(() => 0);
  const safeWeights = weights.map((weight) => Math.max(0, weight));
  const weightTotal = safeWeights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal === 0) {
    const base = Math.floor(total / weights.length);
    return weights.map((_, index) => base + (index < total % weights.length ? 1 : 0));
  }
  const exact = safeWeights.map((weight) => (total * weight) / weightTotal);
  const allocated = exact.map(Math.floor);
  let remainder = total - allocated.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (let index = 0; remainder > 0; index += 1, remainder -= 1) {
    allocated[order[index % order.length]!.index]! += 1;
  }
  return allocated;
}

function usageByRequest(
  state: CloudLaneState,
  parsed: ReadonlyMap<string, ParsedBatchLine>,
  batchUsage: NormalizedCloudUsage | undefined,
): Map<string, NormalizedCloudUsage> {
  const result = new Map<string, NormalizedCloudUsage>();
  if (batchUsage) {
    const input = allocateInteger(batchUsage.inputTokens, state.requests.map((request) => request.estimatedInputTokens));
    const output = allocateInteger(batchUsage.outputTokens, state.requests.map((request) => request.estimatedOutputTokens));
    state.requests.forEach((request, index) => {
      const inputTokens = input[index] ?? 0;
      const outputTokens = output[index] ?? 0;
      result.set(request.requestKey, { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens });
    });
    return result;
  }
  for (const request of state.requests) {
    const usage = parsed.get(request.customId)?.usage;
    // Failed/cancelled ledger rows account actuals rather than reservations.
    // When the API exposes no usage, retain the conservative reservation as the
    // reconciled amount so an unreported failure can never reopen hard budget.
    result.set(request.requestKey, usage ?? {
      inputTokens: request.estimatedInputTokens,
      outputTokens: request.estimatedOutputTokens,
      totalTokens: request.estimatedInputTokens + request.estimatedOutputTokens,
    });
  }
  return result;
}

export function conservativeCloudCostUsd(usage: NormalizedCloudUsage): number {
  return (usage.totalTokens / 1_000_000) * CONSERVATIVE_USD_PER_MILLION_TOKENS;
}

async function obtainRemoteArtifact(
  config: LegacyCompilerConfig,
  laneId: string,
  client: CloudRepairBatchClient,
  remoteFileId: string,
  kind: 'output' | 'error',
  existing: CloudLaneArtifact | undefined,
): Promise<{ artifact: CloudLaneArtifact; contents: string }> {
  if (existing) {
    if (existing.remoteFileId !== remoteFileId) throw new Error(`Persisted ${kind} artifact belongs to a different remote file`);
    const path = resolveLaneArtifact(config, laneId, existing.relativePath);
    return { artifact: existing, contents: await verifyArtifact(path, existing.sha256, existing.byteSize) };
  }
  const contents = await client.downloadFile(remoteFileId);
  const hash = sha256(contents);
  const path = join(laneRoot(config, laneId), `${kind}-${hash}.jsonl`);
  await atomicWriteFile(config, path, contents);
  return {
    artifact: {
      remoteFileId,
      relativePath: relativeWorkPath(config, path),
      sha256: hash,
      byteSize: Buffer.byteLength(contents),
    },
    contents,
  };
}

function terminalFailureReason(status: string): Exclude<CloudFailureReason, 'token_ceiling' | 'cost_ceiling' | 'attempt_ceiling'> {
  if (status === 'cancelled') return 'batch_cancelled';
  if (status === 'expired') return 'batch_expired';
  return 'batch_failed';
}

function failedOutcome(
  request: Pick<CloudLaneRequestState, 'issueFingerprint' | 'fragmentIds' | 'attempt' | 'requestKey'>,
  reason: Exclude<CloudFailureReason, 'token_ceiling' | 'cost_ceiling' | 'attempt_ceiling'>,
  detail?: string,
): CloudLaneOutcome {
  if (request.attempt < LEGACY_MODEL_POLICY.maxAttemptsPerFragment) {
    return {
      kind: 'retry',
      issueFingerprint: request.issueFingerprint,
      fragmentIds: request.fragmentIds,
      attempt: request.attempt,
      requestKey: request.requestKey,
      reason,
      nextAttempt: 2,
      detail,
    };
  }
  return {
    kind: 'neutral_fallback',
    issueFingerprint: request.issueFingerprint,
    fragmentIds: request.fragmentIds,
    attempt: request.attempt,
    requestKey: request.requestKey,
    reason: 'attempt_ceiling',
    detail: detail ? `${reason}: ${detail}`.slice(0, 1_000) : reason,
  };
}

function refreshRecipeWaiters(ledger: CloudLaneLedger, state: CloudLaneState): boolean {
  const waiters = state.recipeWaiters ?? [];
  if (waiters.length === 0) return false;
  const recipes = recipeLedger(ledger);
  if (!recipes) throw new Error('Cloud lane contains recipe waiters but its ledger has no recipe cache');
  let anyPending = false;
  for (const waiter of waiters) {
    if (waiter.outcome.kind !== 'pending') continue;
    const record = recipes.getCloudRepairRecipe(waiter.recipeKey);
    if (!record) throw new Error(`Cloud repair recipe disappeared while ${state.laneId} was waiting`);
    waiter.requestKey = record.ownerRequestKey;
    const request = {
      issueFingerprint: waiter.issueFingerprint,
      fragmentIds: waiter.fragmentIds,
      attempt: record.attempt,
      requestKey: record.ownerRequestKey,
    };
    if (record.status === 'pending') {
      waiter.outcome = { kind: 'pending', ...request };
      anyPending = true;
      continue;
    }
    if (record.status === 'failed') {
      waiter.outcome = failedOutcome(
        request,
        cachedRecipeFailureReason(record.failureReason),
        record.detail ?? undefined,
      );
      continue;
    }
    try {
      const patch = normalizedJson(record.patch) as StructuredRepairPatch;
      for (const member of waiter.memberAllowedNodeIds) {
        validateCloudRepairPatch(patch, waiter.issueFingerprint, member.allowedNodeIds);
      }
      waiter.outcome = { kind: 'patch', ...request, patch };
    } catch (error) {
      waiter.outcome = failedOutcome(request, 'invalid_patch', boundedError(error));
    }
  }
  return anyPending;
}

export async function reconcileCloudRepairLane(
  options: ReconcileCloudRepairLaneOptions,
): Promise<CloudLaneResult> {
  const { config, ledger, client, laneId, now } = options;
  const calculateCostUsd = options.calculateCostUsd ?? ((usage: NormalizedCloudUsage) => conservativeCloudCostUsd(usage));
  let state = await loadCloudRepairLaneState(config, laneId);
  if (!state) throw new Error(`Cloud repair lane ${laneId} has not been prepared`);
  if (state.phase === 'settled') return resultFromState(state);
  const waitingForRecipe = refreshRecipeWaiters(ledger, state);
  if (!state.requestArtifact || !state.requests.some((request) => request.outcome.kind === 'pending')) {
    state.phase = waitingForRecipe ? 'submitted' : 'settled';
    return resultFromState(await persistState(config, state, now));
  }
  if (!state.remote.batchId) throw new Error(`Cloud repair lane ${laneId} has not been submitted`);

  try {
    const record = await client.retrieve(state.remote.batchId);
    captureRemoteRecord(state, record);
    state.lastError = undefined;
    if (!BATCH_TERMINAL_STATUSES.has(record.status)) {
      state.phase = 'submitted';
      return resultFromState(await persistState(config, state, now));
    }

    state.phase = 'settling';
    state = await persistState(config, state, now);
    let outputJsonl = '';
    let errorJsonl = '';
    if (state.remote.outputFileId) {
      const output = await obtainRemoteArtifact(
        config,
        laneId,
        client,
        state.remote.outputFileId,
        'output',
        state.outputArtifact,
      );
      state.outputArtifact = output.artifact;
      outputJsonl = output.contents;
      state = await persistState(config, state, now);
    }
    if (state.remote.errorFileId) {
      const errorOutput = await obtainRemoteArtifact(
        config,
        laneId,
        client,
        state.remote.errorFileId,
        'error',
        state.errorArtifact,
      );
      state.errorArtifact = errorOutput.artifact;
      errorJsonl = errorOutput.contents;
      state = await persistState(config, state, now);
    }

    const expectedIds = new Set(state.requests.map((request) => request.customId));
    const parsedResult = parseBatchLines(outputJsonl, expectedIds);
    const remoteErrors = parseErrorFile(errorJsonl);
    const batchUsage = normalizeApiUsage(record.usage);
    const allocation = usageByRequest(state, parsedResult.lines, batchUsage);

    const reconciliations: Array<{
      request: CloudLaneRequestState;
      status: 'completed' | 'failed' | 'cancelled';
      responseId?: string;
      usage: NormalizedCloudUsage;
      costUsd: number;
      outcome: CloudLaneOutcome;
      error?: string;
      failureReason?: Exclude<CloudFailureReason, 'token_ceiling' | 'cost_ceiling' | 'attempt_ceiling'>;
    }> = [];

    for (const request of state.requests) {
      const parsed = parsedResult.lines.get(request.customId);
      const usage = allocation.get(request.requestKey) ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
      const costUsd = calculateCostUsd(usage, state.model);
      if (!Number.isFinite(costUsd) || costUsd < 0) throw new Error('Cloud lane cost calculator returned an invalid amount');

      let outcome: CloudLaneOutcome;
      let ledgerStatus: 'completed' | 'failed' | 'cancelled';
      let error: string | undefined;
      let failureReason: Exclude<CloudFailureReason, 'token_ceiling' | 'cost_ceiling' | 'attempt_ceiling'> | undefined;
      if (parsedResult.integrityError) {
        error = parsedResult.integrityError;
        failureReason = 'output_integrity';
        outcome = failedOutcome(request, failureReason, error);
        ledgerStatus = record.status === 'cancelled' ? 'cancelled' : 'failed';
      } else if (parsed?.patch) {
        try {
          validateCloudRepairPatch(parsed.patch, request.issueFingerprint, request.allowedNodeIds);
          outcome = {
            kind: 'patch',
            issueFingerprint: request.issueFingerprint,
            fragmentIds: request.fragmentIds,
            attempt: request.attempt,
            requestKey: request.requestKey,
            patch: parsed.patch,
          };
          ledgerStatus = 'completed';
        } catch (patchError) {
          error = boundedError(patchError);
          failureReason = 'invalid_patch';
          outcome = failedOutcome(request, failureReason, error);
          ledgerStatus = 'failed';
        }
      } else {
        const remoteError = remoteErrors.get(request.customId);
        error = parsed?.error ?? remoteError;
        failureReason = parsed?.error || remoteError
          ? 'request_failed'
          : record.status === 'completed'
            ? 'missing_output'
            : terminalFailureReason(record.status);
        outcome = failedOutcome(request, failureReason, error);
        ledgerStatus = record.status === 'cancelled' ? 'cancelled' : 'failed';
      }
      reconciliations.push({
        request,
        status: ledgerStatus,
        responseId: parsed?.responseId,
        usage,
        costUsd,
        outcome,
        error,
        failureReason,
      });
    }

    for (const item of reconciliations) {
      ledger.reconcileModelUsage({
        runId: state.runId,
        requestKey: item.request.requestKey,
        model: state.model,
        status: item.status,
        actualInputTokens: item.usage.inputTokens,
        actualOutputTokens: item.usage.outputTokens,
        actualCostUsd: item.costUsd,
        batchId: state.remote.batchId,
        responseId: item.responseId,
        error: item.error,
      });
      item.request.ledgerStatus = item.status;
      item.request.responseId = item.responseId;
      item.request.actualInputTokens = item.usage.inputTokens;
      item.request.actualOutputTokens = item.usage.outputTokens;
      item.request.actualCostUsd = item.costUsd;
      item.request.outcome = item.outcome;
      const recipes = recipeLedger(ledger);
      if (recipes && item.request.recipeKey) {
        const saved = item.outcome.kind === 'patch'
          ? recipes.completeCloudRepairRecipe({
            ...item.request.recipeKey,
            attempt: item.request.attempt,
            ownerRequestKey: item.request.requestKey,
            patch: item.outcome.patch,
          })
          : recipes.failCloudRepairRecipe({
            ...item.request.recipeKey,
            attempt: item.request.attempt,
            ownerRequestKey: item.request.requestKey,
            reason: item.failureReason ?? 'request_failed',
            detail: item.error,
          });
        if (!saved) throw new Error(`Cloud repair recipe ownership changed for ${item.request.issueFingerprint}`);
      }
    }

    state.phase = refreshRecipeWaiters(ledger, state) ? 'submitted' : 'settled';
    state.lastError = undefined;
    return resultFromState(await persistState(config, state, now));
  } catch (error) {
    return persistFailure(config, state, error, now);
  }
}
