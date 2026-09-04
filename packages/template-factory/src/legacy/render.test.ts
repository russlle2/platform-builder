import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { repairLegacyTemplate } from './compose.js';
import { addAccessibilityOverrides, addContrastOverrides } from './pipeline.js';
import {
  hammingDistance,
  hydrateSentinelHtml,
  recommendedRenderWorkers,
  renderTemplateTasks,
  safeForegroundForBackground,
  startTemplateServer,
  writeEvidenceThumbnail,
} from './render.js';

test('sentinel hydration resolves every simple runtime field deterministically', () => {
  const hydrated = hydrateSentinelHtml('<h1>{{ BUSINESS_NAME }}</h1><a href="mailto:{{EMAIL}}">{{UNKNOWN_FIELD}}</a>');
  assert.match(hydrated, /Sentinel Clarity Studio/);
  assert.match(hydrated, /sentinel@example\.test/);
  assert.match(hydrated, /Sentinel unknown field/);
  assert.doesNotMatch(hydrated, /\{\{/);
});

test('local QA server hydrates HTML and serves assets without external publication', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-server-'));
  try {
    await mkdir(join(root, 'niche', 'slug'), { recursive: true });
    await writeFile(join(root, 'niche', 'slug', 'index.html'), '<!doctype html><html><body>{{BUSINESS_NAME}}</body></html>');
    const server = await startTemplateServer(root);
    try {
      const response = await fetch(`${server.origin}/niche/slug/index.html`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /Sentinel Clarity Studio/);
      assert.equal((await fetch(`${server.origin}/../not-allowed`)).status, 404);
    } finally {
      await server.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('perceptual hash distance and worker limits are bounded', () => {
  assert.equal(hammingDistance('0000000000000000', '000000000000000f'), 4);
  const pressureAwareWorkers = recommendedRenderWorkers(99);
  assert.ok(pressureAwareWorkers >= 2 && pressureAwareWorkers <= 6);
  assert.ok(recommendedRenderWorkers(3) <= 3, 'the requested worker count is an upper bound');
  assert.equal(recommendedRenderWorkers(-1), 1);
});

test('evidence thumbnails bound extremely tall pages to WebP-safe dimensions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-thumbnail-'));
  try {
    const source = await sharp({
      create: {
        width: 100,
        height: 20_000,
        channels: 4,
        background: '#ffffff',
      },
    }).png().toBuffer();
    const target = join(root, 'thumbnail.webp');
    await writeEvidenceThumbnail(source, target);
    const metadata = await sharp(await readFile(target)).metadata();
    assert.ok((metadata.width ?? 0) <= 320);
    assert.ok((metadata.height ?? 0) <= 4096);
    assert.equal(metadata.format, 'webp');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('contrast remediation chooses the safer foreground deterministically', () => {
  assert.equal(safeForegroundForBackground('#faf6f0'), '#000000');
  assert.equal(safeForegroundForBackground('#1e1735'), '#ffffff');
  assert.equal(safeForegroundForBackground('#8b5cf6'), '#000000');
  assert.equal(safeForegroundForBackground('transparent'), null);
});

test('browser contrast evidence covers every node, nested selectors, and ancestor opacity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-contrast-'));
  const templateDir = join(root, 'niche', 'slug', 'initial');
  const remediatedDir = join(root, 'niche', 'slug', 'remediated');
  const evidenceRoot = join(root, 'evidence');
  try {
    const links = Array.from({ length: 12 }, (_, index) =>
      `<li><a href="#section-${index}">Accessible destination ${index}</a></li>`,
    ).join('');
    const sourceHtml = `<!doctype html>
      <html lang="en"><head><meta charset="utf-8"><title>Contrast coverage</title>
      <link rel="stylesheet" href="assets/styles.css"></head><body>
      <main><h1>Contrast evidence fixture</h1>
      <p>This deliberately long introduction keeps every non-contrast browser quality gate satisfied during the focused accessibility fixture.</p>
      <ul id="faded">${links}</ul></main></body></html>`;
    const sourceCss = `
      :root { --dc-theme-safe: #111111; }
      body { color: var(--dc-theme-safe); background: #ffffff; }
      #faded { opacity: .9; }
      #faded li { background: #8b5cf6; }
      #faded a { color: #ffffff; }
    `;
    const materialize = async (directory: string, files: ReadonlyMap<string, string | Uint8Array>): Promise<void> => {
      for (const [relativePath, contents] of files) {
        const target = join(directory, ...relativePath.split('/'));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, contents);
      }
    };
    const initial = repairLegacyTemplate({
      slug: 'contrast-fixture',
      niche: 'wellness_coach',
      files: new Map([['index.html', sourceHtml], ['assets/styles.css', sourceCss]]),
    });
    await materialize(templateDir, initial.files);

    const evidence = await renderTemplateTasks(root, [{
      key: 'contrast-fixture',
      niche: 'wellness_coach',
      slug: 'contrast-fixture',
      page: 'index.html',
      templateDir,
    }], { evidenceRoot, workers: 1, retries: 0 });

    assert.equal(evidence.length, 2);
    for (const viewport of evidence) {
      assert.deepEqual([...new Set(viewport.issues.map((issue) => issue.code))], ['axe_color-contrast']);
      assert.equal(viewport.contrastRepairs?.length, 12);
      assert.ok(viewport.contrastRepairs?.every((repair) => repair.selector.includes('>a:nth-of-type(1)')));
      assert.ok(viewport.contrastRepairs?.every((repair) => repair.foreground === '#000000'));
      assert.ok(viewport.contrastRepairs?.every((repair) => repair.opacitySelectors?.includes('#faded')));
    }

    const remediatedHtml = addContrastOverrides(
      String(initial.files.get('index.html')),
      evidence,
    );
    const remediatedInput = new Map(initial.files);
    remediatedInput.set('index.html', remediatedHtml);
    const remediated = repairLegacyTemplate({
      slug: 'contrast-fixture',
      niche: 'wellness_coach',
      files: remediatedInput,
    });
    await materialize(remediatedDir, remediated.files);
    const verified = await renderTemplateTasks(root, [{
      key: 'contrast-fixture-remediated',
      niche: 'wellness_coach',
      slug: 'contrast-fixture-remediated',
      page: 'index.html',
      templateDir: remediatedDir,
    }], { evidenceRoot, workers: 1, retries: 0 });
    assert.ok(verified.every((viewport) => viewport.passed), JSON.stringify(verified.flatMap((item) => item.issues), null, 2));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('browser link-in-text-block evidence is repaired by exact viewport-scoped selectors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-link-distinction-'));
  const templateDir = join(root, 'niche', 'slug', 'initial');
  const remediatedDir = join(root, 'niche', 'slug', 'remediated');
  const evidenceRoot = join(root, 'evidence');
  try {
    const sourceHtml = `<!doctype html>
      <html lang="en"><head><meta charset="utf-8"><title>Link distinction coverage</title>
      <style>
        :root { --fixture-text: #333333; --fixture-link: #555555; }
        body { color: var(--fixture-text); background: #ffffff; font-family: Arial, sans-serif; }
        p a { color: var(--fixture-link); text-decoration: none; }
      </style></head><body><main><h1>Link distinction evidence fixture</h1>
      <p>This deliberately long paragraph keeps every unrelated browser quality gate satisfied while a
      <a href="index.html">subtle inline link remains visually indistinguishable</a> from the surrounding prose
      except for a small color difference that is insufficient on its own.</p></main></body></html>`;
    const materialize = async (directory: string, files: ReadonlyMap<string, string | Uint8Array>): Promise<void> => {
      for (const [relativePath, contents] of files) {
        const target = join(directory, ...relativePath.split('/'));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, contents);
      }
    };
    const initial = repairLegacyTemplate({
      slug: 'link-distinction-fixture',
      niche: 'wellness_coach',
      files: new Map([['index.html', sourceHtml]]),
    });
    await materialize(templateDir, initial.files);

    const evidence = await renderTemplateTasks(root, [{
      key: 'link-distinction-fixture',
      niche: 'wellness_coach',
      slug: 'link-distinction-fixture',
      page: 'index.html',
      templateDir,
    }], { evidenceRoot, workers: 1, retries: 0 });

    assert.equal(evidence.length, 2);
    for (const viewport of evidence) {
      assert.deepEqual([...new Set(viewport.issues.map((issue) => issue.code))], ['axe_link-in-text-block']);
      assert.equal(viewport.linkInTextBlockRepairs?.length, 1);
      assert.match(viewport.linkInTextBlockRepairs![0]!.selector, /^\[data-dc-edit-id="[A-Za-z0-9._:-]+"\]>a:nth-of-type\(1\)$/);
    }

    const initialHtml = String(initial.files.get('index.html'));
    const remediatedHtml = addAccessibilityOverrides(initialHtml, evidence);
    assert.notEqual(remediatedHtml, initialHtml, 'the deterministic remediation must change the page artifact');
    assert.match(remediatedHtml, /@media\(min-width:601px\)/);
    assert.match(remediatedHtml, /@media\(max-width:600px\)/);
    assert.match(remediatedHtml, /text-decoration-line:underline!important/);
    const twiceRemediatedHtml = addAccessibilityOverrides(remediatedHtml, evidence);
    assert.equal((twiceRemediatedHtml.match(/id="dc-a11y-contrast-overrides"/g) ?? []).length, 1);

    const remediatedInput = new Map(initial.files);
    remediatedInput.set('index.html', remediatedHtml);
    const remediated = repairLegacyTemplate({
      slug: 'link-distinction-fixture',
      niche: 'wellness_coach',
      files: remediatedInput,
    });
    assert.equal(
      remediated.qualityReceipt.status,
      'passed',
      remediated.qualityReceipt.checks.filter((check) => !check.pass).map((check) => check.detail).join('\n'),
    );
    await materialize(remediatedDir, remediated.files);
    const verified = await renderTemplateTasks(root, [{
      key: 'link-distinction-fixture-remediated',
      niche: 'wellness_coach',
      slug: 'link-distinction-fixture-remediated',
      page: 'index.html',
      templateDir: remediatedDir,
    }], { evidenceRoot, workers: 1, retries: 0 });
    assert.equal(verified.length, 2);
    assert.ok(verified.every((viewport) => viewport.passed), JSON.stringify(verified.flatMap((item) => item.issues), null, 2));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('browser QA exercises constrained forms, static ARIA repairs, and every supported theme token type', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-structural-repairs-'));
  const templateDir = join(root, 'niche', 'slug');
  const evidenceRoot = join(root, 'evidence');
  try {
    const sourceHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Structural repair coverage</title>
      <style>
        body { font-weight: 400; color: #111111; background: #ffffff; font-family: Arial, sans-serif; }
        button, input, select { font: inherit; }
      </style></head><body><main><h1>Structural browser repair fixture</h1>
      <p>This deliberately long introduction provides useful visible content while the browser checks repaired semantics, constrained forms, and customer theme mutations.</p>
      <div><button role="tab" aria-selected="true">Monthly</button></div>
      <div id="moods" role="list"><span role="listitem">Calm</span><button type="button">Focused</button></div>
      <ul id="loading"><li role="listitem">Pending</li> Loading current availability…</ul>
      <div role="listbox"><button type="button" role="option" aria-selected="true">Morning</button></div>
      <form id="inquiry"><label>Name <input required></label>
      <label>Preferred date <input type="date" min="2030-01-01" required></label>
      <label>Session <select required><option value="">Choose one</option><option value="intro">Introduction</option></select></label>
      <label><input type="checkbox" name="consent" required> I agree to be contacted about this inquiry.</label>
      <button type="submit">Send inquiry</button></form>
      <label>Postal code <input form="inquiry" id="postal-code" pattern="[0-9]{5}" maxlength="5" required></label></main></body></html>`;
    const repaired = repairLegacyTemplate({
      slug: 'structural-browser-repair-fixture',
      niche: 'wellness_coach',
      files: new Map([['index.html', sourceHtml]]),
    });
    const repairedHtml = String(repaired.files.get('index.html'));
    assert.doesNotMatch(repairedHtml, /role="(?:tab|list|listitem|listbox|option)"|aria-selected=/);
    assert.match(repairedHtml, /data-dc-repaired-semantics="tab"/);
    assert.match(repairedHtml, /data-dc-repaired-semantics="aria-list"/);
    assert.match(repairedHtml, /data-dc-repaired-semantics="list"/);
    assert.match(repairedHtml, /form="inquiry" id="postal-code" pattern="\[0-9\]\{5\}" maxlength="5" required="" name="postal-code"/);
    assert.ok([...repaired.files.values()].some((contents) =>
      typeof contents === 'string' && /font-weight:\s*var\(--dc-theme-font_/.test(contents),
    ));
    for (const [relativePath, contents] of repaired.files) {
      const target = join(templateDir, ...relativePath.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }

    const evidence = await renderTemplateTasks(root, [{
      key: 'structural-browser-repair-fixture',
      niche: 'wellness_coach',
      slug: 'structural-browser-repair-fixture',
      page: 'index.html',
      templateDir,
    }], { evidenceRoot, workers: 1, retries: 0 });

    assert.equal(evidence.length, 2);
    assert.ok(evidence.every((viewport) => viewport.passed), JSON.stringify(evidence, null, 2));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('theme smoke probes later selector matches when the first match is cascade-overridden', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-theme-cascade-'));
  const templateDir = join(root, 'niche', 'slug');
  const evidenceRoot = join(root, 'evidence');
  try {
    const repaired = repairLegacyTemplate({
      slug: 'theme-cascade-fixture',
      niche: 'wellness_coach',
      files: new Map([['index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Theme cascade coverage</title>
        <style>.item{color:#123456}.item:first-child{color:inherit}</style></head><body><main><h1>Theme cascade fixture</h1>
        <p class="item">The first matching element deliberately overrides the shared theme-backed declaration.</p>
        <p class="item">The second matching element genuinely uses the customer-editable theme token and must be tested.</p>
        <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
    });
    for (const [relativePath, contents] of repaired.files) {
      const target = join(templateDir, ...relativePath.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }
    const evidence = await renderTemplateTasks(root, [{
      key: 'theme-cascade-fixture',
      niche: 'wellness_coach',
      slug: 'theme-cascade-fixture',
      page: 'index.html',
      templateDir,
    }], { evidenceRoot, workers: 1, retries: 0 });

    assert.equal(evidence.length, 2);
    assert.ok(evidence.every((viewport) => viewport.passed), JSON.stringify(evidence, null, 2));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
