import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from 'parse5';
import {
  applyContentPreset,
  applyThemePreset,
  adaptLegacyPageShell,
  LEGACY_ROLE_ADAPTERS,
  normalizeAccessibleTextColor,
  repairLegacyTemplate,
} from './legacy/compose.js';
import {
  buildDedupeClusters,
  canAliasDesigns,
  checkCompositionCompatibility,
  domSimilarity,
  satisfiesVisualAliasThresholds,
} from './legacy/dedupe.js';
import { normalizeFields } from './legacy/contracts.js';
import { repairStylesheet, resolveStaticSelectorTargets, type HtmlNode } from './legacy/repair.js';
import { findUnsafeCssGeneratedContent } from './template-contract.js';

const SOURCE_HTML = `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Legacy practice</title>
  <style>.card { color: #abc; background-image: url("https://images.unsplash.com/photo-inline"); }</style>
  <script>alert('legacy inline script')</script>
  <script src="https://tracker.invalid/tracker.js"></script>
  <link rel="stylesheet" href="assets/css/styles.css">
</head><body onload="track()">
  <header><a class="brand" href="/">Legacy Wellness Studio</a><button aria-controls="menu" aria-expanded="false">Menu</button><nav id="menu"><a href="https://booking.invalid/start" class="book-button">Book</a></nav></header>
  <main><h1>{{HERO_HEADLINE}}</h1><p>A practical introduction with original editorial copy.</p>
    <p>Programs start at $299 USD.</p>
    <section class="testimonials"><h2>Testimonials</h2><blockquote>Guaranteed healing from anxiety — A Client</blockquote></section>
    <img src="https://images.unsplash.com/photo-1" alt="Calm room">
    <img src="assets/img/missing.jpg" alt="Missing legacy asset">
    <form><label>List medications<textarea name="medical-history"></textarea></label></form>
    <a href="mailto:hello@example.com">hello@example.com</a>
  </main>
</body></html>`;

const SOURCE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
:root { --brand: #336699; }
body { color: #336699; font-family: Inter, sans-serif; }
.hero { background-image: url("https://images.unsplash.com/photo-2"); display: grid; }
.missing { background-image: url("../img/nope.jpg"); }
`;

function fixture(slug = 'legacy-one', html = SOURCE_HTML, marker = '', css = SOURCE_CSS) {
  return repairLegacyTemplate({
    slug,
    niche: 'wellness_coach',
    files: new Map<string, string | Uint8Array>([
      ['index.html', `${marker}${html}`],
      ['assets/css/styles.css', css],
      ['assets/js/main.js', 'console.log("untrusted")'],
      ['assets/img/local.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['template.json', JSON.stringify({ title: 'Legacy One', pages: ['index.html'], required_sections: ['hero', 'cta'] })],
      ['fields.json', JSON.stringify({ placeholders: {
        BUSINESS_NAME: 'Legacy Wellness Studio',
        EMAIL: 'hello@example.com',
        PHONE: '(555) 555-0123',
        HERO_HEADLINE: 'A steadier way forward',
      } })],
    ]),
  });
}

test('canonicalizes representative legacy field shapes and aliases', () => {
  const fields = normalizeFields({
    fields: {
      THERAPIST_NAME: { type: 'text', label: 'Clinician', default: 'Taylor' },
      EMAIL_ADDRESS: { type: 'email', value: 'care@example.test' },
    },
    site: { PHONE_NO: '(212) 555-0199' },
  });
  assert.deepEqual(fields.map((field) => field.name), ['EMAIL', 'PHONE', 'PRACTITIONER_NAME']);
  assert.equal(fields.find((field) => field.name === 'PRACTITIONER_NAME')?.label, 'Clinician');
  assert.equal(fields.find((field) => field.name === 'PHONE')?.type, 'tel');
});

test('repairs unsafe legacy markup, claims, prices, forms, links, and personalization', () => {
  const result = fixture();
  const html = String(result.files.get('index.html'));

  assert.doesNotMatch(html, /tracker\.invalid|onload=|<iframe/i);
  assert.doesNotMatch(html, /Testimonials|Guaranteed healing|\$299/i);
  assert.match(html, /Contact for current pricing/i);
  assert.match(html, /data-dc-safe-replacement="neutral-guidance"/);
  assert.match(html, /data-dc-standard-form="contact"/);
  assert.doesNotMatch(html, /medications|medical-history/i);
  assert.match(html, /\{\{BUSINESS_NAME\}\}/);
  assert.match(html, /mailto:\{\{EMAIL\}\}/);
  assert.match(html, /href="\{\{BOOKING_URL\}\}"/);
  assert.match(html, /data-dc-edit-id="txt_[a-f0-9]+"/);
  assert.match(html, /data-dc-image-id="img_[a-f0-9]+"/);
  assert.doesNotMatch(html, /assets\/img\/missing\.jpg/);
  assert.match(html, /assets\/img\/dc-placeholder\.svg/);
  assert.equal((html.match(/<script\b/g) ?? []).length, 1);
  assert.match(html, /assets\/js\/dc-compat\.js/);
  assert.equal(result.files.has('assets/js/main.js'), false);
  assert.equal(result.files.has('assets/js/dc-compat.js'), true);
  assert.equal(result.files.has('.dailyclarity/design.json'), true);
  assert.equal(result.files.has('.dailyclarity/fingerprint.json'), true);
  assert.match(html, /@import url\("\.dc-inline-[a-f0-9]+\.css"\)/);
  assert.ok([...result.files.keys()].some((path) => /^\.dc-inline-[a-f0-9]+\.css$/.test(path)));
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('removes generated proof regions and tooltip-only badges without deleting benign tooltips', () => {
  const result = repairLegacyTemplate({
    slug: 'tooltip-proof-signals',
    niche: 'aromatherapy',
    files: new Map([['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main>
      <button data-tip="Local aromatherapy studio, open by appointment">Details</button>
      <section><h2>Services</h2><p>Original service copy remains.</p>
        <div class="cred">
          <div>Proof &amp; Credibility</div>
          <div class="badge" data-tip="Featured in a lifestyle column"><span>Bloom Journal</span></div>
          <div class="badge" data-tip="Natural products certification verified by an independent lab"><span>Green Lab</span></div>
          <div class="badge" data-tip="Local business award for sensory services"><span>Community Picks</span></div>
        </div>
      </section>
      <a href="mailto:{{EMAIL}}">Contact</a>
    </main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /Original service copy remains/);
  assert.match(html, /data-tip="Local \{\{BUSINESS_NAME\}\}, open by appointment"/);
  assert.doesNotMatch(html, /Proof &amp; Credibility|Bloom Journal|Green Lab|Community Picks/i);
  assert.match(html, /data-dc-safe-replacement="neutral-guidance"/);
});

test('restores locality and practitioner identity without personalizing visitor placeholders', () => {
  const result = repairLegacyTemplate({
    slug: 'legacy-placeholder-contexts',
    niche: 'holistic_medicine',
    files: new Map([['index.html', `<!doctype html><html><head>
      <meta name="description" content="Visit the practice in Anytown, CA."><title>Practice</title>
      </head><body><main><h1>{{BUSINESS_NAME}}</h1><p>Care from John Doe.</p>
      <form><label>Your name<input name="name" placeholder="Jane Doe" required></label>
        <label>Email<input type="email" name="email" required></label>
        <label>Phone<input type="tel" name="phone"></label>
        <label>Message<textarea name="message" required></textarea></label></form>
      <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));

  assert.match(html, /content="Visit the practice in \{\{CITY\}\}, \{\{STATE\}\}\."/);
  assert.match(html, /Care from \{\{PRACTITIONER_NAME\}\}\./);
  assert.match(html, /<input name="name" autocomplete="name" required="">/);
  assert.doesNotMatch(html, /Anytown|Jane Doe|John Doe/i);
  assert.doesNotMatch(html, /placeholder="\{\{PRACTITIONER_NAME\}\}"/);
  assert.ok(result.fields.some((field) => field.name === 'CITY'));
  assert.ok(result.fields.some((field) => field.name === 'STATE'));
  assert.ok(result.fields.some((field) => field.name === 'PRACTITIONER_NAME'));
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('an explicitly marked proof parent supersedes nested proof descendants', () => {
  const result = repairLegacyTemplate({
    slug: 'direct-proof-parent',
    niche: 'holistic_medicine',
    files: new Map([
      ['index.html', `<!doctype html><html><head><title>Practice</title></head><body><main>
      <h1>{{BUSINESS_NAME}}</h1><p>Original service copy remains.</p>
      <section class="social-proof"><h2>Trusted by locals for practical care</h2>
        <div class="pulse"><strong>4.9</strong> — Patient review</div>
        <div class="testimonials"><blockquote>A generated client quote.</blockquote></div>
      </section><p>Safe sibling remains.</p><a href="mailto:{{EMAIL}}">Contact</a>
      </main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));

  assert.match(html, /Original service copy remains\./);
  assert.match(html, /Safe sibling remains\./);
  assert.doesNotMatch(html, /Trusted by|Patient review|generated client quote|4\.9/i);
  assert.equal((html.match(/data-dc-safe-replacement="neutral-guidance"/g) ?? []).length, 1);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('removes repeated proof tooltip attributes with their nested evidence', () => {
  const result = repairLegacyTemplate({
    slug: 'nested-tooltip-proof',
    niche: 'sound_bath',
    files: new Map([['index.html', `<!doctype html><html><head><title>Practice</title></head><body><main>
      <h1>{{BUSINESS_NAME}}</h1><p>Original event description remains.</p>
      <section><h2>Proof Gallery</h2><div class="badgelist">
        <div class="badge" data-tip="Featured in Local Wellbeing">LW<div class="tip">Featured in Local Wellbeing</div></div>
        <div class="badge" data-tip="Trusted by community centers">CC<div class="tip">Trusted by community centers</div></div>
        <div class="badge" data-tip="Faculty vetted">FV<div class="tip">Faculty vetted</div></div>
      </div></section><a href="mailto:{{EMAIL}}">Contact</a>
      </main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));

  assert.match(html, /Original event description remains\./);
  assert.doesNotMatch(html, /Proof Gallery|Featured in|Trusted by|Faculty vetted|data-tip=/i);
  assert.equal((html.match(/data-dc-safe-replacement="neutral-guidance"/g) ?? []).length, 1);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('neutralizes residual proof navigation labels while preserving navigation', () => {
  const result = repairLegacyTemplate({
    slug: 'proof-navigation-label',
    niche: 'wellness_coach',
    files: new Map([
      ['index.html', '<!doctype html><html><head><title>Practice</title></head><body><nav><a href="testimonials.html">Success Stories</a></nav><main><h1>{{BUSINESS_NAME}}</h1><p>Original introduction.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['about.html', '<!doctype html><html><body><main><h1>About {{BUSINESS_NAME}}</h1><p>About the practice.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['testimonials.html', '<!doctype html><html><body><main><h1>Practice information</h1><p>Current service information.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
    ]),
  });
  const html = String(result.files.get('index.html'));

  assert.match(html, /<nav><a href="about\.html"[^>]*>service information<\/a><\/nav>/i);
  assert.doesNotMatch(html, /Success Stories|testimonials\.html/i);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('neutralizes proof vocabulary inside ordinary FAQ copy without replacing the FAQ', () => {
  const result = repairLegacyTemplate({
    slug: 'proof-vocabulary-faq',
    niche: 'aromatherapy',
    files: new Map([['index.html', `<!doctype html><html><head><title>Practice</title></head><body><main>
      <h1>{{BUSINESS_NAME}}</h1><dl><dt>What commitment supports real results?</dt><dd>Start with a routine that fits your schedule.</dd></dl>
      <p>Service questions can be discussed before booking.</p><a href="mailto:{{EMAIL}}">Contact</a>
      </main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));

  assert.match(html, /What commitment supports practical progress\?/);
  assert.match(html, /Start with a routine that fits your schedule\./);
  assert.match(html, /Service questions can be discussed before booking\./);
  assert.doesNotMatch(html, /real results/i);
  assert.ok(result.transformations.some((item) => item.rule === 'remove-proof-vocabulary'));
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('removes credential-proof tooltips while preserving operational review controls', () => {
  const result = repairLegacyTemplate({
    slug: 'proof-attribute-context',
    niche: 'holistic_medicine',
    files: new Map([['index.html', `<!doctype html><html><head><title>Practice</title><style>
      #reviews,.reviews{color:#123456;filter:url("#reviews")}
      #testimonials,.testimonials{background:#abcdef}
      .safe-layout{--layout-hook:testimonials}
      </style></head><body><main>
      <h1>{{BUSINESS_NAME}}</h1>
      <div id="planPreview"><button class="chip" data-val="Lab Review">Lab Review</button></div>
      <div data-block="reviews">Planning notes</div>
      <button id="reviews" class="reviews">Open A</button><button id="testimonials" class="testimonials">Open B</button>
      <button aria-controls="reviews" data-target="#testimonials">Switch panels</button>
      <div class="badge" data-tip="Community-reviewed outcomes">Community Rated</div>
      <div class="badge" data-tooltip="Teachers and facilitators reviewed by peers">Practitioner Network</div>
      <p>Schedule a quarterly review when useful.</p><a href="mailto:{{EMAIL}}">Contact</a>
      </main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));

  assert.match(html, /id="planPreview"/);
  assert.match(html, /data-val="Lab Review"[^>]*>Lab Review<\/button>/);
  assert.match(html, /data-block="dc-guidance"[^>]*>Planning notes<\/div>/);
  const renamedProofIds = [...html.matchAll(/id="(dc-guidance-[a-f0-9]{10})"/g)].map((match) => match[1]);
  assert.equal(renamedProofIds.length, 2);
  assert.equal(new Set(renamedProofIds).size, 2);
  assert.match(html, new RegExp(`aria-controls="${renamedProofIds[0]}"`));
  assert.match(html, new RegExp(`data-target="#${renamedProofIds[1]}"`));
  const proofStylesheet = [...result.files.entries()]
    .find(([path, value]) => /^\.dc-inline-[a-f0-9]+\.css$/.test(path) && String(value).includes('--layout-hook'))?.[1];
  assert.ok(proofStylesheet);
  const css = String(proofStylesheet);
  const renamedProofClasses = [...html.matchAll(/class="(dc-guidance-[a-f0-9]{10})"/g)].map((match) => match[1]);
  assert.equal(new Set(renamedProofClasses).size, 2);
  assert.match(css, new RegExp(`#${renamedProofIds[0]},\\.${renamedProofClasses[0]}`));
  assert.match(css, new RegExp(`#${renamedProofIds[1]},\\.${renamedProofClasses[1]}`));
  assert.match(css, new RegExp(`url\\("#${renamedProofIds[0]}"\\)`));
  assert.match(css, /--layout-hook:testimonials/);
  assert.doesNotMatch(css, /\.practice information|#practice information/);
  assert.ok(result.transformations.some((item) => item.rule === 'align-proof-selectors'));
  assert.match(html, /Schedule a quarterly review when useful\./);
  assert.doesNotMatch(html, /Community-reviewed outcomes|Community Rated|reviewed by peers|Practitioner Network/i);
  assert.equal((html.match(/data-dc-safe-replacement="neutral-guidance"/g) ?? []).length, 2);
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('neutralizes fixed prices in visible copy and pricing control attributes', () => {
  const result = repairLegacyTemplate({
    slug: 'pricing-attribute-controls',
    niche: 'aromatherapy',
    files: new Map([['index.html', `<!doctype html><html><head><title>Practice</title></head><body><main>
      <h1>{{BUSINESS_NAME}}</h1>
      <div class="price" data-price-monthly="$12/mo" data-price-annual="$120/yr">$12/mo</div>
      <button aria-controls="plan-$12">First plan</button><div id="plan-$12" class="offer-$45" aria-description="$45/session" aria-placeholder="$18/mo" aria-valuetext="$20/mo" label="$15 plan" data-target="#plan-$12">Ask about the current offer.</div>
      <button aria-controls="plan-$20">Second plan</button><div id="plan-$20" data-target="#plan-$20">Compare plans.</div>
      <p>Investment range: $900–$1,400 per month.</p>
      <p class="split-price"><strong>Starting at </strong>$<span class="amount">37</span><svg aria-hidden="true"><path d="M0 0h1"></path></svg> / week. <a href="pricing.html"><em>See plan details</em></a></p>
      <p class="range-prices">$12–20 per session; 12–20 USD; $12k package.</p>
      <a href="mailto:{{EMAIL}}">Contact</a>
      </main></body></html>`],
      ['pricing.html', '<!doctype html><html><head><title>Pricing</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><p>Ask about current pricing.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
    ]),
  });
  const html = String(result.files.get('index.html'));

  assert.doesNotMatch(html, />[^<]*\$(?:12|45|120|900|1,400)/);
  assert.match(html, /data-price-monthly="Contact for current pricing"/);
  assert.match(html, /data-price-annual="Contact for current pricing"/);
  assert.match(html, /aria-controls="plan-\$12"/);
  assert.match(html, /id="plan-\$12" class="offer-\$45"[^>]*data-target="#plan-\$12"/);
  assert.match(html, /aria-controls="plan-\$20"/);
  assert.match(html, /id="plan-\$20" data-target="#plan-\$20"/);
  assert.match(html, /aria-description="Contact for current pricing"/);
  assert.match(html, /aria-placeholder="Contact for current pricing"/);
  assert.match(html, /aria-valuetext="Contact for current pricing"/);
  assert.match(html, /label="Contact for current pricing plan"/);
  assert.match(html, /Investment range: Contact for current pricing\./);
  assert.match(html, /class="split-price"[^>]*><strong[^>]*>Starting at <\/strong><span data-dc-edit-wrapper="direct-text" data-dc-edit-id="txt_[a-f0-9]{18}">Contact for current pricing<\/span><span class="amount"><\/span><svg[^>]*><path d="M0 0h1"><\/path><\/svg>\. <a href="pricing\.html"><em[^>]*>See plan details<\/em><\/a><\/p>/);
  assert.doesNotMatch(html, /data-dc-edit-wrapper="direct-text"[^>]*>\. <\/span>/);
  assert.match(html, /class="range-prices"[^>]*>Contact for current pricing; Contact for current pricing; Contact for current pricing package\.<\/p>/);
  assert.ok(result.transformations.some((item) => item.rule === 'replace-fixed-price'));
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('neutralizes only unsafe outcome sentences and whole descriptive attributes', () => {
  const result = repairLegacyTemplate({
    slug: 'sentence-scoped-health-claims',
    niche: 'aromatherapy',
    files: new Map([['index.html', `<!doctype html><html><head><title>Services</title>
      <meta name="description" content="Enhance your immune resilience and mental sharpness."></head><body><main>
      <h1>{{BUSINESS_NAME}}</h1><p>Sessions are quiet and appointment-based. The experience can significantly improve sleep quality. Ask what to expect before booking.</p>
      <p>This service does not treat anxiety, depression, pain, or sleep disorders.</p>
      <p>Supports a quiet pre-sleep routine focused on slowing down and breath awareness.</p>
      <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));

  assert.match(html, /Sessions are quiet and appointment-based\./);
  assert.match(html, /Ask what to expect before booking\./);
  assert.match(html, /This service does not treat anxiety, depression, pain, or sleep disorders\./);
  assert.match(html, /Supports a quiet pre-sleep routine focused on slowing down and breath awareness\./);
  assert.doesNotMatch(html, /significantly improve sleep quality|immune resilience|mental sharpness/i);
  assert.match(html, /content="Services and experiences vary\. Ask the practice what is currently offered and what to expect\."/);
  assert.ok(result.transformations.some((item) => item.rule === 'neutralize-outcome-claims'));
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('neutralizes inline-split risk copy without flattening links, icons, or emphasis', () => {
  const result = repairLegacyTemplate({
    slug: 'inline-split-risk-copy',
    niche: 'holistic_medicine',
    files: new Map([['index.html', `<!doctype html><html><head><title>Practice</title></head><body><main>
      <h1>{{BUSINESS_NAME}}</h1>
      <p data-case="outcome">Sessions <strong data-preserve="outcome">support</strong> your immune system. <svg aria-hidden="true"><path d="M0 0h1"></path></svg> <a href="#details"><em>Learn about the process</em></a></p>
      <p data-case="report">Clients <strong data-preserve="report">reported</strong> better sleep.</p>
      <p data-case="percent">80% <strong data-preserve="percent">improvement</strong>.</p>
      <p data-case="review">Read client <strong data-preserve="review">reviews</strong>.</p>
      <p data-case="volume">500+ <strong data-preserve="volume">clients served</strong>.</p>
      <p data-case="credential">Practitioners <strong data-preserve="credential">reviewed</strong> by peers.</p>
      <p data-case="br-outcome">Sessions support<br data-preserve="br-outcome">your immune system.</p>
      <p data-case="br-report">Clients report<br data-preserve="br-report">better sleep.</p>
      <p data-case="wbr-outcome">Sessions sup<wbr data-preserve="wbr-outcome">port your immune system.</p>
      <h3 data-case="comment-proof">testi<!--proof-boundary-->monials</h3>
      <p data-case="identity">Ja<strong data-preserve="identity">ne</strong> Doe</p>
      <p data-case="business">Wellness Coach Stu<span data-preserve="business">dio</span></p>
      <p data-case="email">hello@exam<strong data-preserve="email">ple.com</strong></p>
      <p data-case="phone">(555) 555-01<strong data-preserve="phone">23</strong></p>
      <p data-case="city">Your Ci<wbr data-preserve="city">ty</p>
      <p data-case="split-currency">1<strong data-preserve="split-currency">2 U</strong>SD</p>
      <address data-case="leaf-address">123 Main Street</address>
      <p data-case="inline-address">Your Addr<span data-preserve="inline-address">ess</span></p>
      <p data-case="comment-address">Your Addr<!--address-boundary-->ess</p>
      <p data-case="wbr-address">Your Addr<wbr data-preserve="wbr-address">ess</p>
      <p data-case="safe-certification">Ask about practitioner <strong data-preserve="safe-certification">certification</strong> requirements.</p>
      <p data-case="safe-published">Review the <strong data-preserve="safe-published">published</strong> schedule before booking.</p>
      <h2>Immune Support</h2><p>Your immune system is part of general health.</p>
      <div id="details">Ask about current services.</div><a href="mailto:{{EMAIL}}">Contact</a>
      </main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));

  for (const marker of [
    'outcome', 'report', 'percent', 'review', 'volume', 'credential', 'br-outcome', 'br-report',
    'wbr-outcome', 'identity', 'business', 'email', 'phone', 'city', 'split-currency',
    'inline-address', 'wbr-address', 'safe-certification', 'safe-published',
  ]) {
    assert.match(html, new RegExp(`data-preserve="${marker}"`));
  }
  assert.equal((html.match(/Services and experiences vary\./g) ?? []).length, 10);
  assert.equal((html.match(/<br data-preserve=/g) ?? []).length, 2);
  assert.match(html, /<!--proof-boundary-->/);
  assert.match(html, /\{\{PRACTITIONER_NAME\}\}/);
  assert.match(html, /\{\{BUSINESS_NAME\}\}/);
  assert.match(html, /\{\{EMAIL\}\}/);
  assert.match(html, /\{\{PHONE\}\}/);
  assert.match(html, /\{\{CITY\}\}/);
  assert.equal((html.match(/\{\{ADDRESS\}\}/g) ?? []).length, 4);
  assert.match(html, /Ask about practitioner /);
  assert.match(html, /<strong[^>]*>certification<\/strong>/);
  assert.match(html, /Review the /);
  assert.match(html, /<strong[^>]*>published<\/strong>/);
  assert.doesNotMatch(html, /Jane Doe|Wellness Coach Studio|hello@example\.com|555-0123|Your City|12 USD/);
  assert.ok(result.transformations.some((item) => item.rule === 'restore-split-personalization-tokens'));
  assert.ok(result.transformations.some((item) => item.rule === 'restore-address-placeholder'));
  assert.match(html, /<svg[^>]*><path d="M0 0h1"><\/path><\/svg>\s*<a href="#details"><em[^>]*>Learn about the process<\/em><\/a>/);
  assert.match(html, /<h2[^>]*>Immune Support<\/h2><p[^>]*>Your immune system is part of general health\.<\/p>/);
  assert.ok(result.transformations.some((item) => item.rule === 'neutralize-inline-split-risk'));
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('removes unsafe decoded CSS generated text while preserving decorative content', () => {
  const result = repairLegacyTemplate({
    slug: 'css-generated-content',
    niche: 'wellness_coach',
    files: new Map([
      ['index.html', String.raw`<!doctype html><html><head><title>{{BUSINESS_NAME}}</title>
        <link rel="stylesheet" href="assets/css/styles.css">
        <style>.hero::before{content:"Sessions support your immune system · Client reviews · $99"}.escaped::before{c\6f ntent:"\24 99"}.safe::before{content:"•"}</style>
        </head><body><main><h1 class="hero">{{BUSINESS_NAME}}</h1><span class="escaped">Offer</span><span class="tip" data-tip="$99">Price</span><span class="safe">Details</span><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`],
      ['assets/css/styles.css', String.raw`.hero{--\63 opy:"\24 99"}.hero::after{content:v\61 r(--copy)}.tip::after{content:a\74 tr(data-t\69 p)}.metric{counter-reset:price 99}.metric::before{content:"$" counter(price)}.safe::after{content:counter(step)}`],
    ]),
  });

  const styles = [...result.files]
    .filter(([path]) => /\.css$/i.test(path))
    .map(([path, value]) => [path, typeof value === 'string' ? value : Buffer.from(value).toString('utf8')] as const);
  assert.ok(styles.length >= 2);
  for (const [path, css] of styles) {
    assert.deepEqual(findUnsafeCssGeneratedContent(css), [], path);
    assert.doesNotMatch(css, /support your immune|client reviews|\$99|\\24 99/i, path);
  }
  assert.ok(styles.some(([, css]) => /content:\s*["']•["']/.test(css)));
  assert.ok(styles.some(([, css]) => /content:\s*counter\(step\)/.test(css)));
  assert.doesNotMatch(String(result.files.get('index.html')), /data-tip="\$99"/);
  assert.ok(result.transformations.some((item) => item.rule === 'remove-unsafe-css-generated-content'));
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('replaces complete proof and metric regions while preserving safe siblings', () => {
  const result = repairLegacyTemplate({
    slug: 'legacy-proof-metric-clusters',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html><head><title>Proof — {{BUSINESS_NAME}}</title></head><body><main>
      <h1>About {{BUSINESS_NAME}}</h1><p>Safe introduction remains.</p>
      <section class="intro"><h2>What people notice first</h2><p>Clients report changes in clarity, small daily wins, and routines that stick.</p></section>
      <aside><h3>Credibility</h3><div data-tip="350+ coaching hours logged">Hours</div><div><h3>Quick stats</h3>
        <p>Average habit retention: 78% after 6 weeks.</p><p>Client NPS: 4.7 out of 5.</p><p>Repeat clients: 42% return within 6 months.</p></div></aside>
      <section><h2>Social proof</h2><p>“I left more rested than I have in months.” — M.</p></section>
      <section><h2>Case note (anonymized)</h2><p>A client used practical exercises over 8 sessions to regain sleep consistency.</p></section>
      <section><h2>Proof of insurance requirements</h2><p>Clients report scheduling problems through the contact form.</p></section>
      <p>Safe closing remains.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));

  assert.match(html, /Safe introduction remains\./);
  assert.match(html, /Safe closing remains\./);
  assert.match(html, /Proof of insurance requirements/);
  assert.match(html, /Clients report scheduling problems through the contact form\./);
  assert.doesNotMatch(html, /Clients report changes|Credibility|Quick stats|habit retention|Client NPS|Repeat clients|coaching hours|Social proof|left more rested|Case note|regain sleep consistency/i);
  assert.equal((html.match(/data-dc-safe-replacement="neutral-guidance"/g) ?? []).length, 4);
  assert.match(html, /<title[^>]*>Practice information<\/title>/);
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('preserves a page wrapper while replacing nested proof and normalizing escaped tokens', () => {
  const result = repairLegacyTemplate({
    slug: 'irregular-proof-wrapper',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html lang="en"><head><title>{\\{TAGLINE\\}}</title></head><body>
      <div class="site"><header><strong>{{BUSINESS_NAME}}</strong></header><main><h1>{\\{TAGLINE\\}}</h1>
      <p>This original design copy remains in place.</p><section aria-labelledby="voices"><h2 id="voices">Voices from the cohort</h2><blockquote>Everything changed for me.</blockquote></section>
      <a href="mailto:{{EMAIL}}">Contact</a></main><footer>Footer</footer></div>
      <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg></body></html>`],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com', TAGLINE: 'A practical next step' })],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /<main>/);
  assert.match(html, /This original design copy remains in place\./);
  assert.match(html, /\{\{TAGLINE\}\}/);
  assert.doesNotMatch(html, /Voices from the cohort|Everything changed for me/i);
  assert.match(html, /data-dc-safe-replacement="neutral-guidance"/);
  assert.ok(result.transformations.some((item) => item.rule === 'normalize-escaped-token-delimiters'));
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('normalizes spaced legacy token delimiters without disturbing ordinary braces', () => {
  const result = repairLegacyTemplate({
    slug: 'spaced-token-delimiters',
    niche: 'wellness_coach',
    files: new Map([['index.html', '<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><p>Call <a href="tel:{{PHONE}}">{ {PHONE}}</a>.</p><p>Keep {ordinary braces} intact.</p><a href="mailto:{{EMAIL}}">Email</a></main></body></html>']]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, />\{\{PHONE\}\}<\/a>/);
  assert.match(html, /\{ordinary braces\}/);
  assert.ok(result.transformations.some((item) => item.rule === 'normalize-spaced-token-delimiters'));
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('sanitizes only the smallest proof card and preserves its siblings', () => {
  const result = repairLegacyTemplate({
    slug: 'proof-card-siblings',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html lang="en"><head><title>Services</title></head><body><main>
      <h1>{{BUSINESS_NAME}}</h1><section class="cards">
        <article class="service-card"><h2>Practical planning</h2><p>Build a routine around your current priorities.</p></article>
        <article class="testimonial"><blockquote>A guaranteed transformation.</blockquote></article>
        <article class="service-card"><h2>Ongoing support</h2><p>Review the plan and adjust it together.</p></article>
      </section><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /Practical planning/);
  assert.match(html, /Build a routine around your current priorities\./);
  assert.match(html, /Ongoing support/);
  assert.match(html, /Review the plan and adjust it together\./);
  assert.doesNotMatch(html, /guaranteed transformation/i);
  assert.equal((html.match(/data-dc-safe-replacement="neutral-guidance"/g) ?? []).length, 1);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('standardizes every legacy form and removes externally associated controls', () => {
  const result = repairLegacyTemplate({
    slug: 'form-intent-preservation',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html lang="en"><head><title>Forms</title></head><body><main><h1>{{BUSINESS_NAME}}</h1>
      <form id="newsletter" class="newsletter compact" action="https://example.invalid/signup"><label>Name<input id="subscriber_email" required></label><label>Email<input type="email" name="subscriber_email" required></label><label>Note<textarea name=" "></textarea></label><button>Join updates</button></form>
      <label>Postal code<input form="newsletter" id="postal-code" pattern="[0-9]{5}" maxlength="5" required></label>
      <form id="intake" class="booking-grid custom-shell" style="display:grid"><label>List medications<textarea name="medical_history"></textarea></label></form>
      <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /class="newsletter compact dc-contact-form"[^>]*id="newsletter"/);
  assert.match(html, /id="intake"/);
  assert.match(html, /class="booking-grid custom-shell dc-contact-form"/);
  assert.match(html, /style="display:grid!important;visibility:visible!important;content-visibility:visible!important;opacity:1!important"/);
  assert.equal((html.match(/data-dc-standard-form="contact"/g) ?? []).length, 2);
  assert.equal((html.match(/name="name"/g) ?? []).length, 2);
  assert.equal((html.match(/name="email"/g) ?? []).length, 2);
  assert.equal((html.match(/name="phone"/g) ?? []).length, 2);
  assert.equal((html.match(/name="message"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /medical_history|List medications|subscriber_email|postal-code|Join updates|\bform="newsletter"|\baction=/i);
  assert.ok(result.transformations.some((item) => item.rule === 'standardize-contact-form'));
  assert.ok(result.transformations.some((item) => item.rule === 'remove-nonstandard-form-controls'));
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('sanitizes external control labels and removes alternate external submitters', () => {
  const result = repairLegacyTemplate({
    slug: 'external-form-accessibility-and-submitter',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1>
      <label for="message">Medical history</label>
      <form id="contact-form" class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact">
        <label>Your name <input name="name" required></label><label>Email <input type="email" name="email" required></label>
        <label>Phone (optional) <input type="tel" name="phone"></label><textarea id="message" name="message" required></textarea>
        <button type="submit">Send inquiry</button>
      </form>
      <button form="contact-form" formaction="/collect">Alternate submit</button>
      <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));

  assert.doesNotMatch(html, /<label for="message"/);
  assert.match(html, /<label><span[^>]*>Message <\/span><textarea name="message" rows="5" required=""><\/textarea><\/label>/);
  assert.doesNotMatch(html, /Medical history|Alternate submit|formaction=|form="contact-form"/i);
  assert.ok(result.transformations.some((item) => item.rule === 'sanitize-sensitive-form-wrapper'));
  assert.ok(result.transformations.some((item) => item.rule === 'remove-nonstandard-form-controls'));
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('restores exact functional form payloads and removes unsafe accessible descriptions', () => {
  const result = repairLegacyTemplate({
    slug: 'functional-form-and-description-repair',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1>
      <p id="medical-description" hidden>Medical history</p>
      <form class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact">
        <label>Your name <input name="name" required></label><label>Email <input type="email" name="email" required></label>
        <label>Phone (optional) <input type="tel" name="phone"></label><label>Message <textarea name="message" required aria-describedby="medical-description" aria-details="medical-description" aria-errormessage="medical-description"></textarea></label>
        <button type="submit">Send inquiry</button>
      </form>
      <form class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact">
        <fieldset disabled><label>Your name <input name=" NAME " required></label><label>Email <input type="email" name="EMAIL" required></label>
        <label>Phone (optional) <input type="tel" name="PHONE"></label><label>Message <textarea name="MESSAGE" required></textarea></label></fieldset>
        <button type="submit" formmethod="get" formnovalidate>Send inquiry</button>
      </form>
      <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));

  assert.equal((html.match(/name="name"/g) ?? []).length, 2);
  assert.equal((html.match(/name="email"/g) ?? []).length, 2);
  assert.equal((html.match(/name="phone"/g) ?? []).length, 2);
  assert.equal((html.match(/name="message"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /aria-described(?:by)?=|aria-details=|aria-errormessage=|name=" NAME "|name="EMAIL"|name="PHONE"|name="MESSAGE"|disabled=|formmethod=|formnovalidate=/);
  assert.match(html, /<textarea name="message" rows="5" required=""><\/textarea>/);
  assert.ok(result.transformations.some((item) => item.rule === 'standardize-contact-form'));
  assert.ok(result.transformations.some((item) => item.rule === 'sanitize-sensitive-form-wrapper'));
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('replaces password, birth-date, insurance, upload, and orphan intake controls with the exact inquiry schema', () => {
  const result = repairLegacyTemplate({
    slug: 'unsupported-intake-controls',
    niche: 'holistic_medicine',
    files: new Map([['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1>
      <form id="member-intake" class="insurance-intake"><label>Portal password<input type="password" name="portal_password"></label>
        <label>Date of birth<input type="date" name="dob"></label><label>Insurance member ID<input name="member_id"></label>
        <label>Upload medical records<input type="file" name="records"></label></form>
      <label>Emergency contact<input form="member-intake" name="emergency_contact"></label>
      <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));
  const form = html.match(/<form\b[\s\S]*?<\/form>/i)?.[0] ?? '';

  assert.match(form, /name="contact"/);
  assert.match(form, /method="post"/);
  assert.match(form, /data-netlify="true"/);
  assert.match(form, /data-dc-standard-form="contact"/);
  assert.equal((form.match(/<(?:input|textarea)\b/g) ?? []).length, 4);
  assert.match(form, /<input name="name"[^>]*required/);
  assert.match(form, /<input type="email" name="email"[^>]*required/);
  assert.match(form, /<input type="tel" name="phone"/);
  assert.match(form, /<textarea name="message"[^>]*required/);
  assert.doesNotMatch(html, />[^<]*(?:password|date of birth|\bdob\b|insurance|member[_ -]?id|medical records|emergency contact)[^<]*</i);
  assert.doesNotMatch(html, /name="(?:portal_password|dob|member_id|records|emergency_contact)"|type="file"|(?:^|\s)form=/i);
  assert.ok(result.transformations.some((item) => item.rule === 'standardize-contact-form'));
  assert.ok(result.transformations.some((item) => item.rule === 'remove-nonstandard-form-controls'));
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('preserves structural form hooks while replacing sensitive prompts with the canonical schema', () => {
  const result = repairLegacyTemplate({
    slug: 'sensitive-form-wrapper',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1>
      <button aria-controls="mini-diagnostic">Open form</button>
      <form id="mini-diagnostic" class="diagnostic-grid custom-shell" style="display:grid" aria-label="Quick diagnostic"><label>Symptoms<textarea name="symptoms"></textarea></label></form>
      <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /id="mini-diagnostic"/);
  assert.match(html, /class="diagnostic-grid custom-shell dc-contact-form"/);
  assert.match(html, /style="display:grid!important;visibility:visible!important;content-visibility:visible!important;opacity:1!important"/);
  assert.doesNotMatch(html, /aria-label="Quick diagnostic"|aria-label="Contact form"/);
  assert.match(html, /aria-controls="mini-diagnostic"/);
  assert.doesNotMatch(html.match(/<form\b[\s\S]*?<\/form>/)?.[0] ?? '', />Symptoms<|name="symptoms"/i);
  assert.ok(result.transformations.some((item) => item.rule === 'sanitize-sensitive-form-wrapper'));
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('drops all legacy form-level accessible-name overrides after standardization', () => {
  const result = repairLegacyTemplate({
    slug: 'form-accessible-name-references',
    niche: 'holistic_medicine',
    files: new Map([['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1>
      <h2 id="outside-sensitive-title">Medical history intake</h2>
      <form id="external-sensitive" aria-labelledby="outside-sensitive-title"><label>Date of birth<input name="dob" type="date"></label></form>
      <form id="removed-title" aria-labelledby="inside-title"><h2 id="inside-title">Send a note</h2><input name="topic"></form>
      <h2 id="safe-contact-title">Contact our team</h2>
      <form id="external-safe" aria-labelledby="safe-contact-title"><input name="topic"></form>
      <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));
  const externalSensitive = html.match(/<form\b(?=[^>]*id="external-sensitive")[\s\S]*?<\/form>/i)?.[0] ?? '';
  const removedTitle = html.match(/<form\b(?=[^>]*id="removed-title")[\s\S]*?<\/form>/i)?.[0] ?? '';
  const externalSafe = html.match(/<form\b(?=[^>]*id="external-safe")[\s\S]*?<\/form>/i)?.[0] ?? '';

  assert.doesNotMatch(externalSensitive, /aria-labelledby/);
  assert.doesNotMatch(removedTitle, /aria-labelledby/);
  assert.doesNotMatch(externalSafe, /aria-labelledby|aria-label=/);
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('standardizes a newsletter form when a sibling link mentions stories', () => {
  const result = repairLegacyTemplate({
    slug: 'testimonial-page-benign-form',
    niche: 'wellness_coach',
    files: new Map([
      ['index.html', '<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['testimonials.html', '<!doctype html><html><head><title>Stories — {{BUSINESS_NAME}}</title></head><body><main><section class="signup"><h1>Share an update</h1><form><input type="email" name="email"><button>Join updates</button></form><a href="testimonials.html">Read Client Stories</a></section><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
    ]),
  });
  const html = String(result.files.get('testimonials.html'));
  assert.match(html, /name="contact"[^>]*data-dc-standard-form="contact"/);
  assert.match(html, /name="name"/);
  assert.match(html, /name="email"/);
  assert.match(html, /name="phone"/);
  assert.match(html, /name="message"/);
  assert.doesNotMatch(html, />Join updates</);
  assert.doesNotMatch(html, /legacy-testimonials/i);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('removes every legacy form endpoint and uses only the audited submission contract', () => {
  const result = repairLegacyTemplate({
    slug: 'legacy-form-actions',
    niche: 'wellness_coach',
    files: new Map([
      ['index.html', '<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><form action="/submit"><input name="email"><button formaction="/alternate">Send</button></form><form action="contact.html"><button>Open contact</button></form><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['contact.html', '<!doctype html><html><head><title>Contact</title></head><body><main><h1>Contact</h1><a href="mailto:{{EMAIL}}">Email</a></main></body></html>'],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.doesNotMatch(html, /\baction=|\bformaction=/);
  assert.equal((html.match(/data-dc-standard-form="contact"/g) ?? []).length, 2);
  assert.equal((html.match(/data-netlify="true"/g) ?? []).length, 2);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('repairs contextual data and blob URLs while retaining an allowed inline raster image', () => {
  const raster = 'data:image/png;base64,AAAA';
  const result = repairLegacyTemplate({
    slug: 'embedded-url-policy',
    niche: 'aromatherapy',
    files: new Map<string, string | Uint8Array>([
      ['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title>
        <link rel="stylesheet" href="data:text/css,body%7Bdisplay:none%7D">
        <style>.safe{background:url("${raster}")}.unsafe{background:url("d\\61 ta:text/html,blocked")}</style>
        </head><body><main><h1>{{BUSINESS_NAME}}</h1><img class="safe" src="${raster}" alt="Abstract texture">
        <img src="data:image/svg+xml,%3Csvg%20onload%3Dalert(1)%3E" alt="Unsafe vector">
        <a href="blob:https://example.test/transient">Unsafe download</a><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`],
      ['assets/css/unsafe.css', `@import url("${raster}");.card{background:url("blob:https://example.test/id")}`],
    ]),
  });
  const html = String(result.files.get('index.html'));
  const css = [...result.files.entries()]
    .filter(([path]) => /\.css$/i.test(path))
    .map(([, value]) => String(value))
    .join('\n');

  assert.match(html, new RegExp(raster.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(html, /data:text\/css|data:image\/svg|blob:https|d\\61\s*ta:/i);
  assert.doesNotMatch(css, /@import\s+url\("data:|blob:https|d\\61\s*ta:/i);
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('makes only title and meta description editable among head metadata', () => {
  const result = repairLegacyTemplate({
    slug: 'editable-seo-metadata',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html><head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <meta name="description" content="A practical introduction to current services."><title>Current services</title>
      </head><body><main><h1>{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));
  const viewport = html.match(/<meta name="viewport"[^>]*>/i)?.[0] ?? '';
  const description = html.match(/<meta name="description"[^>]*>/i)?.[0] ?? '';
  const title = html.match(/<title[^>]*>/i)?.[0] ?? '';

  assert.doesNotMatch(viewport, /data-dc-edit-id|data-dc-edit-attribute/);
  assert.match(description, /data-dc-edit-id="txt_[a-f0-9]{18}"/);
  assert.match(description, /data-dc-edit-attribute="content"/);
  assert.match(title, /data-dc-edit-id="txt_[a-f0-9]{18}"/);
  assert.ok(result.contentPreset.entries.some((entry) => entry.attribute === 'content' && entry.text === 'A practical introduction to current services.'));
  assert.ok(!result.contentPreset.entries.some((entry) => entry.text === 'width=device-width,initial-scale=1'));
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('personalizes generated business-name literals inside customer-visible data attributes', () => {
  const result = repairLegacyTemplate({
    slug: 'data-attribute-business-name',
    niche: 'aromatherapy',
    files: new Map([['index.html', '<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><button data-tip="Local aromatherapy studio, open by appointment">Details</button><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>']]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /data-tip="Local \{\{BUSINESS_NAME\}\}, open by appointment"/);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('removes accessible-label proof, repairs ID references, and keeps site chrome outside main', () => {
  const result = repairLegacyTemplate({
    slug: 'irregular-landmarks-and-proof',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html lang="en"><head><title>Legacy</title></head><body>
      <div class="site-shell"><header><nav aria-labelledby="testimonials-heading"><a href="index.html">Home</a></nav></header>
      <div class="content"><h1 id="testimonials-heading">{{BUSINESS_NAME}}</h1><p>Original service copy remains.</p>
      <section class="stories" aria-label="Client stories"><article class="story"><p class="quote">I was guaranteed a complete transformation.</p></article></section></div>
      <footer><a href="mailto:{{EMAIL}}">Contact</a></footer></div></body></html>`],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.doesNotMatch(html, /Client stories|guaranteed a complete transformation|testimonials-heading/i);
  const renamedHeadingId = html.match(/id="(dc-guidance-[a-f0-9]{10}-heading)"/)?.[1];
  assert.ok(renamedHeadingId);
  assert.match(html, new RegExp(`aria-labelledby="${renamedHeadingId}"`));
  assert.match(html, /data-dc-safe-replacement="neutral-guidance"/);
  assert.match(html, /<header>[\s\S]*<\/header>\s*<main class="content">/);
  assert.match(html, /<\/main>\s*<footer>/);
  const mainMarkup = html.match(/<main[^>]*>[\s\S]*?<\/main>/)?.[0] ?? '';
  assert.doesNotMatch(mainMarkup, /<header>/);
  assert.doesNotMatch(mainMarkup, /<footer>/);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('normalizes legacy accessibility semantics and root-relative CSS assets', () => {
  const result = repairLegacyTemplate({
    slug: 'irregular-accessibility',
    niche: 'aromatherapy',
    files: new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html><head><link rel="stylesheet" href="assets/css/styles.css"></head><body><main><h1>{{BUSINESS_NAME}}</h1><dl class="facts"><div><strong>Duration</strong><div>One hour</div></div></dl><select id="strength"><option>Gentle</option></select><div hidden><div role="dialog"><p>Details</p></div></div><div class="switch"><button role="tab" aria-selected="true">Monthly</button></div><div id="moods" role="list"><span role="listitem">Mellow</span><button>Focused</button></div><ul id="loading">Loading…</ul><ul id="mixed"><li role="listitem">Existing item</li>Loading more…</ul><div role="listbox"><button role="option" aria-selected="true">Morning</button></div><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['assets/css/styles.css', '.hero{background-image:url("/assets/img/pattern.svg")}'],
      ['assets/img/pattern.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /<div class="facts" data-dc-repaired-semantics="definition-list">/);
  assert.doesNotMatch(html, /<select\b|id="strength"/);
  assert.match(html, /role="dialog" aria-label="Information"/);
  assert.match(html, /<button\b(?=[^>]*data-dc-repaired-semantics="tab")/);
  assert.doesNotMatch(html, /role="tab"|aria-selected=/);
  assert.match(html, /<div id="moods" data-dc-repaired-semantics="aria-list">/);
  assert.match(html, /<div id="loading" data-dc-repaired-semantics="list"[^>]*>Loading…<\/div>/);
  assert.match(html, /<div id="mixed" data-dc-repaired-semantics="list"[^>]*><div data-dc-repaired-semantics="listitem"/);
  assert.doesNotMatch(html, /role="(?:tab|list|listitem|listbox|option)"|aria-selected=/);
  assert.match(String(result.files.get('assets/css/styles.css')), /url\("\.\.\/img\/pattern\.svg"\)/);
  assert.match(String(result.files.get('assets/css/dc-repair.css')), /overflow-x:clip/);
  const stylesheetLinks = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g)].map((match) => match[1]);
  assert.deepEqual(stylesheetLinks, ['assets/css/styles.css', 'assets/css/dc-repair.css']);
  assert.ok(result.transformations.some((item) => item.rule === 'normalize-accessibility-semantics'));
});

test('preserves boolean decorative SVG intent for the mobile overflow clamp', () => {
  const result = repairLegacyTemplate({
    slug: 'boolean-decorative-svg',
    niche: 'holistic_medicine',
    files: new Map<string, string>([[
      'index.html',
      '<!doctype html><html><head><title>Practice</title><style>.svg-back{position:absolute;left:6%;width:520px;height:520px}</style></head><body><svg class="svg-back" viewBox="0 0 200 200" aria-hidden><rect width="100%" height="100%"></rect></svg><main><h1>{{BUSINESS_NAME}}</h1><p>Original practice copy.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>',
    ]]),
  });
  const html = String(result.files.get('index.html'));
  const repairCss = String(result.files.get('assets/css/dc-repair.css'));

  assert.match(html, /<svg class="svg-back"[^>]*aria-hidden="true"/);
  assert.match(repairCss, /body>svg\[aria-hidden\]/);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('repairs unnamed commands, hidden focus, fragment images, and mobile decorative overflow without replacing primary copy', () => {
  const result = repairLegacyTemplate({
    slug: 'browser-primary-repairs',
    niche: 'aromatherapy',
    files: new Map<string, string | Uint8Array>([
      ['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body>
        <a class="brand" href="index.html"><svg aria-hidden="true"><text>{{BUSINESS_NAME}}</text></svg></a>
        <main><h1>{{BUSINESS_NAME}}</h1><p>This original service introduction is intentionally long enough to remain visible and must survive deterministic browser remediation unchanged.</p>
        <div id="compSwitchServices" role="button" tabindex="0"><span aria-hidden="true">decorative</span></div>
        <div id="billingToggle" role="switch" tabindex="0"></div>
        <section class="signup" aria-hidden="true"><a href="contact.html">Contact the practice</a></section>
        <img src="#" alt="Editorial placeholder"><picture><source srcset="#"><img src="" alt="Second editorial placeholder"></picture>
        <a href="mailto:{{EMAIL}}">Email the practice</a></main>
        <svg class="page-motif" aria-hidden="true" style="position:absolute;left:6%;width:520px"></svg>
      </body></html>`],
      ['contact.html', '<!doctype html><html><body><main><h1>Contact {{BUSINESS_NAME}}</h1><p>Contact information and an editable introduction for the practice.</p><a href="mailto:{{EMAIL}}">Email</a></main></body></html>'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /class="brand"[^>]*aria-label="\{\{BUSINESS_NAME\}\} home"/);
  assert.match(html, /id="compSwitchServices"[^>]*aria-label="Switch Services"/);
  assert.match(html, /id="billingToggle"[^>]*aria-label="Billing Toggle"/);
  assert.match(html, /<section class="signup"><a href="contact\.html"/);
  assert.doesNotMatch(html, /class="signup"[^>]*aria-hidden/);
  assert.equal((html.match(/src="assets\/img\/dc-placeholder\.svg"/g) ?? []).length, 2);
  assert.match(html, /srcset="assets\/img\/dc-placeholder\.svg"/);
  assert.match(String(result.files.get('assets/css/dc-repair.css')), /body>svg\[aria-hidden\].*max-width:calc\(100vw - 2px\)/);
  assert.match(html, /original service introduction/);
  assert.ok(result.issues.some((issue) => issue.code === 'empty-image-reference-repaired' && issue.resolved));

  const replay = repairLegacyTemplate({ slug: result.manifest.legacySlug, niche: result.manifest.niche, files: result.files });
  assert.equal(replay.files.get('index.html'), result.files.get('index.html'));
});

test('recovers CSS serialized with literal line-break escapes before theme extraction', () => {
  const result = repairLegacyTemplate({
    slug: 'escaped-css-lines',
    niche: 'wellness_coach',
    files: new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><main><h1>{{BUSINESS_NAME}}</h1><p>Editable copy.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['styles.css', ':root{--ink:#123456}\\nbody{color:var(--ink);font-family:Inter, sans-serif}\\n'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const css = String(result.files.get('styles.css'));
  assert.doesNotMatch(css, /\\n/);
  assert.match(css, /var\(--dc-theme-/);
  assert.ok(result.transformations.some((item) => item.rule === 'recover-escaped-css-linebreaks'));
  assert.ok(!result.issues.some((item) => item.code === 'css-parse-fallback'));
});

test('recovers the known malformed margin/background declaration before theme extraction', () => {
  const result = repairLegacyTemplate({
    slug: 'malformed-theme-css',
    niche: 'wellness_coach',
    files: new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><main><h1>{{BUSINESS_NAME}}</h1><p>Editable service copy remains available.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['styles.css', ':root{--bg:#f7fffb;--ink:#112233}body{margin:0;font-family:Inter,system-ui;color:var(--ink);margin:background-color:var(--bg);min-height:100vh}'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const css = String(result.files.get('styles.css'));
  assert.doesNotMatch(css, /margin\s*:\s*background-color/i);
  assert.match(css, /background-color:\s*var\(--bg\)/);
  assert.match(css, /--dc-theme-(?:color|font)_/);
  assert.ok(result.themePreset.tokens.some((token) => token.kind === 'color'));
  assert.ok(result.themePreset.tokens.some((token) => token.kind === 'font'));
  assert.ok(result.transformations.some((item) => item.rule === 'recover-known-malformed-css-declaration'));
  assert.ok(!result.issues.some((item) => item.code === 'css-parse-fallback'));
});

test('recovers bounded malformed legacy declarations without discarding the surrounding design', () => {
  const result = repairLegacyTemplate({
    slug: 'malformed-legacy-declarations',
    niche: 'wellness_coach',
    files: new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><main><h1>{{BUSINESS_NAME}}</h1><p>Editable service copy remains available.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['styles.css', `
        .hero{display:grid:grid-template-columns:1fr;gap:20px;padding:34px}
        .hero p{subtle:color:var(--muted);margin-top:10px}
        .hero-highlights{display:flex;gap:12px,list-style:none;padding:0}
        .quick-meta{display:flex;gap:12px list-style:none;padding:0}
        .body-copy{font-family:Inter,system-ui,Roboto,color:#123456}
        .active{border:box-shadow:0 6px 18px rgba(0,0,0,.08)}
        .secondary{color:var(--ink}
        .ghost{border:1px solid var(--glass-border;color:var(--muted)}
        .pattern{position:fixed;background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><defs><pattern id="p"><rect fill="url(%23g)"/></pattern></defs></svg>');filter:blur(10px)'}
      `],
    ]),
  });
  const css = String(result.files.get('styles.css'));
  assert.match(css, /display:grid;grid-template-columns:1fr/);
  assert.match(css, /\.hero p\{color:var\(--muted\)/);
  assert.match(css, /gap:12px;list-style:none/);
  assert.match(css, /font-family:var\(--dc-theme-font_[^)]+\);color:var\(--dc-theme-color_/);
  assert.match(css, /\.active\{box-shadow:0 6px 18px/);
  assert.match(css, /\.secondary\{color:var\(--ink\)\}/);
  assert.match(css, /\.ghost\{border:1px solid var\(--glass-border\);color:var\(--muted\)\}/);
  assert.match(css, /\.pattern\{position:fixed;background-image:none;filter:blur\(10px\)\}/);
  assert.deepEqual(findUnsafeCssGeneratedContent(css), []);
  assert.ok(result.transformations.some((item) => item.rule === 'recover-known-malformed-css-declaration'));
  assert.ok(!result.issues.some((item) => item.code === 'css-parse-fallback'));
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('moves an orphaned decorative overlay back into its matching container', () => {
  const result = repairLegacyTemplate({
    slug: 'orphan-overlay',
    niche: 'sound_bath',
    files: new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><section class="hero ripple"><h1>{{BUSINESS_NAME}}</h1><p>Editable introduction.</p></section><footer><a href="mailto:{{EMAIL}}">Contact</a></footer><svg class="ripple-svg" aria-hidden="true" viewBox="0 0 10 10"></svg></body></html>'],
      ['styles.css', '.ripple{position:relative;overflow:hidden}.ripple-svg{position:absolute;right:-10%;width:40%}'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /<(?:section|main) class="hero ripple">[\s\S]*<svg class="ripple-svg"[^>]*><\/svg><\/(?:section|main)>/);
  assert.doesNotMatch(html, /<\/footer><svg class="ripple-svg"/);
  assert.ok(result.transformations.some((item) => item.rule === 'relocate-orphan-decorative-overlay'));
});

test('emits a reversible design/content/theme composition', () => {
  const result = fixture();
  const recomposedPages = applyContentPreset(result.design.pages, result.contentPreset);
  assert.equal(recomposedPages['index.html'], result.files.get('index.html'));

  const recomposedStyles = applyThemePreset(result.design.styles, result.themePreset, result.contentPreset.images);
  const css = recomposedStyles['assets/css/styles.css']!;
  assert.equal(css, result.files.get('assets/css/styles.css'));
  assert.match(css, /#336699/);
  assert.match(css, /--dc-theme-color_/);
  assert.match(css, /Inter, sans-serif/);
  assert.match(css, /https:\/\/images\.unsplash\.com\/photo-2/);
  assert.match(css, /dc-placeholder\.svg/);
  assert.doesNotMatch(css, /__DC_IMAGE_/);
  assert.ok(result.contentPreset.entries.length >= 5);
  assert.ok(result.themePreset.tokens.some((token) => token.kind === 'color'));
  assert.ok(result.themePreset.tokens.some((token) => token.kind === 'font'));
});

test('resolves the static selector subset without approximating dynamic targets', () => {
  const document = parse(`<!doctype html><html><body>
    <main class="shell"><i class="lead"></i><section class="panel">
      <div id="target" class="target" data-role="hero featured" lang="en-US" data-key="prefix-NEEDLE-end"></div>
    </section></main>
    <i class="anchor"></i><div id="general" class="general"></div>
  </body></html>`) as unknown as HtmlNode;
  const ids = (selector: string) => resolveStaticSelectorTargets(document, selector)?.map((node) => node.attrs?.find((attr) => attr.name === 'id')?.value);

  assert.deepEqual(ids('.shell > .lead + .panel .target'), ['target']);
  assert.deepEqual(ids('.anchor ~ .general'), ['general']);
  assert.deepEqual(ids('[data-role~="featured"][lang|="en"][data-key^="prefix-"][data-key$="-end"][data-key*="needle" i]'), ['target']);
  assert.equal(resolveStaticSelectorTargets(document, '.target::before'), undefined);
  assert.equal(resolveStaticSelectorTargets(document, '.target:hover'), undefined);
  assert.equal(resolveStaticSelectorTargets(document, '.escaped\\:class'), undefined);
});

test('advertises only page-scoped CSS backgrounds with one proven DOM target', () => {
  const css = [
    '[data-art="attribute"]{background-image:url("https://images.unsplash.com/attribute")}',
    '.shell > .lead + .panel .target{background:url("https://images.unsplash.com/combinator") center/cover}',
    '.anchor ~ .general{background-image:url("https://images.unsplash.com/sibling")}',
    '.pseudo::before{background-image:url("https://images.unsplash.com/pseudo")}',
    '.repeat{background-image:url("https://images.unsplash.com/repeated")}',
    '.missing{background-image:url("https://images.unsplash.com/missing")}',
    '.conflict{background-image:url("https://images.unsplash.com/conflict-one")}',
    '[data-conflict]{background-image:url("https://images.unsplash.com/conflict-two")}',
  ].join('\n');
  const result = repairLegacyTemplate({
    slug: 'css-background-contract',
    niche: 'wellness_coach',
    files: new Map<string, string>([
      ['index.html', `<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><main>
        <h1>{{BUSINESS_NAME}}</h1><section data-art="attribute">Attribute artwork</section>
        <div class="shell"><i class="lead"></i><section class="panel"><div class="target">Combination artwork</div></section></div>
        <i class="anchor"></i><div class="general">Sibling artwork</div><div class="pseudo">Pseudo artwork</div>
        <div class="repeat">First repeated target</div><div class="repeat">Second repeated target</div>
        <div class="conflict" data-conflict>Conflicting artwork</div><a href="mailto:{{EMAIL}}">Contact</a>
      </main></body></html>`],
      ['about.html', `<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><main>
        <h1>About {{BUSINESS_NAME}}</h1><section data-art="attribute">Shared attribute artwork</section>
        <a href="mailto:{{EMAIL}}">Contact</a>
      </main></body></html>`],
      ['styles.css', css],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const cssImages = result.contentPreset.images.filter((image) => image.attribute === 'css-url');
  const uniqueSlots = new Set(cssImages.map((image) => image.slotId));

  assert.equal(cssImages.length, 4, JSON.stringify(cssImages, null, 2));
  assert.equal(uniqueSlots.size, 3);
  assert.deepEqual(cssImages.filter((image) => image.source.endsWith('/attribute')).map((image) => image.page).sort(), ['about.html', 'index.html']);
  assert.ok(cssImages.every((image) => image.stylesheet === 'styles.css'));
  for (const image of cssImages) {
    const html = String(result.files.get(image.page));
    assert.equal((html.match(new RegExp(`data-dc-image-id="${image.slotId}"`, 'g')) ?? []).length, 1);
  }

  const designCss = result.design.styles['styles.css']!;
  assert.equal((designCss.match(/__DC_IMAGE_css_/g) ?? []).length, 3);
  assert.match(designCss, /images\.unsplash\.com\/pseudo/);
  assert.match(designCss, /images\.unsplash\.com\/repeated/);
  assert.match(designCss, /images\.unsplash\.com\/missing/);
  assert.match(designCss, /images\.unsplash\.com\/conflict-one/);
  assert.match(designCss, /images\.unsplash\.com\/conflict-two/);
  assert.equal(applyThemePreset(result.design.styles, result.themePreset, result.contentPreset.images)['styles.css'], result.files.get('styles.css'));
  assert.equal(applyContentPreset(result.design.pages, result.contentPreset)['index.html'], result.files.get('index.html'));
  const binding = result.transformations.find((item) => item.rule === 'bind-css-background-edit-slots');
  assert.equal(binding?.count, 4);
  assert.match(binding?.detail ?? '', /editableSlots=3;unsupported=1;multiple=1;conflicts=2;unmatched=1/);
  assert.equal(result.qualityReceipt.checks.find((check) => check.code === 'stable-image-ids')?.pass, true);
});

test('suppresses unreachable and decorative edit slots without changing their visual CSS', () => {
  const result = repairLegacyTemplate({
    slug: 'reachable-slot-contract',
    niche: 'wellness_coach',
    files: new Map<string, string | Uint8Array>([
      ['index.html', `<!doctype html><html><head>
        <title>Reachable slot contract</title><link rel="stylesheet" href="assets/css/styles.css">
      </head><body><main><h1>{{BUSINESS_NAME}}</h1>
        <section class="mobile-hidden"><p data-dc-edit-id="stale-hidden">Hidden navigation label</p><img src="assets/img/hidden.svg" alt="Hidden artwork"></section>
        <p style="pointer-events:none" data-pb-edit-id="stale-pointer">Pointerless copy</p>
        <span hidden aria-label="Hidden attribute copy">Hidden attribute copy</span>
        <img class="brand-pattern" data-pb-image-id="stale-pattern" src="assets/img/pattern.svg" alt="Pattern artwork">
        <picture class="editorial-picture"><source media="(min-width: 700px)" srcset="assets/img/editorial-wide.svg"><img src="assets/img/editorial.svg" alt="Editorial artwork"></picture>
        <picture class="incomplete-picture"><source hidden srcset="assets/img/hidden-source.svg"><img src="assets/img/incomplete.svg" alt="Incomplete responsive artwork"></picture>
        <video controls><source data-dc-image-id="stale-video" src="assets/video/intro.mp4" type="video/mp4"></video>
        <button type="button" style="background-image:url('assets/img/button.svg')">Protected action</button>
        <section class="meaningful-cover">Meaningful background</section>
        <section class="hidden-cover">Hidden background</section>
        <section class="pointerless-cover">Pointerless background</section>
        <section class="decorative-pattern">Decorative background</section>
        <a href="mailto:{{EMAIL}}">Contact</a>
      </main></body></html>`],
      ['assets/css/styles.css', [
        'body{background-image:url("../img/body-hero.svg")}',
        '.mobile-hidden{display:none}',
        '.meaningful-cover{background-image:url("../img/meaningful.svg")}',
        '.hidden-cover{display:none;background-image:url("../img/hidden-cover.svg")}',
        '.pointerless-cover{pointer-events:none;background-image:url("../img/pointerless-cover.svg")}',
        '.decorative-pattern{background-image:url("../img/pattern.svg")}',
      ].join('\n')],
      ['assets/img/body-hero.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/img/meaningful.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/img/hidden.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/img/hidden-cover.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/img/pointerless-cover.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/img/pattern.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/img/editorial-wide.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/img/editorial.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/img/hidden-source.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/img/incomplete.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/img/button.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
      ['assets/video/intro.mp4', new Uint8Array([0, 0, 0, 0])],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });

  const html = String(result.files.get('index.html'));
  const document = parse(html) as unknown as HtmlNode;
  const attr = (selector: string, name: string): string | undefined => (
    resolveStaticSelectorTargets(document, selector)?.[0]?.attrs?.find((item) => item.name === name)?.value
  );
  for (const selector of [
    '.mobile-hidden p',
    '.mobile-hidden img',
    '[hidden]',
    '.brand-pattern',
    'video source',
    '.hidden-cover',
    '.pointerless-cover',
  ]) {
    assert.equal(attr(selector, 'data-dc-edit-id'), undefined, `${selector} retained a text slot`);
    assert.equal(attr(selector, 'data-dc-image-id'), undefined, `${selector} retained an image slot`);
  }
  for (const selector of ['.incomplete-picture source', '.incomplete-picture img', 'button', '.decorative-pattern']) {
    assert.equal(attr(selector, 'data-dc-image-id'), undefined, `${selector} retained an image slot`);
  }
  assert.equal(attr('.meaningful-cover', 'data-dc-image-id')?.startsWith('css_'), true);
  assert.equal(attr('body', 'data-dc-image-id')?.startsWith('css_'), true);
  assert.equal(attr('.editorial-picture source', 'data-dc-image-id')?.startsWith('img_'), true);
  assert.equal(attr('.editorial-picture img', 'data-dc-image-id')?.startsWith('img_'), true);

  const sources = result.contentPreset.images.map((image) => image.source);
  assert.ok(sources.some((source) => source.endsWith('/body-hero.svg')));
  assert.ok(sources.some((source) => source.endsWith('/meaningful.svg')));
  for (const suppressed of ['hidden.svg', 'hidden-cover.svg', 'pointerless-cover.svg', 'pattern.svg', 'hidden-source.svg', 'incomplete.svg', 'button.svg']) {
    assert.equal(sources.some((source) => source.endsWith(`/${suppressed}`)), false, `${suppressed} remained advertised`);
  }
  const designCss = result.design.styles['assets/css/styles.css']!;
  assert.match(designCss, /hidden-cover\.svg/);
  assert.match(designCss, /pointerless-cover\.svg/);
  assert.match(designCss, /pattern\.svg/);
  assert.doesNotMatch(designCss, /__DC_IMAGE_[^)]*(?:hidden-cover|pointerless-cover|pattern)/);

  const suppressions = result.transformations.filter((item) => item.rule === 'suppress-unreachable-customer-slots');
  assert.ok(suppressions.some((item) => item.file === 'index.html' && /hiddenEditSlots=[1-9]/.test(item.detail ?? '')));
  assert.ok(suppressions.some((item) => item.file === 'index.html' && /decorativeImageSlots=[1-9]/.test(item.detail ?? '')));
  assert.ok(suppressions.some((item) => item.file === '*' && /hiddenEditIds=[1-9]/.test(item.detail ?? '')));
  const binding = result.transformations.find((item) => item.rule === 'bind-css-background-edit-slots');
  assert.match(binding?.detail ?? '', /suppressedDecorative=1/);
  assert.match(binding?.detail ?? '', /suppressedHidden=1/);
  assert.match(binding?.detail ?? '', /suppressedPointer=1/);
  assert.equal(result.qualityReceipt.status, 'passed', JSON.stringify(result.qualityReceipt.checks, null, 2));
});

test('marks compiler-v3 pages and preserves decorative overlays without letting them block customer edits', () => {
  const result = repairLegacyTemplate({
    slug: 'decorative-hit-layer',
    niche: 'aromatherapy',
    files: new Map<string, string | Uint8Array>([
      ['index.html', `<!doctype html><html lang="en"><head><title>Legacy</title><link rel="stylesheet" href="styles.css"></head><body>
        <svg class="pattern" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"></path></svg>
        <main><section class="hero"><div class="hero-bg"><img src="assets/img/pattern.svg" alt="Decorative pattern" aria-hidden="true"><div class="hero-gradient"></div></div>
        <div class="hero-inner"><h1>{{BUSINESS_NAME}}</h1><p>Visible customer introduction.</p></div></section>
        <section class="booking-layout"><div><h2>Reserve a time</h2><p>Choose a practical next step and ask about current availability.</p></div><aside><h2>Before you book</h2><p>Review the service details and bring any questions to the conversation.</p></aside></section>
        <section id="content-row" style="margin-top:18px;display:flex;gap:12px"><div><h2>How it works</h2><p>Review the practical guidance and choose a next step that fits your current priorities and schedule.</p></div><div style="flex:1"><h2>Current workshops</h2><p>Ask which educational sessions are currently available and what to expect before reserving a place.</p></div></section>
        <section id="compact-row" style="display:flex"><a href="#details" style="flex:1">Details</a><a href="mailto:{{EMAIL}}">Contact</a></section>
        <section id="inline-grid" style="display:grid;grid-template-columns:1fr 320px;gap:14px"><article><h2>What to expect</h2><p>Review the preparation guidance before choosing a current service.</p></article><aside><h2>Questions</h2><p>Contact the studio for practical details.</p></aside></section>
        <aside id="inline-utility" style="position:fixed;right:12px;bottom:12px"><a href="contact.html">Open contact options</a></aside>
        <div id="inline-dialog" style="display:none;position:fixed;inset:0"><p>Closed dialog content</p></div>
        <section class="top"><article><h2>Flexible introduction</h2><p>Readable content must retain a useful width beside a fixed-width supporting panel.</p></article><aside>Supporting details</aside></section>
        <aside class="cart"><a href="contact.html">Utility panel</a></aside><div class="modal">Transient dialog</div>
        <div class="editorial-background"></div></main>
        <footer><nav aria-label="Footer"><a href="mailto:{{EMAIL}}">Contact</a></nav><nav class="footer-nav">Privacy Terms</nav></footer>
      </body></html>`],
      ['styles.css', '.pattern{position:fixed;inset:0}.hero{position:relative}.hero-bg,.hero-gradient{position:absolute;inset:0}.hero-inner{position:relative}.booking-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:1rem}.top{display:flex;gap:1rem}.top>article{flex:1}.top>aside{width:360px}.cart{position:fixed;right:1rem;bottom:1rem}.hover-info{position:fixed;pointer-events:none}.modal{position:fixed;inset:0}.editorial-background{width:10rem;height:10rem;background-image:url("assets/img/editorial.svg")}'],
      ['assets/img/pattern.svg', '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>'],
      ['assets/img/editorial.svg', '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });

  const html = String(result.files.get('index.html'));
  assert.match(html, /<html[^>]*data-dc-catalog-version="3"/);
  assert.match(html, /class="hero-bg"[^>]*data-dc-decoration="pointer-layer"[^>]*aria-hidden="true"/);
  assert.match(html, /class="hero-gradient"[^>]*data-dc-decoration="pointer-layer"[^>]*aria-hidden="true"/);
  assert.match(html, /<svg class="pattern"[^>]*data-dc-decoration="pointer-layer"[^>]*aria-hidden="true"/);
  assert.match(html, /<img[^>]*pattern\.svg[^>]*data-dc-decoration="pointer-layer"/);
  assert.doesNotMatch(html, /<img[^>]*pattern\.svg[^>]*data-dc-image-id/);
  assert.match(html, /class="editorial-background"[^>]*data-dc-image-id="css_[a-f0-9]{18}"/);
  assert.doesNotMatch(html, /class="editorial-background"[^>]*data-dc-decoration/);
  assert.doesNotMatch(html, /<nav[^>]*aria-label="Footer"[^>]*data-dc-edit-id/);
  assert.match(html, /<nav class="footer-nav"><span data-dc-edit-wrapper="direct-text" data-dc-edit-id="txt_[a-f0-9]{18}">Privacy Terms<\/span><\/nav>/);
  assert.match(html, /id="content-row"[^>]*data-dc-mobile-stack="true"/);
  assert.doesNotMatch(html, /id="compact-row"[^>]*data-dc-mobile-stack/);
  assert.match(html, /id="inline-grid"[^>]*data-dc-mobile-grid-stack="true"/);
  assert.match(html, /id="inline-utility"[^>]*data-dc-mobile-fixed-flow="true"/);
  assert.doesNotMatch(html, /id="inline-dialog"[^>]*data-dc-mobile-fixed-flow/);
  assert.match(String(result.files.get('assets/css/dc-repair.css')), /\[data-dc-decoration="pointer-layer"\]\{pointer-events:none!important\}/);
  assert.match(String(result.files.get('assets/css/dc-repair.css')), /\[data-dc-mobile-stack="true"\]\{flex-wrap:wrap!important\}/);
  assert.match(String(result.files.get('assets/css/dc-repair.css')), /body \*\{[^}]*flex-wrap:wrap!important/);
  assert.match(String(result.files.get('assets/css/dc-repair.css')), /\[data-dc-mobile-grid-stack="true"\]\{grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(String(result.files.get('assets/css/dc-repair.css')), /\[data-dc-mobile-fixed-flow="true"\]\{position:static!important/);
  const repairedCss = String(result.files.get('styles.css'));
  assert.match(repairedCss, /dc-repair-mobile-grid/);
  assert.match(repairedCss, /@media \(max-width:600px\)[^{]*\{\.booking-layout\{grid-template-columns:minmax\(0,1fr\)\s*!important;grid-auto-flow:row\s*!important\}\}/);
  assert.match(repairedCss, /dc-repair-mobile-content-flex/);
  assert.match(repairedCss, /\.top>\*\{flex:1 1 min\(100%,18rem\)\s*!important;min-width:min\(100%,18rem\)\s*!important\}/);
  assert.match(repairedCss, /dc-repair-mobile-fixed-flow/);
  assert.match(repairedCss, /\.cart\{position:static\s*!important;inset:auto\s*!important;transform:none\s*!important;z-index:auto\s*!important;margin-block:1rem\s*!important\}/);
  assert.doesNotMatch(repairedCss, /\.pattern\{position:static/);
  assert.doesNotMatch(repairedCss, /\.hover-info\{position:static/);
  assert.doesNotMatch(repairedCss, /\.modal\{position:static/);
  assert.ok(result.transformations.some((item) => item.rule === 'make-decorative-layers-pointer-transparent'));
  assert.ok(result.transformations.some((item) => item.rule === 'make-inline-flex-content-responsive'));
  assert.ok(result.transformations.some((item) => item.rule === 'stack-fixed-grid-on-mobile'));
  assert.ok(result.transformations.some((item) => item.rule === 'stack-inline-grid-on-mobile'));
  assert.ok(result.transformations.some((item) => item.rule === 'stack-content-flex-on-mobile'));
  assert.ok(result.transformations.some((item) => item.rule === 'flow-fixed-content-on-mobile'));
  assert.ok(result.transformations.some((item) => item.rule === 'flow-inline-fixed-content-on-mobile'));
  assert.equal(result.qualityReceipt.status, 'passed', JSON.stringify(result.qualityReceipt.checks, null, 2));
});

test('flows only visible fixed utility selectors on mobile and remains stylesheet-idempotent', () => {
  const source = [
    '.cart{position:fixed;right:1rem;bottom:1rem}',
    'body::before{position:fixed;inset:0}',
    '.pattern{position:fixed;inset:0}',
    '.hover-info{position:fixed;pointer-events:none}',
    '.hidden-panel{position:fixed;display:none}',
    '.modal{position:fixed;inset:0}',
  ].join('');
  const first = repairStylesheet(source, 'styles.css');
  const second = repairStylesheet(first.css, 'styles.css');

  assert.match(first.css, /dc-repair-mobile-fixed-flow/);
  assert.match(first.css, /\.cart\{position:static\s*!important/);
  for (const selector of ['body::before', '.pattern', '.hover-info', '.hidden-panel', '.modal']) {
    assert.doesNotMatch(first.css, new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{position:static`));
  }
  assert.deepEqual(
    first.transformations.filter((item) => item.rule === 'flow-fixed-content-on-mobile').map((item) => item.count),
    [1],
  );
  assert.equal(second.css, first.css);
  assert.equal(second.transformations.some((item) => item.rule === 'flow-fixed-content-on-mobile'), false);
});

test('restores only header navigation that has no working responsive controller', () => {
  const result = repairLegacyTemplate({
    slug: 'mobile-navigation-fallback',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html lang="en"><head><title>Navigation</title><style>
      @media(max-width:900px){header nav,header nav a,header nav ul{display:none}}
      </style></head><body><header>
      <nav id="orphan-nav"><a href="index.html">Home</a><a href="contact.html">Contact</a></nav>
      <nav id="controlled-nav"><button type="button" aria-expanded="false" aria-controls="controlled-list">Menu</button>
        <ul id="controlled-list"><li><a href="index.html">Home</a></li><li><a href="contact.html">Contact</a></li></ul></nav>
      </header><main><h1>{{BUSINESS_NAME}}</h1><p>Practical information about current services and how to contact the practice.</p></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));
  const css = String(result.files.get('assets/css/dc-repair.css'));

  assert.match(html, /<nav id="orphan-nav"[^>]*data-dc-mobile-nav-fallback="true"/);
  assert.doesNotMatch(html, /<nav id="controlled-nav"[^>]*data-dc-mobile-nav-fallback/);
  assert.match(css, /\[data-dc-mobile-nav-fallback="true"\][^{]*\{display:flex!important/);
  assert.ok(result.transformations.some((item) => item.rule === 'restore-orphaned-mobile-navigation'));
  assert.equal(result.qualityReceipt.status, 'passed', JSON.stringify(result.qualityReceipt.checks, null, 2));
});

test('applies only stylesheet-local theme variables to avoid quadratic artifact growth', () => {
  const preset = {
    id: 'theme-size-test',
    legacySlug: 'theme-size-test',
    tokens: [
      { id: 'one', kind: 'color' as const, value: '#111111' },
      { id: 'two', kind: 'color' as const, value: '#eeeeee' },
    ],
    fontImports: [],
    hash: 'hash',
  };
  const output = applyThemePreset({
    'one.css': '.one{color:var(--dc-theme-one)}',
    'two.css': '.two{color:var(--dc-theme-two)}',
  }, preset);
  assert.match(output['one.css']!, /--dc-theme-one:#111111/);
  assert.doesNotMatch(output['one.css']!, /--dc-theme-two/);
  assert.match(output['two.css']!, /--dc-theme-two:#eeeeee/);
  assert.doesNotMatch(output['two.css']!, /--dc-theme-one/);
});

test('rejects corrupt resumed theme presets before CSS interpolation', () => {
  const first = fixture('theme-resume-integrity');
  const files = new Map(first.files);
  const preset = JSON.parse(String(files.get('.dailyclarity/theme-preset.json'))) as {
    tokens: Array<{ kind: string; value: string }>;
  };
  const color = preset.tokens.find((token) => token.kind === 'color');
  assert.ok(color);
  color.value = '#fff;}body{display:none';
  files.set('.dailyclarity/theme-preset.json', JSON.stringify(preset));

  assert.throws(
    () => repairLegacyTemplate({
      slug: 'theme-resume-integrity',
      niche: 'wellness_coach',
      files,
    }),
    /prior theme preset.*unsafe token/i,
  );
  assert.throws(
    () => applyThemePreset(
      { 'styles.css': '.card{color:var(--dc-theme-corrupt)}' },
      {
        id: 'theme-corrupt',
        legacySlug: 'theme-corrupt',
        tokens: [{ id: 'corrupt', kind: 'color', value: '#fff;}body{display:none' }],
        fontImports: [],
        hash: 'corrupt',
      },
    ),
    /unsafe token/i,
  );
  assert.throws(
    () => applyThemePreset(
      { 'styles.css': '.card{font-family:var(--dc-theme-font)}' },
      {
        id: 'theme-corrupt-import',
        legacySlug: 'theme-corrupt-import',
        tokens: [{ id: 'font', kind: 'font', value: 'Inter, sans-serif' }],
        fontImports: ['@import "https://fonts.googleapis.com.attacker.invalid/tracker.css";'],
        hash: 'corrupt',
      },
    ),
    /unsafe font import/i,
  );
});

test('keeps nested image and alt slots independently editable and exactly recomposable', () => {
  const result = repairLegacyTemplate({
    slug: 'nested-editable-image',
    niche: 'wellness_coach',
    files: new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html lang="en"><head><title>Legacy</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><a class="profile" href="about.html">Meet the practitioner <img src="assets/img/profile.svg" alt="Portrait of the practitioner"></a><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['about.html', '<!doctype html><html lang="en"><head><title>About</title></head><body><main><h1>About {{BUSINESS_NAME}}</h1><a href="index.html">Home</a></main></body></html>'],
      ['assets/img/profile.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const repaired = String(result.files.get('index.html'));
  const imageId = repaired.match(/<img[^>]*data-dc-image-id="([^"]+)"/)?.[1];
  const altEditId = repaired.match(/<img[^>]*data-dc-edit-id="([^"]+)"/)?.[1];
  assert.ok(imageId);
  assert.ok(altEditId);
  assert.ok(result.contentPreset.images.some((image) => image.slotId === imageId && image.source === 'assets/img/profile.svg'));
  assert.ok(result.contentPreset.entries.some((entry) => entry.nodeId === altEditId && entry.attribute === 'alt' && entry.text === 'Portrait of the practitioner'));
  assert.equal(applyContentPreset(result.design.pages, result.contentPreset)['index.html'], repaired);
  const candidate = {
    fingerprint: result.fingerprint,
    catalogTemplate: result.catalogTemplate,
    design: result.design,
    contentPreset: result.contentPreset,
    themePreset: result.themePreset,
  };
  assert.deepEqual(checkCompositionCompatibility(candidate, candidate).issues, []);
  assert.equal(buildDedupeClusters([candidate]).length, 1);
});

test('emits only leaf text slots while preserving navigation and form descendants', () => {
  const source = () => repairLegacyTemplate({
    slug: 'leaf-edit-contract',
    niche: 'wellness_coach',
    files: new Map<string, string | Uint8Array>([
      ['index.html', `<!doctype html><html lang="en"><head><title>Legacy</title></head><body>
        <header><nav>Explore <a href="about.html"><strong>About us</strong></a> · <a href="mailto:{{EMAIL}}">Email</a></nav></header>
        <main><h1>{{BUSINESS_NAME}}</h1><p>Tell us about your current priorities.</p>
        <button type="button"><svg aria-hidden="true" viewBox="0 0 1 1"><path d="M0 0h1v1z"></path></svg> Open menu</button>
        <a href="mailto:{{EMAIL}}">Contact</a></main>
        <form id="contact" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact">
          <label>Name <input name="name" required aria-label="Full name" placeholder="Enter your name"></label>
          <label>Email <input type="email" name="email" required></label>
          <label>Phone <input type="tel" name="phone"></label>
          <label>Message <textarea name="message" required aria-label="Inquiry message" placeholder="How can we help?"></textarea></label>
          <button type="submit">Send</button></form>
      </body></html>`],
      ['about.html', '<!doctype html><html lang="en"><head><title>About</title></head><body><main><h1>About {{BUSINESS_NAME}}</h1><a href="index.html">Home</a><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const first = source();
  const second = source();
  const html = String(first.files.get('index.html'));
  const document = parse(html) as unknown as HtmlNode;
  const targets: HtmlNode[] = [];
  const collect = (node: HtmlNode): void => {
    if (node.attrs?.some((attr) => attr.name === 'data-dc-edit-id')) targets.push(node);
    for (const child of node.childNodes ?? []) collect(child);
  };
  collect(document);

  assert.ok(targets.length > 0);
  for (const target of targets) {
    const attributeSlot = target.attrs?.some((attr) => attr.name === 'data-dc-edit-attribute');
    if (!attributeSlot) {
      assert.equal(
        (target.childNodes ?? []).some((child) => Boolean(child.tagName)),
        false,
        `text slot on <${target.tagName}> owns element descendants`,
      );
    }
  }
  assert.match(html, /<nav[^>]*><span data-dc-edit-wrapper="direct-text" data-dc-edit-id="txt_[a-f0-9]{18}">Explore <\/span><a href="about\.html"><strong data-dc-edit-id="txt_[a-f0-9]{18}">About us<\/strong><\/a> · <a href="mailto:\{\{EMAIL\}\}" data-dc-edit-id="txt_[a-f0-9]{18}">Email<\/a><\/nav>/);
  assert.doesNotMatch(html, /data-dc-edit-wrapper="direct-text"[^>]*> · <\/span>/);
  assert.match(html, /<label><span data-dc-edit-wrapper="direct-text" data-dc-edit-id="txt_[a-f0-9]{18}">Your name <\/span><input name="name" autocomplete="name" required="">/);
  assert.doesNotMatch(html, /<input[^>]*data-dc-edit-id=/);
  assert.match(html, /<textarea name="message" rows="5" required=""><\/textarea>/);
  assert.doesNotMatch(html, /<textarea[^>]*data-dc-edit-id=/);
  assert.equal(first.contentPreset.entries.some((entry) => entry.attribute === 'placeholder'), false);
  assert.equal(applyContentPreset(first.design.pages, first.contentPreset)['index.html'], html);
  assert.equal(String(second.files.get('index.html')), html, 'leaf wrappers and IDs must be deterministic');
  assert.ok(first.transformations.some((item) => item.rule === 'wrap-direct-editable-text'));
  assert.match(html, /href="about\.html"/);
  assert.match(html, /<form\b(?=[^>]*\bid="contact")/);
  assert.match(html, /<input\b[^>]*name="name"/);
  assert.match(html, /<textarea\b[^>]*name="message"/);
});

test('uses one real element slot for responsive img and source candidates', () => {
  const result = repairLegacyTemplate({
    slug: 'responsive-image-slots',
    niche: 'wellness_coach',
    files: new Map<string, string>([
      ['index.html', `<!doctype html><html><body><main><h1>{{BUSINESS_NAME}}</h1><picture>
        <source media="(min-width: 50rem)" srcset="https://images.example.test/wide.webp 1x, https://images.example.test/wide-2x.webp 2x">
        <img src="https://images.example.test/hero.webp" srcset="https://images.example.test/hero.webp 1x, https://images.example.test/hero-2x.webp 2x" alt="A calm workspace">
      </picture><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const html = String(result.files.get('index.html'));
  const elementIds = [...html.matchAll(/<(?:source|img)\b[^>]*data-dc-image-id="([^"]+)"/g)].map((match) => match[1]!);
  const responsiveImages = result.contentPreset.images.filter((image) => image.page === 'index.html' && image.kind === 'image');

  assert.equal(elementIds.length, 2);
  assert.equal(new Set(elementIds).size, 2);
  assert.equal(responsiveImages.length, 2);
  assert.deepEqual(new Set(responsiveImages.map((image) => image.slotId)), new Set(elementIds));
  assert.ok(responsiveImages.every((image) => !image.slotId.endsWith('_srcset')));
  assert.equal(responsiveImages.find((image) => image.attribute === 'srcset')?.source, 'https://images.example.test/wide.webp 1x, https://images.example.test/wide-2x.webp 2x');
  assert.equal(responsiveImages.find((image) => image.attribute === 'src')?.srcset, 'https://images.example.test/hero.webp 1x, https://images.example.test/hero-2x.webp 2x');
  assert.equal(applyContentPreset(result.design.pages, result.contentPreset)['index.html'], html);
  assert.equal(result.qualityReceipt.checks.find((check) => check.code === 'stable-image-ids')?.pass, true);
});

test('composition compatibility follows the visible leaf slot when an aria label shares its element', () => {
  const result = repairLegacyTemplate({
    slug: 'nested-editable-label',
    niche: 'aromatherapy',
    files: new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html lang="en"><head><title>Legacy</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><a href="{{PRIMARY_CTA_URL}}"><button aria-label="Book a session">{{PRIMARY_CTA_LABEL}}</button></a><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const repaired = String(result.files.get('index.html'));
  const nestedId = repaired.match(/<button[^>]*data-dc-edit-id="([^"]+)"/)?.[1];
  assert.ok(nestedId);
  assert.match(repaired, /<button[^>]*aria-label="Book a session"[^>]*data-dc-edit-id="[^"]+"[^>]*>\{\{PRIMARY_CTA_LABEL\}\}<\/button>/);
  assert.ok(result.contentPreset.entries.some((entry) => entry.nodeId === nestedId && !entry.attribute && entry.text === '{{PRIMARY_CTA_LABEL}}'));
  assert.equal(applyContentPreset(result.design.pages, result.contentPreset)['index.html'], repaired);

  const candidate = {
    fingerprint: result.fingerprint,
    catalogTemplate: result.catalogTemplate,
    design: result.design,
    contentPreset: result.contentPreset,
    themePreset: result.themePreset,
  };
  assert.deepEqual(checkCompositionCompatibility(candidate, candidate).issues, []);
  assert.equal(buildDedupeClusters([candidate]).length, 1);

  const withOrphan = {
    ...candidate,
    contentPreset: {
      ...candidate.contentPreset,
      entries: [
        ...candidate.contentPreset.entries,
        { nodeId: 'txt_orphan', page: 'index.html', html: 'Orphan', text: 'Orphan' },
      ],
    },
  };
  assert.match(checkCompositionCompatibility(withOrphan, withOrphan).issues.join(';'), /editable:extra:index\.html.*txt_orphan/);
});

test('repair output is idempotent apart from source-linked receipt identity', () => {
  const first = fixture();
  const second = repairLegacyTemplate({
    slug: first.manifest.legacySlug,
    niche: first.manifest.niche,
    files: first.files,
  });
  assert.equal(second.files.get('index.html'), first.files.get('index.html'));
  assert.deepEqual(second.editIds, first.editIds);
  assert.deepEqual(second.imageIds, first.imageIds);
  assert.equal(second.contentPreset.hash, first.contentPreset.hash);
  assert.equal(second.themePreset.hash, first.themePreset.hash);
  assert.equal(second.design.id, first.design.id);
});

test('receipt lineage uses the explicitly selected compiler rule version', () => {
  const result = repairLegacyTemplate({
    slug: 'custom-rule-lineage',
    niche: 'wellness_coach',
    ruleVersion: 'legacy-rehab-test-custom',
    files: new Map([['index.html', '<!doctype html><html><body><main><h1>{{BUSINESS_NAME}}</h1><p>Editable copy.</p><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>']]),
  });
  assert.equal(result.qualityReceipt.ruleVersion, 'legacy-rehab-test-custom');
});

test('a later remediation style cannot overwrite an existing externalized stylesheet', () => {
  const first = fixture('remediation-style');
  const firstHtml = String(first.files.get('index.html'));
  const originalImport = firstHtml.match(/@import url\("(\.dc-inline-[a-f0-9]+\.css)"\)/)?.[1];
  assert.ok(originalImport);
  assert.match(String(first.files.get(originalImport)), /\.card\s*\{/);

  const withRemediation = new Map(first.files);
  withRemediation.set(
    'index.html',
    firstHtml.replace('</head>', '<style id="dc-a11y-contrast-overrides">@media(max-width:600px){.card{color:#111827!important}\n}</style></head>'),
  );
  const second = repairLegacyTemplate({
    slug: first.manifest.legacySlug,
    niche: first.manifest.niche,
    files: withRemediation,
  });
  const imports = [...String(second.files.get('index.html')).matchAll(/@import url\("(\.dc-inline-[a-f0-9]+\.css)"\)/g)]
    .map((match) => match[1]!);

  assert.equal(new Set(imports).size, 1);
  assert.ok(imports.includes(originalImport));
  assert.match(String(second.files.get(originalImport)), /\.card\s*\{/);
  assert.match(String(second.files.get('index.html')), /<style id="dc-a11y-contrast-overrides">@media\(max-width:600px\)\{\.card\{color:#111827!important}\s*}<\/style>/);
  assert.doesNotMatch(String(second.files.get('index.html')), /dc-a11y-contrast-overrides[^<]*@import/i);

  const third = repairLegacyTemplate({
    slug: second.manifest.legacySlug,
    niche: second.manifest.niche,
    files: second.files,
  });
  assert.equal(third.files.get('index.html'), second.files.get('index.html'));
  assert.equal(second.qualityReceipt.status, 'passed');
  assert.equal(third.qualityReceipt.status, 'passed');
});

test('reconstructs a missing homepage without losing the source page', () => {
  const html = SOURCE_HTML.replace('<title>Legacy practice</title>', '<title>Contact</title>');
  const result = repairLegacyTemplate({
    slug: 'missing-home',
    niche: 'aromatherapy',
    files: new Map([['contact.html', html], ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Wellness Studio', EMAIL: 'hello@example.com' })]]),
  });
  assert.equal(result.files.has('contact.html'), true);
  assert.equal(result.files.has('index.html'), true);
  assert.ok(result.transformations.some((item) => item.rule === 'reconstruct-missing-homepage'));
  assert.match(String(result.files.get('index.html')), /data-dc-rehabilitated-role="home"/);
  assert.doesNotMatch(String(result.files.get('index.html')), /data-dc-rehabilitated-role="contact"/);
});

test('all twenty role adapters emit distinct editable page bodies', () => {
  const rendered = new Set<string>();
  for (const role of LEGACY_ROLE_ADAPTERS) {
    const html = adaptLegacyPageShell(SOURCE_HTML, role, 'wellness_coach');
    assert.match(html, new RegExp(`data-dc-rehabilitated-role="${role}"`));
    assert.match(html, new RegExp(`data-dc-page-role="${role}"`));
    rendered.add(html);
  }
  assert.equal(rendered.size, 20);
  assert.match(adaptLegacyPageShell(SOURCE_HTML, 'home', 'wellness_coach'), /<title>\{\{BUSINESS_NAME\}\} — Home<\/title>/);
});

test('byte-duplicate inner pages are rebuilt through their own role adapters', () => {
  const result = repairLegacyTemplate({
    slug: 'duplicate-pages',
    niche: 'wellness_coach',
    files: new Map<string, string>([
      ['index.html', SOURCE_HTML],
      ['services.html', SOURCE_HTML],
      ['contact.html', SOURCE_HTML],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Wellness Studio', EMAIL: 'hello@example.com', PHONE: '(555) 555-0123' })],
      ['template.json', JSON.stringify({ pages: ['index.html', 'services.html', 'contact.html'] })],
    ]),
  });
  const services = String(result.files.get('services.html'));
  const contact = String(result.files.get('contact.html'));
  assert.match(services, /data-dc-rehabilitated-role="services"/);
  assert.match(services, /Current offerings/);
  assert.match(contact, /data-dc-rehabilitated-role="contact"/);
  assert.match(contact, /data-dc-standard-form="contact"/);
  assert.notEqual(services, contact);
  const adaptations = result.transformations.filter((item) => item.rule === 'adapt-duplicate-inner-page');
  assert.equal(adaptations.length, 2);
  assert.ok(adaptations.some((item) => item.file === 'services.html' && item.detail === 'services:source-copy-preserved'));
  assert.match(services, /A practical introduction with original editorial copy\./);
  assert.doesNotMatch(contact, /A practical introduction with original editorial copy\./);
});

test('stable IDs follow structure and do not depend on editorial copy', () => {
  const left = fixture('copy-a', SOURCE_HTML.replace('original editorial copy', 'first safe story'));
  const right = fixture('copy-b', SOURCE_HTML.replace('original editorial copy', 'a completely different safe introduction'));
  assert.deepEqual(left.editIds, right.editIds);
  assert.deepEqual(left.imageIds, right.imageIds);
  assert.equal(left.fingerprint.exactDesignHash, right.fingerprint.exactDesignHash);
  assert.notEqual(left.contentPreset.hash, right.contentPreset.hash);
});

test('foundation lineage aliases while presets remain attached to every slug', () => {
  const marker = '<!-- FOUNDATION: wellness_coach layout-family-hero-centered -->';
  const left = fixture('foundation-a', SOURCE_HTML.replace('original editorial copy', 'copy A'), marker);
  const right = fixture('foundation-b', SOURCE_HTML.replace('original editorial copy', 'copy B'), marker);
  const clusters = buildDedupeClusters([
    { fingerprint: left.fingerprint, catalogTemplate: left.catalogTemplate, design: left.design, contentPreset: left.contentPreset, themePreset: left.themePreset },
    { fingerprint: right.fingerprint, catalogTemplate: right.catalogTemplate, design: right.design, contentPreset: right.contentPreset, themePreset: right.themePreset },
  ]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.aliases.length, 2);
  assert.equal(clusters[0]!.aliases[1]!.reason, 'foundation-lineage');
  assert.notEqual(clusters[0]!.aliases[0]!.contentPresetId, clusters[0]!.aliases[1]!.contentPresetId);
  assert.equal(clusters[0]!.aliases[1]!.composition.pass, true);
});

test('formatting-only CSS variants stay distinct when canonical composition would change verified bytes', () => {
  const marker = '<!-- FOUNDATION: wellness_coach layout-family-hero-centered -->';
  const canonical = fixture('formatting-canonical', SOURCE_HTML, marker, SOURCE_CSS);
  const boundaryWhitespace = fixture('formatting-boundary', SOURCE_HTML, marker, `${SOURCE_CSS}    \n`);
  const whitespaceVariant = fixture(
    'formatting-variant',
    SOURCE_HTML,
    marker,
    SOURCE_CSS.replace('.hero {', '.hero{'),
  );
  const candidates = [canonical, whitespaceVariant].map((result) => ({
    fingerprint: result.fingerprint,
    catalogTemplate: result.catalogTemplate,
    design: result.design,
    contentPreset: result.contentPreset,
    themePreset: result.themePreset,
  }));

  const canonicalBytes = applyThemePreset(
    canonical.design.styles,
    whitespaceVariant.themePreset,
    whitespaceVariant.contentPreset.images,
  );
  const variantBytes = applyThemePreset(
    whitespaceVariant.design.styles,
    whitespaceVariant.themePreset,
    whitespaceVariant.contentPreset.images,
  );
  assert.equal(canonical.design.id, boundaryWhitespace.design.id);
  assert.deepEqual(
    applyThemePreset(canonical.design.styles, boundaryWhitespace.themePreset, boundaryWhitespace.contentPreset.images),
    applyThemePreset(boundaryWhitespace.design.styles, boundaryWhitespace.themePreset, boundaryWhitespace.contentPreset.images),
  );
  assert.notDeepEqual(canonicalBytes, variantBytes);
  assert.notEqual(canonical.design.id, whitespaceVariant.design.id);
  assert.notEqual(canonical.fingerprint.exactDesignHash, whitespaceVariant.fingerprint.exactDesignHash);
  assert.match(checkCompositionCompatibility(candidates[0]!, candidates[1]!).issues.join(';'), /design:mismatch/);
  assert.equal(buildDedupeClusters(candidates).length, 2);
});

test('foundation lineage fails closed when design or preset slots differ', () => {
  const marker = '<!-- FOUNDATION: wellness_coach layout-family-hero-centered -->';
  const canonical = fixture('foundation-canonical', SOURCE_HTML, marker);
  const changed = fixture('foundation-changed', SOURCE_HTML.replace('<p>A practical introduction', '<p>Added structural sibling.</p><p>A practical introduction'), marker);
  const candidates = [canonical, changed].map((result) => ({
    fingerprint: result.fingerprint,
    catalogTemplate: result.catalogTemplate,
    design: result.design,
    contentPreset: result.contentPreset,
    themePreset: result.themePreset,
  }));
  assert.equal(checkCompositionCompatibility(candidates[0]!, candidates[1]!).pass, false);
  assert.equal(buildDedupeClusters(candidates).length, 2);
  assert.notEqual(canonical.design.id, changed.design.id);
});

test('foundation variants retain palette and typography but drop layout overrides', () => {
  const marker = '<!-- FOUNDATION: wellness_coach layout-family-hero-centered -->';
  const html = SOURCE_HTML.replace('</head>', '<style id="variation-overrides">body{font-family:Manrope,sans-serif;font-weight:700;color:#123456;padding:99px;display:grid}</style></head>');
  const result = fixture('foundation-theme', html, marker);
  const inlineCss = [...result.files.entries()].find(([path]) => /^\.dc-inline-[a-f0-9]+\.css$/.test(path) && String(result.files.get(path)).includes('Manrope'))?.[1];
  assert.ok(inlineCss, 'expected the foundation theme override to be externalized');
  assert.match(String(inlineCss), /--dc-theme-font_/);
  assert.match(String(inlineCss), /--dc-theme-color_/);
  assert.doesNotMatch(String(inlineCss), /padding\s*:|display\s*:/);
  assert.ok(result.transformations.some((item) => item.rule === 'align-foundation-variation'));
});

test('mid-tone text colors receive an auditable accessible default', () => {
  const normalized = normalizeAccessibleTextColor('#c4a882');
  assert.notEqual(normalized.toLowerCase(), '#c4a882');
  assert.match(normalized, /^#[0-9a-f]{6}$/);
  const result = fixture('contrast-normalized', SOURCE_HTML.replace('.card {', '.card { color: #c4a882;'));
  const corrected = result.themePreset.tokens.find((token) => token.original?.toLowerCase() === '#c4a882');
  assert.ok(corrected);
  assert.notEqual(corrected.value.toLowerCase(), corrected.original?.toLowerCase());
  assert.ok(result.transformations.some((item) => item.rule === 'normalize-text-color-contrast'));
});

test('irregular near matches stay distinct without strict structural or render evidence', () => {
  const left = fixture('irregular-a');
  const changedCss = SOURCE_CSS.replace('display: grid', 'display: flex');
  const right = fixture('irregular-b', SOURCE_HTML, '', changedCss);
  assert.equal(canAliasDesigns(left.fingerprint, right.fingerprint).alias, false);
  const pageEvidence = [{ page: 'index.html', desktopSsim: 0.995, mobileSsim: 0.995, desktopPerceptualHashDistance: 4, mobilePerceptualHashDistance: 4 }];
  assert.equal(satisfiesVisualAliasThresholds({ domSimilarity: 0.98, desktopSsim: 0.995, mobileSsim: 0.995, desktopPerceptualHashDistance: 4, mobilePerceptualHashDistance: 4, pages: pageEvidence }), true);
  assert.equal(satisfiesVisualAliasThresholds({ domSimilarity: 0.979, desktopSsim: 1, mobileSsim: 1, desktopPerceptualHashDistance: 0, mobilePerceptualHashDistance: 0, pages: pageEvidence }), false);
  assert.equal(domSimilarity('<main><h1>A</h1><p>B</p></main>', '<main><h1>Different</h1><p>Copy</p></main>'), 1);
});

test('expands CSS generated-content variables completely and preserves valid nested CSS', () => {
  const result = repairLegacyTemplate({
    slug: 'css-variable-closure',
    niche: 'wellness_coach',
    files: new Map([
      ['index.html', '<!doctype html><html><head><title>{{BUSINESS_NAME}}</title><link rel="stylesheet" href="styles.css"></head><body><main><h1 class="x">{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Email</a></main></body></html>'],
      ['styles.css', String.raw`:root{--last:"Doe";--amount:"99";--tail:" your immune system";--q:open-quote;quotes:"Jane Doe" ""}.x::before{content:"Jane " var(--last)}.x::after{content:"$" var(--amount)}.y::before{content:"Sessions support" var(--tail)}.z::before{content:var(--q)}@media(max-width:40rem){.safe{display:block}}@keyframes fade{from{opacity:0}to{opacity:1}}`],
    ]),
  });
  const css = String(result.files.get('styles.css'));
  assert.deepEqual(findUnsafeCssGeneratedContent(css), []);
  assert.doesNotMatch(css, /Jane Doe|Sessions support|"99"|content\s*:\s*var\(--q\)/i);
  assert.match(css, /@media\(max-width:40rem\)/);
  assert.match(css, /@keyframes fade/);
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('repairs visible SVG semantics and declarative shadow DOM without altering SVG geometry', () => {
  const result = repairLegacyTemplate({
    slug: 'svg-semantic-safety',
    niche: 'aromatherapy',
    files: new Map([
      ['index.html', '<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><svg viewBox="0 0 10 10"><title>Jane Doe · Client reviews · $99</title><text x="1" y="2">Sessions support your immune system.</text><path d="M0 0h10v10z"></path></svg><img src="assets/graphic.svg" alt="Information"><template shadowrootmode="open"><p>Jane Doe · $99</p></template><a href="mailto:{{EMAIL}}">Email</a></main></body></html>'],
      ['assets/graphic.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>Jane Doe · Client reviews · $99</title><foreignObject><p>care@example.com</p></foreignObject><path d="M0 0h10v10z" onclick="track()"></path><script>alert(1)</script></svg>'],
    ]),
  });
  const html = String(result.files.get('index.html'));
  const svg = String(result.files.get('assets/graphic.svg'));
  const liveHtml = html.replace(/<template>[\s\S]*?<\/template>/i, '');
  assert.doesNotMatch(`${liveHtml}\n${svg}`, /Jane Doe|Client reviews|\$99|support your immune|care@example\.com|onclick=/i);
  assert.doesNotMatch(svg, /<script/i);
  assert.match(html, /<template><p>Jane Doe · \$99<\/p><\/template>/);
  assert.doesNotMatch(html, /shadowrootmode=/i);
  assert.match(html, /<path d="M0 0h10v10z"><\/path>/);
  assert.match(svg, /<path d="M0 0h10v10z"><\/path>/);
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('keeps form design hooks, reveals legacy toggle forms, and deduplicates arbitrary DOM IDs', () => {
  const result = repairLegacyTemplate({
    slug: 'legacy-form-design-and-identity',
    niche: 'sound_bath',
    files: new Map([
      ['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title><link rel="stylesheet" href="styles.css"><style>.diagnostic{padding:2rem}.leadmagnet{display:none}.modal{display:none!important}</style></head><body><main><h1>{{BUSINESS_NAME}}</h1>
        <form id="diagnostic-form" class="diagnostic" aria-label="How are you feeling"><label>Symptoms<textarea name="symptoms"></textarea></label></form>
        <form id="leadmagnet-form" class="leadmagnet" aria-hidden="true"><input name="email"></form>
        <div class="modal"><form id="modal-contact"><input name="email"></form></div>
        <div id="duplicate">First</div><div id="duplicate">Second</div><a href="mailto:{{EMAIL}}">Email</a></main></body></html>`],
      ['styles.css', '.diagnostic{border:1px solid currentColor}.leadmagnet{display:none}.modal{display:none!important}'],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /<form\b(?=[^>]*id="diagnostic-form")(?=[^>]*class="diagnostic dc-contact-form")/);
  assert.match(String(result.files.get('styles.css')), /\.diagnostic\{/);
  assert.match(html, /<form\b(?=[^>]*id="leadmagnet-form")(?=[^>]*class="leadmagnet dc-contact-form")(?=[^>]*style="display:grid!important)/);
  assert.doesNotMatch(html, /<div class="modal">\s*<form/i);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]!);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.some((id) => /^duplicate-dc-[a-f0-9]{10}$/.test(id)));
  assert.ok(result.transformations.some((item) => item.rule === 'deduplicate-dom-ids'));
  assert.ok(result.transformations.some((item) => item.rule === 'relocate-toggle-hidden-contact-form'));
  assert.match(String(result.files.get('assets/css/dc-repair.css')), /svg\[aria-hidden="true"\],\[data-dc-decoration="pointer-layer"\]\{pointer-events:none!important\}/);
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('neutralizes fabricated star ratings and restores repeated foundation identity literals', () => {
  const marker = '<!-- FOUNDATION: aromatherapy layout-family-test -->';
  const page = (role: string) => `<!doctype html><html><head><title>Midnight Bloom Aromatics — ${role}</title><meta name="description" content="Midnight Bloom Aromatics in Springfield, IL"></head><body>${marker}<main><h1>Midnight Bloom Aromatics</h1><p>Rated 5.0 by local clients ★★★★★</p><p>Visit Springfield, IL for current services.</p><a href="mailto:{{EMAIL}}">Email</a></main></body></html>`;
  const result = repairLegacyTemplate({
    slug: 'aromatherapy-2026-06-18T0247-039',
    niche: 'aromatherapy',
    files: new Map([['index.html', page('Home')], ['about.html', page('About')]]),
  });
  const emitted = `${String(result.files.get('index.html'))}\n${String(result.files.get('about.html'))}`;
  assert.doesNotMatch(emitted, /Midnight Bloom Aromatics|Springfield, IL|Rated 5\.0|★★★★★/i);
  assert.match(emitted, /\{\{BUSINESS_NAME\}\}/);
  assert.match(emitted, /\{\{CITY\}\}, \{\{STATE\}\}/);
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('repairs residual proof, phone, and non-local SVG references while preserving safe controls', () => {
  const result = repairLegacyTemplate({
    slug: 'bounded-residual-semantics',
    niche: 'wellness_coach',
    files: new Map([
      ['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1>
        <p data-risk="recommend">95% would recom<strong>mend us</strong>.</p>
        <p data-risk="loved">Loved by 1,000 customers.</p><p data-risk="serving">Serving 500 clients since 2020.</p>
        <p data-risk="phone-a">Call (212)867-<strong>5309</strong></p><p data-risk="phone-b">Call 2128675309</p><p data-risk="phone-c">Call +44 20 7946 0958</p>
        <blockquote data-risk="quote">“Working with this practice <em>transformed my life</em>.”</blockquote><cite>Sarah M., client</cite>
        <figure data-risk="figure"><blockquote>“I finally feel like myself again.”</blockquote><figcaption>— Sarah M.</figcaption></figure>
        <q data-risk="recommendation">I highly recommend this practice.</q><span>— Taylor, client</span>
        <p data-safe="purity">This blend uses 95% pure essential oil.</p><p data-safe="history">Serving the community since 2020.</p>
        <p data-safe="order">Order reference 2128675309 is available in your confirmation.</p>
        <blockquote data-safe="policy">Appointments are subject to the cancellation policy.</blockquote>
        <svg><defs><path id="wave" d="M0 0h10"></path></defs><image href="https://evil.invalid/tracker.png"></image><use href="//evil.invalid/sprite.svg#x"></use><use href="#wave"></use></svg>
        <a href="mailto:{{EMAIL}}">Email</a></main></body></html>`],
      ['assets/graphic.svg', '<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="shape" d="M0 0h10v10z"/></defs><title>{{BUSINESS_NAME}} motif</title><text>{{COACH_NAME}}</text><image href="https://evil.invalid/tracker.png"/><use href="//evil.invalid/sprite.svg#x"/><use href="#shape"/></svg>'],
    ]),
  });
  const html = String(result.files.get('index.html'));
  const svg = String(result.files.get('assets/graphic.svg'));
  assert.doesNotMatch(`${html}\n${svg}`, /95% would recommend|Loved by 1,000|Serving 500 clients|\(212\)867-5309|Call 2128675309|\+44 20 7946 0958|transformed my life|feel like myself|highly recommend|evil\.invalid/i);
  assert.match(html, /\{\{PHONE\}\}/);
  assert.match(html, /This blend uses 95% pure essential oil/);
  assert.match(html, /Serving the community since 2020/);
  assert.match(html, /Order reference 2128675309/);
  assert.match(html, /Appointments are subject to the cancellation policy/);
  assert.match(html, /<use href="#wave"><\/use>/);
  assert.match(svg, /<use href="#shape"><\/use>/);
  assert.doesNotMatch(svg, /\{\{|\}\}/);
  assert.match(svg, /Practice information motif/);
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
});

test('treats token-shaped field defaults as bindings rather than self-replacing literals', () => {
  const result = repairLegacyTemplate({
    slug: 'self-referential-field-defaults',
    niche: 'aromatherapy',
    files: new Map([
      ['index.html', '<!doctype html><html><body><main><h1>{{BUSINESS_NAME}}</h1><svg aria-hidden="true"><text>{{BUSINESS_NAME}}</text></svg><p>{{TAGLINE}}</p><a href="mailto:{{EMAIL}}">{{EMAIL}}</a></main></body></html>'],
      ['fields.json', JSON.stringify({
        business_name: '{{BUSINESS_NAME}}',
        tagline: '{{TAGLINE}}',
        email: '{{EMAIL}}',
        phone: '{{PHONE}}',
      })],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /\{\{BUSINESS_NAME\}\}/);
  assert.match(html, /\{\{TAGLINE\}\}/);
  assert.match(html, /\{\{EMAIL\}\}/);
  assert.equal(result.qualityReceipt.status, 'passed', result.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'));
  const replay = repairLegacyTemplate({ slug: result.manifest.legacySlug, niche: result.manifest.niche, files: result.files });
  assert.equal(replay.files.get('index.html'), result.files.get('index.html'));
});

test('all generated HTML remains parseable', () => {
  const result = fixture();
  for (const [path, value] of result.files) {
    if (/\.html$/i.test(path)) assert.doesNotThrow(() => parse(String(value)));
  }
});
