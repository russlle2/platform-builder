import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { parse } from 'parse5';
import { clipDecorativeOverflowLayers } from './primary-overflow.js';
import { resolveStaticSelectorTargets, type HtmlNode } from './repair.js';

const fixture = (body: string, css: string) => ({
  pages: { 'index.html': `<!doctype html><html lang="en"><head><title>Overflow fixture</title><link rel="stylesheet" href="style.css"></head><body>${body}</body></html>` },
  styles: { 'style.css': css },
});
const artwork = '<svg class="pattern" aria-hidden="true" width="420" height="420" viewBox="0 0 420 420"><path d="M0 0h420v420H0z" fill="#acf"></path></svg>';
const css = 'html,body{margin:0;min-height:100%;overflow-x:clip}body>svg.pattern{position:absolute;right:-120px;top:40px;opacity:.12;transform:rotate(18deg)}main{padding:40px}';

test('clips explicitly decorative root artwork while retaining rotation, geometry and direct-child styles', () => {
  const input = fixture(`<main><h1>Customer content</h1></main>${artwork}`, css);
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 1);
  const document = parse(input.pages['index.html']) as unknown as HtmlNode;
  const wrappers = resolveStaticSelectorTargets(document, 'body>dc-decoration-clip')!;
  assert.equal(wrappers.length, 1);
  assert.equal(wrappers[0]!.childNodes?.[0]?.tagName, 'svg');
  assert.match(input.pages['index.html'], /d="M0 0h420v420H0z"/);
  assert.match(input.styles['style.css'], /body>:where\(\[data-dc-decoration-clip="true"\]\)>svg\.pattern/);
  assert.match(input.styles['style.css'], /transform:rotate\(18deg\)/);
  const first = JSON.stringify(input);
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0);
  assert.equal(JSON.stringify(input), first);
});

test('bounds only a wholly decorative container and keeps its transformed child unchanged', () => {
  const input = fixture('<div class="diagonal-wrap" aria-hidden="true"><div class="diagonal"></div></div><main><h1>Visible content</h1></main>', '.diagonal-wrap{position:absolute;inset:0}.diagonal{position:absolute;right:-10vw;width:80vw;height:120vh;transform:skewX(-12deg)}');
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 1);
  assert.match(input.pages['index.html'], /class="diagonal-wrap"[^>]*overflow-x:clip/);
  assert.doesNotMatch(input.pages['index.html'], /<dc-decoration-clip/);
  assert.match(input.styles['style.css'], /right:-10vw/);
  assert.match(input.styles['style.css'], /transform:skewX\(-12deg\)/);
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0);
});

test('does not clip semantic images, interactive art, customer content or content-owned pseudos', () => {
  const input = fixture('<svg class="semantic" role="img" aria-label="Service chart"></svg><svg class="linked" aria-hidden="true"><a href="contact.html"><text>Contact</text></a></svg><div class="overlay" aria-hidden="true"><p data-dc-edit-id="txt_one">Customer content</p><div class="paint"></div></div><main class="panel"><h1>Content</h1></main>', '.semantic,.linked,.overlay{position:absolute;inset:0;right:-120px;transform:rotate(12deg)}.paint{position:absolute;right:-120px}.panel::after{content:"";position:absolute;right:-40px;width:180px}');
  const before = JSON.stringify(input);
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0);
  assert.equal(JSON.stringify(input), before);
});

test('follows only page-linked local styles and fails closed on conditional flow or positional selectors', () => {
  const input = fixture(artwork, '.pattern{color:red}');
  Object.assign(input.styles, { 'other.css': '.pattern{position:absolute;right:-120px}' });
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0);
  input.styles['style.css'] = '.pattern{position:absolute;right:-120px}@media(max-width:600px){.pattern{position:static}}';
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0);
  input.styles['style.css'] = '.pattern{position:absolute;right:-120px}body>svg:first-child{opacity:.2}';
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0);
  input.styles['style.css'] = '@import url("other.css");';
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 1);
});

test('preserves unresolved direct-child and relational selector topology', () => {
  for (const structural of [
    'body:has(>svg.pattern){background:red}',
    'body>svg:is(.pattern){fill:navy}',
    'body>svg:not(.other){opacity:.3}',
  ]) {
    const input = fixture(artwork, `.pattern{position:absolute;right:-120px}${structural}`);
    const before = JSON.stringify(input);
    assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0, structural);
    assert.equal(JSON.stringify(input), before, structural);
  }
});

test('unrelated real compiler and authored structural selectors do not veto SVG clipping', () => {
  const body = '<header><nav data-dc-mobile-nav-fallback="true"><a>Home</a></nav></header><main><div class="hero"><div class="cta"><p>Contact</p></div></div></main>' + artwork + '<footer><p>Details</p><p>Hours</p></footer>';
  const unrelated = ':is(p,blockquote,figcaption,dd,td)>a{text-decoration:underline}'
    + 'header:has([data-dc-mobile-nav-fallback="true"]){position:static}'
    + '.hero .cta:is(section,article,aside,div)>*{min-width:18rem}'
    + 'footer>p:first-child{font-weight:bold}footer p+p{margin-top:1rem}'
    + 'header:has(>nav)>a{color:blue}header:has(+main){color:navy}svg>path:first-child{stroke:navy}';
  const input = fixture(body, css + unrelated);
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 1);
  assert.ok(input.styles['style.css'].endsWith(unrelated));
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0);
});

test('ancestor, sibling and type-rank dependencies retain their original topology', () => {
  const body = '<header>Header</header>' + artwork + '<svg class="other" role="img" aria-label="Chart"></svg><main><p>Details</p></main>';
  for (const structural of [
    'body:has(>svg.pattern) p{color:red}',
    'header:has(+svg.pattern){color:red}',
    'header:has(~svg.pattern){color:red}',
    'header+svg.pattern{opacity:.4}',
    'svg.pattern~main{color:red}',
    'svg.other:nth-of-type(2){opacity:.4}',
    'main:nth-child(4 of svg,main){color:red}',
    ':is(body>svg.pattern){opacity:.4}',
  ]) {
    const input = fixture(body, css + structural);
    const before = JSON.stringify(input);
    assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0, structural);
    assert.equal(JSON.stringify(input), before, structural);
  }
});

test('nested hero clipping distinguishes an unrelated CTA edge from one owning the SVG', () => {
  const source = '.pattern{position:absolute;right:-80px;top:-80px}.hero .cta:is(section,article,aside,div)>*{opacity:.8}';
  const separate = fixture(`<div class="hero card"><div class="cta"><a>Contact</a></div>${artwork}</div>`, source);
  assert.equal(clipDecorativeOverflowLayers(separate.pages, separate.styles), 1);
  const ownsSvg = fixture(`<div class="hero card"><div class="cta">${artwork}</div></div>`, source);
  const before = JSON.stringify(ownsSvg);
  assert.equal(clipDecorativeOverflowLayers(ownsSvg.pages, ownsSvg.styles), 0);
  assert.equal(JSON.stringify(ownsSvg), before);
});

test('rewrites actual child combinators without treating quoted punctuation as topology', () => {
  const input = fixture(artwork.replace('class="pattern"', 'class="pattern" data-label="a > b + c ~ d"'),
    css + 'body>svg[data-label="a > b + c ~ d"]{fill:navy}');
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 1);
  assert.ok(input.styles['style.css'].includes('body>:where([data-dc-decoration-clip="true"])>svg[data-label="a > b + c ~ d"]'));
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0);
});

test('wrapper cannot acquire generic author paint, transforms or opacity', async () => {
  const input = fixture('<main><h1>Customer content</h1></main>' + artwork,
    css + 'body>*{opacity:.5!important;background:white!important;filter:blur(2px)!important;transform:translateY(3px)!important;width:400px!important}');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const load = () => page.setContent(input.pages['index.html'].replace('<link rel="stylesheet" href="style.css">', `<style>${input.styles['style.css']}</style>`));
    const svgStyle = () => page.locator('svg').evaluate(element => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, background: style.backgroundColor, filter: style.filter, transform: style.transform, width: style.width };
    });
    await load();
    const before = await svgStyle();
    assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 1);
    await load();
    assert.deepEqual(await svgStyle(), before);
    const wrapper = await page.locator('dc-decoration-clip').evaluate(element => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, background: style.backgroundColor, filter: style.filter, transform: style.transform };
    });
    assert.deepEqual(wrapper, { opacity: '1', background: 'rgba(0, 0, 0, 0)', filter: 'none', transform: 'none' });
    await page.close();
  } finally { await browser.close(); }
});

test('rotated decorations stop enlarging the document in both viewports without changing paint or text access', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const input = fixture(`<main><h1>Customer content</h1><a href="#next">Contact</a><p id="next">Details</p></main>${artwork}`, css);
    const page = await browser.newPage();
    const load = async () => page.setContent(input.pages['index.html'].replace('<link rel="stylesheet" href="style.css">', `<style>${input.styles['style.css']}</style>`));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await load();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1));
    }
    assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 1);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await load();
      const state = await page.evaluate(() => {
        const heading = document.querySelector('h1')!;
        const rect = heading.getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          transform: getComputedStyle(document.querySelector('svg')!).transform,
          accessible: heading.contains(document.elementFromPoint(rect.left + 3, rect.top + rect.height / 2)),
          path: document.querySelector('path')!.getAttribute('d'),
        };
      });
      assert.equal(state.overflow, 0, JSON.stringify({ width, state }));
      assert.notEqual(state.transform, 'none');
      assert.equal(state.path, 'M0 0h420v420H0z');
      assert.equal(state.accessible, true);
    }
    await page.close();
  } finally { await browser.close(); }
});

const cornerPseudo = ".panel::after{content:'';position:absolute;right:-40px;top:10px;width:180px;height:60px;background:linear-gradient(120deg,#acf,transparent);transform:skewY(-8deg);pointer-events:none}";
const rotatedPseudo = ".hero{margin:22px 0;padding:26px;border-radius:14px;overflow:hidden}.hero:after{content:'';position:absolute;right:-20%;top:-10%;width:60%;height:140%;transform:rotate(-18deg);opacity:0.18}";

test('limits a proven pointerless corner inset and restores an authored pseudo clipping boundary', () => {
  const input = fixture('<main><section class="panel"><h1>Content</h1></section><section class="hero"><p>Details</p></section></main>', cornerPseudo + rotatedPseudo);
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 2);
  assert.match(input.styles['style.css'], /right:-40px/);
  assert.match(input.styles['style.css'], /after-inset[^}]+right:\s*0/);
  assert.match(input.styles['style.css'], /after-container[^}]+position:\s*relative/);
  assert.match(input.styles['style.css'], /after-container[^}]+pointer-events:\s*none/);
  assert.match(input.styles['style.css'], /transform:rotate\(-18deg\)/);
  const first = JSON.stringify(input);
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0);
  assert.equal(JSON.stringify(input), first);
});

test('does not change controls, generated text, rotated corner extents or another positioned descendant', () => {
  for (const [body, stylesheet] of [
    ['<a class="panel" href="#next">Link</a>', cornerPseudo],
    ['<button><span class="panel">Button</span></button>', cornerPseudo],
    ['<div class="panel" onclick="open()">Action</div>', cornerPseudo],
    ['<div class="panel">Content</div>', cornerPseudo + '.panel:after{content:"Step one"}'],
    ['<div class="panel">Content</div>', cornerPseudo.replace('skewY(-8deg)', 'rotate(8deg)')],
    ['<div class="hero"><span class="badge">Label</span></div>', rotatedPseudo + '.badge{position:absolute;right:0}'],
    ['<div class="hero"><span>Label</span></div>', rotatedPseudo + '.hero::before{content:"";position:absolute;top:0}'],
    ['<div class="hero"><span class="caption">Label</span></div>', rotatedPseudo + '.caption::after{content:"Badge";position:absolute;top:0}'],
    ['<div class="hero"><p>Label</p></div>', rotatedPseudo + '@media(max-width:600px){.hero{position:static}}'],
    ['<div class="hero"><p>Label</p></div>', rotatedPseudo + '.hero{top:12px}'],
    ['<div class="hero"><p>Label</p></div>', rotatedPseudo + '.hero{z-index:5}'],
    ['<div class="hero"><p>Label</p></div>', rotatedPseudo + '.hero::after{pointer-events:auto}'],
  ]) {
    const input = fixture(body!, stylesheet!);
    const before = JSON.stringify(input);
    assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0, stylesheet);
    assert.equal(JSON.stringify(input), before);
  }
});

test('pseudo geometry repairs apply only to proved owners when a stylesheet is shared with a control page', () => {
  const input = fixture('<section class="panel"><h1>Content</h1></section>', cornerPseudo);
  Object.assign(input.pages, { 'contact.html': fixture('<a class="panel" href="#next">Contact</a>', '').pages['index.html'] });
  assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 1);
  assert.doesNotMatch((input.pages as Record<string, string>)['contact.html']!, /data-dc-pseudo-overflow/);
  assert.match(input.styles['style.css'], /:where\(\[data-dc-pseudo-overflow/);
});

test('a descendant generated badge keeps its existing containing block and physical hit area', async () => {
  const input = fixture('<section class="hero"><span class="caption">Label</span></section>',
    `body{margin:0;padding-top:80px}${rotatedPseudo}.caption::after{content:"Badge";position:absolute;top:0;left:0;width:60px;height:30px;background:white}`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const load = () => page.setContent(input.pages['index.html'].replace('<link rel="stylesheet" href="style.css">', `<style>${input.styles['style.css']}</style>`));
    const hits = () => page.evaluate(() => [5, 25, 85].map(y => document.elementFromPoint(5, y) === document.querySelector('.caption')));
    await load();
    const before = await hits();
    assert.deepEqual(before, [true, true, false]);
    assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 0);
    await load();
    assert.deepEqual(await hits(), before);
    await page.close();
  } finally { await browser.close(); }
});

test('real corner and rotated pseudo families fit both viewports with unchanged content geometry and paint', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [owner, stylesheet] of [['panel', cornerPseudo], ['hero', rotatedPseudo]]) {
      const input = fixture(`<main><section class="${owner}"><h1>Customer content</h1><p>Service details</p><a href="#next">Contact</a></section></main>`, `html,body{margin:0}main{padding:30px}${stylesheet}`);
      const page = await browser.newPage();
      const load = () => page.setContent(input.pages['index.html'].replace('<link rel="stylesheet" href="style.css">', `<style>${input.styles['style.css']}</style>`));
      const read = () => page.evaluate((selector) => {
        const owner = document.querySelector(selector)!;
        const pseudo = getComputedStyle(owner, '::after');
        const rect = document.querySelector('h1')!.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          heading: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          paint: { transform: pseudo.transform, background: pseudo.backgroundImage, opacity: pseudo.opacity },
          accessible: document.querySelector('h1')!.contains(document.elementFromPoint(rect.left + 3, rect.top + rect.height / 2)) };
      }, `.${owner}`);
      const before = new Map<number, Awaited<ReturnType<typeof read>>>();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await load();
        before.set(width, await read());
        assert.ok(before.get(width)!.overflow > 0, `${owner}/${width}`);
      }
      assert.equal(clipDecorativeOverflowLayers(input.pages, input.styles), 1);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await load();
        const after = await read();
        assert.equal(after.overflow, 0, `${owner}/${width}`);
        assert.deepEqual(after.heading, before.get(width)!.heading, `${owner}/${width}`);
        assert.deepEqual(after.paint, before.get(width)!.paint, `${owner}/${width}`);
        assert.equal(after.accessible, true, `${owner}/${width}`);
        await page.getByRole('link', { name: 'Contact' }).click();
      }
      await page.close();
    }
  } finally { await browser.close(); }
});
