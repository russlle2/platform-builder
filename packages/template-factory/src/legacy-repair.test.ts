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
  assert.match(html, /data-dc-safe-replacement="proof"/);
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
  assert.match(html, /data-dc-safe-replacement="proof"/);
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
  assert.equal((html.match(/data-dc-safe-replacement="proof"/g) ?? []).length, 1);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('preserves benign form intent and wrapper while replacing only sensitive form contents', () => {
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
  assert.match(html, /id="newsletter" class="newsletter compact"/);
  assert.match(html, /name="subscriber_email"/);
  assert.match(html, /id="subscriber_email" required="" name="subscriber_email-2"/);
  assert.match(html, /<textarea name="textarea-3"><\/textarea>/);
  assert.match(html, /form="newsletter" id="postal-code" pattern="\[0-9\]\{5\}" maxlength="5" required="" name="postal-code"/);
  assert.match(html, />Join updates</);
  assert.match(html, /id="intake"/);
  assert.match(html, /class="booking-grid custom-shell dc-contact-form"/);
  assert.match(html, /style="display:grid"/);
  assert.doesNotMatch(html, /medical_history|List medications/i);
  assert.match(html, /data-dc-standard-form="safe"/);
  assert.match(html, /data-dc-standard-form="contact"/);
  assert.ok(result.transformations.some((item) => item.rule === 'name-form-controls'));
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('neutralizes sensitive form wrapper vocabulary and repairs references without discarding shell styling', () => {
  const result = repairLegacyTemplate({
    slug: 'sensitive-form-wrapper',
    niche: 'wellness_coach',
    files: new Map([['index.html', `<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1>
      <button aria-controls="mini-diagnostic">Open form</button>
      <form id="mini-diagnostic" class="diagnostic-grid custom-shell" style="display:grid" aria-label="Quick diagnostic"><label>Symptoms<textarea name="symptoms"></textarea></label></form>
      <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
  });
  const html = String(result.files.get('index.html'));
  assert.match(html, /id="mini-contact"/);
  assert.match(html, /class="contact-grid custom-shell dc-contact-form"/);
  assert.match(html, /style="display:grid"/);
  assert.match(html, /aria-label="Contact form"/);
  assert.match(html, /aria-controls="mini-contact"/);
  assert.doesNotMatch(html.match(/<form\b[\s\S]*?<\/form>/)?.[0] ?? '', /diagnos|symptoms/i);
  assert.ok(result.transformations.some((item) => item.rule === 'sanitize-sensitive-form-wrapper'));
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('keeps a benign form when a sibling link mentions stories and uses a proof-neutral generated name', () => {
  const result = repairLegacyTemplate({
    slug: 'testimonial-page-benign-form',
    niche: 'wellness_coach',
    files: new Map([
      ['index.html', '<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['testimonials.html', '<!doctype html><html><head><title>Stories — {{BUSINESS_NAME}}</title></head><body><main><section class="signup"><h1>Share an update</h1><form><input type="email" name="email"><button>Join updates</button></form><a href="testimonials.html">Read Client Stories</a></section><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
    ]),
  });
  const html = String(result.files.get('testimonials.html'));
  assert.match(html, /name="legacy-form-[a-f0-9]{10}-1"/);
  assert.match(html, /name="email"/);
  assert.match(html, />Join updates</);
  assert.doesNotMatch(html, /legacy-testimonials/i);
  assert.equal(result.qualityReceipt.status, 'passed');
});

test('removes missing form endpoints while retaining existing local actions', () => {
  const result = repairLegacyTemplate({
    slug: 'legacy-form-actions',
    niche: 'wellness_coach',
    files: new Map([
      ['index.html', '<!doctype html><html><head><title>{{BUSINESS_NAME}}</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><form action="/submit"><input name="email"><button formaction="/alternate">Send</button></form><form action="contact.html"><button>Open contact</button></form><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['contact.html', '<!doctype html><html><head><title>Contact</title></head><body><main><h1>Contact</h1><a href="mailto:{{EMAIL}}">Email</a></main></body></html>'],
    ]),
  });
  const html = String(result.files.get('index.html'));
  assert.doesNotMatch(html, /action="(?:\/submit|\/alternate)"|formaction=/);
  assert.match(html, /action="contact\.html"/);
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
  assert.match(html, /aria-labelledby="dc-guidance-heading"/);
  assert.match(html, /id="dc-guidance-heading"/);
  assert.match(html, /data-dc-safe-replacement="proof"/);
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
  assert.match(html, /<select id="strength" aria-label="Strength"/);
  assert.match(html, /role="dialog" aria-label="Information"/);
  assert.match(html, /<button data-dc-repaired-semantics="tab"/);
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

test('composition compatibility follows editable attributes nested inside a parent content slot', () => {
  const result = repairLegacyTemplate({
    slug: 'nested-editable-label',
    niche: 'aromatherapy',
    files: new Map<string, string | Uint8Array>([
      ['index.html', '<!doctype html><html lang="en"><head><title>Legacy</title></head><body><main><h1>{{BUSINESS_NAME}}</h1><a href="{{PRIMARY_CTA_URL}}"><button aria-label="Book a session">{{PRIMARY_CTA_LABEL}}</button></a><a href="mailto:{{EMAIL}}">Contact</a></main></body></html>'],
      ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
    ]),
  });
  const repaired = String(result.files.get('index.html'));
  const nestedId = repaired.match(/<button[^>]*data-dc-edit-id="([^"]+)"[^>]*data-dc-edit-attribute="aria-label"/)?.[1];
  assert.ok(nestedId);
  assert.ok(result.contentPreset.entries.some((entry) => entry.nodeId === nestedId && entry.attribute === 'aria-label'));
  assert.ok(result.contentPreset.entries.some((entry) => !entry.attribute && entry.html.includes(`data-dc-edit-id="${nestedId}"`)));
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
    firstHtml.replace('</head>', '<style id="dc-a11y-contrast-overrides">.card{color:#111827!important}</style></head>'),
  );
  const second = repairLegacyTemplate({
    slug: first.manifest.legacySlug,
    niche: first.manifest.niche,
    files: withRemediation,
  });
  const imports = [...String(second.files.get('index.html')).matchAll(/@import url\("(\.dc-inline-[a-f0-9]+\.css)"\)/g)]
    .map((match) => match[1]!);

  assert.equal(new Set(imports).size, 2);
  assert.ok(imports.includes(originalImport));
  assert.match(String(second.files.get(originalImport)), /\.card\s*\{/);
  const remediationImport = imports.find((path) => path !== originalImport);
  assert.ok(remediationImport);
  assert.match(String(second.files.get(remediationImport)), /\.card\s*\{color:var\(--dc-theme-color_/);
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
  const rightInput = fixture('discarded');
  const files = new Map(rightInput.files);
  files.set('assets/css/styles.css', changedCss);
  const right = repairLegacyTemplate({ slug: 'irregular-b', niche: 'wellness_coach', files });
  assert.equal(canAliasDesigns(left.fingerprint, right.fingerprint).alias, false);
  assert.equal(satisfiesVisualAliasThresholds({ domSimilarity: 0.98, desktopSsim: 0.995, mobileSsim: 0.995, desktopPerceptualHashDistance: 4, mobilePerceptualHashDistance: 4 }), true);
  assert.equal(satisfiesVisualAliasThresholds({ domSimilarity: 0.979, desktopSsim: 1, mobileSsim: 1, desktopPerceptualHashDistance: 0, mobilePerceptualHashDistance: 0 }), false);
  assert.equal(domSimilarity('<main><h1>A</h1><p>B</p></main>', '<main><h1>Different</h1><p>Copy</p></main>'), 1);
});

test('all generated HTML remains parseable', () => {
  const result = fixture();
  for (const [path, value] of result.files) {
    if (/\.html$/i.test(path)) assert.doesNotThrow(() => parse(String(value)));
  }
});
