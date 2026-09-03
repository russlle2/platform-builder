import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LAUNCH_CATALOG_CONTRACT,
  matchesOnlySelector,
  mergeValidatedManifest,
  normalizeOnlySelector,
  parseUploadArgs,
  validateLaunchCatalogManifest,
  validateUploadContract,
  verifyPublishedManifest,
} from './upload-templates-to-blobs.mjs'

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

test('published manifest readback must exactly match the validated publish plan', () => {
  const expected = completeLaunchManifest()
  const exactReadback = JSON.parse(JSON.stringify(expected))
  assert.equal(verifyPublishedManifest(expected, exactReadback).pass, true)

  exactReadback.wellness_coach[0].name = 'Unexpected remote mutation'
  const changed = verifyPublishedManifest(expected, exactReadback)
  assert.equal(changed.pass, false)
  assert.match(changed.errors.join('\n'), /readback content differs/i)
})
