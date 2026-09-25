import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { preserveOriginalMainStyles } from './primary-main-styles.js';

test('rewrites real main tag nodes while preserving quoted attributes, declarations and namespaces', () => {
  const source = 'main,MAIN.card,body > main:not(.muted),:is(main,section),[data-label="main > main"]{--label:"main";color:red}svg|main{fill:blue}';
  const result = preserveOriginalMainStyles(source);
  assert.equal(result.count, 4);
  assert.match(result.css, /:is\(main,:where\(\[data-dc-original-main\]\)\)/);
  assert.ok(result.css.includes('[data-label="main > main"]'));
  assert.ok(result.css.includes('--label:"main"'));
  assert.ok(result.css.includes('svg|main{fill:blue}'));
  assert.deepEqual(preserveOriginalMainStyles(result.css), { css: result.css, count: 0 });
});

test('keeps unsupported selectors and unrelated stylesheet bytes unchanged', () => {
  for (const source of ['[data-label="main"]{color:red}', 'main[broken{color:red}', '.main{color:red}']) {
    assert.deepEqual(preserveOriginalMainStyles(source), { css: source, count: 0 });
  }
});

test('demoted main retains authored layout, child styling and type specificity in the browser', async () => {
  const source = 'body{margin:0}main{padding:40px;background:rgb(17,34,51);color:white}main p{margin:9px;font-size:21px}main.card{border:3px solid red}.card{background:rgb(51,68,85)}[data-label="main > main"]{font-weight:700}';
  const original = '<main id="first"><h1>Primary</h1></main><main class="card" id="second" data-label="main > main"><p>Other content</p></main>';
  const demoted = original.replace('<main class="card"', '<div data-dc-original-main class="card"').replace('<p>Other content</p></main>', '<p>Other content</p></div>');
  const repaired = preserveOriginalMainStyles(source);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const inspect = async (html: string, css: string) => {
        await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`);
        return page.evaluate(() => {
          const container = document.querySelector('#second')!;
          const child = container.querySelector('p')!;
          const style = getComputedStyle(container), text = getComputedStyle(child);
          const rect = container.getBoundingClientRect();
          return { rect: [rect.x, rect.y, rect.width, rect.height], padding: style.padding, color: style.color, background: style.backgroundColor, border: style.border, weight: style.fontWeight, fontSize: text.fontSize, margin: text.margin };
        });
      };
      const before = await inspect(original, source);
      assert.deepEqual(await inspect(demoted, repaired.css), before, `width=${width}`);
      assert.equal(await page.locator('main').count(), 1);
    }
    await page.close();
  } finally { await browser.close(); }
});
