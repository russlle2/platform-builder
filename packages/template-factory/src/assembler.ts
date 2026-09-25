import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  buildVariationCSS,
  getColorScheme,
  getFontVariation,
  getStructureVariation,
} from '../../../apps/generator-app/src/lib/templates/variations.js';
import type { CopyJSON } from './copywriter.js';
import { pickImages } from './images.js';
import {
  extractTemplateTokens,
  isCorePersonalizationToken,
  validateTemplateContract,
} from './template-contract.js';

export interface AssembleOptions {
  niche: string;
  foundationPath: string;
  colorSchemeId: string;
  fontVariationId: string;
  structureVariationId: string;
  copy: CopyJSON;
  outputSlug: string;
  outputRoot: string;
  /** Seed for image rotation (foundation index * 10 + color index, etc.) */
  imageSeed?: number;
}

const MAIN_JS = `document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('nav-list') || document.querySelector('.nav-list');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('show');
    });
  }

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
`;

function nicheLabel(niche: string): string {
  return niche.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function parsePagesComment(html: string): string[] {
  const match = html.match(/<!--\s*PAGES:\s*([^>]+)-->/i);
  const pages = !match
    ? ['index.html']
    : match[1]
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const page of pages) {
    if (!/^[a-z0-9][a-z0-9_-]*\.html$/i.test(page)) {
      throw new Error(`Unsafe page filename in foundation: ${page}`);
    }
  }
  return [...new Set(['index.html', ...pages])];
}

function assertSafePathSegment(value: string, label: string): void {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
}

function parseLayoutFamily(html: string): string {
  const match = html.match(/layout-family-([a-z0-9-]+)/i);
  return match?.[1] ?? 'custom';
}

function extractInlineStyles(html: string): { styles: string; html: string } {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) return { styles: '', html };
  const styles = styleMatch[1].trim();
  const cleaned = html.replace(styleMatch[0], '');
  return { styles, html: cleaned };
}

function extractHeader(html: string): string {
  const header = html.match(/<header[\s\S]*?<\/header>/i);
  return header?.[0] ?? '';
}

function extractFooter(html: string): string {
  const footer = html.match(/<footer[\s\S]*?<\/footer>/i);
  return footer?.[0] ?? '';
}

/**
 * Remove proof-shaped sample content from a checked-in foundation before copy
 * is assembled into it. The foundations historically included a synthetic
 * client quote as a visual placeholder. Shipping that placeholder would turn
 * design scaffolding into an unsupported public claim, so publication output
 * deliberately omits the entire block. CSS may retain the now-unused class;
 * it is inert and keeps this transform deterministic and narrowly scoped.
 */
export function normalizeFoundationForPublication(html: string): string {
  return html
    // Intake collects one free-form address/service-area value. Every curated
    // foundation used the paired CITY/STATE tokens, so preserve the visual
    // location slot without guessing how to split the customer's input.
    .replace(
      /\{\{\s*CITY\s*\}\}\s*,\s*\{\{\s*STATE\s*\}\}/gi,
      '{{ADDRESS}}',
    )
    .replace(
      /<section\b[^>]*class=["'][^"']*\b(?:testimonials?|reviews?|quotes?)\b[^"']*["'][^>]*>[\s\S]*?<\/section\s*>/gi,
      '',
    )
    // A few editorial foundations use this class for an unattributed design
    // flourish rather than social proof. Rename it so publication validators
    // do not mistake the neutral practitioner/location statement for a quote.
    .replace(/pull-quote/gi, 'editorial-note');
}

/**
 * Strip any {{PLACEHOLDER}} tokens that an LLM may accidentally embed in copy
 * fields (the model sees the foundation HTML and sometimes echoes the tokens).
 * We strip them so they never appear in map values and cannot be re-injected
 * by a single-pass applyPlaceholders call.
 */
function sanitizePlainCopyValue(value: string): string {
  return value.replace(/\{\{[^}]+\}\}/g, '').replace(/\s{2,}/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeCopyValue(value: string): string {
  return escapeHtml(sanitizePlainCopyValue(value));
}

function sanitizeSectionId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'section';
}

function buildPlaceholderMap(niche: string, copy: CopyJSON): Record<string, string> {
  const map: Record<string, string> = {
    HERO_HEADLINE: sanitizeCopyValue(copy.heroHeadline),
    HERO_SUBHEADLINE: sanitizeCopyValue(copy.heroSubheadline),
    META_DESCRIPTION: sanitizeCopyValue(copy.metaDescription),
    PAGE_TITLE: sanitizeCopyValue(copy.title),
  };

  copy.sections.forEach((section, i) => {
    const n = i + 1;
    map[`SECTION_${n}_HEADING`] = sanitizeCopyValue(section.heading);
    map[`SECTION_${n}_BODY`] = sanitizeCopyValue(section.body);
    map[`SECTION_${n}_ID`] = sanitizeSectionId(section.id);
  });

  copy.faq.forEach((item, i) => {
    const n = i + 1;
    map[`FAQ_Q${n}`] = sanitizeCopyValue(item.q);
    map[`FAQ_A${n}`] = sanitizeCopyValue(item.a);
  });

  return map;
}

function applyPlaceholders(html: string, map: Record<string, string>): string {
  return html.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (full, token: string) => {
    const normalized = token.toUpperCase();
    if (isCorePersonalizationToken(normalized)) return `{{${normalized}}}`;
    if (normalized in map) return map[normalized]!;
    return full;
  });
}

function injectHeadAssets(
  html: string,
  copy: CopyJSON,
  variationCss: string,
  fontImportUrl?: string,
): string {
  let result = html;

  const safeTitle = sanitizeCopyValue(copy.title);
  const safeDescription = sanitizeCopyValue(copy.metaDescription);

  result = result.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${safeTitle}</title>`,
  );

  if (/<meta[^>]+name=["']description["']/i.test(result)) {
    result = result.replace(
      /<meta[^>]+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${safeDescription}">`,
    );
  } else {
    result = result.replace(
      /<head>/i,
      `<head>\n  <meta name="description" content="${safeDescription}">`,
    );
  }

  if (!/assets\/css\/styles\.css/i.test(result)) {
    result = result.replace(
      /<\/head>/i,
      '  <link rel="stylesheet" href="assets/css/styles.css">\n</head>',
    );
  }

  if (!/assets\/js\/main\.js/i.test(result)) {
    result = result.replace(
      /<\/head>/i,
      '  <script defer src="assets/js/main.js"></script>\n</head>',
    );
  }

  const styleBlocks: string[] = [];
  if (fontImportUrl) {
    styleBlocks.push(`@import url('${fontImportUrl}');`);
  }
  if (variationCss) {
    styleBlocks.push(variationCss);
  }

  if (styleBlocks.length > 0) {
    const block = `<style id="variation-overrides">\n${styleBlocks.join('\n')}\n</style>`;
    result = result.replace(/<\/head>/i, `${block}\n</head>`);
  }

  return result;
}

function pageTitleFromFilename(filename: string): string {
  const base = basename(filename, '.html');
  if (base === 'index') return 'Home';
  return base.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildPageMain(
  pageFile: string,
  copy: CopyJSON,
  niche: string,
): string {
  const pageName = escapeHtml(pageTitleFromFilename(pageFile));
  const label = escapeHtml(nicheLabel(niche));

  if (pageFile === 'index.html') {
    return '';
  }

  const sectionForPage = (() => {
    const key = basename(pageFile, '.html').toLowerCase();
    const match = copy.sections.find(
      (s) =>
        s.id.toLowerCase().includes(key) ||
        key.includes(s.id.toLowerCase()) ||
        s.heading.toLowerCase().includes(key),
    );
    return match ?? copy.sections[0];
  })();

  const faqBlock =
    pageFile.includes('faq') || pageFile.includes('about')
      ? copy.faq
          .map(
            (f) =>
              `<article class="card"><h3>${sanitizeCopyValue(f.q)}</h3><p>${sanitizeCopyValue(f.a)}</p></article>`,
          )
          .join('\n')
      : '';

  const heading = sanitizeCopyValue(
    pageName === 'Book' ? copy.ctaLabel : sectionForPage.heading,
  );
  const lead = sanitizeCopyValue(
    pageName === 'Book' ? copy.heroSubheadline : sectionForPage.body,
  );
  const sectionHeading = sanitizeCopyValue(sectionForPage.heading);
  const sectionBody = sanitizeCopyValue(sectionForPage.body);
  const inquiryForm = pageFile.includes('contact') || pageFile.includes('book')
    ? `
        <form id="inquiry" class="inquiry-form" action="#" method="post">
          <div class="form-field">
            <label for="name">Name</label>
            <input id="name" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="form-field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="email" required>
          </div>
          <div class="form-field">
            <label for="phone">Phone <span aria-hidden="true">(optional)</span></label>
            <input id="phone" name="phone" type="tel" autocomplete="tel">
          </div>
          <div class="form-field">
            <label for="message">How can we help?</label>
            <textarea id="message" name="message" rows="5" required></textarea>
          </div>
          <button class="btn primary" type="submit">Send inquiry</button>
        </form>`
    : '';
  const editableBusinessProfile = pageFile.includes('about')
    ? `
        <div class="card business-profile">
          <h2 class="h2">About {{BUSINESS_NAME}}</h2>
          <p>{{DESCRIPTION}}</p>
          <h3>Services</h3>
          <p>{{SERVICES}}</p>
        </div>`
    : '';

  return `
  <main>
    <section class="page-hero">
      <div class="container">
        <p class="kicker">${label}</p>
        <h1 class="h1">${heading}</h1>
        <p class="lead">${lead}</p>
        ${pageFile.includes('book') ? '<p>Share your preferred next step below and the practice will follow up.</p><a class="btn primary" href="{{PRIMARY_CTA_URL}}">{{CTA_LABEL}}</a>' : ''}
      </div>
    </section>
    <section class="page-content">
      <div class="container">
        ${pageName !== 'Book' ? `<div class="card"><h2 class="h2">${sectionHeading}</h2><p>${sectionBody}</p></div>` : ''}
        ${editableBusinessProfile}
        ${faqBlock ? `<div class="faq-grid">${faqBlock}</div>` : ''}
        ${inquiryForm}
      </div>
    </section>
  </main>`;
}

function buildSubPage(
  foundationHtml: string,
  pageFile: string,
  copy: CopyJSON,
  niche: string,
  placeholderMap: Record<string, string>,
  variationCss: string,
  fontImportUrl?: string,
): string {
  const header = extractHeader(foundationHtml);
  const footer = extractFooter(foundationHtml);
  const main = buildPageMain(pageFile, copy, niche);

  // Use sanitized values from the map for head elements so they stay clean.
  const cleanTitle = placeholderMap['PAGE_TITLE'] ?? copy.title;
  const cleanDesc = (placeholderMap['META_DESCRIPTION'] ?? copy.metaDescription).replace(/"/g, '&quot;');

  let html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${cleanTitle} — ${pageTitleFromFilename(pageFile)}</title>
  <meta name="description" content="${cleanDesc}">
  <link rel="stylesheet" href="assets/css/styles.css">
  <script defer src="assets/js/main.js"></script>
</head>
<body>
${header}
${main}
${footer}
</body>
</html>`;

  // First pass: replace all {{TOKEN}} that appear in the foundation header/footer.
  html = applyPlaceholders(html, placeholderMap);
  // Head-asset injection may re-introduce copy.title / copy.metaDescription;
  // run applyPlaceholders again afterward to catch any residual tokens.
  html = injectHeadAssets(html, copy, variationCss, fontImportUrl);
  html = applyPlaceholders(html, placeholderMap);
  return html;
}

function buildFieldsJson(
  placeholders: string[],
  niche: string,
  copy: CopyJSON,
): {
  title: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    default?: string;
  }>;
} {
  const label = nicheLabel(niche);
  const defaults: Record<string, string | undefined> = {
    BUSINESS_NAME: `${label} Practice`,
    PRACTITIONER_NAME: 'Practice Team',
    OWNER_NAME: 'Practice Team',
    COACH_NAME: 'Practice Team',
    FACILITATOR_NAME: 'Practice Team',
    ADDRESS: 'Serving the local area',
    CITY: 'Local area',
    STATE: 'Service region',
    TAGLINE: sanitizePlainCopyValue(copy.practitionerTagline),
    DESCRIPTION: sanitizePlainCopyValue(copy.metaDescription),
    SERVICES: copy.sections
      .map((section) => sanitizePlainCopyValue(section.heading))
      .filter(Boolean)
      .join(', '),
    CTA_LABEL: sanitizePlainCopyValue(copy.ctaLabel),
    PRIMARY_CTA_LABEL: sanitizePlainCopyValue(copy.ctaLabel),
    PRIMARY_CTA_URL: '#inquiry',
    WEBSITE: undefined,
    EMAIL: undefined,
    PHONE: undefined,
    PHONE_NUMBER: undefined,
  };

  const fields = placeholders.map((name) => {
    const lower = name.toLowerCase();
    const field = {
      name,
      label: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      type: lower.includes('email')
        ? 'email'
        : lower.includes('phone')
          ? 'tel'
          : lower.includes('url') || lower.includes('website')
            ? 'url'
            : 'text',
      required: name === 'BUSINESS_NAME',
      default: defaults[name],
    };

    if (field.default === undefined) {
      const { default: _default, ...withoutDefault } = field;
      return withoutDefault;
    }
    return field;
  });

  return {
    title: `${label} Practice Site`,
    description: `Fields to populate the ${label.toLowerCase()} practitioner site`,
    fields,
  };
}

function buildTemplateJson(
  opts: AssembleOptions,
  pages: string[],
  placeholders: string[],
  layoutFamily: string,
): object {
  const color = getColorScheme(opts.colorSchemeId);
  const font = getFontVariation(opts.fontVariationId);
  const structure = getStructureVariation(opts.structureVariationId);

  return {
    layoutFamily,
    voiceFamily: `${color.id}_${font.id}`,
    offerModel: 'hybrid',
    required_sections: ['hero', 'services', 'about', 'faq', 'cta'],
    placeholders: placeholders.map((p) => `{{${p}}}`),
    pages,
    slug: opts.outputSlug,
    name: `${opts.copy.title} — ${structure.name}`,
    description: opts.copy.metaDescription.slice(0, 160),
  };
}

function augmentStyles(baseCss: string): string {
  const extras = `
.page-hero { padding: 3rem 0; border-bottom: 1px solid color-mix(in oklab, var(--fg, #333) 10%, transparent); }
.page-content { padding: 2.5rem 0; }
.kicker { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.75rem; opacity: 0.7; }
.h1 { font-size: 2rem; margin: 0.5rem 0; }
.h2 { font-size: 1.5rem; margin: 0 0 0.75rem; }
.lead { line-height: 1.6; max-width: 65ch; }
.faq-grid { display: grid; gap: 1rem; margin-top: 1.5rem; }
.container { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
.card { padding: 1.25rem; border-radius: var(--radius, 12px); background: var(--card, #fff); }
.btn { display: inline-block; padding: 0.65rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 600; }
.btn.primary { background: var(--primary, #333); color: var(--bg, #fff); }
.menu-toggle { cursor: pointer; }
.nav-list.show { display: flex !important; }
.inquiry-form { display: grid; gap: 1rem; max-width: 680px; margin-top: 1.5rem; }
.form-field { display: grid; gap: 0.4rem; }
.form-field label { font-weight: 600; }
.form-field input, .form-field textarea { width: 100%; padding: 0.8rem 0.9rem; border: 1px solid color-mix(in srgb, var(--muted, #777) 35%, transparent); border-radius: 8px; background: var(--card, #fff); color: var(--fg, #111); font: inherit; }
/* --- image injection styles --- */
.hero-image-wrap { position: relative; overflow: hidden; border-radius: var(--radius, 16px); }
.hero-image-wrap img { width: 100%; height: 420px; object-fit: cover; display: block; border-radius: var(--radius, 16px); }
.hero-bg { position: relative; overflow: hidden; }
.hero-bg::before { content: ''; position: absolute; inset: 0; background: linear-gradient(to right, color-mix(in srgb, var(--bg, #fff) 85%, transparent) 35%, transparent 100%); z-index: 1; pointer-events: none; }
.hero-bg-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; opacity: 0.45; }
.hero-bg > .container { position: relative; z-index: 2; }
.section-img { width: 100%; height: 280px; object-fit: cover; border-radius: var(--radius, 12px); display: block; margin-bottom: 1.25rem; }
.section-img-tall { height: 380px; }
.img-card { overflow: hidden; border-radius: var(--radius, 12px); }
.img-card img { width: 100%; height: 220px; object-fit: cover; display: block; transition: transform 0.4s ease; }
.img-card:hover img { transform: scale(1.04); }
.portrait-img { width: 100%; max-width: 380px; height: 440px; object-fit: cover; border-radius: var(--radius, 16px); display: block; }
.about-grid { display: grid; grid-template-columns: 1fr 1.3fr; gap: 2.5rem; align-items: center; }
@media (max-width: 680px) {
  .about-grid { grid-template-columns: 1fr; }
  .hero-bg::before { background: linear-gradient(to bottom, color-mix(in srgb, var(--bg, #fff) 60%, transparent) 0%, transparent 60%); }
  .hero-bg-img { opacity: 0.3; }
  .hero-image-wrap img { height: 260px; }
}
`;
  return `${baseCss}\n${extras}`;
}

/**
 * Inject niche-appropriate images into the assembled HTML.
 * Targets the hero section and first content section for rich visual presence.
 */
function injectImages(
  html: string,
  niche: string,
  seed: number,
): string {
  const imgs = pickImages(niche, seed);
  let result = html;

  // 1. Hero: wrap with background image overlay if the hero has a .hero or section.hero class
  //    We inject the <img> as a sibling before the container div inside .hero
  const heroSectionRe = /(<(?:section|div)[^>]*class="[^"]*\bhero\b[^"]*"[^>]*>)(\s*(?:<div[^>]*class="[^"]*\bcontainer\b[^"]*"[^>]*>)?)/i;
  if (heroSectionRe.test(result)) {
    result = result.replace(heroSectionRe, (match, openTag, inner) => {
      // Add hero-bg class to the existing class
      const tagWithBgClass = openTag.replace(/class="([^"]*)"/, `class="$1 hero-bg"`);
      const bgImgTag = `\n  <img class="hero-bg-img" src="${imgs.hero}" alt="" role="presentation" loading="eager" fetchpriority="high">`;
      return `${tagWithBgClass}${bgImgTag}${inner}`;
    });
  }

  // 2. Section imagery: inject after section headers in .content-section or .feature-grid blocks
  //    Find the first .section-grid and add an image to the second column if it looks empty
  const sectionGridRe = /(<div[^>]*class="[^"]*\bsection-grid\b[^"]*"[^>]*>)([\s\S]*?)(<\/div>(?:\s*<\/section>)?)/i;
  const sectionGridMatch = result.match(sectionGridRe);
  if (sectionGridMatch) {
    const inner = sectionGridMatch[2] ?? '';
    // Only inject if there's no img tag already in this grid
    if (!/<img/i.test(inner)) {
      const imageColumn = `\n    <div class="section-img-wrap"><img class="section-img section-img-tall" src="${imgs.section1}" alt="" loading="lazy"></div>`;
      result = result.replace(sectionGridRe, (_m, open, content, close) => {
        return `${open}${content}${imageColumn}${close}`;
      });
    }
  }

  // 3. Feature/service cards: add a leading image to each .feature-card if they have no img
  let featureCardCount = 0;
  result = result.replace(
    /(<div[^>]*class="[^"]*\bfeature-card\b[^"]*"[^>]*>)(\s*(?!<img))/gi,
    (_m, open, ws) => {
      const imgSrc = featureCardCount % 2 === 0 ? imgs.section2 : imgs.section3;
      featureCardCount++;
      // Only add images to first 4 cards to avoid overwhelming the layout
      if (featureCardCount > 4) return `${open}${ws}`;
      return `${open}${ws}<div class="img-card"><img src="${imgSrc}" alt="" loading="lazy"></div>\n    `;
    },
  );

  // 4. About/practitioner section: inject portrait image if an .about or .practitioner section exists
  const aboutSectionRe = /(<(?:section|div)[^>]*class="[^"]*\b(?:about|practitioner|intro)\b[^"]*"[^>]*>)([\s\S]*?)(<\/(?:section|div)>)/i;
  const aboutMatch = result.match(aboutSectionRe);
  if (aboutMatch && !/<img/i.test(aboutMatch[2] ?? '')) {
    result = result.replace(aboutSectionRe, (_m, open, inner, close) => {
      const portraitBlock = `\n  <div style="display:flex;gap:2.5rem;align-items:center;flex-wrap:wrap;">\n    <img class="portrait-img" src="${imgs.portrait}" alt="{{PRACTITIONER_NAME}}" loading="lazy">\n    <div>${inner.trim()}</div>\n  </div>\n`;
      return `${open}${portraitBlock}${close}`;
    });
  }

  return result;
}

/**
 * Inject copy into a foundation skeleton and write template artifacts.
 * Returns the output directory path.
 */
export async function assembleTemplate(opts: AssembleOptions): Promise<string> {
  assertSafePathSegment(opts.niche, 'niche');
  assertSafePathSegment(opts.outputSlug, 'output slug');
  const outputDir = join(opts.outputRoot, opts.niche, opts.outputSlug);
  const rawFoundation = normalizeFoundationForPublication(
    await readFile(opts.foundationPath, 'utf-8'),
  );

  const pages = parsePagesComment(rawFoundation);
  const layoutFamily = parseLayoutFamily(rawFoundation);
  const placeholderMap = buildPlaceholderMap(opts.niche, opts.copy);

  const variationCss = buildVariationCSS(
    opts.colorSchemeId,
    opts.fontVariationId,
    opts.structureVariationId,
  );
  const font = getFontVariation(opts.fontVariationId);

  const { styles: inlineStyles, html: foundationNoStyle } =
    extractInlineStyles(rawFoundation);

  const imageSeed = opts.imageSeed ?? 0;

  let indexHtml = applyPlaceholders(foundationNoStyle, placeholderMap);
  indexHtml = injectHeadAssets(
    indexHtml,
    opts.copy,
    variationCss,
    font.importUrl,
  );
  // Second pass catches any {{TOKEN}} re-introduced by injectHeadAssets
  indexHtml = applyPlaceholders(indexHtml, placeholderMap);
  // Inject niche-appropriate imagery (hero bg, section images, portrait)
  indexHtml = injectImages(indexHtml, opts.niche, imageSeed);

  const pageContents = new Map<string, string>([['index.html', indexHtml]]);

  for (const page of pages) {
    if (page === 'index.html') continue;
    let pageHtml = buildSubPage(
      foundationNoStyle,
      page,
      opts.copy,
      opts.niche,
      placeholderMap,
      variationCss,
      font.importUrl,
    );
    // Inject a section image on inner pages too
    pageHtml = injectImages(pageHtml, opts.niche, imageSeed + 1);
    pageContents.set(page, pageHtml);
  }

  const allPlaceholders = [
    ...new Set(
      [...pageContents.values()].flatMap((html) => extractTemplateTokens(html)),
    ),
  ].sort();
  const fieldsJson = buildFieldsJson(allPlaceholders, opts.niche, opts.copy);
  const contract = validateTemplateContract(pageContents, fieldsJson.fields);
  if (!contract.pass) {
    throw new Error(
      `Template contract failed for ${opts.outputSlug}: ${contract.errors.join('; ')}`,
    );
  }

  await mkdir(join(outputDir, 'assets', 'css'), { recursive: true });
  await mkdir(join(outputDir, 'assets', 'js'), { recursive: true });

  const baseCss = inlineStyles || ':root { --bg: #fff; --fg: #111; --primary: #333; --card: #f9f9f9; }';
  await writeFile(
    join(outputDir, 'assets', 'css', 'styles.css'),
    augmentStyles(baseCss),
    'utf-8',
  );
  await writeFile(join(outputDir, 'assets', 'js', 'main.js'), MAIN_JS, 'utf-8');
  for (const [page, html] of pageContents) {
    await writeFile(join(outputDir, page), html, 'utf-8');
  }

  await writeFile(
    join(outputDir, 'fields.json'),
    JSON.stringify(fieldsJson, null, 2),
    'utf-8',
  );
  await writeFile(
    join(outputDir, 'template.json'),
    JSON.stringify(
      buildTemplateJson(opts, pages, allPlaceholders, layoutFamily),
      null,
      2,
    ),
    'utf-8',
  );

  return outputDir;
}
