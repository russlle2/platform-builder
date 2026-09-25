import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { restoreDimensionlessSvgImageSizes } from './primary-svg-image-size.js';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><rect width="600" height="400" fill="navy"/></svg>';
const fixture = (image = '<img src="assets/hero.svg" alt="Original artwork">', extra = '') => ({
  pages: { 'index.html': `<!doctype html><html><head><title>SVG fixture</title><link rel="stylesheet" href="style.css"></head><body><section class="hero"><div class="copy"><h1>Original content</h1><p>Details</p></div><div class="art">${image}</div></section></body></html>` },
  styles: { 'style.css': `.hero{display:flex;gap:24px;align-items:center}.copy{flex:1}img{max-width:100%;height:auto}${extra}` },
  assets: { 'assets/hero.svg': svg },
});

test('restores intrinsic size only for dimensionless local SVGs in a shrink-to-fit flex wrapper', () => {
  const input = fixture();
  const assetBefore = JSON.stringify(input.assets);
  const cssBefore = JSON.stringify(input.styles);
  assert.equal(restoreDimensionlessSvgImageSizes(input.pages, input.assets, input.styles), 1);
  assert.match(input.pages['index.html'], /alt="Original artwork" width="300" height="200"/);
  assert.equal(JSON.stringify(input.assets), assetBefore);
  assert.equal(JSON.stringify(input.styles), cssBefore);
  const first = input.pages['index.html'];
  assert.equal(restoreDimensionlessSvgImageSizes(input.pages, input.assets, input.styles), 0);
  assert.equal(input.pages['index.html'], first);
});

test('preserves authored sizing, responsive image sources, non-flex layouts and content wrappers', () => {
  for (const [image, css] of [
    ['<img src="assets/hero.svg" width="48">', ''],
    ['<img src="assets/hero.svg" height="48">', ''],
    ['<img src="assets/hero.svg" srcset="assets/hero.svg 1x">', ''],
    ['<picture><img src="assets/hero.svg"></picture>', ''],
    ['<img src="assets/hero.svg"><figcaption>Artwork caption</figcaption>', ''],
    ['<img src="assets/hero.svg">Visible caption', ''],
    ['<img src="assets/hero.svg">', '.art{width:320px}'],
    ['<img src="assets/hero.svg">', '.art{flex-basis:320px}'],
    ['<img src="assets/hero.svg">', '.art{min-width:700px}'],
    ['<img src="assets/hero.svg">', '.art{max-width:700px}'],
    ['<img src="assets/hero.svg">', '.hero{flex-direction:column;align-items:normal}'],
    ['<img src="assets/hero.svg">', '.hero{flex-direction:column;align-items:stretch}'],
    ['<img src="assets/hero.svg">', '.hero{flex-direction:column}.art{align-self:stretch}'],
    ['<img src="assets/hero.svg">', 'img{width:80%}'],
    ['<img src="assets/hero.svg">', 'img{height:80px}'],
    ['<img src="assets/hero.svg">', '@media(max-width:600px){.hero{display:block}}'],
    ['<img src="assets/hero.svg">', '.hero{display:grid}'],
  ]) {
    const input = fixture(image, css);
    const before = JSON.stringify(input);
    assert.equal(restoreDimensionlessSvgImageSizes(input.pages, input.assets, input.styles), 0, `${image} ${css}`);
    assert.equal(JSON.stringify(input), before);
  }
});

test('conditional link, style and imported author sizing veto intrinsic hints', () => {
  for (const kind of ['link', 'style', 'import']) {
    const input = fixture();
    const styles: Record<string, string> = { ...input.styles, 'sizing.css': '.art{width:700px}' };
    if (kind === 'link') input.pages['index.html'] = input.pages['index.html'].replace('</head>', '<link rel="stylesheet" media="(min-width:800px)" href="sizing.css"></head>');
    if (kind === 'style') input.pages['index.html'] = input.pages['index.html'].replace('</head>', '<style media="print">.art{width:700px}</style></head>');
    if (kind === 'import') styles['style.css'] = '@import "sizing.css" (min-width:800px);' + styles['style.css'];
    const before = input.pages['index.html'];
    assert.equal(restoreDimensionlessSvgImageSizes(input.pages, input.assets, styles), 0, kind);
    assert.equal(input.pages['index.html'], before);
  }
});

test('preserves already visible SVG geometry in stretched columns and explicitly sized wrappers', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route('https://fixture.test/assets/hero.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
    for (const css of ['.hero{width:900px;flex-direction:column;align-items:stretch}', '.hero{width:900px}.art{min-width:700px}']) {
      const input = fixture(undefined, css);
      const load = async () => {
        await page.setContent(input.pages['index.html'].replace('<head>', '<head><base href="https://fixture.test/">').replace('<link rel="stylesheet" href="style.css">', `<style>${input.styles['style.css']}</style>`));
        await page.locator('img').evaluate(async img => { await (img as HTMLImageElement).decode(); });
        return page.locator('img').evaluate(img => ({ width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height }));
      };
      const before = await load();
      assert.ok(before.width >= 699.9, JSON.stringify(before));
      assert.equal(restoreDimensionlessSvgImageSizes(input.pages, input.assets, input.styles), 0);
      assert.deepEqual(await load(), before);
    }
  } finally { await browser.close(); }
});

test('rejects intrinsic SVG dimensions, invalid viewBoxes, external URLs and paths escaping the template', () => {
  for (const asset of [
    svg.replace('viewBox=', 'width="600" viewBox='),
    svg.replace('viewBox=', 'height="400" viewBox='),
    svg.replace('viewBox=', 'style="width:600px" viewBox='),
    svg.replace('</svg>', '<style>svg{width:600px}</style></svg>'),
    svg.replace('0 0 600 400', '0 0 0 400'),
    svg.replace('0 0 600 400', '0 0 -1 400'),
    svg.replace('0 0 600 400', '0 0 NaN 400'),
    svg.replace('0 0 600 400', '0 0 600'),
    svg.replace('0 0 600 400', '0 0 1e-300 1e300'),
  ]) {
    const input = fixture();
    input.assets['assets/hero.svg'] = asset;
    assert.equal(restoreDimensionlessSvgImageSizes(input.pages, input.assets, input.styles), 0, asset);
  }
  for (const source of ['https://example.com/hero.svg', '//example.com/hero.svg', 'data:image/svg+xml,abc', '#hero', '../../hero.svg', 'assets/%ZZ.svg']) {
    const input = fixture(`<img src="${source}">`);
    assert.equal(restoreDimensionlessSvgImageSizes(input.pages, input.assets, input.styles), 0, source);
  }
});

test('uses page-linked styles, imports and relative asset resolution, while preserving small authored viewBoxes', () => {
  const input = fixture();
  const pages = { 'nested/about.html': input.pages['index.html'].replace('href="style.css"', 'href="../css/entry.css"').replace('src="assets/hero.svg"', 'src="../assets/hero%20art.svg?v=1#view"') };
  const styles = { 'css/entry.css': '@import "layout.css";', 'css/layout.css': input.styles['style.css'], 'unlinked.css': '.hero{display:grid}.art{width:400px}' };
  const assets = { 'assets/hero art.svg': svg.replace('0 0 600 400', '-10, -20, 90, 60') };
  assert.equal(restoreDimensionlessSvgImageSizes(pages, assets, styles), 1);
  assert.match(pages['nested/about.html'], /width="90" height="60"/);
  const conditional = fixture();
  conditional.styles['style.css'] = '@media(max-width:600px){.hero{display:flex}}';
  assert.equal(restoreDimensionlessSvgImageSizes(conditional.pages, conditional.assets, conditional.styles), 0);
  const nested = fixture();
  nested.styles['style.css'] = '.unrelated{.hero{display:flex}}';
  assert.equal(restoreDimensionlessSvgImageSizes(nested.pages, nested.assets, nested.styles), 0);
});

test('compiler-owned mobile flex sizing does not veto a missing desktop intrinsic size', () => {
  const media = '@media(max-width:600px){.hero>*{flex:1 1 min(100%,18rem)!important;min-width:min(100%,18rem)!important}}';
  const generated = fixture(undefined, `/* dc-repair-mobile-content-flex-v7 */${media}`);
  assert.equal(restoreDimensionlessSvgImageSizes(generated.pages, generated.assets, generated.styles), 1);
  const authored = fixture(undefined, media);
  assert.equal(restoreDimensionlessSvgImageSizes(authored.pages, authored.assets, authored.styles), 0);
  const different = fixture(undefined, `/* dc-repair-mobile-content-flex-v7 */${media.replace('1 1 min(100%,18rem)', '1 1 50%')}`);
  assert.equal(restoreDimensionlessSvgImageSizes(different.pages, different.assets, different.styles), 0);
});

test('restored image remains visible, proportional, capped and physically editable at desktop and mobile sizes', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const input = fixture(undefined, '.hero{padding:24px}img{max-width:220px}@media(max-width:600px){.hero{flex-direction:column;align-items:flex-start}img{max-width:100%}}');
    await page.route('https://fixture.test/assets/hero.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
    const load = async () => {
      await page.setContent(input.pages['index.html'].replace('<head>', '<head><base href="https://fixture.test/">').replace('<link rel="stylesheet" href="style.css">', `<style>${input.styles['style.css']}</style>`));
      await page.locator('img').evaluate(async img => { await (img as HTMLImageElement).decode(); });
    };
    await page.setViewportSize({ width: 390, height: 800 });
    await load();
    assert.equal(await page.locator('img').evaluate(img => img.getBoundingClientRect().width), 0, 'fixture reproduces the collapsed authored layout');
    assert.equal(restoreDimensionlessSvgImageSizes(input.pages, input.assets, input.styles), 1);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await load();
      const size = await page.locator('img').evaluate(img => {
        const rect = img.getBoundingClientRect();
        return { width: rect.width, height: rect.height, reachable: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === img, src: img.getAttribute('src'), alt: img.getAttribute('alt') };
      });
      assert.ok(size.width > 0 && size.height > 0, JSON.stringify(size));
      assert.ok(Math.abs(size.width / size.height - 1.5) < .01, JSON.stringify(size));
      assert.ok(size.width <= (width > 600 ? 220 : 300), JSON.stringify(size));
      assert.equal(size.reachable, true);
      assert.equal(size.src, 'assets/hero.svg');
      assert.equal(size.alt, 'Original artwork');
      await page.locator('img').evaluate(img => { img.addEventListener('dblclick', () => img.setAttribute('alt', 'Edited artwork')); });
      await page.locator('img').dblclick();
      assert.equal(await page.locator('img').getAttribute('alt'), 'Edited artwork');
    }
  } finally { await browser.close(); }
});
