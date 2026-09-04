import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  appendFile,
  copyFile,
  link,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import { dirname, extname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import {
  type ContractField,
  extractTemplateTokens,
  validateTemplateContract,
} from '../template-contract.js';
import { AssetVendor, assetLicenseManifest, vendorRemoteAssets } from './assets.js';
import { applyContentPreset, applyThemePreset, repairLegacyTemplate } from './compose.js';
import type { HtmlNode } from './repair.js';
import {
  type CatalogTemplate,
  type CanonicalField,
  type CanonicalDesign,
  type ContentPreset,
  type DedupeFingerprint,
  type RepairResult,
  type ThemePreset,
  normalizeFields,
  sha256,
  stableStringify,
} from './contracts.js';
import {
  buildDedupeClusters,
  canAliasDesigns,
  createDedupeFingerprint,
  domSimilarity,
  satisfiesVisualAliasThresholds,
  type DedupeCandidate,
  type DedupeCluster,
  type VisualAliasEvidence,
} from './dedupe.js';
import { createNeutralFallbackFiles } from './fallback.js';
import {
  applyCloudRepairPatches,
  executeCloudRepairLane,
  planCloudRepairFragments,
} from './cloud-repair-integration.js';
import {
  loadFoundationRegistry,
  planFoundationAlignment,
  type FoundationAlignmentPlan,
  type FoundationRegistry,
} from './foundation-alignment.js';
import {
  loadHomepageDonor,
  selectNearestHomepageDonor,
  type HomepageDonor,
} from './homepage-donor.js';
import {
  assertWorkPath,
  atomicWriteFile,
} from './config.js';
import {
  EXPECTED_LEGACY_TEMPLATE_TOTAL,
  inventoryLegacyCatalog,
  inventoryLegacyTemplate,
  pilotCoverageDimensions,
  selectStratifiedPilot,
  type CatalogInventory,
  type LegacyTemplateInventory,
} from './inventory.js';
import {
  hammingDistance,
  LEGACY_VIEWPORTS,
  renderTemplateTasks,
  thumbnailSsim,
  type ContrastRepair,
  type LinkInTextBlockRepair,
  type RenderEvidence,
  type RenderTask,
} from './render.js';
import type {
  LegacyAliasRecord,
  LegacyArtifactRecord,
  LegacyCommandContext,
  LegacyCommandOutcome,
  LegacyCommandServices,
  LegacyPageRecord,
  LegacyRenderRecord,
  LegacyTemplateRecord,
  LeasedTemplate,
} from './types.js';
import {
  LEGACY_PILOT_GATE_VERSION,
  MINIMUM_LEGACY_PILOT_SIZE,
  throwIfLegacyCancelled,
} from './types.js';

const TEXT_EXTENSIONS = new Set(['.css', '.html', '.htm', '.js', '.mjs', '.cjs', '.json', '.svg', '.txt', '.md']);
const FOUNDATIONS_ROOT = fileURLToPath(new URL('../../foundations/', import.meta.url));
const FOUNDATION_MARKER_RE = /<!--\s*FOUNDATION:/i;
const SAFE_RELATIVE_SEGMENT = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/;
const ACTIVE_MARKUP_RE = /<\/?(?:iframe|frame|frameset|object|embed)\b|<script\b(?![^>]*\bsrc=["']assets\/js\/dc-compat\.js["'])|\son[a-z]+\s*=|(?:href|src|action)\s*=\s*["']\s*(?:javascript:|vbscript:|data:text\/html)/i;

function checkCancellation(context: Pick<LegacyCommandContext, 'signal'>): void {
  throwIfLegacyCancelled(context.signal);
}

interface StaticVerification {
  passed: boolean;
  errors: Array<{ code: string; page?: string; detail: string }>;
  tokens: string[];
}

interface RepairSummary {
  requested: number;
  repaired: number;
  staticFailed: number;
  neutralFallbacks: number;
  skipped: number;
}

interface RenderSummary {
  templates: number;
  passedTemplates: number;
  failedTemplates: number;
  renders: number;
  criticalDefects: number;
  seriousDefects: number;
  neutralFallbacks: number;
}

interface CatalogV3Alias extends CatalogTemplate {
  canonicalLegacySlug: string;
  disposition: 'canonical' | 'alias';
}

interface CatalogV3Document {
  contractVersion: 3;
  ruleVersion: string;
  generatedAt: string;
  sourceTemplates: number;
  canonicalDesigns: number;
  templates: CatalogV3Alias[];
  gallery: Record<string, string[]>;
}

/**
 * Resolve the deployable text surface for one legacy slug from the canonical
 * design chosen by catalogue composition plus that slug's own copy, imagery,
 * colors, and fonts. Promotion uses this rather than trusting the already
 * materialized alias tree, then requires byte equality with the browser-tested
 * artifact before it can proceed.
 */
export function composeCatalogTemplateText(
  design: CanonicalDesign,
  contentPreset: ContentPreset,
  themePreset: ThemePreset,
): Map<string, string> {
  return new Map([
    ...Object.entries(applyContentPreset(design.pages, contentPreset)),
    ...Object.entries(applyThemePreset(design.styles, themePreset, contentPreset.images)),
  ]);
}

export interface ComposedVisualAliasArtifact {
  files: Map<string, string | Uint8Array>;
  fields: ContractField[];
  fingerprint: DedupeFingerprint;
}

function parseObjectDocument(value: string | Uint8Array | undefined, label: string): Record<string, unknown> {
  if (typeof value !== 'string') throw new Error(`${label} is missing from the candidate artifact`);
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} is not a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Resolve a visually equivalent irregular source onto the selected canonical
 * design without losing that source's copy, image, color, or font presets.
 * The result is only a candidate: callers must run the complete static and
 * two-viewport browser gates before making it current.
 */
export function composeVisualAliasArtifactFiles(input: {
  canonical: DedupeCandidate;
  candidate: DedupeCandidate;
  canonicalFiles?: ReadonlyMap<string, string | Uint8Array>;
  sourceFiles: ReadonlyMap<string, string | Uint8Array>;
  sourceArtifactHash: string;
}): ComposedVisualAliasArtifact {
  const { canonical, candidate } = input;
  if (canonical.fingerprint.legacySlug === candidate.fingerprint.legacySlug) {
    throw new Error('A visual alias must have a different canonical source');
  }
  if (canonical.design.niche !== candidate.design.niche) {
    throw new Error('A visual alias cannot cross niches');
  }
  const canonicalPages = Object.keys(canonical.design.pages).sort();
  const candidatePages = Object.keys(candidate.design.pages).sort();
  if (!sameStringSet(canonicalPages, candidatePages)) {
    throw new Error('A visual alias must retain the same page paths');
  }

  const files = new Map(input.sourceFiles);
  // Bring across canonical-only support files (for example icon sprites or
  // fonts) without overwriting assets selected by this legacy slug's image or
  // theme presets. Page/style bytes and metadata are rebuilt below.
  for (const [path, value] of input.canonicalFiles ?? []) {
    if (
      /\.html?$/i.test(path)
      || /\.css$/i.test(path)
      || path === 'template.json'
      || path === 'fields.json'
      || path.startsWith('.dailyclarity/')
    ) continue;
    if (!files.has(path)) files.set(path, value);
  }
  for (const path of [...Object.keys(candidate.design.pages), ...Object.keys(candidate.design.styles)]) {
    files.delete(path);
  }
  for (const [path, value] of composeCatalogTemplateText(
    canonical.design,
    candidate.contentPreset,
    candidate.themePreset,
  )) files.set(path, value);

  const fingerprint = createDedupeFingerprint({
    legacySlug: candidate.fingerprint.legacySlug,
    niche: candidate.fingerprint.niche,
    pages: canonical.design.pages,
    styles: canonical.design.styles,
    pageRoles: canonical.design.pageRoles,
    contentHash: candidate.contentPreset.hash,
    themeHash: candidate.themePreset.hash,
  });
  const catalogTemplateBase = {
    legacySlug: candidate.catalogTemplate.legacySlug,
    designId: canonical.design.id,
    contentPresetId: candidate.contentPreset.id,
    themePresetId: candidate.themePreset.id,
    niche: candidate.catalogTemplate.niche,
  };
  const templateDocument = parseObjectDocument(files.get('template.json'), 'template.json');
  const rehabilitation = parseObjectDocument(
    files.get('.dailyclarity/rehabilitation.json'),
    '.dailyclarity/rehabilitation.json',
  );
  const priorStaticReceipt = parseObjectDocument(
    files.get('.dailyclarity/quality-receipt.json'),
    '.dailyclarity/quality-receipt.json',
  );
  if (
    typeof priorStaticReceipt.id !== 'string'
    || typeof priorStaticReceipt.ruleVersion !== 'string'
    || typeof priorStaticReceipt.sourceHash !== 'string'
  ) throw new Error('The candidate static receipt has incomplete lineage');
  const fieldsDocument = parseObjectDocument(files.get('fields.json'), 'fields.json');
  if (!Array.isArray(fieldsDocument.fields)) throw new Error('fields.json has no canonical fields array');
  const fields = fieldsDocument.fields as ContractField[];
  if (fields.some((field) => !field || typeof field !== 'object' || typeof field.name !== 'string')) {
    throw new Error('fields.json contains an invalid canonical field');
  }

  const templateDocumentBase: Record<string, unknown> = {
    ...templateDocument,
    pages: canonicalPages,
    pageRoles: canonical.design.pageRoles,
    designId: canonical.design.id,
    contentPresetId: candidate.contentPreset.id,
    themePresetId: candidate.themePreset.id,
  };
  delete templateDocumentBase.qualityReceipt;
  files.set('template.json', `${JSON.stringify(templateDocumentBase, null, 2)}\n`);
  files.set('.dailyclarity/catalog-v3.json', `${JSON.stringify(catalogTemplateBase, null, 2)}\n`);
  files.set('.dailyclarity/design.json', `${JSON.stringify(canonical.design, null, 2)}\n`);
  files.set('.dailyclarity/content-preset.json', `${JSON.stringify(candidate.contentPreset, null, 2)}\n`);
  files.set('.dailyclarity/theme-preset.json', `${JSON.stringify(candidate.themePreset, null, 2)}\n`);
  files.set('.dailyclarity/fingerprint.json', `${JSON.stringify(fingerprint, null, 2)}\n`);
  const nextRehabilitation = {
    ...rehabilitation,
    visualAliasComposition: {
      version: 1,
      canonicalLegacySlug: canonical.fingerprint.legacySlug,
      canonicalDesignId: canonical.design.id,
      priorDesignId: candidate.design.id,
      priorArtifactHash: input.sourceArtifactHash,
      priorStaticReceiptId: priorStaticReceipt.id,
      contentPresetId: candidate.contentPreset.id,
      themePresetId: candidate.themePreset.id,
    },
  };
  files.set('.dailyclarity/rehabilitation.json', `${JSON.stringify(nextRehabilitation, null, 2)}\n`);
  files.delete('.dailyclarity/quality-receipt.json');

  // The local receipt is deliberately a deterministic static-preflight
  // receipt. Browser-final evidence is written separately after the immutable
  // tree has rendered, avoiding any receipt/artifact hash cycle.
  const staticVerification = verifyStaticArtifact(files, fields);
  const receiptBase = {
    scope: 'visual-alias-composition-static-preflight',
    legacySlug: candidate.fingerprint.legacySlug,
    ruleVersion: priorStaticReceipt.ruleVersion,
    status: staticVerification.passed ? 'passed' as const : 'failed' as const,
    checks: [{
      code: 'visual-alias-composition-static',
      pass: staticVerification.passed,
      detail: staticVerification.passed
        ? 'Canonical design and legacy content/theme presets compose safely and byte-exactly'
        : staticVerification.errors.map((error) => `${error.code}${error.page ? `:${error.page}` : ''}:${error.detail}`).join('; '),
    }],
    issueCounts: {
      info: 0,
      warning: 0,
      error: staticVerification.errors.length,
      critical: 0,
    },
    sourceHash: priorStaticReceipt.sourceHash,
    artifactHash: artifactTree(files).hash,
    artifactHashScope: 'pre-receipt-composition-payload',
    supersedes: priorStaticReceipt.id,
    canonicalLegacySlug: canonical.fingerprint.legacySlug,
    designId: canonical.design.id,
    contentPresetId: candidate.contentPreset.id,
    themePresetId: candidate.themePreset.id,
  };
  const staticReceiptId = `receipt_${sha256(stableStringify(receiptBase)).slice(0, 24)}`;
  const catalogTemplate: CatalogTemplate = { ...catalogTemplateBase, qualityReceipt: staticReceiptId };
  files.set('template.json', `${JSON.stringify({ ...templateDocumentBase, qualityReceipt: staticReceiptId }, null, 2)}\n`);
  files.set('.dailyclarity/catalog-v3.json', `${JSON.stringify(catalogTemplate, null, 2)}\n`);
  files.set('.dailyclarity/quality-receipt.json', `${JSON.stringify({ id: staticReceiptId, ...receiptBase }, null, 2)}\n`);

  return { files, fields, fingerprint };
}

async function logEvent(
  context: Pick<LegacyCommandContext, 'config' | 'runId'>,
  event: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const path = assertWorkPath(context.config, join(context.config.logRoot, `${context.runId}.ndjson`));
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify({ at: new Date().toISOString(), event, ...data })}\n`, 'utf8');
}

function digest(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeRelativePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
  if (
    !normalized
    || normalized.startsWith('/')
    || normalized.includes('\0')
    || normalized.split('/').some((segment) => !SAFE_RELATIVE_SEGMENT.test(segment))
  ) {
    throw new Error(`Unsafe artifact-relative path: ${JSON.stringify(value)}`);
  }
  return normalized;
}

function isWithin(root: string, target: string): boolean {
  const difference = relative(resolve(root), resolve(target));
  return difference === '' || (difference !== '..' && !difference.startsWith(`..${sep}`) && !difference.includes(`:${sep}`));
}

function artifactTree(files: ReadonlyMap<string, string | Uint8Array>): {
  hash: string;
  files: Array<{ path: string; sha256: string; bytes: number }>;
} {
  const records = [...files.entries()]
    .map(([rawPath, content]) => {
      const path = normalizeRelativePath(rawPath);
      const bytes = Buffer.from(content);
      return { path, sha256: digest(bytes), bytes: bytes.byteLength };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
  return { hash: digest(stableStringify(records)), files: records };
}

type ArtifactTree = ReturnType<typeof artifactTree>;

async function blobMatches(path: string, expectedBytes: number, expectedHash: string): Promise<boolean> {
  const details = await stat(path).catch(() => null);
  if (!details?.isFile() || details.size !== expectedBytes) return false;
  return digest(await readFile(path)) === expectedHash;
}

async function validateMaterializedArtifact(root: string, expected: ArtifactTree): Promise<void> {
  const treePath = resolve(root, '.dailyclarity', 'artifact-tree.json');
  if (!isWithin(root, treePath)) throw new Error(`Artifact tree path escaped its root: ${treePath}`);
  const treeDetails = await lstat(treePath).catch(() => null);
  if (!treeDetails?.isFile() || treeDetails.isSymbolicLink()) {
    throw new Error(`Materialized artifact has no safe tree manifest: ${treePath}`);
  }
  let recorded: unknown;
  try {
    recorded = JSON.parse(await readFile(treePath, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`Materialized artifact tree manifest is malformed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (stableStringify(recorded) !== stableStringify({ version: 1, treeHash: expected.hash, files: expected.files })) {
    throw new Error(`Materialized artifact tree manifest does not match ${expected.hash}`);
  }

  const actualPaths: string[] = [];
  const pending = [''];
  while (pending.length > 0) {
    const currentRelative = pending.pop()!;
    const current = currentRelative ? resolve(root, ...currentRelative.split('/')) : root;
    if (!isWithin(root, current)) throw new Error(`Materialized artifact directory escaped its root: ${currentRelative}`);
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const relativePath = normalizeRelativePath(currentRelative ? `${currentRelative}/${entry.name}` : entry.name);
      const target = resolve(root, ...relativePath.split('/'));
      if (!isWithin(root, target)) throw new Error(`Materialized artifact entry escaped its root: ${relativePath}`);
      const details = await lstat(target);
      if (details.isSymbolicLink()) throw new Error(`Materialized artifacts may not contain symbolic links: ${relativePath}`);
      if (details.isDirectory()) pending.push(relativePath);
      else if (details.isFile() && relativePath !== '.dailyclarity/artifact-tree.json') actualPaths.push(relativePath);
      else if (!details.isFile()) throw new Error(`Materialized artifact contains an unsupported entry: ${relativePath}`);
    }
  }
  actualPaths.sort((left, right) => left.localeCompare(right));
  const expectedPaths = expected.files.map((file) => file.path);
  if (stableStringify(actualPaths) !== stableStringify(expectedPaths)) {
    throw new Error(`Materialized artifact file set does not match ${expected.hash}`);
  }
  for (const file of expected.files) {
    const target = resolve(root, ...file.path.split('/'));
    const bytes = await readFile(target);
    if (bytes.byteLength !== file.bytes || digest(bytes) !== file.sha256) {
      throw new Error(`Materialized artifact digest mismatch: ${file.path}`);
    }
  }
}

async function validateRecordedArtifact(root: string, expectedHash: string): Promise<void> {
  const treePath = resolve(root, '.dailyclarity', 'artifact-tree.json');
  if (!isWithin(root, treePath)) throw new Error(`Artifact tree path escaped its root: ${treePath}`);
  const treeDetails = await lstat(treePath).catch(() => null);
  if (!treeDetails?.isFile() || treeDetails.isSymbolicLink()) {
    throw new Error(`Materialized artifact has no safe tree manifest: ${treePath}`);
  }
  let value: unknown;
  try {
    value = JSON.parse(await readFile(treePath, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`Materialized artifact tree manifest is malformed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Materialized artifact tree manifest is not an object');
  }
  const manifest = value as Record<string, unknown>;
  if (manifest.version !== 1 || manifest.treeHash !== expectedHash || !Array.isArray(manifest.files)) {
    throw new Error(`Materialized artifact tree manifest does not attest ${expectedHash}`);
  }
  const files: ArtifactTree['files'] = [];
  const paths = new Set<string>();
  for (const item of manifest.files) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Materialized artifact tree contains a malformed file record');
    }
    const record = item as Record<string, unknown>;
    if (
      typeof record.path !== 'string'
      || normalizeRelativePath(record.path) !== record.path
      || typeof record.sha256 !== 'string'
      || !/^[a-f0-9]{64}$/.test(record.sha256)
      || typeof record.bytes !== 'number'
      || !Number.isSafeInteger(record.bytes)
      || record.bytes < 0
      || paths.has(record.path)
    ) {
      throw new Error('Materialized artifact tree contains an invalid file record');
    }
    paths.add(record.path);
    files.push({ path: record.path, sha256: record.sha256, bytes: record.bytes });
  }
  const sortedFiles = [...files].sort((left, right) => left.path.localeCompare(right.path));
  if (stableStringify(files) !== stableStringify(sortedFiles) || digest(stableStringify(files)) !== expectedHash) {
    throw new Error(`Materialized artifact tree records do not hash to ${expectedHash}`);
  }
  await validateMaterializedArtifact(root, { hash: expectedHash, files });
}

export async function materializeArtifact(
  context: LegacyCommandContext,
  template: LegacyTemplateRecord,
  files: ReadonlyMap<string, string | Uint8Array>,
): Promise<{ directory: string; treeHash: string; bytes: number }> {
  const tree = artifactTree(files);
  const target = assertWorkPath(
    context.config,
    join(context.config.artifactRoot, 'candidates', template.niche, template.legacySlug, tree.hash),
  );
  if ((await stat(target).catch(() => null))?.isDirectory()) {
    await validateMaterializedArtifact(target, tree);
  } else {
    const staging = assertWorkPath(
      context.config,
      join(context.config.artifactRoot, '.staging', `${template.niche}-${template.legacySlug}-${randomUUID()}`),
    );
    await mkdir(staging, { recursive: true });
    try {
      for (const record of tree.files) {
        const content = files.get(record.path);
        if (content === undefined) throw new Error(`Artifact content disappeared: ${record.path}`);
        const blob = assertWorkPath(
          context.config,
          join(context.config.blobRoot, record.sha256.slice(0, 2), record.sha256),
        );
        let validBlob = await blobMatches(blob, record.bytes, record.sha256);
        if (!validBlob) {
          try {
            await atomicWriteFile(context.config, blob, content);
          } catch (error) {
            if (!await blobMatches(blob, record.bytes, record.sha256)) throw error;
          }
          validBlob = await blobMatches(blob, record.bytes, record.sha256);
        }
        if (!validBlob) {
          throw new Error(`Content-addressed blob digest mismatch after write: ${record.sha256}`);
        }
        const output = assertWorkPath(context.config, join(staging, ...record.path.split('/')));
        await mkdir(dirname(output), { recursive: true });
        try {
          await link(blob, output);
        } catch {
          await copyFile(blob, output);
        }
      }
      await atomicWriteFile(
        context.config,
        join(staging, '.dailyclarity', 'artifact-tree.json'),
        `${JSON.stringify({ version: 1, treeHash: tree.hash, files: tree.files }, null, 2)}\n`,
      );
      await mkdir(dirname(target), { recursive: true });
      try {
        await rename(staging, target);
      } catch (error) {
        if (!(await stat(target).catch(() => null))?.isDirectory()) throw error;
        await rm(staging, { recursive: true, force: true });
      }
    } catch (error) {
      if (isWithin(context.config.artifactRoot, staging)) {
        await rm(staging, { recursive: true, force: true });
      }
      throw error;
    }
    await validateMaterializedArtifact(target, tree);
  }

  const bytes = tree.files.reduce((sum, file) => sum + file.bytes, 0);
  context.ledger.addArtifact({
    runId: context.runId,
    templateId: template.id,
    kind: 'candidate-template',
    contentHash: tree.hash,
    relativePath: relative(context.config.workRoot, target),
    byteSize: bytes,
    metadata: { fileCount: tree.files.length },
  });
  await atomicWriteFile(
    context.config,
    join(context.config.artifactRoot, 'candidates', template.niche, template.legacySlug, 'current.json'),
    `${JSON.stringify({ treeHash: tree.hash, relativePath: relative(context.config.workRoot, target).replace(/\\/g, '/') }, null, 2)}\n`,
  );
  return { directory: target, treeHash: tree.hash, bytes };
}

async function readSourceFiles(inventory: LegacyTemplateInventory): Promise<Map<string, string | Uint8Array>> {
  const files = new Map<string, string | Uint8Array>();
  for (const file of inventory.files) {
    const bytes = await readFile(join(inventory.sourceDir, ...file.relativePath.split('/')));
    files.set(file.relativePath, TEXT_EXTENSIONS.has(extname(file.relativePath).toLowerCase()) ? bytes.toString('utf8') : bytes);
  }
  return files;
}

interface PreparedFoundationInput {
  files: Map<string, string | Uint8Array>;
  fields: unknown;
  plan?: FoundationAlignmentPlan;
}

function authoritativeFoundationFields(rawFields: unknown, plan: FoundationAlignmentPlan): unknown {
  const byName = new Map(normalizeFields(rawFields).map((field) => [field.name, field]));
  for (const [name, value] of Object.entries(plan.identity)) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const captured = normalizeFields({ fields: [{ name, default: value }] })[0];
    if (!captured) throw new Error(`Foundation identity field ${name} cannot be canonicalized`);
    const previous = byName.get(captured.name);
    const next: CanonicalField = {
      ...captured,
      ...(previous ? {
        label: previous.label,
        type: previous.type,
        ...(previous.sourceName ? { sourceName: previous.sourceName } : {}),
      } : {}),
      // The value observed in the hash-bound structural slot is authoritative.
      // Stale fields.json defaults are common in this cohort and must not drive
      // literal replacement on sibling pages.
      default: value.trim(),
    };
    byName.set(next.name, next);
  }
  return {
    contractVersion: 3,
    fields: [...byName.values()].sort((left, right) => left.name.localeCompare(right.name, 'en')),
  };
}

function foundationAlignmentMetadata(
  plan: FoundationAlignmentPlan,
  sourceTreeHash: string,
): Record<string, unknown> {
  const restoredTokens = [...new Set(plan.slots.flatMap((slot) => slot.tokens))].sort();
  const capturedIdentityFields = Object.keys(plan.identity).sort();
  return {
    version: plan.version,
    foundationId: plan.foundationId,
    foundationSha256: plan.foundationSha256,
    registrySha256: plan.registrySha256,
    sourceTreeSha256: sourceTreeHash,
    sourceIndexSha256: plan.sourceSha256,
    sourceStructureSha256: plan.sourceStructureSha256,
    normalizedSourceSha256: plan.normalizedSourceSha256,
    canonicalAlignedSha256: plan.alignedSha256,
    identityAlignedSha256: plan.identityAlignedSha256,
    roundTripSha256: plan.roundTripSha256,
    slotCount: plan.slots.length,
    identityAlignedSlotCount: plan.identityAlignedSlots.length,
    restoredTokens,
    capturedIdentityFields,
    capturedIdentitySha256: sha256(stableStringify(plan.identity)),
    editorialContentCount: plan.editorialContent.length,
    editorialContentSha256: sha256(stableStringify(plan.editorialContent)),
    themeDeclarationCount: plan.theme.declarations.length,
    themeColorCount: plan.theme.colors.length,
    themeFontCount: plan.theme.fonts.length,
    sourceThemeSha256: sha256(stableStringify(plan.theme)),
    sourceUnchanged: plan.sourceUnchanged,
    editorialPreserved: plan.editorialPreservedInIdentityAlignment,
  };
}

function prepareFoundationInput(
  inventory: LegacyTemplateInventory,
  sourceFiles: ReadonlyMap<string, string | Uint8Array>,
  registry?: FoundationRegistry,
): PreparedFoundationInput {
  const files = new Map(sourceFiles);
  if (!inventory.foundation) return { files, fields: inventory.rawFields };
  if (!registry) throw new Error(`Foundation registry is required for ${inventory.key}`);
  const indexHtml = files.get('index.html');
  if (typeof indexHtml !== 'string' || !FOUNDATION_MARKER_RE.test(indexHtml)) {
    throw new Error(`Foundation-marked template ${inventory.key} has no readable marked index.html`);
  }
  const plan = planFoundationAlignment({
    sourceHtml: indexHtml,
    declaredNiche: inventory.niche,
    registry,
    sourceName: `${inventory.key}/index.html`,
    stylesheets: Object.fromEntries([...files.entries()]
      .filter(([path, value]) => /\.css$/i.test(path) && typeof value === 'string')
      .map(([path, value]) => [path, value as string])),
  });
  const expectedFoundationId = `foundation:${inventory.foundation.niche}:${inventory.foundation.layoutFamily}`;
  if (plan.foundationId !== expectedFoundationId) {
    throw new Error(`Inventory foundation ${expectedFoundationId} disagrees with ${plan.foundationId}`);
  }
  files.set('index.html', plan.identityAlignedHtml);
  return {
    files,
    fields: authoritativeFoundationFields(inventory.rawFields, plan),
    plan,
  };
}

function localReferenceErrors(
  filename: string,
  text: string,
  availableFiles: ReadonlySet<string>,
): Array<{ code: string; page?: string; detail: string }> {
  const errors: Array<{ code: string; page?: string; detail: string }> = [];
  const references: string[] = [];

  const cssReferences = (css: string): string[] => {
    const found: string[] = [];
    // Comments are inert CSS. Ignoring them avoids treating explanatory text
    // such as "data URL (also intended as ...)" as an actual url() function.
    const searchable = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const lower = searchable.toLowerCase();
    for (let cursor = 0; cursor < searchable.length;) {
      const start = lower.indexOf('url', cursor);
      if (start < 0) break;
      const before = start > 0 ? searchable[start - 1]! : '';
      let open = start + 3;
      while (/\s/.test(searchable[open] ?? '')) open += 1;
      if (/[A-Za-z0-9_-]/.test(before) || searchable[open] !== '(') {
        cursor = start + 3;
        continue;
      }
      let index = open + 1;
      while (/\s/.test(searchable[index] ?? '')) index += 1;
      const quote = searchable[index] === '"' || searchable[index] === "'" ? searchable[index++]! : '';
      const valueStart = index;
      let escaped = false;
      while (index < searchable.length) {
        const character = searchable[index]!;
        if (escaped) {
          escaped = false;
          index += 1;
          continue;
        }
        if (character === '\\') {
          escaped = true;
          index += 1;
          continue;
        }
        if (quote ? character === quote : character === ')') break;
        index += 1;
      }
      found.push(searchable.slice(valueStart, index).trim());
      if (quote && searchable[index] === quote) index += 1;
      while (index < searchable.length && searchable[index] !== ')') index += 1;
      cursor = Math.min(searchable.length, index + 1);
    }
    for (const match of searchable.matchAll(/@import\s+(?!url\()(["'])(.*?)\1/gi)) found.push(match[2]!.trim());
    return found;
  };

  if (/\.html?$/i.test(filename)) {
    const document = parse(text) as unknown as HtmlNode;
    const walk = (node: HtmlNode): void => {
      if (node.tagName) {
        for (const attr of node.attrs ?? []) {
          const name = attr.name.toLowerCase();
          if (['src', 'href', 'poster', 'action', 'formaction', 'xlink:href'].includes(name)) references.push(attr.value.trim());
          if (name === 'srcset') {
            for (const candidate of attr.value.split(',')) references.push(candidate.trim().split(/\s+/, 1)[0] ?? '');
          }
          if (name === 'style') references.push(...cssReferences(attr.value));
        }
        if (node.tagName === 'style') {
          references.push(...cssReferences((node.childNodes ?? []).map((child) => child.value ?? '').join('')));
        }
      }
      for (const child of node.childNodes ?? []) walk(child);
    };
    walk(document);
  } else if (/\.css$/i.test(filename)) {
    references.push(...cssReferences(text));
  }
  const decodeHtmlReference = (value: string): string => value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&colon;/gi, ':')
    .replace(/&amp;/gi, '&')
    .trim()
    .replace(/^(["'])(.*)\1$/s, '$2')
    .trim();
  for (const rawReference of references) {
    const reference = decodeHtmlReference(rawReference);
    if (!reference || reference.startsWith('#') || reference.startsWith('{{') || /^(?:data|blob|mailto|tel):/i.test(reference)) continue;
    if (/^(?:https?:)?\/\//i.test(reference)) {
      errors.push({ code: 'remote_dependency', page: filename, detail: reference });
      continue;
    }
    const pathname = reference.split('#')[0]!.split('?')[0]!;
    if (!pathname) continue;
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      errors.push({ code: 'malformed_local_reference', page: filename, detail: reference });
      continue;
    }
    if (!decoded || decoded.startsWith('#') || /^(?:data|blob):/i.test(decoded)) continue;
    const resolved = reference.startsWith('/')
      ? posix.normalize(decoded.replace(/^\/+/, ''))
      : posix.normalize(posix.join(posix.dirname(filename), decoded));
    if (resolved.startsWith('../') || !availableFiles.has(resolved)) {
      errors.push({ code: 'missing_local_reference', page: filename, detail: `${reference} -> ${resolved}` });
    }
  }
  return errors;
}

function fragmentReferenceErrors(
  pages: ReadonlyMap<string, string>,
): Array<{ code: string; page?: string; detail: string }> {
  const targets = new Map<string, Set<string>>();
  const links: Array<{ page: string; href: string }> = [];
  for (const [page, html] of pages) {
    const fragments = new Set<string>();
    const document = parse(html) as unknown as HtmlNode;
    const walk = (node: HtmlNode): void => {
      if (node.tagName) {
        const attr = (name: string): string | undefined => node.attrs
          ?.find((candidate) => candidate.name.toLowerCase() === name)?.value;
        const id = attr('id');
        if (id) fragments.add(id);
        if (node.tagName === 'a') {
          const name = attr('name');
          if (name) fragments.add(name);
          const href = attr('href');
          if (href) links.push({ page, href });
        }
      }
      for (const child of node.childNodes ?? []) walk(child);
    };
    walk(document);
    targets.set(page.toLowerCase(), fragments);
  }

  const errors: Array<{ code: string; page?: string; detail: string }> = [];
  for (const { page, href } of links) {
    const hashIndex = href.indexOf('#');
    if (hashIndex < 0 || /^(?:https?:|mailto:|tel:|data:|blob:|\{\{)/i.test(href)) continue;
    const encodedFragment = href.slice(hashIndex + 1);
    if (!encodedFragment) continue;
    let fragment: string;
    try {
      fragment = decodeURIComponent(encodedFragment);
    } catch {
      errors.push({ code: 'malformed_fragment_reference', page, detail: href });
      continue;
    }
    const rawPath = href.slice(0, hashIndex).split('?', 1)[0] ?? '';
    let targetPage = page;
    if (rawPath) {
      let decoded: string;
      try {
        decoded = decodeURIComponent(rawPath);
      } catch {
        continue;
      }
      targetPage = rawPath.startsWith('/')
        ? posix.normalize(decoded.replace(/^\/+/, ''))
        : posix.normalize(posix.join(posix.dirname(page), decoded));
    }
    const fragments = targets.get(targetPage.toLowerCase());
    // Missing files are already reported by localReferenceErrors. This check
    // adds the otherwise invisible "file exists, fragment does not" case.
    if (fragments && !fragments.has(fragment)) {
      errors.push({ code: 'missing_fragment_reference', page, detail: `${href} -> ${targetPage}#${fragment}` });
    }
  }
  return errors;
}

export function verifyStaticArtifact(
  files: ReadonlyMap<string, string | Uint8Array>,
  fields: readonly ContractField[],
): StaticVerification {
  const errors: StaticVerification['errors'] = [];
  const pages = new Map<string, string>();
  const availableFiles = new Set([...files.keys()].map(normalizeRelativePath));
  for (const [rawPath, content] of files) {
    const path = normalizeRelativePath(rawPath);
    if (typeof content !== 'string') continue;
    if (/\.html?$/i.test(path)) {
      pages.set(path, content);
      if (!/<main\b/i.test(content)) errors.push({ code: 'missing_main', page: path, detail: 'Page has no main landmark' });
      if (!/<h[1-6]\b/i.test(content)) errors.push({ code: 'missing_heading', page: path, detail: 'Page has no heading' });
      if (ACTIVE_MARKUP_RE.test(content)) errors.push({ code: 'unsafe_active_markup', page: path, detail: 'Unsafe or unaudited active markup remains' });
      const runtimes = content.match(/<script\b[^>]*\bsrc=["']assets\/js\/dc-compat\.js["'][^>]*>/gi) ?? [];
      if (runtimes.length !== 1) errors.push({ code: 'compatibility_runtime_count', page: path, detail: `Expected one audited runtime, found ${runtimes.length}` });
      const document = parse(content) as unknown as HtmlNode;
      // Read IDs from actual DOM attributes. Accessibility overrides target
      // those IDs from inline CSS, so a raw-text regex would count selector
      // references as duplicate elements and force a valid primary design into
      // the neutral fallback lane.
      const editIds: string[] = [];
      const imageIds: string[] = [];
      const collectEditorIds = (node: HtmlNode): void => {
        for (const attr of node.attrs ?? []) {
          if (attr.name === 'data-dc-edit-id') editIds.push(attr.value);
          if (attr.name === 'data-dc-image-id') imageIds.push(attr.value);
        }
        for (const child of node.childNodes ?? []) collectEditorIds(child);
      };
      collectEditorIds(document);
      if (editIds.length === 0) errors.push({ code: 'missing_edit_ids', page: path, detail: 'No editable text IDs were emitted' });
      if (new Set(editIds).size !== editIds.length) errors.push({ code: 'duplicate_edit_ids', page: path, detail: 'Editable text IDs are not unique within the page' });
      if (new Set(imageIds).size !== imageIds.length) errors.push({ code: 'duplicate_image_ids', page: path, detail: 'Image IDs are not unique within the page' });
      const forms: HtmlNode[] = [];
      const controls: HtmlNode[] = [];
      const collectFormTopology = (node: HtmlNode): void => {
        if (node.tagName === 'form') forms.push(node);
        else if (['input', 'select', 'textarea'].includes(node.tagName ?? '')) controls.push(node);
        for (const child of node.childNodes ?? []) collectFormTopology(child);
      };
      collectFormTopology(document);
      const attributesOf = (node: HtmlNode): Map<string, string> => new Map(
        (node.attrs ?? []).map((attr) => [attr.name.toLowerCase(), attr.value]),
      );
      const formById = new Map<string, HtmlNode>();
      for (const form of forms) {
        const id = attributesOf(form).get('id');
        if (id && !formById.has(id)) formById.set(id, form);
      }
      const unnamedControls: string[] = [];
      for (const control of controls) {
        const attributes = attributesOf(control);
        const explicitOwner = attributes.get('form');
        let owner = explicitOwner === undefined ? undefined : formById.get(explicitOwner);
        if (explicitOwner === undefined) {
          let cursor = control.parentNode;
          while (cursor && !owner) {
            if (cursor.tagName === 'form') owner = cursor;
            cursor = cursor.parentNode;
          }
        }
        if (!owner || !attributesOf(owner).has('data-dc-standard-form')) continue;
        const excludedInput = control.tagName === 'input' && /^(?:button|submit|reset|image)$/i.test(attributes.get('type') ?? 'text');
        if (!excludedInput && !attributes.get('name')?.trim()) {
          unnamedControls.push(`${control.tagName}${attributes.get('id') ? `#${attributes.get('id')}` : ''}`);
        }
      }
      if (unnamedControls.length > 0) {
        errors.push({
          code: 'unnamed_form_controls',
          page: path,
          detail: `${unnamedControls.length} standard-form controls would be omitted from submission: ${unnamedControls.slice(0, 10).join(', ')}`,
        });
      }
    }
    if (/\.(?:html?|css)$/i.test(path)) {
      errors.push(...localReferenceErrors(path, content, availableFiles));
    }
  }
  errors.push(...fragmentReferenceErrors(pages));
  if (!pages.has('index.html')) errors.push({ code: 'missing_homepage', detail: 'index.html is missing' });

  // When a v3 composition is present, prove that the separated design,
  // content, image and theme presets reproduce the emitted customer artifact
  // byte-for-byte. This turns missing nested image/alt slots into a hard gate
  // instead of a latent editor bug.
  const designRaw = files.get('.dailyclarity/design.json');
  const contentRaw = files.get('.dailyclarity/content-preset.json');
  const themeRaw = files.get('.dailyclarity/theme-preset.json');
  if (typeof designRaw === 'string' && typeof contentRaw === 'string' && typeof themeRaw === 'string') {
    try {
      const design = JSON.parse(designRaw) as CanonicalDesign;
      const content = JSON.parse(contentRaw) as ContentPreset;
      const theme = JSON.parse(themeRaw) as ThemePreset;
      const composedPages = applyContentPreset(design.pages, content);
      const composedStyles = applyThemePreset(design.styles, theme, content.images);
      for (const [page, expected] of Object.entries(composedPages)) {
        if (files.get(page) !== expected) {
          errors.push({ code: 'content_composition_mismatch', page, detail: 'Design plus content/image preset does not exactly reproduce the emitted page' });
        }
      }
      for (const [stylesheet, expected] of Object.entries(composedStyles)) {
        if (files.get(stylesheet) !== expected) {
          errors.push({ code: 'theme_composition_mismatch', page: stylesheet, detail: 'Design plus theme/image preset does not exactly reproduce the emitted stylesheet' });
        }
      }
    } catch (error) {
      errors.push({
        code: 'composition_metadata_invalid',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const contract = validateTemplateContract(pages, fields);
  errors.push(...contract.errors.map((detail) => ({ code: 'publication_contract', detail })));
  return {
    passed: errors.length === 0,
    errors,
    tokens: [...new Set([...pages.values()].flatMap(extractTemplateTokens))].sort(),
  };
}

async function inventoryStage(context: LegacyCommandContext): Promise<CatalogInventory> {
  checkCancellation(context);
  const seenSlugs = new Set<string>();
  const inventory = await inventoryLegacyCatalog(context.config.sourceRoot, {
    workers: context.config.staticWorkers,
    signal: context.signal,
    onTemplate: async (candidate) => {
      if (seenSlugs.has(candidate.slug)) throw new Error(`Legacy slug is not globally unique: ${candidate.slug}`);
      seenSlugs.add(candidate.slug);
      const existing = context.ledger.getTemplateBySlug(candidate.slug);
      const changed = !existing
        || existing.sourceHash !== candidate.sourceTreeHash
        || existing.ruleVersion !== context.config.ruleVersion
        || existing.niche !== candidate.niche;
      const record = context.ledger.upsertTemplate(context.runId, {
        legacySlug: candidate.slug,
        niche: candidate.niche,
        sourcePath: candidate.sourceDir,
        sourceHash: candidate.sourceTreeHash,
        foundationId: candidate.foundation
          ? `${candidate.foundation.niche} layout-family-${candidate.foundation.layoutFamily}`
          : null,
        pageCount: candidate.pages.length,
        stage: 'repair_pending',
      }, context.config.ruleVersion);
      context.ledger.reconcileInventoryPages(
        record.id,
        candidate.pages.map((page) => ({
          relativePath: page.name,
          role: page.role,
          sourceHash: page.sha256,
        })),
        changed,
      );
      if (changed) {
        for (const item of candidate.issues) {
          context.ledger.addIssue({
            templateId: record.id,
            runId: context.runId,
            code: item.code,
            severity: item.severity,
            message: item.detail,
            fingerprint: item.fingerprint,
            details: { page: item.page },
          });
        }
      }
    },
  });
  checkCancellation(context);
  const snapshot = {
    version: 1,
    sourceRoot: inventory.sourceRoot,
    catalogHash: inventory.catalogHash,
    templateCount: inventory.templateCount,
    pageCount: inventory.pageCount,
    fileCount: inventory.fileCount,
    sourceBytes: inventory.sourceBytes,
    countsByNiche: inventory.countsByNiche,
    remoteUrlCount: inventory.remoteUrls.length,
    startedAt: inventory.startedAt,
    completedAt: inventory.completedAt,
  };
  const path = join(context.config.reportRoot, 'inventory.json');
  const body = `${JSON.stringify(snapshot, null, 2)}\n`;
  await atomicWriteFile(context.config, path, body);
  context.ledger.addArtifact({
    runId: context.runId,
    kind: 'inventory',
    contentHash: digest(body),
    relativePath: relative(context.config.workRoot, path),
    byteSize: Buffer.byteLength(body),
    metadata: snapshot,
  });
  await logEvent(context, 'inventory.completed', {
    catalogHash: inventory.catalogHash,
    templates: inventory.templateCount,
    pages: inventory.pageCount,
    files: inventory.fileCount,
  });
  return inventory;
}

function artifactForTemplate(
  context: Pick<LegacyCommandContext, 'ledger'>,
  template: LegacyTemplateRecord,
): LegacyArtifactRecord | undefined {
  return context.ledger.listArtifacts({ templateId: template.id, kind: 'candidate-template' })
    .find((artifact) => artifact.contentHash === template.resultHash);
}

export async function repairOne(
  context: LegacyCommandContext,
  lease: LeasedTemplate,
  vendor: AssetVendor,
  homepageDonor?: HomepageDonor,
  foundationRegistry?: FoundationRegistry,
): Promise<'repaired' | 'neutral_fallback' | 'failed' | 'cancelled'> {
  try {
    if (context.config.cloudRepair && !context.cloudRepairClient) {
      throw new Error('Cloud repair was enabled without an explicitly authorized client');
    }
    const before = await inventoryLegacyTemplate(context.config.sourceRoot, lease.niche as never, lease.legacySlug);
    if (before.sourceTreeHash !== lease.sourceHash) {
      throw new Error(`Source changed after inventory: expected ${lease.sourceHash}, found ${before.sourceTreeHash}`);
    }
    const inputFiles = await readSourceFiles(before);
    const preparedInput = prepareFoundationInput(before, inputFiles, foundationRegistry);
    const alignmentMetadata = preparedInput.plan
      ? foundationAlignmentMetadata(preparedInput.plan, before.sourceTreeHash)
      : undefined;
    if (preparedInput.plan && alignmentMetadata) {
      context.ledger.addTransformation({
        templateId: lease.id,
        runId: context.runId,
        ruleCode: 'align-checked-in-foundation',
        ruleVersion: context.config.ruleVersion,
        beforeHash: preparedInput.plan.sourceSha256,
        afterHash: preparedInput.plan.identityAlignedSha256,
        details: alignmentMetadata,
      });
    }
    // Vendor before preset extraction so content/theme presets contain local,
    // durable references. Run a second pass after repair as a fail-closed net.
    const sourceAssets = await vendorRemoteAssets(preparedInput.files, vendor);
    const primaryRepair: RepairResult = repairLegacyTemplate({
      slug: lease.legacySlug,
      niche: lease.niche,
      files: sourceAssets.files,
      manifest: before.rawManifest,
      fields: preparedInput.fields,
      ruleVersion: context.config.ruleVersion,
      ...(homepageDonor ? { homepageDonor } : {}),
    });
    const primaryVended = await vendorRemoteAssets(primaryRepair.files, vendor);
    const primaryAssets = [...new Map([...sourceAssets.assets, ...primaryVended.assets]
      .map((asset) => [asset.sourceUrl, asset])).values()];
    const primaryAssetWarnings = [...sourceAssets.warnings, ...primaryVended.warnings];
    primaryVended.files.set('.dailyclarity/assets.json', assetLicenseManifest(primaryAssets));
    const primaryVerification = verifyStaticArtifact(primaryVended.files, primaryRepair.fields);

    let repaired = primaryRepair;
    let vended = primaryVended;
    let verification = primaryVerification;
    let allAssets = primaryAssets;
    let allAssetWarnings = primaryAssetWarnings;
    let usedNeutralFallback = false;
    let usedCloudRepair = false;
    let cloudRepairAttempts = 0;
    const cloudLaneIds: string[] = [];

    if (!verification.passed && context.config.cloudRepair && context.cloudRepairClient) {
      for (const attempt of [1, 2] as const) {
        const plan = planCloudRepairFragments({
          files: vended.files,
          errors: verification.errors,
          niche: lease.niche,
          pageRoles: repaired.manifest.pageRoles,
          templateId: lease.id,
          attempt,
        });
        if (!plan.eligible) {
          await logEvent(context, 'template.cloud_repair_ineligible', {
            niche: lease.niche,
            legacySlug: lease.legacySlug,
            attempt,
            reason: plan.reason,
          });
          break;
        }

        cloudRepairAttempts = attempt;
        const laneId = `repair-${lease.id}-${digest(`${context.runId}\0${lease.sourceHash}\0${context.config.ruleVersion}`).slice(0, 20)}-a${attempt}`;
        cloudLaneIds.push(laneId);
        const outcomes = await executeCloudRepairLane({
          config: context.config,
          ledger: context.ledger,
          client: context.cloudRepairClient,
          runId: context.runId,
          laneId,
          fragments: plan.fragments,
          signal: context.signal,
          onPoll: () => {
            if (!context.ledger.renewLease(lease.id, lease.leaseToken, 15 * 60_000)) {
              throw new Error(`Cloud repair lease expired for ${lease.legacySlug}`);
            }
            context.ledger.heartbeatRun(context.runId);
          },
        });
        const applied = applyCloudRepairPatches(vended.files, plan, outcomes);
        if (applied.appliedMembers > 0) {
          // Model output is never trusted as a final artifact. Re-vendor first,
          // then rebuild IDs, presets, manifests, and receipts deterministically
          // and require the ordinary static gate again.
          const patchedSource = await vendorRemoteAssets(applied.files, vendor);
          const candidateRepair = repairLegacyTemplate({
            slug: lease.legacySlug,
            niche: lease.niche,
            files: patchedSource.files,
            manifest: before.rawManifest,
            fields: preparedInput.fields,
            ruleVersion: context.config.ruleVersion,
            ...(homepageDonor ? { homepageDonor } : {}),
          });
          const candidateVended = await vendorRemoteAssets(candidateRepair.files, vendor);
          const candidateAssets = [...new Map([
            ...allAssets,
            ...patchedSource.assets,
            ...candidateVended.assets,
          ].map((asset) => [asset.sourceUrl, asset])).values()];
          candidateVended.files.set('.dailyclarity/assets.json', assetLicenseManifest(candidateAssets));
          const candidateVerification = verifyStaticArtifact(candidateVended.files, candidateRepair.fields);
          context.ledger.addTransformation({
            templateId: lease.id,
            runId: context.runId,
            ruleCode: 'apply-validated-cloud-fragment-patch',
            ruleVersion: context.config.ruleVersion,
            beforeHash: repaired.qualityReceipt.artifactHash,
            afterHash: candidateRepair.qualityReceipt.artifactHash,
            details: {
              laneId,
              attempt,
              fragments: applied.appliedMembers,
              passedDeterministicRecompile: candidateVerification.passed,
            },
          });
          repaired = candidateRepair;
          vended = candidateVended;
          verification = candidateVerification;
          allAssets = candidateAssets;
          allAssetWarnings = [
            ...allAssetWarnings,
            ...patchedSource.warnings,
            ...candidateVended.warnings,
          ];
          if (verification.passed) {
            usedCloudRepair = true;
            break;
          }
        }

        const mayRetry = outcomes.some((outcome) => outcome.kind === 'retry' || outcome.kind === 'patch');
        if (!mayRetry || attempt === 2) break;
      }
    }

    // A deterministic, niche-specific neutral template is the terminal safety
    // net. It lets every slug remain usable even when an irregular source is
    // too malformed to rehabilitate mechanically, while the immutable source
    // and the original failure evidence remain available for audit.
    if (!verification.passed) {
      const fallbackBeforeHash = repaired.qualityReceipt.artifactHash;
      const fallbackReason = verification.errors
        .map((error) => `${error.code}${error.page ? ` (${error.page})` : ''}: ${error.detail}`)
        .join('; ');
      const fallbackRepair = repairLegacyTemplate({
        slug: lease.legacySlug,
        niche: lease.niche,
        ruleVersion: context.config.ruleVersion,
        files: createNeutralFallbackFiles({
          slug: lease.legacySlug,
          niche: lease.niche,
          pages: before.pages.map((page) => page.name),
          reason: fallbackReason,
        }),
      });
      const fallbackVended = await vendorRemoteAssets(fallbackRepair.files, vendor);
      fallbackVended.files.set('.dailyclarity/assets.json', assetLicenseManifest(fallbackVended.assets));
      const fallbackVerification = verifyStaticArtifact(fallbackVended.files, fallbackRepair.fields);
      repaired = fallbackRepair;
      vended = fallbackVended;
      verification = fallbackVerification;
      allAssets = fallbackVended.assets;
      allAssetWarnings = fallbackVended.warnings;
      usedNeutralFallback = fallbackVerification.passed;
      context.ledger.addTransformation({
        templateId: lease.id,
        runId: context.runId,
        ruleCode: 'apply-neutral-fallback',
        ruleVersion: context.config.ruleVersion,
        beforeHash: fallbackBeforeHash,
        afterHash: fallbackRepair.qualityReceipt.artifactHash,
        details: {
          reason: fallbackReason,
          sourcePreserved: true,
          fallbackPassed: fallbackVerification.passed,
        },
      });
    }

    vended.files.set('.dailyclarity/rehabilitation.json', `${JSON.stringify({
      version: 1,
      ruleVersion: context.config.ruleVersion,
      sourceHash: lease.sourceHash,
      repairMode: usedNeutralFallback ? 'neutral_fallback' : usedCloudRepair ? 'cloud_fragment' : 'primary',
      primaryRepairPassed: primaryVerification.passed,
      primaryFailureCodes: [...new Set(primaryVerification.errors.map((error) => error.code))].sort(),
      cloudRepair: {
        enabled: context.config.cloudRepair,
        attempted: cloudRepairAttempts > 0,
        attempts: cloudRepairAttempts,
        laneIds: cloudLaneIds,
        passed: usedCloudRepair,
      },
      sourcePreserved: true,
      foundationAlignment: alignmentMetadata ?? null,
      homepageDonor: homepageDonor ? {
        legacySlug: homepageDonor.legacySlug,
        niche: homepageDonor.niche,
        contentHash: homepageDonor.contentHash,
        sourceTreeHash: homepageDonor.sourceTreeHash,
        selectionScore: homepageDonor.selectionScore,
      } : null,
    }, null, 2)}\n`);

    for (const transformation of [
      ...primaryRepair.transformations,
      ...(repaired === primaryRepair ? [] : repaired.transformations),
    ]) {
      context.ledger.addTransformation({
        templateId: lease.id,
        runId: context.runId,
        ruleCode: transformation.rule,
        ruleVersion: context.config.ruleVersion,
        details: {
          file: transformation.file,
          count: transformation.count,
          detail: transformation.detail,
        },
      });
    }
    for (const item of [
      ...primaryRepair.issues.map((issue) => ({ ...issue, resolved: issue.resolved || usedNeutralFallback || usedCloudRepair })),
      ...(repaired === primaryRepair ? [] : repaired.issues),
    ]) {
      context.ledger.addIssue({
        templateId: lease.id,
        runId: context.runId,
        code: item.code,
        severity: item.severity,
        message: item.message,
        fingerprint: digest(`${item.code}\0${item.file ?? ''}\0${item.message.replace(/\d+/g, '#')}`),
        details: { file: item.file, nodePath: item.nodePath },
        resolved: item.resolved || item.code.endsWith('awaiting-vendor'),
      });
    }
    for (const warning of allAssetWarnings) {
      context.ledger.addIssue({
        templateId: lease.id,
        runId: context.runId,
        code: 'asset_fallback',
        severity: 'warning',
        message: warning,
        fingerprint: digest(`asset_fallback\0${warning.replace(/https?:\/\/\S+/g, '<url>')}`),
        resolved: true,
      });
    }
    for (const error of primaryVerification.errors) {
      context.ledger.addIssue({
        templateId: lease.id,
        runId: context.runId,
        code: error.code,
        severity: 'critical',
        message: error.detail,
        fingerprint: digest(`${error.code}\0${error.page ?? ''}\0${error.detail.replace(/\d+/g, '#')}`),
        details: {
          page: error.page,
          resolution: usedNeutralFallback
            ? 'neutral_fallback'
            : usedCloudRepair
              ? 'cloud_fragment'
              : undefined,
        },
        resolved: usedNeutralFallback || usedCloudRepair,
      });
    }

    if (repaired !== primaryRepair) {
      for (const error of verification.errors) {
        context.ledger.addIssue({
          templateId: lease.id,
          runId: context.runId,
          code: `fallback_${error.code}`,
          severity: 'critical',
          message: error.detail,
          fingerprint: digest(`fallback\0${error.code}\0${error.page ?? ''}\0${error.detail.replace(/\d+/g, '#')}`),
          details: { page: error.page },
        });
      }
    }

    if (!verification.passed) {
      context.ledger.completeTemplateLease({
        templateId: lease.id,
        leaseToken: lease.leaseToken,
        stage: 'failed',
        terminalDisposition: 'quarantined',
        qualityReceipt: repaired.qualityReceipt.id,
      });
      await logEvent(context, 'template.static_failed', {
        niche: lease.niche,
        legacySlug: lease.legacySlug,
        errors: verification.errors.length,
        neutralFallbackAttempted: repaired !== primaryRepair,
      });
      return 'failed';
    }

    const artifact = await materializeArtifact(context, lease, vended.files);
    for (const [page, html] of [...vended.files.entries()].filter(([path, value]) => /\.html?$/i.test(path) && typeof value === 'string')) {
      const source = before.pages.find((candidate) => candidate.name === page);
      context.ledger.upsertPage({
        templateId: lease.id,
        relativePath: page,
        role: repaired.manifest.pageRoles[page] ?? 'other',
        sourceHash: source?.sha256 ?? digest('generated'),
        resultHash: digest(html),
        stage: 'static-passed',
      });
    }
    const after = await inventoryLegacyTemplate(context.config.sourceRoot, lease.niche as never, lease.legacySlug);
    if (after.sourceTreeHash !== before.sourceTreeHash) throw new Error('Immutable source changed while emitting repair artifact');
    const completed = context.ledger.completeTemplateLease({
      templateId: lease.id,
      leaseToken: lease.leaseToken,
      stage: 'render_pending',
      resultHash: artifact.treeHash,
      qualityReceipt: repaired.qualityReceipt.id,
    });
    if (!completed) throw new Error(`Repair lease expired for ${lease.legacySlug}`);
    await logEvent(context, 'template.repaired', {
      niche: lease.niche,
      legacySlug: lease.legacySlug,
      artifactHash: artifact.treeHash,
      files: vended.files.size,
      assets: allAssets.length,
      neutralFallback: usedNeutralFallback,
      cloudRepair: usedCloudRepair,
      cloudRepairAttempts,
    });
    return usedNeutralFallback ? 'neutral_fallback' : 'repaired';
  } catch (error) {
    if (context.signal?.aborted) {
      // Leave the lease intact. The command-level cancellation transaction is
      // the single authority that restores every in-flight template to its
      // safe checkpoint and refunds this interrupted attempt. Treating an
      // abort as a third ordinary failure would permanently quarantine work
      // that was never allowed to finish.
      return 'cancelled';
    }
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    if (lease.attempts >= 3) {
      context.ledger.completeTemplateLease({
        templateId: lease.id,
        leaseToken: lease.leaseToken,
        stage: 'failed',
        terminalDisposition: 'failed',
      });
      context.ledger.addIssue({
        templateId: lease.id,
        runId: context.runId,
        code: 'repair_exception_exhausted',
        severity: 'critical',
        message: detail,
        fingerprint: digest(`repair_exception_exhausted\0${detail.replace(/\d+/g, '#')}`),
      });
    } else {
      context.ledger.failTemplateLease(lease.id, lease.leaseToken, 'repair_pending', detail);
    }
    await logEvent(context, 'template.repair_error', {
      niche: lease.niche,
      legacySlug: lease.legacySlug,
      error: error instanceof Error ? error.message : String(error),
    });
    return 'failed';
  }
}

async function repairTemplates(
  context: LegacyCommandContext,
  inventory: CatalogInventory,
  allowedSlugs?: readonly string[],
): Promise<RepairSummary> {
  checkCancellation(context);
  const vendor = new AssetVendor(join(context.config.workRoot, 'asset-cache'));
  await vendor.initialize();
  const foundationRegistry = inventory.templates.some((template) => Boolean(template.foundation))
    ? await loadFoundationRegistry(FOUNDATIONS_ROOT)
    : undefined;
  checkCancellation(context);
  const allowed = allowedSlugs ? [...new Set(allowedSlugs)] : undefined;
  const homepageDonors = new Map<string, HomepageDonor>();
  for (const target of inventory.templates
    .filter((template) => (!allowed || allowed.includes(template.slug)) && !template.pages.some((page) => page.name === 'index.html'))
    .sort((left, right) => left.slug.localeCompare(right.slug))) {
    checkCancellation(context);
    const selection = selectNearestHomepageDonor(target, inventory.templates);
    if (selection) homepageDonors.set(target.slug, await loadHomepageDonor(selection));
  }
  let repaired = 0;
  let neutralFallbacks = 0;
  const ownerPrefix = `${process.pid}-${context.runId}`;

  await Promise.all(Array.from({ length: context.config.staticWorkers }, async (_, workerIndex) => {
    while (!context.signal?.aborted) {
      const leases = context.ledger.leaseTemplates({
        stages: ['discovered', 'inventoried', 'repair_pending'],
        ...(allowed ? { legacySlugs: allowed } : {}),
        claimedStage: 'repairing',
        owner: `${ownerPrefix}-static-${workerIndex}`,
        limit: 1,
        leaseMs: 15 * 60_000,
        maxAttempts: 3,
        runId: context.runId,
      });
      const lease = leases[0];
      if (!lease) break;
      const result = await repairOne(
        context,
        lease,
        vendor,
        homepageDonors.get(lease.legacySlug),
        foundationRegistry,
      );
      if (result === 'repaired' || result === 'neutral_fallback') repaired += 1;
      if (result === 'neutral_fallback') neutralFallbacks += 1;
      if (repaired % 25 === 0) context.ledger.heartbeatRun(context.runId);
    }
  }));
  checkCancellation(context);

  const requested = allowed?.length ?? context.ledger.listTemplates().length;
  const selected = context.ledger.listTemplates()
    .filter((template) => !allowed || allowed.includes(template.legacySlug));
  const staticFailed = selected.filter((template) => template.stage === 'failed').length;
  return {
    requested,
    repaired,
    staticFailed,
    neutralFallbacks,
    skipped: Math.max(0, requested - repaired - staticFailed),
  };
}

function renderCounts(evidence: RenderEvidence[]): Pick<RenderSummary, 'criticalDefects' | 'seriousDefects'> {
  return {
    criticalDefects: evidence.reduce((sum, item) => sum + item.issues.filter((issue) => issue.severity === 'critical').length, 0),
    seriousDefects: evidence.reduce((sum, item) => sum + item.issues.filter((issue) => issue.severity === 'serious').length, 0),
  };
}

function parseOverflow(evidence: RenderEvidence): number | null {
  const issue = evidence.issues.find((candidate) => candidate.code === 'horizontal_overflow');
  const value = issue?.detail.match(/^(\d+(?:\.\d+)?)px/)?.[1];
  return value ? Number(value) : null;
}

function recordRenderEvidence(
  context: LegacyCommandContext,
  target: { templateId: number; pageId: number; artifactHash: string },
  evidence: RenderEvidence,
): void {
  context.ledger.upsertRender({
    templateId: target.templateId,
    pageId: target.pageId,
    runId: context.runId,
    artifactHash: target.artifactHash,
    ruleVersion: context.config.ruleVersion,
    viewport: evidence.viewport,
    width: LEGACY_VIEWPORTS[evidence.viewport].width,
    height: LEGACY_VIEWPORTS[evidence.viewport].height,
    status: evidence.passed ? 'passed' : 'failed',
    screenshotHash: evidence.screenshotSha256,
    perceptualHash: evidence.perceptualHash,
    consoleErrors: evidence.issues.filter((issue) => issue.code === 'console_error' || issue.code === 'page_exception').length,
    failedRequests: evidence.issues.filter((issue) => issue.code === 'failed_request' || issue.code === 'broken_images').length,
    axeCritical: evidence.issues.filter((issue) => issue.code.startsWith('axe_') && issue.severity === 'critical').length,
    axeSerious: evidence.issues.filter((issue) => issue.code.startsWith('axe_') && issue.severity === 'serious').length,
    horizontalOverflowPx: parseOverflow(evidence),
    artifactPath: evidence.failureScreenshotPath ?? evidence.thumbnailPath,
    error: evidence.passed ? null : evidence.issues.map((issue) => `${issue.code}: ${issue.detail}`).join('; '),
  });
}

export function hasCompletePassingRenderMatrix(
  evidence: readonly Pick<RenderEvidence, 'page' | 'viewport' | 'passed'>[],
  expectedPages: readonly string[],
): boolean {
  const pages = [...new Set(expectedPages)];
  if (pages.length === 0 || pages.length !== expectedPages.length) return false;
  const expected = new Set(pages.flatMap((page) =>
    (Object.keys(LEGACY_VIEWPORTS) as Array<keyof typeof LEGACY_VIEWPORTS>)
      .map((viewport) => `${page}\0${viewport}`)));
  if (evidence.length !== expected.size) return false;
  for (const item of evidence) {
    const key = `${item.page}\0${item.viewport}`;
    if (!item.passed || !expected.delete(key)) return false;
  }
  return expected.size === 0;
}

export interface FinalPageEvidenceMatrixIssue {
  code: 'manifest_page_matrix' | 'ledger_page_matrix' | 'render_page_matrix' | 'receipt_page_matrix';
  detail: string;
  recoveryStage: 'repair_pending' | 'render_pending';
}

/**
 * Reconcile the four independently persisted descriptions of a template's
 * page QA. A passing status alone is insufficient: the emitted manifest,
 * current static ledger rows, current artifact-scoped renders, and signed
 * receipt must describe the exact same page x viewport matrix.
 */
export function validateFinalPageEvidenceMatrix(input: {
  manifestPages: unknown;
  ledgerPages: readonly Pick<LegacyPageRecord, 'id' | 'relativePath' | 'stage'>[];
  renders: readonly Pick<LegacyRenderRecord,
    'pageId' | 'viewport' | 'width' | 'height' | 'status' | 'screenshotHash' | 'perceptualHash'
    | 'consoleErrors' | 'failedRequests' | 'axeCritical' | 'axeSerious' | 'horizontalOverflowPx'>[];
  receiptPages: unknown;
}): FinalPageEvidenceMatrixIssue[] {
  const issues: FinalPageEvidenceMatrixIssue[] = [];
  const add = (
    code: FinalPageEvidenceMatrixIssue['code'],
    detail: string,
    recoveryStage: FinalPageEvidenceMatrixIssue['recoveryStage'],
  ): void => { issues.push({ code, detail, recoveryStage }); };

  if (!Array.isArray(input.manifestPages) || input.manifestPages.length === 0) {
    add('manifest_page_matrix', 'emitted template manifest has no page list', 'repair_pending');
    return issues;
  }
  const manifestPages: string[] = [];
  for (const value of input.manifestPages) {
    if (typeof value !== 'string') {
      add('manifest_page_matrix', 'emitted template manifest contains a non-string page', 'repair_pending');
      continue;
    }
    try {
      const page = normalizeRelativePath(value);
      if (!/\.html?$/i.test(page)) {
        add('manifest_page_matrix', `emitted template manifest declares a non-HTML page: ${page}`, 'repair_pending');
      } else {
        manifestPages.push(page);
      }
    } catch (error) {
      add(
        'manifest_page_matrix',
        `emitted template manifest has an unsafe page: ${error instanceof Error ? error.message : String(error)}`,
        'repair_pending',
      );
    }
  }
  const manifestSet = new Set(manifestPages);
  if (manifestSet.size !== manifestPages.length) {
    add('manifest_page_matrix', 'emitted template manifest repeats a page', 'repair_pending');
  }
  if (issues.some((issue) => issue.code === 'manifest_page_matrix')) return issues;

  const staticPages = input.ledgerPages.filter((page) => page.stage === 'static-passed');
  const ledgerByPath = new Map<string, Pick<LegacyPageRecord, 'id' | 'relativePath' | 'stage'>>();
  for (const page of staticPages) {
    const normalized = (() => {
      try { return normalizeRelativePath(page.relativePath); } catch { return page.relativePath; }
    })();
    if (ledgerByPath.has(normalized)) {
      add('ledger_page_matrix', `current static ledger repeats ${normalized}`, 'repair_pending');
    }
    ledgerByPath.set(normalized, page);
  }
  const missingLedgerPages = manifestPages.filter((page) => !ledgerByPath.has(page));
  const extraLedgerPages = [...ledgerByPath.keys()].filter((page) => !manifestSet.has(page));
  if (missingLedgerPages.length > 0 || extraLedgerPages.length > 0) {
    add(
      'ledger_page_matrix',
      `emitted/static page sets differ (missing=${missingLedgerPages.join(',') || 'none'}; extra=${extraLedgerPages.join(',') || 'none'})`,
      'repair_pending',
    );
  }
  if (issues.some((issue) => issue.code === 'ledger_page_matrix')) return issues;

  const pageById = new Map([...ledgerByPath.entries()].map(([page, record]) => [record.id, page]));
  const viewports = Object.keys(LEGACY_VIEWPORTS) as Array<keyof typeof LEGACY_VIEWPORTS>;
  const expectedKeys = new Set(manifestPages.flatMap((page) => viewports.map((viewport) => `${page}\0${viewport}`)));
  const renderByKey = new Map<string, (typeof input.renders)[number]>();
  for (const render of input.renders) {
    const page = pageById.get(render.pageId);
    const viewport = viewports.find((candidate) => candidate === render.viewport);
    if (!page || !viewport) {
      add('render_page_matrix', `current render contains an unexpected page/viewport (${render.pageId}/${render.viewport})`, 'render_pending');
      continue;
    }
    const key = `${page}\0${viewport}`;
    if (renderByKey.has(key)) {
      add('render_page_matrix', `current render matrix repeats ${page}/${viewport}`, 'render_pending');
      continue;
    }
    renderByKey.set(key, render);
    const expectedViewport = LEGACY_VIEWPORTS[viewport];
    if (
      render.width !== expectedViewport.width
      || render.height !== expectedViewport.height
      || render.status !== 'passed'
      || render.consoleErrors !== 0
      || render.failedRequests !== 0
      || render.axeCritical !== 0
      || render.axeSerious !== 0
      || (render.horizontalOverflowPx ?? 0) > 1
      || !render.screenshotHash
      || !render.perceptualHash
    ) {
      add('render_page_matrix', `current render is not passing for ${page}/${viewport}`, 'render_pending');
    }
  }
  for (const key of expectedKeys) {
    if (!renderByKey.has(key)) {
      const [page, viewport] = key.split('\0');
      add('render_page_matrix', `current render matrix is missing ${page}/${viewport}`, 'render_pending');
    }
  }
  if (renderByKey.size !== expectedKeys.size) {
    add(
      'render_page_matrix',
      `current render matrix has ${renderByKey.size}/${expectedKeys.size} unique expected entries`,
      'render_pending',
    );
  }

  if (!Array.isArray(input.receiptPages)) {
    add('receipt_page_matrix', 'final quality receipt has no page evidence array', 'render_pending');
    return issues;
  }
  const receiptKeys = new Set<string>();
  for (const value of input.receiptPages) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      add('receipt_page_matrix', 'final quality receipt contains malformed page evidence', 'render_pending');
      continue;
    }
    const evidence = value as Record<string, unknown>;
    if (typeof evidence.page !== 'string' || typeof evidence.viewport !== 'string') {
      add('receipt_page_matrix', 'final quality receipt contains unaddressable page evidence', 'render_pending');
      continue;
    }
    let page: string;
    try { page = normalizeRelativePath(evidence.page); } catch {
      add('receipt_page_matrix', `final quality receipt contains an unsafe page: ${String(evidence.page)}`, 'render_pending');
      continue;
    }
    const key = `${page}\0${evidence.viewport}`;
    if (!expectedKeys.has(key)) {
      add('receipt_page_matrix', `final quality receipt has unexpected evidence for ${page}/${evidence.viewport}`, 'render_pending');
      continue;
    }
    if (receiptKeys.has(key)) {
      add('receipt_page_matrix', `final quality receipt repeats ${page}/${evidence.viewport}`, 'render_pending');
      continue;
    }
    receiptKeys.add(key);
    const render = renderByKey.get(key);
    if (
      evidence.passed !== true
      || !render
      || evidence.screenshotSha256 !== render.screenshotHash
      || evidence.perceptualHash !== render.perceptualHash
      || !Array.isArray(evidence.issues)
      || evidence.issues.length !== 0
    ) {
      add('receipt_page_matrix', `final quality receipt does not match current render evidence for ${page}/${evidence.viewport}`, 'render_pending');
    }
  }
  for (const key of expectedKeys) {
    if (!receiptKeys.has(key)) {
      const [page, viewport] = key.split('\0');
      add('receipt_page_matrix', `final quality receipt is missing ${page}/${viewport}`, 'render_pending');
    }
  }
  if (receiptKeys.size !== expectedKeys.size) {
    add(
      'receipt_page_matrix',
      `final quality receipt has ${receiptKeys.size}/${expectedKeys.size} unique expected entries`,
      'render_pending',
    );
  }
  return issues;
}

async function writeFinalReceipt(
  context: LegacyCommandContext,
  template: LeasedTemplate,
  evidence: readonly RenderEvidence[],
): Promise<{ id: string; path: string }> {
  const counts = renderCounts([...evidence]);
  const artifact = artifactForTemplate(context, template);
  if (!artifact) throw new Error(`Candidate artifact is missing while writing receipt for ${template.legacySlug}`);
  const rehabilitationPath = resolve(context.config.workRoot, artifact.relativePath, '.dailyclarity', 'rehabilitation.json');
  if (!isWithin(context.config.workRoot, rehabilitationPath)) throw new Error(`Rehabilitation metadata escaped the work root for ${template.legacySlug}`);
  const rehabilitation = JSON.parse(await readFile(rehabilitationPath, 'utf8')) as {
    repairMode?: unknown;
    renderRemediation?: unknown;
    sourcePreserved?: unknown;
  };
  const bodyWithoutId = {
    version: 1,
    legacySlug: template.legacySlug,
    niche: template.niche,
    sourceHash: template.sourceHash,
    artifactHash: template.resultHash,
    ruleVersion: context.config.ruleVersion,
    repairMode: rehabilitation.repairMode,
    renderRemediation: rehabilitation.renderRemediation ?? null,
    sourcePreserved: rehabilitation.sourcePreserved === true,
    generatedAt: new Date().toISOString(),
    checks: {
      static: 'passed',
      desktop: evidence.filter((item) => item.viewport === 'desktop').every((item) => item.passed) ? 'passed' : 'failed',
      mobile: evidence.filter((item) => item.viewport === 'mobile').every((item) => item.passed) ? 'passed' : 'failed',
      criticalDefects: counts.criticalDefects,
      seriousDefects: counts.seriousDefects,
    },
    pages: evidence.map((item) => ({
      page: item.page,
      viewport: item.viewport,
      passed: item.passed,
      screenshotSha256: item.screenshotSha256,
      perceptualHash: item.perceptualHash,
      editSlots: item.editSlotCount,
      imageSlots: item.imageSlotCount,
      issues: item.issues,
    })),
  };
  const id = `receipt_${sha256(stableStringify(bodyWithoutId)).slice(0, 24)}`;
  const path = join(context.config.artifactRoot, 'receipts', template.niche, template.legacySlug, `${id}.json`);
  await atomicWriteFile(context.config, path, `${JSON.stringify({ id, ...bodyWithoutId }, null, 2)}\n`);
  return { id, path };
}

async function readArtifactFiles(root: string): Promise<Map<string, string | Uint8Array>> {
  const files = new Map<string, string | Uint8Array>();
  const pending = [''];
  while (pending.length > 0) {
    const currentRelative = pending.pop()!;
    const current = resolve(root, currentRelative);
    if (!isWithin(root, current)) throw new Error(`Artifact read escaped its root: ${current}`);
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = normalizeRelativePath(posix.join(currentRelative.replace(/\\/g, '/'), entry.name));
      const child = resolve(root, ...relativePath.split('/'));
      if (!isWithin(root, child)) throw new Error(`Artifact entry escaped its root: ${relativePath}`);
      const details = await lstat(child);
      if (details.isSymbolicLink()) throw new Error(`Artifact contains a symbolic link: ${relativePath}`);
      if (details.isDirectory()) {
        pending.push(relativePath);
      } else if (
        details.isFile()
        && relativePath !== '.dailyclarity/artifact-tree.json'
        && relativePath !== '.dailyclarity/final-quality-receipt.json'
      ) {
        const bytes = await readFile(child);
        files.set(relativePath, TEXT_EXTENSIONS.has(extname(relativePath).toLowerCase()) ? bytes.toString('utf8') : bytes);
      }
    }
  }
  return files;
}

function contrastRules(repairs: readonly ContrastRepair[]): string {
  const unique = [...new Map(repairs.map((repair) => [
    `${repair.selector}\0${repair.foreground}\0${(repair.opacitySelectors ?? []).join('\0')}`,
    repair,
  ])).values()];
  const opacityRules = [...new Set(unique.flatMap((repair) => repair.opacitySelectors ?? []))]
    .map((selector) => `${selector}{opacity:1!important}`)
    .join('');
  const foregroundRules = unique
    .map((repair) => `${repair.selector}{color:${repair.foreground}!important;text-shadow:none!important}`)
    .join('');
  return `${opacityRules}${foregroundRules}`;
}

function linkInTextBlockRules(repairs: readonly LinkInTextBlockRepair[]): string {
  return [...new Set(repairs.map((repair) => repair.selector))]
    .map((selector) => `${selector}{text-decoration-line:underline!important;text-decoration-style:solid!important;text-decoration-thickness:.1em!important;text-underline-offset:.15em!important}`)
    .join('');
}

function viewportAccessibilityRules(evidence: readonly RenderEvidence[]): string {
  return `${contrastRules(evidence.flatMap((item) => item.contrastRepairs ?? []))}${linkInTextBlockRules(evidence.flatMap((item) => item.linkInTextBlockRepairs ?? []))}`;
}

export function addAccessibilityOverrides(html: string, evidence: readonly RenderEvidence[]): string {
  const desktop = viewportAccessibilityRules(evidence.filter((item) => item.viewport === 'desktop'));
  const mobile = viewportAccessibilityRules(evidence.filter((item) => item.viewport === 'mobile'));
  if (!desktop && !mobile) return html;
  // Keep the media close on its own line. Adjacent `}}` is valid minified CSS,
  // but it is also the delimiter for an unmatched template expression at the
  // publication boundary. The newline preserves strict token validation while
  // making generated accessibility CSS unambiguous.
  const css = `${desktop ? `@media(min-width:601px){${desktop}\n}` : ''}${mobile ? `@media(max-width:600px){${mobile}\n}` : ''}`;
  const priorCss: string[] = [];
  const withoutPriorBlocks = html.replace(
    /<style\b(?=[^>]*\bid\s*=\s*(["'])dc-a11y-contrast-overrides\1)[^>]*>([\s\S]*?)<\/style\s*>/gi,
    (_match, _quote: string, contents: string) => {
      priorCss.push(contents);
      return '';
    },
  );
  const style = `<style id="dc-a11y-contrast-overrides">${priorCss.join('\n')}${css}</style>`;
  return /<\/head\s*>/i.test(withoutPriorBlocks)
    ? withoutPriorBlocks.replace(/<\/head\s*>/i, `${style}</head>`)
    : `${style}${withoutPriorBlocks}`;
}

/** @deprecated Use addAccessibilityOverrides for both supported browser repairs. */
export const addContrastOverrides = addAccessibilityOverrides;

async function rematerializeRenderFallback(
  context: LegacyCommandContext,
  template: LeasedTemplate,
  evidence: readonly RenderEvidence[],
  mode: 'accessibility' | 'neutral',
): Promise<boolean> {
  const sourceBefore = await inventoryLegacyTemplate(context.config.sourceRoot, template.niche as never, template.legacySlug);
  if (sourceBefore.sourceTreeHash !== template.sourceHash) throw new Error(`Source changed during render remediation: ${template.legacySlug}`);

  let inputFiles: Map<string, string | Uint8Array>;
  if (mode === 'neutral') {
    inputFiles = createNeutralFallbackFiles({
      slug: template.legacySlug,
      niche: template.niche,
      pages: sourceBefore.pages.map((page) => page.name),
      reason: evidence.flatMap((item) => item.issues.map((issue) => `${item.page}/${item.viewport}/${issue.code}: ${issue.detail}`)).join('; '),
    });
  } else {
    const artifact = artifactForTemplate(context, template);
    if (!artifact) return false;
    const directory = resolve(context.config.workRoot, artifact.relativePath);
    if (!isWithin(context.config.workRoot, directory)) throw new Error(`Render remediation artifact escaped the work root: ${artifact.relativePath}`);
    inputFiles = await readArtifactFiles(directory);
    const evidenceByPage = new Map<string, RenderEvidence[]>();
    for (const item of evidence) {
      const values = evidenceByPage.get(item.page) ?? [];
      values.push(item);
      evidenceByPage.set(item.page, values);
    }
    for (const [page, values] of evidenceByPage) {
      const html = inputFiles.get(page);
      if (typeof html !== 'string') continue;
      const updated = addAccessibilityOverrides(html, values);
      if (updated !== html) {
        inputFiles.set(page, updated);
      }
    }
    // Some browser failures (invalid accessible names, aria-hidden focus, and
    // fragment-only image sources) are repaired by the deterministic HTML pass
    // rather than by an injected style. Re-run composition even when there was
    // no viewport CSS to add; the content-addressed artifact comparison keeps
    // this restart-safe and the bounded caller prevents infinite retries.
  }

  const repaired = repairLegacyTemplate({
    slug: template.legacySlug,
    niche: template.niche,
    files: inputFiles,
    ruleVersion: context.config.ruleVersion,
  });
  const priorRehabilitation = (() => {
    const raw = inputFiles.get('.dailyclarity/rehabilitation.json');
    if (typeof raw !== 'string') return {};
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  })();
  repaired.files.set('.dailyclarity/rehabilitation.json', `${JSON.stringify({
    ...priorRehabilitation,
    version: 1,
    ruleVersion: context.config.ruleVersion,
    sourceHash: template.sourceHash,
    repairMode: mode === 'neutral' ? 'neutral_fallback' : priorRehabilitation.repairMode ?? 'primary',
    renderRemediation: mode,
    sourcePreserved: true,
  }, null, 2)}\n`);
  repaired.files.set('.dailyclarity/assets.json', repaired.files.get('.dailyclarity/assets.json') ?? assetLicenseManifest([]));
  const verification = verifyStaticArtifact(repaired.files, repaired.fields);
  if (!verification.passed) return false;
  const artifact = await materializeArtifact(context, template, repaired.files);
  for (const transformation of repaired.transformations) {
    context.ledger.addTransformation({
      templateId: template.id,
      runId: context.runId,
      ruleCode: transformation.rule,
      ruleVersion: context.config.ruleVersion,
      details: { file: transformation.file, count: transformation.count, detail: transformation.detail },
    });
  }
  context.ledger.addTransformation({
    templateId: template.id,
    runId: context.runId,
    ruleCode: mode === 'accessibility' ? 'apply-rendered-accessibility-repair' : 'apply-rendered-neutral-fallback',
    ruleVersion: context.config.ruleVersion,
    beforeHash: template.resultHash,
    afterHash: artifact.treeHash,
    details: { sourcePreserved: true, failedRenders: evidence.filter((item) => !item.passed).length },
  });
  context.ledger.addIssue({
    templateId: template.id,
    runId: context.runId,
    code: mode === 'accessibility' ? 'render_accessibility_remediated' : 'render_neutral_fallback',
    severity: 'warning',
    message: mode === 'accessibility'
      ? 'Browser-detected contrast and link-distinction failures were corrected with page- and viewport-scoped audited styles.'
      : 'Browser QA required the vetted niche-neutral fallback; the immutable original remains archived.',
    fingerprint: digest(`${mode}\0${template.niche}`),
    details: { artifactHash: artifact.treeHash },
    resolved: true,
  });
  for (const [page, html] of [...repaired.files.entries()].filter(([path, value]) => /\.html?$/i.test(path) && typeof value === 'string')) {
    const prior = context.ledger.listPages(template.id).find((candidate) => candidate.relativePath === page);
    context.ledger.upsertPage({
      templateId: template.id,
      relativePath: page,
      role: repaired.manifest.pageRoles[page] ?? prior?.role ?? 'other',
      sourceHash: prior?.sourceHash ?? digest('generated'),
      resultHash: digest(html),
      stage: 'static-passed',
    });
  }
  const sourceAfter = await inventoryLegacyTemplate(context.config.sourceRoot, template.niche as never, template.legacySlug);
  if (sourceAfter.sourceTreeHash !== sourceBefore.sourceTreeHash) throw new Error(`Immutable source changed during render remediation: ${template.legacySlug}`);
  const completed = context.ledger.completeTemplateLease({
    templateId: template.id,
    leaseToken: template.leaseToken,
    stage: 'render_pending',
    resultHash: artifact.treeHash,
    qualityReceipt: repaired.qualityReceipt.id,
  });
  if (!completed) throw new Error(`Render remediation lease expired for ${template.legacySlug}`);
  await logEvent(context, `template.render_${mode}_remediated`, {
    niche: template.niche,
    legacySlug: template.legacySlug,
    artifactHash: artifact.treeHash,
  });
  return true;
}

async function renderPendingBatch(
  context: LegacyCommandContext,
  allowedSlugs?: readonly string[],
  remediationDepth = 0,
): Promise<RenderSummary & { leasedTemplates: number }> {
  checkCancellation(context);
  const allowed = allowedSlugs ? [...new Set(allowedSlugs)] : undefined;
  const batchSize = Math.max(1, context.config.chromiumWorkers * 8);
  const leases = context.ledger.leaseTemplates({
    stages: ['render_pending'],
    ...(allowed ? { legacySlugs: allowed } : {}),
    claimedStage: 'rendering',
    owner: `${process.pid}-${context.runId}-render`,
    limit: Math.min(allowed?.length ?? batchSize, batchSize),
    leaseMs: 24 * 60 * 60_000,
    maxAttempts: 3,
    runId: context.runId,
  });
  if (leases.length === 0) {
    return {
      leasedTemplates: 0,
      templates: 0,
      passedTemplates: 0,
      failedTemplates: 0,
      renders: 0,
      criticalDefects: 0,
      seriousDefects: 0,
      neutralFallbacks: 0,
    };
  }
  const pageLookup = new Map<string, { template: LeasedTemplate; pageId: number; artifactHash: string }>();
  const expectedPagesByTemplate = new Map<number, string[]>();
  const tasks: RenderTask[] = [];
  let renderedEvidenceCount = 0;
  for (const template of leases) {
    const artifact = artifactForTemplate(context, template);
    if (!artifact) {
      continue;
    }
    const templateDir = resolve(context.config.workRoot, artifact.relativePath);
    if (!isWithin(context.config.workRoot, templateDir)) throw new Error(`Artifact escaped work root: ${artifact.relativePath}`);
    const manifest = JSON.parse(await readFile(join(templateDir, 'template.json'), 'utf8')) as { pages?: unknown };
    const pages = Array.isArray(manifest.pages)
      ? manifest.pages.filter((page): page is string => typeof page === 'string')
      : [];
    expectedPagesByTemplate.set(template.id, pages);
    const records = new Map(context.ledger.listPages(template.id).map((page) => [page.relativePath, page]));
    for (const page of pages) {
      const pageRecord = records.get(page);
      if (!pageRecord) throw new Error(`Ledger page is missing for ${template.legacySlug}/${page}`);
      const key = `${template.id}\0${page}`;
      pageLookup.set(key, { template, pageId: pageRecord.id, artifactHash: artifact.contentHash });
      tasks.push({ key: String(template.id), niche: template.niche, slug: template.legacySlug, page, templateDir });
    }
  }

  const evidence = await renderTemplateTasks(context.config.artifactRoot, tasks, {
    evidenceRoot: context.config.renderRoot,
    workers: context.config.chromiumWorkers,
    retries: 3,
    recycleEvery: 1_000,
    signal: context.signal,
    onEvidence: (item) => {
      const lookup = pageLookup.get(`${item.key}\0${item.page}`);
      if (!lookup) throw new Error(`Render evidence has no ledger page: ${item.key}/${item.page}`);
      recordRenderEvidence(context, {
        templateId: lookup.template.id,
        pageId: lookup.pageId,
        artifactHash: lookup.artifactHash,
      }, item);
      renderedEvidenceCount += 1;
      if (renderedEvidenceCount % 25 === 0) context.ledger.heartbeatRun(context.runId);
    },
  });
  checkCancellation(context);

  const evidenceByTemplate = new Map<number, RenderEvidence[]>();
  for (const item of evidence) {
    const templateId = Number(item.key);
    const values = evidenceByTemplate.get(templateId) ?? [];
    values.push(item);
    evidenceByTemplate.set(templateId, values);
  }
  let passedTemplates = 0;
  let failedTemplates = 0;
  const terminalEvidence: RenderEvidence[] = [];
  const remediatedSlugs: string[] = [];
  let neutralFallbacks = 0;
  for (const template of leases) {
    const values = evidenceByTemplate.get(template.id) ?? [];
    const expectedPages = expectedPagesByTemplate.get(template.id) ?? [];
    const repairedPages = context.ledger.listPages(template.id)
      .filter((page) => page.stage === 'static-passed')
      .map((page) => page.relativePath);
    const passed = sameStringSet(repairedPages, expectedPages)
      && hasCompletePassingRenderMatrix(values, expectedPages);

    if (!passed && remediationDepth < 5) {
      const failedIssues = values.filter((item) => !item.passed).flatMap((item) => item.issues);
      const deterministicPrimaryIssue = (code: string): boolean => code === 'axe_color-contrast'
        || code === 'axe_link-in-text-block'
        || code === 'axe_aria-command-name'
        || code === 'axe_aria-toggle-field-name'
        || code === 'axe_link-name'
        || code === 'axe_button-name'
        || code === 'axe_aria-hidden-focus'
        || code === 'broken_images'
        || code === 'horizontal_overflow';
      const onlyDeterministicPrimaryIssues = failedIssues.length > 0
        && failedIssues.every((issue) => deterministicPrimaryIssue(issue.code));
      let remediated = false;
      // Multiple bounded passes cover state that can change after ancestor
      // opacity correction and allow static semantic/image repairs discovered
      // only in a hydrated browser. The fifth and final remediation remains the
      // audited neutral fallback for genuinely irreparable pages.
      if (remediationDepth < 4 && onlyDeterministicPrimaryIssues) {
        remediated = await rematerializeRenderFallback(context, template, values, 'accessibility');
      }
      if (!remediated) {
        remediated = await rematerializeRenderFallback(context, template, values, 'neutral');
        if (remediated) neutralFallbacks += 1;
      }
      if (remediated) {
        remediatedSlugs.push(template.legacySlug);
        continue;
      }
    }

    terminalEvidence.push(...values);
    const receipt = await writeFinalReceipt(context, template, values);
    context.ledger.addArtifact({
      runId: context.runId,
      templateId: template.id,
      kind: 'quality-receipt',
      contentHash: receipt.id.replace(/^receipt_/, ''),
      relativePath: relative(context.config.workRoot, receipt.path),
      byteSize: (await stat(receipt.path)).size,
      metadata: { passed },
    });
    if (passed) {
      passedTemplates += 1;
      const completed = context.ledger.completeTemplateLease({
        templateId: template.id,
        leaseToken: template.leaseToken,
        stage: 'verified',
        qualityReceipt: receipt.id,
        resolveIssues: true,
      });
      if (!completed) throw new Error(`Render lease expired for ${template.legacySlug}`);
    } else {
      failedTemplates += 1;
      const completed = context.ledger.completeTemplateLease({
        templateId: template.id,
        leaseToken: template.leaseToken,
        stage: 'failed',
        terminalDisposition: 'quarantined',
        qualityReceipt: receipt.id,
      });
      if (!completed) throw new Error(`Render lease expired for ${template.legacySlug}`);
    }
    await logEvent(context, passed ? 'template.verified' : 'template.render_failed', {
      niche: template.niche,
      legacySlug: template.legacySlug,
      renders: values.length,
      criticalDefects: renderCounts(values).criticalDefects,
      seriousDefects: renderCounts(values).seriousDefects,
      receipt: receipt.id,
    });
  }
  const retried = remediatedSlugs.length > 0
    ? await renderPendingTemplates(context, remediatedSlugs, remediationDepth + 1)
    : {
      templates: 0,
      passedTemplates: 0,
      failedTemplates: 0,
      renders: 0,
      criticalDefects: 0,
      seriousDefects: 0,
      neutralFallbacks: 0,
    };
  const counts = renderCounts(terminalEvidence);
  return {
    leasedTemplates: leases.length,
    templates: leases.length,
    passedTemplates: passedTemplates + retried.passedTemplates,
    failedTemplates: failedTemplates + retried.failedTemplates,
    renders: evidence.length + retried.renders,
    criticalDefects: counts.criticalDefects + retried.criticalDefects,
    seriousDefects: counts.seriousDefects + retried.seriousDefects,
    neutralFallbacks: neutralFallbacks + retried.neutralFallbacks,
  };
}

async function renderPendingTemplates(
  context: LegacyCommandContext,
  allowedSlugs?: readonly string[],
  remediationDepth = 0,
): Promise<RenderSummary> {
  const aggregate: RenderSummary = {
    templates: 0,
    passedTemplates: 0,
    failedTemplates: 0,
    renders: 0,
    criticalDefects: 0,
    seriousDefects: 0,
    neutralFallbacks: 0,
  };
  while (true) {
    checkCancellation(context);
    const batch = await renderPendingBatch(context, allowedSlugs, remediationDepth);
    if (batch.leasedTemplates === 0) break;
    aggregate.templates += batch.templates;
    aggregate.passedTemplates += batch.passedTemplates;
    aggregate.failedTemplates += batch.failedTemplates;
    aggregate.renders += batch.renders;
    aggregate.criticalDefects += batch.criticalDefects;
    aggregate.seriousDefects += batch.seriousDefects;
    aggregate.neutralFallbacks += batch.neutralFallbacks;
  }
  return aggregate;
}

async function readRepairSidecar<T>(
  context: LegacyCommandContext,
  template: LegacyTemplateRecord,
  name: string,
): Promise<T> {
  const artifact = artifactForTemplate(context, template);
  if (!artifact) throw new Error(`Candidate artifact is missing for ${template.legacySlug}`);
  const path = resolve(context.config.workRoot, artifact.relativePath, '.dailyclarity', name);
  if (!isWithin(context.config.workRoot, path)) throw new Error(`Sidecar escaped work root for ${template.legacySlug}`);
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function aliasPairKey(first: string, second: string): string {
  return first < second ? `${first}\0${second}` : `${second}\0${first}`;
}

function designMarkup(candidate: DedupeCandidate): string {
  return Object.entries(candidate.design.pages)
    .sort(([left], [right]) => {
      const leftRole = candidate.design.pageRoles[left] ?? 'other';
      const rightRole = candidate.design.pageRoles[right] ?? 'other';
      return `${leftRole}:${left}`.localeCompare(`${rightRole}:${right}`);
    })
    .map(([page, html]) => `<section data-dc-page-role="${candidate.design.pageRoles[page] ?? 'other'}">${html}</section>`)
    .join('\n');
}

async function buildVisualAliasEvidence(
  context: LegacyCommandContext,
  candidates: readonly DedupeCandidate[],
  templates: readonly LegacyTemplateRecord[],
  excludedPairKeys: ReadonlySet<string> = new Set(),
): Promise<Map<string, VisualAliasEvidence>> {
  checkCancellation(context);
  const result = new Map<string, VisualAliasEvidence>();
  const templateBySlug = new Map(templates.map((template) => [template.legacySlug, template]));
  const renderMatrices = new Map<string, Map<string, Map<string, LegacyRenderRecord>>>();

  for (const candidate of candidates) {
    if (candidate.fingerprint.foundation) continue;
    const template = templateBySlug.get(candidate.fingerprint.legacySlug);
    if (!template) continue;
    const expectedPages = Object.keys(candidate.design.pages).sort();
    const pages = context.ledger.listPages(template.id)
      .filter((page) => page.stage === 'static-passed');
    if (
      pages.length !== expectedPages.length
      || !sameStringSet(pages.map((page) => page.relativePath), expectedPages)
    ) continue;
    const pageById = new Map(pages.map((page) => [page.id, page.relativePath]));
    const renders = context.ledger.listRenders(template.id)
      .filter((render) => render.status === 'passed');
    const matrix = new Map<string, Map<string, LegacyRenderRecord>>();
    for (const render of renders) {
      const page = pageById.get(render.pageId);
      if (!page) continue;
      const byViewport = matrix.get(page) ?? new Map<string, LegacyRenderRecord>();
      byViewport.set(render.viewport, render);
      matrix.set(page, byViewport);
    }
    if (!expectedPages.every((page) => {
      const byViewport = matrix.get(page);
      return byViewport?.has('desktop') && byViewport.has('mobile');
    })) continue;
    renderMatrices.set(candidate.fingerprint.legacySlug, matrix);
  }

  const groups = new Map<string, DedupeCandidate[]>();
  for (const candidate of candidates) {
    if (candidate.fingerprint.foundation) continue;
    const key = `${candidate.fingerprint.niche}\0${stableStringify(candidate.fingerprint.pageRoles)}`;
    const group = groups.get(key) ?? [];
    group.push(candidate);
    groups.set(key, group);
  }

  const comparisons: Array<readonly [DedupeCandidate, DedupeCandidate, number]> = [];
  for (const group of groups.values()) {
    for (let leftIndex = 0; leftIndex < group.length; leftIndex += 1) {
      const left = group[leftIndex]!;
      const leftMarkup = designMarkup(left);
      for (let rightIndex = leftIndex + 1; rightIndex < group.length; rightIndex += 1) {
        const right = group[rightIndex]!;
        if (excludedPairKeys.has(aliasPairKey(left.fingerprint.legacySlug, right.fingerprint.legacySlug))) continue;
        if (left.fingerprint.exactDesignHash === right.fingerprint.exactDesignHash) continue;
        const similarity = domSimilarity(leftMarkup, designMarkup(right));
        if (similarity >= 0.98) comparisons.push([left, right, similarity]);
      }
    }
  }

  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, comparisons.length) }, async () => {
    while (cursor < comparisons.length && !context.signal?.aborted) {
      const comparison = comparisons[cursor];
      cursor += 1;
      if (!comparison) break;
      const [left, right, similarity] = comparison;
      const leftRenders = renderMatrices.get(left.fingerprint.legacySlug);
      const rightRenders = renderMatrices.get(right.fingerprint.legacySlug);
      const comparedPages = Object.keys(left.design.pages).sort();
      if (!leftRenders || !rightRenders || !sameStringSet(comparedPages, Object.keys(right.design.pages))) continue;
      const pageEvidence = await Promise.all(comparedPages.map(async (page) => {
        const leftDesktop = leftRenders.get(page)?.get('desktop');
        const rightDesktop = rightRenders.get(page)?.get('desktop');
        const leftMobile = leftRenders.get(page)?.get('mobile');
        const rightMobile = rightRenders.get(page)?.get('mobile');
        if (
          !leftDesktop?.perceptualHash || !rightDesktop?.perceptualHash
          || !leftMobile?.perceptualHash || !rightMobile?.perceptualHash
          || !leftDesktop.artifactPath || !rightDesktop.artifactPath
          || !leftMobile.artifactPath || !rightMobile.artifactPath
        ) return null;
        const desktopPerceptualHashDistance = hammingDistance(leftDesktop.perceptualHash, rightDesktop.perceptualHash);
        const mobilePerceptualHashDistance = hammingDistance(leftMobile.perceptualHash, rightMobile.perceptualHash);
        const [desktopSsim, mobileSsim] = desktopPerceptualHashDistance <= 4 && mobilePerceptualHashDistance <= 4
          ? await Promise.all([
            thumbnailSsim(leftDesktop.artifactPath, rightDesktop.artifactPath),
            thumbnailSsim(leftMobile.artifactPath, rightMobile.artifactPath),
          ])
          : [0, 0];
        return {
          page,
          desktopSsim,
          mobileSsim,
          desktopPerceptualHashDistance,
          mobilePerceptualHashDistance,
        };
      }));
      if (pageEvidence.some((page) => page === null)) continue;
      const completePageEvidence = pageEvidence.filter((page): page is NonNullable<typeof page> => page !== null);
      const desktopSsim = Math.min(...completePageEvidence.map((page) => page.desktopSsim));
      const mobileSsim = Math.min(...completePageEvidence.map((page) => page.mobileSsim));
      const desktopDistance = Math.max(...completePageEvidence.map((page) => page.desktopPerceptualHashDistance));
      const mobileDistance = Math.max(...completePageEvidence.map((page) => page.mobilePerceptualHashDistance));
      const evidence: VisualAliasEvidence = {
        domSimilarity: similarity,
        desktopSsim,
        mobileSsim,
        desktopPerceptualHashDistance: desktopDistance,
        mobilePerceptualHashDistance: mobileDistance,
        pages: completePageEvidence,
      };
      result.set(aliasPairKey(left.fingerprint.legacySlug, right.fingerprint.legacySlug), evidence);
      const leftTemplate = templateBySlug.get(left.fingerprint.legacySlug)!;
      context.ledger.upsertDedupeCluster({
        niche: left.fingerprint.niche,
        structuralHash: digest(`visual-comparison\0${aliasPairKey(left.fingerprint.legacySlug, right.fingerprint.legacySlug)}`),
        canonicalTemplateId: leftTemplate.id,
        method: 'visual-threshold',
        domSimilarity: similarity,
        desktopSsim,
        mobileSsim,
        maxPhashDistance: Math.max(desktopDistance, mobileDistance),
        decision: satisfiesVisualAliasThresholds(evidence, comparedPages)
          ? 'passing'
          : 'distinct',
        evidence: {
          left: left.fingerprint.legacySlug,
          right: right.fingerprint.legacySlug,
          viewports: ['desktop', 'mobile'],
          pages: completePageEvidence,
        },
      });
    }
  }));
  checkCancellation(context);
  return result;
}

export interface VisualAliasCertificationPlan {
  canonical: DedupeCandidate;
  candidate: DedupeCandidate;
  canonicalTemplate: LegacyTemplateRecord;
  template: LegacyTemplateRecord;
  evidence: VisualAliasEvidence;
}

export interface VisualAliasCertificationResult {
  pairKey: string;
  legacySlug: string;
  passed: boolean;
  artifactHash?: string;
  qualityReceipt?: string;
  issues: string[];
}

interface PreparedVisualAlias {
  plan: VisualAliasCertificationPlan;
  pairKey: string;
  sourceArtifactHash: string;
  artifactHash: string;
  files: Map<string, string | Uint8Array>;
  fields: ContractField[];
  directory: string;
  taskKey: string;
  pages: string[];
}

async function writeTransientVisualAlias(
  context: LegacyCommandContext,
  files: ReadonlyMap<string, string | Uint8Array>,
  directory: string,
): Promise<void> {
  const stagingRoot = resolve(context.config.artifactRoot, '.staging');
  if (!isWithin(stagingRoot, directory) || resolve(directory) === stagingRoot) {
    throw new Error(`Visual-alias staging target escaped its dedicated root: ${directory}`);
  }
  await mkdir(directory, { recursive: true });
  for (const [rawPath, value] of files) {
    const path = normalizeRelativePath(rawPath);
    const output = resolve(directory, ...path.split('/'));
    if (!isWithin(directory, output)) throw new Error(`Visual-alias file escaped staging: ${path}`);
    await atomicWriteFile(context.config, output, value);
  }
}

function recordVisualAliasCompositionDecision(
  context: LegacyCommandContext,
  plan: VisualAliasCertificationPlan,
  result: VisualAliasCertificationResult,
): void {
  context.ledger.upsertDedupeCluster({
    niche: plan.candidate.fingerprint.niche,
    structuralHash: digest(`visual-comparison\0${result.pairKey}`),
    canonicalTemplateId: plan.canonicalTemplate.id,
    method: 'visual-threshold',
    domSimilarity: plan.evidence.domSimilarity,
    desktopSsim: plan.evidence.desktopSsim,
    mobileSsim: plan.evidence.mobileSsim,
    maxPhashDistance: Math.max(
      plan.evidence.desktopPerceptualHashDistance,
      plan.evidence.mobilePerceptualHashDistance,
    ),
    decision: result.passed ? 'passing' : 'distinct',
    evidence: {
      left: plan.canonical.fingerprint.legacySlug,
      right: plan.candidate.fingerprint.legacySlug,
      viewports: ['desktop', 'mobile'],
      composedAliasQa: {
        passed: result.passed,
        artifactHash: result.artifactHash ?? null,
        qualityReceipt: result.qualityReceipt ?? null,
        issues: result.issues,
      },
    },
  });
}

/**
 * Render and certify the actual canonical-design + alias-preset composition.
 * A failed composition leaves the already verified source artifact current and
 * merely rejects this pair; a passing composition is atomically promoted to a
 * new candidate hash with its own current render matrix and receipt.
 */
export async function certifyVisualAliasCompositions(
  context: LegacyCommandContext,
  plans: readonly VisualAliasCertificationPlan[],
  renderTasks: typeof renderTemplateTasks = renderTemplateTasks,
): Promise<VisualAliasCertificationResult[]> {
  const prepared: PreparedVisualAlias[] = [];
  const results: VisualAliasCertificationResult[] = [];
  const canonicalArtifactFiles = new Map<number, Map<string, string | Uint8Array>>();

  for (const plan of plans) {
    checkCancellation(context);
    const pairKey = aliasPairKey(
      plan.canonical.fingerprint.legacySlug,
      plan.candidate.fingerprint.legacySlug,
    );
    const decision = canAliasDesigns(
      plan.canonical.fingerprint,
      plan.candidate.fingerprint,
      plan.evidence,
      Object.keys(plan.canonical.design.pages),
    );
    if (!decision.alias || decision.reason !== 'verified-visual-equivalence') {
      throw new Error(`Visual-alias certification received an ineligible pair: ${pairKey}`);
    }
    if (
      plan.template.legacySlug !== plan.candidate.fingerprint.legacySlug
      || plan.canonicalTemplate.legacySlug !== plan.canonical.fingerprint.legacySlug
    ) throw new Error(`Visual-alias certification template identity mismatch: ${pairKey}`);

    let canonicalFiles = canonicalArtifactFiles.get(plan.canonicalTemplate.id);
    if (!canonicalFiles) {
      const record = artifactForTemplate(context, plan.canonicalTemplate);
      if (!record) throw new Error(`Canonical artifact is missing for ${pairKey}`);
      const canonicalRoot = resolve(context.config.workRoot, record.relativePath);
      if (!isWithin(context.config.workRoot, canonicalRoot)) throw new Error(`Canonical artifact escaped the work root: ${pairKey}`);
      await validateRecordedArtifact(canonicalRoot, record.contentHash);
      canonicalFiles = await readArtifactFiles(canonicalRoot);
      canonicalArtifactFiles.set(plan.canonicalTemplate.id, canonicalFiles);
    }

    const sourceArtifact = artifactForTemplate(context, plan.template);
    if (!sourceArtifact || sourceArtifact.contentHash !== plan.template.resultHash) {
      throw new Error(`Current candidate artifact is missing for ${pairKey}`);
    }
    const sourceRoot = resolve(context.config.workRoot, sourceArtifact.relativePath);
    if (!isWithin(context.config.workRoot, sourceRoot)) throw new Error(`Candidate artifact escaped the work root: ${pairKey}`);
    await validateRecordedArtifact(sourceRoot, sourceArtifact.contentHash);
    const sourceFiles = await readArtifactFiles(sourceRoot);

    let composed: ComposedVisualAliasArtifact;
    try {
      composed = composeVisualAliasArtifactFiles({
        canonical: plan.canonical,
        candidate: plan.candidate,
        canonicalFiles,
        sourceFiles,
        sourceArtifactHash: sourceArtifact.contentHash,
      });
    } catch (error) {
      const result = {
        pairKey,
        legacySlug: plan.template.legacySlug,
        passed: false,
        issues: [`composition: ${error instanceof Error ? error.message : String(error)}`],
      } satisfies VisualAliasCertificationResult;
      results.push(result);
      recordVisualAliasCompositionDecision(context, plan, result);
      continue;
    }
    const verification = verifyStaticArtifact(composed.files, composed.fields);
    const tree = artifactTree(composed.files);
    if (!verification.passed) {
      const result = {
        pairKey,
        legacySlug: plan.template.legacySlug,
        passed: false,
        artifactHash: tree.hash,
        issues: verification.errors.map((error) => `static:${error.code}${error.page ? `:${error.page}` : ''}:${error.detail}`),
      } satisfies VisualAliasCertificationResult;
      results.push(result);
      recordVisualAliasCompositionDecision(context, plan, result);
      continue;
    }

    const directory = assertWorkPath(
      context.config,
      join(
        context.config.artifactRoot,
        '.staging',
        `visual-alias-${plan.template.id}-${tree.hash.slice(0, 16)}-${randomUUID()}`,
      ),
    );
    await writeTransientVisualAlias(context, composed.files, directory);
    prepared.push({
      plan,
      pairKey,
      sourceArtifactHash: sourceArtifact.contentHash,
      artifactHash: tree.hash,
      files: composed.files,
      fields: composed.fields,
      directory,
      taskKey: `visual-alias:${plan.template.id}:${tree.hash}`,
      pages: Object.keys(plan.canonical.design.pages).sort(),
    });
  }

  let rendered: RenderEvidence[] = [];
  try {
    const tasks = prepared.flatMap((item) => item.pages.map((page) => ({
      key: item.taskKey,
      niche: item.plan.template.niche,
      slug: `${item.plan.template.legacySlug}--visual-${item.artifactHash.slice(0, 12)}`,
      page,
      templateDir: item.directory,
    })));
    if (tasks.length > 0) {
      rendered = await renderTasks(context.config.artifactRoot, tasks, {
        evidenceRoot: context.config.renderRoot,
        workers: context.config.chromiumWorkers,
        retries: 3,
        recycleEvery: 1_000,
        signal: context.signal,
      });
    }
  } finally {
    await Promise.all(prepared.map(async (item) => {
      const stagingRoot = resolve(context.config.artifactRoot, '.staging');
      if (!isWithin(stagingRoot, item.directory) || resolve(item.directory) === stagingRoot) {
        throw new Error(`Refusing to remove unsafe visual-alias staging path: ${item.directory}`);
      }
      await rm(item.directory, { recursive: true, force: true });
    }));
  }

  const renderedByKey = new Map<string, RenderEvidence[]>();
  for (const evidence of rendered) {
    const values = renderedByKey.get(evidence.key) ?? [];
    values.push(evidence);
    renderedByKey.set(evidence.key, values);
  }

  for (const item of prepared) {
    checkCancellation(context);
    const evidence = renderedByKey.get(item.taskKey) ?? [];
    if (!hasCompletePassingRenderMatrix(evidence, item.pages)) {
      const result = {
        pairKey: item.pairKey,
        legacySlug: item.plan.template.legacySlug,
        passed: false,
        artifactHash: item.artifactHash,
        issues: evidence.length > 0
          ? evidence.filter((value) => !value.passed)
            .flatMap((value) => value.issues.map((issue) => `browser:${value.page}:${value.viewport}:${issue.code}:${issue.detail}`))
          : ['browser:complete two-viewport render evidence was not returned'],
      } satisfies VisualAliasCertificationResult;
      results.push(result);
      recordVisualAliasCompositionDecision(context, item.plan, result);
      context.ledger.addIssue({
        templateId: item.plan.template.id,
        runId: context.runId,
        code: 'visual_alias_composition_rejected',
        severity: 'warning',
        message: 'The canonical design with this source preset did not pass complete browser QA; the original passing design remains distinct.',
        fingerprint: digest(`visual_alias_composition_rejected\0${item.pairKey}\0${item.artifactHash}`),
        details: { canonicalLegacySlug: item.plan.canonicalTemplate.legacySlug, issues: result.issues },
        resolved: true,
      });
      continue;
    }

    const latest = context.ledger.getTemplate(item.plan.template.id);
    if (
      !latest
      || latest.resultHash !== item.sourceArtifactHash
      || !['verified', 'complete'].includes(latest.stage)
    ) throw new Error(`Visual-alias source changed before certification commit: ${item.pairKey}`);
    const compositionLease = context.ledger.leaseTemplates({
      stages: [latest.stage],
      legacySlugs: [latest.legacySlug],
      claimedStage: 'clustered',
      owner: `${process.pid}-${context.runId}-visual-compose`,
      limit: 1,
      leaseMs: 24 * 60 * 60_000,
      maxAttempts: 3,
      runId: context.runId,
    })[0];
    if (!compositionLease) throw new Error(`Could not lease visual-alias candidate: ${item.pairKey}`);

    const artifact = await materializeArtifact(context, compositionLease, item.files);
    if (artifact.treeHash !== item.artifactHash) throw new Error(`Visual-alias bytes changed after browser QA: ${item.pairKey}`);
    if (!context.ledger.completeTemplateLease({
      templateId: compositionLease.id,
      leaseToken: compositionLease.leaseToken,
      stage: 'render_pending',
      resultHash: artifact.treeHash,
    })) throw new Error(`Visual-alias composition lease expired: ${item.pairKey}`);

    const previousPages = new Map(context.ledger.listPages(compositionLease.id)
      .map((page) => [page.relativePath, page]));
    const pageIds = new Map<string, number>();
    for (const page of item.pages) {
      const html = item.files.get(page);
      if (typeof html !== 'string') throw new Error(`Visual-alias page disappeared: ${item.pairKey}/${page}`);
      const prior = previousPages.get(page);
      pageIds.set(page, context.ledger.upsertPage({
        templateId: compositionLease.id,
        relativePath: page,
        role: item.plan.canonical.design.pageRoles[page] ?? prior?.role ?? 'other',
        sourceHash: prior?.sourceHash ?? digest(`visual-alias-generated\0${page}`),
        resultHash: digest(html),
        stage: 'static-passed',
      }));
    }

    const renderLease = context.ledger.leaseTemplates({
      stages: ['render_pending'],
      legacySlugs: [latest.legacySlug],
      claimedStage: 'rendering',
      owner: `${process.pid}-${context.runId}-visual-receipt`,
      limit: 1,
      leaseMs: 24 * 60 * 60_000,
      maxAttempts: 3,
      runId: context.runId,
    })[0];
    if (!renderLease) throw new Error(`Could not lease visual-alias receipt commit: ${item.pairKey}`);
    for (const value of evidence) {
      const pageId = pageIds.get(value.page);
      if (!pageId) throw new Error(`Visual-alias evidence has no current page: ${item.pairKey}/${value.page}`);
      recordRenderEvidence(context, {
        templateId: renderLease.id,
        pageId,
        artifactHash: artifact.treeHash,
      }, value);
    }
    const receipt = await writeFinalReceipt(context, renderLease, evidence);
    context.ledger.addArtifact({
      runId: context.runId,
      templateId: renderLease.id,
      kind: 'quality-receipt',
      contentHash: receipt.id.replace(/^receipt_/, ''),
      relativePath: relative(context.config.workRoot, receipt.path),
      byteSize: (await stat(receipt.path)).size,
      metadata: {
        passed: true,
        visualAliasComposition: true,
        canonicalLegacySlug: item.plan.canonicalTemplate.legacySlug,
      },
    });
    context.ledger.addTransformation({
      templateId: renderLease.id,
      runId: context.runId,
      ruleCode: 'materialize-verified-visual-alias',
      ruleVersion: context.config.ruleVersion,
      beforeHash: item.sourceArtifactHash,
      afterHash: artifact.treeHash,
      details: {
        canonicalLegacySlug: item.plan.canonicalTemplate.legacySlug,
        canonicalDesignId: item.plan.canonical.design.id,
        contentPresetId: item.plan.candidate.contentPreset.id,
        themePresetId: item.plan.candidate.themePreset.id,
        evidence: item.plan.evidence,
      },
    });
    if (!context.ledger.completeTemplateLease({
      templateId: renderLease.id,
      leaseToken: renderLease.leaseToken,
      stage: 'verified',
      resultHash: artifact.treeHash,
      qualityReceipt: receipt.id,
      resolveIssues: true,
    })) throw new Error(`Visual-alias render lease expired: ${item.pairKey}`);

    const result = {
      pairKey: item.pairKey,
      legacySlug: item.plan.template.legacySlug,
      passed: true,
      artifactHash: artifact.treeHash,
      qualityReceipt: receipt.id,
      issues: [],
    } satisfies VisualAliasCertificationResult;
    results.push(result);
    recordVisualAliasCompositionDecision(context, item.plan, result);
    await logEvent(context, 'template.visual_alias_certified', {
      niche: item.plan.template.niche,
      legacySlug: item.plan.template.legacySlug,
      canonicalLegacySlug: item.plan.canonicalTemplate.legacySlug,
      priorArtifactHash: item.sourceArtifactHash,
      artifactHash: artifact.treeHash,
      receipt: receipt.id,
      renders: evidence.length,
    });
  }

  return results.sort((left, right) => left.legacySlug.localeCompare(right.legacySlug));
}

async function loadCatalogCandidates(
  context: LegacyCommandContext,
  allowed: ReadonlySet<string> | null,
): Promise<{ templates: LegacyTemplateRecord[]; candidates: DedupeCandidate[] }> {
  const templates = context.ledger.listTemplates({ stages: ['verified', 'complete'] })
    .filter((template) => !allowed || allowed.has(template.legacySlug));
  const candidates: DedupeCandidate[] = [];
  for (const template of templates) {
    checkCancellation(context);
    const [catalogTemplate, design, fingerprint, contentPreset, themePreset] = await Promise.all([
      readRepairSidecar<CatalogTemplate>(context, template, 'catalog-v3.json'),
      readRepairSidecar<DedupeCandidate['design']>(context, template, 'design.json')
        .catch(async () => {
          // Early artifacts keep design data in the content-addressed sidecars
          // but older interrupted pilots can reconstruct it from fingerprint.
          const fingerprintFallback = await readRepairSidecar<DedupeFingerprint>(context, template, 'fingerprint.json');
          return {
            id: catalogTemplatePlaceholder(template).designId,
            niche: template.niche,
            pages: {},
            styles: {},
            pageRoles: {},
            structureHash: fingerprintFallback.structureHash,
            domHash: fingerprintFallback.domHash,
            cssHash: fingerprintFallback.cssHash,
          };
        }),
      readRepairSidecar<DedupeFingerprint>(context, template, 'fingerprint.json')
        .catch(async () => {
          const catalog = await readRepairSidecar<CatalogTemplate>(context, template, 'catalog-v3.json');
          return {
            legacySlug: template.legacySlug,
            niche: template.niche,
            pageRoles: [],
            domHash: template.resultHash ?? '',
            cssHash: template.resultHash ?? '',
            structureHash: template.resultHash ?? '',
            exactDesignHash: catalog.designId,
            contentHash: catalog.contentPresetId,
            themeHash: catalog.themePresetId,
            ...(template.foundationId ? { foundation: template.foundationId } : {}),
          };
        }),
      readRepairSidecar<ContentPreset>(context, template, 'content-preset.json'),
      readRepairSidecar<ThemePreset>(context, template, 'theme-preset.json'),
    ]);
    candidates.push({ catalogTemplate, design, fingerprint, contentPreset, themePreset });
  }
  return { templates, candidates };
}

async function composeCatalog(
  context: LegacyCommandContext,
  allowedSlugs?: readonly string[],
): Promise<CatalogV3Document> {
  checkCancellation(context);
  const allowed = allowedSlugs ? new Set(allowedSlugs) : null;
  const rejectedVisualPairs = new Set<string>();
  let templates: LegacyTemplateRecord[] = [];
  let candidates: DedupeCandidate[] = [];
  let clusters: DedupeCluster[] = [];

  // A visual match is only provisional until the exact canonical design plus
  // the proposed source presets passes the same full QA matrix as every other
  // candidate. Passing compositions become immutable current artifacts and
  // are then reloaded as exact designs; failed compositions remain distinct.
  while (true) {
    checkCancellation(context);
    ({ templates, candidates } = await loadCatalogCandidates(context, allowed));
    const visualEvidence = await buildVisualAliasEvidence(
      context,
      candidates,
      templates,
      rejectedVisualPairs,
    );
    clusters = buildDedupeClusters(
      candidates,
      (canonical, candidate) => visualEvidence.get(aliasPairKey(
        canonical.fingerprint.legacySlug,
        candidate.fingerprint.legacySlug,
      )),
    );
    const candidateBySlug = new Map(candidates.map((candidate) => [candidate.fingerprint.legacySlug, candidate]));
    const templateBySlug = new Map(templates.map((template) => [template.legacySlug, template]));
    const plans: VisualAliasCertificationPlan[] = [];
    for (const cluster of clusters) {
      const canonical = candidateBySlug.get(cluster.canonicalLegacySlug);
      const canonicalTemplate = templateBySlug.get(cluster.canonicalLegacySlug);
      if (!canonical || !canonicalTemplate) throw new Error(`Visual-alias canonical is missing: ${cluster.canonicalLegacySlug}`);
      for (const alias of cluster.aliases.filter((item) => item.reason === 'verified-visual-equivalence')) {
        const candidate = candidateBySlug.get(alias.legacySlug);
        const template = templateBySlug.get(alias.legacySlug);
        const pairKey = aliasPairKey(cluster.canonicalLegacySlug, alias.legacySlug);
        const evidence = visualEvidence.get(pairKey);
        if (!candidate || !template || !evidence) throw new Error(`Visual-alias evidence plan is incomplete: ${pairKey}`);
        plans.push({ canonical, candidate, canonicalTemplate, template, evidence });
      }
    }
    if (plans.length === 0) break;

    const certifications = await certifyVisualAliasCompositions(context, plans);
    let changedArtifact = false;
    let newlyRejected = false;
    for (const certification of certifications) {
      if (certification.passed) changedArtifact = true;
      else if (!rejectedVisualPairs.has(certification.pairKey)) {
        rejectedVisualPairs.add(certification.pairKey);
        newlyRejected = true;
      }
    }
    if (!changedArtifact && !newlyRejected) {
      throw new Error('Visual-alias certification made no progress');
    }
  }

  const aliases: CatalogV3Alias[] = [];
  const gallery: Record<string, string[]> = {};
  for (const cluster of clusters) {
    checkCancellation(context);
    const canonical = templates.find((template) => template.legacySlug === cluster.canonicalLegacySlug);
    if (!canonical) throw new Error(`Cluster canonical is missing: ${cluster.canonicalLegacySlug}`);
    const clusterId = context.ledger.upsertDedupeCluster({
      niche: canonical.niche,
      structuralHash: digest(`${cluster.id}:${candidates.find((candidate) => candidate.catalogTemplate.legacySlug === canonical.legacySlug)!.fingerprint.structureHash}`),
      canonicalTemplateId: canonical.id,
      method: cluster.aliases.some((item) => item.reason === 'verified-visual-equivalence')
        ? 'visual-threshold'
        : cluster.aliases.some((item) => item.reason === 'foundation-lineage')
          ? 'foundation-lineage'
          : 'exact-design',
      decision: 'passing',
      evidence: { aliases: cluster.aliases },
    });
    gallery[canonical.niche] ??= [];
    gallery[canonical.niche]!.push(canonical.legacySlug);
    for (const alias of cluster.aliases) {
      checkCancellation(context);
      const template = templates.find((candidate) => candidate.legacySlug === alias.legacySlug);
      if (!template) throw new Error(`Alias template is missing: ${alias.legacySlug}`);
      const receipt = template.qualityReceipt;
      if (!receipt) throw new Error(`Template has no quality receipt: ${template.legacySlug}`);
      context.ledger.upsertAlias({
        legacySlug: template.legacySlug,
        templateId: template.id,
        clusterId,
        designId: cluster.designId,
        contentPresetId: alias.contentPresetId,
        themePresetId: alias.themePresetId,
        qualityReceipt: receipt,
        status: 'passing',
      });
      const mappingDisposition = template.legacySlug === canonical.legacySlug ? 'canonical' : 'alias';
      const terminalDisposition = catalogTerminalDisposition(mappingDisposition);
      const lease = context.ledger.leaseTemplates({
        // A pilot canonical is selected from only the pilot sample. The full
        // catalogue may reveal a lexicographically earlier member of the same
        // cluster, so already-complete pilot rows must be atomically
        // reclassified alongside newly verified rows.
        stages: ['verified', 'complete'],
        legacySlugs: [template.legacySlug],
        claimedStage: 'clustered',
        owner: `${process.pid}-${context.runId}-compose`,
        limit: 1,
        runId: context.runId,
      })[0];
      if (!lease) throw new Error(`Could not acquire catalogue-composition lease for ${template.legacySlug}`);
      const completed = context.ledger.completeTemplateLease({
        templateId: template.id,
        leaseToken: lease.leaseToken,
        stage: 'complete',
        terminalDisposition,
        qualityReceipt: receipt,
      });
      if (!completed) throw new Error(`Catalogue-composition lease expired for ${template.legacySlug}`);
      aliases.push({
        legacySlug: template.legacySlug,
        niche: template.niche,
        designId: cluster.designId,
        contentPresetId: alias.contentPresetId,
        themePresetId: alias.themePresetId,
        qualityReceipt: receipt,
        canonicalLegacySlug: canonical.legacySlug,
        disposition: mappingDisposition,
      });
    }
  }
  for (const values of Object.values(gallery)) values.sort();
  const document: CatalogV3Document = {
    contractVersion: 3,
    ruleVersion: context.config.ruleVersion,
    generatedAt: new Date().toISOString(),
    sourceTemplates: aliases.length,
    canonicalDesigns: clusters.length,
    templates: aliases.sort((a, b) => `${a.niche}/${a.legacySlug}`.localeCompare(`${b.niche}/${b.legacySlug}`)),
    gallery,
  };
  const label = allowed ? 'pilot-catalog-v3.json' : 'catalog-v3.json';
  await atomicWriteFile(context.config, join(context.config.reportRoot, label), `${JSON.stringify(document, null, 2)}\n`);
  await logEvent(context, 'catalog.composed', {
    scope: allowed ? 'pilot' : 'full',
    sourceTemplates: document.sourceTemplates,
    canonicalDesigns: document.canonicalDesigns,
  });
  return document;
}

export function catalogTerminalDisposition(
  disposition: CatalogV3Alias['disposition'],
): 'passing_design' | 'passing_alias' {
  return disposition === 'canonical' ? 'passing_design' : 'passing_alias';
}

function catalogTemplatePlaceholder(template: LegacyTemplateRecord): CatalogTemplate {
  return {
    legacySlug: template.legacySlug,
    niche: template.niche,
    designId: `design_${(template.resultHash ?? digest(template.legacySlug)).slice(0, 24)}`,
    contentPresetId: `content_${digest(template.legacySlug).slice(0, 24)}`,
    themePresetId: `theme_${digest(`${template.legacySlug}:theme`).slice(0, 24)}`,
    qualityReceipt: template.qualityReceipt ?? '',
  };
}

export async function durablePilotFallbackSlugs(
  context: Pick<LegacyCommandContext, 'config' | 'ledger'>,
  selectedSlugs: readonly string[],
): Promise<string[]> {
  const fallbackSlugs: string[] = [];
  for (const slug of [...new Set(selectedSlugs)].sort()) {
    const template = context.ledger.getTemplateBySlug(slug);
    if (!template) throw new Error(`Pilot template is missing from the ledger: ${slug}`);
    const artifact = artifactForTemplate(context, template);
    if (!artifact) throw new Error(`Pilot candidate artifact is missing: ${slug}`);
    const path = resolve(
      context.config.workRoot,
      artifact.relativePath,
      '.dailyclarity',
      'rehabilitation.json',
    );
    if (!isWithin(context.config.workRoot, path)) {
      throw new Error(`Pilot rehabilitation metadata escaped the work root for ${slug}`);
    }
    const details = await lstat(path).catch(() => null);
    if (!details?.isFile() || details.isSymbolicLink()) {
      throw new Error(`Pilot rehabilitation metadata is missing or unsafe for ${slug}`);
    }
    const metadata = JSON.parse(await readFile(path, 'utf8')) as {
      repairMode?: unknown;
      renderRemediation?: unknown;
    };
    if (metadata.repairMode === 'neutral_fallback' || metadata.renderRemediation === 'neutral') {
      fallbackSlugs.push(slug);
    }
  }
  return fallbackSlugs;
}

export function assertNoNeutralFallbacks(scope: string, fallbackSlugs: readonly string[]): void {
  if (fallbackSlugs.length === 0) return;
  const sample = [...new Set(fallbackSlugs)].sort().slice(0, 5).join(', ');
  throw new Error(
    `${scope} blocked: ${fallbackSlugs.length} current template artifact(s) use a neutral fallback`
    + `${sample ? ` (${sample}${fallbackSlugs.length > 5 ? ', …' : ''})` : ''}. `
    + 'Every legacy slug must preserve its repaired primary design before rollout.',
  );
}

interface PilotEvidenceAudit {
  fallbackSlugs: string[];
  issues: string[];
  recoveries: Array<{
    legacySlug: string;
    stage: 'repair_pending' | 'render_pending';
    reason: string;
  }>;
  selectedCount: number;
  uniqueSelectedCount: number;
  catalogSourceTemplates: number;
  selectionHash: string;
}

interface PilotCoverageSnapshot {
  niches: string[];
  foundations: string[];
  cohorts: string[];
  topologies: string[];
  issueCodes: string[];
}

interface PilotCoverageAudit {
  universe: PilotCoverageSnapshot;
  selected: PilotCoverageSnapshot;
  missing: string[];
  universeHash: string;
}

function collectPilotCoverage(templates: readonly LegacyTemplateInventory[]): PilotCoverageSnapshot {
  const niches = new Set<string>();
  const foundations = new Set<string>();
  const cohorts = new Set<string>();
  const topologies = new Set<string>();
  const issueCodes = new Set<string>();
  for (const template of templates) {
    const dimensions = pilotCoverageDimensions(template);
    niches.add(dimensions.niche);
    if (dimensions.foundation) foundations.add(dimensions.foundation);
    cohorts.add(dimensions.cohort);
    topologies.add(dimensions.topology);
    for (const code of dimensions.issueCodes) issueCodes.add(code);
  }
  return {
    niches: [...niches].sort(),
    foundations: [...foundations].sort(),
    cohorts: [...cohorts].sort(),
    topologies: [...topologies].sort(),
    issueCodes: [...issueCodes].sort(),
  };
}

function auditPilotCoverage(
  universeTemplates: readonly LegacyTemplateInventory[],
  selectedTemplates: readonly LegacyTemplateInventory[],
): PilotCoverageAudit {
  const universe = collectPilotCoverage(universeTemplates);
  const selected = collectPilotCoverage(selectedTemplates);
  const missing = (Object.keys(universe) as Array<keyof PilotCoverageSnapshot>)
    .flatMap((dimension) => universe[dimension].filter((value) => !selected[dimension].includes(value))
      .map((value) => `${dimension}:${value}`));
  return {
    universe,
    selected,
    missing,
    universeHash: digest(stableStringify(universe)),
  };
}

function pilotSelectionHash(slugs: readonly string[]): string {
  return digest(stableStringify([...new Set(slugs)].sort()));
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = [...new Set(left)].sort();
  const normalizedRight = [...new Set(right)].sort();
  return stableStringify(normalizedLeft) === stableStringify(normalizedRight);
}

async function auditPilotEvidence(
  context: Pick<LegacyCommandContext, 'config' | 'ledger'>,
  selected: readonly LegacyTemplateInventory[],
  catalog: CatalogV3Document | null,
): Promise<PilotEvidenceAudit> {
  const selectedSlugs = selected.map((template) => template.slug);
  const uniqueSlugs = [...new Set(selectedSlugs)].sort();
  const issues: string[] = [];
  const fallbackSlugs: string[] = [];
  const recoveryBySlug = new Map<string, { stage: 'repair_pending' | 'render_pending'; reasons: string[] }>();
  const addTemplateIssue = (
    slug: string,
    message: string,
    stage: 'repair_pending' | 'render_pending' = 'render_pending',
  ): void => {
    issues.push(message);
    const current = recoveryBySlug.get(slug);
    recoveryBySlug.set(slug, {
      stage: current?.stage === 'repair_pending' || stage === 'repair_pending' ? 'repair_pending' : 'render_pending',
      reasons: [...(current?.reasons ?? []), message],
    });
  };
  if (uniqueSlugs.length !== selectedSlugs.length) issues.push('Pilot selection contains duplicate legacy slugs');
  if (uniqueSlugs.length < MINIMUM_LEGACY_PILOT_SIZE) {
    issues.push(`Pilot selection contains ${uniqueSlugs.length}/${MINIMUM_LEGACY_PILOT_SIZE} required unique templates`);
  }

  const catalogSlugs = catalog?.templates.map((template) => template.legacySlug) ?? [];
  if (!catalog) {
    issues.push('Pilot catalogue was not composed');
  } else {
    if (catalog.contractVersion !== 3) issues.push(`Pilot catalogue contract is ${catalog.contractVersion}, expected 3`);
    if (catalog.ruleVersion !== context.config.ruleVersion) issues.push('Pilot catalogue belongs to a different repair-rule version');
    if (catalog.sourceTemplates !== uniqueSlugs.length) {
      issues.push(`Pilot catalogue accounts for ${catalog.sourceTemplates}/${uniqueSlugs.length} selected templates`);
    }
    if (catalog.templates.length !== uniqueSlugs.length || !sameStringSet(catalogSlugs, uniqueSlugs)) {
      issues.push('Pilot catalogue slug coverage does not exactly match the selection');
    }
    if (new Set(catalogSlugs).size !== catalogSlugs.length) issues.push('Pilot catalogue contains duplicate legacy slugs');
  }

  const inventoryBySlug = new Map(selected.map((template) => [template.slug, template]));
  const catalogBySlug = new Map(catalog?.templates.map((template) => [template.legacySlug, template]) ?? []);
  const passingAliases = new Map(context.ledger.listAliases('passing').map((alias) => [alias.legacySlug, alias]));
  for (const slug of uniqueSlugs) {
    const inventory = inventoryBySlug.get(slug)!;
    const template = context.ledger.getTemplateBySlug(slug);
    if (!template) {
      issues.push(`${slug}: missing ledger template`);
      continue;
    }
    if (template.ruleVersion !== context.config.ruleVersion) addTemplateIssue(slug, `${slug}: stale template rule version`, 'repair_pending');
    if (template.sourceHash !== inventory.sourceTreeHash) addTemplateIssue(slug, `${slug}: stale template source hash`, 'repair_pending');
    if (template.stage !== 'complete') addTemplateIssue(slug, `${slug}: stage is ${template.stage}, expected complete`);
    if (template.terminalDisposition !== 'passing_design' && template.terminalDisposition !== 'passing_alias') {
      addTemplateIssue(slug, `${slug}: terminal disposition is not passing`);
    }
    if (!template.resultHash) addTemplateIssue(slug, `${slug}: missing current artifact hash`, 'repair_pending');
    if (!template.qualityReceipt) addTemplateIssue(slug, `${slug}: missing final quality receipt id`);

    const mapping = catalogBySlug.get(slug);
    if (!mapping) {
      addTemplateIssue(slug, `${slug}: missing catalogue mapping`);
    } else {
      const expectedDisposition = catalogTerminalDisposition(mapping.disposition);
      if (template.terminalDisposition !== expectedDisposition) {
        addTemplateIssue(
          slug,
          `${slug}: terminal disposition ${template.terminalDisposition ?? 'null'} does not match catalogue ${mapping.disposition}`,
        );
      }
      if (mapping.niche !== inventory.niche || mapping.niche !== template.niche) {
        addTemplateIssue(slug, `${slug}: catalogue niche does not match the current source`);
      }
      if (mapping.qualityReceipt !== template.qualityReceipt) {
        addTemplateIssue(slug, `${slug}: catalogue receipt does not match the ledger`);
      }
    }
    const alias = passingAliases.get(slug);
    if (!alias) {
      addTemplateIssue(slug, `${slug}: missing passing alias record`);
    } else if (
      mapping
      && (alias.designId !== mapping.designId
        || alias.contentPresetId !== mapping.contentPresetId
        || alias.themePresetId !== mapping.themePresetId
        || alias.qualityReceipt !== mapping.qualityReceipt)
    ) {
      addTemplateIssue(slug, `${slug}: passing alias record does not match the catalogue`);
    }

    const artifact = artifactForTemplate(context, template);
    let emittedManifestPages: unknown;
    if (!artifact) {
      addTemplateIssue(slug, `${slug}: missing current candidate artifact`, 'repair_pending');
    } else {
      const artifactRoot = resolve(context.config.workRoot, artifact.relativePath);
      const metadataPath = resolve(
        artifactRoot,
        '.dailyclarity',
        'rehabilitation.json',
      );
      if (!isWithin(context.config.workRoot, artifactRoot) || !isWithin(artifactRoot, metadataPath)) {
        addTemplateIssue(slug, `${slug}: candidate artifact escapes the work root`, 'repair_pending');
      } else {
        try {
          await validateRecordedArtifact(artifactRoot, artifact.contentHash);
        } catch (error) {
          addTemplateIssue(slug, `${slug}: current candidate artifact failed integrity validation (${error instanceof Error ? error.message : String(error)})`, 'repair_pending');
        }
        try {
          const manifestPath = resolve(artifactRoot, 'template.json');
          if (!isWithin(artifactRoot, manifestPath)) throw new Error('template manifest escaped its artifact root');
          const manifestDetails = await lstat(manifestPath).catch(() => null);
          if (!manifestDetails?.isFile() || manifestDetails.isSymbolicLink()) {
            throw new Error('template manifest is not a safe regular file');
          }
          const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown;
          if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
            throw new Error('template manifest is not an object');
          }
          emittedManifestPages = (manifest as Record<string, unknown>).pages;
        } catch (error) {
          addTemplateIssue(
            slug,
            `${slug}: unreadable emitted template manifest (${error instanceof Error ? error.message : String(error)})`,
            'repair_pending',
          );
        }
        try {
          const metadataDetails = await lstat(metadataPath).catch(() => null);
          if (!metadataDetails?.isFile() || metadataDetails.isSymbolicLink()) {
            throw new Error('rehabilitation metadata is not a safe regular file');
          }
          const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as {
            ruleVersion?: unknown;
            sourceHash?: unknown;
            repairMode?: unknown;
            renderRemediation?: unknown;
            sourcePreserved?: unknown;
          };
          if (metadata.ruleVersion !== context.config.ruleVersion) addTemplateIssue(slug, `${slug}: stale rehabilitation rule version`, 'repair_pending');
          if (metadata.sourceHash !== template.sourceHash) addTemplateIssue(slug, `${slug}: stale rehabilitation source hash`, 'repair_pending');
          if (metadata.sourcePreserved !== true) addTemplateIssue(slug, `${slug}: source-preservation receipt is absent`, 'repair_pending');
          if (metadata.repairMode === 'neutral_fallback' || metadata.renderRemediation === 'neutral') {
            fallbackSlugs.push(slug);
          }
        } catch (error) {
          addTemplateIssue(slug, `${slug}: unreadable rehabilitation metadata (${error instanceof Error ? error.message : String(error)})`, 'repair_pending');
        }
      }
    }

    const pages = context.ledger.listPages(template.id);
    if (!pages.some((page) => page.stage === 'static-passed')) {
      addTemplateIssue(slug, `${slug}: no current static-passed pages`, 'repair_pending');
    }
    const renders = context.ledger.listRenders(template.id);
    let receiptPages: unknown;

    if (template.qualityReceipt) {
      const receiptHash = template.qualityReceipt.replace(/^receipt_/, '');
      const receipt = context.ledger.listArtifacts({ templateId: template.id, kind: 'quality-receipt' })
        .find((candidate) => candidate.contentHash === receiptHash);
      if (!receipt) {
        addTemplateIssue(slug, `${slug}: final quality receipt artifact is missing`);
      } else {
        const receiptPath = resolve(context.config.workRoot, receipt.relativePath);
        if (!isWithin(context.config.workRoot, receiptPath)) {
          addTemplateIssue(slug, `${slug}: final quality receipt escapes the work root`);
        } else {
          try {
            const receiptDetails = await lstat(receiptPath);
            if (!receiptDetails.isFile() || receiptDetails.isSymbolicLink()) {
              throw new Error('receipt is not a safe regular file');
            }
            const parsed = JSON.parse(await readFile(receiptPath, 'utf8')) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              throw new Error('receipt is not an object');
            }
            const document = parsed as {
              id?: unknown;
              legacySlug?: unknown;
              niche?: unknown;
              sourceHash?: unknown;
              artifactHash?: unknown;
              ruleVersion?: unknown;
              sourcePreserved?: unknown;
              checks?: { static?: unknown; desktop?: unknown; mobile?: unknown; criticalDefects?: unknown; seriousDefects?: unknown };
              pages?: unknown;
            };
            receiptPages = document.pages;
            const { id: recordedId, ...receiptBody } = parsed as Record<string, unknown>;
            const computedId = `receipt_${sha256(stableStringify(receiptBody)).slice(0, 24)}`;
            if (
              recordedId !== computedId
              || computedId !== template.qualityReceipt
              || receipt.contentHash !== computedId.replace(/^receipt_/, '')
              || document.legacySlug !== slug
              || document.niche !== inventory.niche
              || document.sourceHash !== template.sourceHash
              || document.artifactHash !== template.resultHash
              || document.ruleVersion !== context.config.ruleVersion
              || document.sourcePreserved !== true
              || document.checks?.static !== 'passed'
              || document.checks?.desktop !== 'passed'
              || document.checks?.mobile !== 'passed'
              || document.checks?.criticalDefects !== 0
              || document.checks?.seriousDefects !== 0
            ) {
              addTemplateIssue(slug, `${slug}: final quality receipt does not attest the current passing artifact`);
            }
          } catch (error) {
            addTemplateIssue(slug, `${slug}: unreadable final quality receipt (${error instanceof Error ? error.message : String(error)})`);
          }
        }
      }
    }
    if (artifact) {
      for (const matrixIssue of validateFinalPageEvidenceMatrix({
        manifestPages: emittedManifestPages,
        ledgerPages: pages,
        renders,
        receiptPages,
      })) {
        addTemplateIssue(
          slug,
          `${slug}: ${matrixIssue.code}: ${matrixIssue.detail}`,
          matrixIssue.recoveryStage,
        );
      }
    }
  }

  return {
    fallbackSlugs,
    issues,
    recoveries: [...recoveryBySlug.entries()].map(([legacySlug, recovery]) => ({
      legacySlug,
      stage: recovery.stage,
      reason: recovery.reasons.join('; '),
    })),
    selectedCount: selectedSlugs.length,
    uniqueSelectedCount: uniqueSlugs.length,
    catalogSourceTemplates: catalog?.sourceTemplates ?? 0,
    selectionHash: pilotSelectionHash(uniqueSlugs),
  };
}

async function recoverFailedFinalEvidence(
  context: LegacyCommandContext,
  audit: Pick<PilotEvidenceAudit, 'recoveries'>,
): Promise<number> {
  let recovered = 0;
  const candidateRoot = resolve(context.config.artifactRoot, 'candidates');
  for (const recovery of audit.recoveries) {
    checkCancellation(context);
    const template = context.ledger.getTemplateBySlug(recovery.legacySlug);
    if (!template || template.stage !== 'complete') continue;

    // A byte-corrupt content-addressed candidate would otherwise be selected
    // again and fail validation forever. Remove only the exact derived leaf;
    // immutable source and shared blobs remain untouched and repair will
    // recreate the candidate atomically on resume.
    if (recovery.stage === 'repair_pending' && recovery.reason.includes('failed integrity validation')) {
      const artifact = artifactForTemplate(context, template);
      if (artifact) {
        const target = resolve(context.config.workRoot, artifact.relativePath);
        if (!isWithin(candidateRoot, target)) {
          throw new Error(`Refusing to reap evidence artifact outside candidate storage: ${target}`);
        }
        const details = await lstat(target).catch(() => null);
        if (details?.isSymbolicLink()) {
          throw new Error(`Refusing to reap symbolic-link evidence artifact: ${target}`);
        }
        if (details?.isDirectory()) await rm(target, { recursive: true, force: true });
      }
    }

    if (context.ledger.requeueTemplateAfterEvidenceFailure(
      template.id,
      recovery.stage,
      recovery.reason.slice(0, 8_000),
      context.runId,
    )) recovered += 1;
  }
  if (recovered > 0) {
    await logEvent(context, 'catalog.evidence_requeued', {
      templates: recovered,
      repairPending: audit.recoveries.filter((item) => item.stage === 'repair_pending').length,
      renderPending: audit.recoveries.filter((item) => item.stage === 'render_pending').length,
    });
  }
  return recovered;
}

export function validatePilotGateAuthorization(
  value: unknown,
  ruleVersion: string,
): { catalogHash: string; selectedSlugs: string[]; coverageUniverseHash: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Pilot gate is malformed');
  const gate = value as Record<string, unknown>;
  if (gate.version !== LEGACY_PILOT_GATE_VERSION) {
    throw new Error(`Pilot gate schema is stale; rerun the pilot with gate v${LEGACY_PILOT_GATE_VERSION}`);
  }
  if (gate.passed !== true || gate.ruleVersion !== ruleVersion) {
    throw new Error('The pilot gate is absent, failed, or belongs to a different repair-rule version');
  }
  const selected = Array.isArray(gate.selected) ? gate.selected : [];
  const selectedSlugs = selected.map((item) => (
    item && typeof item === 'object' && !Array.isArray(item)
      ? (item as Record<string, unknown>).legacySlug
      : undefined
  ));
  if (selectedSlugs.some((slug) => typeof slug !== 'string' || !slug)) throw new Error('Pilot gate selection is malformed');
  const slugs = selectedSlugs as string[];
  if (slugs.length < MINIMUM_LEGACY_PILOT_SIZE || new Set(slugs).size !== slugs.length) {
    throw new Error(`Pilot gate must contain at least ${MINIMUM_LEGACY_PILOT_SIZE} unique templates`);
  }
  if (gate.selectedCount !== slugs.length || gate.uniqueSelectedCount !== slugs.length) {
    throw new Error('Pilot gate selection counts are inconsistent');
  }
  if (gate.selectionHash !== pilotSelectionHash(slugs)) throw new Error('Pilot gate selection hash is invalid');
  if (gate.catalogSourceTemplates !== slugs.length) throw new Error('Pilot gate catalogue coverage is incomplete');
  const coverage = gate.coverage && typeof gate.coverage === 'object' && !Array.isArray(gate.coverage)
    ? gate.coverage as Record<string, unknown>
    : null;
  if (!coverage) throw new Error('Pilot gate coverage evidence is missing');
  const parseSnapshot = (value: unknown): PilotCoverageSnapshot => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Pilot gate coverage evidence is malformed');
    const record = value as Record<string, unknown>;
    const snapshot = {} as PilotCoverageSnapshot;
    for (const key of ['niches', 'foundations', 'cohorts', 'topologies', 'issueCodes'] as const) {
      const entries = record[key];
      if (
        !Array.isArray(entries)
        || entries.some((entry) => typeof entry !== 'string' || !entry)
        || new Set(entries).size !== entries.length
        || stableStringify(entries) !== stableStringify([...entries].sort())
      ) {
        throw new Error(`Pilot gate ${key} coverage is malformed`);
      }
      snapshot[key] = entries as string[];
    }
    return snapshot;
  };
  const universeCoverage = parseSnapshot(coverage.universe);
  const selectedCoverage = parseSnapshot(coverage.selected);
  if (!Array.isArray(coverage.missing) || coverage.missing.length !== 0) {
    throw new Error('Pilot gate does not cover every observed catalogue dimension');
  }
  if (stableStringify(universeCoverage) !== stableStringify(selectedCoverage)) {
    throw new Error('Pilot gate selected coverage is incomplete');
  }
  const coverageUniverseHash = digest(stableStringify(universeCoverage));
  if (coverage.universeHash !== coverageUniverseHash) throw new Error('Pilot gate coverage hash is invalid');
  const gates = gate.gates && typeof gate.gates === 'object' && !Array.isArray(gate.gates)
    ? gate.gates as Record<string, unknown>
    : {};
  if (
    gates.noCriticalDefects !== true
    || gates.deterministicFailureRateBelowTwoPercent !== true
    || gates.minimumPilotSizeMet !== true
    || gates.uniqueSelection !== true
    || gates.exactCatalogCoverage !== true
    || gates.everyObservedDimensionCovered !== true
    || gates.currentEvidenceComplete !== true
    || gates.everyPilotTemplatePassed !== true
    || gates.primaryRepairPreserved !== true
  ) {
    throw new Error('Pilot gate does not contain complete passing authorization evidence');
  }
  if (typeof gate.catalogHash !== 'string' || !gate.catalogHash) throw new Error('Pilot gate catalogue hash is missing');
  return { catalogHash: gate.catalogHash, selectedSlugs: slugs, coverageUniverseHash };
}

export async function writePilotGate(
  context: LegacyCommandContext,
  selected: readonly LegacyTemplateInventory[],
  catalogHash: string,
  repair: RepairSummary,
  render: RenderSummary,
  catalog: CatalogV3Document | null,
  coverageUniverse: readonly LegacyTemplateInventory[] = selected,
): Promise<{ passed: boolean; path: string }> {
  const deterministicFailures = repair.staticFailed + render.failedTemplates;
  const failureRate = selected.length === 0 ? 1 : deterministicFailures / selected.length;
  const evidence = await auditPilotEvidence(context, selected, catalog);
  const fallbackSlugs = evidence.fallbackSlugs;
  const fallbackCount = fallbackSlugs.length;
  const currentEvidenceComplete = evidence.issues.length === 0;
  const coverage = auditPilotCoverage(coverageUniverse, selected);
  const passed = render.criticalDefects === 0
    && deterministicFailures === 0
    && failureRate < 0.02
    && fallbackCount === 0
    && coverage.missing.length === 0
    && currentEvidenceComplete;
  const payload = {
    version: LEGACY_PILOT_GATE_VERSION,
    passed,
    generatedAt: new Date().toISOString(),
    ruleVersion: context.config.ruleVersion,
    catalogHash,
    selected: selected.map((template) => ({
      legacySlug: template.slug,
      niche: template.niche,
      cohort: pilotCoverageDimensions(template).cohort,
      topology: template.pages.map((page) => page.role).sort(),
      issueFamilies: [...new Set(template.issues.map((issue) => issue.code))].sort(),
    })),
    repair,
    render,
    failureRate,
    fallbackSlugs,
    evidenceIssues: evidence.issues,
    selectedCount: evidence.selectedCount,
    uniqueSelectedCount: evidence.uniqueSelectedCount,
    catalogSourceTemplates: evidence.catalogSourceTemplates,
    selectionHash: evidence.selectionHash,
    coverage,
    canonicalDesigns: catalog?.canonicalDesigns ?? 0,
    gates: {
      noCriticalDefects: render.criticalDefects === 0,
      deterministicFailureRateBelowTwoPercent: failureRate < 0.02,
      minimumPilotSizeMet: evidence.uniqueSelectedCount >= MINIMUM_LEGACY_PILOT_SIZE,
      uniqueSelection: evidence.uniqueSelectedCount === evidence.selectedCount,
      exactCatalogCoverage: catalog !== null
        && catalog.sourceTemplates === evidence.uniqueSelectedCount
        && catalog.templates.length === evidence.uniqueSelectedCount
        && sameStringSet(catalog.templates.map((template) => template.legacySlug), selected.map((template) => template.slug)),
      everyObservedDimensionCovered: coverage.missing.length === 0,
      currentEvidenceComplete,
      everyPilotTemplatePassed: deterministicFailures === 0 && currentEvidenceComplete,
      primaryRepairPreserved: fallbackCount === 0 && currentEvidenceComplete,
    },
  };
  const path = join(context.config.reportRoot, 'pilot-gate.json');
  await atomicWriteFile(context.config, path, `${JSON.stringify(payload, null, 2)}\n`);
  await logEvent(context, passed ? 'pilot.passed' : 'pilot.failed', {
    selected: selected.length,
    deterministicFailures,
    failureRate,
    criticalDefects: render.criticalDefects,
    evidenceIssues: evidence.issues.length,
  });
  return { passed, path };
}

async function inventoryCommand(context: LegacyCommandContext): Promise<LegacyCommandOutcome> {
  const inventory = await inventoryStage(context);
  return {
    message: `Inventoried ${inventory.templateCount.toLocaleString()} templates, ${inventory.pageCount.toLocaleString()} pages, and ${inventory.fileCount.toLocaleString()} files.`,
    details: {
      catalogHash: inventory.catalogHash,
      templates: inventory.templateCount,
      pages: inventory.pageCount,
      files: inventory.fileCount,
      bytes: inventory.sourceBytes,
      remoteUrls: inventory.remoteUrls.length,
    },
  };
}

async function pilotCommand(context: LegacyCommandContext): Promise<LegacyCommandOutcome> {
  checkCancellation(context);
  const inventory = await inventoryStage(context);
  const selected = selectStratifiedPilot(inventory.templates, context.config.pilotSize);
  const slugs = selected.map((template) => template.slug);
  const repair = await repairTemplates(context, inventory, slugs);
  const render = await renderPendingTemplates(context, slugs);
  const failures = repair.staticFailed + render.failedTemplates;
  const catalog = failures === 0 ? await composeCatalog(context, slugs) : null;
  const gate = await writePilotGate(context, selected, inventory.catalogHash, repair, render, catalog, inventory.templates);
  if (!gate.passed) {
    throw new Error(`Pilot gate failed; full processing was not started. Review ${gate.path}`);
  }
  return {
    message: `Pilot passed for ${selected.length} templates (${render.renders} viewport renders). Gate: ${gate.path}`,
    details: { repair, render, catalog, gate: gate.path },
  };
}

async function runCommand(context: LegacyCommandContext): Promise<LegacyCommandOutcome> {
  checkCancellation(context);
  const gatePath = join(context.config.reportRoot, 'pilot-gate.json');
  const gate = JSON.parse(await readFile(gatePath, 'utf8').catch(() => {
    throw new Error(`A passing stratified pilot is required before a full run: ${gatePath}`);
  })) as unknown;
  const authorization = validatePilotGateAuthorization(gate, context.config.ruleVersion);
  const inventory = await inventoryStage(context);
  if (authorization.catalogHash !== inventory.catalogHash) {
    throw new Error('The source catalogue hash differs from the passing pilot; rerun the pilot before full rehabilitation');
  }
  const expectedPilotSlugs = selectStratifiedPilot(inventory.templates, authorization.selectedSlugs.length)
    .map((template) => template.slug);
  if (!sameStringSet(expectedPilotSlugs, authorization.selectedSlugs)) {
    throw new Error('The passing pilot selection is not the current deterministic stratified sample');
  }
  const inventoryBySlug = new Map(inventory.templates.map((template) => [template.slug, template]));
  const selectedInventory = authorization.selectedSlugs
    .map((slug) => inventoryBySlug.get(slug))
    .filter((template): template is LegacyTemplateInventory => Boolean(template));
  const currentCoverage = auditPilotCoverage(inventory.templates, selectedInventory);
  if (
    currentCoverage.universeHash !== authorization.coverageUniverseHash
    || currentCoverage.missing.length > 0
  ) {
    throw new Error(`Pilot authorization does not cover the current catalogue dimensions: ${currentCoverage.missing[0] ?? 'coverage universe changed'}`);
  }
  const pilotCatalogPath = join(context.config.reportRoot, 'pilot-catalog-v3.json');
  const pilotCatalog = JSON.parse(await readFile(pilotCatalogPath, 'utf8').catch(() => {
    throw new Error(`The passing pilot catalogue is missing: ${pilotCatalogPath}`);
  })) as CatalogV3Document;
  const currentPilotEvidence = await auditPilotEvidence(context, selectedInventory, pilotCatalog);
  if (
    selectedInventory.length !== authorization.selectedSlugs.length
    || currentPilotEvidence.issues.length > 0
    || currentPilotEvidence.fallbackSlugs.length > 0
  ) {
    const detail = currentPilotEvidence.issues[0]
      ?? `${currentPilotEvidence.fallbackSlugs.length} pilot template(s) use a neutral fallback`;
    throw new Error(`Pilot authorization is no longer backed by complete current evidence: ${detail}`);
  }
  const repair = await repairTemplates(context, inventory);
  if (repair.neutralFallbacks > 0) {
    const fallbackSlugs = await durablePilotFallbackSlugs(
      context,
      inventory.templates.map((template) => template.slug),
    );
    assertNoNeutralFallbacks('Full catalogue repair', fallbackSlugs);
  }
  const render = await renderPendingTemplates(context);
  const failed = context.ledger.listTemplates({ stages: ['failed'] });
  if (failed.length > 0) {
    throw new Error(`${failed.length} templates remain quarantined after deterministic repair/QA; promotion is blocked`);
  }
  const catalog = await composeCatalog(context);
  if (catalog.sourceTemplates !== inventory.templateCount) {
    throw new Error(`Catalog accounts for ${catalog.sourceTemplates}/${inventory.templateCount} source templates`);
  }
  const finalEvidence = await auditPilotEvidence(context, inventory.templates, catalog);
  if (finalEvidence.issues.length > 0) {
    const recovered = await recoverFailedFinalEvidence(context, finalEvidence);
    throw new Error(
      `Full catalogue evidence audit failed with ${finalEvidence.issues.length} issue(s); `
      + `${recovered} complete template(s) were returned to a resumable checkpoint: ${finalEvidence.issues[0]}`,
    );
  }
  assertNoNeutralFallbacks('Full catalogue completion', finalEvidence.fallbackSlugs);
  await logEvent(context, 'catalog.current_evidence_verified', {
    templates: finalEvidence.uniqueSelectedCount,
    neutralFallbacks: finalEvidence.fallbackSlugs.length,
  });
  const finalInventory = await inventoryLegacyCatalog(context.config.sourceRoot, {
    workers: context.config.staticWorkers,
    signal: context.signal,
  });
  checkCancellation(context);
  if (finalInventory.catalogHash !== inventory.catalogHash) {
    throw new Error(`Immutable source catalogue changed during the run: ${inventory.catalogHash} -> ${finalInventory.catalogHash}`);
  }
  await logEvent(context, 'source.immutability_verified', {
    catalogHash: finalInventory.catalogHash,
    templates: finalInventory.templateCount,
    pages: finalInventory.pageCount,
    files: finalInventory.fileCount,
  });
  return {
    message: `Full rehabilitation completed: ${catalog.sourceTemplates.toLocaleString()} source slugs -> ${catalog.canonicalDesigns.toLocaleString()} canonical designs.`,
    details: { repair, render, catalogPath: join(context.config.reportRoot, 'catalog-v3.json') },
  };
}

async function mirrorTree(source: string, target: string, signal?: AbortSignal): Promise<void> {
  throwIfLegacyCancelled(signal);
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    throwIfLegacyCancelled(signal);
    const sourcePath = resolve(source, entry.name);
    const targetPath = resolve(target, entry.name);
    if (!isWithin(source, sourcePath) || !isWithin(target, targetPath)) throw new Error('Promotion mirror path escaped its root');
    if (entry.isSymbolicLink()) throw new Error(`Promotion refuses symbolic links: ${sourcePath}`);
    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await mirrorTree(sourcePath, targetPath, signal);
    } else if (entry.isFile()) {
      await mkdir(dirname(targetPath), { recursive: true });
      try {
        await link(sourcePath, targetPath);
      } catch {
        await copyFile(sourcePath, targetPath);
      }
    }
  }
}

export function rehabStagingUploaderArgs(root: string): string[] {
  return ['--dry-run', '--root', root, '--rehab-v3-staging'];
}

export function rehabCustomizationVerifierArgs(root: string, workers = 8): string[] {
  return [
    '--root',
    root,
    '--workers',
    String(Math.max(1, Math.min(64, Math.trunc(workers)))),
    '--max-diagnostics',
    '100',
    '--json',
  ];
}

async function runUploaderDryRun(root: string, signal?: AbortSignal): Promise<string> {
  throwIfLegacyCancelled(signal);
  const script = fileURLToPath(new URL('../../../../apps/generator-app/scripts/upload-templates-to-blobs.mjs', import.meta.url));
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn(process.execPath, [script, ...rehabStagingUploaderArgs(root)], {
      cwd: resolve(dirname(script), '..'),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let output = '';
    let settled = false;
    const finish = (operation: () => void): void => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      operation();
    };
    const onAbort = (): void => {
      child.kill();
      const reason = signal?.reason;
      finish(() => reject(reason instanceof Error ? reason : new Error('Uploader verification cancelled')));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    child.stdout.on('data', (chunk) => { output += String(chunk); });
    child.stderr.on('data', (chunk) => { output += String(chunk); });
    child.on('error', (error) => finish(() => reject(error)));
    child.on('close', (code) => finish(() => code === 0
      ? resolvePromise(output)
      : reject(new Error(`Uploader dry-run exited ${code}:\n${output.slice(-8_000)}`))));
  });
}

interface PromotionCustomizationVerification {
  pass: boolean;
  root: string;
  catalogTemplates: number;
  scannedTemplates: number;
  pages: number;
  stylesheets: number;
  contentEntries: number;
  imageSlots: number;
  themeTokens: number;
  diagnosticCount: number;
  diagnostics: Array<{ code: string; detail: string; template?: string; page?: string; targetId?: string }>;
  diagnosticsTruncated: number;
}

async function runCustomizationVerifier(
  root: string,
  workers: number,
  signal?: AbortSignal,
): Promise<PromotionCustomizationVerification> {
  throwIfLegacyCancelled(signal);
  const script = fileURLToPath(new URL('../../../../apps/generator-app/scripts/verify-rehab-customization.ts', import.meta.url));
  const require = createRequire(import.meta.url);
  const tsxCli = require.resolve('tsx/cli');
  return new Promise<PromotionCustomizationVerification>((resolvePromise, reject) => {
    const child = spawn(process.execPath, [tsxCli, script, ...rehabCustomizationVerifierArgs(root, workers)], {
      cwd: resolve(dirname(script), '..'),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (operation: () => void): void => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      operation();
    };
    const appendBounded = (current: string, chunk: unknown): string => `${current}${String(chunk)}`.slice(-2_000_000);
    const onAbort = (): void => {
      child.kill();
      const reason = signal?.reason;
      finish(() => reject(reason instanceof Error ? reason : new Error('Customization verification cancelled')));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    child.stdout.on('data', (chunk) => { stdout = appendBounded(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = appendBounded(stderr, chunk); });
    child.on('error', (error) => finish(() => reject(error)));
    child.on('close', (code) => finish(() => {
      if (code !== 0) {
        reject(new Error(`Customization verifier exited ${code}:\n${`${stdout}\n${stderr}`.trim().slice(-8_000)}`));
        return;
      }
      try {
        const result = JSON.parse(stdout) as PromotionCustomizationVerification;
        if (!result || result.pass !== true || result.diagnosticCount !== 0) {
          throw new Error('Customization verifier returned a non-passing result');
        }
        resolvePromise(result);
      } catch (error) {
        reject(new Error(`Customization verifier returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
      }
    }));
  });
}

export function validatePromotionSourceState(input: {
  ruleVersion: string;
  templates: readonly LegacyTemplateRecord[];
  aliases: readonly LegacyAliasRecord[];
  inventory: Pick<CatalogInventory, 'templateCount' | 'templates'>;
  catalog: CatalogV3Document;
}): void {
  const { ruleVersion, templates, aliases, inventory, catalog } = input;
  if (catalog.contractVersion !== 3) throw new Error('Promotion blocked: catalogue contract is not v3');
  if (catalog.ruleVersion !== ruleVersion) throw new Error('Promotion blocked: catalogue belongs to a stale repair-rule version');
  if (
    templates.length !== inventory.templateCount
    || aliases.length !== inventory.templateCount
    || catalog.sourceTemplates !== inventory.templateCount
    || catalog.templates.length !== inventory.templateCount
  ) {
    throw new Error(
      `Promotion blocked: source/ledger/catalogue coverage differs `
      + `(${inventory.templateCount}/${templates.length}/${aliases.length}/${catalog.templates.length})`,
    );
  }

  const templatesBySlug = new Map<string, LegacyTemplateRecord>();
  for (const template of templates) {
    if (templatesBySlug.has(template.legacySlug)) throw new Error(`Promotion blocked: duplicate ledger slug ${template.legacySlug}`);
    templatesBySlug.set(template.legacySlug, template);
  }
  const mappingsBySlug = new Map<string, CatalogV3Alias>();
  for (const mapping of catalog.templates) {
    if (mappingsBySlug.has(mapping.legacySlug)) throw new Error(`Promotion blocked: duplicate catalogue slug ${mapping.legacySlug}`);
    mappingsBySlug.set(mapping.legacySlug, mapping);
  }
  const aliasesBySlug = new Map<string, LegacyAliasRecord>();
  for (const alias of aliases) {
    if (aliasesBySlug.has(alias.legacySlug)) throw new Error(`Promotion blocked: duplicate alias slug ${alias.legacySlug}`);
    aliasesBySlug.set(alias.legacySlug, alias);
  }
  const inventorySlugs = new Set<string>();
  for (const source of inventory.templates) {
    if (inventorySlugs.has(source.slug)) throw new Error(`Promotion blocked: duplicate source slug ${source.slug}`);
    inventorySlugs.add(source.slug);
    const template = templatesBySlug.get(source.slug);
    if (!template) throw new Error(`Promotion blocked: source template is absent from the ledger: ${source.niche}/${source.slug}`);
    if (template.ruleVersion !== ruleVersion) throw new Error(`Promotion blocked: stale repair rule for ${source.slug}`);
    if (template.niche !== source.niche) throw new Error(`Promotion blocked: stale niche identity for ${source.slug}`);
    if (template.sourceHash !== source.sourceTreeHash) throw new Error(`Promotion blocked: stale source hash for ${source.slug}`);
    if (
      template.stage !== 'complete'
      || (template.terminalDisposition !== 'passing_design' && template.terminalDisposition !== 'passing_alias')
      || !template.resultHash
      || !template.qualityReceipt
    ) {
      throw new Error(`Promotion blocked: ${source.slug} has no complete passing artifact`);
    }
    const mapping = mappingsBySlug.get(source.slug);
    if (!mapping) throw new Error(`Promotion blocked: source template is absent from the catalogue: ${source.niche}/${source.slug}`);
    if (mapping.niche !== source.niche) throw new Error(`Promotion blocked: catalogue niche is stale for ${source.slug}`);
    if (mapping.qualityReceipt !== template.qualityReceipt) {
      throw new Error(`Promotion blocked: catalogue receipt is stale for ${source.slug}`);
    }
    const alias = aliasesBySlug.get(source.slug);
    if (!alias || alias.status !== 'passing') throw new Error(`Promotion blocked: passing alias is missing for ${source.slug}`);
    if (
      alias.templateId !== template.id
      || alias.designId !== mapping.designId
      || alias.contentPresetId !== mapping.contentPresetId
      || alias.themePresetId !== mapping.themePresetId
      || alias.qualityReceipt !== mapping.qualityReceipt
    ) {
      throw new Error(`Promotion blocked: alias record is stale for ${source.slug}`);
    }
    const expectedDisposition = mapping.disposition === 'canonical' ? 'passing_design' : 'passing_alias';
    if (template.terminalDisposition !== expectedDisposition) {
      throw new Error(`Promotion blocked: catalogue disposition is stale for ${source.slug}`);
    }
  }
}

export async function validatePromotionComposition(
  context: LegacyCommandContext,
  template: LegacyTemplateRecord,
  mapping: CatalogV3Alias,
  canonical: LegacyTemplateRecord,
): Promise<{ source: string; composedText: Map<string, string> }> {
  const [canonicalDesign, contentPreset, themePreset] = await Promise.all([
    readRepairSidecar<CanonicalDesign>(context, canonical, 'design.json'),
    readRepairSidecar<ContentPreset>(context, template, 'content-preset.json'),
    readRepairSidecar<ThemePreset>(context, template, 'theme-preset.json'),
  ]);
  if (
    canonicalDesign.id !== mapping.designId
    || contentPreset.id !== mapping.contentPresetId
    || themePreset.id !== mapping.themePresetId
  ) {
    throw new Error(`Composition identifiers do not match the catalogue mapping for ${template.legacySlug}`);
  }
  const composedText = composeCatalogTemplateText(canonicalDesign, contentPreset, themePreset);
  const artifact = artifactForTemplate(context, template);
  if (!artifact) throw new Error(`Missing candidate artifact for ${template.legacySlug}`);
  const source = resolve(context.config.workRoot, artifact.relativePath);
  if (!isWithin(context.config.workRoot, source)) {
    throw new Error(`Candidate artifact escaped work root for ${template.legacySlug}`);
  }
  await validateRecordedArtifact(source, artifact.contentHash);
  for (const [relativePath, value] of composedText) {
    const sourcePath = resolve(source, ...normalizeRelativePath(relativePath).split('/'));
    if (!isWithin(source, sourcePath)) {
      throw new Error(`Composed alias path escaped its artifact root: ${relativePath}`);
    }
    const verifiedValue = await readFile(sourcePath, 'utf8');
    if (verifiedValue !== value) {
      throw new Error(
        `Promotion blocked: canonical design + presets do not reproduce the browser-verified artifact `
        + `for ${template.legacySlug}/${relativePath}`,
      );
    }
  }
  return { source, composedText };
}

async function promoteCommand(context: LegacyCommandContext): Promise<LegacyCommandOutcome> {
  checkCancellation(context);
  if (!context.flags.dryRun) throw new Error('Only dry-run promotion is implemented; production publication remains a separate reviewed action');
  const templates = context.ledger.listTemplates();
  const aliases = context.ledger.listAliases('passing');
  const incomplete = templates.filter((template) => template.stage !== 'complete'
    || !['passing_design', 'passing_alias'].includes(template.terminalDisposition ?? ''));
  if (templates.length !== EXPECTED_LEGACY_TEMPLATE_TOTAL || aliases.length !== EXPECTED_LEGACY_TEMPLATE_TOTAL || incomplete.length > 0) {
    throw new Error(`Promotion blocked: templates=${templates.length}/${EXPECTED_LEGACY_TEMPLATE_TOTAL}, aliases=${aliases.length}/${EXPECTED_LEGACY_TEMPLATE_TOTAL}, incomplete=${incomplete.length}`);
  }
  const catalogPath = join(context.config.reportRoot, 'catalog-v3.json');
  const catalogBytes = await readFile(catalogPath);
  const catalog = JSON.parse(catalogBytes.toString('utf8')) as CatalogV3Document;
  const currentInventory = await inventoryLegacyCatalog(context.config.sourceRoot, {
    workers: context.config.staticWorkers,
    signal: context.signal,
  });
  checkCancellation(context);
  validatePromotionSourceState({
    ruleVersion: context.config.ruleVersion,
    templates,
    aliases,
    inventory: currentInventory,
    catalog,
  });
  const promotionEvidence = await auditPilotEvidence(context, currentInventory.templates, catalog);
  if (promotionEvidence.issues.length > 0) {
    throw new Error(
      `Promotion blocked: current artifact evidence has ${promotionEvidence.issues.length} issue(s): `
      + promotionEvidence.issues[0],
    );
  }
  assertNoNeutralFallbacks('Promotion', promotionEvidence.fallbackSlugs);
  const catalogByKey = new Map(catalog.templates.map((entry) => [`${entry.niche}\0${entry.legacySlug}`, entry]));
  const templateByKey = new Map(templates.map((entry) => [`${entry.niche}\0${entry.legacySlug}`, entry]));
  const catalogHash = digest(catalogBytes);
  const stagingRoot = assertWorkPath(context.config, join(context.config.artifactRoot, 'promotion', catalogHash, 'library'));
  const promotionCacheRoot = resolve(context.config.artifactRoot, 'promotion');
  if (!isWithin(promotionCacheRoot, stagingRoot) || stagingRoot === promotionCacheRoot) {
    throw new Error('Promotion cache target escaped its dedicated root');
  }
  const existingStaging = await lstat(stagingRoot).catch(() => null);
  let reuseStaging = false;
  if (existingStaging) {
    if (existingStaging.isSymbolicLink()) {
      throw new Error(`Promotion refuses a symbolic-link cache root: ${stagingRoot}`);
    }
    if (!existingStaging.isDirectory()) {
      await rm(stagingRoot, { force: true });
    } else {
      try {
        const stagedCatalogPath = resolve(stagingRoot, '_catalog-v3.json');
        if (!isWithin(stagingRoot, stagedCatalogPath) || digest(await readFile(stagedCatalogPath)) !== catalogHash) {
          throw new Error('cached staging catalogue does not match its content-addressed path');
        }
        // A content-addressed staging tree can outlive a crashed or older
        // process. Re-prove every composition against the current
        // browser-verified artifact before reuse.
        for (const template of templates) {
          checkCancellation(context);
          const mapping = catalogByKey.get(`${template.niche}\0${template.legacySlug}`);
          if (!mapping) throw new Error(`Missing catalogue mapping for ${template.niche}/${template.legacySlug}`);
          const canonical = templateByKey.get(`${mapping.niche}\0${mapping.canonicalLegacySlug}`);
          if (!canonical) throw new Error(`Missing canonical template for ${template.niche}/${template.legacySlug}`);
          await validatePromotionComposition(context, template, mapping, canonical);
          const target = resolve(stagingRoot, template.niche, template.legacySlug);
          if (!isWithin(stagingRoot, target)) throw new Error('Promotion target escaped staging root');
          const stagedHash = artifactTree(await readArtifactFiles(target)).hash;
          if (stagedHash !== template.resultHash) {
            throw new Error(`cached staging bytes are stale for ${template.legacySlug}`);
          }
          const receipt = context.ledger.listArtifacts({ templateId: template.id, kind: 'quality-receipt' })
            .find((artifact) => `receipt_${artifact.contentHash}` === template.qualityReceipt);
          if (!receipt) throw new Error(`Missing final quality receipt for ${template.legacySlug}`);
          const receiptSource = resolve(context.config.workRoot, receipt.relativePath);
          const stagedReceipt = resolve(target, '.dailyclarity', 'final-quality-receipt.json');
          if (!isWithin(context.config.workRoot, receiptSource) || !isWithin(target, stagedReceipt)) {
            throw new Error('Quality receipt escaped its expected root');
          }
          const stagedReceiptDetails = await lstat(stagedReceipt).catch(() => null);
          if (
            !stagedReceiptDetails?.isFile()
            || stagedReceiptDetails.isSymbolicLink()
            || digest(await readFile(stagedReceipt)) !== digest(await readFile(receiptSource))
          ) {
            throw new Error(`cached final receipt is stale for ${template.legacySlug}`);
          }
        }
        reuseStaging = true;
      } catch (error) {
        if (context.signal?.aborted) throw error;
        await rm(stagingRoot, { recursive: true, force: true });
        await logEvent(context, 'promotion.cache_reaped', {
          catalogHash,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  if (!reuseStaging) {
    const staging = assertWorkPath(context.config, join(context.config.artifactRoot, '.staging', `promotion-${randomUUID()}`));
    await mkdir(staging, { recursive: true });
    try {
      for (const template of templates) {
        checkCancellation(context);
        const mapping = catalogByKey.get(`${template.niche}\0${template.legacySlug}`);
        if (!mapping) throw new Error(`Missing catalogue mapping for ${template.niche}/${template.legacySlug}`);
        const canonical = templateByKey.get(`${mapping.niche}\0${mapping.canonicalLegacySlug}`);
        if (!canonical) throw new Error(`Missing canonical template for ${template.niche}/${template.legacySlug}`);
        const { source, composedText } = await validatePromotionComposition(context, template, mapping, canonical);
        const target = resolve(staging, template.niche, template.legacySlug);
        if (!isWithin(staging, target)) throw new Error('Promotion target escaped staging root');
        await mkdir(target, { recursive: true });
        await mirrorTree(source, target, context.signal);
        for (const [relativePath, value] of composedText) {
          const targetPath = resolve(target, ...normalizeRelativePath(relativePath).split('/'));
          if (!isWithin(target, targetPath)) {
            throw new Error(`Composed alias path escaped its artifact root: ${relativePath}`);
          }
          // Write the resolved composition explicitly. The equality check above
          // preserves the existing immutable tree hash and its render receipt.
          await atomicWriteFile(context.config, targetPath, value);
        }
        const receipt = context.ledger.listArtifacts({ templateId: template.id, kind: 'quality-receipt' })
          .find((artifact) => `receipt_${artifact.contentHash}` === template.qualityReceipt);
        if (!receipt) throw new Error(`Missing final quality receipt for ${template.legacySlug}`);
        const receiptSource = resolve(context.config.workRoot, receipt.relativePath);
        if (!isWithin(context.config.workRoot, receiptSource)) throw new Error('Quality receipt escaped work root');
        await mkdir(join(target, '.dailyclarity'), { recursive: true });
        await copyFile(receiptSource, join(target, '.dailyclarity', 'final-quality-receipt.json'));
      }
      await atomicWriteFile(context.config, join(staging, '_catalog-v3.json'), catalogBytes);
      await mkdir(dirname(stagingRoot), { recursive: true });
      await rename(staging, stagingRoot);
    } catch (error) {
      if (isWithin(context.config.artifactRoot, staging)) await rm(staging, { recursive: true, force: true });
      throw error;
    }
  }
  checkCancellation(context);
  const uploaderOutput = await runUploaderDryRun(stagingRoot, context.signal);
  checkCancellation(context);
  if (!/\b0 quarantined\b/i.test(uploaderOutput)) throw new Error(`Uploader did not confirm zero quarantined templates:\n${uploaderOutput.slice(-8_000)}`);
  const customizationVerification = await runCustomizationVerifier(
    stagingRoot,
    context.config.staticWorkers,
    context.signal,
  );
  checkCancellation(context);
  if (
    customizationVerification.catalogTemplates !== templates.length
    || customizationVerification.scannedTemplates !== templates.length
  ) {
    throw new Error(
      `Customization verifier coverage mismatch: `
      + `${customizationVerification.scannedTemplates}/${customizationVerification.catalogTemplates}/${templates.length}`,
    );
  }
  const finalInventory = await inventoryLegacyCatalog(context.config.sourceRoot, {
    workers: context.config.staticWorkers,
    signal: context.signal,
  });
  checkCancellation(context);
  if (finalInventory.catalogHash !== currentInventory.catalogHash) {
    throw new Error(
      `Promotion blocked: immutable source changed during verification `
      + `(${currentInventory.catalogHash} -> ${finalInventory.catalogHash})`,
    );
  }
  const planPath = join(context.config.reportRoot, 'promotion-dry-run.json');
  const plan = {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    publicationPerformed: false,
    catalogHash,
    sourceCatalogHash: finalInventory.catalogHash,
    stagingRoot,
    sourceTemplates: templates.length,
    aliases: aliases.length,
    uploaderOutput,
    customizationVerification,
    rollout: ['staging', 'one canary batch per niche', 'immutable assets', 'manifest switch last', 'retain prior manifest for rollback'],
  };
  await atomicWriteFile(context.config, planPath, `${JSON.stringify(plan, null, 2)}\n`);
  return {
    message: `Promotion dry-run passed with zero quarantined candidates. No upload occurred. Plan: ${planPath}`,
    details: plan,
  };
}

function htmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function reportCommand(
  context: Omit<LegacyCommandContext, 'runId'> & { runId?: string },
): Promise<LegacyCommandOutcome> {
  const generatedAt = new Date().toISOString();
  const status = context.ledger.reportData();
  const templates = context.ledger.listTemplates();
  const aliases = context.ledger.listAliases();
  const issues = context.ledger.listIssues({ unresolved: true, current: true });
  const renders = context.ledger.listRenders();
  const receipts = context.ledger.listArtifacts({ kind: 'quality-receipt' });
  const receiptKeys = new Set(receipts
    .filter((receipt) => receipt.templateId !== null)
    .map((receipt) => `${receipt.templateId}\0receipt_${receipt.contentHash}`));
  const currentReceiptCount = templates.filter((template) => template.qualityReceipt
    && receiptKeys.has(`${template.id}\0${template.qualityReceipt}`)).length;
  const issueCounts = new Map<string, number>();
  for (const item of issues) issueCounts.set(item.code, (issueCounts.get(item.code) ?? 0) + 1);
  const topIssues = [...issueCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 30);
  const completed = templates.filter((template) => template.stage === 'complete').length;
  const canonical = templates.filter((template) => template.terminalDisposition === 'passing_design').length;
  const passingAliases = templates.filter((template) => template.terminalDisposition === 'passing_alias').length;
  const currentNeutralFallbacks: string[] = [];
  const unreadableFallbackMetadata: string[] = [];
  for (const template of templates) {
    if (!template.resultHash) continue;
    const artifact = artifactForTemplate(context, template);
    if (!artifact) continue;
    const metadataPath = resolve(context.config.workRoot, artifact.relativePath, '.dailyclarity', 'rehabilitation.json');
    if (!isWithin(context.config.workRoot, metadataPath)) {
      unreadableFallbackMetadata.push(template.legacySlug);
      continue;
    }
    try {
      const metadataDetails = await lstat(metadataPath).catch(() => null);
      if (!metadataDetails?.isFile() || metadataDetails.isSymbolicLink()) {
        throw new Error('rehabilitation metadata is not a safe regular file');
      }
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as {
        repairMode?: unknown;
        renderRemediation?: unknown;
      };
      if (metadata.repairMode === 'neutral_fallback' || metadata.renderRemediation === 'neutral') {
        currentNeutralFallbacks.push(template.legacySlug);
      }
    } catch {
      unreadableFallbackMetadata.push(template.legacySlug);
    }
  }
  currentNeutralFallbacks.sort();
  unreadableFallbackMetadata.sort();
  const quarantined = templates.filter((template) => template.terminalDisposition === 'quarantined'
    || template.terminalDisposition === 'failed').length;
  const primaryPassing = Math.max(0, completed - currentNeutralFallbacks.length);
  const markdown = `# Legacy Catalogue Rehabilitation Report\n\nGenerated: ${generatedAt}\n\n## Coverage\n\n- Source templates recorded: ${templates.length.toLocaleString()} / ${EXPECTED_LEGACY_TEMPLATE_TOTAL.toLocaleString()}\n- Terminal passing mappings: ${completed.toLocaleString()}\n- Primary repaired passing mappings: ${primaryPassing.toLocaleString()}\n- Current neutral-fallback mappings: ${currentNeutralFallbacks.length.toLocaleString()}\n- Quarantined or failed mappings: ${quarantined.toLocaleString()}\n- Canonical designs: ${canonical.toLocaleString()}\n- Passing aliases: ${passingAliases.toLocaleString()}\n- Current browser-final quality receipts (ledger/catalogue): ${currentReceiptCount.toLocaleString()}\n- Historical quality receipts retained: ${receipts.length.toLocaleString()}\n- Browser renders: ${renders.length.toLocaleString()}\n- Failed browser renders: ${renders.filter((render) => render.status === 'failed').length.toLocaleString()}\n- Cloud model tokens accounted: ${status.modelBudget.accountedTokens.toLocaleString()} / ${status.modelBudget.tokenCap.toLocaleString()}\n- Cloud model spend accounted: $${status.modelBudget.accountedCostUsd.toFixed(4)} / $${status.modelBudget.dollarCapUsd.toFixed(2)}\n\n## Current neutral fallbacks\n\n${currentNeutralFallbacks.length ? currentNeutralFallbacks.map((slug) => `- ${slug}`).join('\n') : '- None'}\n${unreadableFallbackMetadata.length ? `\nUnreadable current rehabilitation metadata (${unreadableFallbackMetadata.length}): ${unreadableFallbackMetadata.join(', ')}` : ''}\n\n## Safety state\n\n- Source catalogue was read only; all generated work is under: ${context.config.workRoot}\n- Production publication performed: no\n- Promotion remains gated behind \`templates:legacy promote --dry-run\`.\n- Every public candidate requires a matching browser-backed quality receipt.\n- Candidate-local \`template.json\` and \`.dailyclarity/quality-receipt.json\` identify the deterministic static preflight. The ledger, root catalogue, and promoted \`final-quality-receipt.json\` carry the authoritative browser-final receipt.\n\n## Remaining unresolved issues\n\nOnly issues scoped to each template's current source hash, repair rule, and candidate artifact are shown. Superseded issue history remains in SQLite.\n\n${topIssues.length ? topIssues.map(([code, count]) => `- ${code}: ${count.toLocaleString()}`).join('\n') : '- None'}\n\n## Ledger snapshot\n\n\`\`\`json\n${JSON.stringify(status, null, 2)}\n\`\`\`\n`;
  const markdownPath = join(context.config.reportRoot, 'legacy-rehab-report.md');
  await atomicWriteFile(context.config, markdownPath, markdown);

  const successfulHomeThumbnails = new Map<string, LegacyRenderRecord>();
  for (const render of renders) {
    if (render.status !== 'passed' || render.viewport !== 'desktop' || !render.artifactPath) continue;
    if (context.ledger.getPage(render.pageId)?.relativePath !== 'index.html') continue;
    const template = context.ledger.getTemplate(render.templateId);
    if (template) successfulHomeThumbnails.set(template.legacySlug, render);
  }
  const sourceInventory = await inventoryLegacyCatalog(context.config.sourceRoot, {
    expectedCounts: false,
    workers: context.config.staticWorkers,
  });
  const eligibleTemplates = sourceInventory.templates
    .filter((template) => successfulHomeThumbnails.has(template.slug));
  const selectedTemplates = eligibleTemplates.length === 0
    ? []
    : selectStratifiedPilot(eligibleTemplates, Math.min(300, eligibleTemplates.length));
  const sample = selectedTemplates.map((template) => successfulHomeThumbnails.get(template.slug)!);
  // Measure the sample against the source catalogue, not merely against the
  // subset that happens to have a thumbnail. Otherwise losing every preview
  // for one foundation/topology would silently remove that dimension from the
  // report's claimed coverage universe.
  const contactSheetCoverage = auditPilotCoverage(sourceInventory.templates, selectedTemplates);
  const fullCatalogueReady = sourceInventory.templateCount === EXPECTED_LEGACY_TEMPLATE_TOTAL
    && templates.length === EXPECTED_LEGACY_TEMPLATE_TOTAL
    && completed === EXPECTED_LEGACY_TEMPLATE_TOTAL;
  if (fullCatalogueReady && (selectedTemplates.length !== 300 || contactSheetCoverage.missing.length > 0)) {
    throw new Error(
      `A complete catalogue requires a 300-template coverage-stratified contact sheet: `
      + `sample=${selectedTemplates.length}/300, missing=${contactSheetCoverage.missing[0] ?? 'none'}`,
    );
  }
  await Promise.all(sample.map(async (render) => {
    const thumbnailPath = resolve(context.config.workRoot, render.artifactPath!);
    if (!isWithin(context.config.renderRoot, thumbnailPath)) {
      throw new Error(`Contact-sheet thumbnail escaped the render root: ${render.artifactPath}`);
    }
    const details = await lstat(thumbnailPath).catch(() => null);
    if (!details?.isFile() || details.isSymbolicLink() || details.size === 0) {
      throw new Error(`Contact-sheet thumbnail is missing or unsafe: ${thumbnailPath}`);
    }
  }));
  const cards = sample.map((render) => {
    const template = context.ledger.getTemplate(render.templateId);
    const src = relative(
      context.config.reportRoot,
      resolve(context.config.workRoot, render.artifactPath!),
    ).replace(/\\/g, '/');
    return `<figure><img loading="lazy" src="${htmlEscape(src)}" alt="${htmlEscape(template?.legacySlug ?? 'template')} desktop preview"><figcaption>${htmlEscape(template ? `${template.niche}/${template.legacySlug}` : String(render.templateId))}</figcaption></figure>`;
  }).join('\n');
  const contactSheet = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Legacy rehabilitation contact sheet</title><style>body{font-family:system-ui;margin:24px;background:#f4f5f3;color:#17201b}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}figure{margin:0;background:white;border:1px solid #d9dedb;border-radius:10px;overflow:hidden}img{width:100%;display:block;aspect-ratio:16/10;object-fit:cover;object-position:top}figcaption{padding:8px;font-size:12px;overflow-wrap:anywhere}</style></head><body><h1>Stratified rehabilitation contact sheet</h1><p>${sample.length} passing desktop previews selected coverage-first from current evidence. Source-catalogue coverage gaps: ${contactSheetCoverage.missing.length}. Review is required before publication.</p><main>${cards}</main></body></html>`;
  const contactSheetPath = join(context.config.reportRoot, 'contact-sheet.html');
  await atomicWriteFile(context.config, contactSheetPath, contactSheet);
  const contactSheetManifestPath = join(context.config.reportRoot, 'contact-sheet.json');
  await atomicWriteFile(context.config, contactSheetManifestPath, `${JSON.stringify({
    version: 1,
    generatedAt,
    eligiblePassingHomepages: eligibleTemplates.length,
    sampleSize: selectedTemplates.length,
    coverage: contactSheetCoverage,
    templates: selectedTemplates.map((template) => {
      const render = successfulHomeThumbnails.get(template.slug)!;
      return {
        legacySlug: template.slug,
        niche: template.niche,
        sourceHash: template.sourceTreeHash,
        screenshotHash: render.screenshotHash,
        perceptualHash: render.perceptualHash,
        artifactPath: relative(context.config.workRoot, render.artifactPath!).replace(/\\/g, '/'),
      };
    }),
  }, null, 2)}\n`);
  return {
    message: `Audit report: ${markdownPath}\nContact sheet: ${contactSheetPath}`,
    details: {
      markdownPath,
      contactSheetPath,
      contactSheetManifestPath,
      sourceTemplates: templates.length,
      mappings: aliases.length,
      completed,
      canonical,
      passingAliases,
      primaryPassing,
      currentNeutralFallbacks,
      quarantined,
      unreadableFallbackMetadata,
      currentReceiptCount,
      unresolvedIssues: issues.length,
    },
  };
}

export const legacyCommandServices: LegacyCommandServices = {
  inventory: inventoryCommand,
  pilot: pilotCommand,
  run: runCommand,
  promote: promoteCommand,
  report: reportCommand,
};

export default legacyCommandServices;
