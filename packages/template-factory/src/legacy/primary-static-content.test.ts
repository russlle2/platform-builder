import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { chromium } from '@playwright/test';
import { restoreMalformedMediaRules, restoreScriptDependentContent } from './primary-static-content.js';

test('existing reveal and accordion restoration remains direct, scoped and idempotent', () => {
  const root = postcss.parse('.reveal{opacity:0;transform:translateY(10px)}.acc-body,.faq-answer{display:none;max-height:0;overflow:hidden}.section{opacity:0;transform:translateY(12px);transition:opacity .3s}.section.revealed{opacity:1;transform:none}');
  assert.equal(restoreScriptDependentContent(root), 3);
  assert.match(root.toString(), /\.reveal\{opacity:1;transform:none\}/);
  assert.match(root.toString(), /\.acc-body,\.faq-answer\{display:block;max-height:none;overflow:visible\}/);
  assert.equal(restoreScriptDependentContent(root), 0);
});

const accordionFixtures = [
  { css: '.acc-content{max-height:0;overflow:hidden;padding:0 14px;transition:max-height 260ms ease}', selector: '.acc-content', markup: '<div class="acc-content"><p>Clinical notes remain private.</p></div>' },
  { css: '.acc-detail{max-height:0;overflow:hidden;transition:max-height .28s ease}.acc-item.open .acc-detail{max-height:400px;padding-top:10px}', selector: '.acc-detail', markup: '<div class="acc-item"><div class="acc-detail"><p>Appointment boundaries.</p></div></div>' },
  { css: '.acc-detail{max-height:0;overflow:hidden;transition:max-height .28s ease}.acc-detail.open{max-height:420px}', selector: '.acc-detail', markup: '<div class="acc-detail"><p>Scope of services.</p></div>' },
  { css: '.panel{max-height:0;overflow:hidden;transition:max-height 300ms ease;padding:0 12px}.panel.open{padding:12px;max-height:420px}', selector: '.panel', markup: '<div class="accordion"><div class="panel"><p>Privacy practices.</p></div></div>' },
  { css: '.accordion .a{max-height:0;overflow:hidden;transition:all .28s ease}.accordion .item.open .a{padding:12px;max-height:260px}', selector: '.a', markup: '<div class="accordion"><div class="item"><div class="a"><p>What to expect.</p></div></div></div>' },
  { css: '.answer{max-height:0;overflow:hidden;transition:all .28s ease}.open .answer{max-height:220px}', selector: '.answer', markup: '<div class="qa"><div class="answer"><p>Comfortable layers.</p></div></div>' },
  { css: '.answer{max-height:0;overflow:hidden;transition:max-height 420ms ease}.answer.open{padding-top:10px;max-height:400px}', selector: '.answer', markup: '<div class="faq"><div class="answer"><p>Arrival information.</p></div></div>' },
];

test('repairs exact content/detail and evidenced general accordion families while preserving open rules', () => {
  for (const fixture of accordionFixtures) {
    const root = postcss.parse(fixture.css);
    const openRules = root.nodes.slice(1).map(node => node.toString());
    assert.equal(restoreScriptDependentContent(root), 1, fixture.css);
    assert.match(root.first!.toString(), /max-height:none;overflow:visible/);
    assert.deepEqual(root.nodes.slice(1).map(node => node.toString()), openRules);
    assert.equal(restoreScriptDependentContent(root), 0);
  }
});

test('general class names require complete matched collapse and activation evidence', () => {
  for (const css of [
    '.panel{max-height:0;overflow:hidden;transition:max-height .3s}',
    '.panel{display:none}.panel.open{max-height:420px}',
    '.panel{max-height:0;transition:max-height .3s}.panel.open{max-height:420px}',
    '.panel{max-height:0;overflow:hidden}.panel.open{max-height:420px}',
    '.panel{max-height:0;overflow:hidden;transition:max-height .3s}.modal .panel.open{max-height:420px}',
    '.panel{max-height:0;overflow:hidden;transition:max-height .3s;display:none}.panel.open{max-height:420px}',
    '.answer{max-height:0;overflow:hidden;transition:max-height .3s;opacity:0}.answer.open{max-height:420px}',
    '.panel{max-height:0;overflow:hidden;transition:max-height .3s}@media(max-width:600px){.panel.open{max-height:420px}}',
    '.answer{max-height:0;overflow:hidden;transition:all .3s}.open .answer{max-height:0}',
    '.a{max-height:0;overflow:hidden;transition:all .3s}.item.open .a{max-height:260px}',
    '.accordion .a,.modal{max-height:0;overflow:hidden;transition:all .3s}.accordion .item.open .a{max-height:260px}',
  ]) {
    const root = postcss.parse(css);
    assert.equal(restoreScriptDependentContent(root), 0, css);
    assert.equal(root.toString(), css);
  }
});

test('preserves native disclosures, nested state, modal and qualified selectors', () => {
  for (const css of [
    'details:not([open]) .acc-content{display:none;max-height:0;overflow:hidden}',
    '.modal .acc-detail{display:none;max-height:0;overflow:hidden}',
    '.acc-content.closed{max-height:0;overflow:hidden}',
    '.closed{.acc-content{max-height:0;overflow:hidden}}',
    'details{.answer{max-height:0;overflow:hidden;transition:all .3s}.answer.open{max-height:400px}}',
    '.reveal.closed{opacity:0;transform:translateY(10px)}',
    '.section{opacity:0}',
  ]) {
    const root = postcss.parse(css);
    assert.equal(restoreScriptDependentContent(root), 0, css);
    assert.equal(root.toString(), css);
  }
});

test('recovers only the observed top-level stray-n width media rule with children intact', () => {
  const source = '.site-footer{padding:18px}n\n@media(max-width:800px){.hero-inner{flex-direction:column}.nav{display:none}}';
  const root = postcss.parse(source);
  const children = (root.last as postcss.Rule).nodes.map(node => node.toString());
  assert.equal(restoreMalformedMediaRules(root), 1);
  assert.equal(root.first!.toString(), '.site-footer{padding:18px}');
  assert.equal(root.last!.type, 'atrule');
  assert.equal((root.last as postcss.AtRule).name, 'media');
  assert.equal((root.last as postcss.AtRule).params, '(max-width:800px)');
  assert.deepEqual((root.last as postcss.AtRule).nodes!.map(node => node.toString()), children);
  assert.equal(restoreMalformedMediaRules(root), 0);
});

test('does not rewrite arbitrary identifiers, strings, valid media, nested or unsupported malformed rules', () => {
  for (const source of [
    '.hero{content:"n @media(max-width:800px)"}',
    'n{color:red}@media(max-width:800px){.hero{color:blue}}',
    'x @media(max-width:800px){.hero{color:red}}',
    '.card{n @media(max-width:800px){.hero{color:red}}}',
    '@supports(display:grid){n @media(max-width:800px){.hero{color:red}}}',
    'n @media(max-width:800px){color:red}',
    'n @supports(display:grid){.hero{color:red}}',
    'n @media print{.hero{color:red}}',
    'n @media(max-width:var(--size)){.hero{color:red}}',
  ]) {
    const root = postcss.parse(source);
    assert.equal(restoreMalformedMediaRules(root), 0, source);
    assert.equal(root.toString(), source);
  }
});

test('expanded static accordions expose their text while native details remain closed', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const fixture of accordionFixtures) {
        const root = postcss.parse(fixture.css);
        restoreScriptDependentContent(root);
        await page.setContent(`<style>body{font:16px Arial}p{margin:12px}*{transition:none!important}${fixture.css}</style>${fixture.markup}`);
        assert.equal(await page.locator(fixture.selector).evaluate(node => node.getBoundingClientRect().height), 0);
        await page.addStyleTag({ content: root.toString() });
        const paragraph = page.locator(`${fixture.selector} p`);
        assert.ok(await page.locator(fixture.selector).evaluate(node => node.getBoundingClientRect().height) > 0);
        assert.equal(await paragraph.evaluate(node => {
          const box = node.getBoundingClientRect();
          return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === node;
        }), true);
      }
      const native = postcss.parse('.acc-content{max-height:0;overflow:hidden}');
      restoreScriptDependentContent(native);
      await page.setContent(`<style>${native.toString()}</style><details><summary>Native disclosure</summary><div class="acc-content">Hidden until opened</div></details>`);
      assert.equal(await page.locator('details').getAttribute('open'), null);
      assert.equal(await page.locator('.acc-content').isVisible(), false);
      await page.locator('summary').click();
      assert.equal(await page.locator('.acc-content').isVisible(), true);
    }
    await page.close();
  } finally { await browser.close(); }
});

test('recovered media rule matches intended mobile layout and remains inactive on desktop', async () => {
  const malformed = '.hero-inner{display:flex;gap:28px}.site-footer{padding:18px}n\n@media(max-width:800px){.hero-inner{flex-direction:column}}';
  const root = postcss.parse(malformed);
  restoreMalformedMediaRules(root);
  const intended = malformed.replace('}n\n@media', '}\n@media');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const inspect = async (css: string) => {
        await page.setContent(`<style>${css}</style><div class="hero-inner"><p>Source text</p><aside>Source artwork</aside></div>`);
        return page.locator('.hero-inner').evaluate(node => ({ direction: getComputedStyle(node).flexDirection, children: [...node.children].map(child => { const box = child.getBoundingClientRect(); return [box.x, box.y, box.width, box.height]; }) }));
      };
      const before = await inspect(malformed);
      assert.equal(before.direction, 'row');
      const repaired = await inspect(root.toString());
      assert.equal(repaired.direction, width <= 800 ? 'column' : 'row');
      assert.deepEqual(repaired, await inspect(intended));
    }
    await page.close();
  } finally { await browser.close(); }
});
