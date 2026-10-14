import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UNSUPPORTED_FABRICATED_METRIC_RE,
  UNSUPPORTED_PROOF_TEXT_RE,
  containsUnsafeEmbeddedMarkupUrl,
  containsUnsupportedOutcomeClaim,
  extractTemplateTokens,
  findPersonalDataPlaceholders,
  findUnsupportedOutcomeClaims,
  isUnsupportedProofHeading,
  validateStandardInquiryFormMarkup,
  validateTemplateContract,
} from './template-contract.js';

test('extractTemplateTokens normalizes and deduplicates tokens', () => {
  assert.deepEqual(
    extractTemplateTokens('<h1>{{ BUSINESS_NAME }}</h1><p>{{business_name}}</p>'),
    ['BUSINESS_NAME'],
  );
});

test('accepts retained core tokens with matching concrete defaults', () => {
  const pages = new Map([
    ['index.html', '<h1>{{BUSINESS_NAME}}</h1><p>{{PRACTITIONER_NAME}}</p><a href="mailto:{{EMAIL}}">Email</a>'],
  ]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: 'Aromatherapy Practice' },
    { name: 'PRACTITIONER_NAME', default: 'Practice Team' },
    { name: 'EMAIL' },
  ]);

  assert.equal(result.pass, true, result.errors.join('\n'));
});

test('rejects zero-token output, stale fields, and synthetic personal data', () => {
  const pages = new Map([
    ['index.html', '<h1>Aromatherapy Studio</h1><p>Dr. Morgan Ellis — hello@example.com</p>'],
  ]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: '{{BUSINESS_NAME}}' },
  ]);

  assert.equal(result.pass, false);
  assert.match(result.errors.join('\n'), /no runtime personalization tokens/i);
  assert.match(result.errors.join('\n'), /placeholder practitioner name/i);
  assert.match(result.errors.join('\n'), /declares unused tokens/i);
  assert.match(result.errors.join('\n'), /default.*contains a token/i);
});

test('rejects unresolved editorial tokens', () => {
  const pages = new Map([
    ['index.html', '<h1>{{BUSINESS_NAME}}</h1><p>{{HERO_HEADLINE}}</p>'],
  ]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: 'Wellness Practice' },
    { name: 'HERO_HEADLINE', default: 'Feel better today' },
  ]);

  assert.equal(result.pass, false);
  assert.match(result.errors.join('\n'), /unexpected unresolved token \{\{HERO_HEADLINE\}\}/);
});

test('rejects malformed expressions, synthetic proof, fixed claims, and sensitive forms', () => {
  const pages = new Map([
    [
      'index.html',
      `<h1>{{BUSINESS_NAME}}</h1>
       <p>{{OWNER_NAME:0:1}}</p>
       <div class="testimonial">A sample story</div>
       <p>$299</p><p>Guaranteed results</p>
       <a href="https://example.com/book">Book</a>
       <form><input name="email"><textarea>List medications</textarea></form>
       <a href="mailto:{{EMAIL}}">Email</a>`,
    ],
  ]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: 'Practice' },
    { name: 'EMAIL' },
  ]);

  assert.equal(result.pass, false);
  const errors = result.errors.join('\n');
  assert.match(errors, /unsupported template expression/i);
  assert.match(errors, /testimonial/i);
  assert.match(errors, /hard-coded offer price/i);
  assert.match(errors, /unsupported outcome/i);
  assert.match(errors, /hard-coded external/i);
  assert.match(errors, /sensitive health information/i);
});

test('rejects adversarial sample identity, medical outcomes, proof, and sensitive intake copy', () => {
  const pages = new Map([
    [
      'index.html',
      `<main>
        <h1>{{BUSINESS_NAME}}</h1>
        <p>Jane Doe can be reached at care@example.org or 212-555-0119.</p>
        <p>Our approach treats depression and provides instant relief.</p>
        <section id="member-rated-results"><h2>Independently verified recognition</h2></section>
        <form><label>Trauma history<textarea name="history"></textarea></label></form>
        <a href="mailto:{{EMAIL}}">Email</a>
      </main>`,
    ],
  ]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: 'Practice' },
    { name: 'EMAIL' },
  ]);

  assert.equal(result.pass, false);
  const errors = result.errors.join('\n');
  assert.match(errors, /placeholder practitioner name/i);
  assert.match(errors, /placeholder email/i);
  assert.match(errors, /placeholder phone/i);
  assert.match(errors, /unsupported outcome claim/i);
  assert.match(errors, /unsupported absolute efficacy claim/i);
  assert.match(errors, /unverified credential or recognition claim/i);
  assert.match(errors, /sensitive health information/i);
});

test('rejects generated proof-gallery and vetted-credential synonyms', () => {
  const pages = new Map([
    [
      'index.html',
      `<main><h1>{{BUSINESS_NAME}}</h1>
        <section class="credibility-bar"><h2>Proof Gallery</h2><p>Patient review</p>
          <span>Faculty vetted</span><span>Every facilitator is vetted</span>
        </section><a href="mailto:{{EMAIL}}">Email</a></main>`,
    ],
  ]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: 'Wellness Practice' },
    { name: 'EMAIL' },
  ]);

  const errors = result.errors.join('\n');
  assert.match(errors, /unverified testimonial or review content/i);
  assert.match(errors, /unverified credential or recognition claim/i);
});

test('detects high-confidence health outcomes retained in legacy corpus copy', () => {
  const corpusClaims = [
    'Research shows certain essential oil combinations can reduce perceived anxiety within 20 minutes.',
    'Each protocol targets specific neurological pathways—proven to modulate cortisol, enhance alpha brain waves, and support emotional regulation.',
    'We track outcomes through validated metrics: reduced cortisol levels via saliva tests and improved sleep efficiency through actigraphy.',
    'Specific essential oils interact with your neurochemistry to reduce cortisol levels, enhance parasympathetic activity, and support restorative sleep.',
    'This routine supports tissue repair and reduces inflammation.',
    'The session supports tissue regeneration, reduces inflammatory responses, and enhances proprioception.',
    'The blend boosts your immune system during demanding seasons.',
    'The experience can significantly improve sleep quality and enhance mental sharpness.',
    'For deeper shifts like improved sleep patterns or anxiety management, consistent use over two to four weeks is typical.',
    'You can expect improved muscle recovery and reduced physical tension.',
    'Sessions reduce blood pressure.',
    'Aromatherapy balances hormones.',
    'Balance hormones.',
    'Sessions can balance hormones.',
    'This treatment cures migraines.',
    'Sound therapy treats chronic fatigue.',
    'Our approach boosts metabolism.',
    'Essential oils fight infections.',
    'Sessions detoxify the body.',
    'Sound baths improve digestion.',
    'This work regulates the endocrine system.',
    'Coaching eliminates panic attacks.',
    'Our method relieves arthritis.',
  ];

  for (const claim of corpusClaims) {
    assert.equal(
      containsUnsupportedOutcomeClaim(claim),
      true,
      `expected a high-confidence match for: ${claim}`,
    );
  }
});

test('outcome detector preserves disclaimers, cautions, questions, and neutral routine copy', () => {
  const allowedCopy = [
    'Use caution with blood pressure conditions and consult a clinician as needed.',
    'This service does not treat anxiety, depression, pain, or sleep disorders.',
    'Supports a quiet pre-sleep routine focused on slowing down and breath awareness.',
    'Ask a clinician about immune conditions and medication.',
    'Can this improve sleep quality?',
    'There is no evidence that this routine improves sleep quality.',
    'Learn about sleep routines, relaxation, and general wellbeing.',
    'The guide improves understanding of sleep quality without promising an outcome.',
  ];

  for (const copy of allowedCopy) {
    assert.equal(
      containsUnsupportedOutcomeClaim(copy),
      false,
      `expected neutral or protective copy to remain allowed: ${copy}`,
    );
  }
});

test('returns only unsafe sentences so adjacent editorial copy can survive repair', () => {
  const copy = 'Sessions are quiet and appointment-based. The experience can significantly improve sleep quality. Ask what to expect before booking.';
  assert.deepEqual(
    findUnsupportedOutcomeClaims(copy),
    ['The experience can significantly improve sleep quality.'],
  );
});

test('publication contract independently rejects physiological claims in text and metadata', () => {
  const pages = new Map([
    [
      'index.html',
      `<head><meta name="description" content="Enhance your immune resilience and mental sharpness."></head>
       <body><main><h1>{{BUSINESS_NAME}}</h1>
       <p>The deep relaxation experienced can significantly improve sleep quality.</p>
       <a href="mailto:{{EMAIL}}">Email</a></main></body>`,
    ],
  ]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: 'Sound Practice' },
    { name: 'EMAIL' },
  ]);

  assert.equal(result.pass, false);
  assert.match(result.errors.join('\n'), /unsupported outcome claim/i);
});

test('publication contract accepts explicit health safeguards and neutral information', () => {
  const pages = new Map([
    [
      'index.html',
      `<main><h1>{{BUSINESS_NAME}}</h1>
       <p>This service does not treat anxiety, depression, pain, or sleep disorders.</p>
       <p>Use caution with health conditions and consult a clinician as needed.</p>
       <p>Supports a quiet pre-sleep routine focused on slowing down and breath awareness.</p>
       <a href="mailto:{{EMAIL}}">Email</a></main>`,
    ],
  ]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: 'Wellness Practice' },
    { name: 'EMAIL' },
  ]);

  assert.equal(result.pass, true, result.errors.join('\n'));
});

test('publication contract preserves block boundaries when evaluating outcome claims', () => {
  const pages = new Map([
    [
      'index.html',
      `<main><h1>{{BUSINESS_NAME}}</h1>
       <h2>Sound Bath for Robust Immune Support</h2><p>Your immune system is a critical component of healthy aging.</p>
       <h2>Aromatherapy Rituals to Anchor Your Calm</h2><p>Your nervous system can become more sensitive with age.</p>
       <a href="mailto:{{EMAIL}}">Email</a></main>`,
    ],
  ]);
  const fields = [
    { name: 'BUSINESS_NAME', default: 'Wellness Practice' },
    { name: 'EMAIL' },
  ];

  const result = validateTemplateContract(pages, fields);
  assert.equal(result.pass, true, result.errors.join('\n'));

  pages.set('index.html', '<main><h1>{{BUSINESS_NAME}}</h1><p>Sessions <strong>support your immune system</strong>.</p><a href="mailto:{{EMAIL}}">Email</a></main>');
  assert.match(validateTemplateContract(pages, fields).errors.join('\n'), /unsupported outcome claim/i);

  pages.set('index.html', '<!doctype html><html><head><title>Sessions support your immune system</title></head><body><h1>{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Email</a></body></html>');
  assert.match(validateTemplateContract(pages, fields).errors.join('\n'), /unsupported outcome claim/i);

  pages.set('index.html', '<!doctype html><html><body>Sessions support your immune system<h1>{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Email</a></body></html>');
  assert.match(validateTemplateContract(pages, fields).errors.join('\n'), /unsupported outcome claim/i);

  for (const claim of [
    '<p>Sessions support<br>your immune system.</p>',
    '<p>Sessions support&Tab;your immune system.</p>',
    '<div data-tip="Sessions support your immune syst&#101;m.">Information</div>',
  ]) {
    pages.set('index.html', `<main><h1>{{BUSINESS_NAME}}</h1>${claim}<a href="mailto:{{EMAIL}}">Email</a></main>`);
    assert.match(validateTemplateContract(pages, fields).errors.join('\n'), /unsupported outcome claim/i, claim);
  }

  pages.set('index.html', '<main><h1>{{BUSINESS_NAME}}</h1><template><p>Sessions support your immune system.</p></template><a href="mailto:{{EMAIL}}">Email</a></main>');
  assert.equal(validateTemplateContract(pages, fields).pass, true);
});

test('publication contract joins rendered inline text without regex-mutated HTML gaps', () => {
  const fields = [{ name: 'BUSINESS_NAME', default: 'Practice' }, { name: 'EMAIL' }];
  const cases: Array<[string, RegExp]> = [
    ['<p>Ja<strong>ne</strong> Doe</p>', /placeholder practitioner name/i],
    ['<p>Wellness Coach Stu<span>dio</span></p>', /placeholder business name/i],
    ['<p>Ja<!--comment-->ne Doe</p>', /placeholder practitioner name/i],
    ['<p>hello@exam<strong>ple\.com</strong></p>', /hard-coded email address/i],
    ['<p>\(555\) 555-01<strong>23</strong></p>', /hard-coded phone number/i],
    ['<p>Your Ci<wbr>ty</p>', /placeholder city/i],
    ['<p>Sessions sup<wbr>port your immune system.</p>', /unsupported outcome claim/i],
    ['<h2>testi<!--comment-->monials</h2>', /testimonial or review/i],
    ['<p>1<strong>2 U</strong>SD per session</p>', /hard-coded offer price/i],
    ['<div data-a="<script>">Sessions support your immune system.</div><p data-b="</script>">Information</p>', /unsupported outcome claim/i],
  ];
  for (const [markup, expected] of cases) {
    const result = validateTemplateContract(new Map([[
      'index.html',
      `<main><h1>{{BUSINESS_NAME}}</h1>${markup}<a href="mailto:{{EMAIL}}">Email</a></main>`,
    ]]), fields);
    assert.equal(result.pass, false, markup);
    assert.match(result.errors.join('\n'), expected, markup);
  }
});

test('publication contract validates decoded CSS generated text and attr sources', () => {
  const pages = new Map([[
    'index.html',
    '<main><h1>{{BUSINESS_NAME}}</h1><span class="hero" data-tip="$99">Information</span><a href="mailto:{{EMAIL}}">Email</a></main>',
  ]]);
  const fields = [{ name: 'BUSINESS_NAME', default: 'Practice' }, { name: 'EMAIL' }];
  const unsafeStyles = [
    '.hero::before{content:"Sessions support your immune system · Client reviews · $99"}',
    '.hero::before{content:"Jane Doe · hello@example.com · (555) 555-0123"}',
    String.raw`.hero::before{content:"\53 essions support your immune system · rev\69 ews · \24 99"}`,
    '.hero{--copy:"$99"}.hero::before{content:var(--copy)}',
    '.hero::before{content:counter(step) " Client reviews"}',
    '.hero{counter-reset:price 99}.hero::before{content:"$" counter(price)}',
    '.hero{quotes:"Client reviews" ""}.hero::before{content:open-quote}',
    String.raw`.hero::before{c\6f ntent:"\24 99"}`,
    String.raw`.hero{--\78 :"\24 99"}.hero::before{content:v\61 r(--x)}`,
    ':root{--last:"Doe"}.hero::before{content:"Jane " var(--last)}',
    ':root{--amount:"99"}.hero::before{content:"$" var(--amount)}',
    ':root{--tail:" your immune system"}.hero::before{content:"Sessions support" var(--tail)}',
    ':root{--tail:" reviews"}.hero::before{content:"Client" var(--tail)}',
    ':root{--tail:"@example.com"}.hero::before{content:"hello" var(--tail)}',
    ':root{--q:open-quote;quotes:"Jane Doe" ""}.hero::before{content:var(--q)}',
    ':root{--q:"Jane Doe" "";quotes:var(--q)}.hero::before{content:open-quote}',
    ':root{--é:"Jane Doe"}.hero::before{content:var(--é)}',
    '.hero::before{content:var(--defined-in-another-stylesheet)}',
  ];
  for (const css of unsafeStyles) {
    const result = validateTemplateContract(pages, fields, { styles: new Map([['styles.css', css]]) });
    assert.equal(result.pass, false, css);
    assert.match(result.errors.join('\n'), /unsafe generated CSS content/i, css);
  }

  const promotedAttribute = validateTemplateContract(pages, fields, {
    styles: new Map([['styles.css', '.hero::before{content:attr(data-tip)}']]),
  });
  assert.equal(promotedAttribute.pass, false);
  assert.match(promotedAttribute.errors.join('\n'), /hard-coded offer price/i);

  for (const css of [
    String.raw`.hero::before{content:a\74 tr(data-tip)}`,
    String.raw`.hero::before{content:attr(data-t\69 p)}`,
  ]) {
    const escapedAttribute = validateTemplateContract(pages, fields, { styles: new Map([['styles.css', css]]) });
    assert.equal(escapedAttribute.pass, false, css);
    assert.match(escapedAttribute.errors.join('\n'), /hard-coded offer price/i, css);
  }

  const inlineStyle = validateTemplateContract(new Map([[
    'index.html',
    '<main><style>.hero::before{content:"$99 · Client reviews · Sessions support your immune system"}</style><h1 class="hero">{{BUSINESS_NAME}}</h1><a href="mailto:{{EMAIL}}">Email</a></main>',
  ]]), fields);
  assert.equal(inlineStyle.pass, false);
  assert.match(inlineStyle.errors.join('\n'), /unsafe generated CSS content/i);

  const decorative = validateTemplateContract(pages, fields, {
    styles: new Map([['styles.css', '@media(max-width:40rem){.hero::before{content:"•"}}.step::before{content:counter(step)}@keyframes fade{from{opacity:0}to{opacity:1}}']]),
  });
  // The price-bearing data attribute is not rendered by this safe stylesheet.
  assert.equal(decorative.pass, true, decorative.errors.join('\n'));

  const unsupportedCssToken = validateTemplateContract(pages, fields, {
    styles: new Map([['styles.css', '.hero{background-image:url("{{IMAGE_URL}}")}.hero::before{content:"{{PRACTITIONER_NAME}}"}']]),
  });
  assert.match(unsupportedCssToken.errors.join('\n'), /unsupported CSS template expression/i);
});

test('street-address placeholders are contextual without rejecting ordinary address prose', () => {
  const ordinary = `
    <h1>When the Sandman Forgets Your Address</h1>
    <p>I'll only use your address to deliver the guide.</p>`;
  assert.deepEqual(findPersonalDataPlaceholders(ordinary), []);
  assert.deepEqual(findPersonalDataPlaceholders('<p>Address: Your Address</p>'), ['placeholder street address']);
  assert.deepEqual(findPersonalDataPlaceholders('<input placeholder="Your street address">'), ['placeholder street address']);
  assert.deepEqual(findPersonalDataPlaceholders('<input aria-label="Your&#32;Address">'), ['placeholder street address']);
  assert.deepEqual(findPersonalDataPlaceholders('<input data-x=">" aria-label="Your Address">'), ['placeholder street address']);
  assert.deepEqual(findPersonalDataPlaceholders('<div id="street-address" title="Your Address"></div>'), ['placeholder street address']);
  assert.deepEqual(findPersonalDataPlaceholders('<fieldset aria-label="Your Address"><input name="street"></fieldset>'), ['placeholder street address']);
  assert.deepEqual(findPersonalDataPlaceholders('<legend>Your Address</legend>'), ['placeholder street address']);
  assert.deepEqual(findPersonalDataPlaceholders('<section>Your Address</section>'), ['placeholder street address']);
  assert.deepEqual(findPersonalDataPlaceholders('<select><option>Your Address</option></select>'), ['placeholder street address']);
  assert.deepEqual(findPersonalDataPlaceholders('<address>123 Main Street</address>'), ['placeholder street address']);
  assert.deepEqual(findPersonalDataPlaceholders('<p>Jane&#32;Doe — Your&#32;City</p>').sort(), ['placeholder city', 'placeholder practitioner name']);
  assert.deepEqual(findPersonalDataPlaceholders('<svg><title>Jane&#32;Doe</title></svg>'), ['placeholder practitioner name']);
  assert.deepEqual(findPersonalDataPlaceholders('<svg><title>Your&#32;City</title></svg>'), ['placeholder city']);
  assert.deepEqual(findPersonalDataPlaceholders('<svg><title>Your&#32;Address</title></svg>'), ['placeholder street address']);
});

test('price validation covers displayed controls without corrupting structural identifiers', () => {
  const fields = [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }];
  const structural = new Map([[
    'index.html',
    '<main><h1>{{BUSINESS_NAME}}</h1><button aria-controls="plan-$12">First</button><div id="plan-$12" class="offer-$12" data-target="#plan-$12">Ask about pricing.</div><a href="mailto:{{EMAIL}}">Email</a></main>',
  ]]);
  assert.equal(validateTemplateContract(structural, fields).pass, true);

  structural.set('index.html', '<main><h1>{{BUSINESS_NAME}}</h1><div aria-description="$12/mo" aria-placeholder="$18/mo" aria-valuetext="$20/mo" data-price-annual="$120/yr" label="$15 plan">$12–20 per session; 12–20 USD; $12k package.</div><a href="mailto:{{EMAIL}}">Email</a></main>');
  assert.match(validateTemplateContract(structural, fields).errors.join('\n'), /hard-coded offer price/i);
  for (const price of ['USD 99', '99 dollars', 'CAD 99', '99 CAD', '¥9000', '₹5000']) {
    structural.set('index.html', `<main><h1>{{BUSINESS_NAME}}</h1><p>Sessions cost ${price}.</p><a href="mailto:{{EMAIL}}">Email</a></main>`);
    assert.match(validateTemplateContract(structural, fields).errors.join('\n'), /hard-coded offer price/i, price);
  }
});

test('external destination checks parse attributes instead of truncating at quoted angle brackets', () => {
  const result = validateTemplateContract(new Map([[
    'index.html',
    '<main><h1>{{BUSINESS_NAME}}</h1><a data-x=">" href="https://evil.example/path">Visit</a><a href="mailto:{{EMAIL}}">Email</a></main>',
  ]]), [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }]);
  assert.match(result.errors.join('\n'), /hard-coded external contact or destination link/i);
});

test('proof markup validation preserves operational review labels but rejects evidence claims', () => {
  const fields = [
    { name: 'BUSINESS_NAME', default: 'Wellness Practice' },
    { name: 'EMAIL' },
  ];
  const operational = new Map([[
    'index.html',
    '<main><h1>{{BUSINESS_NAME}}</h1><button id="planPreview" data-val="Lab Review">Lab Review</button><p>Schedule a quarterly review.</p><a href="mailto:{{EMAIL}}">Email</a></main>',
  ]]);
  assert.equal(validateTemplateContract(operational, fields).pass, true);

  for (const claim of [
    '<div data-tip="Community-reviewed outcomes">Community Rated</div>',
    '<div data-tooltip="Teachers and facilitators reviewed by peers">Practitioner Network</div>',
    '<div data-tooltip="Teachers and facilitators reviewed&#32;by&#32;peers">Practitioner Network</div>',
    '<div class="client-review">Generated reflection</div>',
    '<h2 data-x=">">Quick stats</h2>',
  ]) {
    const result = validateTemplateContract(new Map([[
      'index.html',
      `<main><h1>{{BUSINESS_NAME}}</h1>${claim}<a href="mailto:{{EMAIL}}">Email</a></main>`,
    ]]), fields);
    assert.equal(result.pass, false, claim);
    assert.match(result.errors.join('\n'), /testimonial|credential/i, claim);
  }

  const encodedOutcome = new Map([[
    'index.html',
    '<main><h1>{{BUSINESS_NAME}}</h1><p>Sessions support&#32;your&#32;immune&#32;system.</p><a href="mailto:{{EMAIL}}">Email</a></main>',
  ]]);
  assert.match(validateTemplateContract(encodedOutcome, fields).errors.join('\n'), /unsupported outcome claim/i);

  const encodedAttributeOutcome = new Map([[
    'index.html',
    '<main><h1>{{BUSINESS_NAME}}</h1><div aria-label="Sessions support&#32;your&#32;immune&#32;system">Information</div><a href="mailto:{{EMAIL}}">Email</a></main>',
  ]]);
  assert.match(validateTemplateContract(encodedAttributeOutcome, fields).errors.join('\n'), /unsupported outcome claim/i);
});

test('detects retained legacy client reports, attributed quotes, and fabricated metrics', () => {
  const fabricatedProof = [
    'Clients report changes in clarity, small daily wins, and routines that stick.',
    'Many clients report enhanced mental clarity, reduced brain fog, and improved short-term recall.',
    'Client reported improved rest and calmer interactions.',
    '“I left more rested than I have in months.” — M.',
    'Average habit retention: 78% after 6 weeks.',
    'Client NPS: 4.7 out of 5.',
    'Repeat clients: 42% return within 6 months.',
    '350+ coaching hours logged.',
    'A tailored nightly roll-on helped a client notice calmer evenings.',
    'Most clients achieve measurable results within 4 sessions.',
    'We’ve helped 500+ clients like you find a clearer next step.',
    '20+ years experience and 4,000+ consults.',
    'Over 10 sessions they reported improved coping and clearer routines.',
    'A client used practical exercises over 8 sessions to regain sleep consistency.',
    'Rated 5.0 by local clients.',
    'Rated five stars by local clients.',
    'Five stars from our clients.',
    'Rated four point nine by clients.',
    '4.9-star rating.',
    '5-star client rating.',
    'Rated ★ ★ ★ ★ ★.',
    '★★★★★',
    'Published in Mindful Living Magazine.',
    'As seen in Mindful Living.',
    'Voted Best Wellness Coach 2025.',
    'Named Best Therapist in Springfield.',
    'Case study: Jane found lasting relief.',
    'Over 500 happy clients.',
    'Join 1,000 satisfied customers.',
    '98% satisfaction rate.',
    'Thousands of happy clients.',
    '90% of clients feel calmer.',
    '95% would recommend us.',
    'Four out of five clients recommend this practice.',
    'Loved by 1,000 customers.',
    'Serving 500 clients since 2020.',
    'Working with this practice transformed my life.',
    'I finally feel like myself again.',
    'An amazing and life-changing experience.',
    'The facilitator was thoughtful and kind.',
    'I highly recommend this practice.',
  ];

  for (const proof of fabricatedProof) {
    assert.equal(
      UNSUPPORTED_FABRICATED_METRIC_RE.test(proof),
      true,
      `expected unsupported proof or metric match for: ${proof}`,
    );
  }
  for (const heading of [
    'Proof',
    'Proof — {{BUSINESS_NAME}}',
    'Credibility',
    'Quick stats',
    'Social proof',
    'Proof & Notes',
    'Proof of progress',
    'Rotating voices & credibility',
  ]) {
    assert.equal(isUnsupportedProofHeading(heading), true, `expected proof heading: ${heading}`);
  }
  for (const label of ['Case note (anonymized)', 'Illustrative examples (de-identified)']) {
    assert.equal(UNSUPPORTED_PROOF_TEXT_RE.test(label), true, `expected proof label: ${label}`);
  }
});

test('proof detector avoids ordinary service, reporting, and documentation language', () => {
  const allowedCopy = [
    'Clients report scheduling problems through the contact form.',
    'Repeat clients can use the same booking link.',
    'The workshop discusses knowledge retention without publishing performance data.',
    'Credibility comes from clear scope and transparent policies.',
    'The walking route is 4.7 miles out and back.',
    'This blend uses 95% pure essential oil.',
    'Serving the community since 2020.',
    'Order reference 2128675309 is available in your confirmation.',
    'Clear policies help visitors decide whether the service fits their needs.',
  ];
  for (const copy of allowedCopy) {
    assert.equal(UNSUPPORTED_FABRICATED_METRIC_RE.test(copy), false, copy);
  }
  assert.equal(isUnsupportedProofHeading('Proof of insurance requirements'), false);
  assert.equal(isUnsupportedProofHeading('Credibility comes from transparent policies'), false);
});

test('publication contract rejects the complete retained proof context, not only quote cards', () => {
  const pages = new Map([
    [
      'testimonials.html',
      `<head><title>Proof — {{BUSINESS_NAME}}</title></head><body><main>
       <section><h2>What people notice first</h2>
       <p>Clients report changes in clarity, small daily wins, and routines that stick.</p></section>
       <aside><h3>Credibility</h3><div data-tip="350+ coaching hours logged">Hours</div>
       <h3>Quick stats</h3><p>Average habit retention: 78% after 6 weeks.</p>
       <p>Client NPS: 4.7 out of 5.</p><p>Repeat clients: 42% return within 6 months.</p></aside>
       <section><h2>Social proof</h2><p>“I left more rested than I have in months.” — M.</p></section>
       <a href="mailto:{{EMAIL}}">Email</a></main></body>`,
    ],
  ]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: 'Wellness Practice' },
    { name: 'EMAIL' },
  ]);

  assert.equal(result.pass, false);
  assert.match(result.errors.join('\n'), /unverified testimonial or review content/i);
});

test('publication contract permits proof-of-insurance guidance without fabricated social proof', () => {
  const pages = new Map([
    [
      'index.html',
      `<main><h1>{{BUSINESS_NAME}}</h1><h2>Proof of insurance requirements</h2>
       <p>Clients report scheduling problems through the contact form.</p>
       <p>Repeat clients can use the same booking link.</p>
       <a href="mailto:{{EMAIL}}">Email</a></main>`,
    ],
  ]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: 'Practice' },
    { name: 'EMAIL' },
  ]);

  assert.equal(result.pass, true, result.errors.join('\n'));
});

test('publication contract independently enforces contextual embedded URL safety', () => {
  const raster = 'data:image/png;base64,AAAA';
  assert.equal(containsUnsafeEmbeddedMarkupUrl(`<img src="${raster}">`), false);
  assert.equal(containsUnsafeEmbeddedMarkupUrl(`<a href="${raster}">Download</a>`), true);
  assert.equal(containsUnsafeEmbeddedMarkupUrl('<link rel="stylesheet" href="data:text/css,body%7Bdisplay:none%7D">'), true);
  assert.equal(containsUnsafeEmbeddedMarkupUrl('<div style="background:url(d\\61 ta:text/html,blocked)"></div>'), true);
  assert.equal(containsUnsafeEmbeddedMarkupUrl('<style>@import url("data:image/png;base64,AAAA")</style>'), true);

  const pages = new Map([[
    'index.html',
    `<main><h1>{{BUSINESS_NAME}}</h1><img src="${raster}" alt="Abstract texture">
     <link rel="stylesheet" href="${'\t'.repeat(300)}d${'\t'.repeat(300)}a${'\t'.repeat(300)}t${'\t'.repeat(300)}a:text/css,body%7Bdisplay:none%7D">
     <a href="mailto:{{EMAIL}}">Email</a></main>`,
  ]]);
  const result = validateTemplateContract(pages, [
    { name: 'BUSINESS_NAME', default: 'Practice' },
    { name: 'EMAIL' },
  ]);
  assert.equal(result.pass, false);
  assert.match(result.errors.join('\n'), /unsafe embedded URL/i);
});

test('publication contract accepts only the exact standard inquiry form and rejects orphan controls', () => {
  const standard = '<form class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact"><p><label>Your name <input name="name" autocomplete="name" required></label></p><p><label>Email <input type="email" name="email" autocomplete="email" required></label></p><p><label>Phone (optional) <input type="tel" name="phone" autocomplete="tel"></label></p><p><label>Message <textarea name="message" rows="5" required></textarea></label></p><button type="submit">Send inquiry</button></form>';
  assert.deepEqual(validateStandardInquiryFormMarkup(standard), []);
  assert.match(
    validateStandardInquiryFormMarkup(standard.replace('</form>', '<input type="file" name="records"></form>')).join('\n'),
    /unsupported inquiry control records/i,
  );

  const curatedV2Form = standard
    .replace(' name="contact"', '')
    .replace(' data-netlify="true"', '')
    .replace(' data-dc-standard-form="contact"', '')
    .replace('<form class="dc-contact-form"', '<form class="dc-contact-form" action="/api/contact"');
  const curatedV2 = validateTemplateContract(new Map([[
    'index.html',
    `<main><h1>{{BUSINESS_NAME}}</h1>${curatedV2Form}<a href="mailto:{{EMAIL}}">Email</a></main>`,
  ]]), [{ name: 'BUSINESS_NAME', default: 'Practice' }, { name: 'EMAIL' }]);
  assert.equal(curatedV2.pass, true, curatedV2.errors.join('\n'));
  const strictV3 = validateTemplateContract(new Map([[
    'index.html',
    `<main><h1>{{BUSINESS_NAME}}</h1>${curatedV2Form}<a href="mailto:{{EMAIL}}">Email</a></main>`,
  ]]), [{ name: 'BUSINESS_NAME', default: 'Practice' }, { name: 'EMAIL' }], {
    requireStandardInquiryForms: true,
  });
  assert.equal(strictV3.pass, false);
  assert.match(strictV3.errors.join('\n'), /not the standard inquiry schema/i);

  const valid = validateTemplateContract(new Map([[
    'index.html',
    `<main><h1>{{BUSINESS_NAME}}</h1>${standard}<a href="mailto:{{EMAIL}}">Email</a></main>`,
  ]]), [{ name: 'BUSINESS_NAME', default: 'Practice' }, { name: 'EMAIL' }], {
    requireStandardInquiryForms: true,
  });
  assert.equal(valid.pass, true, valid.errors.join('\n'));

  const unsafe = validateTemplateContract(new Map([[
    'index.html',
    `<main><h1>{{BUSINESS_NAME}}</h1>
     <form data-dc-standard-form="contact" name="contact" method="post" data-netlify="true">
       <input name="name" required><input type="email" name="email" required><input type="tel" name="phone">
       <textarea name="message" required></textarea><input type="password" name="portal_password">
       <input type="date" name="date_of_birth"><input type="file" name="medical_records">
       <input name="insurance_member_id">
     </form>
     <label>Emergency contact<input name="emergency_contact"></label>
     <a href="mailto:{{EMAIL}}">Email</a></main>`,
  ]]), [{ name: 'BUSINESS_NAME', default: 'Practice' }, { name: 'EMAIL' }], {
    requireStandardInquiryForms: true,
  });
  assert.equal(unsafe.pass, false);
  const errors = unsafe.errors.join('\n');
  assert.match(errors, /unsupported sensitive information/i);
  assert.match(errors, /not the standard inquiry schema/i);
  assert.match(errors, /outside the standard inquiry form/i);

  for (const [invalidForm, expected] of [
    [standard.replace('<form ', '<form data-x=">" action="/collect" '), /custom form action/i],
    [standard.replace('name="name"', 'name=" NAME "'), /exactly one name control|unsupported inquiry control/i],
    [standard.replace('name="contact"', 'name="CONTACT"'), /form name must be contact/i],
    [standard.replace('data-dc-standard-form="contact"', 'data-dc-standard-form="CONTACT"'), /missing contact form marker/i],
    [standard.replace('<form ', '<form novalidate '), /validation may not be disabled/i],
    [standard.replace('<button type="submit"', '<button type="submit" formmethod="get"'), /submission override/i],
    [standard.replace('<button type="submit"', '<button type="submit" disabled'), /enabled and available/i],
    [standard.replace('<p><label>Your name', '<fieldset disabled><p><label>Your name').replace('</p><button type="submit">', '</p></fieldset><button type="submit">'), /editable and available/i],
    [standard.replace('<label>Message ', '<label aria-label="Your Address">Message '), /control label must be Message/i],
    [standard.replace('<label>Message ', '<label for="missing">Message '), /control label must be Message/i],
    [standard.replace('<button type="submit"', '<button type="submit" aria-describedby="details"'), /canonical submission behavior/i],
    [`<div hidden>${standard}</div>`, /ancestors must be available/i],
    [`<fieldset disabled>${standard}</fieldset>`, /ancestors must be available|editable and available/i],
    [standard.replace('name="name" autocomplete="name"', 'name="name" autocomplete="cc-number"'), /autocomplete is not canonical/i],
    [standard.replace('name="name" autocomplete="name"', 'name="name" autocomplete="name" maxlength="0"'), /noncanonical submission constraint/i],
    [standard.replace('<label>Your name ', '<label>Email '), /control label must be Your name/i],
  ] as Array<[string, RegExp]>) {
    assert.match(validateStandardInquiryFormMarkup(invalidForm).join('\n'), expected, invalidForm);
  }
});

test('publication contract forbids form-level accessible-name overrides and validates control prompt sources', () => {
  const standard = '<form class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact"><p><label>Your name <input name="name" autocomplete="name" required></label></p><p><label>Email <input type="email" name="email" autocomplete="email" required></label></p><p><label>Phone (optional) <input type="tel" name="phone" autocomplete="tel"></label></p><p><label>Message <textarea name="message" rows="5" required></textarea></label></p><button type="submit">Send inquiry</button></form>';
  const validate = (body: string) => validateTemplateContract(new Map([[
    'index.html',
    `<main><h1>{{BUSINESS_NAME}}</h1>${body}<a href="mailto:{{EMAIL}}">Email</a></main>`,
  ]]), [{ name: 'BUSINESS_NAME', default: 'Practice' }, { name: 'EMAIL' }], {
    requireStandardInquiryForms: true,
  });

  const safe = validate(`<h2 id="contact-title">Contact our team</h2>${standard.replace('<form ', '<form aria-labelledby="contact-title" ')}`);
  assert.equal(safe.pass, false);
  assert.match(safe.errors.join('\n'), /canonical native accessibility semantics/i);

  const sensitive = validate(`<h2 id="intake-title">Medical history intake</h2>${standard.replace('<form ', '<form aria-labelledby="intake-title" ')}`);
  assert.equal(sensitive.pass, false);
  assert.match(sensitive.errors.join('\n'), /accessible (?:name|prompt|name or description) solicits sensitive/i);

  const dangling = validate(standard.replace('<form ', '<form aria-labelledby="removed-title" '));
  assert.equal(dangling.pass, false);
  assert.match(dangling.errors.join('\n'), /dangling or ambiguous ID reference/i);

  const ambiguous = validate(`<h2 id="contact-title">Contact</h2><p id="contact-title">Another label</p>${standard.replace('<form ', '<form aria-labelledby="contact-title" ')}`);
  assert.equal(ambiguous.pass, false);
  assert.match(ambiguous.errors.join('\n'), /dangling or ambiguous ID reference/i);

  for (const reference of ['aria-describedby', 'aria-details', 'aria-errormessage']) {
    const described = validate(`<p id="medical-prompt">Medical history</p>${standard.replace('name="message"', `id="message" name="message" ${reference}="medical-prompt"`)}`);
    assert.equal(described.pass, false, reference);
    assert.match(described.errors.join('\n'), /accessible prompt solicits sensitive|canonical nested label/i, reference);

    const danglingDescription = validate(standard.replace('name="message"', `name="message" ${reference}="missing-prompt"`));
    assert.equal(danglingDescription.pass, false, reference);
    assert.match(danglingDescription.errors.join('\n'), /dangling or ambiguous accessible-name reference|canonical nested label/i, reference);
  }

  const externalLabel = validate(`<label for="message">Medical history</label>${standard.replace('name="message"', 'id="message" name="message"')}`);
  assert.equal(externalLabel.pass, false);
  assert.match(externalLabel.errors.join('\n'), /accessible prompt solicits sensitive|canonical nested label/i);

  const hiddenLabel = validate(`<label for="message" hidden>Message</label>${standard.replace('<label>Message <textarea name="message"', '<span><textarea id="message" name="message"').replace('</textarea></label>', '</textarea></span>')}`);
  assert.equal(hiddenLabel.pass, false);
  assert.match(hiddenLabel.errors.join('\n'), /must have an accessible name|canonical nested label/i);

  const externalSubmitter = validate(`${standard.replace('<form ', '<form id="contact-form" ')}<button form="contact-form" formaction="/collect">Alternate submit</button>`);
  assert.equal(externalSubmitter.pass, false);
  assert.match(externalSubmitter.errors.join('\n'), /externally associated form controls|exactly one submit button/i);

  const v2Description = validateTemplateContract(new Map([[
    'index.html',
    `<main><h1>{{BUSINESS_NAME}}</h1><p id="details">Medical history and medications</p>${standard.replace(' data-dc-standard-form="contact"', '').replace('<form ', '<form aria-describedby="details" ')}<a href="mailto:{{EMAIL}}">Email</a></main>`,
  ]]), [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }], { requireStandardInquiryForms: false });
  assert.equal(v2Description.pass, false);
  assert.match(v2Description.errors.join('\n'), /accessible name or description solicits sensitive/i);

  for (const formOwnedSurface of [
    '<form id="f"></form><input type="submit" form="f" value="Send medical history">',
    '<form id="f"></form><input type="image" form="f" alt="Upload medical records">',
    '<p id="insurance-prompt">Enter insurance policy number</p><form id="f"></form><button form="f" aria-describedby="insurance-prompt">Send</button>',
    '<form id="f"></form><select form="f" name="topic"><option>Medical history</option></select>',
  ]) {
    const result = validateTemplateContract(new Map([[
      'index.html',
      `<main><h1>{{BUSINESS_NAME}}</h1>${formOwnedSurface}<a href="mailto:{{EMAIL}}">Email</a></main>`,
    ]]), [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }], { requireStandardInquiryForms: false });
    assert.equal(result.pass, false, formOwnedSurface);
    assert.match(result.errors.join('\n'), /sensitive|unsupported/i, formOwnedSurface);
  }

  const referencedAlternative = validate(`<span id="safe-name">Your name</span><img id="unsafe-alt" alt="Medical history">${standard.replace(
    'name="name"',
    'id="name-field" name="name" aria-labelledby="safe-name unsafe-alt"',
  )}`);
  assert.equal(referencedAlternative.pass, false);
  assert.match(referencedAlternative.errors.join('\n'), /accessible prompt solicits sensitive|canonical nested label/i);
});

test('publication contract audits SVG, shadow DOM, fabricated ratings, and every DOM ID', () => {
  const fields = [{ name: 'BUSINESS_NAME' }, { name: 'EMAIL' }];
  const shell = (body: string): Map<string, string> => new Map([[
    'index.html',
    `<main><h1>{{BUSINESS_NAME}}</h1>${body}<a href="mailto:{{EMAIL}}">Email</a></main>`,
  ]]);
  for (const markup of [
    '<svg><title>Jane Doe · Client reviews · $99</title></svg>',
    '<svg><text>Sessions support your immune system.</text></svg>',
    '<svg><foreignObject><div>care@example.com</div></foreignObject></svg>',
    '<template shadowrootmode="open"><p>Jane Doe · $99</p></template>',
    '<p>Rated 5.0 by local clients</p>',
    '<p>Rated five stars by local clients</p>',
    '<p>Five stars from our clients</p>',
    '<p>Rated four point nine by clients</p>',
    '<p>4.9-star rating</p>',
    '<p>5-star client rating</p>',
    '<p>Rated ★ ★ ★ ★ ★</p>',
    '<p>★★★★★</p>',
    '<p>95% would recommend us</p>',
    '<p>Loved by 1,000 customers</p>',
    '<p>Serving 500 clients since 2020</p>',
    '<blockquote>“Working with this practice transformed my life.”</blockquote><cite>Sarah M., client</cite>',
    '<figure><blockquote>“I finally feel like myself again.”</blockquote><figcaption>— Sarah M.</figcaption></figure>',
    '<q>I highly recommend this practice.</q><span>— Taylor, client</span>',
    '<p>Call (212)867-5309</p>',
    '<p>Call 2128675309</p>',
    '<p>Call +44 20 7946 0958</p>',
    '<svg><image href="https://evil.invalid/tracker.png"></image></svg>',
    '<svg><use href="https://evil.invalid/sprite.svg#x"></use></svg>',
  ]) {
    const result = validateTemplateContract(shell(markup), fields);
    assert.equal(result.pass, false, markup);
  }
  const inert = validateTemplateContract(shell('<!-- Jane Doe --><script type="application/json">"care@example.com"</script><template><p>Jane Doe · $99</p></template>'), fields);
  assert.equal(inert.pass, true, inert.errors.join('\n'));

  for (const safe of [
    '<p>95% pure essential oil.</p>',
    '<p>Serving the community since 2020.</p>',
    '<p>Order reference 2128675309.</p>',
    '<blockquote>Appointments are subject to the cancellation policy.</blockquote>',
    '<figure><blockquote>General education supports informed decisions.</blockquote><figcaption>Mindful Living Magazine</figcaption></figure>',
    '<div class="list"><span>Digestive balance</span><span>Hormones &amp; inflammation</span></div>',
    '<svg><use href="#local-symbol"></use><image href="assets/local.png"></image></svg>',
  ]) {
    const result = validateTemplateContract(shell(safe), fields);
    assert.equal(result.pass, true, `${safe}\n${result.errors.join('\n')}`);
  }

  const duplicate = validateTemplateContract(shell('<div id="same">One</div><div id="same">Two</div>'), fields);
  assert.match(duplicate.errors.join('\n'), /duplicate DOM IDs/i);

  const unsafeSvg = validateTemplateContract(shell('<img src="assets/profile.svg" alt="Information">'), fields, {
    svgAssets: new Map([['assets/profile.svg', '<svg><title>Sessions support your immune system · Client reviews · $99</title><text>Jane Doe · care@example.com</text><script>alert(1)</script></svg>']]),
  });
  assert.equal(unsafeSvg.pass, false);
  assert.match(unsafeSvg.errors.join('\n'), /assets\/profile\.svg/);

  for (const remote of [
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.invalid/tracker.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><use href="//evil.invalid/sprite.svg#x"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="https://evil.invalid"><text>Learn more</text></a></svg>',
  ]) {
    const result = validateTemplateContract(shell('<img src="assets/remote.svg" alt="Information">'), fields, {
      svgAssets: new Map([['assets/remote.svg', remote]]),
    });
    assert.equal(result.pass, false, remote);
    assert.match(result.errors.join('\n'), /unsafe embedded URL|non-local SVG/i, remote);
  }
});
