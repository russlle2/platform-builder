import { LEGACY_MODEL_POLICY } from './model.js';
import type { CloudBatchRecord, CloudRepairBatchClient } from './cloud-lane.js';

const FILE_ID = /^file-[A-Za-z0-9_-]+$/;
const BATCH_ID = /^batch_[A-Za-z0-9_-]+$/;
const LANE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;
const MAX_RECOVERY_PAGES = 100;

type FetchImplementation = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface BatchListPage {
  data?: unknown;
  has_more?: unknown;
  last_id?: unknown;
}

function boundedRemoteDetail(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').slice(0, 1_000);
}

function assertFileId(value: string): void {
  if (!FILE_ID.test(value)) throw new Error('Invalid OpenAI file id');
}

function assertBatchId(value: string): void {
  if (!BATCH_ID.test(value)) throw new Error('Invalid OpenAI batch id');
}

function assertLaneId(value: string): void {
  if (!LANE_ID.test(value)) throw new Error('Invalid cloud repair lane id');
}

function batchRecord(value: unknown): CloudBatchRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('OpenAI Batch API returned an invalid record');
  }
  return value as CloudBatchRecord;
}

/**
 * Minimal native-fetch adapter for the opt-in Batch/Responses lane.
 *
 * The credential is held in a JavaScript private field and is never exposed in
 * state, request bodies, diagnostics, or enumerable object properties.
 */
export class NativeOpenAIBatchClient implements CloudRepairBatchClient {
  readonly baseUrl: string;
  readonly #apiKey: string;
  readonly #fetch: FetchImplementation;

  constructor(
    apiKey: string,
    options: { baseUrl?: string; fetch?: FetchImplementation } = {},
  ) {
    if (!apiKey.trim()) throw new Error('An API key is required for the explicitly enabled cloud repair lane');
    this.#apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.#fetch = options.fetch ?? fetch;
  }

  async #request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${this.#apiKey}`);
    const response = await this.#fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      const detail = boundedRemoteDetail((await response.text()).split(this.#apiKey).join('[redacted]'));
      throw new Error(`OpenAI API request failed with HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    return response;
  }

  async uploadJsonl(filename: string, jsonl: string): Promise<string> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.jsonl$/.test(filename)) {
      throw new Error('Cloud repair upload filename is invalid');
    }
    if (!jsonl.trim()) throw new Error('Cannot upload an empty repair batch');
    const form = new FormData();
    form.set('purpose', 'batch');
    form.set('file', new Blob([jsonl], { type: 'application/jsonl' }), filename);
    const response = await this.#request('/files', { method: 'POST', body: form });
    const result = await response.json() as { id?: unknown };
    if (typeof result.id !== 'string') throw new Error('OpenAI file upload returned no id');
    assertFileId(result.id);
    return result.id;
  }

  async create(inputFileId: string, laneId?: string): Promise<CloudBatchRecord> {
    assertFileId(inputFileId);
    if (laneId !== undefined) assertLaneId(laneId);
    const response = await this.#request('/batches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input_file_id: inputFileId,
        endpoint: '/v1/responses',
        completion_window: LEGACY_MODEL_POLICY.completionWindow,
        metadata: {
          pipeline: 'daily-clarity-legacy-rehab-v1',
          ...(laneId ? { lane_id: laneId } : {}),
        },
      }),
    });
    return batchRecord(await response.json());
  }

  async retrieve(batchId: string): Promise<CloudBatchRecord> {
    assertBatchId(batchId);
    return batchRecord(await (await this.#request(`/batches/${batchId}`)).json());
  }

  async downloadFile(fileId: string): Promise<string> {
    assertFileId(fileId);
    return (await this.#request(`/files/${fileId}/content`)).text();
  }

  /**
   * Resolve the upload→create crash window without ever issuing a blind second
   * create. Exact input-file and lane metadata must identify at most one batch.
   */
  async recoverBatchByInputFileId(inputFileId: string, laneId: string): Promise<CloudBatchRecord | null> {
    assertFileId(inputFileId);
    assertLaneId(laneId);
    const matches: CloudBatchRecord[] = [];
    let after: string | undefined;
    for (let pageIndex = 0; pageIndex < MAX_RECOVERY_PAGES; pageIndex += 1) {
      const query = new URLSearchParams({ limit: '100' });
      if (after) query.set('after', after);
      const page = await (await this.#request(`/batches?${query.toString()}`)).json() as BatchListPage;
      if (!Array.isArray(page.data)) throw new Error('OpenAI batch listing returned invalid data');
      for (const item of page.data) {
        const record = batchRecord(item) as CloudBatchRecord & {
          endpoint?: unknown;
          metadata?: unknown;
        };
        const metadata = record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
          ? record.metadata as Record<string, unknown>
          : {};
        if (
          record.input_file_id === inputFileId
          && record.endpoint === '/v1/responses'
          && metadata.lane_id === laneId
        ) matches.push(record);
      }
      if (page.has_more !== true) break;
      if (typeof page.last_id !== 'string' || !BATCH_ID.test(page.last_id)) {
        throw new Error('OpenAI batch listing has no safe continuation id');
      }
      after = page.last_id;
      if (pageIndex === MAX_RECOVERY_PAGES - 1) {
        throw new Error('OpenAI batch recovery exceeded its bounded page limit');
      }
    }
    if (matches.length > 1) throw new Error('Cloud batch recovery is ambiguous; refusing duplicate execution');
    return matches[0] ?? null;
  }
}
