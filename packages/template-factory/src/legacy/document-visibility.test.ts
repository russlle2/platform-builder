import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { repairLegacyTemplate } from './compose.js';
import { repairStylesheet } from './repair.js';
import { renderTemplateTasks } from './render.js';

test('document visibility repair restores only a bare top-level root hide and is idempotent', () => {
  for (const selector of ['html', ':root', 'html,:root']) {
    for (const value of ['hidden', 'collapse']) {
      const source = `${selector}{visibility:${value}!important;padding:3px;opacity:0;overflow:hidden;transform:scale(.98)}`;
      const first = repairStylesheet(source, 'styles.css').css;
      assert.ok(first.includes(`${selector}{visibility:visible!important;padding:3px;opacity:0;overflow:hidden;transform:scale(.98)}`), first);
      assert.equal(repairStylesheet(first, 'styles.css').css, first);
    }
  }
});

test('document visibility repair preserves intentional hidden states, descendants and conditional rules', () => {
  const rules = [
    'html[hidden]{visibility:hidden}',
    'html.loading{visibility:hidden}',
    ':root[aria-hidden=true]{visibility:collapse}',
    'body.modal-open{visibility:hidden}',
    'html .private-note{visibility:hidden}',
    'html>body .drawer{visibility:collapse}',
    'html,.modal{visibility:hidden}',
    ':root,.drawer[hidden]{visibility:collapse}',
    '.wrapper{html{visibility:hidden}}',
    'html{&.loading{visibility:hidden}}',
    '@media print{html{visibility:hidden}}',
    '@media(max-width:600px){:root{visibility:hidden}}',
    '@supports(display:grid){html{visibility:collapse}}',
    '@keyframes reveal{from{visibility:hidden}to{visibility:visible}}',
    '@keyframes unusual{html{visibility:hidden}}',
    'body{visibility:hidden}',
    'html{visibility:visible;display:none}',
  ];
  const repaired = repairStylesheet(rules.join(''), 'styles.css').css;
  for (const rule of rules) assert.ok(repaired.includes(rule), `Changed protected rule: ${rule}\n${repaired}`);
  assert.equal(repairStylesheet(repaired, 'styles.css').css, repaired);
});

test('inline and linked root hides retain authored copy and physical edit paths at both viewports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-document-visibility-'));
  const templateDir = join(root, 'wellness_coach', 'document-visibility');
  try {
    const repaired = repairLegacyTemplate({
      slug: 'document-visibility', niche: 'wellness_coach',
      files: new Map<string, string | Uint8Array>([
        ['index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A quieter place to begin</title><style>html{visibility:hidden}</style><link rel="stylesheet" href="styles.css"></head><body>
          <header><nav><a href="index.html">Home</a><a href="mailto:{{EMAIL}}">Contact the studio</a></nav></header>
          <main class="authored-card"><h1>A quieter place to begin</h1><p>This original introduction explains how individual coaching conversations create space to reflect on everyday priorities and choose a practical next step.</p>
          <section class="authored-details"><h2>Make room for your next step</h2><p>Explore the session format and ask about current availability before deciding whether the studio is a useful fit for you.</p></section>
          <aside class="private-note" hidden><p id="hidden-copy">This intentionally closed panel must remain hidden and unadvertised to the editor.</p></aside>
          <p><a href="mailto:{{EMAIL}}">Ask about the session</a></p></main>
          <script>document.addEventListener('DOMContentLoaded',function(){document.documentElement.style.visibility='';});</script></body></html>`],
        ['styles.css', ':root{visibility:collapse!important;--surface:#fff;--ink:#111;--accent:#17472f}body{margin:0;background:var(--surface);color:var(--ink);font:16px Arial,sans-serif}header,main{width:min(60rem,92vw);margin:1rem auto}h1{color:#17472f}a{color:var(--accent)}.authored-card{padding:1.25rem;border:2px solid #17472f;border-radius:12px}.authored-details{padding-block:1rem}.private-note{visibility:hidden;display:none}'],
        ['fields.json', JSON.stringify({ BUSINESS_NAME: 'The Quiet Studio', EMAIL: 'hello@example.com' })],
      ]),
    });
    const html = String(repaired.files.get('index.html'));
    assert.match(html, /<main class="authored-card"/);
    assert.match(html, /A quieter place to begin/);
    assert.match(html, /This original introduction explains how individual coaching conversations/);
    assert.match(html, /Make room for your next step/);
    assert.match(html, /data-dc-edit-id=/);
    const hiddenPanel = html.match(/<aside\b[^>]*class="private-note"[^>]*>[\s\S]*?<\/aside>/)?.[0];
    assert.ok(hiddenPanel, 'The authored hidden panel must remain present.');
    assert.match(hiddenPanel, /\bhidden(?:="")?/);
    assert.doesNotMatch(hiddenPanel, /data-(?:dc|pb)-edit-id=/);
    assert.ok(String(repaired.files.get('styles.css')).includes('.private-note{visibility:hidden;display:none}'));
    for (const [path, contents] of repaired.files) {
      const target = join(templateDir, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }
    const evidence = await renderTemplateTasks(root, [{
      key: 'document-visibility', niche: 'wellness_coach', slug: 'document-visibility', page: 'index.html', templateDir,
    }], { evidenceRoot: join(root, 'evidence'), workers: 1, retries: 0 });
    assert.deepEqual(evidence.map((item) => item.viewport).sort(), ['desktop', 'mobile']);
    assert.ok(evidence.every((item) => item.passed), JSON.stringify(evidence, null, 2));
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.match(basename(root), /^dc-document-visibility-/);
    await rm(root, { recursive: true, force: true });
  }
});
