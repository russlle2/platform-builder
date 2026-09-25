export function assertDeployedRuntime(readiness, expected) {
  for (const [field, value] of Object.entries({ deploymentSiteId: expected.siteId, supabaseProjectRef: expected.projectRef, deploymentReleaseSha: expected.releaseSha })) {
    if (!value || readiness?.[field]?.toLowerCase() !== value.toLowerCase()) throw new Error(`Deployed runtime ${field} does not match the reviewed release`)
  }
  if (readiness?.supabaseSchemaVersion !== '20260903.3' || readiness?.bookingKitSchemaVersion !== '20260925.2' || readiness?.supabaseSchemaReady !== true) throw new Error('Deployed runtime schema probe failed')
  if (expected.catalogProfile || expected.catalogHash || expected.manifestHash || expected.certificationHash) {
    if (!['rehab-staging', 'rehab-certified'].includes(expected.catalogProfile) || !/^[a-f0-9]{64}$/.test(expected.catalogHash ?? '') || !/^[a-f0-9]{64}$/.test(expected.manifestHash ?? '')) throw new Error('Expected immutable catalogue identity is incomplete')
    if (readiness?.templateCatalogReady !== true || readiness?.publishedTemplateCount !== 5486 || readiness?.expectedTemplateCount !== 5486) throw new Error('Deployed full catalogue is not ready')
    for (const [field, value] of Object.entries({ templateCatalogProfile: expected.catalogProfile, templateCatalogHash: expected.catalogHash, templateManifestHash: expected.manifestHash })) {
      if (readiness[field] !== value) throw new Error(`Deployed runtime ${field} does not match the certified catalogue`)
    }
    if (expected.catalogProfile === 'rehab-certified' && (!/^[a-f0-9]{64}$/.test(expected.certificationHash ?? '') || readiness.templateCertificationHash !== expected.certificationHash || readiness.templateCatalogueReleaseSha !== expected.releaseSha)) throw new Error('Deployed catalogue certification is not bound to the reviewed commit')
  } else if (readiness?.templateCatalogProfile === 'rehab-certified') {
    throw new Error('Certified production attestation requires the approved catalogue and receipt hashes')
  }
}
