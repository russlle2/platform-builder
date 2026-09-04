import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { repairLegacyTemplate } from './compose.js';
import { satisfiesVisualAliasThresholds } from './dedupe.js';
import { createNeutralFallbackFiles } from './fallback.js';
import { addAccessibilityOverrides, addContrastOverrides, verifyStaticArtifact } from './pipeline.js';
import { LEGACY_COMPATIBILITY_SCRIPT } from './repair.js';
import {
  compareViewportScreenshotPixels,
  hammingDistance,
  hydrateSentinelHtml,
  isAllowedTemplateRenderRequest,
  losslessScreenshotSsim,
  recommendedRenderWorkers,
  removeTemporaryComparisonScreenshots,
  renderTemplateTasks,
  safeForegroundForBackground,
  startTemplateServer,
  temporaryComparisonScreenshotPath,
  thumbnailSsim,
  verifyRetainedThumbnailEvidence,
  writeEvidenceThumbnail,
} from './render.js';

test('browser request policy allows only same-origin resources and raster image data', () => {
  const origin = 'http://127.0.0.1:4173';
  const raster = 'data:image/png;base64,AAAA';
  assert.equal(isAllowedTemplateRenderRequest(origin, `${origin}/template/index.html`, 'document'), true);
  assert.equal(isAllowedTemplateRenderRequest(origin, 'about:blank', 'document'), true);
  assert.equal(isAllowedTemplateRenderRequest(origin, raster, 'image'), true);
  assert.equal(isAllowedTemplateRenderRequest(origin, raster, 'stylesheet'), false);
  assert.equal(isAllowedTemplateRenderRequest(origin, 'data:image/svg+xml,<svg/>', 'image'), false);
  assert.equal(isAllowedTemplateRenderRequest(origin, 'data:text/html,<script>alert(1)</script>', 'document'), false);
  assert.equal(isAllowedTemplateRenderRequest(origin, `blob:${origin}/transient`, 'image'), false);
  assert.equal(isAllowedTemplateRenderRequest(origin, 'https://example.test/remote.png', 'image'), false);
});

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

test('every topology page uses the shared customer route while nested assets and compatibility behavior remain functional', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-customer-route-'));
  const templateDir = join(root, 'artifacts', 'niche', 'topology-fixture', 'hash');
  const evidenceRoot = join(root, 'evidence');
  const pages = ['index.html', 'pages/services.html', 'pages/contact/form.html'];
  const pageMarkup = (page: string, prefix: string, heading: string, link: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title>
    <link rel="stylesheet" href="${prefix}assets/css/styles.css"><link rel="stylesheet" href="${prefix}assets/css/secondary.css"></head><body class="hero" data-dc-image-id="css_000000000000000001">
    <header><nav aria-label="Primary"><button type="button" aria-controls="site-menu" aria-expanded="false">Menu</button><div id="site-menu"><a href="${link}">Another page</a></div></nav></header>
    <main><h1 data-dc-edit-id="txt_000000000000000001">{{BUSINESS_NAME}}</h1><p data-dc-edit-id="txt_000000000000000002">${heading} gives visitors clear, practical information about the service, what to expect, and how to make a confident next-step decision.</p>
    <p data-dc-edit-id="txt_000000000000000003" data-dc-edit-attribute="title" title="Helpful context">Hover for more context about this page.</p>
    <label>Focus <select><option data-dc-edit-id="txt_000000000000000004">Calm</option></select></label>
    <details><summary data-dc-edit-id="txt_000000000000000005">What should I expect?</summary><p data-dc-edit-id="txt_000000000000000006">A clear next step after opening this disclosure.</p></details>
    <a class="linked-image" href="${link}"><img data-dc-image-id="img_000000000000000001" src="${prefix}assets/img/hero.png" alt="Calm geometric landscape"></a>
    <picture><source data-dc-image-id="img_000000000000000002" media="(min-width: 700px)" srcset="${prefix}assets/img/hero.png 1x"><img data-dc-image-id="img_000000000000000003" src="${prefix}assets/img/hero.png" alt="Responsive calm geometric landscape"></picture>
    <form name="contact" method="post" data-netlify="true" data-dc-standard-form="contact"><label>Name <input name="name" autocomplete="name" required></label><label>Email <input type="email" name="email" autocomplete="email" required></label><label>Phone <input type="tel" name="phone" autocomplete="tel"></label><label>Message <textarea name="message" required></textarea></label><button type="submit">Send inquiry</button></form>
    <a href="mailto:{{EMAIL}}">Email the studio</a><a class="mobile-navigation-fallback" href="${link}">Continue</a></main><div class="background-hit-surface" style="height:24px"></div><script defer src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script></body></html>`;
  const tasks = pages.map((page) => ({
    key: 'customer-route-topology',
    niche: 'wellness_coach',
    slug: 'customer-route-topology',
    page,
    templateDir,
  }));
  try {
    const files = new Map<string, string | Uint8Array>([
      ['template.json', `${JSON.stringify({
        contractVersion: 3,
        legacySlug: 'customer-route-topology',
        slug: 'customer-route-topology',
        niche: 'wellness_coach',
        pages,
        pageRoles: { 'index.html': 'home', 'pages/services.html': 'services', 'pages/contact/form.html': 'contact' },
      })}\n`],
      ['fields.json', `${JSON.stringify({
        contractVersion: 3,
        fields: [
          { name: 'BUSINESS_NAME', label: 'Business name', type: 'text' },
          { name: 'EMAIL', label: 'Email', type: 'email' },
        ],
      })}\n`],
      ['index.html', pageMarkup('index.html', '', 'Home overview', 'pages/services.html')],
      ['pages/services.html', pageMarkup('pages/services.html', '../', 'Services overview', '../index.html')],
      ['pages/contact/form.html', pageMarkup('pages/contact/form.html', '../../', 'Contact and booking', '../../index.html')],
      ['assets/css/styles.css', ':root{--dc-theme-color_bg:#fff;--dc-theme-color_text:#111;--dc-theme-font_body:Arial,sans-serif}*{box-sizing:border-box}body{background:var(--dc-theme-color_bg);color:var(--dc-theme-color_text);font-family:var(--dc-theme-font_body)}main{max-width:60rem;margin:auto;padding:2rem}.hero{background-image:url("../img/pattern.png")}@media(max-width:600px){header nav a{display:none}}'],
      ['assets/css/secondary.css', ':root{--dc-theme-color_secondary:#24513f}.secondary{color:var(--dc-theme-color_secondary)}'],
      ['assets/js/dc-compat.js', LEGACY_COMPATIBILITY_SCRIPT],
      ['assets/img/hero.png', await sharp({ create: { width: 32, height: 20, channels: 3, background: '#8aa899' } }).png().toBuffer()],
      ['assets/img/pattern.png', await sharp({ create: { width: 8, height: 8, channels: 3, background: '#dce8e1' } }).png().toBuffer()],
      ['harness.html', '<!doctype html><html><head><meta charset="utf-8"><title>Iframe harness</title></head><body></body></html>'],
    ]);
    for (const [relativePath, contents] of files) {
      const target = join(templateDir, ...relativePath.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }

    const server = await startTemplateServer(root, { renderTasks: tasks });
    try {
      const nestedUrl = `${server.origin}/artifacts/niche/topology-fixture/hash/pages/contact/form.html`;
      const response = await fetch(nestedUrl);
      const previewDocument = await response.text();
      assert.equal(response.status, 200, previewDocument);
      assert.equal(response.headers.get('x-dc-preview-composition'), 'shared-customer-route');
      assert.equal(response.headers.get('x-dc-manifest-fields'), '2');
      assert.equal(response.headers.get('x-dc-theme-stylesheets'), '2');
      assert.match(previewDocument, /Sentinel Clarity Studio/);
      assert.doesNotMatch(previewDocument, /\{\{/);
      assert.equal((previewDocument.match(/data-dc-runtime="customer-preview-editor-v1"/g) ?? []).length, 1);
      assert.match(previewDocument, /var currentPage = "pages\/contact\/form\.html";/);
      assert.match(previewDocument, /src="\/api\/templates\/__dc_compiler__\/[0-9a-f]{32}\/assets\/assets\/img\/hero\.png"/);
      const compatibilitySource = previewDocument.match(/src="(\/api\/templates\/__dc_compiler__\/[0-9a-f]{32}\/assets\/assets\/js\/dc-compat\.js)" data-dc-runtime="compatibility-v1"/)?.[1];
      assert.ok(compatibilitySource, previewDocument);
      assert.equal((await fetch(`${server.origin}${compatibilitySource}`)).status, 200);

      // Prove the same document works across the real opaque-origin iframe
      // boundary used by both customer editors, including parent validation,
      // prompt response, coordinated picture response, navigation, and form
      // compatibility semantics.
      const browser = await chromium.launch({ headless: true });
      try {
        const context = await browser.newContext({ serviceWorkers: 'block' });
        const parent = await context.newPage();
        await parent.goto(`${server.origin}/artifacts/niche/topology-fixture/hash/harness.html`);
        await parent.evaluate(({ srcdoc, sentinelImage }) => {
          const iframe = document.createElement('iframe');
          iframe.id = 'customer-preview';
          iframe.setAttribute('sandbox', 'allow-scripts allow-forms');
          document.body.appendChild(iframe);
          const state = {
            messages: [] as Array<Record<string, unknown>>,
            promptCalls: 0,
          };
          (window as typeof window & { __dcIframeHarness?: typeof state }).__dcIframeHarness = state;
          window.prompt = () => {
            state.promptCalls += 1;
            return 'SENTINEL ATTRIBUTE EDIT';
          };
          window.addEventListener('message', (event) => {
            if (event.source !== iframe.contentWindow || !event.data || typeof event.data !== 'object') return;
            const message = event.data as Record<string, unknown>;
            state.messages.push(message);
            if (message.type === 'editValueRequest') {
              const text = window.prompt('Edit text', String(message.original ?? ''));
              iframe.contentWindow?.postMessage({
                type: 'editValueResponse',
                nodeId: message.nodeId,
                attribute: message.attribute,
                text,
              }, '*');
            }
            if (message.type === 'imageSwapRequest' && typeof message.slotId === 'string' && Array.isArray(message.pictureSlotIds)) {
              const slotIds = [message.slotId, ...message.pictureSlotIds.filter((slotId) => slotId !== message.slotId)];
              iframe.contentWindow?.postMessage({
                type: 'imageSwapResponse',
                imageUrl: sentinelImage,
                slotId: message.slotId,
                slotIds,
              }, '*');
            }
          });
          iframe.srcdoc = srcdoc;
        }, {
          srcdoc: previewDocument,
          sentinelImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        });
        const frame = parent.frames().find((candidate) => candidate !== parent.mainFrame());
        assert.ok(frame);
        await frame.waitForFunction(() => (
          (window as typeof window & {
            __dailyClarityCustomerPreviewEditorRuntime?: string;
            __dailyClarityCompatibilityInstalled?: boolean;
          }).__dailyClarityCustomerPreviewEditorRuntime === 'customer-preview-editor-v1'
          && (window as typeof window & { __dailyClarityCompatibilityInstalled?: boolean })
            .__dailyClarityCompatibilityInstalled === true
        ));
        const leaf = frame.locator('[data-dc-edit-id="txt_000000000000000002"]');
        await leaf.dblclick();
        await leaf.press('Control+A');
        await leaf.fill('SENTINEL LEAF EDIT');
        await leaf.press('Tab');
        await frame.locator('[data-dc-edit-id="txt_000000000000000003"]').dblclick();
        await frame.waitForFunction(() => (
          document.querySelector<HTMLElement>('[data-dc-edit-id="txt_000000000000000003"]')?.title === 'SENTINEL ATTRIBUTE EDIT'
        ));
        await frame.locator('[data-dc-image-id="img_000000000000000001"]').click();
        await frame.waitForFunction(() => document.querySelector<HTMLImageElement>('[data-dc-image-id="img_000000000000000001"]')?.src.startsWith('data:image/png;base64,'));
        await frame.locator('[data-dc-image-id="img_000000000000000003"]').click();
        await frame.waitForFunction(() => document.querySelector<HTMLSourceElement>('[data-dc-image-id="img_000000000000000002"]')?.srcset.startsWith('data:image/png;base64,'));
        // The BODY owns the meaningful background, but the physical hit lands
        // on a safe descendant. The runtime must walk the composed path while
        // leaving the nested navigation link untouched.
        await frame.locator('.background-hit-surface').click();
        await frame.waitForFunction(() => document.body.style.backgroundImage.startsWith('url("data:image/png;base64,'));
        await frame.locator('a.mobile-navigation-fallback[href="../../index.html"]').click();

        const frameState = await frame.evaluate(async () => {
          const form = document.querySelector<HTMLFormElement>('form[data-dc-standard-form]')!;
          (form.elements.namedItem('name') as HTMLInputElement).value = 'Sentinel Visitor';
          (form.elements.namedItem('email') as HTMLInputElement).value = 'sentinel@example.test';
          (form.elements.namedItem('message') as HTMLTextAreaElement).value = 'A safe general inquiry.';
          let compatibilityEvent = false;
          form.addEventListener('dc:form-submit', () => { compatibilityEvent = true; }, { once: true });
          form.addEventListener('submit', (event) => event.preventDefault(), { once: true, capture: true });
          form.requestSubmit();
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
          return {
            leaf: document.querySelector<HTMLElement>('[data-dc-edit-id="txt_000000000000000002"]')!.textContent,
            title: document.querySelector<HTMLElement>('[data-dc-edit-id="txt_000000000000000003"]')!.title,
            standalone: document.querySelector<HTMLImageElement>('[data-dc-image-id="img_000000000000000001"]')!.getAttribute('src'),
            pictureSource: document.querySelector<HTMLSourceElement>('[data-dc-image-id="img_000000000000000002"]')!.getAttribute('srcset'),
            pictureImage: document.querySelector<HTMLImageElement>('[data-dc-image-id="img_000000000000000003"]')!.getAttribute('src'),
            background: document.body.style.backgroundImage,
            compatibilityEvent,
          };
        });
        const parentState = await parent.evaluate(() => (
          (window as typeof window & {
            __dcIframeHarness: { messages: Array<Record<string, unknown>>; promptCalls: number };
          }).__dcIframeHarness
        ));
        assert.equal(frameState.leaf, 'SENTINEL LEAF EDIT');
        assert.equal(frameState.title, 'SENTINEL ATTRIBUTE EDIT');
        assert.equal(frameState.compatibilityEvent, true);
        assert.match(frameState.standalone ?? '', /^data:image\/png;base64,/);
        assert.match(frameState.pictureSource ?? '', /^data:image\/png;base64,/);
        assert.match(frameState.pictureImage ?? '', /^data:image\/png;base64,/);
        assert.match(frameState.background, /^url\("data:image\/png;base64,/);
        assert.equal(parentState.promptCalls, 1);
        assert.ok(parentState.messages.some((message) => message.type === 'textEdited' && message.nodeId === 'txt_000000000000000002'));
        assert.ok(parentState.messages.some((message) => message.type === 'editValueRequest' && message.attribute === 'title'));
        assert.ok(parentState.messages.some((message) => message.type === 'imageSwapRequest'
          && message.slotId === 'img_000000000000000001'
          && Array.isArray(message.pictureSlotIds)
          && message.pictureSlotIds.length === 1));
        assert.ok(parentState.messages.some((message) => message.type === 'imageSwapRequest'
          && message.slotId === 'img_000000000000000003'
          && Array.isArray(message.pictureSlotIds)
          && message.pictureSlotIds.length === 2));
        assert.ok(parentState.messages.some((message) => message.type === 'imageSwapRequest'
          && message.slotId === 'css_000000000000000001'
          && Array.isArray(message.pictureSlotIds)
          && message.pictureSlotIds.length === 1));
        assert.equal(parentState.messages.filter((message) => message.type === 'imageSwapRequest').length, 3);
        const navigationMessages = parentState.messages.filter((message) => message.type === 'navigatePage');
        assert.equal(navigationMessages.length, 1);
        assert.equal(navigationMessages[0]?.page, 'index.html');
        await context.close();
      } finally {
        await browser.close();
      }
    } finally {
      await server.close();
    }

    const evidence = await renderTemplateTasks(root, tasks, {
      evidenceRoot,
      workers: 2,
      retries: 0,
    });
    assert.equal(evidence.length, pages.length * 2);
    assert.ok(evidence.every((item) => item.passed), JSON.stringify(evidence, null, 2));
    assert.deepEqual([...new Set(evidence.map((item) => item.page))].sort(), [...pages].sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('browser QA rejects advertised slots that cannot be physically hit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-unreachable-slots-'));
  const templateDir = join(root, 'niche', 'unreachable-slots');
  const evidenceRoot = join(root, 'evidence');
  try {
    const files = new Map<string, string | Uint8Array>([
      ['template.json', `${JSON.stringify({
        contractVersion: 3,
        legacySlug: 'unreachable-slots',
        slug: 'unreachable-slots',
        niche: 'wellness_coach',
        pages: ['index.html'],
      })}\n`],
      ['fields.json', `${JSON.stringify({ contractVersion: 3, fields: [] })}\n`],
      ['index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unreachable slot gate</title><link rel="stylesheet" href="assets/css/styles.css"></head><body><main><h1 data-dc-edit-id="txt_visible">Visible editor control</h1><p data-dc-edit-id="txt_copy">This deliberately substantial visible paragraph keeps the page valid while the browser proves that every advertised customer slot has a real pointer path at both required viewports.</p><p hidden data-dc-edit-id="txt_hidden">This slot can never receive a customer double click.</p><div class="blocked-pattern" aria-hidden="true" data-dc-image-id="img_blocked"></div><a href="mailto:contact@example.test">Contact the practice</a></main><script defer src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script></body></html>`],
      ['assets/css/styles.css', ':root{--dc-theme-color_bg:#fff;--dc-theme-color_text:#111;--dc-theme-font_body:Arial,sans-serif}*{box-sizing:border-box}body{margin:0;background:var(--dc-theme-color_bg);color:var(--dc-theme-color_text);font-family:var(--dc-theme-font_body)}main{padding:2rem}.blocked-pattern{width:120px;height:80px;pointer-events:none;background-image:url("../img/pattern.png")}'],
      ['assets/js/dc-compat.js', LEGACY_COMPATIBILITY_SCRIPT],
      ['assets/img/pattern.png', await sharp({ create: { width: 8, height: 8, channels: 3, background: '#dce8e1' } }).png().toBuffer()],
    ]);
    for (const [relativePath, contents] of files) {
      const target = join(templateDir, ...relativePath.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }

    const evidence = await renderTemplateTasks(root, [{
      key: 'unreachable-slots',
      niche: 'wellness_coach',
      slug: 'unreachable-slots',
      page: 'index.html',
      templateDir,
    }], { evidenceRoot, workers: 1, retries: 0 });

    assert.equal(evidence.length, 2);
    for (const viewport of evidence) {
      assert.equal(viewport.passed, false);
      const byCode = new Map(viewport.issues.map((issue) => [issue.code, issue.detail]));
      assert.match(byCode.get('edit_smoke_failed') ?? '', /txt_hidden/);
      assert.match(byCode.get('image_edit_smoke_failed') ?? '', /img_blocked/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('neutral fallback keeps the off-screen skip link out of customer editing and passes browser QA', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-neutral-fallback-'));
  const templateDir = join(root, 'niche', 'neutral-fallback');
  const evidenceRoot = join(root, 'evidence');
  try {
    const repaired = repairLegacyTemplate({
      slug: 'neutral-fallback',
      niche: 'wellness_coach',
      files: createNeutralFallbackFiles({
        slug: 'neutral-fallback',
        niche: 'wellness_coach',
        pages: ['index.html'],
        reason: 'browser fixture',
      }),
    });
    assert.doesNotMatch(String(repaired.files.get('index.html')), /class="skip-link"[^>]*data-dc-edit-id/);
    for (const [relativePath, contents] of repaired.files) {
      const target = join(templateDir, ...relativePath.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }

    const evidence = await renderTemplateTasks(root, [{
      key: 'neutral-fallback',
      niche: 'wellness_coach',
      slug: 'neutral-fallback',
      page: 'index.html',
      templateDir,
    }], { evidenceRoot, workers: 1, retries: 0 });

    assert.equal(evidence.length, 2);
    assert.ok(evidence.every((viewport) => viewport.passed), JSON.stringify(evidence, null, 2));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('compiler-v3 zero-image pages keep decorative hero layers while every advertised edit remains physically reachable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-decorative-layer-'));
  const templateDir = join(root, 'niche', 'decorative-layer');
  const evidenceRoot = join(root, 'evidence');
  try {
    const repaired = repairLegacyTemplate({
      slug: 'decorative-layer',
      niche: 'aromatherapy',
      files: new Map<string, string | Uint8Array>([
        ['index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Decorative layer</title><link rel="stylesheet" href="assets/css/styles.css"></head><body>
          <header><nav aria-label="Primary"><a href="index.html">Overview</a></nav></header><main id="main"><section class="hero">
          <div class="hero-bg"><img src="assets/img/pattern.svg" alt="" aria-hidden="true"><div class="hero-gradient"></div></div>
          <div class="hero-inner"><h1>{{BUSINESS_NAME}}</h1><p>This complete introduction gives customers clear information about current aromatherapy services, practical expectations, scheduling, and the next step without making unsupported promises.</p><a href="mailto:{{EMAIL}}">Ask about availability</a></div>
          </section><section class="responsive-copy" style="margin-top:18px;display:flex;gap:12px"><div><h2>How the process works</h2><p>Review the practical guidance and choose a next step that fits your current priorities and schedule.</p></div><div style="flex:1"><h2>Current workshops</h2><p>Ask which educational sessions are currently available and what to expect before reserving a place.</p></div></section></main></body></html>`],
        ['assets/css/styles.css', ':root{--surface:#fff;--ink:#111;--accent:#315f46}html{scroll-behavior:smooth}*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--ink);font:16px Arial,sans-serif}header,main{position:relative}nav,.hero-inner{width:min(70rem,92vw);margin:auto}.hero{position:relative;min-height:32rem;padding:5rem 0}.hero-bg,.hero-gradient{position:absolute;inset:0}.hero-bg img{width:100%;height:100%;object-fit:cover;opacity:.15}.hero-gradient{background:linear-gradient(120deg,rgba(49,95,70,.12),transparent)}.hero-inner{position:relative}.responsive-copy{margin-top:70rem!important}a{color:#17472f}@media(max-width:600px){header nav{display:none}}'],
        ['assets/img/pattern.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path fill="#dbe9e0" d="M0 0h10v10H0z"/></svg>'],
        ['fields.json', JSON.stringify({ BUSINESS_NAME: 'Legacy Studio', EMAIL: 'hello@example.com' })],
      ]),
    });
    const html = String(repaired.files.get('index.html'));
    assert.match(html, /<html[^>]*data-dc-catalog-version="3"/);
    assert.doesNotMatch(html, /data-dc-image-id/);
    assert.doesNotMatch(html, /<nav[^>]*data-dc-edit-id/);
    assert.match(html, /data-dc-decoration="pointer-layer"/);
    assert.match(html, /<img[^>]*data-dc-decoration="pointer-layer"/);
    assert.match(html, /<nav[^>]*data-dc-mobile-nav-fallback="true"/);
    assert.match(html, /data-dc-mobile-stack="true"/);
    for (const [relativePath, contents] of repaired.files) {
      const target = join(templateDir, ...relativePath.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }

    const evidence = await renderTemplateTasks(root, [{
      key: 'decorative-layer',
      niche: 'aromatherapy',
      slug: 'decorative-layer',
      page: 'index.html',
      templateDir,
    }], { evidenceRoot, workers: 1, retries: 0 });

    assert.equal(evidence.length, 2);
    assert.ok(evidence.every((viewport) => viewport.passed), JSON.stringify(evidence, null, 2));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('browser QA records same-origin HTTP error responses as failed requests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-http-status-'));
  const templateDir = join(root, 'niche', 'slug');
  const evidenceRoot = join(root, 'evidence');
  try {
    const repaired = repairLegacyTemplate({
      slug: 'same-origin-http-error',
      niche: 'wellness_coach',
      files: new Map([['index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>HTTP evidence</title></head><body><main>
        <h1>Same-origin response evidence</h1><p>This deliberately complete paragraph keeps the page readable while a missing local stylesheet returns an HTTP error.</p>
        <a href="mailto:{{EMAIL}}">Contact</a></main></body></html>`]]),
    });
    for (const [relativePath, contents] of repaired.files) {
      const target = join(templateDir, ...relativePath.split('/'));
      await mkdir(dirname(target), { recursive: true });
      const value = relativePath === 'index.html'
        ? String(contents).replace('</head>', '<link rel="stylesheet" href="missing-local-stylesheet.css"></head>')
        : contents;
      await writeFile(target, value);
    }

    const evidence = await renderTemplateTasks(root, [{
      key: 'same-origin-http-error',
      niche: 'wellness_coach',
      slug: 'same-origin-http-error',
      page: 'index.html',
      templateDir,
    }], { evidenceRoot, workers: 1, retries: 0 });

    assert.equal(evidence.length, 2);
    for (const viewport of evidence) {
      const failures = viewport.issues.filter((issue) => issue.code === 'failed_request');
      assert.equal(failures.length, 1, JSON.stringify(viewport.issues, null, 2));
      assert.match(failures[0]!.detail, /missing-local-stylesheet\.css \(HTTP 404\)/);
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
    const target = join(root, 'thumbnails', 'thumbnail.webp');
    await mkdir(dirname(target), { recursive: true });
    const attestation = await writeEvidenceThumbnail(source, target);
    const encoded = await readFile(target);
    const metadata = await sharp(encoded).metadata();
    assert.ok((metadata.width ?? 0) <= 320);
    assert.ok((metadata.height ?? 0) <= 4096);
    assert.equal(metadata.format, 'webp');
    assert.equal(attestation.bytes, encoded.byteLength);
    assert.equal(attestation.sha256, createHash('sha256').update(encoded).digest('hex'));
    await assert.doesNotReject(verifyRetainedThumbnailEvidence({
      renderRoot: root,
      thumbnailPath: target,
      expectedSha256: attestation.sha256,
      expectedBytes: attestation.bytes,
    }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('promotion-grade thumbnail evidence rejects deletion, corruption, and file swapping', async () => {
  const renderRoot = await mkdtemp(join(tmpdir(), 'dc-render-thumbnail-integrity-'));
  const firstPath = join(renderRoot, 'thumbnails', 'first.webp');
  const secondPath = join(renderRoot, 'thumbnails', 'second.webp');
  try {
    await mkdir(dirname(firstPath), { recursive: true });
    const [firstPng, secondPng] = await Promise.all([
      sharp({ create: { width: 40, height: 30, channels: 3, background: '#ffffff' } }).png().toBuffer(),
      sharp({ create: { width: 40, height: 30, channels: 3, background: '#000000' } }).png().toBuffer(),
    ]);
    const first = await writeEvidenceThumbnail(firstPng, firstPath);
    const second = await writeEvidenceThumbnail(secondPng, secondPath);
    const verifyFirst = () => verifyRetainedThumbnailEvidence({
      renderRoot,
      thumbnailPath: firstPath,
      expectedSha256: first.sha256,
      expectedBytes: first.bytes,
    });
    await assert.doesNotReject(verifyFirst());

    await rm(firstPath);
    await assert.rejects(verifyFirst(), /missing or unsafe/i);

    const corrupt = Buffer.from('not an image but internally hash-consistent');
    await writeFile(firstPath, corrupt);
    await assert.rejects(verifyRetainedThumbnailEvidence({
      renderRoot,
      thumbnailPath: firstPath,
      expectedSha256: createHash('sha256').update(corrupt).digest('hex'),
      expectedBytes: corrupt.byteLength,
    }), /not a decodable image/i);

    await writeFile(firstPath, await readFile(secondPath));
    await assert.rejects(verifyFirst(), /(?:byte-size|SHA-256) mismatch/i);
    assert.notEqual(first.sha256, second.sha256);
  } finally {
    await rm(renderRoot, { recursive: true, force: true });
  }
});

test('lossy square thumbnails cannot certify differently sized native screenshots as aliases', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-native-ssim-'));
  try {
    const makePng = (height: number) => sharp({
      create: {
        width: 1440,
        height,
        channels: 3,
        background: '#718096',
      },
    }).png().toBuffer();
    const [first, second] = await Promise.all([makePng(900), makePng(1_200)]);
    const firstPath = join(root, 'first.png');
    const secondPath = join(root, 'second.png');
    const firstThumbnail = join(root, 'first.webp');
    const secondThumbnail = join(root, 'second.webp');
    await Promise.all([
      writeFile(firstPath, first),
      writeFile(secondPath, second),
      writeEvidenceThumbnail(first, firstThumbnail),
      writeEvidenceThumbnail(second, secondThumbnail),
    ]);
    const hash = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
    const compressedThumbnailScore = await thumbnailSsim(firstThumbnail, secondThumbnail);
    const nativeScore = await losslessScreenshotSsim(
      { path: firstPath, sha256: hash(first) },
      { path: secondPath, sha256: hash(second) },
    );

    assert.ok(compressedThumbnailScore >= 0.995, `fixture must expose the old false-positive path: ${compressedThumbnailScore}`);
    assert.equal(nativeScore, 0, 'native evidence must fail closed instead of stretching page heights');
    assert.equal(satisfiesVisualAliasThresholds({
      domSimilarity: 1,
      desktopSsim: nativeScore,
      mobileSsim: 1,
      desktopPerceptualHashDistance: 0,
      mobilePerceptualHashDistance: 0,
      pages: [{
        page: 'index.html',
        desktopSsim: nativeScore,
        mobileSsim: 1,
        desktopPerceptualHashDistance: 0,
        mobilePerceptualHashDistance: 0,
      }],
    }, ['index.html']), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('native visual comparison independently consumes desktop and mobile screenshots', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-two-viewports-'));
  try {
    const makePng = (background: string) => sharp({
      create: { width: 64, height: 48, channels: 3, background },
    }).png().toBuffer();
    const [same, different] = await Promise.all([makePng('#ffffff'), makePng('#000000')]);
    const samePath = join(root, 'same.png');
    const differentPath = join(root, 'different.png');
    await Promise.all([writeFile(samePath, same), writeFile(differentPath, different)]);
    const hash = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
    const sameSource = { path: samePath, sha256: hash(same) };
    const comparison = await compareViewportScreenshotPixels({
      desktop: { first: sameSource, second: sameSource },
      mobile: {
        first: sameSource,
        second: { path: differentPath, sha256: hash(different) },
      },
    });

    assert.equal(comparison.desktopSsim, 1);
    assert.ok(comparison.mobileSsim < 0.995, `mobile evidence was not independently compared: ${comparison.mobileSsim}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('temporary native comparison evidence is content-addressed and cleanly reaped', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-comparison-cleanup-'));
  try {
    const bytes = Buffer.from('lossless screenshot fixture');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const target = temporaryComparisonScreenshotPath(root, hash);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    assert.equal((await readFile(target)).toString(), bytes.toString());

    await removeTemporaryComparisonScreenshots(root);
    await assert.rejects(readFile(target), /ENOENT/);
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
      assert.ok(viewport.contrastRepairs?.every((repair) => /^\[data-dc-edit-id="[A-Za-z0-9._:-]+"\]$/.test(repair.selector)));
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

test('direct-text edit wrappers retain deterministic inline-link distinction', async () => {
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
      assert.equal(viewport.passed, true, JSON.stringify(viewport.issues, null, 2));
      assert.deepEqual(viewport.linkInTextBlockRepairs, []);
    }

    const initialHtml = String(initial.files.get('index.html'));
    assert.match(initialHtml, /data-dc-edit-wrapper="direct-text"/);
    assert.match(String(initial.files.get('assets/css/dc-repair.css')), /:is\(p,blockquote,figcaption,dd,td\)>a\{text-decoration-line:underline/);
    const remediatedHtml = addAccessibilityOverrides(initialHtml, evidence);
    assert.equal(remediatedHtml, initialHtml, 'the audited base stylesheet should make a viewport repair unnecessary');
    const twiceRemediatedHtml = addAccessibilityOverrides(remediatedHtml, evidence);
    assert.equal(twiceRemediatedHtml, initialHtml);

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
    const staticVerification = verifyStaticArtifact(remediated.files, remediated.fields);
    assert.equal(staticVerification.passed, true, staticVerification.errors.map((issue) => `${issue.code}: ${issue.detail}`).join('\n'));
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
    assert.doesNotMatch(repairedHtml, /postal-code|type="date"|<select\b|type="checkbox"|form="inquiry"/i);
    assert.match(
      repairedHtml,
      /<form\b(?=[^>]*\bname="contact")(?=[^>]*\bmethod="post")(?=[^>]*\bdata-netlify="true")(?=[^>]*\bdata-dc-standard-form="contact")[^>]*>/i,
    );
    assert.match(repairedHtml, /<input\b(?=[^>]*\bname="name")(?=[^>]*\bautocomplete="name")(?=[^>]*\brequired(?:="")?)[^>]*>/i);
    assert.match(repairedHtml, /<input\b(?=[^>]*\btype="email")(?=[^>]*\bname="email")(?=[^>]*\brequired(?:="")?)[^>]*>/i);
    assert.match(repairedHtml, /<input\b(?=[^>]*\btype="tel")(?=[^>]*\bname="phone")[^>]*>/i);
    assert.match(repairedHtml, /<textarea\b(?=[^>]*\bname="message")(?=[^>]*\brequired(?:="")?)[^>]*>/i);
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

test('browser QA rejects standardized forms hidden by a computed ancestor style', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dc-render-hidden-form-'));
  const templateDir = join(root, 'niche', 'hidden-form');
  const evidenceRoot = join(root, 'evidence');
  try {
    const repaired = repairLegacyTemplate({
      slug: 'hidden-form-fixture',
      niche: 'wellness_coach',
      files: new Map([['index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Hidden form coverage</title></head><body><main>
        <h1>Hidden form browser fixture</h1><p>This page has enough ordinary visitor guidance to isolate the computed form availability check from unrelated rendering requirements.</p>
        <form><label>Name <input name="name"></label><label>Email <input name="email"></label><button>Send</button></form>
        <a href="mailto:{{EMAIL}}">Email the studio</a></main></body></html>`]]),
    });
    const repairedHtml = String(repaired.files.get('index.html'));
    const tamperedHtml = repairedHtml
      .replace('</head>', '<style>.dc-hidden-form-parent{display:none!important}</style></head>')
      .replace(/(<form\b[^>]*data-dc-standard-form="contact"[^>]*>)/i, '<div class="dc-hidden-form-parent">$1')
      .replace('</form>', '</form></div>');
    assert.notEqual(tamperedHtml, repairedHtml);
    const files = new Map(repaired.files);
    files.set('index.html', tamperedHtml);
    for (const [relativePath, contents] of files) {
      const target = join(templateDir, ...relativePath.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }

    const evidence = await renderTemplateTasks(root, [{
      key: 'hidden-form-fixture',
      niche: 'wellness_coach',
      slug: 'hidden-form-fixture',
      page: 'index.html',
      templateDir,
    }], { evidenceRoot, workers: 1, retries: 0 });

    assert.equal(evidence.length, 2);
    assert.ok(evidence.every((viewport) => !viewport.passed));
    assert.ok(evidence.every((viewport) => viewport.issues.some((issue) => issue.code === 'form_smoke_failed')),
      JSON.stringify(evidence, null, 2));
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
      retainComparisonScreenshot: true,
    }], { evidenceRoot, workers: 1, retries: 0 });

    assert.equal(evidence.length, 2);
    assert.ok(evidence.every((viewport) => viewport.passed), JSON.stringify(evidence, null, 2));
    for (const viewport of evidence) {
      assert.ok(viewport.screenshotSha256);
      assert.match(viewport.thumbnailSha256 ?? '', /^[0-9a-f]{64}$/);
      assert.ok((viewport.thumbnailBytes ?? 0) > 0);
      await assert.doesNotReject(verifyRetainedThumbnailEvidence({
        renderRoot: evidenceRoot,
        thumbnailPath: viewport.thumbnailPath!,
        expectedSha256: viewport.thumbnailSha256!,
        expectedBytes: viewport.thumbnailBytes!,
      }));
      assert.equal(
        viewport.comparisonScreenshotPath,
        temporaryComparisonScreenshotPath(evidenceRoot, viewport.screenshotSha256),
      );
      const metadata = await sharp(await readFile(viewport.comparisonScreenshotPath!)).metadata();
      assert.equal(metadata.format, 'png');
      assert.equal(metadata.width, viewport.viewport === 'desktop' ? 1440 : 390);
    }
    const retainedPaths = evidence.map((viewport) => viewport.comparisonScreenshotPath!);
    await removeTemporaryComparisonScreenshots(evidenceRoot);
    for (const path of retainedPaths) await assert.rejects(readFile(path), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
