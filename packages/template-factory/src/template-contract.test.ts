import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UNSUPPORTED_FABRICATED_METRIC_RE,
  UNSUPPORTED_PROOF_TEXT_RE,
  containsUnsafeEmbeddedMarkupUrl,
  containsUnsupportedOutcomeClaim,
  extractTemplateTokens,
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
  const standard = '<form class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact"><label>Name<input name="name" required></label><label>Email<input type="email" name="email" required></label><label>Phone<input type="tel" name="phone"></label><label>Message<textarea name="message" required></textarea></label><button type="submit">Send inquiry</button></form>';
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
});

test('publication contract resolves form aria-labelledby references and rejects unsafe names', () => {
  const standard = '<form class="dc-contact-form" name="contact" method="post" data-netlify="true" data-dc-standard-form="contact"><label>Name<input name="name" required></label><label>Email<input type="email" name="email" required></label><label>Phone<input type="tel" name="phone"></label><label>Message<textarea name="message" required></textarea></label><button type="submit">Send inquiry</button></form>';
  const validate = (body: string) => validateTemplateContract(new Map([[
    'index.html',
    `<main><h1>{{BUSINESS_NAME}}</h1>${body}<a href="mailto:{{EMAIL}}">Email</a></main>`,
  ]]), [{ name: 'BUSINESS_NAME', default: 'Practice' }, { name: 'EMAIL' }], {
    requireStandardInquiryForms: true,
  });

  const safe = validate(`<h2 id="contact-title">Contact our team</h2>${standard.replace('<form ', '<form aria-labelledby="contact-title" ')}`);
  assert.equal(safe.pass, true, safe.errors.join('\n'));

  const sensitive = validate(`<h2 id="intake-title">Medical history intake</h2>${standard.replace('<form ', '<form aria-labelledby="intake-title" ')}`);
  assert.equal(sensitive.pass, false);
  assert.match(sensitive.errors.join('\n'), /accessible name solicits sensitive/i);

  const dangling = validate(standard.replace('<form ', '<form aria-labelledby="removed-title" '));
  assert.equal(dangling.pass, false);
  assert.match(dangling.errors.join('\n'), /dangling or ambiguous ID reference/i);

  const ambiguous = validate(`<h2 id="contact-title">Contact</h2><p id="contact-title">Another label</p>${standard.replace('<form ', '<form aria-labelledby="contact-title" ')}`);
  assert.equal(ambiguous.pass, false);
  assert.match(ambiguous.errors.join('\n'), /dangling or ambiguous ID reference/i);
});
