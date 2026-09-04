export const LEGACY_SCHEMA_VERSION = 7;
export const DEFAULT_LEGACY_RULE_VERSION = 'legacy-rehab-1.0.27';
export const MAX_AI_DOLLAR_CAP_USD = 25;
export const MAX_AI_TOKEN_CAP = 1_000_000;
export const DEFAULT_AI_DOLLAR_CAP_USD = MAX_AI_DOLLAR_CAP_USD;
export const DEFAULT_AI_TOKEN_CAP = MAX_AI_TOKEN_CAP;
export const MAX_LEGACY_STATIC_WORKERS = 64;
export const MAX_LEGACY_CHROMIUM_WORKERS = 6;
export const LEGACY_CANCEL_EXIT_CODE = 130;
export const MINIMUM_LEGACY_PILOT_SIZE = 100;
export const LEGACY_PILOT_GATE_VERSION = 6;
export const FINAL_QUALITY_RECEIPT_VERSION = 2;
export const FINAL_RENDER_PROTOCOL = 'customer-preview-v1' as const;

export class LegacyCancellationError extends Error {
  constructor(message = 'Legacy catalogue rehabilitation was cancelled') {
    super(message);
    this.name = 'LegacyCancellationError';
  }
}

export function throwIfLegacyCancelled(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  if (signal.reason instanceof LegacyCancellationError) throw signal.reason;
  const reason = signal.reason instanceof Error
    ? signal.reason.message
    : typeof signal.reason === 'string'
      ? signal.reason
      : 'Cancellation requested';
  throw new LegacyCancellationError(reason);
}

export const LEGACY_COMMANDS = [
  'inventory',
  'pilot',
  'run',
  'status',
  'report',
  'promote',
] as const;

export type LegacyCommandName = (typeof LEGACY_COMMANDS)[number];

export const TEMPLATE_STAGES = [
  'discovered',
  'inventoried',
  'repair_pending',
  'repairing',
  'repaired',
  'render_pending',
  'rendering',
  'verified',
  'clustered',
  'composed',
  'promotable',
  'complete',
  'failed',
] as const;

export type TemplateStage = (typeof TEMPLATE_STAGES)[number];

export const TERMINAL_DISPOSITIONS = [
  'passing_design',
  'passing_alias',
  'neutral_fallback',
  'quarantined',
  'failed',
] as const;

export type TerminalDisposition = (typeof TERMINAL_DISPOSITIONS)[number];

export interface LegacyCompilerConfig {
  sourceRoot: string;
  workRoot: string;
  databasePath: string;
  artifactRoot: string;
  blobRoot: string;
  renderRoot: string;
  reportRoot: string;
  logRoot: string;
  ruleVersion: string;
  pilotSize: number;
  staticWorkers: number;
  chromiumWorkers: number;
  aiDollarCapUsd: number;
  aiTokenCap: number;
  /** Explicit operator opt-in. There is intentionally no environment default. */
  cloudRepair: boolean;
}

export interface LegacyCliFlags {
  sourceRoot?: string;
  workRoot?: string;
  databasePath?: string;
  ruleVersion?: string;
  pilotSize?: number;
  staticWorkers?: number;
  chromiumWorkers?: number;
  aiDollarCapUsd?: number;
  aiTokenCap?: number;
  cloudRepair?: boolean;
  resume: boolean;
  dryRun: boolean;
  json: boolean;
}

export interface ParsedLegacyArgs {
  command: LegacyCommandName;
  flags: LegacyCliFlags;
}

export type RunState = 'running' | 'completed' | 'failed' | 'cancelled';

export interface LegacyRunRecord {
  id: string;
  command: LegacyCommandName;
  ruleVersion: string;
  sourceRoot: string;
  workRoot: string;
  state: RunState;
  resumedFromRunId: string | null;
  optionsJson: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface LegacyTemplateInput {
  legacySlug: string;
  niche: string;
  sourcePath: string;
  sourceHash: string;
  foundationId?: string | null;
  pageCount?: number;
  stage?: TemplateStage;
  terminalDisposition?: TerminalDisposition | null;
}

export interface LegacyTemplateRecord extends Required<Omit<LegacyTemplateInput, 'foundationId' | 'terminalDisposition'>> {
  foundationId: string | null;
  terminalDisposition: TerminalDisposition | null;
  id: number;
  ruleVersion: string;
  resultHash: string | null;
  qualityReceipt: string | null;
  attempts: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  lastRunId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeasedTemplate extends LegacyTemplateRecord {
  leaseToken: string;
}

export interface LegacyPageRecord {
  id: number;
  templateId: number;
  relativePath: string;
  role: string | null;
  sourceHash: string;
  resultHash: string | null;
  stage: string;
  visibleTextLength: number | null;
  createdAt: string;
  updatedAt: string;
}

export type IssueSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface IssueInput {
  templateId: number;
  runId?: string | null;
  pageId?: number | null;
  code: string;
  severity: IssueSeverity;
  message: string;
  fingerprint?: string | null;
  /** Source/rule/artifact scope this fact was observed against. */
  sourceHash?: string | null;
  ruleVersion?: string | null;
  artifactHash?: string | null;
  details?: unknown;
  resolved?: boolean;
}

export interface LegacyIssueRecord {
  id: number;
  templateId: number;
  pageId: number | null;
  runId: string | null;
  code: string;
  severity: IssueSeverity;
  message: string;
  fingerprint: string | null;
  sourceHash: string | null;
  ruleVersion: string | null;
  artifactHash: string | null;
  details: unknown;
  resolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface LegacyRenderRecord {
  id: number;
  templateId: number;
  pageId: number;
  runId: string | null;
  artifactHash: string;
  ruleVersion: string;
  viewport: string;
  width: number;
  height: number;
  status: 'pending' | 'running' | 'passed' | 'failed';
  screenshotHash: string | null;
  perceptualHash: string | null;
  thumbnailHash: string | null;
  thumbnailBytes: number | null;
  ssim: number | null;
  consoleErrors: number;
  failedRequests: number;
  axeCritical: number;
  axeSerious: number;
  horizontalOverflowPx: number | null;
  artifactPath: string | null;
  error: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyAliasRecord {
  legacySlug: string;
  templateId: number;
  clusterId: number | null;
  designId: string;
  contentPresetId: string;
  themePresetId: string;
  qualityReceipt: string;
  status: 'candidate' | 'passing' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface LegacyArtifactRecord {
  id: number;
  runId: string | null;
  templateId: number | null;
  kind: string;
  contentHash: string;
  relativePath: string;
  byteSize: number;
  metadata: unknown;
  createdAt: string;
}

export interface ModelUsageInput {
  runId?: string | null;
  templateId?: number | null;
  requestKey: string;
  model: string;
  status: 'reserved' | 'submitted' | 'completed' | 'failed' | 'cancelled';
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  actualInputTokens?: number;
  actualOutputTokens?: number;
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  batchId?: string | null;
  responseId?: string | null;
  error?: string | null;
}

export type ModelUsageReconciliation =
  | { accepted: true }
  | {
      accepted: false;
      reason: 'token_ceiling' | 'cost_ceiling';
    };

export interface ModelBudgetSnapshot {
  estimatedTokens: number;
  actualTokens: number;
  accountedTokens: number;
  estimatedCostUsd: number;
  actualCostUsd: number;
  accountedCostUsd: number;
  tokenCap: number;
  dollarCapUsd: number;
  tokensRemaining: number;
  dollarsRemaining: number;
  exhausted: boolean;
}

export interface LedgerStatus {
  schemaVersion: number;
  databasePath: string;
  latestRun: LegacyRunRecord | null;
  runsByState: Record<string, number>;
  templatesByStage: Record<string, number>;
  templatesByDisposition: Record<string, number>;
  unresolvedIssuesBySeverity: Record<string, number>;
  renderCounts: Record<string, number>;
  renderHistoryCount: number;
  modelBudget: ModelBudgetSnapshot;
}

export interface LegacyCommandOutcome {
  message?: string;
  details?: unknown;
}

export interface LegacyCommandContext {
  command: LegacyCommandName;
  config: LegacyCompilerConfig;
  flags: LegacyCliFlags;
  ledger: import('./ledger.js').LegacyLedger;
  runId: string;
  signal?: AbortSignal;
  /** Present only for an explicitly enabled cloud-repair invocation. */
  cloudRepairClient?: import('./cloud-lane.js').CloudRepairBatchClient;
}

export interface LegacyCommandServices {
  inventory?(context: LegacyCommandContext): Promise<LegacyCommandOutcome | void>;
  pilot?(context: LegacyCommandContext): Promise<LegacyCommandOutcome | void>;
  run?(context: LegacyCommandContext): Promise<LegacyCommandOutcome | void>;
  promote?(context: LegacyCommandContext): Promise<LegacyCommandOutcome | void>;
  report?(context: Omit<LegacyCommandContext, 'runId'> & { runId?: string }): Promise<LegacyCommandOutcome | void>;
}

export interface LegacyCliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}
