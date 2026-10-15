import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalDigest } from '../src/lib/templates/certified-catalog-contract.mjs'
import { reuseStagingSnapshot } from './reuse-staging-snapshot.mjs'

const certificate = (releaseSha = 'a'.repeat(40)) => ({ version: 1, profile: 'rehab-certified', releaseSha, catalogHash: '1'.repeat(64), manifestHash: '2'.repeat(64), fullGateHash: '3'.repeat(64), sourceCatalogHash: '4'.repeat(64), templateEvidenceHash: '5'.repeat(64), fileEvidenceHash: '6'.repeat(64), sourceTemplates: 5486, certifiedTemplates: 5486, neutralFallbacks: 0, customizationDiagnostics: 0, files: 129521, pages: 33963 })
function fixture() {
  const old = certificate(), receipt = certificate('b'.repeat(40)), existingReceiptHash = canonicalDigest(old)
  const objects = new Map([[`certifications/${existingReceiptHash}.json`, old]])
  const writes = [], reads = []
  const store = {
    async get(key) { reads.push(key); return objects.get(key) ?? null },
    async setJSON(key, value) { writes.push(key); objects.set(key, structuredClone(value)) },
  }
  return { old, receipt, existingReceiptHash, objects, writes, reads, store }
}

test('reuse requires a complete snapshot verification and writes only a new immutable certificate', async () => {
  const f = fixture(), calls = []
  const result = await reuseStagingSnapshot(f, async (store, pointer) => {
    calls.push(pointer)
    assert.equal(store, f.store)
    assert.equal(pointer.releaseSha, f.receipt.releaseSha)
    assert.deepEqual(await store.get(pointer.certificationKey), f.receipt)
  })
  assert.equal(calls.length, 1)
  assert.deepEqual(f.writes, [`certifications/${canonicalDigest(f.receipt)}.json`])
  assert.equal(result.sourceCertificationHash, f.existingReceiptHash)
  assert.equal(result.files, 129521)
})

test('missing, wrong-hash or different catalogue evidence refuses reuse before any write', async () => {
  for (const change of ['missing', 'wrong-hash', 'catalogHash', 'fileEvidenceHash', 'templateEvidenceHash', 'files', 'pages']) {
    const f = fixture()
    if (change === 'missing') f.objects.clear()
    else if (change === 'wrong-hash') f.existingReceiptHash = 'f'.repeat(64)
    else f.receipt[change] = typeof f.receipt[change] === 'number' ? f.receipt[change] + 1 : 'e'.repeat(64)
    await assert.rejects(reuseStagingSnapshot(f, async () => assert.fail('must not verify unrelated evidence')))
    assert.deepEqual(f.writes, [])
  }
})

test('existing target certificate cannot be overwritten and a failed remote verification stays failed', async () => {
  const f = fixture(), key = `certifications/${canonicalDigest(f.receipt)}.json`
  f.objects.set(key, { ...f.receipt, releaseSha: 'c'.repeat(40) })
  await assert.rejects(reuseStagingSnapshot(f, async () => assert.fail('conflict must stop')), /conflicts/)
  assert.deepEqual(f.writes, [])
  f.objects.delete(key)
  await assert.rejects(reuseStagingSnapshot(f, async () => { throw new Error('remote file missing') }), /remote file missing/)
  assert.deepEqual(f.writes, [key])
  assert.equal(f.objects.has('_active.json'), false)
})

test('same-release recovery still fully verifies and performs no duplicate certificate write', async () => {
  const f = fixture(); f.receipt = f.old
  let verified = false
  await reuseStagingSnapshot(f, async () => { verified = true })
  assert.equal(verified, true)
  assert.deepEqual(f.writes, [])
})

test('a lost or altered certificate readback fails before snapshot verification', async () => {
  const f = fixture()
  f.store.setJSON = async key => { f.writes.push(key) }
  await assert.rejects(reuseStagingSnapshot(f, async () => assert.fail('readback must stop')), /readback/)
})
