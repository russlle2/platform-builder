import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  type ContractField,
  validateTemplateContract,
} from './template-contract.js';

export interface QAResult {
  pass: boolean;
  errors: string[];
}

const MIN_PAGES = 5;
const MAX_PAGES = 7;

function extractNav(html: string): string | null {
  const navMatch = html.match(/<nav[\s\S]*?<\/nav>/i);
  if (navMatch) return navMatch[0];

  const wrapped = html.match(/<!--\s*NAV_START\s*-->([\s\S]*?)<!--\s*NAV_END\s*-->/i);
  if (wrapped) {
    const inner = wrapped[1];
    const innerNav = inner.match(/<nav[\s\S]*?<\/nav>/i);
    return innerNav ? innerNav[0] : inner.trim();
  }

  return null;
}

function extractInternalLinks(html: string): string[] {
  const links: string[] = [];
  // Capture the full href value including any fragment/query; strip them after.
  const anchorRe = /<a[^>]+href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    // Strip fragment (#section) and query (?foo) to get the bare path.
    const clean = match[1]!.trim().split('#')[0]!.split('?')[0]!.trim();
    // Pure anchor (#id only) or empty href → skip.
    if (!clean) continue;
    // Runtime-personalized destinations are validated by the token contract and
    // cannot be resolved to a generated page until hydration.
    if (/\{\{\s*[A-Za-z0-9_]+\s*\}\}/.test(clean)) continue;
    if (
      clean.startsWith('http') ||
      clean.startsWith('mailto:') ||
      clean.startsWith('tel:') ||
      clean.startsWith('javascript:')
    ) {
      continue;
    }
    links.push(clean.replace(/^\.\//, '').replace(/^\//, ''));
  }
  return links;
}

function normalizeNavLinks(navHtml: string): string[] {
  return extractInternalLinks(navHtml)
    .map((l) => (l === '' || l === 'index.html' ? 'index.html' : l))
    .sort();
}

function resolveLinkTarget(href: string): string {
  const normalized = href.replace(/^\.\//, '').replace(/^\//, '');
  if (normalized === '' || normalized === '/') return 'index.html';
  return normalized;
}

function checkValidHtml(html: string, file: string, errors: string[]): void {
  if (!/<html[\s>]/i.test(html)) {
    errors.push(`${file}: missing <html> tag`);
  }
  if (!/<head[\s>]/i.test(html)) {
    errors.push(`${file}: missing <head> tag`);
  }
  if (!/<body[\s>]/i.test(html)) {
    errors.push(`${file}: missing <body> tag`);
  }
  if (!/<\/html>/i.test(html)) {
    errors.push(`${file}: missing closing </html> tag`);
  }
}

/**
 * Run structural QA checks on an assembled template directory.
 */
export async function runQA(templateDir: string): Promise<QAResult> {
  const errors: string[] = [];

  let entries: string[];
  try {
    entries = await readdir(templateDir);
  } catch {
    return { pass: false, errors: [`Cannot read template directory: ${templateDir}`] };
  }

  const htmlFiles = entries.filter((f) => f.endsWith('.html'));
  const pageCount = htmlFiles.length;

  if (pageCount < MIN_PAGES || pageCount > MAX_PAGES) {
    errors.push(
      `Page count ${pageCount} outside allowed range [${MIN_PAGES}, ${MAX_PAGES}]`,
    );
  }

  const declaredPages = new Set(htmlFiles);
  const pageContents = new Map<string, string>();

  for (const file of htmlFiles) {
    const html = await readFile(join(templateDir, file), 'utf-8');
    pageContents.set(file, html);

    // Structural tag check applies to index.html only; other pages may be partials.
    if (file === 'index.html') {
      checkValidHtml(html, file, errors);
    }

  }

  let fields: ContractField[] = [];
  try {
    const fieldsDocument = JSON.parse(
      await readFile(join(templateDir, 'fields.json'), 'utf-8'),
    ) as { fields?: unknown };
    if (!Array.isArray(fieldsDocument.fields)) {
      errors.push('fields.json: expected a fields array');
    } else {
      fields = fieldsDocument.fields.filter(
        (field): field is ContractField =>
          Boolean(field) &&
          typeof field === 'object' &&
          typeof (field as ContractField).name === 'string',
      );
      if (fields.length !== fieldsDocument.fields.length) {
        errors.push('fields.json: contains invalid field entries');
      }
    }
  } catch {
    errors.push('Missing or invalid fields.json');
  }

  const contract = validateTemplateContract(pageContents, fields);
  errors.push(...contract.errors);

  const indexHtml = pageContents.get('index.html');
  if (!indexHtml) {
    errors.push('Missing index.html');
    return { pass: false, errors };
  }

  const indexNav = extractNav(indexHtml);
  if (!indexNav) {
    errors.push('index.html: missing <nav> element');
  } else {
    const indexNavLinks = normalizeNavLinks(indexNav);

    for (const file of htmlFiles) {
      if (file === 'index.html') continue;
      const nav = extractNav(pageContents.get(file) ?? '');
      if (!nav) {
        errors.push(`${file}: missing <nav> element`);
        continue;
      }
      const pageNavLinks = normalizeNavLinks(nav);
      if (JSON.stringify(pageNavLinks) !== JSON.stringify(indexNavLinks)) {
        errors.push(
          `${file}: nav links differ from index.html (expected ${indexNavLinks.join(', ')}, got ${pageNavLinks.join(', ')})`,
        );
      }
    }

    for (const file of htmlFiles) {
      const html = pageContents.get(file)!;
      const links = extractInternalLinks(html);
      for (const link of links) {
        const target = resolveLinkTarget(link);
        if (!declaredPages.has(target)) {
          errors.push(`Unresolved nav link "${link}" in ${file} (expected ${target})`);
        }
      }
    }

    // Orphan check: a page is an orphan only if it appears in no nav element.
    const linkedTargets = new Set<string>();
    for (const file of htmlFiles) {
      const nav = extractNav(pageContents.get(file)!);
      if (nav) {
        for (const link of extractInternalLinks(nav)) {
          linkedTargets.add(resolveLinkTarget(link));
        }
      }
    }

    for (const page of htmlFiles) {
      if (page === 'index.html') continue;
      if (!linkedTargets.has(page)) {
        errors.push(`Orphan page not linked from any nav: ${page}`);
      }
    }
  }

  return { pass: errors.length === 0, errors };
}
