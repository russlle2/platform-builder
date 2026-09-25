import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { parse, serializeOuter, type DefaultTreeAdapterMap } from 'parse5';
import { repairLegacyTemplate } from './compose.js';
import { renderTemplateTasks } from './render.js';

function elementById(html: string, id: string): string {
  function find(node: DefaultTreeAdapterMap['node']): DefaultTreeAdapterMap['element'] | undefined {
    if ('attrs' in node && node.attrs.some((attr) => attr.name === 'id' && attr.value === id)) return node;
    if ('childNodes' in node) {
      for (const child of node.childNodes) {
        const found = find(child);
        if (found) return found;
      }
    }
    return undefined;
  }
  const node = find(parse(html));
  assert.ok(node, `Missing authored element ${id}`);
  return serializeOuter(node);
}

function repairFixture(content: string, css = '') {
  return repairLegacyTemplate({
    slug: 'skip-control', niche: 'wellness_coach',
    files: new Map<string, string | Uint8Array>([
      ['index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Practical coaching conversations</title><link rel="stylesheet" href="styles.css"></head><body>${content}</body></html>`],
      ['styles.css', ':root{--surface:#fff;--ink:#111;--accent:#17472f}body{margin:0;background:var(--surface);color:var(--ink);font:16px Arial,sans-serif}h1{color:#17472f}a{color:var(--accent)}header,main{width:min(60rem,92vw);margin:1rem auto}' + css],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Quiet Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
}

test('canonical skip controls retain authored link semantics without advertising nested text slots', () => {
  const controls = [
    '<a id="simple-skip" class="skip" href="#main">Skip to content</a>',
    '<a id="nested-skip" class="utility skip" href="#main"><span> Skip to </span><strong>main content</strong></a>',
    '<a id="spaced-skip" class="skip" href="#main"> Skip\n to\t MAIN content </a>',
    '<a id="legacy-skip" class="skip-link" href="#main">Go directly to the page content</a>',
  ];
  const repaired = repairFixture(controls.join('') + '<main id="main"><h1>Coaching conversations</h1><p>Choose a practical next step with the studio.</p></main>');
  const html = String(repaired.files.get('index.html'));
  for (const control of controls) {
    const id = control.match(/id="([^"]+)"/)![1]!;
    const retained = elementById(html, id);
    assert.equal(retained, control, 'The accessibility control and its children should remain intact.');
    assert.doesNotMatch(retained, /data-(?:dc|pb)-(?:edit|image)-id=/);
  }
  assert.match(elementById(html, 'main'), /data-dc-edit-id=/);
});

test('ordinary skip-class copy and calls to action remain editable', () => {
  const cases = [
    '<a id="ordinary-copy" class="skip" href="#main">Skip this section</a>',
    '<a id="ordinary-cta" class="skip" href="#main">Book a conversation</a>',
    '<a id="external-link" class="skip" href="https://example.com">Skip to content</a>',
    '<a id="email-link" class="skip" href="mailto:{{EMAIL}}">Skip to content</a>',
    '<a id="empty-fragment" class="skip" href="#">Skip to content</a>',
    '<a id="unrelated-class" class="skip-card" href="#main">Skip to content</a>',
    '<p id="ordinary-nonlink" class="skip">Skip to content</p>',
  ];
  const repaired = repairFixture(cases.join('') + '<main id="main"><h1>Coaching conversations</h1></main>');
  const html = String(repaired.files.get('index.html'));
  for (const source of cases) {
    const id = source.match(/id="([^"]+)"/)![1]!;
    assert.match(elementById(html, id), /data-dc-edit-id=/, `Ordinary copy ${id} lost its customer edit path.`);
  }
});

test('off-screen skip control stays keyboard-functional while customer copy passes both preview viewports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-skip-control-'));
  const templateDir = join(root, 'wellness_coach', 'skip-control');
  try {
    const skipCss = '.skip{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}.skip:focus{left:8px;top:8px;width:auto;height:auto}';
    const repaired = repairFixture('<a id="native-skip" class="skip" href="#main">Skip to content</a>'
      + '<header><nav><a href="index.html">Home</a><a href="mailto:{{EMAIL}}">Contact the studio</a></nav></header>'
      + '<main id="main" tabindex="-1"><h1>Practical coaching conversations</h1><p>This original introduction explains how individual coaching conversations create space to reflect on everyday priorities and choose a practical next step.</p>'
      + '<h2>Ask about the session</h2><p>Explore the session format and ask about current availability before deciding whether the studio is a useful fit for you.</p>'
      + '<a class="skip-card" href="mailto:{{EMAIL}}">Ask about current availability</a></main>', skipCss);
    const html = String(repaired.files.get('index.html'));
    assert.equal(elementById(html, 'native-skip'), '<a id="native-skip" class="skip" href="#main">Skip to content</a>');
    assert.ok(String(repaired.files.get('styles.css')).includes(skipCss));
    for (const [path, contents] of repaired.files) {
      const target = join(templateDir, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }
    const browser = await chromium.launch({ headless: true });
    try {
      for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
        const page = await browser.newPage({ viewport });
        await page.goto(pathToFileURL(join(templateDir, 'index.html')).href);
        assert.equal(await page.locator('#native-skip').evaluate((node) => node.getBoundingClientRect().x), -9999);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'native-skip');
        assert.equal(await page.locator('#native-skip').evaluate((node) => node.getBoundingClientRect().x), 8);
        await page.keyboard.press('Enter');
        await page.waitForURL(/#main$/);
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'main');
        await page.close();
      }
    } finally {
      await browser.close();
    }
    const evidence = await renderTemplateTasks(root, [{
      key: 'skip-control', niche: 'wellness_coach', slug: 'skip-control', page: 'index.html', templateDir,
    }], { evidenceRoot: join(root, 'evidence'), workers: 1, retries: 0 });
    assert.deepEqual(evidence.map((item) => item.viewport).sort(), ['desktop', 'mobile']);
    assert.ok(evidence.every((item) => item.passed), JSON.stringify(evidence, null, 2));
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.match(basename(root), /^dc-skip-control-/);
    await rm(root, { recursive: true, force: true });
  }
});
