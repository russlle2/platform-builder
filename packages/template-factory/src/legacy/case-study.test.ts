import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from 'parse5';
import { validateTemplateContract } from '../template-contract.js';
import { repairLegacyTemplate } from './compose.js';
import { verifyStaticArtifact } from './pipeline.js';
import type { HtmlNode } from './repair.js';

const fields = [{ name: 'BUSINESS_NAME', default: 'Riverlight Studio' }, { name: 'EMAIL' }];
const shell = (content: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{{BUSINESS_NAME}}</title><link rel="stylesheet" href="assets/css/styles.css"></head><body><main><h1>{{BUSINESS_NAME}}</h1>${content}<a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`;
const fixture = shell(`
  <p id="neighbor-before">Choose a time that suits your schedule.</p>
  <a id="case-navigation" href="#case-studies" aria-controls="case-studies">Service information</a>
  <section id="case-studies" class="case-studies container" aria-labelledby="case-heading">
    <h2 id="case-heading" class="section-title">Measured outcomes</h2>
    <p class="lede">Three anonymized examples of progress from focused, 12-week engagements.</p>
    <div class="gallery">
      <figure class="case"><img src="assets/img/avatar.svg" alt="Client A avatar"><figcaption>
        <strong>Executive: regained 75 minutes daily focus</strong>
        <p>Through micro-break routines and sleep-window consistency, attention blocks lengthened without extra work hours.</p>
      </figcaption></figure>
      <figure class="case"><img src="assets/img/pattern.svg" alt="Client B avatar"><figcaption>
        <strong>Freelancer: stabilized week-to-week energy</strong>
        <p>We introduced a simple pacing protocol and predictable meal+movement anchors to avoid midweek dips.</p>
      </figcaption></figure>
      <figure class="case"><img src="assets/img/avatar.svg" alt="Client C avatar"><figcaption>
        <strong>Parent-career balance: consistent morning routine</strong>
        <p>Shifting the cue environment and reducing friction led to a <em>5x increase</em> in routine adherence after six weeks. <a class="case-link" href="#contact"><span>Ask about this service</span></a></p>
      </figcaption></figure>
    </div>
  </section>
  <section id="faq"><h2>Quick questions answered</h2><details><summary>How soon will I see results?</summary><div class="answer">Expect measurable shifts in awareness and small wins within 2–4 weeks; durable habit formation typically takes 6–12 weeks depending on complexity.</div></details></section>
  <section id="contact"><h2>Ask about availability</h2><p id="neighbor-after">Sessions last 75 minutes. The program lasts 12 weeks. Optional practice is 5x weekly.</p></section>
`);
const css = '#case-studies{padding:32px}.case-studies.container{border:2px solid #123456}.gallery{display:grid;grid-template-columns:repeat(3,1fr)}.gallery>.case{margin:0}.case figcaption{padding:16px}.case-link>span{font-weight:600}';
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#abc"/></svg>';
const files = (html = fixture) => new Map([
  ['index.html', html], ['assets/css/styles.css', css],
  ['assets/img/avatar.svg', svg], ['assets/img/pattern.svg', svg],
  ['fields.json', JSON.stringify({ placeholders: { BUSINESS_NAME: 'Riverlight Studio' } })],
]);
const descendants = (node: HtmlNode): HtmlNode[] => [node, ...(node.childNodes ?? []).flatMap(descendants)];
const attr = (node: HtmlNode, name: string) => node.attrs?.find((item) => item.name === name)?.value;
const text = (node: HtmlNode): string => node.nodeName === '#text' ? node.value ?? '' : (node.childNodes ?? []).map(text).join('');
const byId = (nodes: HtmlNode[], id: string) => {
  const node = nodes.find((candidate) => attr(candidate, 'id') === id);
  assert.ok(node, `missing #${id}`);
  return node;
};
const claims = [
  'Measured outcomes', 'Three anonymized examples', 'regained 75 minutes',
  'stabilized week-to-week energy', 'attention blocks lengthened',
  'predictable meal+movement anchors', 'consistent morning routine',
  '5x increase', 'routine adherence after six weeks', 'Expect measurable shifts',
  'small wins within 2–4 weeks', 'Client A avatar', 'Client B avatar', 'Client C avatar',
];

test('case-study repair rejects source proof and retains the original three-card structure and styling', () => {
  const raw = validateTemplateContract(new Map([['index.html', fixture]]), fields);
  assert.equal(raw.pass, false);
  assert.match(raw.errors.join('\n'), /unverified testimonial|unsupported outcome/i);

  const repaired = repairLegacyTemplate({ slug: 'case-study-family', niche: 'wellness_coach', files: files() });
  const verified = verifyStaticArtifact(repaired.files, repaired.fields);
  assert.equal(verified.passed, true, JSON.stringify(verified.errors));
  const html = String(repaired.files.get('index.html'));
  const nodes = descendants(parse(html) as HtmlNode);
  const navigation = byId(nodes, 'case-navigation');
  const targetId = attr(navigation, 'href')?.slice(1);
  assert.ok(targetId);
  assert.equal(attr(navigation, 'aria-controls'), targetId);
  const section = byId(nodes, targetId);
  assert.equal(section.tagName, 'section');
  assert.equal(text(byId(nodes, attr(section, 'aria-labelledby') ?? '')), 'Service information');
  const sectionNodes = descendants(section);
  assert.equal(sectionNodes.filter((node) => node.tagName === 'figure').length, 3);
  assert.equal(sectionNodes.filter((node) => node.tagName === 'figcaption').length, 3);
  assert.equal(sectionNodes.filter((node) => node.tagName === 'img').length, 3);
  assert.equal(sectionNodes.filter((node) => attr(node, 'class')?.split(/\s+/).includes('gallery')).length, 1);
  assert.deepEqual(sectionNodes.filter((node) => node.tagName === 'img').map((node) => attr(node, 'src')), ['assets/img/avatar.svg', 'assets/img/pattern.svg', 'assets/img/avatar.svg']);
  const nestedLink = sectionNodes.find((node) => node.tagName === 'a' && attr(node, 'class') === 'case-link');
  assert.ok(nestedLink, 'caption link must survive content neutralization');
  assert.equal(attr(nestedLink, 'href'), '#contact');
  assert.ok(descendants(nestedLink).some((node) => node.tagName === 'span'), 'nested link markup must survive');
  byId(nodes, 'contact');
  assert.equal(text(byId(nodes, 'neighbor-before')), 'Choose a time that suits your schedule.');
  assert.equal(text(byId(nodes, 'neighbor-after')), 'Sessions last 75 minutes. The program lasts 12 weeks. Optional practice is 5x weekly.');

  const outputCss = String(repaired.files.get('assets/css/styles.css'));
  assert.ok(outputCss.includes(`#${targetId}{`), 'ID selector and fragment target must be renamed together');
  const styledClass = attr(section, 'class')?.split(/\s+/).find((name) => name !== 'container');
  assert.ok(styledClass && outputCss.includes(`.${styledClass}.container{`), 'class selector must still style the original region');
  for (const selector of ['.gallery', '.gallery>.case', '.case figcaption', '.case-link>span']) {
    assert.ok(outputCss.includes(`${selector}{`), `missing authored selector ${selector}`);
  }
  for (const claim of claims) assert.ok(!html.includes(claim), `retained unsupported narrative: ${claim}`);
  assert.doesNotMatch(html, /dc-neutral-guidance/, 'this repair must not replace the cards with a generic section');

  const repeated = repairLegacyTemplate({ slug: 'case-study-family', niche: 'wellness_coach', files: repaired.files });
  const again = String(repeated.files.get('index.html'));
  assert.equal(again, html, 'repeated repair must not change the repaired page');
  assert.equal(String(repeated.files.get('assets/css/styles.css')), outputCss);
});

test('publication gate rejects detached case evidence, split metrics, semantic attributes, and assured timelines', () => {
  const unsupported = [
    '<h2>Measured outcomes</h2>',
    '<section class="case-studies"><p>Information</p></section>',
    '<p>Three anonymized examples of progress from focused, 12-week engagements.</p>',
    '<p>Examples (de-identified) show progress from our work.</p>',
    '<p>Executive: regained 75 minutes daily focus</p>',
    '<p>Executive: regained <strong>75 minutes</strong> daily focus</p>',
    '<p>A 5x increase in routine adherence after six weeks.</p>',
    '<p>A <em>5× increase</em> in routine adherence after six weeks.</p>',
    '<img src="assets/img/avatar.svg" alt="Executive: regained 75 minutes daily focus">',
    '<p>Expect measurable shifts in awareness and small wins within 2–4 weeks.</p>',
  ];
  for (const body of unsupported) {
    const result = validateTemplateContract(new Map([['index.html', shell(body)]]), fields);
    assert.equal(result.pass, false, body);
    assert.match(result.errors.join('\n'), /unverified testimonial|unsupported outcome/i, body);
  }
});

test('publication gate preserves ordinary durations, frequencies, goals, and measurement questions', () => {
  const operational = [
    'Sessions last 75 minutes.', 'The program lasts 12 weeks.', 'A 12-week program is available.',
    'Optional practice is 5x weekly.', 'The workshop offers 5× weekly sessions.',
    'We discuss focus, energy, and routine adherence.', 'How are outcomes measured?',
    'Ask about your goals before deciding whether to book.',
    'Please book 2–4 weeks before your preferred date.',
  ];
  for (const copy of operational) {
    const result = validateTemplateContract(new Map([['index.html', shell(`<p>${copy}</p>`)] ]), fields);
    assert.equal(result.pass, true, `${copy}: ${result.errors.join('; ')}`);
  }
});
