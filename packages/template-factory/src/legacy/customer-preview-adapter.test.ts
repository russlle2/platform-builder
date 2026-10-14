import assert from 'node:assert/strict';
import test from 'node:test';
import {
  composeCustomerPreviewWithApp,
  loadCustomerPreviewComposers,
} from './customer-preview-adapter.js';

test('compiler adapter invokes the real app preview and customer-document composers', async () => {
  const document = await composeCustomerPreviewWithApp({
    html: '<!doctype html><html><head><link rel="stylesheet" href="assets/css/styles.css"></head><body><main><h1>{{BUSINESS_NAME}}</h1><img src="assets/img/hero.png" alt="Hero"></main><script defer src="assets/js/dc-compat.js" data-dc-runtime="compatibility-v1"></script></body></html>',
    page: 'index.html',
    fields: [{ name: 'BUSINESS_NAME', type: 'text' }],
    values: { BUSINESS_NAME: 'Sentinel & Clarity' },
    stylesheets: [
      { path: 'assets/css/styles.css', css: ':root{--dc-theme-color_text:#111}body{color:var(--dc-theme-color_text)}' },
      { path: 'assets/css/secondary.css', css: ':root{--dc-theme-color_secondary:#456}' },
    ],
    assetBase: '/api/templates/niche/slug/assets',
  });

  assert.match(document, /Sentinel &amp; Clarity/);
  assert.match(document, /href="\/api\/templates\/niche\/slug\/assets\/assets\/css\/styles\.css"/);
  assert.match(document, /src="\/api\/templates\/niche\/slug\/assets\/assets\/img\/hero\.png"/);
  assert.match(document, /src="\/api\/templates\/niche\/slug\/assets\/assets\/js\/dc-compat\.js"/);
  assert.match(document, /body \{ margin: 0; \}/);
  assert.match(document, /<script data-dc-runtime="customer-preview-editor-v1">/);
  assert.match(document, /window\.__dailyClarityCustomerPreviewEditorRuntime/);
  assert.match(document, /var currentPage = "index\.html";/);
});

test('compiler adapter fails closed with an actionable diagnostic when app composers cannot load', async () => {
  await assert.rejects(
    loadCustomerPreviewComposers({
      importer: async () => { throw new Error('simulated missing app source'); },
    }),
    /Customer preview composers could not be loaded; compiler browser QA cannot certify the customer route: simulated missing app source/,
  );
  await assert.rejects(
    loadCustomerPreviewComposers({ importer: async () => ({}) }),
    /required composition exports are absent/,
  );
});
