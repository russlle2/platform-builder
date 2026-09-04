import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LAUNCH_CATALOG_CONTRACT,
  LAUNCH_CATALOG_APPROVED_RECEIPT,
  buildReleaseManifest,
  matchesOnlySelector,
  mergeValidatedManifest,
  normalizeOnlySelector,
  parseUploadArgs,
  validateLaunchCatalogManifest,
  validateUploadContract,
  verifyPublishedManifest,
} from './upload-templates-to-blobs.mjs'

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

test('launch catalog requires exactly 60 templates with 12 in every promised niche', () => {
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
