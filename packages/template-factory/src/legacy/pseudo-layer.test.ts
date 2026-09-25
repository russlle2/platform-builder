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
    assert.equal(root.first?.toString(), original);
    assert.equal(root.nodes.length, 2);
    assert.match((root.last as postcss.Rule).selector, /:where\(:not\(/);
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
  assert.match((root.last as postcss.Rule).selector, /^\.hero:where\(:not\(.*\)\):before$/);
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

const additionalDecorativeLayers = [
  '.hero::before{content:"";position:absolute;inset:0;opacity:.6;mix-blend-mode:multiply}',
  'body::before{content:"";position:fixed;inset:0;opacity:.09;background-repeat:repeat;mix-blend-mode:screen}',
  'body::after{content:"";position:fixed;right:-120px;bottom:-120px;width:420px;height:420px;opacity:.06;background-size:contain}',
  '.hero::after{content:"";position:absolute;right:-60px;bottom:-40px;width:260px;height:260px;background:linear-gradient(120deg,transparent,#daf1ee);transform:rotate(20deg);border-radius:20px}',
  '.hero::before{content:"";position:absolute;left:-20%;top:-30%;width:180%;height:140%;background:radial-gradient(circle at 20% 30%,#daf1ee,transparent 10%),linear-gradient(90deg,#f6e6fb,transparent);transform:rotate(-14deg)}',
  '.hero::before{content:"";position:absolute;right:-120px;top:-60px;width:360px;height:360px;background-size:cover;transform:rotate(18deg)}',
];

test('concrete corner/diagonal paint and full-inset blended patterns preserve their authored rendering', () => {
  for (const source of additionalDecorativeLayers) {
    const root = postcss.parse(source);
    assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 1, source);
    assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 0, source);
    assert.equal(root.first?.toString(), source);
    assert.equal(root.nodes.length, 2);
  }
});

test('extended overlay geometry does not broaden control, generated-text, or unspecified-surface repairs', () => {
  const source = additionalDecorativeLayers[3]!;
  for (const css of [
    source.replace('.hero', 'button'),
    source.replace('.hero', '.stretched-link'),
    source.replace('.hero', '[role="button"]'),
    source.replace('content:""', 'content:"Book now"'),
    source.replace('content:""', 'content:attr(data-caption)'),
    source.replace('width:260px', 'width:auto'),
    source.replace('height:260px', 'height:var(--height)'),
    source.replace('right:-60px;', ''),
    source.replace('bottom:-40px;', ''),
    source.replace('position:absolute', 'position:relative'),
    source.replace('border-radius:20px', 'cursor:pointer'),
    source.replace('border-radius:20px', 'pointer-events:auto'),
    'body::before{content:"";position:fixed;inset:0;opacity:.06}',
    'body::before{content:"";position:fixed;inset:0;mix-blend-mode:screen}',
    '.hero::before{content:"";position:fixed;right:0;bottom:0;width:420px;height:420px;opacity:.06}',
    `${source}@media(min-width:800px){.hero:after{content:"Authored caption"}}`,
  ]) {
    const root = postcss.parse(css);
    assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 0, css);
    assert.equal(root.toString(), css);
  }
});

test('stripped rotated corner artwork needs concrete geometry, image fitting, and a modest nonzero rotation', () => {
  const source = additionalDecorativeLayers[5]!;
  for (const css of [
    source.replace('rotate(18deg)', 'rotate(0deg)'),
    source.replace('rotate(18deg)', 'rotate(90deg)'),
    source.replace('rotate(18deg)', 'rotate(var(--angle))'),
    source.replace('rotate(18deg)', 'translateX(18px)'),
    source.replace('rotate(18deg)', 'rotate(18deg) scale(1.2)'),
    source.replace('background-size:cover;', ''),
    source.replace('background-size:cover', 'background-size:auto'),
    source.replace('width:360px', 'width:auto'),
    source.replace('right:-120px;', ''),
    source.replace('.hero', '.stretched-link'),
    source.replace('content:""', 'content:"Pricing"'),
    source.replace('transform:rotate(18deg)', 'transform:rotate(18deg);pointer-events:auto'),
  ]) {
    const root = postcss.parse(css);
    assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 0, css);
    assert.equal(root.toString(), css);
  }
});

test('only literal root corner surfaces qualify with stripped paint and opacity alone', () => {
  for (const selector of ['html::before', 'body::before', 'body:after']) {
    const source = `${selector}{content:"";position:fixed;left:0;top:0;width:160px;height:160px;opacity:.05}`;
    const root = postcss.parse(source);
    assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 1);
    assert.equal(root.first?.toString(), source);
    assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 0);
  }
  for (const selector of ['.hero::before', '.card::before', 'body .hero::before']) {
    const source = `${selector}{content:"";position:fixed;left:0;top:0;width:160px;height:160px;opacity:.05}`;
    const root = postcss.parse(source);
    assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 0);
    assert.equal(root.toString(), source);
  }
});

test('root corner patterns restore navigation access without changing pixels', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      try {
        for (const selector of ['html::before', 'body::before']) {
          const source = `${selector}{content:"";position:fixed;left:0;top:0;width:160px;height:160px;opacity:.05;z-index:10}`;
          const root = postcss.parse(source);
          makeDecorativePseudoLayersPointerTransparent(root);
          await page.setContent(`<!doctype html><html><head><style>body{margin:0;background:#fafafa}button{position:absolute;left:20px;top:20px;width:100px;height:60px}${source}</style></head><body><button id="navigation">Services</button></body></html>`);
          const hitsButton = () => page.locator('#navigation').evaluate((element) => document.elementFromPoint(70, 50) === element);
          assert.equal(await hitsButton(), false, source);
          const before = await page.screenshot();
          await page.addStyleTag({ content: root.toString() });
          assert.equal(await hitsButton(), true, source);
          assert.deepEqual(await page.screenshot(), before, source);
          await page.locator('#navigation').click({ timeout: 1000 });
        }
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});

test('class-only pseudo overrides preserve extended hit areas on interactive owners and their descendants', async () => {
  const browser = await chromium.launch({ headless: true });
  const owners = [
    { tag: 'a', attrs: 'href="#destination"' },
    { tag: 'button', attrs: 'type="button"' },
    { tag: 'div', attrs: 'role="button"' },
    { tag: 'div', attrs: 'tabindex="0"' },
    { tag: 'div', attrs: 'contenteditable="true"' },
  ];
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      try {
        for (const owner of owners) {
          for (const descendant of [false, true]) {
            const source = '.card::after{content:"";position:absolute;left:80px;top:0;width:60px;height:40px;background:rgba(20,50,90,.1)}';
            const root = postcss.parse(source);
            assert.equal(makeDecorativePseudoLayersPointerTransparent(root), 1);
            const markup = `<${owner.tag} id="interactive" ${owner.attrs}${descendant ? '' : ' class="card"'}>${descendant ? '<span class="card">Action</span>' : 'Action'}</${owner.tag}>`;
            await page.mouse.move(0, 0);
            await page.setContent(`<!doctype html><html><head><style>body{margin:0;background:white}.card{position:relative;display:block;width:60px;height:40px}#interactive{position:absolute;left:40px;top:40px;width:60px;height:40px;margin:0;padding:0;border:0}${source}</style></head><body>${markup}</body></html>`);
            await page.locator('#interactive').evaluate((element) => {
              element.addEventListener('click', (event) => {
                event.preventDefault();
                element.setAttribute('data-clicks', String(Number(element.getAttribute('data-clicks') ?? 0) + 1));
              });
            });
            const hitsExtendedArea = () => page.locator('#interactive').evaluate((element) => {
              const box = element.getBoundingClientRect();
              return 130 > box.right && document.elementFromPoint(130, 60)?.closest('#interactive') === element;
            });
            assert.equal(await hitsExtendedArea(), true, `${owner.tag} ${owner.attrs}, descendant=${descendant}`);
            const before = await page.screenshot();
            await page.addStyleTag({ content: root.toString() });
            assert.equal(await hitsExtendedArea(), true, 'the pseudo area beyond the control box remains interactive');
            assert.deepEqual(await page.screenshot(), before);
            await page.mouse.click(130, 60);
            assert.equal(await page.locator('#interactive').getAttribute('data-clicks'), '1');
          }
        }
        const cascade = postcss.parse('.card::after{content:"";position:absolute;inset:0;background:red}.card::after{pointer-events:auto}');
        makeDecorativePseudoLayersPointerTransparent(cascade);
        await page.setContent(`<style>${cascade.toString()}</style><div class="card">Decorative owner</div>`);
        assert.equal(await page.locator('.card').evaluate((element) => getComputedStyle(element, '::after').pointerEvents), 'auto', 'zero-specificity guard preserves later authored pointer behavior');
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});

test('corner, diagonal, and stripped blended overlays restore physical access without changing pixels', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      try {
        for (const source of additionalDecorativeLayers) {
          const root = postcss.parse(source);
          root.walkRules((rule) => { rule.append(postcss.decl({ prop: 'z-index', value: '10' })); });
          const original = root.toString();
          makeDecorativePseudoLayersPointerTransparent(root);
          await page.mouse.move(0, 0);
          const verticalPosition = source.includes('background-size:cover') ? 'top:40px' : 'bottom:40px';
          await page.setContent(`<!doctype html><html><head><style>body{margin:0;background:#fafafa;font-family:Arial}.hero{position:relative;height:100vh}button{position:absolute;right:40px;${verticalPosition};font:inherit;padding:20px}${original}</style></head><body><main class="hero"><button id="booking">Booking details</button></main></body></html>`);
          const hitsButton = () => page.locator('#booking').evaluate((element) => {
            const box = element.getBoundingClientRect();
            return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === element;
          });
          assert.equal(await hitsButton(), false, `${source} must reproduce the blocked hit target`);
          const before = await page.screenshot();
          await page.addStyleTag({ content: root.toString() });
          assert.equal(await hitsButton(), true, `${source} must restore the button hit target`);
          assert.deepEqual(await page.screenshot(), before, `${source} must preserve every rendered pixel`);
          await page.locator('#booking').click({ timeout: 1000 });
        }
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
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
