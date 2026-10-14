import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { capContentPolygonClips } from './primary-content-clip.js';

const fixture = (body: string, css: string) => ({
  pages: { 'index.html': `<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body>${body}</body></html>` },
  styles: { 'style.css': css },
});
const top = 'polygon(0 0,100% 12%,100% 100%,0% 100%)';
const bottom = 'polygon(0 0,100% 0,100% 70%,0 100%)';

test('caps only the authored empty top or bottom padding while preserving stylesheet paint and geometry', () => {
  for (const [shape, expected] of [[top, 'min(12%,44px)'], [bottom, 'max(70%,calc(100% - 60px))']]) {
    const input = fixture('<div class="panel"><p>Customer content</p><a href="#next">Contact</a></div>', `.panel{position:relative;padding:44px 44px 60px;background:linear-gradient(red,blue);border-radius:16px;clip-path:${shape}}`);
    const css = input.styles['style.css'];
    assert.equal(capContentPolygonClips(input.pages, input.styles), 1);
    assert.equal(input.styles['style.css'], css);
    assert.ok(input.pages['index.html'].includes(expected!));
    const snapshot = JSON.stringify(input);
    assert.equal(capContentPolygonClips(input.pages, input.styles), 0);
    assert.equal(JSON.stringify(input), snapshot);
  }
});

test('an unpadded main uses only proven padding in its final in-flow block, excluding collapsing margins', () => {
  const input = fixture('<main><section><p>Earlier content</p></section><section class="panel"><a href="#next">Private sessions</a></section></main>', 'main{clip-path:polygon(0 0,100% 0,100% 92%,0 100%)}.panel{display:flex;flex-direction:column;padding:2.25rem 2.5rem;margin:1.25rem 2rem}');
  assert.equal(capContentPolygonClips(input.pages, input.styles), 1);
  assert.ok(input.pages['index.html'].includes('max(92%,calc(100% - 2.25rem))'));
});

test('multiple concrete shorthand paddings establish only their minimum safe inset', () => {
  const input = fixture('<section class="hero diag"><p>Customer content</p><a>Phone</a></section>', `.hero{padding:28px}.diag{padding:36px;clip-path:${bottom}}@keyframes unused{0%{transform:scale(.75)}100%{transform:scale(1.1)}}`);
  assert.equal(capContentPolygonClips(input.pages, input.styles), 1);
  assert.ok(input.pages['index.html'].includes('calc(100% - min(28px,36px))'));
});

test('ambiguous geometry, conditional padding, resets and unsafe descendant flow retain the original clipping', () => {
  const base = `.panel{padding:36px;clip-path:${bottom}}`;
  for (const [body, css] of [
    ['<div class="panel"><p>Content</p></div>', base + '@media(max-width:600px){.panel{padding:0}}'],
    ['<div class="panel"><p>Content</p></div>', base + '.panel{all:unset}'],
    ['<div class="panel"><p>Content</p></div>', base + '.panel{padding-bottom:20px}'],
    ['<div class="panel"><p>Content</p></div>', base + '.panel{padding-block:2rem}'],
    ['<div class="panel"><p>Content overflowing a short box</p></div>', base + '.panel{height:20px}'],
    ['<div class="panel"><p>Content overflowing a short box</p></div>', base + '.panel{max-height:20px}'],
    ['<div class="panel"><p style="height:20px">Content spilling from its descendant box</p></div>', base],
    ['<div class="panel"><p style="position:sticky;top:0">Sticky content</p></div>', base],
    ['<div class="panel"><p>Content</p></div>', base.replace('36px', 'var(--space)')],
    ['<div class="panel"><p>Content</p></div>', base.replace('36px', '10%')],
    ['<div class="panel"><p>Content</p></div>', base.replace('36px', '0')],
    ['<div class="panel"><p>Content</p></div>', base.replace(bottom, 'polygon(0 0,80% 20%,100% 70%,0 100%)')],
    ['<div class="panel"><a style="position:absolute;bottom:0">Contact</a></div>', base],
    ['<div class="panel"><p style="transform:translateY(30px)">Content</p></div>', base],
    ['<div class="panel"><p style="animation:expand 4s infinite">Content</p></div>', base],
    ['<div class="panel"><p style="margin-bottom:-30px">Content</p></div>', base],
    ['<main><section class="panel"><p>Content</p></section>Trailing content</main>', `main{clip-path:${bottom}}.panel{padding:36px}`],
    ['<main><section class="panel"><p>Content</p></section><footer>Later</footer></main>', `main{clip-path:${bottom}}.panel{padding:36px}`],
    ['<main><section class="panel"><p>Content</p></section></main>', `main{clip-path:${bottom}}.panel{padding:36px;height:20px}`],
  ]) {
    const input = fixture(body!, css!);
    const before = JSON.stringify(input);
    assert.equal(capContentPolygonClips(input.pages, input.styles), 0, `${body} ${css}`);
    assert.equal(JSON.stringify(input), before);
  }
});

test('conditional links and imports veto conflicting padding without affecting unrelated pages', () => {
  for (const mode of ['link', 'import', 'nested']) {
    const input = fixture('<div class="panel"><p>Content</p></div>', `.panel{padding:36px;clip-path:${bottom}}`);
    Object.assign(input.styles, { 'other.css': '.panel{padding:0}' });
    if (mode === 'link') input.pages['index.html'] = input.pages['index.html'].replace('</head>', '<link rel="stylesheet" media="print" href="other.css"></head>');
    else if (mode === 'import') input.styles['style.css'] = '@import "other.css" print;' + input.styles['style.css'];
    else input.styles['style.css'] += '.unused{.panel{padding:0}}';
    const before = JSON.stringify(input);
    assert.equal(capContentPolygonClips(input.pages, input.styles), 0, mode);
    assert.equal(JSON.stringify(input), before);
  }
  const input = fixture('<div class="panel"><p>Content</p></div>', `.panel{padding:36px;clip-path:${bottom}}`);
  Object.assign(input.styles, { 'unused.css': '.panel{padding:0}' });
  assert.equal(capContentPolygonClips(input.pages, input.styles), 1);
});

test('decorative positioned pseudo paint is retained while content clipping receives its padding cap', () => {
  const input = fixture('<div class="panel"><p>Content</p></div>', `.panel{padding:44px;clip-path:${top}}.panel::before{content:"";position:absolute;right:-120px;top:-60px;width:520px;height:520px;transform:rotate(18deg);background:radial-gradient(red,transparent)}`);
  const css = input.styles['style.css'];
  assert.equal(capContentPolygonClips(input.pages, input.styles), 1);
  assert.equal(input.styles['style.css'], css);
});

test('diagonal panels retain paint and layout while real links stay reachable at both widths after content grows', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      try {
        for (const mode of ['top', 'bottom', 'last-child']) {
          for (const length of [16, 32]) {
            const paragraphs = Array.from({ length }, (_, index) => `<p>Customer paragraph ${index} with descriptive information that wraps naturally.</p>`).join('');
            const link = '<a id="action" href="#destination">Contact the practice</a>';
            const content = mode === 'top' ? link + paragraphs : paragraphs + link;
            const body = mode === 'last-child' ? `<main id="panel">${paragraphs}<section class="last">${content}</section></main>` : `<section id="panel">${content}</section>`;
            const shape = mode === 'top' ? top : mode === 'bottom' ? bottom : 'polygon(0 0,100% 0,100% 92%,0 100%)';
            const source = `html{font-size:16px}body{margin:0;background:white;font:16px Arial}#panel{margin:20px;width:calc(100% - 40px);box-sizing:border-box;background:linear-gradient(120deg,#123456,#567890);color:white;clip-path:${shape};${mode === 'last-child' ? '' : 'padding:44px 36px 36px;'}}p{margin:0 0 28px;line-height:1.5}#action{display:block;margin-left:auto;width:140px;padding:8px;background:#def;color:#123}.last{padding:2.25rem 2.5rem;margin:1.25rem 0}`;
            const input = fixture(body, source);
            const load = () => page.setContent(input.pages['index.html'].replace('<link rel="stylesheet" href="style.css">', `<style>${input.styles['style.css']}</style>`));
            const geometry = () => page.locator('#panel').evaluate(element => {
              const box = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height, background: style.backgroundImage };
            });
            const hitsLink = async () => {
              await page.locator('#action').scrollIntoViewIfNeeded();
              return page.locator('#action').evaluate(element => {
                const box = element.getBoundingClientRect();
                return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === element;
              });
            };
            await load();
            const before = await geometry();
            assert.equal(await hitsLink(), false, `${mode} ${width} ${length} reproduces the clipped link`);
            assert.equal(capContentPolygonClips(input.pages, input.styles), 1);
            assert.equal(input.styles['style.css'], source);
            await load();
            assert.deepEqual(await geometry(), before, 'element geometry and all background paint are preserved');
            assert.equal(await hitsLink(), true, `${mode} ${width} ${length} restores the link`);
            assert.notEqual(await page.locator('#panel').evaluate(element => getComputedStyle(element).clipPath), 'none');
            await page.locator('#action').click({ timeout: 1000 });
            assert.ok(page.url().endsWith('#destination'));
          }
        }
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
