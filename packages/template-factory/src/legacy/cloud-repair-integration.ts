import { createHash } from 'node:crypto';
import { parse, parseFragment, serialize, serializeOuter } from 'parse5';
import {
  prepareCloudRepairLane,
  reconcileCloudRepairLane,
  submitCloudRepairLane,
  validateCloudRepairPatch,
  type CloudLaneLedger,
  type CloudLaneOutcome,
  type CloudRepairBatchClient,
  type CloudRepairFragment,
} from './cloud-lane.js';
import type { HtmlNode } from './repair.js';
import { throwIfLegacyCancelled, type LegacyCompilerConfig } from './types.js';

const MAX_FRAGMENT_CHARACTERS = 18_000;
const TEMPORARY_NODE_ID = 'data-dc-node-id';
const STRIPPED_ID_ATTRIBUTES = new Set([
  TEMPORARY_NODE_ID,
  'data-dc-edit-id',
  'data-pb-edit-id',
  'data-dc-image-id',
]);

export interface CloudRepairStaticError {
  code: string;
  page?: string;
  detail: string;
}

export interface CloudRepairPlanMember {
  page: string;
  fragment: CloudRepairFragment;
  pageSha256: string;
  structureSha256: string;
  allowedNodeIds: string[];
}

export type CloudRepairPlan =
  | {
      eligible: true;
      members: CloudRepairPlanMember[];
      fragments: CloudRepairFragment[];
    }
  | {
      eligible: false;
      reason: string;
    };

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function walk(node: HtmlNode, visit: (node: HtmlNode) => void): void {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
}

function elements(node: HtmlNode, tagName: string): HtmlNode[] {
  const found: HtmlNode[] = [];
  walk(node, (candidate) => {
    if (candidate.tagName?.toLowerCase() === tagName) found.push(candidate);
  });
  return found;
}

function removeAttribute(node: HtmlNode, name: string): void {
  if (!node.attrs) return;
  node.attrs = node.attrs.filter((attribute) => attribute.name.toLowerCase() !== name);
}

function setAttribute(node: HtmlNode, name: string, value: string): void {
  node.attrs ??= [];
  const existing = node.attrs.find((attribute) => attribute.name.toLowerCase() === name);
  if (existing) existing.value = value;
  else node.attrs.push({ name, value });
}

function instrumentMain(html: string): {
  document: HtmlNode;
  main: HtmlNode;
  fragment: string;
  structureSha256: string;
  allowedNodeIds: string[];
} {
  const document = parse(html) as unknown as HtmlNode;
  const mains = elements(document, 'main');
  if (mains.length !== 1) throw new Error(`Expected exactly one main landmark; found ${mains.length}`);
  const main = mains[0]!;
  let nodeIndex = 0;
  const allowedNodeIds: string[] = [];
  walk(main, (node) => {
    if (!node.tagName) return;
    for (const attribute of STRIPPED_ID_ATTRIBUTES) removeAttribute(node, attribute);
    const id = `cloud-n${nodeIndex++}`;
    setAttribute(node, TEMPORARY_NODE_ID, id);
    allowedNodeIds.push(id);
  });
  const structure = (node: HtmlNode): unknown => {
    if (node.nodeName === '#text') return '#text';
    if (!node.tagName) return (node.childNodes ?? []).map(structure);
    const attributes = (node.attrs ?? [])
      .filter((attribute) => attribute.name !== TEMPORARY_NODE_ID)
      .map((attribute) => {
        const name = attribute.name.toLowerCase();
        // Preserve attributes that determine element behavior while removing
        // customer copy and styling from the recipe-cluster identity.
        const structuralValue = ['type', 'role', 'rel', 'target', 'method'].includes(name)
          ? attribute.value.toLowerCase()
          : '';
        return [name, structuralValue];
      })
      .sort(([left], [right]) => left!.localeCompare(right!));
    return [node.tagName.toLowerCase(), attributes, ...(node.childNodes ?? []).map(structure)];
  };
  return {
    document,
    main,
    fragment: serializeOuter(main as never),
    structureSha256: sha256(JSON.stringify(structure(main))),
    allowedNodeIds,
  };
}

function pageFromContractDetail(detail: string, pages: ReadonlyMap<string, string | Uint8Array>): string | undefined {
  return [...pages.keys()]
    .filter((page) => /\.html?$/i.test(page))
    .sort((left, right) => right.length - left.length)
    .find((page) => detail.startsWith(`${page}:`));
}

function classifyPageLocalError(error: CloudRepairStaticError): { page: string; issueCode: string } | null {
  if (error.code === 'missing_heading' && error.page) {
    return { page: error.page, issueCode: 'missing_heading' };
  }
  if (error.code !== 'publication_contract' || !error.page) return null;
  const classifications: Array<[RegExp, string]> = [
    [/contains unsupported template expression/i, 'unsupported_expression'],
    [/contains an unmatched or unsupported template expression/i, 'unmatched_expression'],
    [/unexpected unresolved token/i, 'unresolved_editorial_token'],
    [/contains placeholder /i, 'sample_identity_copy'],
    [/contains generated placeholder business name/i, 'sample_business_copy'],
    [/contains unverified testimonial or review content/i, 'unsupported_proof'],
    [/contains hard-coded offer price/i, 'fixed_price'],
    [/contains unverified percentage result/i, 'unsupported_percentage'],
    [/contains (?:guaranteed|unsupported) outcome claim/i, 'unsupported_guarantee'],
    [/contains a hard-coded email address/i, 'literal_email_copy'],
    [/contains a hard-coded phone number/i, 'literal_phone_copy'],
  ];
  const classification = classifications.find(([pattern]) => pattern.test(error.detail));
  return classification ? { page: error.page, issueCode: `publication_${classification[1]}` } : null;
}

/**
 * Select only page-local content failures that can be represented by one
 * bounded main fragment. One unrepairable error makes the whole plan
 * ineligible, preventing spend that cannot produce a passing artifact.
 */
export function planCloudRepairFragments(input: {
  files: ReadonlyMap<string, string | Uint8Array>;
  errors: readonly CloudRepairStaticError[];
  niche: string;
  pageRoles: Readonly<Record<string, string>>;
  templateId: number;
  attempt: 1 | 2;
}): CloudRepairPlan {
  if (input.errors.length === 0) return { eligible: false, reason: 'No unresolved deterministic failures' };
  const normalizedErrors = input.errors.map((error) => {
    if (error.page || error.code !== 'publication_contract') return error;
    const inferred = pageFromContractDetail(error.detail, input.files);
    return inferred ? { ...error, page: inferred } : error;
  });
  const classified = normalizedErrors.map(classifyPageLocalError);
  const firstUnsupported = classified.findIndex((value) => value === null);
  if (firstUnsupported >= 0) {
    return {
      eligible: false,
      reason: `Deterministic failure ${normalizedErrors[firstUnsupported]!.code} is not safe for fragment repair`,
    };
  }

  const byPage = new Map<string, string[]>();
  for (const item of classified as Array<{ page: string; issueCode: string }>) {
    const codes = byPage.get(item.page) ?? [];
    codes.push(item.issueCode);
    byPage.set(item.page, codes);
  }

  const members: CloudRepairPlanMember[] = [];
  for (const [page, rawIssueCodes] of [...byPage].sort(([left], [right]) => left.localeCompare(right))) {
    const html = input.files.get(page);
    if (typeof html !== 'string') return { eligible: false, reason: `${page} is not a textual HTML artifact` };
    let instrumented: ReturnType<typeof instrumentMain>;
    try {
      instrumented = instrumentMain(html);
    } catch (error) {
      return { eligible: false, reason: `${page}: ${error instanceof Error ? error.message : String(error)}` };
    }
    if (instrumented.fragment.length > MAX_FRAGMENT_CHARACTERS) {
      return { eligible: false, reason: `${page} has no safely bounded repair fragment` };
    }
    const issueCodes = [...new Set(rawIssueCodes)].sort();
    if (issueCodes.includes('missing_heading') && /<h[1-6]\b/i.test(instrumented.fragment)) {
      return { eligible: false, reason: `${page} changed after the missing-heading failure was recorded` };
    }
    const pageRole = input.pageRoles[page] ?? 'other';
    const issueFingerprint = sha256(JSON.stringify({
      contract: 2,
      niche: input.niche,
      pageRole,
      issueCodes,
      structureSha256: instrumented.structureSha256,
    }));
    const fragment: CloudRepairFragment = {
      id: `t${input.templateId}.a${input.attempt}.p${sha256(page).slice(0, 16)}`,
      issueFingerprint,
      issueCodes,
      niche: input.niche,
      pageRole,
      fragment: instrumented.fragment,
      attempt: input.attempt,
      templateId: input.templateId,
    };
    members.push({
      page,
      fragment,
      pageSha256: sha256(html),
      structureSha256: instrumented.structureSha256,
      allowedNodeIds: instrumented.allowedNodeIds,
    });
  }
  return { eligible: true, members, fragments: members.map((member) => member.fragment) };
}

function nodeMap(root: HtmlNode): Map<string, HtmlNode> {
  const result = new Map<string, HtmlNode>();
  walk(root, (node) => {
    const id = node.attrs?.find((attribute) => attribute.name === TEMPORARY_NODE_ID)?.value;
    if (!id) return;
    if (result.has(id)) throw new Error(`Duplicate temporary cloud node id: ${id}`);
    result.set(id, node);
  });
  return result;
}

function replaceNode(target: HtmlNode, replacements: HtmlNode[]): void {
  const parent = target.parentNode;
  if (!parent?.childNodes) throw new Error('Cloud patch cannot replace the document root');
  const index = parent.childNodes.indexOf(target);
  if (index < 0) throw new Error('Cloud patch target is detached');
  for (const replacement of replacements) replacement.parentNode = parent;
  parent.childNodes.splice(index, 1, ...replacements);
}

function applyPatch(document: HtmlNode, patch: Extract<CloudLaneOutcome, { kind: 'patch' }>['patch']): void {
  for (const operation of patch.operations) {
    const targets = nodeMap(document);
    const target = targets.get(operation.nodeId);
    if (!target) throw new Error(`Cloud patch target disappeared before operation: ${operation.nodeId}`);
    switch (operation.op) {
      case 'replace_text': {
        const text = { nodeName: '#text', value: operation.value, parentNode: target } as HtmlNode;
        target.childNodes = [text];
        break;
      }
      case 'replace_attribute':
        setAttribute(target, operation.attribute, operation.value);
        break;
      case 'remove_node':
        replaceNode(target, []);
        break;
      case 'replace_fragment': {
        const fragment = parseFragment(operation.safeHtml) as unknown as HtmlNode;
        const replacements = fragment.childNodes ?? [];
        if (replacements.length === 0) throw new Error('Cloud replacement fragment is empty');
        replaceNode(target, replacements);
        break;
      }
    }
  }
}

/** Apply only validated patch outcomes, rechecking every member's exact bytes and structure. */
export function applyCloudRepairPatches(
  files: ReadonlyMap<string, string | Uint8Array>,
  plan: Extract<CloudRepairPlan, { eligible: true }>,
  outcomes: readonly CloudLaneOutcome[],
): { files: Map<string, string | Uint8Array>; appliedMembers: number } {
  const output = new Map(files);
  const patches = new Map<string, Extract<CloudLaneOutcome, { kind: 'patch' }>>();
  for (const outcome of outcomes) {
    if (outcome.kind !== 'patch') continue;
    if (patches.has(outcome.issueFingerprint)) throw new Error('Cloud lane returned duplicate patches for one cluster');
    patches.set(outcome.issueFingerprint, outcome);
  }
  let appliedMembers = 0;
  for (const member of plan.members) {
    const outcome = patches.get(member.fragment.issueFingerprint);
    if (!outcome) continue;
    if (!outcome.fragmentIds.includes(member.fragment.id)) throw new Error('Cloud patch does not name its clustered member');
    const html = output.get(member.page);
    if (typeof html !== 'string' || sha256(html) !== member.pageSha256) {
      throw new Error(`${member.page} changed after cloud repair preparation`);
    }
    const instrumented = instrumentMain(html);
    if (instrumented.structureSha256 !== member.structureSha256) {
      throw new Error(`${member.page} no longer satisfies the cloud patch structural precondition`);
    }
    if (
      instrumented.allowedNodeIds.length !== member.allowedNodeIds.length
      || instrumented.allowedNodeIds.some((id, index) => id !== member.allowedNodeIds[index])
    ) throw new Error(`${member.page} cloud node mapping changed`);
    validateCloudRepairPatch(outcome.patch, member.fragment.issueFingerprint, member.allowedNodeIds);
    applyPatch(instrumented.document, outcome.patch);
    walk(instrumented.document, (node) => removeAttribute(node, TEMPORARY_NODE_ID));
    output.set(member.page, serialize(instrumented.document as never));
    appliedMembers += 1;
  }
  return { files: output, appliedMembers };
}

function waitForPoll(milliseconds: number, signal?: AbortSignal): Promise<void> {
  throwIfLegacyCancelled(signal);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    const onAbort = (): void => {
      clearTimeout(timeout);
      try {
        throwIfLegacyCancelled(signal);
      } catch (error) {
        reject(error);
      }
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Prepare, submit, and durably reconcile one explicitly authorized batch. */
export async function executeCloudRepairLane(input: {
  config: LegacyCompilerConfig;
  ledger: CloudLaneLedger;
  client: CloudRepairBatchClient;
  runId: string;
  laneId: string;
  fragments: readonly CloudRepairFragment[];
  signal?: AbortSignal;
  pollIntervalMs?: number;
  onPoll?: () => void | Promise<void>;
}): Promise<CloudLaneOutcome[]> {
  throwIfLegacyCancelled(input.signal);
  let result = await prepareCloudRepairLane({
    config: input.config,
    ledger: input.ledger,
    runId: input.runId,
    laneId: input.laneId,
    fragments: input.fragments,
  });
  if (result.pending) {
    result = await submitCloudRepairLane({
      config: input.config,
      ledger: input.ledger,
      client: input.client,
      laneId: input.laneId,
    });
  }
  while (result.pending) {
    throwIfLegacyCancelled(input.signal);
    result = await reconcileCloudRepairLane({
      config: input.config,
      ledger: input.ledger,
      client: input.client,
      laneId: input.laneId,
    });
    if (!result.pending) break;
    await input.onPoll?.();
    await waitForPoll(input.pollIntervalMs ?? 15_000, input.signal);
  }
  return result.outcomes;
}
