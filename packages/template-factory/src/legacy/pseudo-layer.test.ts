import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { chromium } from '@playwright/test';
import { makeDecorativePseudoLayersPointerTransparent } from './pseudo-layer.js';

const paint = 'content:"";position:fixed;inset:0;background:linear-gradient(45deg,rgba(90,100,120,.12),transparent);opacity:.12;mix-blend-mode:screen';

test('decorative body/hero before and after layers retain every visual declaration', () => {
  for (const selector of ['body::before', 'body::after', '.hero:before', '.hero:after']) {
    const original = `${selector}{${paint}}`;
    const root = postcss.parse(original);
    assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 1);
    assert.match(root.toString(), /pointer-events: ?none/);
    root.walkDecls('pointer-events', (declaration) => { declaration.remove(); });
    assert.equal(root.toString(), original);
  }
});

test('pseudo overlay repair is idempotent and does not disable non-pseudo selectors in shared rules', () => {
  const root = postcss.parse(`.interactive, .hero:before{${paint}}`);
  assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 1);
  const css = root.toString();
  assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 0);
  assert.equal(root.toString(), css);
  const first = root.first as postcss.Rule;
  assert.equal(first.nodes.some((node) => node.type === 'decl' && node.prop === 'pointer-events'), false);
  assert.equal((root.last as postcss.Rule).selector, '.hero:before');
});

test('authored generated text, virtual controls, and non-overlay geometry retain pointer behavior', () => {
  const fixtures = [
    `body::before{${paint};content:"Session booking"}`,
    `.hero::before{${paint};content:attr(data-label)}`,
    `.hero::before{${paint};content:var(--label)}`,
    `.hero::before{${paint};position:relative}`,
    `.hero::before{content:"";position:absolute;top:0;left:0;background:red}`,
    `a.card::after{${paint}}`,
    `.card[role="button"]::after{${paint}}`,
    `.card[tabindex]::after{${paint}}`,
    `.card:hover::after{${paint}}`,
    `.stretched-link::after{${paint}}`,
    `button::before{${paint}}`,
    `.hero::before{${paint};cursor:pointer}`,
    `.hero::before{${paint};pointer-events:auto!important}`,
    `.hero::before{${paint}}@media(min-width:800px){.hero:before{content:"A real label"}}`,
    `.hero::before{content:"Authored label"!important;${paint}}`,
  ];
  for (const css of fixtures) {
    const root = postcss.parse(css);
    assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 0, css);
    assert.equal(root.toString(), css);
  }
});

test('conditional decorative rules retain their media scope and explicit four-edge coverage', () => {
  const root = postcss.parse('@media(min-width:800px){.hero::before{content:\'\';position:absolute;top:0;right:0;bottom:0;left:0;background-image:url("pattern.svg")}}');
  assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 1);
  assert.equal(root.nodes.length, 1);
  assert.equal(root.first?.type, 'atrule');
  assert.match(root.first?.toString() ?? '', /pointer-events: ?none/);
});

test('a sanitized-away pattern remains decorative when its sizing and compositing remain', () => {
  const root = postcss.parse('body::before{content:"";position:fixed;inset:0;opacity:0.06;background-size:420px 420px;mix-blend-mode:screen}');
  assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 1);
  assert.match(root.toString(), /pointer-events: ?none/);
  assert.equal(makeDecorativePseudoLayersPointerTransparent(postcss.parse('body::before{content:"";position:fixed;inset:0}')), 0);
});

test('painted pseudo overlays stop intercepting real controls without any pixel change on desktop or mobile', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      try {
        for (const selector of ['body::before', 'body::after', '.hero:before', 'body:before']) {
          const source = selector === 'body:before'
            ? 'body:before{content:"";position:fixed;inset:0;opacity:0.06;background-size:420px 420px;mix-blend-mode:screen;z-index:10}'
            : `${selector}{${paint};z-index:10}`;
          const root = postcss.parse(source);
          makeDecorativePseudoLayersPointerTransparent(root);
          await page.mouse.move(0, 0);
          await page.setContent(`<!doctype html><html><head><style>body{margin:0;background:#fafafa;font-family:Arial}.hero{position:relative;min-height:300px;padding:40px}button{font:inherit;padding:20px} ${source}</style></head><body><main class="hero"><button id="booking">Booking details</button></main></body></html>`);
          const hitBefore = await page.locator('#booking').evaluate((element) => {
            const box = element.getBoundingClientRect();
            return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === element;
          });
          assert.equal(hitBefore, false, `${selector} must reproduce the blocked hit target`);
          const before = await page.screenshot();
          await page.addStyleTag({ content: root.toString() });
          const hitAfter = await page.locator('#booking').evaluate((element) => {
            const box = element.getBoundingClientRect();
            return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === element;
          });
          assert.equal(hitAfter, true, `${selector} must restore the button hit target`);
          const after = await page.screenshot();
          assert.deepEqual(after, before, `${selector} must preserve all rendered pixels`);
          await page.locator('#booking').click({ timeout: 1000 });
        }
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
