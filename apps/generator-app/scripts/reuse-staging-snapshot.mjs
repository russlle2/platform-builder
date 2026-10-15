import { canonicalDigest, createCertifiedPointer, validateCertification } from '../src/lib/templates/certified-catalog-contract.mjs'
import { verifySnapshot } from './certified-catalog-release.mjs'

const HASH = /^[a-f0-9]{64}$/
const withoutRelease = ({ releaseSha: _releaseSha, ...evidence }) => evidence

// This is an explicit recovery path for an already uploaded immutable catalogue.
// A matching certificate is only a reuse hint, never proof of remote completeness:
// every remote runtime byte is still verified before the caller may activate it.
export async function reuseStagingSnapshot({ store, receipt, existingReceiptHash }, verify = verifySnapshot) {
  validateCertification(receipt)
  if (!HASH.test(existingReceiptHash ?? '')) throw new Error('Exact existing staging certification hash is required')
  const existing = await store.get(`certifications/${existingReceiptHash}.json`, { type: 'json' })
  if (!existing || canonicalDigest(existing) !== existingReceiptHash) throw new Error('Existing staging certification differs from the approved reuse identity')
  validateCertification(existing)
  if (canonicalDigest(withoutRelease(existing)) !== canonicalDigest(withoutRelease(receipt))) throw new Error('Existing staging catalogue evidence differs from the candidate')

  const pointer = createCertifiedPointer(receipt)
  const prior = await store.get(pointer.certificationKey, { type: 'json' })
  if (prior !== null && canonicalDigest(prior) !== pointer.certificationHash) throw new Error('Immutable staging certification conflicts')
  if (prior === null) await store.setJSON(pointer.certificationKey, receipt)
  if (canonicalDigest(await store.get(pointer.certificationKey, { type: 'json' })) !== pointer.certificationHash) throw new Error('Staging certification durable readback failed')
  await verify(store, pointer)
  return { sourceCertificationHash: existingReceiptHash, certificationHash: pointer.certificationHash, files: receipt.files }
}
