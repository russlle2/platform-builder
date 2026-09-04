import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const LEGACY_MODEL_POLICY = Object.freeze({
  model: 'gpt-5.6-terra',
  maxTotalTokens: 1_000_000,
  maxUsd: 25,
  maxAttemptsPerFragment: 2,
  maxFragmentCharacters: 20_000,
  maxOutputTokensPerFragment: 1_500,
  completionWindow: '24h',
});

export type PatchOperation =
  | { op: 'replace_text'; nodeId: string; value: string }
  | { op: 'replace_attribute'; nodeId: string; attribute: 'aria-label' | 'alt' | 'title'; value: string }
  | { op: 'remove_node'; nodeId: string }
  | { op: 'replace_fragment'; nodeId: string; safeHtml: string };

export interface StructuredRepairPatch {
  issueFingerprint: string;
  operations: PatchOperation[];
  explanation: string;
}

export interface UnresolvedFragment {
  id: string;
  issueFingerprint: string;
  issueCodes: string[];
  niche: string;
  pageRole: string;
  fragment: string;
  attempt: number;
}

export interface BatchInputLine {
  custom_id: string;
  method: 'POST';
  url: '/v1/responses';
  body: Record<string, unknown>;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface BudgetReservation {
  allowed: boolean;
  reason?: 'token_ceiling' | 'cost_ceiling' | 'attempt_ceiling';
  reservedTokens: number;
  reservedUsd: number;
}

const PATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['issueFingerprint', 'operations', 'explanation'],
  properties: {
    issueFingerprint: { type: 'string', minLength: 16, maxLength: 128 },
    explanation: { type: 'string', minLength: 1, maxLength: 500 },
    operations: {
      type: 'array',
      maxItems: 20,
      items: {
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['op', 'nodeId', 'value'],
            properties: {
              op: { const: 'replace_text' },
              nodeId: { type: 'string', minLength: 1, maxLength: 160 },
              value: { type: 'string', maxLength: 2_000 },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['op', 'nodeId', 'attribute', 'value'],
            properties: {
              op: { const: 'replace_attribute' },
              nodeId: { type: 'string', minLength: 1, maxLength: 160 },
              attribute: { enum: ['aria-label', 'alt', 'title'] },
              value: { type: 'string', maxLength: 500 },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['op', 'nodeId'],
            properties: {
              op: { const: 'remove_node' },
              nodeId: { type: 'string', minLength: 1, maxLength: 160 },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['op', 'nodeId', 'safeHtml'],
            properties: {
              op: { const: 'replace_fragment' },
              nodeId: { type: 'string', minLength: 1, maxLength: 160 },
              safeHtml: { type: 'string', maxLength: 8_000 },
            },
          },
        ],
      },
    },
  },
} as const;

function sha256(value: string): string {
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

export function validateFragment(fragment: UnresolvedFragment): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(fragment.id)) throw new Error('Invalid fragment id');
  if (!/^[a-f0-9]{16,128}$/i.test(fragment.issueFingerprint)) throw new Error('Invalid issue fingerprint');
  if (fragment.attempt < 1 || fragment.attempt > LEGACY_MODEL_POLICY.maxAttemptsPerFragment) {
    throw new Error(`Fragment attempt exceeds ${LEGACY_MODEL_POLICY.maxAttemptsPerFragment}`);
  }
  if (!fragment.fragment.trim() || fragment.fragment.length > LEGACY_MODEL_POLICY.maxFragmentCharacters) {
    throw new Error(`Fragment must contain 1-${LEGACY_MODEL_POLICY.maxFragmentCharacters} characters`);
  }
  if (/<html\b|<head\b|<body\b/i.test(fragment.fragment)) {
    throw new Error('Cloud repair accepts a failing DOM fragment, never a complete template document');
  }
  if (fragment.issueCodes.length === 0 || fragment.issueCodes.length > 20) {
    throw new Error('Fragment must include 1-20 deterministic issue codes');
  }
}

export function estimateTokens(text: string): number {
  // A deliberately conservative local estimate. The ledger later reconciles
  // this reservation with the API's actual token usage.
  return Math.ceil(text.length / 3.2);
}

export class ModelBudget {
  #usage: UsageTotals;
  readonly maxTokens: number;
  readonly maxUsd: number;

  constructor(
    initial: Partial<UsageTotals> = {},
    policy: { maxTotalTokens: number; maxUsd: number } = LEGACY_MODEL_POLICY,
  ) {
    this.#usage = {
      inputTokens: initial.inputTokens ?? 0,
      outputTokens: initial.outputTokens ?? 0,
      totalTokens: initial.totalTokens ?? (initial.inputTokens ?? 0) + (initial.outputTokens ?? 0),
      costUsd: initial.costUsd ?? 0,
    };
    this.maxTokens = policy.maxTotalTokens;
    this.maxUsd = policy.maxUsd;
  }

  get usage(): Readonly<UsageTotals> {
    return { ...this.#usage };
  }

  reserve(fragment: UnresolvedFragment): BudgetReservation {
    if (fragment.attempt > LEGACY_MODEL_POLICY.maxAttemptsPerFragment) {
      return { allowed: false, reason: 'attempt_ceiling', reservedTokens: 0, reservedUsd: 0 };
    }
    const input = estimateTokens(fragment.fragment) + 500;
    const output = LEGACY_MODEL_POLICY.maxOutputTokensPerFragment;
    const reservedTokens = input + output;
    // $25/million is intentionally pessimistic and ensures the independent
    // dollar ceiling cannot be skipped even if model pricing changes.
    const reservedUsd = (reservedTokens / 1_000_000) * 25;
    if (this.#usage.totalTokens + reservedTokens > this.maxTokens) {
      return { allowed: false, reason: 'token_ceiling', reservedTokens, reservedUsd };
    }
    if (this.#usage.costUsd + reservedUsd > this.maxUsd) {
      return { allowed: false, reason: 'cost_ceiling', reservedTokens, reservedUsd };
    }
    this.#usage.totalTokens += reservedTokens;
    this.#usage.inputTokens += input;
    this.#usage.outputTokens += output;
    this.#usage.costUsd += reservedUsd;
    return { allowed: true, reservedTokens, reservedUsd };
  }

  reconcile(reservation: BudgetReservation, actual: UsageTotals): void {
    if (!reservation.allowed) return;
    this.#usage.totalTokens += actual.totalTokens - reservation.reservedTokens;
    this.#usage.inputTokens += actual.inputTokens - Math.max(0, reservation.reservedTokens - LEGACY_MODEL_POLICY.maxOutputTokensPerFragment);
    this.#usage.outputTokens += actual.outputTokens - LEGACY_MODEL_POLICY.maxOutputTokensPerFragment;
    this.#usage.costUsd += actual.costUsd - reservation.reservedUsd;
  }
}

export function buildBatchInput(fragment: UnresolvedFragment): BatchInputLine {
  validateFragment(fragment);
  const prompt = [
    'Repair only the supplied legacy-template DOM fragment.',
    'Return JSON matching the schema. Use only the allowed operations and supplied node IDs.',
    'Do not add testimonials, proof, guarantees, medical outcomes, prices, scripts, remote resources, or sensitive intake fields.',
    'Preserve safe editorial meaning. If safe repair is ambiguous, replace it with concise neutral niche-appropriate copy.',
    `Niche: ${fragment.niche}`,
    `Page role: ${fragment.pageRole}`,
    `Issue codes: ${fragment.issueCodes.join(', ')}`,
    `Issue fingerprint: ${fragment.issueFingerprint}`,
    'Fragment:',
    fragment.fragment,
  ].join('\n');
  return {
    custom_id: `${fragment.id}-${fragment.attempt}-${sha256(fragment.issueFingerprint).slice(0, 12)}`.slice(0, 64),
    method: 'POST',
    url: '/v1/responses',
    body: {
      model: LEGACY_MODEL_POLICY.model,
      store: false,
      max_output_tokens: LEGACY_MODEL_POLICY.maxOutputTokensPerFragment,
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'legacy_template_patch',
          strict: true,
          schema: PATCH_SCHEMA,
        },
      },
    },
  };
}

export function buildBatchJsonl(fragments: readonly UnresolvedFragment[], budget: ModelBudget): {
  jsonl: string;
  accepted: UnresolvedFragment[];
  fallback: Array<{ fragment: UnresolvedFragment; reason: string }>;
  reservations: Map<string, BudgetReservation>;
} {
  const accepted: UnresolvedFragment[] = [];
  const fallback: Array<{ fragment: UnresolvedFragment; reason: string }> = [];
  const reservations = new Map<string, BudgetReservation>();
  const lines: string[] = [];
  const recipes = new Set<string>();
  for (const fragment of fragments) {
    validateFragment(fragment);
    // One model recipe per matching failure cluster; subsequent matching
    // fragments reuse the accepted patch after deterministic precondition checks.
    if (recipes.has(fragment.issueFingerprint)) continue;
    recipes.add(fragment.issueFingerprint);
    const reservation = budget.reserve(fragment);
    reservations.set(fragment.id, reservation);
    if (!reservation.allowed) {
      fallback.push({ fragment, reason: reservation.reason ?? 'budget_ceiling' });
      continue;
    }
    accepted.push(fragment);
    lines.push(JSON.stringify(buildBatchInput(fragment)));
  }
  return { jsonl: lines.length > 0 ? `${lines.join('\n')}\n` : '', accepted, fallback, reservations };
}

export interface OpenAIBatchRecord {
  id: string;
  status: string;
  output_file_id?: string | null;
  error_file_id?: string | null;
}

export class OpenAIRepairBatchClient {
  readonly apiKey: string;
  readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.openai.com/v1') {
    if (!apiKey.trim()) throw new Error('An API key is required only when the explicit cloud lane is enabled');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async #request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${this.apiKey}`);
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 2_000);
      throw new Error(`OpenAI API ${response.status}: ${detail}`);
    }
    return response;
  }

  async uploadJsonl(filename: string, jsonl: string): Promise<string> {
    if (!jsonl.trim()) throw new Error('Cannot upload an empty repair batch');
    const form = new FormData();
    form.set('purpose', 'batch');
    form.set('file', new Blob([jsonl], { type: 'application/jsonl' }), filename);
    const result = await (await this.#request('/files', { method: 'POST', body: form })).json() as { id?: string };
    if (!result.id) throw new Error('OpenAI file upload returned no id');
    return result.id;
  }

  async create(inputFileId: string): Promise<OpenAIBatchRecord> {
    const response = await this.#request('/batches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input_file_id: inputFileId,
        endpoint: '/v1/responses',
        completion_window: LEGACY_MODEL_POLICY.completionWindow,
        metadata: { pipeline: 'daily-clarity-legacy-rehab-v1' },
      }),
    });
    return response.json() as Promise<OpenAIBatchRecord>;
  }

  async retrieve(batchId: string): Promise<OpenAIBatchRecord> {
    if (!/^batch_[A-Za-z0-9_-]+$/.test(batchId)) throw new Error('Invalid batch id');
    return (await this.#request(`/batches/${batchId}`)).json() as Promise<OpenAIBatchRecord>;
  }

  async downloadFile(fileId: string): Promise<string> {
    if (!/^file-[A-Za-z0-9_-]+$/.test(fileId)) throw new Error('Invalid file id');
    return (await this.#request(`/files/${fileId}/content`)).text();
  }
}

export function parseBatchOutput(jsonl: string): Map<string, StructuredRepairPatch> {
  const patches = new Map<string, StructuredRepairPatch>();
  for (const [index, line] of jsonl.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const record = JSON.parse(line) as Record<string, unknown>;
    const customId = record.custom_id;
    const response = record.response as Record<string, unknown> | undefined;
    const body = response?.body as Record<string, unknown> | undefined;
    const output = body?.output;
    if (typeof customId !== 'string' || !Array.isArray(output)) continue;
    const text = output
      .flatMap((item) => item && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).content)
        ? (item as { content: unknown[] }).content
        : [])
      .map((item) => item && typeof item === 'object' ? (item as Record<string, unknown>).text : undefined)
      .find((value): value is string => typeof value === 'string');
    if (!text) continue;
    try {
      const patch = JSON.parse(text) as StructuredRepairPatch;
      validateStructuredPatch(patch);
      patches.set(customId, patch);
    } catch (error) {
      throw new Error(`Invalid structured patch on batch output line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return patches;
}

export function validateStructuredPatch(patch: StructuredRepairPatch): void {
  if (!patch || !/^[a-f0-9]{16,128}$/i.test(patch.issueFingerprint)) throw new Error('Patch has an invalid issue fingerprint');
  if (!Array.isArray(patch.operations) || patch.operations.length > 20) throw new Error('Patch has too many operations');
  if (typeof patch.explanation !== 'string' || patch.explanation.length > 500) throw new Error('Patch explanation is invalid');
  for (const operation of patch.operations) {
    if (!operation || typeof operation !== 'object' || !('nodeId' in operation) || typeof operation.nodeId !== 'string') {
      throw new Error('Patch operation has no valid node id');
    }
    if (!['replace_text', 'replace_attribute', 'remove_node', 'replace_fragment'].includes(operation.op)) {
      throw new Error(`Patch operation is not allowed: ${String((operation as { op?: unknown }).op)}`);
    }
    if (operation.op === 'replace_fragment' && /<(?:script|iframe|object|embed|form)\b|\bon\w+\s*=|javascript:/i.test(operation.safeHtml)) {
      throw new Error('Replacement fragment contains active or unsafe markup');
    }
  }
}

export async function loadBatchJsonl(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

export function promptFingerprint(fragment: UnresolvedFragment): string {
  return sha256(canonicalJson({
    policy: LEGACY_MODEL_POLICY,
    issueFingerprint: fragment.issueFingerprint,
    issueCodes: [...fragment.issueCodes].sort(),
    niche: fragment.niche,
    pageRole: fragment.pageRole,
    fragment: fragment.fragment,
  }));
}
