import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  LAUNCH_CATALOG_CONTRACT,
  LAUNCH_CATALOG_APPROVED_RECEIPT,
  REHAB_STAGING_ACTIVE_KEY,
  REHAB_STAGING_CATALOG_CONTRACT,
  REHAB_STAGING_STORE_NAME,
  assertRehabStagingUploadEnvironment,
  hasMatchingUploadMetadata,
  main,
  manifestDigest,
  buildReleaseManifest,
  matchesOnlySelector,
  mergeValidatedManifest,
  normalizeOnlySelector,
  parseUploadArgs,
  publishRehabStagingCatalog,
  reconcileCatalogV3Manifest,
  uploadMetadataForFile,
  validateLaunchCatalogManifest,
  validateRehabV3StagingCatalogManifest,
  validateUploadContract,
  validateV3QualityReceipt,
  verifyPublishedManifest,
} from './upload-templates-to-blobs.mjs'

const TEST_SOURCE_HASH = 'a'.repeat(64)
const TEST_SCREENSHOT_HASH = 'b'.repeat(64)
const TEST_PERCEPTUAL_HASH = 'c'.repeat(16)

function signedReceipt(body) {
  return {
    id: `receipt_${manifestDigest(body).slice(0, 24)}`,
    ...body,
  }
}

async function writeV3Fixture(templateDir) {
  const index = Buffer.from('<h1>{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Email</a>')
  await writeFile(path.join(templateDir, 'index.html'), index)
  await mkdir(path.join(templateDir, '.dailyclarity'), { recursive: true })
  const records = [{
    path: 'index.html',
    sha256: createHash('sha256').update(index).digest('hex'),
    bytes: index.byteLength,
  }]
  const treeHash = manifestDigest(records)
  const tree = { version: 1, treeHash, files: records }
  const receiptBody = {
    version: 1,
    legacySlug: 'sample',
    niche: 'aromatherapy',
    sourceHash: TEST_SOURCE_HASH,
    artifactHash: treeHash,
    ruleVersion: 'legacy-repair-v1',
    generatedAt: '2026-09-03T12:00:00.000Z',
    checks: {
      static: 'passed',
      desktop: 'passed',
      mobile: 'passed',
      criticalDefects: 0,
      seriousDefects: 0,
    },
    pages: ['desktop', 'mobile'].map((viewport) => ({
      page: 'index.html',
      viewport,
      passed: true,
      screenshotSha256: TEST_SCREENSHOT_HASH,
      perceptualHash: TEST_PERCEPTUAL_HASH,
      editSlots: 2,
      imageSlots: 0,
      issues: [],
    })),
  }
  const receipt = signedReceipt(receiptBody)
  await writeFile(
    path.join(templateDir, '.dailyclarity', 'artifact-tree.json'),
    JSON.stringify(tree),
  )
  await writeFile(
    path.join(templateDir, '.dailyclarity', 'final-quality-receipt.json'),
    JSON.stringify(receipt),
  )
  return {
    tree,
    receipt,
    meta: {
      contractVersion: 3,
      legacySlug: 'sample',
      nicheSlug: 'aromatherapy',
      pages: ['index.html'],
      designId: 'design_one',
      contentPresetId: 'content_one',
      themePresetId: 'theme_one',
      qualityReceipt: receipt.id,
    },
  }
}

test('catalog v3 receipts bind browser QA to the complete immutable artifact tree', async () => {
  const templateDir = await mkdtemp(path.join(tmpdir(), 'dc-uploader-v3-'))
  try {
    const { meta } = await writeV3Fixture(templateDir)
    assert.deepEqual(validateV3QualityReceipt(templateDir, meta), [])

    await writeFile(path.join(templateDir, 'index.html'), 'tampered')
    assert.match(validateV3QualityReceipt(templateDir, meta).join('\n'), /digest mismatch/)
  } finally {
    await rm(templateDir, { recursive: true, force: true })
  }
})

test('catalog v3 rejects untracked artifacts and incomplete or tampered browser evidence', async () => {
  const templateDir = await mkdtemp(path.join(tmpdir(), 'dc-uploader-v3-negative-'))
  try {
    const { meta, receipt, tree } = await writeV3Fixture(templateDir)
    await writeFile(path.join(templateDir, 'untracked.css'), 'body{}')
    assert.match(validateV3QualityReceipt(templateDir, meta).join('\n'), /missing file record untracked\.css/)

    await rm(path.join(templateDir, 'untracked.css'))
    const duplicateRecords = [...tree.files, tree.files[0]]
    await writeFile(
      path.join(templateDir, '.dailyclarity', 'artifact-tree.json'),
      JSON.stringify({ ...tree, treeHash: manifestDigest(duplicateRecords), files: duplicateRecords }),
    )
    assert.match(validateV3QualityReceipt(templateDir, meta).join('\n'), /repeats file record index\.html/)
    await writeFile(
      path.join(templateDir, '.dailyclarity', 'artifact-tree.json'),
      JSON.stringify(tree),
    )

    const incompleteBody = {
      ...receipt,
      pages: receipt.pages.filter((page) => page.viewport === 'desktop'),
    }
    delete incompleteBody.id
    const incomplete = signedReceipt(incompleteBody)
    await writeFile(
      path.join(templateDir, '.dailyclarity', 'final-quality-receipt.json'),
      JSON.stringify(incomplete),
    )
    assert.match(
      validateV3QualityReceipt(templateDir, { ...meta, qualityReceipt: incomplete.id }).join('\n'),
      /missing browser evidence for index\.html\/mobile/,
    )

    const tampered = { ...receipt, checks: { ...receipt.checks, mobile: 'failed' } }
    await writeFile(
      path.join(templateDir, '.dailyclarity', 'final-quality-receipt.json'),
      JSON.stringify(tampered),
    )
    assert.match(
      validateV3QualityReceipt(templateDir, meta).join('\n'),
      /receipt digest is invalid/,
    )
  } finally {
    await rm(templateDir, { recursive: true, force: true })
  }
})

function completeLaunchManifest() {
  return Object.fromEntries(Object.keys(LAUNCH_CATALOG_CONTRACT.templatesByNiche).map((niche) => [
    niche,
    LAUNCH_CATALOG_APPROVED_RECEIPT.templates
      .filter((template) => template.niche === niche)
      .map((template, index) => ({
        slug: template.slug,
        nicheSlug: niche,
        dir: `${niche}/${template.slug}`,
        name: `Template ${index + 1}`,
        artifactSha256: template.sha256,
        catalogReportSha256: LAUNCH_CATALOG_CONTRACT.curatedReportSha256,
        editable: true,
        validation: { status: 'passed', contractVersion: 2, tokens: ['BUSINESS_NAME'] },
      })),
  ]))
}

function v3ManifestEntry(niche, slug, overrides = {}) {
  return {
    slug,
    legacySlug: slug,
    niche,
    nicheSlug: niche,
    dir: `${niche}/${slug}`,
    name: slug,
    editable: true,
    designId: `design_${slug}`,
    contentPresetId: `content_${slug}`,
    themePresetId: `theme_${slug}`,
    qualityReceipt: `receipt_${slug}`,
    validation: { status: 'passed', contractVersion: 3, tokens: ['BUSINESS_NAME'] },
    ...overrides,
  }
}

function completeRehabPublishPlan() {
  const manifest = {}
  const mappings = []
  const gallery = {}
  const files = []
  for (const [niche, count] of Object.entries(REHAB_STAGING_CATALOG_CONTRACT.templatesByNiche)) {
    manifest[niche] = []
    gallery[niche] = []
    for (let index = 0; index < count; index++) {
      const slug = `${niche}-${String(index).padStart(4, '0')}`
      const mapping = {
        legacySlug: slug,
        niche,
        designId: `design_${slug}`,
        contentPresetId: `content_${slug}`,
        themePresetId: `theme_${slug}`,
        qualityReceipt: `receipt_${slug}`,
        canonicalLegacySlug: slug,
        disposition: 'canonical',
      }
      const key = `${niche}/${slug}/index.html`
      manifest[niche].push({
        ...v3ManifestEntry(niche, slug),
        ...mapping,
        pages: ['index.html'],
        files: ['index.html'],
        fields: [{ name: 'BUSINESS_NAME', label: 'Business name', type: 'text' }],
      })
      mappings.push(mapping)
      gallery[niche].push(slug)
      files.push({ key, read: async () => Buffer.from(key) })
    }
  }
  const catalog = {
    contractVersion: 3,
    ruleVersion: 'test-rule',
    generatedAt: '2026-09-03T12:00:00.000Z',
    sourceTemplates: REHAB_STAGING_CATALOG_CONTRACT.totalTemplates,
    canonicalDesigns: REHAB_STAGING_CATALOG_CONTRACT.totalTemplates,
    templates: mappings,
    gallery,
  }
  return { manifest, catalog, files, catalogBytes: Buffer.from(`${JSON.stringify(catalog)}\n`) }
}

class MemoryBlobStore {
  constructor({ failSetKey, corruptGetKey } = {}) {
    this.values = new Map()
    this.metadata = new Map()
    this.writes = []
    this.failSetKey = failSetKey
    this.corruptGetKey = corruptGetKey
  }

  async get(key, options = {}) {
    const value = this.values.get(key)
    if (value === undefined) return null
    if (key === this.corruptGetKey && options.type === 'arrayBuffer') {
      return Buffer.from('corrupt-readback')
    }
    if (options.type === 'json') {
      if (typeof value === 'string' || Buffer.isBuffer(value)) return JSON.parse(String(value))
      return structuredClone(value)
    }
    return value
  }

  async getMetadata(key) {
    const metadata = this.metadata.get(key)
    return metadata ? { metadata: { ...metadata } } : null
  }

  async set(key, value, options = {}) {
    if (key === this.failSetKey) throw new Error(`injected write failure for ${key}`)
    this.writes.push({ method: 'set', key })
    this.values.set(key, Buffer.from(value))
    this.metadata.set(key, { ...(options.metadata || {}) })
  }

  async setJSON(key, value) {
    if (key === this.failSetKey) throw new Error(`injected write failure for ${key}`)
    this.writes.push({ method: 'setJSON', key })
    this.values.set(key, structuredClone(value))
  }
}

async function writeRehabStagingTemplate(root, {
  niche,
  slug,
  designId,
  canonicalLegacySlug,
  disposition,
}) {
  const templateDir = path.join(root, niche, slug)
  await mkdir(path.join(templateDir, '.dailyclarity'), { recursive: true })
  const contentPresetId = `content_${slug}`
  const themePresetId = `theme_${slug}`
  const trackedFiles = new Map([
    [
      'index.html',
      '<!doctype html><html><body><main><h1>{{BUSINESS_NAME}}</h1>' +
        '<a href="mailto:{{EMAIL}}">Email</a></main></body></html>',
    ],
    [
      'template.json',
      `${JSON.stringify({
        contractVersion: 3,
        slug,
        legacySlug: slug,
        niche,
        pages: ['index.html'],
        designId,
        contentPresetId,
        themePresetId,
      }, null, 2)}\n`,
    ],
  ])
  for (const [relativePath, value] of trackedFiles) {
    await writeFile(path.join(templateDir, relativePath), value)
  }
  const records = [...trackedFiles]
    .map(([relativePath, value]) => ({
      path: relativePath,
      sha256: createHash('sha256').update(value).digest('hex'),
      bytes: Buffer.byteLength(value),
    }))
    .sort((left, right) => left.path.localeCompare(right.path))
  const treeHash = manifestDigest(records)
  const tree = { version: 1, treeHash, files: records }
  const receiptBody = {
    version: 1,
    legacySlug: slug,
    niche,
    sourceHash: createHash('sha256').update(`source:${niche}/${slug}`).digest('hex'),
    artifactHash: treeHash,
    ruleVersion: 'legacy-rehab-test',
    generatedAt: '2026-09-03T12:00:00.000Z',
    checks: {
      static: 'passed',
      desktop: 'passed',
      mobile: 'passed',
      criticalDefects: 0,
      seriousDefects: 0,
    },
    pages: ['desktop', 'mobile'].map((viewport) => ({
      page: 'index.html',
      viewport,
      passed: true,
      screenshotSha256: createHash('sha256').update(`${slug}:${viewport}`).digest('hex'),
      perceptualHash: createHash('sha256').update(`phash:${slug}:${viewport}`).digest('hex').slice(0, 16),
      editSlots: 2,
      imageSlots: 0,
      issues: [],
    })),
  }
  const receipt = signedReceipt(receiptBody)
  await writeFile(
    path.join(templateDir, '.dailyclarity', 'artifact-tree.json'),
    JSON.stringify(tree),
  )
  await writeFile(
    path.join(templateDir, '.dailyclarity', 'final-quality-receipt.json'),
    JSON.stringify(receipt),
  )
  return {
    legacySlug: slug,
    niche,
    designId,
    contentPresetId,
    themePresetId,
    qualityReceipt: receipt.id,
    canonicalLegacySlug,
    disposition,
  }
}

async function writeRehabStagingRoot(root) {
  const canonical = await writeRehabStagingTemplate(root, {
    niche: 'aromatherapy',
    slug: 'canonical',
    designId: 'design_shared',
    canonicalLegacySlug: 'canonical',
    disposition: 'canonical',
  })
  const alias = await writeRehabStagingTemplate(root, {
    niche: 'aromatherapy',
    slug: 'alias',
    designId: 'design_shared',
    canonicalLegacySlug: 'canonical',
    disposition: 'alias',
  })
  const catalog = {
    contractVersion: 3,
    ruleVersion: 'legacy-rehab-test',
    generatedAt: '2026-09-03T12:00:00.000Z',
    sourceTemplates: 2,
    canonicalDesigns: 1,
    templates: [canonical, alias],
    gallery: { aromatherapy: ['canonical'] },
  }
  await writeFile(path.join(root, '_catalog-v3.json'), JSON.stringify(catalog))
  return catalog
}

test('parses repeatable selectors, force, and dry-run without side effects', () => {
  assert.deepEqual(
    parseUploadArgs([
      '--dry-run',
      '--only',
      'aromatherapy/template-one',
      '--only=sound_bath/template-two',
      '--force',
      '--root',
      '.',
    ]),
    {
      force: true,
      dryRun: true,
      rehabV3Staging: false,
      only: [
        'aromatherapy/template-one',
        'sound_bath/template-two',
      ],
      root: process.cwd(),
      help: false,
    },
  )
})

test('matches exact keys and directory prefixes only', () => {
  const selectors = ['aromatherapy/template-one']
  assert.equal(matchesOnlySelector('aromatherapy/template-one', selectors), true)
  assert.equal(matchesOnlySelector('aromatherapy/template-one/index.html', selectors), true)
  assert.equal(matchesOnlySelector('aromatherapy/template-one-more/index.html', selectors), false)
  assert.equal(matchesOnlySelector('sound_bath/template-one/index.html', selectors), false)
})

test('rejects traversal, Windows separators, absolute paths, and unknown flags', () => {
  for (const unsafe of [
    '../private',
    'aromatherapy/../private',
    'aromatherapy\\template',
    '/aromatherapy/template',
    'aromatherapy/template name',
    'aromatherapy/template/index.html',
  ]) {
    assert.throws(() => normalizeOnlySelector(unsafe), /Unsafe --only selector/)
  }
  assert.throws(() => parseUploadArgs(['--delete']), /Unknown argument/)
  assert.throws(() => parseUploadArgs(['--only']), /requires a selector/)
})

test('partial manifest updates retain only previously validated remote entries', () => {
  const remote = buildReleaseManifest(completeLaunchManifest())
  const local = buildReleaseManifest(completeLaunchManifest())
  const selected = local.aromatherapy[0].sourceDir
  remote.aromatherapy[0].name = 'Old'
  local.aromatherapy[0].name = 'New'
  remote.aromatherapy.push({ dir: 'aromatherapy/legacy', name: 'Legacy' })
  const merged = mergeValidatedManifest(
    remote,
    local,
    [selected],
    Object.keys(LAUNCH_CATALOG_CONTRACT.templatesByNiche),
  )
  assert.equal(merged.aromatherapy.find((entry) => entry.sourceDir === selected).name, 'New')
  assert.equal(merged.aromatherapy.some((entry) => entry.name === 'Legacy'), false)
  assert.equal(merged.sound_bath.length, 12)
})

test('catalog v3 authoritative mappings replace pre-dedupe design IDs', () => {
  const local = {
    aromatherapy: [
      v3ManifestEntry('aromatherapy', 'canonical'),
      v3ManifestEntry('aromatherapy', 'alias'),
    ],
  }
  const catalog = {
    contractVersion: 3,
    ruleVersion: 'legacy-repair-v1',
    generatedAt: '2026-09-03T12:00:00.000Z',
    sourceTemplates: 2,
    canonicalDesigns: 1,
    templates: [
      {
        legacySlug: 'canonical',
        niche: 'aromatherapy',
        designId: 'design_canonical',
        contentPresetId: 'content_canonical',
        themePresetId: 'theme_canonical',
        qualityReceipt: 'receipt_canonical',
        canonicalLegacySlug: 'canonical',
        disposition: 'canonical',
      },
      {
        legacySlug: 'alias',
        niche: 'aromatherapy',
        designId: 'design_canonical',
        contentPresetId: 'content_alias',
        themePresetId: 'theme_alias',
        qualityReceipt: 'receipt_alias',
        canonicalLegacySlug: 'canonical',
        disposition: 'alias',
      },
    ],
    gallery: { aromatherapy: ['canonical'] },
  }

  const result = reconcileCatalogV3Manifest(local, catalog)
  assert.equal(result.pass, true, result.errors.join('\n'))
  assert.equal(result.manifest.aromatherapy[1].designId, 'design_canonical')
  assert.equal(result.manifest.aromatherapy[1].canonicalLegacySlug, 'canonical')
  assert.equal(result.manifest.aromatherapy[1].disposition, 'alias')

  const mismatched = structuredClone(catalog)
  mismatched.templates[1].qualityReceipt = 'receipt_wrong'
  const rejected = reconcileCatalogV3Manifest(local, mismatched)
  assert.equal(rejected.pass, false)
  assert.match(rejected.errors.join('\n'), /qualityReceipt does not match verified template/)

  const relabeledDesign = structuredClone(catalog)
  relabeledDesign.templates[0].designId = 'design_unverified'
  relabeledDesign.templates[1].designId = 'design_unverified'
  const designRejected = reconcileCatalogV3Manifest(local, relabeledDesign)
  assert.equal(designRejected.pass, false)
  assert.match(designRejected.errors.join('\n'), /invalid canonical lineage/)

  const missing = structuredClone(catalog)
  missing.templates.pop()
  const incomplete = reconcileCatalogV3Manifest(local, missing)
  assert.equal(incomplete.pass, false)
  assert.match(incomplete.errors.join('\n'), /missing template mapping aromatherapy\/alias/)

  const wrongGallery = structuredClone(catalog)
  wrongGallery.gallery.aromatherapy = ['alias']
  const invalidGallery = reconcileCatalogV3Manifest(local, wrongGallery)
  assert.equal(invalidGallery.pass, false)
  assert.match(invalidGallery.errors.join('\n'), /gallery does not match canonical mappings/)
})

test('blob metadata follows each template contract and forces v2-to-v3 rewrites', () => {
  const sha256 = 'd'.repeat(64)
  const manifest = {
    aromatherapy: [
      v3ManifestEntry('aromatherapy', 'modern'),
      {
        dir: 'aromatherapy/legacy',
        editable: true,
        validation: { status: 'passed', contractVersion: 2, tokens: ['BUSINESS_NAME'] },
      },
    ],
  }
  const v3Metadata = uploadMetadataForFile('aromatherapy/modern/index.html', sha256, manifest)
  assert.deepEqual(v3Metadata, { sha256, contractVersion: 3 })
  assert.equal(
    hasMatchingUploadMetadata({ metadata: { sha256, contractVersion: 2 } }, v3Metadata),
    false,
  )
  assert.equal(
    hasMatchingUploadMetadata({ metadata: { sha256, contractVersion: 3 } }, v3Metadata),
    true,
  )
  assert.deepEqual(
    uploadMetadataForFile('aromatherapy/legacy/index.html', sha256, manifest),
    {
      sha256,
      contractVersion: 2,
      catalogReportSha256: LAUNCH_CATALOG_CONTRACT.curatedReportSha256,
    },
  )
  assert.throws(
    () => uploadMetadataForFile('aromatherapy/missing/index.html', sha256, manifest),
    /derive upload contract version/,
  )
})

test('rehabilitation v3 staging dry-run rejects an undersized catalogue', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dc-uploader-rehab-staging-'))
  try {
    await writeRehabStagingRoot(root)
    await assert.rejects(
      main(['--dry-run', '--root', root, '--rehab-v3-staging'], {}),
      /expected 1292, found 2|expected=5486/i,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rehabilitation staging mode requires a complete explicit root and non-production context', async () => {
  assert.equal(parseUploadArgs(['--root', '.', '--rehab-v3-staging']).rehabV3Staging, true)
  assert.throws(
    () => parseUploadArgs(['--dry-run', '--rehab-v3-staging']),
    /requires an explicit --root directory/,
  )
  assert.throws(
    () => parseUploadArgs(['--root', '.', '--rehab-v3-staging', '--only', 'aromatherapy']),
    /complete catalogue.*--only/i,
  )
  assert.throws(
    () => parseUploadArgs(['--root', '.', '--rehab-v3-staging', '--force']),
    /immutable.*--force/i,
  )
  assert.throws(
    () => assertRehabStagingUploadEnvironment({ CONTEXT: 'production' }),
    /forbidden in production/i,
  )
  assert.throws(
    () => assertRehabStagingUploadEnvironment({}),
    /explicit non-production context/i,
  )
  assert.equal(assertRehabStagingUploadEnvironment({ CONTEXT: 'deploy-preview' }), 'deploy-preview')
  assert.equal(REHAB_STAGING_STORE_NAME, 'templates-rehab-staging')

  const root = await mkdtemp(path.join(tmpdir(), 'dc-uploader-rehab-normal-mode-'))
  try {
    await writeRehabStagingRoot(root)
    await assert.rejects(
      main(['--dry-run', '--root', root], {}),
      /curated export marker/i,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rehabilitation staging publication writes immutable data before switching the active pointer', async () => {
  const plan = completeRehabPublishPlan()
  const validation = validateRehabV3StagingCatalogManifest(plan.manifest, plan.catalog)
  assert.equal(validation.pass, true, validation.errors.join('\n'))
  assert.equal(validation.totalTemplates, 5_486)
  const store = new MemoryBlobStore()

  const result = await publishRehabStagingCatalog({
    store,
    ...plan,
    activatedAt: '2026-09-03T14:00:00.000Z',
  })

  assert.equal(result.sourceTemplates, 5_486)
  assert.equal(result.files, 5_486)
  assert.equal(result.uploaded, 5_486)
  assert.equal(store.writes.at(-1).key, REHAB_STAGING_ACTIVE_KEY)
  assert.equal(store.writes.at(-1).method, 'setJSON')
  assert.ok(store.writes.every(({ key }, index) => (
    index === store.writes.length - 1 || key.startsWith(`${result.prefix}/`)
  )))
  assert.ok(store.writes.findIndex(({ key }) => key === `${result.prefix}/_catalog-v3.json`) < store.writes.length - 1)
  assert.ok(store.writes.findIndex(({ key }) => key === `${result.prefix}/_manifest.json`) < store.writes.length - 1)
  assert.equal(store.values.has('_manifest.json'), false)
})

test('rehabilitation staging publication preserves the prior pointer after an asset failure', async () => {
  const plan = completeRehabPublishPlan()
  const catalogHash = createHash('sha256').update(plan.catalogBytes).digest('hex')
  const firstKey = [...plan.files].sort((left, right) => left.key.localeCompare(right.key))[0].key
  const failingStorageKey = `catalogs/${catalogHash}/${firstKey}`
  const store = new MemoryBlobStore({ failSetKey: failingStorageKey })
  const priorPointer = { version: 1, profile: 'rehab-staging', catalogHash: 'f'.repeat(64) }
  store.values.set(REHAB_STAGING_ACTIVE_KEY, priorPointer)

  await assert.rejects(
    publishRehabStagingCatalog({ store, ...plan }),
    /injected write failure/i,
  )

  assert.deepEqual(store.values.get(REHAB_STAGING_ACTIVE_KEY), priorPointer)
  assert.equal(store.writes.some(({ key }) => key === REHAB_STAGING_ACTIVE_KEY), false)
})

test('rehabilitation staging publication verifies asset bytes before switching the active pointer', async () => {
  const plan = completeRehabPublishPlan()
  const catalogHash = createHash('sha256').update(plan.catalogBytes).digest('hex')
  const firstKey = [...plan.files].sort((left, right) => left.key.localeCompare(right.key))[0].key
  const corruptStorageKey = `catalogs/${catalogHash}/${firstKey}`
  const store = new MemoryBlobStore({ corruptGetKey: corruptStorageKey })
  const priorPointer = { version: 1, profile: 'rehab-staging', catalogHash: 'f'.repeat(64) }
  store.values.set(REHAB_STAGING_ACTIVE_KEY, priorPointer)

  await assert.rejects(
    publishRehabStagingCatalog({ store, ...plan }),
    /object content readback failed/i,
  )

  assert.deepEqual(store.values.get(REHAB_STAGING_ACTIVE_KEY), priorPointer)
  assert.equal(store.writes.some(({ key }) => key === REHAB_STAGING_ACTIVE_KEY), false)
})

test('rehabilitation staging mode rejects authoritative count and mapping mismatches', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dc-uploader-rehab-mismatch-'))
  try {
    const catalog = await writeRehabStagingRoot(root)
    await writeFile(
      path.join(root, '_catalog-v3.json'),
      JSON.stringify({ ...catalog, sourceTemplates: 3 }),
    )
    await assert.rejects(
      main(['--dry-run', '--root', root, '--rehab-v3-staging'], {}),
      /source count does not match local manifest|source count is invalid/,
    )

    const mismatched = structuredClone(catalog)
    mismatched.templates[1].qualityReceipt = 'receipt_wrong'
    await writeFile(path.join(root, '_catalog-v3.json'), JSON.stringify(mismatched))
    await assert.rejects(
      main(['--dry-run', '--root', root, '--rehab-v3-staging'], {}),
      /qualityReceipt does not match verified template/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('upload contract fails closed on zero-token, fake-data, and stale-field output', () => {
  const valid = validateUploadContract(
    { 'index.html': '<h1>{{BUSINESS_NAME}}</h1><p>{{OWNER_NAME}}</p><a href="mailto:{{EMAIL}}">Email us</a>' },
    [
      { name: 'BUSINESS_NAME', default: 'Wellness Practice' },
      { name: 'OWNER_NAME', default: 'Practice Team' },
      { name: 'EMAIL', type: 'email' },
    ],
  )
  assert.equal(valid.pass, true, valid.errors.join('\n'))

  const invalid = validateUploadContract(
    { 'index.html': '<h1>Aromatherapy Studio</h1><p>hello@example.com</p>' },
    [{ name: 'BUSINESS_NAME', default: '{{BUSINESS_NAME}}' }],
  )
  assert.equal(invalid.pass, false)
  assert.match(invalid.errors.join('\n'), /no runtime personalization tokens/i)
  assert.match(invalid.errors.join('\n'), /placeholder email/i)
  assert.match(invalid.errors.join('\n'), /unused tokens/i)
  assert.match(invalid.errors.join('\n'), /default.*contains a token/i)
})

test('upload contract rejects malformed tokens, fabricated proof, fixed prices, unsafe links, and sensitive forms', () => {
  const result = validateUploadContract(
    {
      'index.html': '<h1>{{BUSINESS_NAME}}</h1><p>{{OWNER_NAME:0:1}}</p><a href="https://example.com/book">Book</a>',
      'pricing.html': '<p class="testimonial">A client doubled revenue.</p><p>$899</p>',
      'contact.html': '<form><input name="email"><textarea>List medications and health conditions</textarea></form>',
    },
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  )
  assert.equal(result.pass, false)
  const errors = result.errors.join('\n')
  assert.match(errors, /unsupported template expression/i)
  assert.match(errors, /testimonial/i)
  assert.match(errors, /hard-coded offer price/i)
  assert.match(errors, /hard-coded external/i)
  assert.match(errors, /sensitive health information/i)
})

test('upload boundary independently rejects adversarial sample identity, medical claims, proof, and intake copy', () => {
  const result = validateUploadContract(
    {
      'index.html': `<main>
        <h1>{{BUSINESS_NAME}}</h1>
        <p>Jane Doe can be reached at care@example.org or 212-555-0119.</p>
        <p>Our method treats depression and provides instant relief.</p>
        <section id="member-rated-results"><h2>Independently verified recognition</h2></section>
        <p>Sessions cost 750 EUR.</p>
        <form><label>Trauma history<textarea name="history"></textarea></label></form>
        <a href="mailto:{{EMAIL}}">Email</a>
      </main>`,
    },
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  )

  assert.equal(result.pass, false)
  const errors = result.errors.join('\n')
  assert.match(errors, /placeholder practitioner name/i)
  assert.match(errors, /placeholder email/i)
  assert.match(errors, /placeholder phone/i)
  assert.match(errors, /unsupported outcome/i)
  assert.match(errors, /unsupported absolute efficacy/i)
  assert.match(errors, /unverified credential or recognition/i)
  assert.match(errors, /hard-coded offer price/i)
  assert.match(errors, /sensitive health information/i)
})

test('upload boundary preserves structural text boundaries and ordinary address prose', () => {
  const result = validateUploadContract(
    {
      'index.html': `<main><h1>{{BUSINESS_NAME}}</h1>
        <h2>Sound Bath for Robust Immune Support</h2><p>Your immune system is a critical component of healthy aging.</p>
        <h2>Aromatherapy Rituals to Anchor Your Calm</h2><p>Your nervous system can become more sensitive with age.</p>
        <h2>When the Sandman Forgets Your Address</h2>
        <p>I'll only use your address to deliver the guide.</p>
        <div aria-label="Your Address">Delivery preferences</div>
        <template><p>Sessions support your immune system.</p></template>
        <button type="button" id="planPreview" data-val="Lab Review">Lab Review</button>
        <p>Schedule a quarterly review.</p><a href="mailto:{{EMAIL}}">Email</a></main>`,
    },
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  )

  assert.equal(result.pass, true, result.errors.join('\n'))
})

test('upload boundary still rejects inline outcomes and contextual street placeholders', () => {
  const result = validateUploadContract(
    {
      'index.html': `<main><h1>{{BUSINESS_NAME}}</h1>
        <p>Sessions <strong>support your immune system</strong>.</p>
        <input aria-label="Your&#32;Address">
        <a href="mailto:{{EMAIL}}">Email</a></main>`,
    },
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  )

  assert.equal(result.pass, false)
  assert.match(result.errors.join('\n'), /unsupported outcome claim/i)
  assert.match(result.errors.join('\n'), /placeholder street address/i)

  for (const html of [
    '<!doctype html><html><head><title>Sessions support your immune system</title></head><body><h1>{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Email</a></body></html>',
    '<!doctype html><html><body>Sessions support your immune system<h1>{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Email</a></body></html>',
    '<main><h1>{{BUSINESS_NAME}}</h1><p>Sessions support<br>your immune system.</p><a href="mailto:{{EMAIL}}">Email</a></main>',
    '<main><h1>{{BUSINESS_NAME}}</h1><p>Sessions support&Tab;your immune system.</p><a href="mailto:{{EMAIL}}">Email</a></main>',
    '<main><h1>{{BUSINESS_NAME}}</h1><div data-tip="Sessions support your immune syst&#101;m.">Information</div><a href="mailto:{{EMAIL}}">Email</a></main>',
  ]) {
    const isolated = validateUploadContract(
      { 'index.html': html },
      [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
    )
    assert.equal(isolated.pass, false)
    assert.match(isolated.errors.join('\n'), /unsupported outcome claim/i)
  }

  const encodedIdentity = validateUploadContract(
    {
      'index.html': '<main><h1>{{BUSINESS_NAME}}</h1><p>Jane&#32;Doe — Your&#32;City</p><a href="mailto:{{EMAIL}}">Email</a></main>',
    },
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  )
  assert.equal(encodedIdentity.pass, false)
  assert.match(encodedIdentity.errors.join('\n'), /placeholder practitioner name/i)
  assert.match(encodedIdentity.errors.join('\n'), /placeholder city/i)

  for (const [svgLabel, expected] of [
    ['Jane&#32;Doe', /placeholder practitioner name/i],
    ['Your&#32;City', /placeholder city/i],
    ['Your&#32;Address', /placeholder street address/i],
  ]) {
    const encodedSvgIdentity = validateUploadContract(
      {
        'index.html': `<main><h1>{{BUSINESS_NAME}}</h1><svg><title>${svgLabel}</title></svg><a href="mailto:{{EMAIL}}">Email</a></main>`,
      },
      [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
    )
    assert.equal(encodedSvgIdentity.pass, false)
    assert.match(encodedSvgIdentity.errors.join('\n'), expected)
  }

  const quotedGreaterThan = validateUploadContract(
    {
      'index.html': '<main><h1>{{BUSINESS_NAME}}</h1><input data-x=">" aria-label="Your Address"><a href="mailto:{{EMAIL}}">Email</a></main>',
    },
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  )
  assert.equal(quotedGreaterThan.pass, false)
  assert.match(quotedGreaterThan.errors.join('\n'), /placeholder street address/i)

  for (const placeholder of [
    '<legend>Your Address</legend>',
    '<section>Your Address</section>',
    '<select><option>Your Address</option></select>',
    '<fieldset aria-label="Your Address"><input name="street"></fieldset>',
  ]) {
    const semanticAddress = validateUploadContract(
      { 'index.html': `<main><h1>{{BUSINESS_NAME}}</h1>${placeholder}<a href="mailto:{{EMAIL}}">Email</a></main>` },
      [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
    )
    assert.equal(semanticAddress.pass, false, placeholder)
    assert.match(semanticAddress.errors.join('\n'), /placeholder street address/i)
  }

  for (const [markup, expected] of [
    ['<p>Ja<strong>ne</strong> Doe</p>', /placeholder practitioner name/i],
    ['<p>Wellness Coach Stu<span>dio</span></p>', /placeholder business name/i],
    ['<p>Ja<!--comment-->ne Doe</p>', /placeholder practitioner name/i],
    ['<p>hello@exam<strong>ple.com</strong></p>', /hard-coded email address/i],
    ['<p>(555) 555-01<strong>23</strong></p>', /hard-coded phone number/i],
    ['<p>Your Ci<wbr>ty</p>', /placeholder city/i],
    ['<p>Sessions sup<wbr>port your immune system.</p>', /unsupported outcome claim/i],
    ['<h2>testi<!--comment-->monials</h2>', /testimonial or review/i],
    ['<p>1<strong>2 U</strong>SD per session</p>', /hard-coded offer price/i],
    ['<div data-a="<script>">Sessions support your immune system.</div><p data-b="</script>">Information</p>', /unsupported outcome claim/i],
  ]) {
    const joined = validateUploadContract(
      { 'index.html': `<main><h1>{{BUSINESS_NAME}}</h1>${markup}<a href="mailto:{{EMAIL}}">Email</a></main>` },
      [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
    )
    assert.equal(joined.pass, false, markup)
    assert.match(joined.errors.join('\n'), expected, markup)
  }
})

test('upload boundary requires the exact functional inquiry form and its complete accessible prompt graph', () => {
  const standard = '<form class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact"><p><label>Your name <input name="name" autocomplete="name" required></label></p><p><label>Email <input type="email" name="email" autocomplete="email" required></label></p><p><label>Phone (optional) <input type="tel" name="phone" autocomplete="tel"></label></p><p><label>Message <textarea name="message" rows="5" required></textarea></label></p><button type="submit">Send inquiry</button></form>'
  const fields = [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }]
  const validate = (body) => validateUploadContract(
    { 'index.html': `<main><h1>{{BUSINESS_NAME}}</h1>${body}<a href="mailto:{{EMAIL}}">Email</a></main>` },
    fields,
  )

  const valid = validate(standard)
  assert.equal(valid.pass, true, valid.errors.join('\n'))

  for (const [invalidForm, expected] of [
    [standard.replace('<form ', '<form data-x=">" action="/collect" '), /custom form action/i],
    [standard.replace('name="name"', 'name=" NAME "'), /exactly one name control|unsupported inquiry control/i],
    [standard.replace('name="contact"', 'name="CONTACT"'), /form name must be contact/i],
    [standard.replace('data-dc-standard-form="contact"', 'data-dc-standard-form="CONTACT"'), /missing contact form marker/i],
    [standard.replace('<form ', '<form novalidate '), /validation may not be disabled/i],
    [standard.replace('<button type="submit"', '<button type="submit" formmethod="get"'), /submission override/i],
    [standard.replace('<button type="submit"', '<button type="submit" disabled'), /enabled and available/i],
    [standard.replace('<p><label>Your name', '<fieldset disabled><p><label>Your name').replace('</p><button type="submit">', '</p></fieldset><button type="submit">'), /editable and available/i],
    [standard.replace('<label>Message ', '<label aria-label="Your Address">Message '), /control label must be Message/i],
    [standard.replace('<label>Message ', '<label for="missing">Message '), /control label must be Message/i],
    [standard.replace('<button type="submit"', '<button type="submit" aria-describedby="details"'), /canonical submission behavior/i],
    [`<div hidden>${standard}</div>`, /ancestors must be available/i],
    [`<fieldset disabled>${standard}</fieldset>`, /ancestors must be available|editable and available/i],
    [standard.replace('name="name" autocomplete="name"', 'name="name" autocomplete="cc-number"'), /autocomplete is not canonical/i],
    [standard.replace('name="name" autocomplete="name"', 'name="name" autocomplete="name" maxlength="0"'), /noncanonical submission constraint/i],
    [standard.replace('<label>Your name ', '<label>Email '), /control label must be Your name/i],
  ]) {
    const result = validate(invalidForm)
    assert.equal(result.pass, false, invalidForm)
    assert.match(result.errors.join('\n'), expected, invalidForm)
  }

  const sensitiveSpoof = validate(standard.replace(
    '<form ',
    '<form data-x="</form>" ',
  ).replace('<p><label>Your name', '<p>Medical history</p><p><label>Your name'))
  assert.equal(sensitiveSpoof.pass, false)
  assert.match(sensitiveSpoof.errors.join('\n'), /sensitive health information/i)

  for (const reference of ['aria-describedby', 'aria-details', 'aria-errormessage']) {
    const described = validate(`<p id="medical-prompt">Medical history</p>${standard.replace('name="message"', `id="message" name="message" ${reference}="medical-prompt"`)}`)
    assert.equal(described.pass, false, reference)
    assert.match(described.errors.join('\n'), /accessible prompt solicits sensitive|canonical nested label/i, reference)

    const dangling = validate(standard.replace('name="message"', `name="message" ${reference}="missing-prompt"`))
    assert.equal(dangling.pass, false, reference)
    assert.match(dangling.errors.join('\n'), /dangling or ambiguous accessible-name reference|canonical nested label/i, reference)
  }

  const externalLabel = validate(`<label for="message">Medical history</label>${standard.replace('name="message"', 'id="message" name="message"')}`)
  assert.equal(externalLabel.pass, false)
  assert.match(externalLabel.errors.join('\n'), /accessible prompt solicits sensitive|canonical nested label/i)

  const hiddenLabel = validate(`<label for="message" hidden>Message</label>${standard.replace('<label>Message <textarea name="message"', '<span><textarea id="message" name="message"').replace('</textarea></label>', '</textarea></span>')}`)
  assert.equal(hiddenLabel.pass, false)
  assert.match(hiddenLabel.errors.join('\n'), /must have an accessible name|canonical nested label/i)

  const externalSubmitter = validate(`${standard.replace('<form ', '<form id="contact-form" ')}<button form="contact-form" formaction="/collect">Alternate submit</button>`)
  assert.equal(externalSubmitter.pass, false)
  assert.match(externalSubmitter.errors.join('\n'), /externally associated form controls|exactly one submit button/i)

  const v2Description = validateUploadContract(
    { 'index.html': `<main><h1>{{BUSINESS_NAME}}</h1><p id="details">Medical history and medications</p>${standard.replace(' data-dc-standard-form="contact"', '').replace('<form ', '<form aria-describedby="details" ')}<a href="mailto:{{EMAIL}}">Email</a></main>` },
    fields,
    { requireStandardInquiryForms: false },
  )
  assert.equal(v2Description.pass, false)
  assert.match(v2Description.errors.join('\n'), /accessible name or description solicits sensitive/i)

  for (const formOwnedSurface of [
    '<form id="f"></form><input type="submit" form="f" value="Send medical history">',
    '<form id="f"></form><input type="image" form="f" alt="Upload medical records">',
    '<p id="insurance-prompt">Enter insurance policy number</p><form id="f"></form><button form="f" aria-describedby="insurance-prompt">Send</button>',
    '<form id="f"></form><select form="f" name="topic"><option>Medical history</option></select>',
  ]) {
    const result = validateUploadContract(
      { 'index.html': `<main><h1>{{BUSINESS_NAME}}</h1>${formOwnedSurface}<a href="mailto:{{EMAIL}}">Email</a></main>` },
      fields,
      { requireStandardInquiryForms: false },
    )
    assert.equal(result.pass, false, formOwnedSurface)
    assert.match(result.errors.join('\n'), /sensitive|unsupported/i, formOwnedSurface)
  }

  const referencedAlternative = validate(`<span id="safe-name">Your name</span><img id="unsafe-alt" alt="Medical history">${standard.replace('name="name"', 'id="name-field" name="name" aria-labelledby="safe-name unsafe-alt"')}`)
  assert.equal(referencedAlternative.pass, false)
  assert.match(referencedAlternative.errors.join('\n'), /accessible prompt solicits sensitive|canonical nested label/i)
})

test('upload boundary audits SVG, shadow DOM, fabricated ratings, and every DOM ID', () => {
  const fields = [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }]
  const validate = (body, options = {}) => validateUploadContract(
    { 'index.html': `<main><h1>{{BUSINESS_NAME}}</h1>${body}<a href="mailto:{{EMAIL}}">Email</a></main>` },
    fields,
    options,
  )
  for (const markup of [
    '<svg><title>Jane Doe · Client reviews · $99</title></svg>',
    '<svg><text>Sessions support your immune system.</text></svg>',
    '<svg><foreignObject><div>care@example.com</div></foreignObject></svg>',
    '<template shadowrootmode="open"><p>Jane Doe · $99</p></template>',
    '<p>Rated 5.0 by local clients</p>',
    '<p>Rated five stars by local clients</p>',
    '<p>Five stars from our clients</p>',
    '<p>Rated four point nine by clients</p>',
    '<p>4.9-star rating</p>',
    '<p>5-star client rating</p>',
    '<p>Rated ★ ★ ★ ★ ★</p>',
    '<p>★★★★★</p>',
    '<p>95% would recommend us</p>',
    '<p>Loved by 1,000 customers</p>',
    '<p>Serving 500 clients since 2020</p>',
    '<p>Balance hormones.</p>',
    '<p>Sessions can balance hormones.</p>',
    '<p>Call (212)867-5309</p>',
    '<p>Call 2128675309</p>',
    '<p>Call +44 20 7946 0958</p>',
    '<blockquote>“Working with this practice transformed my life.”</blockquote><cite>Sarah M., client</cite>',
    '<figure><blockquote>“I finally feel like myself again.”</blockquote><figcaption>— Sarah M.</figcaption></figure>',
    '<q>I highly recommend this practice.</q><span>— Taylor, client</span>',
    '<svg><image href="https://evil.invalid/tracker.png"></image></svg>',
    '<svg><use href="https://evil.invalid/sprite.svg#x"></use></svg>',
  ]) {
    const result = validate(markup, { requireStandardInquiryForms: false })
    assert.equal(result.pass, false, markup)
  }
  const inert = validate('<!-- Jane Doe --><script type="application/json">"care@example.com"</script><template><p>Jane Doe · $99</p></template>', { requireStandardInquiryForms: false })
  assert.equal(inert.pass, true, inert.errors.join('\n'))

  for (const safeMarkup of [
    '<p>This blend uses 95% pure essential oil.</p>',
    '<p>Serving the community since 2020.</p>',
    '<p>Order reference 2128675309 is available in your confirmation.</p>',
    '<blockquote>Appointments are subject to the cancellation policy.</blockquote>',
    '<figure><blockquote>General education supports informed decisions.</blockquote><figcaption>Mindful Living Magazine</figcaption></figure>',
    '<div class="list"><span>Digestive balance</span><span>Hormones &amp; inflammation</span></div>',
    '<svg><defs><path id="wave" d="M0 0h10"></path></defs><use href="#wave"></use></svg>',
  ]) {
    const result = validate(safeMarkup, { requireStandardInquiryForms: false })
    assert.equal(result.pass, true, `${safeMarkup}\n${result.errors.join('\n')}`)
  }

  const duplicate = validate('<div id="same">One</div><div id="same">Two</div>', { requireStandardInquiryForms: false })
  assert.match(duplicate.errors.join('\n'), /duplicate DOM IDs/i)

  const unsafeSvg = validate('<img src="assets/profile.svg" alt="Information">', {
    requireStandardInquiryForms: false,
    svgAssets: { 'assets/profile.svg': '<svg><title>Sessions support your immune system · Client reviews · $99</title><text>Jane Doe · care@example.com</text><script>alert(1)</script></svg>' },
  })
  assert.equal(unsafeSvg.pass, false)
  assert.match(unsafeSvg.errors.join('\n'), /assets\/profile\.svg/)

  for (const svg of [
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.invalid/tracker.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><use href="//evil.invalid/sprite.svg#x"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="mailto:tracker@evil.invalid"><text>Learn more</text></a></svg>',
  ]) {
    const remote = validate('<img src="assets/graphic.svg" alt="Information">', {
      requireStandardInquiryForms: false,
      svgAssets: { 'assets/graphic.svg': svg },
    })
    assert.equal(remote.pass, false, svg)
    assert.match(remote.errors.join('\n'), /unsafe embedded URL|external contact or destination/i, svg)
  }
})

test('upload boundary validates decoded generated text in emitted stylesheets', () => {
  const pages = {
    'index.html': '<main><h1>{{BUSINESS_NAME}}</h1><span class="hero" data-tip="$99">Information</span><a href="mailto:{{EMAIL}}">Email</a></main>',
  }
  const fields = [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }]
  for (const css of [
    '.hero::before{content:"Sessions support your immune system · Client reviews · $99"}',
    '.hero::before{content:"Jane Doe · hello@example.com · (555) 555-0123"}',
    String.raw`.hero::before{content:"\53 essions support your immune system · rev\69 ews · \24 99"}`,
    '.hero{--copy:"$99"}.hero::before{content:var(--copy)}',
    '.hero::before{content:counter(step) " Client reviews"}',
    '.hero{counter-reset:price 99}.hero::before{content:"$" counter(price)}',
    '.hero{quotes:"Client reviews" ""}.hero::before{content:open-quote}',
    String.raw`.hero::before{c\6f ntent:"\24 99"}`,
    String.raw`.hero{--\78 :"\24 99"}.hero::before{content:v\61 r(--x)}`,
    ':root{--last:"Doe"}.hero::before{content:"Jane " var(--last)}',
    ':root{--amount:"99"}.hero::before{content:"$" var(--amount)}',
    ':root{--tail:" your immune system"}.hero::before{content:"Sessions support" var(--tail)}',
    ':root{--tail:" reviews"}.hero::before{content:"Client" var(--tail)}',
    ':root{--tail:"@example.com"}.hero::before{content:"hello" var(--tail)}',
    ':root{--q:open-quote;quotes:"Jane Doe" ""}.hero::before{content:var(--q)}',
    ':root{--q:"Jane Doe" "";quotes:var(--q)}.hero::before{content:open-quote}',
    ':root{--é:"Jane Doe"}.hero::before{content:var(--é)}',
    '.hero::before{content:var(--defined-in-another-stylesheet)}',
  ]) {
    const result = validateUploadContract(pages, fields, { styles: { 'styles.css': css } })
    assert.equal(result.pass, false, css)
    assert.match(result.errors.join('\n'), /unsafe generated CSS content/i, css)
  }

  const promotedAttribute = validateUploadContract(pages, fields, {
    styles: { 'styles.css': '.hero::before{content:attr(data-tip)}' },
  })
  assert.equal(promotedAttribute.pass, false)
  assert.match(promotedAttribute.errors.join('\n'), /hard-coded offer price/i)

  for (const css of [
    String.raw`.hero::before{content:a\74 tr(data-tip)}`,
    String.raw`.hero::before{content:attr(data-t\69 p)}`,
  ]) {
    const escapedAttribute = validateUploadContract(pages, fields, { styles: { 'styles.css': css } })
    assert.equal(escapedAttribute.pass, false, css)
    assert.match(escapedAttribute.errors.join('\n'), /hard-coded offer price/i, css)
  }

  const inlineStyle = validateUploadContract({
    'index.html': '<main><style>.hero::before{content:"$99 · Client reviews · Sessions support your immune system"}</style><h1 class="hero">{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Email</a></main>',
  }, fields)
  assert.equal(inlineStyle.pass, false)
  assert.match(inlineStyle.errors.join('\n'), /unsafe generated CSS content/i)

  const decorative = validateUploadContract(pages, fields, {
    styles: { 'styles.css': '@media(max-width:40rem){.hero::before{content:"•"}}.step::before{content:counter(step)}@keyframes fade{from{opacity:0}to{opacity:1}}' },
  })
  assert.equal(decorative.pass, true, decorative.errors.join('\n'))

  const unsupportedCssToken = validateUploadContract(pages, fields, {
    styles: { 'styles.css': '.hero{background-image:url("{{IMAGE_URL}}")}.hero::before{content:"{{PRACTITIONER_NAME}}"}' },
  })
  assert.match(unsupportedCssToken.errors.join('\n'), /unsupported CSS template expression/i)
})

test('upload proof checks distinguish operational review controls from evidence claims', () => {
  const fields = [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }]
  for (const claim of [
    '<div data-tip="Community-reviewed outcomes">Community Rated</div>',
    '<div data-tooltip="Teachers and facilitators reviewed by peers">Practitioner Network</div>',
    '<div data-tooltip="Teachers and facilitators reviewed&#32;by&#32;peers">Practitioner Network</div>',
    '<div class="client-review">Generated reflection</div>',
    '<h2 data-x=">">Quick stats</h2>',
  ]) {
    const result = validateUploadContract(
      {
        'index.html': `<main><h1>{{BUSINESS_NAME}}</h1>${claim}<a href="mailto:{{EMAIL}}">Email</a></main>`,
      },
      fields,
    )
    assert.equal(result.pass, false, claim)
    assert.match(result.errors.join('\n'), /testimonial|credential/i, claim)
  }

  const operational = validateUploadContract(
    {
      'index.html': '<main><h1>{{BUSINESS_NAME}}</h1><button type="button" id="planPreview" data-val="Lab Review">Lab Review</button><a href="mailto:{{EMAIL}}">Email</a></main>',
    },
    fields,
  )
  assert.equal(operational.pass, true, operational.errors.join('\n'))

  const encodedOutcome = validateUploadContract(
    {
      'index.html': '<main><h1>{{BUSINESS_NAME}}</h1><p>Sessions support&#32;your&#32;immune&#32;system.</p><a href="mailto:{{EMAIL}}">Email</a></main>',
    },
    fields,
  )
  assert.equal(encodedOutcome.pass, false)
  assert.match(encodedOutcome.errors.join('\n'), /unsupported outcome claim/i)

  const encodedAttributeOutcome = validateUploadContract(
    {
      'index.html': '<main><h1>{{BUSINESS_NAME}}</h1><div aria-label="Sessions support&#32;your&#32;immune&#32;system">Information</div><a href="mailto:{{EMAIL}}">Email</a></main>',
    },
    fields,
  )
  assert.equal(encodedAttributeOutcome.pass, false)
  assert.match(encodedAttributeOutcome.errors.join('\n'), /unsupported outcome claim/i)
})

test('upload price checks preserve structural identifiers but reject displayed price controls', () => {
  const fields = [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }]
  const structural = validateUploadContract(
    {
      'index.html': '<main><h1>{{BUSINESS_NAME}}</h1><button type="button" aria-controls="plan-$12">First</button><div id="plan-$12" class="offer-$12" data-target="#plan-$12">Ask about pricing.</div><a href="mailto:{{EMAIL}}">Email</a></main>',
    },
    fields,
  )
  assert.equal(structural.pass, true, structural.errors.join('\n'))

  const displayed = validateUploadContract(
    {
      'index.html': '<main><h1>{{BUSINESS_NAME}}</h1><div aria-description="$12/mo" aria-placeholder="$18/mo" aria-valuetext="$20/mo" data-price-annual="$120/yr" label="$15 plan">$12–20 per session; 12–20 USD; $12k package.</div><a href="mailto:{{EMAIL}}">Email</a></main>',
    },
    fields,
  )
  assert.equal(displayed.pass, false)
  assert.match(displayed.errors.join('\n'), /hard-coded offer price/i)
})

test('upload external destination checks parse attributes containing quoted angle brackets', () => {
  const result = validateUploadContract(
    {
      'index.html': '<main><h1>{{BUSINESS_NAME}}</h1><a data-x=">" href="https://evil.example/path">Visit</a><a href="mailto:{{EMAIL}}">Email</a></main>',
    },
    [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }],
  )
  assert.equal(result.pass, false)
  assert.match(result.errors.join('\n'), /hard-coded external contact or destination link/i)
})

test('launch catalog requires the exact contracted legacy inventory in every promised niche', () => {
  const complete = validateLaunchCatalogManifest(completeLaunchManifest())
  assert.equal(complete.pass, true, complete.errors.join('\n'))
  assert.equal(complete.totalTemplates, 60)

  const partial = completeLaunchManifest()
  partial.aromatherapy.pop()
  const result = validateLaunchCatalogManifest(partial)
  assert.equal(result.pass, false)
  assert.match(result.errors.join('\n'), /aromatherapy: expected 12, found 11/i)
  assert.match(result.errors.join('\n'), /total: expected 60, found 59/i)
})

test('launch catalog rejects unexpected niches even when the required counts are present', () => {
  const manifest = completeLaunchManifest()
  manifest.unexpected = []

  const result = validateLaunchCatalogManifest(manifest)
  assert.equal(result.pass, false)
  assert.match(result.errors.join('\n'), /unexpected launch niche/i)
})

test('launch catalog rejects a superficially passed v3 entry with missing composition metadata', () => {
  const manifest = completeLaunchManifest()
  manifest.aromatherapy[0] = v3ManifestEntry('aromatherapy', 'incomplete', {
    qualityReceipt: undefined,
  })

  const result = validateLaunchCatalogManifest(manifest)
  assert.equal(result.pass, false)
  assert.match(result.errors.join('\n'), /launch validation stamp is missing or malformed/)
})

test('launch catalog rejects an alternate valid-looking 60 and a one-byte artifact mutation', () => {
  const alternate = completeLaunchManifest()
  alternate.aromatherapy[0].slug = 'another-valid-looking-template'
  let result = validateLaunchCatalogManifest(alternate)
  assert.equal(result.pass, false)
  assert.match(result.errors.join('\n'), /not in the approved launch receipt/i)

  const mutated = completeLaunchManifest()
  const originalSha = mutated.sound_bath[3].artifactSha256
  mutated.sound_bath[3].artifactSha256 = `${originalSha.slice(0, -1)}${originalSha.endsWith('0') ? '1' : '0'}`
  result = validateLaunchCatalogManifest(mutated)
  assert.equal(result.pass, false)
  assert.match(result.errors.join('\n'), /artifact SHA-256 differs/i)
})

test('release manifest points only to immutable catalog-digest keys', () => {
  const released = buildReleaseManifest(completeLaunchManifest())
  for (const [niche, templates] of Object.entries(released)) {
    for (const template of templates) {
      assert.equal(template.sourceDir, `${niche}/${template.slug}`)
      assert.match(template.dir, new RegExp(`^_releases/[a-f0-9]{64}/${niche}/${template.slug}$`))
    }
  }
  assert.equal(validateLaunchCatalogManifest(released).pass, true)
  const first = released.aromatherapy[0]
  assert.deepEqual(
    uploadMetadataForFile(
      `${first.sourceDir}/index.html`,
      'f'.repeat(64),
      released,
    ),
    {
      sha256: 'f'.repeat(64),
      contractVersion: 2,
      catalogReportSha256: LAUNCH_CATALOG_CONTRACT.curatedReportSha256,
    },
  )
})

test('published manifest readback must exactly match the validated publish plan', () => {
  const expected = completeLaunchManifest()
  const exactReadback = JSON.parse(JSON.stringify(expected))
  assert.equal(verifyPublishedManifest(expected, exactReadback).pass, true)

  exactReadback.wellness_coach[0].name = 'Unexpected remote mutation'
  const changed = verifyPublishedManifest(expected, exactReadback)
  assert.equal(changed.pass, false)
  assert.match(changed.errors.join('\n'), /readback content differs/i)
})
