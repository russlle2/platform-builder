import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { repairLegacyTemplate } from './compose.js';
import { repairStylesheet } from './repair.js';
import { renderTemplateTasks } from './render.js';

test('script-dependent content repair expands base content rules while preserving hidden UI states', () => {
  const source = '.reveal{opacity:0;transform:translateY(18px)}.acc-body{max-height:0;overflow:hidden}.modal{display:none}.reveal.hidden{display:none}.accordion-body[hidden]{display:none}details:not([open]) .answer{display:none}';
  const first = repairStylesheet(source, 'styles.css');
  assert.match(first.css, /\.reveal\{opacity:1;transform:none\}/);
  assert.match(first.css, /\.acc-body\{max-height:none;overflow:visible\}/);
  assert.match(first.css, /\.modal\{display:none\}/);
  assert.match(first.css, /\.reveal\.hidden\{display:none\}/);
  assert.match(first.css, /\.accordion-body\[hidden\]\{display:none\}/);
  assert.match(first.css, /details:not\(\[open\]\) \.answer\{display:none\}/);
  assert.equal(repairStylesheet(first.css, 'styles.css').css, first.css);
});

test('script-dependent content repair preserves nested rules and ancestor activation states', () => {
  const hiddenRules = [
    '.drawer[aria-hidden=true] .reveal{visibility:hidden;opacity:0}',
    '.is-closed .acc-body{max-height:0;overflow:hidden}',
    'details:not([open]) .accordion-body{display:none}',
    '.drawer[aria-hidden=true]{.reveal{opacity:0;visibility:hidden}}',
    '.wrapper{[data-reveal]{opacity:0}}',
    '.reveal,.modal .reveal{opacity:0}',
  ].join('');
  const source = '.reveal{opacity:0;&.is-closed{visibility:hidden;max-height:0}}'
    + hiddenRules + '@media(min-width:600px){.acc-body{max-height:0;overflow:hidden}}';
  const repaired = repairStylesheet(source, 'styles.css').css;
  assert.match(repaired, /\.reveal\{opacity:1;&\.is-closed\{visibility:hidden;max-height:0\}\}/);
  assert.ok(repaired.includes(hiddenRules));
  assert.match(repaired, /@media\(min-width:600px\)\{\.acc-body\{max-height:none;overflow:visible\}\}/);
  assert.equal(repairStylesheet(repaired, 'styles.css').css, repaired);
});

test('reveal-wrapped inquiry forms and legacy accordion copy remain usable after script removal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-static-content-'));
  const templateDir = join(root, 'niche', 'static-content');
  try {
    const repaired = repairLegacyTemplate({
      slug: 'static-content', niche: 'sound_bath',
      files: new Map<string, string | Uint8Array>([
        ['index.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session information</title><link rel="stylesheet" href="styles.css"></head><body><header><nav><a href="index.html">Home</a><a href="mailto:{{EMAIL}}">Contact</a></nav></header><main><section class="card reveal"><h1>{{BUSINESS_NAME}}</h1><p>Find practical information about the session and send questions about current availability.</p><form><label>Your name<input name="name"></label><button>Send</button></form></section><section class="accordion"><h2>Session information</h2><div class="acc-item"><h3>What should I bring?</h3><div class="acc-body"><p>Bring a comfortable layer and contact the studio about the current session format.</p></div></div></section><div class="modal" hidden><p>A hidden dialog stays hidden.</p></div></main></body></html>'],
        ['styles.css', ':root{--surface:#fff;--ink:#111;--accent:#17472f}body{background:var(--surface);color:var(--ink);font:16px Arial,sans-serif}h1{color:#17472f}a{color:var(--accent)}header,main{width:min(60rem,92vw);margin:1rem auto}.card{padding:1rem}.reveal{opacity:0;transform:translateY(18px);transition:opacity 480ms ease}.reveal.in{opacity:1;transform:none}.acc-body{max-height:0;overflow:hidden}.modal{display:none}'],
        ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
      ]),
    });
    for (const [path, contents] of repaired.files) {
      const target = join(templateDir, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }
    const evidence = await renderTemplateTasks(root, [{ key: 'static-content', niche: 'sound_bath', slug: 'static-content', page: 'index.html', templateDir }], {
      evidenceRoot: join(root, 'evidence'), workers: 1, retries: 0,
    });
    assert.equal(evidence.length, 2);
    assert.ok(evidence.every((item) => item.passed), JSON.stringify(evidence, null, 2));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
