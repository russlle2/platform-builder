import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalizeManifest, sha256 } from './contracts.js';
import type { LegacyTemplateInventory } from './inventory.js';

export interface HomepageDonor {
  legacySlug: string;
  niche: string;
  html: string;
  contentHash: string;
  sourceTreeHash: string;
  selectionScore: number;
}

export interface HomepageDonorSelection {
  template: LegacyTemplateInventory;
  score: number;
}

function normalized(value: string | undefined): string | undefined {
  const result = value?.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return result || undefined;
}

function traitDistance(left: string | undefined, right: string | undefined): number {
  const a = normalized(left);
  const b = normalized(right);
  if (a === b) return 0;
  return a && b ? 1 : 0.5;
}

function setDistance(left: Iterable<string>, right: Iterable<string>): number {
  const a = new Set([...left].map((value) => normalized(value)).filter((value): value is string => Boolean(value)));
  const b = new Set([...right].map((value) => normalized(value)).filter((value): value is string => Boolean(value)));
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return 1 - (intersection / union.size);
}

function pageProfileDistance(target: LegacyTemplateInventory, candidate: LegacyTemplateInventory): number {
  const targetPages = new Map(target.pages
    .filter((page) => page.name !== 'index.html')
    .map((page) => [page.name, page]));
  const candidatePages = new Map(candidate.pages
    .filter((page) => page.name !== 'index.html')
    .map((page) => [page.name, page]));
  const shared = [...targetPages.keys()].filter((name) => candidatePages.has(name));
  if (shared.length === 0) return 1;
  return shared.reduce((sum, name) => {
    const targetPage = targetPages.get(name)!;
    const candidatePage = candidatePages.get(name)!;
    return sum + Math.min(1, Math.abs(targetPage.bytes - candidatePage.bytes) / Math.max(targetPage.bytes, candidatePage.bytes, 1));
  }, 0) / shared.length;
}

function donorScore(target: LegacyTemplateInventory, candidate: LegacyTemplateInventory): number {
  const targetManifest = canonicalizeManifest(target.rawManifest, {
    slug: target.slug,
    niche: target.niche,
    pages: target.pages.map((page) => page.name),
  });
  const candidateManifest = canonicalizeManifest(candidate.rawManifest, {
    slug: candidate.slug,
    niche: candidate.niche,
    pages: candidate.pages.map((page) => page.name),
  });
  const targetFoundation = target.foundation?.layoutFamily ?? targetManifest.foundation;
  const candidateFoundation = candidate.foundation?.layoutFamily ?? candidateManifest.foundation;
  const targetNonHome = target.pages.filter((page) => page.name !== 'index.html');
  const candidateNonHome = candidate.pages.filter((page) => page.name !== 'index.html');

  // Taxonomy is the strongest available design signal. Page topology, token
  // contract, and relative page sizes distinguish candidates within a family.
  return (
    (16 * traitDistance(targetFoundation, candidateFoundation))
    + (8 * traitDistance(targetManifest.layoutFamily, candidateManifest.layoutFamily))
    + (4 * traitDistance(targetManifest.voiceFamily, candidateManifest.voiceFamily))
    + (2 * traitDistance(targetManifest.offerModel, candidateManifest.offerModel))
    + (4 * setDistance(targetNonHome.map((page) => page.role), candidateNonHome.map((page) => page.role)))
    + setDistance(targetManifest.requiredSections, candidateManifest.requiredSections)
    + pageProfileDistance(target, candidate)
    + (0.5 * setDistance(targetNonHome.flatMap((page) => page.tokens), candidateNonHome.flatMap((page) => page.tokens)))
  );
}

function isEligibleDonor(target: LegacyTemplateInventory, candidate: LegacyTemplateInventory): boolean {
  return candidate.slug !== target.slug
    && candidate.niche === target.niche
    && candidate.pages.some((page) => page.name === 'index.html')
    && !candidate.issues.some((issue) => issue.severity === 'error' || issue.severity === 'critical');
}

/** Select a deterministic, inventory-clean homepage from the nearest same-niche design. */
export function selectNearestHomepageDonor(
  target: LegacyTemplateInventory,
  catalog: readonly LegacyTemplateInventory[],
): HomepageDonorSelection | undefined {
  if (target.pages.some((page) => page.name === 'index.html')) return undefined;
  return catalog
    .filter((candidate) => isEligibleDonor(target, candidate))
    .map((template) => ({ template, score: donorScore(target, template) }))
    .sort((left, right) => left.score - right.score || left.template.slug.localeCompare(right.template.slug))[0];
}

/** Read only the selected homepage and reject any source drift since inventory. */
export async function loadHomepageDonor(selection: HomepageDonorSelection): Promise<HomepageDonor> {
  const page = selection.template.pages.find((candidate) => candidate.name === 'index.html');
  if (!page) throw new Error(`Homepage donor ${selection.template.slug} no longer has index.html inventory evidence`);
  const bytes = await readFile(join(selection.template.sourceDir, 'index.html'));
  const observedHash = sha256(bytes);
  if (observedHash !== page.sha256) {
    throw new Error(`Homepage donor changed after inventory: expected ${page.sha256}, found ${observedHash}`);
  }
  const html = bytes.toString('utf8');
  return {
    legacySlug: selection.template.slug,
    niche: selection.template.niche,
    html,
    contentHash: sha256(html),
    sourceTreeHash: selection.template.sourceTreeHash,
    selectionScore: selection.score,
  };
}
