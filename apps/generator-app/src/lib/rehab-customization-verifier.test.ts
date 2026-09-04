import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseVerifyRehabCustomizationArgs,
  runVerifyRehabCustomizationCli,
} from '../../scripts/verify-rehab-customization'
import { verifyRehabCustomizationStaging } from './rehab-customization-verifier'

const temporaryRoots: string[] = []

const catalogueEntry = {
  legacySlug: 'good-template',
  designId: 'design_good',
  contentPresetId: 'content_good',
  themePresetId: 'theme_good',
  niche: 'wellness_coach',
  qualityReceipt: 'receipt_good',
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function createStaging(overrides?: {
  html?: string
  css?: string
  entries?: unknown[]
  images?: unknown[]
  tokens?: unknown[]
}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dc-rehab-verifier-'))
  temporaryRoots.push(root)
  const templateRoot = join(root, catalogueEntry.niche, catalogueEntry.legacySlug)
  await mkdir(join(templateRoot, '.dailyclarity'), { recursive: true })
  await mkdir(join(templateRoot, 'assets', 'css'), { recursive: true })
  await writeJson(join(root, '_catalog-v3.json'), {
    contractVersion: 3,
    sourceTemplates: 1,
    templates: [catalogueEntry],
  })
  await writeJson(join(templateRoot, 'template.json'), {
    contractVersion: 3,
    legacySlug: catalogueEntry.legacySlug,
    niche: catalogueEntry.niche,
    pages: ['index.html'],
    designId: catalogueEntry.designId,
    contentPresetId: catalogueEntry.contentPresetId,
    themePresetId: catalogueEntry.themePresetId,
    qualityReceipt: catalogueEntry.qualityReceipt,
  })
  await writeJson(join(templateRoot, '.dailyclarity', 'content-preset.json'), {
    id: catalogueEntry.contentPresetId,
    legacySlug: catalogueEntry.legacySlug,
    entries: overrides?.entries ?? [
      { nodeId: 'txt_heading', page: 'index.html', html: 'Welcome', text: 'Welcome' },
      { nodeId: 'txt_meta', page: 'index.html', html: 'A description', text: 'A description', attribute: 'content' },
      { nodeId: 'txt_title', page: 'index.html', html: 'Title', text: 'Title' },
      { nodeId: 'txt_option', page: 'index.html', html: 'First', text: 'First' },
      { nodeId: 'txt_caption', page: 'index.html', html: 'Caption', text: 'Caption' },
    ],
    images: overrides?.images ?? [
      { slotId: 'img_hero', page: 'index.html', kind: 'image', source: '/hero.webp', attribute: 'src' },
      {
        slotId: 'css_hero',
        page: 'index.html',
        kind: 'background',
        source: '/background.webp',
        stylesheet: 'assets/css/styles.css',
        selector: '.hero',
        attribute: 'css-url',
      },
      {
        slotId: 'source_responsive',
        page: 'index.html',
        kind: 'image',
        source: 'wide.webp 1x, wide-2x.webp 2x',
        attribute: 'srcset',
      },
    ],
    hash: 'content-hash',
  })
  await writeJson(join(templateRoot, '.dailyclarity', 'theme-preset.json'), {
    id: catalogueEntry.themePresetId,
    legacySlug: catalogueEntry.legacySlug,
    tokens: overrides?.tokens ?? [
      { id: 'color_bg_123456', kind: 'color', value: '#ffffff' },
      { id: 'font_body_123456', kind: 'font', value: 'Arial, sans-serif' },
    ],
    fontImports: [],
    hash: 'theme-hash',
  })
  await writeFile(join(templateRoot, 'index.html'), overrides?.html ?? [
    '<!doctype html><html><head>',
    '<title data-dc-edit-id="txt_title">Title</title>',
    '<meta content="A description" data-dc-edit-id="txt_meta" data-dc-edit-attribute="content">',
    '</head><body>',
    '<h1 data-dc-edit-id="txt_heading">Welcome</h1>',
    '<select><option data-dc-edit-id="txt_option">First</option></select>',
    '<table><caption data-dc-edit-id="txt_caption">Caption</caption></table>',
    '<picture><source data-dc-image-id="source_responsive" srcset="wide.webp 1x, wide-2x.webp 2x">',
    '<img data-dc-image-id="img_hero" src="/hero.webp" alt=""></picture>',
    '<section class="hero" data-dc-image-id="css_hero">Background</section>',
    '</body></html>',
  ].join(''), 'utf8')
  await writeFile(join(templateRoot, 'assets', 'css', 'styles.css'), overrides?.css ?? [
    ':root {',
    '  --dc-theme-color_bg_123456: #ffffff;',
    '  --dc-theme-font_body_123456: Arial, sans-serif;',
    '}',
    'body { background: var(--dc-theme-color_bg_123456); font-family: var(--dc-theme-font_body_123456); }',
  ].join('\n'), 'utf8')
  return root
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('verifyRehabCustomizationStaging', () => {
  it('proves ID-first text, attribute, image, persistence, deploy, and theme paths', async () => {
    const root = await createStaging()
    const result = await verifyRehabCustomizationStaging({ root, workers: 2 })

    expect(result).toMatchObject({
      pass: true,
      catalogTemplates: 1,
      scannedTemplates: 1,
      pages: 1,
      stylesheets: 1,
      contentEntries: 5,
      imageSlots: 3,
      themeTokens: 2,
      diagnosticCount: 0,
      diagnosticsTruncated: 0,
    })
    expect(result.diagnostics).toEqual([])
  })

  it('reports ambiguous IDs and non-HTML image slots', async () => {
    const root = await createStaging({
      html: '<html><body><p data-dc-edit-id="txt_heading">One</p><p data-dc-edit-id="txt_heading">Two</p></body></html>',
      entries: [{ nodeId: 'txt_heading', page: 'index.html', html: 'One', text: 'One' }],
      images: [{ slotId: 'css_hero', page: 'assets/css/styles.css', kind: 'background', source: '/hero.webp', attribute: 'css-url' }],
      css: [
        ':root { --dc-theme-font_weight_123456: 700; }',
        'h1 { font-weight: var(--dc-theme-font_weight_123456); }',
      ].join('\n'),
      tokens: [{ id: 'font_weight_123456', kind: 'font', value: '700' }],
    })
    const result = await verifyRehabCustomizationStaging({ root, maxDiagnostics: 100 })
    const codes = result.diagnostics.map((diagnostic) => diagnostic.code)

    expect(result.pass).toBe(false)
    expect(codes).toContain('content_target_ambiguous')
    expect(codes).toContain('image_page_not_customer_editable')
    expect(codes).not.toContain('theme_token_not_overridden')
  })

  it('preserves non-family compiler font tokens while mapping family tokens', async () => {
    const root = await createStaging({
      css: [
        ':root {',
        '  --dc-theme-font_weight_123456: 700;',
        '  --dc-theme-font_body_123456: Arial, sans-serif;',
        '}',
        'body { font-family: var(--dc-theme-font_body_123456); }',
        'h1 { font-weight: var(--dc-theme-font_weight_123456); }',
      ].join('\n'),
      tokens: [
        { id: 'font_weight_123456', kind: 'font', value: '700' },
        { id: 'font_body_123456', kind: 'font', value: 'Arial, sans-serif' },
      ],
    })
    const result = await verifyRehabCustomizationStaging({ root })

    expect(result.pass).toBe(true)
    expect(result.themeTokens).toBe(2)
    expect(result.diagnostics).toEqual([])
  })

  it('counts every failure while bounding returned diagnostics', async () => {
    const root = await createStaging({
      html: '<html><body></body></html>',
      entries: [
        { nodeId: 'missing_one', page: 'index.html', html: 'One', text: 'One' },
        { nodeId: 'missing_two', page: 'index.html', html: 'Two', text: 'Two' },
        { nodeId: 'missing_three', page: 'index.html', html: 'Three', text: 'Three' },
      ],
    })
    const result = await verifyRehabCustomizationStaging({ root, maxDiagnostics: 2 })

    expect(result.pass).toBe(false)
    expect(result.diagnostics).toHaveLength(2)
    expect(result.diagnosticCount).toBeGreaterThan(2)
    expect(result.diagnosticsTruncated).toBe(result.diagnosticCount - 2)
  })

  it('fails when a complete preset exceeds the actual persistence limits', async () => {
    const entries = Array.from({ length: 251 }, (_, index) => ({
      nodeId: `txt_${index}`,
      page: 'index.html',
      html: `Text ${index}`,
      text: `Text ${index}`,
    }))
    const html = `<html><body>${entries.map((entry) => `<p data-dc-edit-id="${entry.nodeId}">${entry.text}</p>`).join('')}</body></html>`
    const root = await createStaging({ entries, html })
    const result = await verifyRehabCustomizationStaging({ root })

    expect(result.pass).toBe(false)
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('inline_persistence_roundtrip_failed')
  })

  it('checks a near-limit page as one aggregate customer payload', async () => {
    const entries = Array.from({ length: 240 }, (_, index) => ({
      nodeId: `txt_${index}`,
      page: 'index.html',
      html: `Text ${index}`,
      text: `Text ${index}`,
    }))
    const images = Array.from({ length: 49 }, (_, index) => ({
      slotId: `img_${index}`,
      page: 'index.html',
      kind: 'image',
      source: `/image-${index}.webp`,
      attribute: 'src',
    }))
    const html = [
      '<html><body>',
      ...entries.map((entry) => `<p data-dc-edit-id="${entry.nodeId}">${entry.text}</p>`),
      ...images.map((image) => `<img data-dc-image-id="${image.slotId}" src="${image.source}" alt="">`),
      '</body></html>',
    ].join('')
    const root = await createStaging({ entries, images, html })
    const started = performance.now()
    const result = await verifyRehabCustomizationStaging({ root })

    expect(result.pass).toBe(true)
    expect(result.contentEntries).toBe(240)
    expect(result.imageSlots).toBe(49)
    expect(performance.now() - started).toBeLessThan(2_000)
  }, 5_000)
})

describe('verify-rehab-customization CLI', () => {
  it('requires an explicit staging root and validates numeric bounds', () => {
    expect(() => parseVerifyRehabCustomizationArgs([])).toThrow('--root is required')
    expect(() => parseVerifyRehabCustomizationArgs(['--root', '.', '--workers', '0'])).toThrow('--workers must be between 1 and 64')
    expect(parseVerifyRehabCustomizationArgs(['--help'])).toBeNull()
  })

  it('returns zero for a clean catalogue and one for a bounded gate failure', async () => {
    const cleanRoot = await createStaging()
    const failingRoot = await createStaging({
      html: '<html><body></body></html>',
      entries: [{ nodeId: 'missing', page: 'index.html', html: 'Missing', text: 'Missing' }],
    })
    const cleanOutput: string[] = []
    const failingOutput: string[] = []

    await expect(runVerifyRehabCustomizationCli(
      ['--root', cleanRoot, '--json'],
      { stdout: (value) => cleanOutput.push(value), stderr: (value) => cleanOutput.push(value) },
    )).resolves.toBe(0)
    await expect(runVerifyRehabCustomizationCli(
      ['--root', failingRoot, '--json', '--max-diagnostics', '1'],
      { stdout: (value) => failingOutput.push(value), stderr: (value) => failingOutput.push(value) },
    )).resolves.toBe(1)

    expect(JSON.parse(cleanOutput[0]!).pass).toBe(true)
    const failed = JSON.parse(failingOutput[0]!) as { pass: boolean; diagnostics: unknown[]; diagnosticsTruncated: number }
    expect(failed.pass).toBe(false)
    expect(failed.diagnostics).toHaveLength(1)
    expect(failed.diagnosticsTruncated).toBeGreaterThan(0)
  })

  it('returns two when the verifier cannot run', async () => {
    const errors: string[] = []
    await expect(runVerifyRehabCustomizationCli(
      ['--root', join(tmpdir(), 'dc-staging-that-does-not-exist')],
      { stdout: () => undefined, stderr: (value) => errors.push(value) },
    )).resolves.toBe(2)
    expect(errors[0]).toContain('Verification could not run')
  })
})
