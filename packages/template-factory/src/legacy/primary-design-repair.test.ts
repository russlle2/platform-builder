import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from 'parse5';
import { chromium } from '@playwright/test';
import { repairLegacyTemplate } from './compose.js';
import { repairPage, repairStylesheet, repairSvgAsset, type HtmlNode } from './repair.js';

const options = { file: 'index.html', slug: 'primary-fixture', niche: 'wellness_coach', fields: [], pageNames: ['index.html'] };
function elements(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  const visit = (node: HtmlNode): void => { if (node.tagName) nodes.push(node); for (const child of node.childNodes ?? []) visit(child); };
  visit(parse(html) as unknown as HtmlNode);
  return nodes;
}
const attr = (node: HtmlNode, name: string): string | undefined => node.attrs?.find(a => a.name === name)?.value;

test('moves body metadata into the real head and preserves editable visible copy', () => {
  const repaired = repairPage('<!doctype html><html><head></head><body><div> </div><title>Practice title</title><meta name="description" content="Practice description"><main><h1>{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>', options);
  const nodes = elements(repaired.html);
  for (const tag of ['title', 'meta']) {
    const metadata = nodes.find(n => n.tagName === tag)!;
    assert.equal(metadata.parentNode?.tagName, 'head');
    assert.ok(attr(metadata, 'data-dc-edit-id'));
  }
  assert.ok(attr(nodes.find(n => n.tagName === 'h1')!, 'data-dc-edit-id'));
  assert.equal(repairPage(repaired.html, options).html, repaired.html);
});

test('keeps nested brand text and icon-only accessible controls independently reachable', () => {
  const repaired = repairPage('<main><h1>{{BUSINESS_NAME}}</h1><a class="brand" href="index.html" aria-label="Home"><strong>{{BUSINESS_NAME}}</strong><small>Practice</small></a><button aria-label="Open menu"><svg aria-hidden="true"><path d="M0 0h4"></path></svg></button><a href="mailto:{{EMAIL}}">Email</a></main>', options);
  const nodes = elements(repaired.html);
  const brand = nodes.find(n => attr(n, 'class') === 'brand')!;
  assert.equal(attr(brand, 'aria-label'), 'Home');
  assert.equal(attr(brand, 'data-dc-edit-id'), undefined);
  assert.ok(attr(nodes.find(n => n.tagName === 'strong')!, 'data-dc-edit-id'));
  assert.ok(attr(nodes.find(n => n.tagName === 'small')!, 'data-dc-edit-id'));
  assert.equal(attr(nodes.find(n => n.tagName === 'button')!, 'data-dc-edit-attribute'), 'aria-label');
});

test('recovers only encoded SVG paint, preserves geometry and semantic names, and leaves linked SVG interactive', () => {
  const svg = '<svg viewBox="0 0 100 100" height="auto" role="img" aria-label="Illustration"><defs><linearGradient id="paint"><stop stop-color="%23aabbcc"></stop></linearGradient></defs><path d="M0 0h100v100z" fill="url(%23paint)"></path></svg>';
  const repaired = repairPage(`<main><h1>{{BUSINESS_NAME}}</h1>${svg}<svg><a href="#info"><text>Information</text></a></svg><p id="info">Details</p><a href="mailto:{{EMAIL}}">Contact</a></main>`, options);
  assert.match(repaired.html, /stop-color="#aabbcc"/);
  assert.match(repaired.html, /d="M0 0h100v100z" fill="url\(#paint\)"/);
  const svgs = elements(repaired.html).filter(n => n.tagName === 'svg');
  assert.equal(attr(svgs[0]!, 'aria-label'), 'Illustration');
  assert.equal(attr(svgs[0]!, 'aria-hidden'), undefined);
  assert.equal(attr(svgs[0]!, 'height'), undefined);
  assert.equal(attr(svgs[0]!, 'data-dc-static-svg'), 'true');
  assert.equal(attr(svgs[1]!, 'data-dc-static-svg'), undefined);
  const asset = repairSvgAsset(svg, 'image.svg');
  assert.match(asset.svg, /fill="url\(#paint\)"/);
  assert.equal(repairSvgAsset(asset.svg, 'image.svg').svg, asset.svg);
});

test('repairs duplicate main and orphan definition semantics without deleting their content', () => {
  const repaired = repairPage('<main id="first"><h1>{{BUSINESS_NAME}}</h1><main id="nested"><p>Nested content</p></main></main><section role="main" id="other"><p>Other content</p></section><dl><div><p>Group</p><dt>Term</dt><dd>Value</dd></div></dl><a href="mailto:{{EMAIL}}">Contact</a>', options);
  const nodes = elements(repaired.html);
  assert.equal(nodes.filter(n => n.tagName === 'main').length, 1);
  assert.equal(nodes.filter(n => attr(n, 'role') === 'main').length, 0);
  assert.equal(nodes.filter(n => n.tagName === 'dt' || n.tagName === 'dd').length, 0);
  for (const value of ['Nested content', 'Other content', 'Group', 'Term', 'Value']) assert.ok(repaired.html.includes(value));
});

test('restores static FAQ panels and mobile editorial columns without altering disclosure states or compact controls', () => {
  const css = '.intro{display:flex}.lead{display:flex}.step{display:flex}.team{display:flex}.controls{display:flex}.intro-column{display:flex;flex-direction:column}.faq-a,.acc-panel{max-height:0;overflow:hidden;opacity:0}.faq-a.closed{display:none}.modal{display:none}';
  const repaired = repairStylesheet(css, 'site.css');
  assert.match(repaired.css, /\.faq-a,\.acc-panel\{max-height:none;overflow:visible;opacity:1\}/);
  for (const selector of ['intro', 'lead', 'step', 'team']) assert.ok(repaired.css.includes(`.${selector}>*`));
  assert.ok(!repaired.css.includes('.controls>*'));
  assert.ok(!repaired.css.includes('.intro-column>*'));
  assert.ok(repaired.css.includes('.faq-a.closed{display:none}'));
  assert.ok(repaired.css.includes('.modal{display:none}'));
  assert.equal(repairStylesheet(repaired.css, 'site.css').css, repaired.css);
});

test('print-only visibility cannot remove the normal screen editor slots', () => {
  const repaired = repairLegacyTemplate({ slug:'print-fixture', niche:'wellness_coach', files:new Map([
    ['index.html', '<main><h1>{{BUSINESS_NAME}}</h1><p id="visible">Screen copy</p><p class="print-only">Print copy</p><a href="mailto:{{EMAIL}}">Email</a></main><style>.print-only{display:none}@media print{body *{visibility:hidden}.print-only{display:block;visibility:visible}}</style>'],
  ]) });
  const nodes = elements(String(repaired.files.get('index.html')));
  assert.ok(attr(nodes.find(n => attr(n, 'id') === 'visible')!, 'data-dc-edit-id'));
  assert.equal(attr(nodes.find(n => attr(n, 'class') === 'print-only')!, 'data-dc-edit-id'), undefined);
  const legacy = repairLegacyTemplate({slug:'parenthesized-print',niche:'wellness_coach',files:new Map([
    ['index.html','<main><h1>{{BUSINESS_NAME}}</h1><p id="screen">Screen copy</p></main><style>@media(print){body *{visibility:hidden}}</style>'],
  ])});
  assert.ok(attr(elements(String(legacy.files.get('index.html'))).find(n => attr(n,'id') === 'screen')!, 'data-dc-edit-id'));
});

test('cleans empty unstyled anchors and exposes explicitly hidden decorative wrappers to pointer events', () => {
  const repaired = repairPage('<main><h1>{{BUSINESS_NAME}}</h1><p>Safe copy<a href="index.html" aria-label="Home"></a><a class="icon" href="index.html" aria-label="Home"></a></p><div class="pattern-wrap" aria-hidden="true"><svg role="img" aria-label="Background pattern"><path d="M0 0h10"></path></svg></div><a href="mailto:{{EMAIL}}">Email</a></main>', options);
  const nodes = elements(repaired.html);
  assert.equal(nodes.filter(n => n.tagName === 'a' && attr(n, 'href') === 'index.html').length, 1);
  assert.equal(attr(nodes.find(n => attr(n, 'class') === 'pattern-wrap')!, 'data-dc-decoration'), 'pointer-layer');
  const css = repairStylesheet('.cta{display:flex;gap:1rem}', 'cta.css').css;
  assert.ok(css.includes('.cta:is(section,article,aside,div)>*'));
  assert.ok(!css.includes('.cta>*'));
});

test('preserves monogram intent from initial expressions and already materialized compiler defaults', () => {
  const repaired = repairPage('<main><h1>{{BUSINESS_NAME}}</h1><div class="logo">{{PRACTITIONER_NAME|slice:0,1}}</div><div class="avatar">Contact the practice for current details.</div><p>Contact the practice for current details.</p><a href="mailto:{{EMAIL}}">Email</a></main>', options);
  const nodes = elements(repaired.html);
  for (const name of ['logo', 'avatar']) {
    const node = nodes.find(n => attr(n, 'class') === name)!;
    assert.equal(node.childNodes?.[0]?.value, 'P');
    assert.ok(attr(node, 'data-dc-edit-id'));
  }
  assert.ok(repaired.html.includes('<p data-dc-edit-id='));
  assert.ok(repaired.html.includes('Contact the practice for current details.</p>'));
  assert.equal(repairPage(repaired.html, options).html, repaired.html);
});

test('names authored graphics and progress indicators and removes unsupported dead-widget states', () => {
  const repaired = repairPage('<main><h1>{{BUSINESS_NAME}}</h1><div aria-label="Aroma wheel"><svg role="img"><path d="M0 0h10"></path></svg></div><div role="img" aria-label="Wheel controls"><button>Aroma</button></div><div role="radiogroup" aria-label="Needs"><button role="radio" aria-checked="false">Calm</button><button aria-selected="true">Rest</button></div><div role="switch" tabindex="0" aria-pressed="false">Monthly</div><div><label>Path readiness</label><div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div></div><a href="mailto:{{EMAIL}}">Email</a></main>', options);
  const nodes = elements(repaired.html);
  assert.equal(attr(nodes.find(n => n.tagName === 'svg')!, 'aria-label'), 'Aroma wheel');
  assert.equal(attr(nodes.find(n => attr(n, 'aria-label') === 'Wheel controls')!, 'role'), 'group');
  assert.equal(attr(nodes.find(n => attr(n, 'aria-label') === 'Needs')!, 'role'), 'group');
  assert.equal(attr(nodes.find(n => attr(n, 'role') === 'progressbar')!, 'aria-label'), 'Path readiness');
  assert.ok(!nodes.some(n => attr(n, 'aria-checked') || attr(n, 'aria-selected') || attr(n, 'role') === 'switch'));
  assert.ok(repaired.html.includes('Monthly'));
});

test('restores evidenced scroll reveal content and safely centered page alignment', () => {
  const repaired = repairStylesheet('body{display:flex;align-items:center;justify-content:center}.section{opacity:0;transform:translateY(12px);transition:opacity .6s,transform .6s}.reveal-on-scroll{opacity:0;transform:translateY(18px)}.section.closed{opacity:0}.hidden{opacity:0}', 'reveal.css');
  assert.ok(repaired.css.includes('align-items:safe center;justify-content:safe center'));
  assert.ok(repaired.css.includes('.section{opacity:1;transform:none;'));
  assert.ok(repaired.css.includes('.reveal-on-scroll{opacity:1;transform:none}'));
  assert.ok(repaired.css.includes('.section.closed{opacity:0}.hidden{opacity:0}'));
  assert.equal(repairStylesheet(repaired.css, 'reveal.css').css, repaired.css);
});

test('flows explicitly visible script modals, including last-wins inline display, but retains hidden states', () => {
  const repaired = repairStylesheet('.modal{display:flex;position:fixed;inset:10vh 12px;z-index:60}.hidden-modal{display:none;position:fixed}.unresolved-modal{position:fixed}', 'modal.css');
  assert.ok(repaired.css.includes('.modal{display:flex;position:relative;inset:auto;z-index:auto;transform:none;margin-block:1rem}'));
  assert.ok(repaired.css.includes('.hidden-modal{display:none;position:fixed}'));
  assert.ok(repaired.css.includes('.unresolved-modal{position:fixed}'));
  const page = repairPage('<main><h1>{{BUSINESS_NAME}}</h1><div id="quickModal" style="display:none;position:fixed;inset:0;display:grid"><p>Original modal content</p></div><a href="mailto:{{EMAIL}}">Email</a></main>', options);
  assert.match(page.html, /id="quickModal" style="[^"]*position:relative/);
  assert.match(page.html, /<p data-dc-edit-id="[^"]+">Original modal content/);
  assert.ok(page.html.includes('Original modal content'));
});

test('restores plain sections only from explicit authored reveal state and repairs orphan list text', () => {
  const repaired = repairStylesheet('section{opacity:0;transform:translateY(12px)}section.revealed{opacity:1;transform:none}.section{opacity:0;transform:translateY(18px)}.section.in-view{opacity:1}.card{opacity:0}.card.active{opacity:1}', 'sections.css');
  assert.ok(repaired.css.includes('section{opacity:1;transform:none}'));
  assert.ok(repaired.css.includes('.section{opacity:1;transform:none}'));
  assert.ok(repaired.css.includes('.card{opacity:0}'));
  const page = repairPage('<main><h1>{{BUSINESS_NAME}}</h1><div><li<strong>Eye covering</li<strong></div><a href="mailto:{{EMAIL}}">Email</a></main>', options);
  assert.ok(!elements(page.html).some(node => node.tagName === 'li'));
  assert.ok(page.html.includes('Eye covering</strong>'));
});

test('keeps authored compact portraits small and gives product-only pages a top-level heading', () => {
  const repaired = repairStylesheet('.avatar{width:44px;height:44px}.hero-art img{width:100%;height:auto}.coach-card{display:flex}.prog{display:flex}.wrap{display:flex}', 'portrait.css');
  assert.ok(repaired.css.includes('.hero-art img:not(:where(.avatar)){width:100%;height:auto}'));
  assert.ok(!repaired.css.includes('.coach-card>*'));
  assert.ok(repaired.css.includes('.prog>*'));
  assert.ok(repaired.css.includes('.wrap>*'));
  assert.equal(repairStylesheet(repaired.css, 'portrait.css').css, repaired.css);
  const page = repairPage('<main><h4>Original product title</h4><a href="mailto:{{EMAIL}}">Email</a></main>', { ...options, file:'shop.html' });
  assert.ok(page.html.includes('Shop — {{BUSINESS_NAME}}</h1>'));
  assert.ok(page.html.includes('Original product title</h4>'));
});

test('preserves inherited typography and CSS-generated or painted icon links', () => {
  const result = repairLegacyTemplate({ slug:'css-links', niche:'wellness_coach', files:new Map([
    ['index.html', '<html><head><link rel="stylesheet" href="styles.css"></head><body><main><h1>{{BUSINESS_NAME}}</h1><a href="index.html" aria-label="Home"></a><a href="mailto:{{EMAIL}}" aria-label="Email"></a></main></body></html>'],
    ['styles.css', 'html{font-family:monospace}a[href="index.html"]::before{content:"Home"}a[href^="mailto:"]{display:inline-block;width:40px;height:40px;background:url(assets/img/icon.svg)}'],
    ['assets/img/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M0 0h20v20z"/></svg>'],
  ]) });
  assert.equal(elements(String(result.files.get('index.html'))).filter(n => n.tagName === 'a').length, 2);
  assert.ok(!String(result.files.get('assets/css/dc-repair.css')).includes(':where(html){font-family:'));
  assert.ok(!String(result.files.get('assets/css/dc-repair.css')).includes(':where(body){font-family:'));
});

test('authored avatar cascade and sticky-header paint order survive responsive repairs', async () => {
  const css = 'header{position:sticky;top:0}.hero-art img{width:100%;height:auto}.avatar{width:44px;height:44px}.avatar{width:56px;height:56px}@media(max-width:600px){.avatar{width:32px;height:32px}}';
  const repaired = repairStylesheet(css, 'cascade.css');
  const browser = await chromium.launch({ headless:true });
  try {
    for (const width of [1440,390]) {
      const page = await browser.newPage({viewport:{width,height:844}});
      try {
        await page.setContent(`<style>${repaired.css}</style><header>Practice</header><div class="hero-art"><img class="avatar" alt="Portrait"></div>`);
        const values = await page.evaluate(() => ({ width:getComputedStyle(document.querySelector('.avatar')!).width, z:getComputedStyle(document.querySelector('header')!).zIndex }));
        assert.equal(values.width, width === 1440 ? '56px' : '32px');
        assert.equal(values.z, '1');
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  assert.equal(repairStylesheet(repaired.css, 'cascade.css').css, repaired.css);
});

test('completes uniform authored ARIA rates tables and preserves valid table structures', () => {
  const table = '<div role="table" aria-label="Rates"><div><div>Session</div><div>Current price</div></div><div><div>Package</div><div>Current price</div></div></div>';
  const repaired = repairPage(`<main><h1>{{BUSINESS_NAME}}</h1>${table}<table><tr><td>Native rate</td></tr></table><div role="table" id="valid"><div role="row"><div role="cell">Existing</div></div></div></main>`, options);
  const nodes = elements(repaired.html);
  assert.equal(nodes.filter(node => attr(node, 'role') === 'row').length, 3);
  assert.equal(nodes.filter(node => attr(node, 'role') === 'cell').length, 5);
  assert.equal(attr(nodes.find(node => attr(node, 'id') === 'valid')!, 'role'), 'table');
  assert.equal(nodes.filter(node => node.tagName === 'table').length, 1);
  assert.equal(repairPage(repaired.html, options).html, repaired.html);
});

test('keeps empty accessible containers named without advertising a nonexistent canvas target', () => {
  const repaired = repairPage('<main><h1>{{BUSINESS_NAME}}</h1><div id="calendar" role="group" aria-label="Session calendar"></div><div id="path" role="group" aria-label="Program path"></div><button aria-label="Open calendar"><svg aria-hidden="true"></svg></button></main>', options);
  const nodes = elements(repaired.html);
  for (const id of ['calendar', 'path']) {
    const node = nodes.find(node => attr(node, 'id') === id)!;
    assert.ok(attr(node, 'aria-label'));
    assert.equal(attr(node, 'data-dc-edit-id'), undefined);
  }
  assert.equal(attr(nodes.find(node => node.tagName === 'button')!, 'data-dc-edit-attribute'), 'aria-label');
});

test('excludes only proven accessible-only copy and retains visual overrides and accessible names', () => {
  const hidden = 'position:absolute!important;height:1px;width:1px;overflow:hidden;clip:rect(1px,1px,1px,1px);white-space:nowrap';
  const result = repairLegacyTemplate({ slug:'accessible-only', niche:'wellness_coach', files:new Map([
    ['index.html', `<main><h1>{{BUSINESS_NAME}}</h1><figcaption id="caption" class="visually-hidden">Portrait description</figcaption><button id="named"><span class="sr-only">Choose date</span></button><p id="visible" class="sr-only expanded">Visible copy</p><p id="responsive" class="sr-only responsive">Responsive copy</p><p id="inline" class="sr-only" style="width:auto">Inline copy</p></main><style>.visually-hidden,.sr-only{${hidden}}.expanded{width:auto;clip:auto}@media(max-width:600px){.responsive{width:auto;clip:auto}}</style>`],
  ]) });
  const html = String(result.files.get('index.html'));
  const nodes = elements(html);
  assert.equal(attr(nodes.find(node => attr(node, 'id') === 'caption')!, 'data-dc-edit-id'), undefined);
  assert.equal(attr(nodes.find(node => node.tagName === 'span' && node.parentNode && attr(node.parentNode, 'id') === 'named')!, 'data-dc-edit-id'), undefined);
  for (const id of ['visible', 'responsive', 'inline']) assert.ok(attr(nodes.find(node => attr(node, 'id') === id)!, 'data-dc-edit-id'));
  assert.match(html, /Choose date<\/span>/);
  assert.match(html, /Portrait description<\/figcaption>/);
});

test('fontless pages get an editable browser-default font independently of other pages', () => {
  const result = repairLegacyTemplate({ slug:'font-pages', niche:'wellness_coach', files:new Map([
    ['index.html', '<main><h1>{{BUSINESS_NAME}}</h1><p>Default type</p></main>'],
    ['about.html', '<main><h1>About</h1><p>Authored type</p></main><style>html{font-family:monospace}</style>'],
  ]) });
  assert.match(String(result.files.get('index.html')), /data-dc-default-font="true"/);
  assert.doesNotMatch(String(result.files.get('about.html')), /data-dc-default-font=/);
  assert.match(String(result.files.get('assets/css/dc-repair.css')), /:where\(html\[data-dc-default-font\]\)/);
});

test('stacked sidebar forms and content-bearing motif shells grow without obscuring following content', () => {
  const result = repairLegacyTemplate({ slug:'bound-flow', niche:'wellness_coach', files:new Map([
    ['index.html', '<main><h1>{{BUSINESS_NAME}}</h1><aside><div class="contact-box"><form><label>Name<input name="name"></label></form></div><div id="following">Location details</div></aside><aside><div id="only" class="contact-box">Only sidebar content</div></aside><section class="svg-motif"><h2>Blend</h2><p>Blend details</p></section><div class="wheel"><div class="slice"></div><div class="center">Aroma details</div></div></main><style>.contact-box{position:sticky;top:28px}.svg-motif{height:90px;background-size:cover;background-repeat:no-repeat}.center{display:grid}.slice{position:absolute}</style>'],
  ]) });
  const nodes = elements(String(result.files.get('index.html')));
  const boxes = nodes.filter(node => attr(node, 'class') === 'contact-box');
  assert.match(attr(boxes[0]!, 'style')!, /position:relative!important;inset:auto!important/);
  assert.equal(attr(boxes[1]!, 'style'), undefined);
  assert.match(attr(nodes.find(node => attr(node, 'class') === 'svg-motif')!, 'style')!, /min-height:90px;height:auto/);
  assert.match(attr(nodes.find(node => attr(node, 'class') === 'center')!, 'style')!, /position:relative;z-index:1/);
});

test('bound form flow restores physical access without inline overrides of conflicting or conditional geometry', async () => {
  const css = '.box{position:sticky;top:28px}form{height:620px;background:white}#following{height:250px}aside{width:300px;margin-top:200px}.spacer{height:1000px}';
  const body = '<main><h1>{{BUSINESS_NAME}}</h1><aside><div class="box"><form><label>Name<input name="name"></label></form></div><div id="following"><h2 id="target">Location details</h2></div></aside><div class="spacer"></div></main>';
  const build = (sheet: string, head = '') => repairLegacyTemplate({ slug:'sticky-geometry', niche:'wellness_coach', files:new Map([['index.html', `${head}${body}<style>${sheet}</style>`], ['print.css','.box{position:sticky}']]) });
  const repaired = build(css);
  const repairedHtml = String(repaired.files.get('index.html'));
  for (const sheet of [css + '.box{position:static!important}', css + '@media(max-width:600px){.box{position:static}}']) {
    assert.doesNotMatch(String(build(sheet).files.get('index.html')), /position:relative!important;inset:auto!important/);
  }
  assert.doesNotMatch(String(build(css, '<link rel="stylesheet" href="print.css" media="print">').files.get('index.html')), /position:relative!important;inset:auto!important/);
  const browser = await chromium.launch({headless:true});
  try {
    for (const width of [1440,390]) {
      const page = await browser.newPage({viewport:{width,height:844}});
      try {
        await page.setContent(`<style>${css}</style>${body}`);
        const reachable = async (): Promise<boolean> => page.evaluate(() => {
          const target = document.querySelector('#target')!;
          target.scrollIntoView({block:'center'});
          const rect = target.getBoundingClientRect();
          return target.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
        });
        assert.equal(await reachable(), false);
        const sheets = [...repaired.files].filter(([path]) => path.endsWith('.css')).map(([,value]) => String(value)).join('\n');
        await page.setContent(`${repairedHtml}<style>${sheets}</style>`);
        assert.equal(await reachable(), true);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});

test('recovers only escaped markup whitespace and preserves deliberate code or prose escapes', () => {
  const repaired = repairPage('<main>\\n <h1>{{BUSINESS_NAME}}</h1>\\n <p>Actual \\n explanation</p><pre>\\n</pre><code>\\n</code></main>', options);
  assert.ok(!repaired.html.includes('data-dc-edit-wrapper="direct-text"'));
  assert.match(repaired.html, /Actual \\n explanation/);
  assert.match(repaired.html, /<pre[^>]*>\\n<\/pre>/);
});

test('accessible-only policy refuses conditional stylesheet, all-reset, focus and animation uncertainty', () => {
  const css = '.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(1px,1px,1px,1px)}';
  for (const [head, extra, inline] of [
    ['<link rel="stylesheet" href="print.css" media="print">', '', ''],
    ['', '@import url("print.css") print;', ''],
    ['', '.sr-only{all:unset}', ''],
    ['', '', 'all:unset'],
    ['', '.sr-only:focus{clip:auto;width:auto}', ''],
    ['', '.sr-only{animation:reveal 1s}', ''],
  ]) {
    const result = repairLegacyTemplate({slug:'hidden-uncertain',niche:'wellness_coach',files:new Map([
      ['index.html', `${head}<main><h1>{{BUSINESS_NAME}}</h1><p id="copy" class="sr-only" style="${inline}">Customer copy</p></main><style>${css}${extra}</style>`],
      ['print.css',css],
    ])});
    assert.ok(attr(elements(String(result.files.get('index.html'))).find(node => attr(node,'id') === 'copy')!, 'data-dc-edit-id'), JSON.stringify({head,extra,inline,css:[...result.files].filter(([p])=>p.endsWith('.css'))}));
  }
});

test('preserves existing motif minimum height and flows only colliding sidebar cards or a persistent end notice', () => {
  const result = repairLegacyTemplate({slug:'flow-boundaries',niche:'wellness_coach',files:new Map([
    ['index.html','<body><main><h1>{{BUSINESS_NAME}}</h1><aside><div class="card">First sidebar card</div><div class="card">Second sidebar card</div></aside><aside><div class="separate">Earlier card</div><div class="different">Later card</div></aside><section class="svg-motif"><h2>Motif title</h2><p>Motif copy</p></section></main><div class="crisis">Urgent contact notice</div><style>.card{position:sticky;top:28px}.separate{position:sticky;top:28px}.different{position:sticky;top:80px}.svg-motif{height:90px;min-height:160px;background-size:cover;background-repeat:no-repeat}.crisis{position:fixed;left:12px;right:12px;bottom:12px}</style></body>'],
  ])});
  const nodes=elements(String(result.files.get('index.html')));
  for(const card of nodes.filter(node=>attr(node,'class')==='card')) assert.match(attr(card,'style')!,/position:relative!important/);
  for(const name of ['separate','different']) assert.equal(attr(nodes.find(node=>attr(node,'class')===name)!,'style'),undefined);
  const motif=attr(nodes.find(node=>attr(node,'class')==='svg-motif')!,'style')!;
  assert.match(motif,/height:auto/);
  assert.doesNotMatch(motif,/min-height:90px/);
  assert.match(attr(nodes.find(node=>attr(node,'class')==='crisis')!,'style')!,/position:static!important/);
});

test('exposes link-only navigation wrappers while preserving controlled and native disclosures', async () => {
  const body = '<header><div class="brand"><h1>Practice</h1><p>Clear next steps</p></div><nav><ul class="nav-list"><li><a href="index.html">Home</a></li><li><a href="contact.html">Contact</a></li></ul></nav></header><header><div class="links"><a href="index.html">Home</a><a href="contact.html">Contact</a></div></header><header><button aria-controls="controlled">Menu</button><div id="controlled"><div class="navlinks"><a href="index.html">Home</a><a href="contact.html">Contact</a></div></div></header><header><details><summary>Links</summary><div class="links"><a href="index.html">Home</a><a href="contact.html">Contact</a></div></details></header><header><div class="links">Extra copy <a href="index.html">Home</a><a href="contact.html">Contact</a></div></header><main><h2>Services</h2></main>';
  const css = 'header{display:flex}.brand{flex:1}.nav-list{display:flex}@media(max-width:600px){.nav-list,.links,.navlinks{display:none;position:absolute;top:0;right:0}}';
  const result = repairLegacyTemplate({slug:'nested-navigation',niche:'wellness_coach',files:new Map([['index.html',`${body}<style>${css}</style>`]])});
  const html = String(result.files.get('index.html'));
  const nodes = elements(html);
  assert.ok(nodes.some(node=>attr(node,'class')==='nav-list'&&attr(node,'data-dc-mobile-nav-fallback')==='true'));
  assert.equal(nodes.filter(node=>attr(node,'class')==='links'&&attr(node,'data-dc-mobile-nav-fallback')==='true').length,1);
  assert.equal(attr(nodes.find(node=>attr(node,'class')==='navlinks')!,'data-dc-mobile-nav-fallback'),undefined);
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.setContent(`${html}<style>${[...result.files].filter(([path])=>path.endsWith('.css')).map(([,value])=>value).join('\n')}</style>`);
    const geometry=await page.evaluate(()=>{
      const nav=document.querySelector('nav')!, brand=document.querySelector('.brand')!, list=document.querySelector('.nav-list')!;
      const br=brand.getBoundingClientRect(),lr=list.getBoundingClientRect();
      return {brandWidth:br.width,afterBrand:lr.top>=br.bottom,position:getComputedStyle(list).position,links:[...nav.querySelectorAll('a')].every(a=>{const r=a.getBoundingClientRect();return r.width>0&&a.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})};
    });
    assert.ok(geometry.brandWidth>200);assert.equal(geometry.afterBrand,true);assert.equal(geometry.position,'static');assert.equal(geometry.links,true);
    await page.close();
  } finally {await browser.close();}
});

test('preserves mobile sticky overrides while restoring desktop expanded form flow', async()=>{
  const source='<main><h1>Practice</h1><aside><div class="box"><form><label>Name<input name="name"></label></form></div><p id="following">Studio details</p></aside></main>';
  const css='.box{position:sticky;top:28px}@media(max-width:880px){.box{position:static}}';
  const result=repairLegacyTemplate({slug:'conditional-sticky',niche:'wellness_coach',files:new Map([['index.html',`${source}<style>${css}</style>`]])});
  const html=String(result.files.get('index.html'));const sheets=[...result.files].filter(([p])=>p.endsWith('.css')).map(([,v])=>String(v)).join('\n');
  assert.match(html,/data-dc-sticky-form-flow="true"/);
  const shared=repairLegacyTemplate({slug:'shared-sticky',niche:'wellness_coach',files:new Map([['index.html',`<link rel="stylesheet" href="style.css">${source}`],['second.html',`<link rel="stylesheet" href="style.css">${source.replace('Studio details','Second location details')}`],['style.css',css]])});
  for(const path of ['index.html','second.html']) assert.match(String(shared.files.get(path)),/data-dc-sticky-form-flow="true"/);
  const again=repairLegacyTemplate({slug:'shared-sticky',niche:'wellness_coach',files:shared.files});
  for(const path of ['index.html','second.html']) assert.match(String(again.files.get(path)),/data-dc-sticky-form-flow="true"/);
  for(const declaration of ['absolute','fixed','relative','static!important']) {
    const conflict=repairLegacyTemplate({slug:'conflicting-sticky',niche:'wellness_coach',files:new Map([['index.html',`${source}<style>.box{position:sticky;position:${declaration};top:28px}@media(max-width:880px){.box{position:static}}</style>`]])});
    assert.doesNotMatch(String(conflict.files.get('index.html')),/data-dc-sticky-form-flow/);
  }
  const browser=await chromium.launch({headless:true});
  try {for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:844}});await page.setContent(`${html}<style>${sheets}</style>`);assert.equal(await page.locator('.box').evaluate(e=>getComputedStyle(e).position),width===1440?'relative':'static');await page.close();}}finally{await browser.close();}
});

test('keeps compact proof badges compact and preserves the full adjacent service guidance',()=>{
  const html='<main><h1>Practice</h1><section class="case-studies"><div class="case-item"><div style="width:46px;height:46px;display:flex">A</div><div>Unsupported result claim</div></div></section></main>';
  const repaired=repairPage(html,options);const nodes=elements(repaired.html);
  const badge=nodes.find(n=>attr(n,'style')?.includes('width:46px'))!;
  assert.equal(badge.childNodes?.find(n=>n.nodeName==='#text')?.value,'i');
  assert.match(repaired.html,/Ask about current services, your priorities, and what to expect\./);
  const compiled=repairPage('<main><h1>Practice</h1><div class="case-item"><div data-dc-edit-id="old" style="width:46px;height:46px;display:flex">Ask about current services, your priorities, and what to expect.</div><div>Ask about current services, your priorities, and what to expect.</div></div></main>',options);
  assert.equal(elements(compiled.html).find(n=>attr(n,'style')?.includes('width:46px'))?.childNodes?.find(n=>n.nodeName==='#text')?.value,'i');
});

test('keeps a native details submenu positioned inside a repaired outer nav',async()=>{
  const result=repairLegacyTemplate({slug:'native-submenu',niche:'wellness_coach',files:new Map([['index.html','<header><nav><a href="index.html">Home</a><details open><summary>More</summary><ul><li><a href="contact.html">Contact</a></li><li><a href="about.html">About</a></li></ul></details></nav></header><main><h1>Practice</h1></main><style>details{position:relative}details ul{position:absolute;top:30px;left:0}</style>']])});
  const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:390,height:844}});await page.setContent(`${result.files.get('index.html')}<style>${[...result.files].filter(([p])=>p.endsWith('.css')).map(([,v])=>v).join('\n')}</style>`);assert.equal(await page.locator('details ul').evaluate(e=>getComputedStyle(e).position),'absolute');await page.close();}finally{await browser.close();}
});

test('bounds an unanchored full-width hero caption to its own two-child artwork card',async()=>{
  const body='<main><h1>Practice</h1><div class="hero-art"><img src="art.svg" alt="Decoration"><div style="position:absolute;margin-top:10px;width:100%">Small cohorts and individual care</div></div></main>';
  const css='.hero-art{display:flex;width:300px;margin-left:200px}img{width:200px;height:120px}';
  const result=repairLegacyTemplate({slug:'art-caption',niche:'wellness_coach',files:new Map([['index.html',`${body}<style>${css}</style>`],['art.svg','<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"></svg>']])});
  assert.match(String(result.files.get('index.html')),/class="hero-art" style=";position:relative"/);
  for(const imageCss of ['position:absolute;left:0;top:0','position:fixed','position:relative;left:20px','transform:translateX(10px)']) {
    const unchanged=repairLegacyTemplate({slug:'art-caption',niche:'wellness_coach',files:new Map([['index.html',`${body}<style>${css}.hero-art>img{${imageCss}}</style>`],['art.svg','<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"></svg>']])});
    assert.doesNotMatch(String(unchanged.files.get('index.html')),/class="hero-art" style=";position:relative"/);
  }
  const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1440,height:900}});await page.setContent(`${result.files.get('index.html')}<style>${[...result.files].filter(([p])=>p.endsWith('.css')).map(([,v])=>v).join('\n')}</style>`);assert.equal(await page.locator('.hero-art>div').evaluate(e=>e.getBoundingClientRect().width),300);await page.close();}finally{await browser.close();}
});

test('flows a footer float only on mobile and removes square logo geometry only from descriptive copy',async()=>{
  const html='<header><div class="logo"><div>P</div><div><div>Practice name</div><div>Book a spot or consult</div></div></div><nav><a href="index.html">Home</a><a href="contact.html">Contact</a></nav></header><main><h1>Practice</h1></main><footer><div class="foot-left">Long practice name and contact information</div><div><nav><a href="index.html">Home</a><a href="contact.html">Contact</a></nav></div></footer>';
  const css='.logo{display:flex;gap:12px}.logo div{width:40px;height:40px;display:grid;place-items:center}.foot-left{float:left}footer nav{display:flex}';
  const result=repairLegacyTemplate({slug:'footer-logo',niche:'wellness_coach',files:new Map([['index.html',`${html}<style>${css}</style>`]])});
  const repaired=String(result.files.get('index.html'));const sheets=[...result.files].filter(([p])=>p.endsWith('.css')).map(([,v])=>String(v)).join('\n');
  const browser=await chromium.launch({headless:true});
  try {for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:844}});await page.setContent(`${repaired}<style>${sheets}</style>`);assert.equal(await page.locator('.foot-left').evaluate(e=>getComputedStyle(e).float),width===390?'none':'left');assert.equal(await page.locator('.logo>div').first().evaluate(e=>getComputedStyle(e).height),'40px');assert.ok(await page.getByText('Book a spot or consult',{exact:true}).evaluate(e=>e.getBoundingClientRect().width>40));await page.close();}}finally{await browser.close();}
});

test('sizes the flowed modal track without treating unrelated compiler grid guards as authored columns',async()=>{
  const html='<main><h1>Practice</h1></main><div id="quickModal" style="position:relative;inset:auto;display:grid;place-items:center"><div style="width:520px"><div style="display:flex;justify-content:space-between"><span>Guided practice</span><button>Close</button></div></div></div>';
  const repairCss='@media(max-width:600px){body *{min-width:0!important;max-width:100%!important}body :is(.grid,[class*="-grid"],[class*="grid-"]){grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))!important}}';
  const build=(path:string)=>repairLegacyTemplate({slug:'modal-track',niche:'wellness_coach',files:new Map([['index.html',`<link rel="stylesheet" href="${path}">${html}`],[path,repairCss]])});
  const result=build('assets/css/dc-repair.css');const repaired=String(result.files.get('index.html'));
  assert.match(repaired,/grid-template-columns:minmax\(0,1fr\)/);
  assert.doesNotMatch(String(build('author.css').files.get('index.html')),/grid-template-columns:minmax\(0,1fr\)/);
  const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:390,height:844}});await page.setContent(`${repaired}<style>${[...result.files].filter(([p])=>p.endsWith('.css')).map(([,v])=>v).join('\n')}</style>`);assert.ok(await page.getByRole('button',{name:'Close'}).evaluate(e=>{const r=e.getBoundingClientRect();return r.right<=innerWidth&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));await page.close();}finally{await browser.close();}
});

