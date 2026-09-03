import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractTemplateTokens,
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
  assert.match(errors, /guaranteed outcome/i);
  assert.match(errors, /hard-coded external/i);
  assert.match(errors, /sensitive health information/i);
});
