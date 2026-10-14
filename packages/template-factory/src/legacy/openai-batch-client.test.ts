import assert from 'node:assert/strict';
import test from 'node:test';
import { NativeOpenAIBatchClient } from './openai-batch-client.js';

test('native Batch/Responses client keeps credentials private and sends the lane recovery identity', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    requests.push({ url, init });
    const pathname = new URL(url).pathname;
    if (pathname.endsWith('/files') && init?.method === 'POST') {
      assert.ok(init.body instanceof FormData);
      assert.equal(init.body.get('purpose'), 'batch');
      return Response.json({ id: 'file-input_1' });
    }
    if (pathname.endsWith('/batches') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      assert.deepEqual(body, {
        input_file_id: 'file-input_1',
        endpoint: '/v1/responses',
        completion_window: '24h',
        metadata: {
          pipeline: 'daily-clarity-legacy-rehab-v1',
          lane_id: 'lane-safe-1',
        },
      });
      return Response.json({ id: 'batch_created_1', status: 'validating', input_file_id: 'file-input_1' });
    }
    if (pathname.endsWith('/batches/batch_created_1')) {
      return Response.json({ id: 'batch_created_1', status: 'completed', output_file_id: 'file-output_1' });
    }
    if (pathname.endsWith('/files/file-output_1/content')) return new Response('{"ok":true}\n');
    throw new Error(`Unexpected fake request: ${url}`);
  };
  const secret = 'sk-test-never-enumerable';
  const client = new NativeOpenAIBatchClient(secret, { baseUrl: 'https://unit.test/v1', fetch: fakeFetch });

  const fileId = await client.uploadJsonl('request-a.jsonl', '{"request":true}\n');
  const created = await client.create(fileId, 'lane-safe-1');
  const retrieved = await client.retrieve(created.id);
  const output = await client.downloadFile(retrieved.output_file_id!);

  assert.equal(output, '{"ok":true}\n');
  assert.equal(Object.keys(client).includes('apiKey'), false);
  assert.equal(JSON.stringify(client).includes(secret), false);
  for (const request of requests) {
    const headers = new Headers(request.init?.headers);
    assert.equal(headers.get('authorization'), `Bearer ${secret}`);
    assert.equal(String(request.init?.body ?? '').includes(secret), false);
  }
});

test('native client recovers an exact prior batch across pages and rejects ambiguity', async () => {
  let ambiguous = false;
  const fakeFetch = async (input: string | URL | Request): Promise<Response> => {
    const url = new URL(String(input));
    const after = url.searchParams.get('after');
    if (!after) {
      return Response.json({
        data: [{
          id: 'batch_other_1',
          status: 'completed',
          input_file_id: 'file-other_1',
          endpoint: '/v1/responses',
          metadata: { lane_id: 'lane-safe-1' },
        }],
        has_more: true,
        last_id: 'batch_other_1',
      });
    }
    return Response.json({
      data: [
        {
          id: 'batch_match_1',
          status: 'in_progress',
          input_file_id: 'file-input_1',
          endpoint: '/v1/responses',
          metadata: { lane_id: 'lane-safe-1' },
        },
        ...(ambiguous ? [{
          id: 'batch_match_2',
          status: 'validating',
          input_file_id: 'file-input_1',
          endpoint: '/v1/responses',
          metadata: { lane_id: 'lane-safe-1' },
        }] : []),
      ],
      has_more: false,
    });
  };
  const client = new NativeOpenAIBatchClient('sk-test', { baseUrl: 'https://unit.test/v1', fetch: fakeFetch });
  assert.equal((await client.recoverBatchByInputFileId('file-input_1', 'lane-safe-1'))?.id, 'batch_match_1');
  ambiguous = true;
  await assert.rejects(
    client.recoverBatchByInputFileId('file-input_1', 'lane-safe-1'),
    /ambiguous/,
  );
});

test('native client diagnostics never include its credential', async () => {
  const secret = 'sk-test-must-not-leak';
  const client = new NativeOpenAIBatchClient(secret, {
    fetch: async () => new Response(`authorization rejected for ${secret}`, { status: 401 }),
  });
  await assert.rejects(
    client.retrieve('batch_safe_1'),
    (error: unknown) => error instanceof Error && error.message.includes('HTTP 401') && !error.message.includes(secret),
  );
});
