/**
 * One-time foundation skeleton generator — calls Gemini 2.0 Flash via GOOGLE_CLOUD_API_KEY.
 * Run from packages/template-factory: npx tsx src/generate-foundations.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildFoundationLocal } from './foundation-builders.js';
import {
  ACTIVE_NICHES,
  LAYOUT_FAMILIES,
  type Niche,
} from './generate-foundations-types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const FOUNDATIONS_ROOT = path.join(PACKAGE_ROOT, 'foundations');
const ENV_LOCAL_PATH = path.resolve(PACKAGE_ROOT, '../../apps/generator-app/.env.local');
const CLOUD_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${CLOUD_MODEL}:generateContent`;
const useLocalOnly = process.argv.includes('--local');

const NICHE_CONFIG: Record<
  Niche,
  { personality: string; sections: string; pageOptions: string }
> = {
  aromatherapy: {
    personality: 'elegant, botanical, sensory, scent-ritual vibes',
    sections:
      'blends showcase, scent ritual, boutique/shop teaser, practitioner story, safety-forward FAQ, testimonials, booking CTA',
    pageOptions:
      'index.html, services.html, blends.html, about.html, contact.html, book.html (pick 5-7)',
  },
  holistic_medicine: {
    personality: 'clinical-warm, integrative, credentialed, trust-forward',
    sections:
      'integrative approach, modalities/services, credentials, patient journey, evidence-informed FAQ, team/practitioner, consultation CTA',
    pageOptions:
      'index.html, services.html, approach.html, about.html, contact.html, book.html (pick 5-7)',
  },
  private_practice_therapist: {
    personality: 'warm, safe, minimal, trust-building, intimate',
    sections:
      'specialties, therapeutic approach, what to expect, intake process, gentle FAQ, practitioner bio, session booking CTA',
    pageOptions:
      'index.html, specialties.html, approach.html, about.html, contact.html, book.html (pick 5-7)',
  },
  sound_bath: {
    personality: 'immersive, mystical, meditative, resonant, experiential',
    sections:
      'session experience, instruments/soundscape, upcoming events, immersion gallery, practitioner guide, experiential FAQ, reserve CTA',
    pageOptions:
      'index.html, sessions.html, experience.html, about.html, contact.html, book.html (pick 5-7)',
  },
  wellness_coach: {
    personality: 'energetic, results-driven, motivational, transformation-focused',
    sections:
      'transformation promise, coaching programs, results/metrics, methodology, client wins, coaching FAQ, start-your-journey CTA',
    pageOptions:
      'index.html, programs.html, about.html, contact.html, book.html (pick 5-7; may add results.html)',
  },
};

const REQUIRED_PLACEHOLDERS = [
  '{{BUSINESS_NAME}}',
  '{{TAGLINE}}',
  '{{HERO_HEADLINE}}',
  '{{HERO_SUBHEADLINE}}',
  '{{SECTION_1_HEADING}}',
  '{{SECTION_1_BODY}}',
  '{{FAQ_Q1}}',
  '{{FAQ_A1}}',
  '{{CTA_LABEL}}',
  '{{CITY}}',
  '{{STATE}}',
  '{{PRACTITIONER_NAME}}',
  '{{EMAIL}}',
  '{{PHONE}}',
] as const;

const CSS_VARS = ['--bg', '--fg', '--primary', '--accent', '--card', '--muted'] as const;

function loadEnvLocal(): void {
  if (process.env.GOOGLE_CLOUD_API_KEY?.trim() || process.env.GOOGLE_GEMINI_API_KEY?.trim()) {
    return;
  }
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    throw new Error(
      `GOOGLE_CLOUD_API_KEY not set and ${ENV_LOCAL_PATH} not found`,
    );
  }
  const content = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function padFoundationNum(n: number): string {
  return String(n).padStart(2, '0');
}

function buildPrompt(
  niche: Niche,
  foundationNum: number,
  layoutFamily: string,
): string {
  const config = NICHE_CONFIG[niche];
  return `You are an expert web designer creating a DISTINCT HTML foundation skeleton for a ${niche.replace(/_/g, ' ')} business website.

## Assignment
- Niche: ${niche}
- Foundation number: ${foundationNum} of 12
- Layout family (MUST follow this exactly): ${layoutFamily}
- Personality: ${config.personality}
- Niche-appropriate sections to weave in: ${config.sections}
- Allowed page filenames (choose exactly 5-7): ${config.pageOptions}

## Critical rules — follow every one
1. Line 1 MUST be: <!-- FOUNDATION: ${niche} layout-family-${layoutFamily} -->
2. Line 2 MUST declare the fixed canonical page set, e.g.:
   <!-- PAGES: index.html, services.html, about.html, contact.html, book.html -->
   (Use your chosen 5-7 pages from the allowed list above. index.html is always included.)
3. Output ONE complete HTML document for the HOME PAGE (index.html content) with inline <style> in <head>.
4. Use {{PLACEHOLDER}} tokens for ALL user-facing text — never hardcode business copy.
   Required tokens (use each at least once): ${REQUIRED_PLACEHOLDERS.join(', ')}
   Also include {{FAQ_Q2}}, {{FAQ_A2}}, {{FAQ_Q3}}, {{FAQ_A3}}, {{FAQ_Q4}}, {{FAQ_A4}} in the FAQ section.
   Add {{SECTION_2_HEADING}}, {{SECTION_2_BODY}}, {{SECTION_3_HEADING}}, {{SECTION_3_BODY}} for additional sections.
5. Navigation MUST be wrapped in <!-- NAV_START --> and <!-- NAV_END --> comments.
   The <nav> links ONLY to pages declared in the PAGES comment — no other internal links.
6. Use CSS custom properties for ALL colors: ${CSS_VARS.join(', ')} — define them in :root and reference throughout.
7. Include a comment block describing font/spacing philosophy (e.g. /* Typography: ... */ /* Spacing: ... */).
8. Layout family "${layoutFamily}" must be visually obvious in structure (grid, hero placement, section rhythm).
9. Target 300-600 lines of HTML — substantial, production-quality skeleton, not a stub.
10. Valid HTML5: <!doctype html>, <html lang="en">, complete <head> and <body>.
11. Include semantic sections: header with nav, hero, 3-5 content sections, FAQ, footer with contact placeholders.
12. Mobile-responsive CSS with a simple hamburger or stacked nav pattern.
13. Do NOT link to external CSS/JS files — all styles inline in <style>.
14. Do NOT use markdown code fences — output raw HTML only, starting with the FOUNDATION comment.

## Layout family guidance for "${layoutFamily}"
${layoutFamilyGuidance(layoutFamily)}

## Uniqueness
This is foundation ${foundationNum}/12 for ${niche}. It MUST be structurally distinct from the other 11 foundations in this niche. Vary section order, grid patterns, hero treatment, and visual rhythm to match the layout family.

Generate the complete HTML now.`;
}

function layoutFamilyGuidance(family: string): string {
  const guides: Record<string, string> = {
    'hero-left':
      'Hero: text/content left column (60%), visual/decorative right column (40%). Asymmetric grid.',
    'hero-centered':
      'Hero: centered headline stack, full-width background, CTA buttons centered below subheadline.',
    editorial:
      'Editorial: narrow reading column, large typography, pull-quotes, magazine-style section breaks.',
    'split-screen':
      'Split-screen: 50/50 vertical split hero, alternating split sections below.',
    magazine:
      'Magazine: multi-column grid, featured cards, varied section widths, dynamic visual hierarchy.',
    minimal:
      'Minimal: generous whitespace, restrained palette, few sections, typography-led design.',
    'bold-statement':
      'Bold-statement: oversized headline, high contrast, strong geometric shapes, dramatic spacing.',
    'luxury-gallery':
      'Luxury-gallery: refined serif headings, image-placeholder grids, elegant borders, premium feel.',
    'nature-immersive':
      'Nature-immersive: organic shapes, earthy CSS vars, flowing sections, soft rounded corners.',
    'clinical-modern':
      'Clinical-modern: clean lines, trust badges area, structured info cards, professional spacing.',
    'community-warm':
      'Community-warm: welcoming rounded elements, testimonial highlights, approachable card layouts.',
    'conversion-focused':
      'Conversion-focused: repeated CTAs, benefit bullets, urgency-friendly layout, sticky CTA patterns.',
  };
  return guides[family] ?? 'Follow the layout family name literally in structure and rhythm.';
}

function extractHtml(raw: string): string {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();
  const doctypeIdx = text.search(/<!doctype\s+html/i);
  if (doctypeIdx > 0) text = text.slice(doctypeIdx);
  const foundationIdx = text.indexOf('<!-- FOUNDATION:');
  if (foundationIdx > 0) text = text.slice(foundationIdx);
  return text.trim();
}

interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function validateFoundation(html: string, niche: Niche, layoutFamily: string): ValidationResult {
  const errors: string[] = [];
  const lines = html.split('\n').length;

  if (!html.startsWith('<!-- FOUNDATION:')) {
    errors.push('Must start with <!-- FOUNDATION: comment');
  } else if (!html.includes(`layout-family-${layoutFamily}`)) {
    errors.push(`FOUNDATION comment must reference layout-family-${layoutFamily}`);
  }

  if (!/<!--\s*PAGES:\s*[^>]+-->/.test(html)) {
    errors.push('Missing <!-- PAGES: ... --> comment');
  }

  if (!html.includes('<!-- NAV_START -->') || !html.includes('<!-- NAV_END -->')) {
    errors.push('Missing NAV_START / NAV_END comment wrappers');
  }

  for (const token of REQUIRED_PLACEHOLDERS) {
    if (!html.includes(token)) errors.push(`Missing placeholder ${token}`);
  }

  for (const v of CSS_VARS) {
    if (!html.includes(v)) errors.push(`Missing CSS variable ${v}`);
  }

  if (!/<!doctype\s+html/i.test(html)) errors.push('Missing <!doctype html>');
  if (!/<nav[\s>]/i.test(html)) errors.push('Missing <nav> element');
  if (lines < 120) errors.push(`Too short (${lines} lines; target 300-600)`);

  const pagesMatch = html.match(/<!--\s*PAGES:\s*([^>]+)-->/);
  if (pagesMatch) {
    const pages = pagesMatch[1].split(',').map((p) => p.trim());
    if (pages.length < 5 || pages.length > 7) {
      errors.push(`Page count ${pages.length} outside 5-7 range`);
    }
    if (!pages.includes('index.html')) {
      errors.push('PAGES must include index.html');
    }
    const navSection = html.match(/<!-- NAV_START -->([\s\S]*?)<!-- NAV_END -->/);
    if (navSection) {
      for (const page of pages) {
        if (page === 'index.html') continue;
        if (!navSection[1].includes(page)) {
          errors.push(`Nav missing link to declared page ${page}`);
        }
      }
      const hrefs = [...navSection[1].matchAll(/href=['"]([^'"]+)['"]/gi)].map((m) => m[1]);
      for (const href of hrefs) {
        if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
        const normalized = href.replace(/^\//, '');
        if (!pages.includes(normalized) && normalized !== 'index.html' && href !== '/') {
          errors.push(`Nav link ${href} not in declared PAGES set`);
        }
      }
    }
  }

  if (!html.includes(niche)) {
    errors.push(`FOUNDATION comment should reference niche ${niche}`);
  }

  return { ok: errors.length === 0, errors };
}

function resolveApiKey(): string {
  return (
    process.env.GOOGLE_GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_CLOUD_API_KEY?.trim() ||
    ''
  );
}

function isRetryableApiError(message: string): boolean {
  return /429|quota|credits|RESOURCE_EXHAUSTED|rate limit|503|502/i.test(message);
}

function isBlockedApiError(message: string): boolean {
  return /403|API_KEY_SERVICE_BLOCKED|PERMISSION_DENIED|blocked/i.test(message);
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error('GOOGLE_CLOUD_API_KEY / GOOGLE_GEMINI_API_KEY is not set');

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 16384,
    },
  };

  const maxRetries = 1;
  let lastError = 'unknown';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini returned empty response');
      return text;
    }

    const errText = await res.text();
    lastError = `HTTP ${res.status}: ${errText.slice(0, 400)}`;
    if (isRetryableApiError(lastError) && attempt < maxRetries) {
      const waitMs = attempt * 8000;
      console.warn(`  API retry in ${waitMs / 1000}s (${res.status})...`);
      await sleep(waitMs);
      continue;
    }
    throw new Error(lastError);
  }

  throw new Error(lastError);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateOne(
  niche: Niche,
  foundationNum: number,
  forceLocal: boolean,
): Promise<{ ok: true; path: string; bytes: number; source: 'gemini' | 'local' } | { ok: false; error: string }> {
  const layoutFamily = LAYOUT_FAMILIES[foundationNum - 1];
  const filename = `foundation-${padFoundationNum(foundationNum)}.html`;
  const outDir = path.join(FOUNDATIONS_ROOT, niche);
  const outPath = path.join(outDir, filename);

  if (fs.existsSync(outPath)) {
    const stat = fs.statSync(outPath);
    console.log(`  SKIP ${niche}/${filename} (exists, ${stat.size} bytes)`);
    return { ok: true, path: outPath, bytes: stat.size, source: 'local' };
  }

  fs.mkdirSync(outDir, { recursive: true });

  if (forceLocal) {
    const html = buildFoundationLocal(niche, foundationNum);
    const validation = validateFoundation(html, niche, layoutFamily);
    if (!validation.ok) {
      return { ok: false, error: validation.errors.join('; ') };
    }
    fs.writeFileSync(outPath, html, 'utf8');
    const bytes = Buffer.byteLength(html, 'utf8');
    const lineCount = html.split('\n').length;
    console.log(`  OK   ${niche}/${filename} [local] — ${bytes} bytes, ${lineCount} lines`);
    return { ok: true, path: outPath, bytes, source: 'local' };
  }

  const prompt = buildPrompt(niche, foundationNum, layoutFamily);
  const maxAttempts = 3;
  let lastError = 'unknown';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `  GEN  ${niche}/${filename} [${layoutFamily}] attempt ${attempt}/${maxAttempts}...`,
      );
      const raw = await callGemini(prompt);
      const html = extractHtml(raw);
      const validation = validateFoundation(html, niche, layoutFamily);

      if (!validation.ok) {
        lastError = validation.errors.join('; ');
        console.warn(`  WARN validation failed: ${lastError}`);
        if (attempt < maxAttempts) {
          await sleep(2000);
          continue;
        }
        break;
      }

      fs.writeFileSync(outPath, html, 'utf8');
      const bytes = Buffer.byteLength(html, 'utf8');
      const lineCount = html.split('\n').length;
      console.log(`  OK   ${niche}/${filename} [gemini] — ${bytes} bytes, ${lineCount} lines`);
      return { ok: true, path: outPath, bytes, source: 'gemini' };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`  ERR  ${niche}/${filename} attempt ${attempt}: ${lastError.slice(0, 200)}`);
      if (isBlockedApiError(lastError) || isRetryableApiError(lastError)) {
        break;
      }
      if (attempt < maxAttempts) await sleep(3000);
    }
  }

  console.warn(`  FALLBACK local builder for ${niche}/${filename}`);
  try {
    const html = buildFoundationLocal(niche, foundationNum);
    const validation = validateFoundation(html, niche, layoutFamily);
    if (!validation.ok) {
      return { ok: false, error: `${lastError}; local fallback invalid: ${validation.errors.join('; ')}` };
    }
    fs.writeFileSync(outPath, html, 'utf8');
    const bytes = Buffer.byteLength(html, 'utf8');
    const lineCount = html.split('\n').length;
    console.log(`  OK   ${niche}/${filename} [local fallback] — ${bytes} bytes, ${lineCount} lines`);
    return { ok: true, path: outPath, bytes, source: 'local' };
  } catch (err) {
    const fb = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `${lastError}; local fallback failed: ${fb}` };
  }
}

async function main(): Promise<void> {
  console.log('=== Foundation Generator (Gemini 2.0 Flash) ===');
  console.log(`Output: ${FOUNDATIONS_ROOT}`);
  loadEnvLocal();

  const apiKey = resolveApiKey();
  const forceLocal = useLocalOnly || !apiKey;
  if (forceLocal) {
    console.log(useLocalOnly ? 'Mode: --local (programmatic builders)\n' : 'Mode: local (no API key)\n');
  } else {
    console.log('API key loaded (not logged). Gemini first, local fallback on quota/block.\n');
  }

  const results: Array<{
    niche: Niche;
    num: number;
    ok: boolean;
    path?: string;
    bytes?: number;
    error?: string;
  }> = [];

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const niche of ACTIVE_NICHES) {
    console.log(`\n--- ${niche} ---`);
    for (let num = 1; num <= 12; num++) {
      const filename = `foundation-${padFoundationNum(num)}.html`;
      const outPath = path.join(FOUNDATIONS_ROOT, niche, filename);
      const existedBefore = fs.existsSync(outPath);

      const result = await generateOne(niche, num, forceLocal);
      results.push({
        niche,
        num,
        ok: result.ok,
        path: result.ok ? result.path : undefined,
        bytes: result.ok ? result.bytes : undefined,
        error: result.ok ? undefined : result.error,
      });

      if (result.ok) {
        if (existedBefore) skipped++;
        else generated++;
      } else {
        failed++;
      }

      await sleep(1500);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total targets:     60`);
  console.log(`Newly generated:   ${generated}`);
  console.log(`Skipped (existed): ${skipped}`);
  console.log(`Failed:            ${failed}`);

  const successes = results.filter((r) => r.ok);
  const failures = results.filter((r) => !r.ok);

  if (successes.length) {
    const sizes = successes.map((r) => r.bytes ?? 0);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    const avg = Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length);
    console.log(`\nFile sizes (bytes): min=${min}, max=${max}, avg=${avg}`);
    console.log('\nSuccessful files:');
    for (const r of successes) {
      console.log(`  ${r.niche}/foundation-${padFoundationNum(r.num)}.html — ${r.bytes} bytes`);
    }
  }

  if (failures.length) {
    console.log('\nFailures:');
    for (const r of failures) {
      console.log(
        `  ${r.niche}/foundation-${padFoundationNum(r.num)}.html — ${r.error}`,
      );
    }
    process.exitCode = 1;
  } else {
    console.log('\nAll 60 foundations ready.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
