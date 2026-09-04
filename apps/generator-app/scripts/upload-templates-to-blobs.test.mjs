import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  LAUNCH_CATALOG_CONTRACT,
  REHAB_STAGING_ACTIVE_KEY,
  REHAB_STAGING_CATALOG_CONTRACT,
  REHAB_STAGING_STORE_NAME,
  assertRehabStagingUploadEnvironment,
  hasMatchingUploadMetadata,
  main,
  manifestDigest,
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
  return Object.fromEntries(
    Object.entries(LAUNCH_CATALOG_CONTRACT.templatesByNiche).map(([niche, count]) => [
      niche,
      Array.from({ length: count }, (_, index) => ({
        dir: `${niche}/template-${String(index + 1).padStart(2, '0')}`,
        name: `Template ${index + 1}`,
        editable: true,
        validation: { status: 'passed', contractVersion: 2, tokens: ['BUSINESS_NAME'] },
      })),
    ]),
  )
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
  const stamp = { status: 'passed', contractVersion: 2, tokens: ['BUSINESS_NAME', 'EMAIL'] }
  const remote = {
    aromatherapy: [
      { dir: 'aromatherapy/old', name: 'Old', editable: true, validation: stamp },
      { dir: 'aromatherapy/legacy', name: 'Legacy' },
    ],
    sound_bath: [{ dir: 'sound_bath/kept', name: 'Kept', editable: true, validation: stamp }],
  }
  const local = {
    aromatherapy: [{ dir: 'aromatherapy/old', name: 'New', editable: true, validation: stamp }],
    sound_bath: [],
  }
  const merged = mergeValidatedManifest(
    remote,
    local,
    ['aromatherapy/old'],
    ['aromatherapy', 'sound_bath'],
  )
  assert.deepEqual(merged.aromatherapy.map((entry) => entry.name), ['New'])
  assert.deepEqual(merged.sound_bath.map((entry) => entry.name), ['Kept'])
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
    { sha256, contractVersion: 2 },
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
      /failed launch catalog integrity/,
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
  assert.match(result.errors.join('\n'), /template validation stamp is missing or malformed/)
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
