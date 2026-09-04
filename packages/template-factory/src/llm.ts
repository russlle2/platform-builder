import { execSync } from 'node:child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { budget, BUDGET_CAP_USD } from './budget.js';

const OLLAMA_OPENAI_BASE = 'http://localhost:11434/v1';
export const LOCAL_CHAT_MODEL = 'qwen3:30b-a3b';
export const LOCAL_EMBED_MODEL = 'nomic-embed-text';
const CLOUD_MODEL = 'gemini-2.0-flash';

// --- Vertex AI (cloud) configuration ---
// Bulk copy/grammar can run on Vertex AI gemini-2.5-flash. Vertex bills against
// standard GCP pay-as-you-go billing (separate from depleted AI Studio prepay
// credits), authenticated via short-lived gcloud OAuth access tokens.
export const VERTEX_MODEL = process.env.VERTEX_MODEL || 'gemini-2.5-flash';
const VERTEX_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';

export type Provider = 'local' | 'cloud';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LocalChatOptions {
  schema?: Record<string, unknown>;
  temperature?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
}

function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('econnrefused') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('failed to fetch')
  );
}

const MAX_RETRIES = 3;
const CLOUD_MAX_RETRIES = 10; // 429s are quota pauses, not errors — keep retrying
const CLOUD_429_BASE_MS = 15_000; // 15s base, doubles to 60s cap
const CLOUD_429_MAX_MS = 60_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Parse RetryInfo delay seconds out of a Vertex 429 response body (if present). */
function parse429RetryAfterMs(body: string): number | null {
  try {
    const json = JSON.parse(body) as { error?: { details?: Array<{ '@type'?: string; retryDelay?: string }> } };
    const retryDetail = json?.error?.details?.find(
      (d) => d['@type']?.includes('RetryInfo'),
    );
    if (retryDetail?.retryDelay) {
      const match = retryDetail.retryDelay.match(/^(\d+(?:\.\d+)?)s$/);
      if (match) return Math.ceil(parseFloat(match[1]!) * 1000);
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/**
 * Local chat via Ollama's OpenAI-compatible endpoint.
 * Optional schema enables JSON-object response mode.
 * Retries on transient connection errors with exponential backoff.
 */
export async function localChat(
  messages: ChatMessage[],
  opts?: LocalChatOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: LOCAL_CHAT_MODEL,
    messages,
    stream: false,
    temperature: opts?.temperature ?? 0.7,
  };

  if (opts?.schema) {
    body.response_format = { type: 'json_object' };
    body.messages = [
      {
        role: 'system',
        content: `Respond with valid JSON matching this schema: ${JSON.stringify(opts.schema)}`,
      },
      ...messages,
    ];
  }

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = 5000 * attempt; // 5s, 10s
      console.warn(`[llm] localChat retry ${attempt}/${MAX_RETRIES - 1} after ${delay}ms…`);
      await sleep(delay);
    }

    let res: Response;
    try {
      res = await fetch(`${OLLAMA_OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (isConnectionError(lastErr)) {
        continue; // retry on connection failure
      }
      throw lastErr;
    }

    if (!res.ok) {
      const detail = await res.text();
      lastErr = new Error(`localChat failed (${res.status}): ${detail}`);
      if (res.status >= 500 || detail.toLowerCase().includes('econnrefused')) {
        continue; // retry on server errors
      }
      throw lastErr;
    }

    const data = (await res.json()) as ChatCompletionResponse;
    return data.choices?.[0]?.message?.content ?? '';
  }

  throw new Error(
    `Cannot reach Ollama after ${MAX_RETRIES} attempts. Is Ollama running? Start it with: ollama serve\n(last error: ${lastErr?.message})`,
  );
}

/**
 * Local embeddings via Ollama's OpenAI-compatible /v1/embeddings endpoint.
 * Retries up to 3 times on transient connection errors.
 */
export async function localEmbed(text: string): Promise<number[]> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(3000 * attempt);
    }

    let res: Response;
    try {
      res = await fetch(`${OLLAMA_OPENAI_BASE}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: LOCAL_EMBED_MODEL,
          input: text,
        }),
      });
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (isConnectionError(lastErr)) continue;
      throw lastErr;
    }

    if (!res.ok) {
      const detail = await res.text();
      lastErr = new Error(`localEmbed failed (${res.status}): ${detail}`);
      if (res.status >= 500) continue;
      throw lastErr;
    }

    const data = (await res.json()) as EmbeddingResponse;
    const embedding = data.data?.[0]?.embedding;
    if (!embedding?.length) {
      throw new Error('localEmbed returned no embedding vector');
    }
    return embedding;
  }

  throw new Error(
    `Cannot reach Ollama after ${MAX_RETRIES} attempts (embed). Is Ollama running?\n(last error: ${lastErr?.message})`,
  );
}

/** Cosine similarity between two embedding vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Cloud chat for foundation generation only (Gemini 2.0 Flash, AI Studio key).
 * Requires GOOGLE_CLOUD_API_KEY in the environment.
 */
export async function cloudChat(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_CLOUD_API_KEY is required for cloudChat');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: CLOUD_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// --- Vertex AI cloud provider (bulk generation) ---

let _vertexToken: string | null = null;
let _vertexTokenAt = 0;
const TOKEN_TTL_MS = 50 * 60 * 1000; // refresh access token every 50 min (1h expiry)

/** Get a (cached) gcloud OAuth access token for Vertex AI. */
function getAccessToken(forceRefresh = false): string {
  const now = Date.now();
  if (!forceRefresh && _vertexToken && now - _vertexTokenAt < TOKEN_TTL_MS) {
    return _vertexToken;
  }
  try {
    const out = execSync('gcloud auth print-access-token', {
      encoding: 'utf-8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    _vertexToken = out.trim();
    _vertexTokenAt = now;
    return _vertexToken;
  } catch (err) {
    throw new Error(
      `Failed to obtain gcloud access token. Is gcloud installed and authenticated? ` +
        `Run: gcloud auth login\n(underlying: ${err instanceof Error ? err.message : String(err)})`,
    );
  }
}

/** Recursively convert a JSON Schema to Vertex responseSchema form (uppercase type enums). */
function toVertexSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toVertexSchema);
  if (schema && typeof schema === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
      if (k === 'type' && typeof v === 'string') {
        out[k] = v.toUpperCase();
      } else if (k === 'properties' && v && typeof v === 'object') {
        out[k] = Object.fromEntries(
          Object.entries(v as Record<string, unknown>).map(([pk, pv]) => [pk, toVertexSchema(pv)]),
        );
      } else if (k === 'items') {
        out[k] = toVertexSchema(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return schema;
}

interface VertexResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { code?: number; message?: string; status?: string };
}

// Fallback token estimates when the API omits usageMetadata (≈ a copy call).
const EST_INPUT_TOKENS = 600;
const EST_OUTPUT_TOKENS = 1500;

/**
 * Cloud chat via Vertex AI gemini-2.5-flash. Thinking is disabled (thinkingBudget 0)
 * for fast, cheap structured copy. Retries on transient errors and refreshes the
 * OAuth token on 401.
 */
export async function cloudChatVertex(
  messages: ChatMessage[],
  opts?: LocalChatOptions,
): Promise<string> {
  if (!VERTEX_PROJECT) {
    throw new Error('GOOGLE_CLOUD_PROJECT is required for Vertex AI generation');
  }
  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`;

  const systemText = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n');
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const generationConfig: Record<string, unknown> = {
    temperature: opts?.temperature ?? 0.7,
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (opts?.schema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = toVertexSchema(opts.schema);
  }

  const body: Record<string, unknown> = { contents, generationConfig };
  if (systemText) body.systemInstruction = { parts: [{ text: systemText }] };

  let lastErr: Error | null = null;
  let consecutive429 = 0;

  for (let attempt = 0; attempt < CLOUD_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const isAuth = lastErr?.message.includes('401');
      // For 429: long exponential backoff capped at CLOUD_429_MAX_MS.
      // For everything else: short backoff same as before.
      const delayMs = consecutive429 > 0
        ? Math.min(CLOUD_429_BASE_MS * Math.pow(2, consecutive429 - 1), CLOUD_429_MAX_MS)
        : 2000 * attempt;
      console.warn(`[llm] cloudChatVertex retry ${attempt}/${CLOUD_MAX_RETRIES - 1}${consecutive429 > 0 ? ` (quota backoff ${Math.round(delayMs / 1000)}s)` : ''}…`);
      await sleep(delayMs);
      if (isAuth) consecutive429 = 0; // reset on auth errors
    }

    const token = getAccessToken(attempt > 0 && lastErr?.message.includes('401'));
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (isConnectionError(lastErr)) continue;
      throw lastErr;
    }

    if (!res.ok) {
      const detail = await res.text();
      lastErr = new Error(`cloudChatVertex failed (${res.status}): ${detail.slice(0, 300)}`);

      if (res.status === 429) {
        consecutive429++;
        // Honor RetryInfo from Vertex if present (override computed delay next iteration).
        const retryAfterMs = parse429RetryAfterMs(detail);
        if (retryAfterMs !== null) {
          console.warn(`[llm] Vertex 429 — waiting ${Math.round(retryAfterMs / 1000)}s (RetryInfo)…`);
          await sleep(retryAfterMs);
          consecutive429 = 0; // backoff was explicit — reset counter
        }
        continue;
      }

      consecutive429 = 0;
      if (res.status === 401 || res.status >= 500) continue;
      throw lastErr;
    }

    consecutive429 = 0;
    const data = (await res.json()) as VertexResponse;
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) {
      lastErr = new Error('cloudChatVertex returned empty response');
      continue;
    }

    // Budget tracking: record spend from real usage when available, otherwise
    // fall back to conservative estimates, then enforce the hard cap.
    const usage = data.usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? EST_INPUT_TOKENS;
    const outputTokens =
      (usage?.candidatesTokenCount ?? EST_OUTPUT_TOKENS) + (usage?.thoughtsTokenCount ?? 0);
    budget.recordSpend(inputTokens, outputTokens, VERTEX_MODEL);
    budget.checkCap(BUDGET_CAP_USD);

    return text;
  }

  throw new Error(`cloudChatVertex failed after ${CLOUD_MAX_RETRIES} attempts: ${lastErr?.message}`);
}

/**
 * Unified chat router: dispatches to local Ollama or cloud Vertex AI based on provider.
 */
export async function chat(
  messages: ChatMessage[],
  opts?: LocalChatOptions,
  provider: Provider = 'local',
): Promise<string> {
  return provider === 'cloud'
    ? cloudChatVertex(messages, opts)
    : localChat(messages, opts);
}
