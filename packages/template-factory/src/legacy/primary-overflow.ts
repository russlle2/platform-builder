import { posix } from 'node:path';
import { parse, parseFragment, serialize } from 'parse5';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { resolveStaticSelectorTargets, type HtmlNode } from './repair.js';

const CLIP_ATTRIBUTE = 'data-dc-decoration-clip';
const CLIP_STYLE = 'all:unset!important;direction:inherit!important;unicode-bidi:normal!important;display:block!important;position:absolute!important;inset:0!important;margin:0!important;padding:0!important;border:0!important;overflow-x:clip!important;overflow-y:visible!important;pointer-events:none!important';
const attr = (node: HtmlNode, name: string): string | undefined => node.attrs?.find(item => item.name === name)?.value;
const text = (node: HtmlNode): string => node.nodeName === '#text' ? node.value ?? '' : (node.childNodes ?? []).map(text).join('');
function walk(node: HtmlNode, visit: (item: HtmlNode) => void): void {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
}

function localReference(owner: string, reference: string): string | undefined {
  if (/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(reference)) return undefined;
  const pathname = reference.split(/[?#]/, 1)[0]!;
  return posix.normalize(pathname.startsWith('/') ? pathname.slice(1) : posix.join(posix.dirname(owner), pathname));
}

function linkedSheets(page: string, document: HtmlNode, styles: Record<string, string>, roots: Map<string, postcss.Root>): string[] {
  const actualPaths = new Map(Object.keys(styles).map(path => [path.replace(/\\/g, '/').toLowerCase(), path]));
  const linked = new Set<string>();
  const add = (owner: string, reference: string): void => {
    const target = localReference(owner, reference);
    const actual = target && actualPaths.get(target.toLowerCase());
    if (!actual || linked.has(actual)) return;
    linked.add(actual);
    const root = roots.get(actual);
    root?.walkAtRules('import', rule => {
      const reference = rule.params.match(/^(?:url\(\s*)?['"]([^'"]+)['"]/i)?.[1]
        ?? rule.params.match(/^url\(\s*([^\s)]+)\s*\)/i)?.[1];
      if (reference) add(actual, reference);
    });
  };
  walk(document, node => {
    if (node.tagName === 'link' && (attr(node, 'rel') ?? '').split(/\s+/).includes('stylesheet')) {
      add(page, attr(node, 'href') ?? '');
    }
    if (node.tagName !== 'style') return;
    try {
      postcss.parse(text(node)).walkAtRules('import', rule => {
        const reference = rule.params.match(/^(?:url\(\s*)?['"]([^'"]+)['"]/i)?.[1]
          ?? rule.params.match(/^url\(\s*([^\s)]+)\s*\)/i)?.[1];
        if (reference) add(page, reference);
      });
    } catch { /* Malformed CSS cannot establish applicability. */ }
  });
  return [...linked];
}

function pureDecoration(node: HtmlNode): boolean {
  if (attr(node, 'aria-hidden') !== 'true' && attr(node, 'data-dc-decoration') !== 'pointer-layer') return false;
  let meaningful = false;
  walk(node, child => {
    if (['a', 'button', 'input', 'select', 'textarea', 'details', 'summary', 'iframe', 'video', 'audio', 'canvas'].includes(child.tagName ?? '')
      || attr(child, 'tabindex') !== undefined || attr(child, 'contenteditable') !== undefined
      || attr(child, 'data-dc-edit-id') !== undefined || attr(child, 'data-dc-image-id') !== undefined) meaningful = true;
    if (child.tagName === 'img' && attr(child, 'aria-hidden') !== 'true' && (attr(child, 'alt') ?? '').trim()) meaningful = true;
    // SVG title/desc/text are retained inside explicitly aria-hidden artwork.
    if (node.tagName !== 'svg' && child.nodeName === '#text' && child.value?.trim()) meaningful = true;
  });
  return !meaningful;
}

function declarations(rule: postcss.Rule): Map<string, string> {
  const result = new Map<string, { value: string; important: boolean }>();
  for (const node of rule.nodes ?? []) {
    if (node.type !== 'decl') continue;
    const name = node.prop.toLowerCase();
    if (!result.get(name)?.important || node.important) result.set(name, { value: node.value.trim(), important: !!node.important });
  }
  return new Map([...result].map(([key, item]) => [key, item.value]));
}

type BoundRule = { rule: postcss.Rule; selector: string; targets: HtmlNode[] | undefined };
function nodeDeclarations(node: HtmlNode, rules: BoundRule[]): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const add = (values: Map<string, string>): void => {
    for (const [key, value] of values) {
      const set = result.get(key) ?? new Set<string>();
      set.add(value);
      result.set(key, set);
    }
  };
  for (const rule of rules) if (rule.targets?.includes(node)) add(declarations(rule.rule));
  const inline = attr(node, 'style');
  if (inline) try { postcss.parse(`x{${inline}}`).walkRules(rule => add(declarations(rule))); } catch { /* Fail closed. */ }
  return result;
}

function hasHorizontalOvershoot(values: Map<string, Set<string>>): boolean {
  return ['left', 'right', 'inset', 'inset-inline', 'inset-inline-start', 'inset-inline-end'].some(property =>
    [...values.get(property) ?? []].some(value => /(?:^|\s)-(?:\d|\.\d)/.test(value)))
    || [...values.get('transform') ?? []].some(value => value !== 'none')
    || [...values.get('width') ?? []].some(value => /^(?:1\d\d|[2-9]\d{2,})%$/.test(value) && Number.parseFloat(value) > 100);
}

/** Broaden conditional selectors only to decide whether topology is unsafe. */
function possibleTargets(document: HtmlNode, selector: string): HtmlNode[] | undefined {
  const exact = resolveStaticSelectorTargets(document, selector);
  if (exact !== undefined) return exact;
  try {
    const parsed = selectorParser().astSync(selector);
    parsed.walkPseudos(pseudo => {
      if (!pseudo.parent) return;
      if (pseudo.value === ':root') {
        pseudo.replaceWith(selectorParser.tag({ value: 'html' }));
        return;
      }
      const compound: selectorParser.Node[] = [];
      for (let item = pseudo.prev(); item && item.type !== 'combinator'; item = item.prev()) compound.push(item);
      for (let item = pseudo.next(); item && item.type !== 'combinator'; item = item.next()) compound.push(item);
      if (compound.some(item => ['tag', 'class', 'id', 'attribute', 'universal'].includes(item.type))) pseudo.remove();
      else pseudo.replaceWith(selectorParser.universal({ value: '*' }));
    });
    return resolveStaticSelectorTargets(document, parsed.toString());
  } catch { return undefined; }
}

function compoundEnd(nodes: readonly selectorParser.Node[], start: number): number {
  let end = start;
  while (end < nodes.length && nodes[end]!.type !== 'combinator') end += 1;
  return end;
}

function potentialPrefixTargets(document: HtmlNode, nodes: readonly selectorParser.Node[], end: number): HtmlNode[] | undefined {
  const prefix = nodes.slice(0, end).map(item => item.toString()).join('');
  const targets = possibleTargets(document, prefix);
  if (targets !== undefined) return targets;
  // A relative selector or unresolved sibling prefix can still exclude this
  // SVG using its terminal compound. Losing ancestors only broadens the veto.
  let start = end - 1;
  while (start > 0 && nodes[start - 1]!.type !== 'combinator') start -= 1;
  return possibleTargets(document, nodes.slice(start, end).map(item => item.toString()).join(''));
}

function hasUnsafeTopology(document: HtmlNode, node: HtmlNode, selector: string): boolean {
  let parsed: selectorParser.Root;
  try { parsed = selectorParser().astSync(selector); } catch { return true; }
  const ancestors = new Set<HtmlNode>();
  for (let parent = node.parentNode; parent; parent = parent.parentNode) ancestors.add(parent);
  const siblings = new Set((node.parentNode?.childNodes ?? []).filter(sibling => Boolean(sibling.tagName)));
  const typeSiblings = new Set((node.parentNode?.childNodes ?? []).filter(sibling => sibling.tagName === node.tagName));
  const siblingOwners = new Set([...ancestors, ...siblings]);
  const intersects = (targets: HtmlNode[] | undefined, affected: ReadonlySet<HtmlNode>): boolean =>
    targets === undefined || targets.some(target => affected.has(target));
  const self = new Set([node]);

  const inspect = (branch: selectorParser.Selector, relative = false): boolean => {
    const nodes = branch.nodes;
    for (let index = 0; index < nodes.length; index += 1) {
      const item = nodes[index]!;
      if (item.type === 'combinator' && ['>', '+', '~'].includes(item.value.trim())) {
        const end = compoundEnd(nodes, index + 1);
        const right = potentialPrefixTargets(document, nodes, end);
        if (item.value.trim() === '>') {
          if (intersects(right, self)) {
            const prefix = nodes.slice(0, end).map(part => part.toString()).join('');
            // Only exact top-level child edges have a proven equivalent
            // wrapper selector. Relative :has branches must remain intact.
            if (relative || resolveStaticSelectorTargets(document, prefix) === undefined) return true;
          }
        } else {
          const left = index ? potentialPrefixTargets(document, nodes, index) : undefined;
          // In a leading relative sibling edge, the left side is the :has
          // owner, checked by the caller, rather than an unknown selector.
          if ((!relative || index > 0) && intersects(left, self)) return true;
          if (intersects(right, self)) return true;
        }
      }
      if (item.type !== 'pseudo') continue;
      if (/^:(?:first|last|only|nth|nth-last)-(?:child|of-type)$/i.test(item.value)) {
        const end = compoundEnd(nodes, index + 1);
        // Type ranks (and filtered nth-child ranks) can also change for
        // remaining sibling SVGs when this one moves inside its wrapper.
        const affected = /of-type$/i.test(item.value) ? typeSiblings
          : /\bof\b/i.test(item.toString()) ? siblings : self;
        if (intersects(potentialPrefixTargets(document, nodes, end), affected)) return true;
      }
      if (!item.nodes?.length) continue;
      if (item.value.toLowerCase() === ':has') {
        const end = compoundEnd(nodes, index + 1);
        let siblingRelation = false;
        item.walkCombinators(edge => { if (['+', '~'].includes(edge.value.trim())) siblingRelation = true; });
        const owners = potentialPrefixTargets(document, nodes, end);
        if (!intersects(owners, siblingRelation ? siblingOwners : ancestors)) continue;
        if (siblingRelation && intersects(owners, self)) return true;
        // Descendant existence is unchanged by inserting an intermediate
        // layer. Inspect only relationships inside the applicable :has owner.
        if (item.nodes.some(child => inspect(child, true))) return true;
      } else if (item.nodes.some(child => inspect(child, true))) return true;
    }
    return false;
  };
  return parsed.nodes.some(branch => inspect(branch));
}

function directChildAlternative(document: HtmlNode, node: HtmlNode, selector: string): string | undefined {
  let parsed: selectorParser.Root;
  try { parsed = selectorParser().astSync(selector); } catch { return undefined; }
  for (const branch of parsed.nodes) {
    for (let index = 0; index < branch.nodes.length; index += 1) {
      const edge = branch.nodes[index]!;
      if (edge.type !== 'combinator' || edge.value.trim() !== '>') continue;
      const end = compoundEnd(branch.nodes, index + 1);
      const prefix = branch.nodes.slice(0, end).map(item => item.toString()).join('');
      if (!resolveStaticSelectorTargets(document, prefix)?.includes(node)) continue;
      const wrapper = selectorParser().astSync(`:where([${CLIP_ATTRIBUTE}="true"])`).first!.first!.clone();
      branch.insertAfter(edge, wrapper);
      branch.insertAfter(wrapper, selectorParser.combinator({ value: '>' }));
      return parsed.toString();
    }
  }
  return undefined;
}

const PSEUDO_OVERFLOW_ATTRIBUTE = 'data-dc-pseudo-overflow';
type PseudoRule = BoundRule & { owner: string; kind: string };
function pseudoOwner(selector: string): { owner: string; kind: string } | undefined {
  try {
    const parsed = selectorParser().astSync(selector);
    if (parsed.nodes.length !== 1) return undefined;
    const last = parsed.first?.last;
    if (last?.type !== 'pseudo' || !/^::?(?:before|after)$/i.test(last.value)) return undefined;
    const kind = last.value.replace(/^:+/, '').toLowerCase();
    last.remove();
    return { owner: parsed.toString(), kind };
  } catch { return undefined; }
}

function interactiveOwner(node: HtmlNode): boolean {
  for (let owner: HtmlNode | undefined = node; owner; owner = owner.parentNode) {
    if (['a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'option', 'area'].includes(owner.tagName ?? '')
      || owner.attrs?.some(item => ['href', 'role', 'tabindex', 'contenteditable'].includes(item.name) || /^on/i.test(item.name))) return true;
  }
  return false;
}

/** Repair only proved decorative pseudo geometry; never clip its content owner. */
function repairPseudoOverflow(document: HtmlNode, rules: BoundRule[], dirty: Set<postcss.Root>): number {
  const pseudos: PseudoRule[] = rules.flatMap(bound => {
    const pseudo = pseudoOwner(bound.selector);
    return pseudo ? [{ ...bound, ...pseudo, targets: possibleTargets(document, pseudo.owner) }] : [];
  });
  const concrete = (value: string | undefined) => /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem|vw|vh|vmin|vmax|%)$/.test(value ?? '') || value === '0';
  const only = (values: Map<string, Set<string>>, property: string, pattern: RegExp) =>
    [...values.get(property) ?? []].every(value => pattern.test(value));
  const possibleRules = rules
    .filter(bound => !pseudoOwner(bound.selector))
    .map(bound => ({ ...bound, targets: possibleTargets(document, bound.selector) }));
  const possibleValues = (node: HtmlNode): Map<string, Set<string>> => nodeDeclarations(node, possibleRules
    .map(bound => bound.targets === undefined ? { ...bound, targets: [node] } : bound));
  let count = 0;
  for (const bound of pseudos) {
    // Mutation needs an exact, static owner; broadened matches only veto.
    const owners = resolveStaticSelectorTargets(document, bound.owner);
    if (!owners?.length) continue;
    const authored = declarations(bound.rule);
    if (!/^(?:''|"")$/.test(authored.get('content') ?? '') || authored.get('position') !== 'absolute') continue;
    if (!['width', 'height'].every(property => concrete(authored.get(property)) && Number.parseFloat(authored.get(property)!) > 0)) continue;
    if (!['right', 'left'].some(property => /^-/.test(authored.get(property) ?? '') && concrete(authored.get(property)))) continue;
    for (const owner of owners) {
      if (interactiveOwner(owner)) continue;
      const related = pseudos.filter(item => item.kind === bound.kind && (item.targets === undefined || item.targets.includes(owner)));
      const values = nodeDeclarations(owner, related.map(item => ({ ...item, targets: [owner] })));
      if (!only(values, 'content', /^(?:''|"")$/) || !only(values, 'position', /^absolute$/)
        || !only(values, 'cursor', /^(?:auto|default)$/) || !only(values, 'pointer-events', /^none$/)
        || values.has('animation') || values.has('animation-name')) continue;
      const ownerValues = possibleValues(owner);
      let repair: { token: string; selector: string; properties: Record<string, string> } | undefined;
      const negativeRight = concrete(authored.get('right')) && /^-/.test(authored.get('right') ?? '');
      // skewY/translateY preserve horizontal extent, so an inset clamp alone
      // fixes this authored corner without moving or clipping customer content.
      if (negativeRight && values.get('pointer-events')?.has('none') && only(values, 'pointer-events', /^none$/)
        && !['left', 'inset', 'inset-inline', 'translate', 'rotate', 'scale'].some(property => values.has(property))
        && only(values, 'transform', /^(?:none|(?:skewY|translateY)\([^()]+\))$/)) {
        repair = { token: `${bound.kind}-inset`, selector: `${bound.owner}:where([${PSEUDO_OVERFLOW_ATTRIBUTE}~="${bound.kind}-inset"])::${bound.kind}`, properties: { right: '0' } };
      } else {
        const rotation = authored.get('transform')?.match(/^rotate\((-?(?:\d+(?:\.\d+)?|\.\d+))deg\)$/);
        const opacity = Number(authored.get('opacity'));
        // An existing overflow:hidden owner documents the intended clipping
        // boundary. Restore its missing containing block only when no other
        // positioned descendant or pseudo would be rebound by that change.
        if (!rotation || Math.abs(Number(rotation[1])) > 45 || !Number(rotation[1]) || !(opacity >= 0 && opacity < 1)
          || !ownerValues.get('overflow')?.has('hidden') || !only(ownerValues, 'overflow', /^hidden$/)
          || ownerValues.has('position') || !only(ownerValues, 'transform', /^none$/)
          || ['contain', 'filter', 'perspective', 'top', 'right', 'bottom', 'left', 'inset', 'inset-inline', 'inset-block', 'z-index'].some(property => ownerValues.has(property))
          || [...ownerValues.get('display') ?? []].some(value => /^(?:none|contents)$/.test(value))) continue;
        const descendants: HtmlNode[] = [];
        for (const child of owner.childNodes ?? []) walk(child, node => { if (node.tagName) descendants.push(node); });
        if (descendants.some(node => !only(possibleValues(node), 'position', /^static$/))) continue;
        if (pseudos.some(item => /^(?:absolute|fixed)$/.test(declarations(item.rule).get('position') ?? '')
          && (item.targets === undefined || item.targets.some(target => descendants.includes(target)
            || (target === owner && item.kind !== bound.kind))))) continue;
        repair = { token: `${bound.kind}-container`, selector: `${bound.owner}:where([${PSEUDO_OVERFLOW_ATTRIBUTE}~="${bound.kind}-container"])`, properties: { position: 'relative' } };
      }
      const marker = attr(owner, PSEUDO_OVERFLOW_ATTRIBUTE)?.split(/\s+/) ?? [];
      if (marker.includes(repair.token)) continue;
      owner.attrs ??= [];
      const existing = owner.attrs.find(item => item.name === PSEUDO_OVERFLOW_ATTRIBUTE);
      if (existing) existing.value += ` ${repair.token}`;
      else owner.attrs.push({ name: PSEUDO_OVERFLOW_ATTRIBUTE, value: repair.token });
      const next = bound.rule.next();
      if (next?.type !== 'rule' || next.selector !== repair.selector) {
        const override = postcss.rule({ selector: repair.selector });
        for (const [prop, value] of Object.entries(repair.properties)) override.append(postcss.decl({ prop, value,
          important: bound.rule.nodes.some(node => node.type === 'decl' && node.prop === prop && !!node.important) }));
        bound.rule.after(override);
        if (repair.token.endsWith('-container')) {
          const pointer = postcss.rule({ selector: `${repair.selector}::${bound.kind}` });
          pointer.append(postcss.decl({ prop: 'pointer-events', value: 'none' }));
          override.after(pointer);
        }
      }
      dirty.add(bound.rule.root());
      count += 1;
    }
  }
  return count;
}

/**
 * Clip only explicitly decorative absolute paint at its existing containing
 * block. SVG artwork geometry, source offsets and transforms are retained;
 * its new layer clips horizontal paint without clipping vertically. Proven
 * empty corner pseudos may clamp a negative edge inset or recover the owner's
 * already-authored clipping context without changing customer content.
 * Unresolved positional/sibling selectors fail closed rather than changing the
 * authored topology under an ambiguous selector.
 */
export function clipDecorativeOverflowLayers(pages: Record<string, string>, styles: Record<string, string>): number {
  const roots = new Map<string, postcss.Root>();
  for (const [path, css] of Object.entries(styles)) {
    try { roots.set(path, postcss.parse(css)); } catch { /* Existing CSS QA owns malformed input. */ }
  }
  let count = 0;
  const dirtySheets = new Set<postcss.Root>();
  for (const [page, html] of Object.entries(pages)) {
    const document = parse(html) as unknown as HtmlNode;
    const sheetPaths = linkedSheets(page, document, styles, roots);
    const rules: BoundRule[] = [];
    for (const path of sheetPaths) roots.get(path)?.walkRules(rule => {
      for (const selector of rule.selectors) rules.push({ rule, selector, targets: resolveStaticSelectorTargets(document, selector) });
    });
    const nodes: HtmlNode[] = [];
    walk(document, node => { if (node.tagName && pureDecoration(node)) nodes.push(node); });
    const pseudoRepairs = repairPseudoOverflow(document, rules, dirtySheets);
    count += pseudoRepairs;
    let changed = pseudoRepairs > 0;
    for (const node of nodes) {
      if (attr(node, CLIP_ATTRIBUTE) || (node.parentNode && attr(node.parentNode, CLIP_ATTRIBUTE))) continue;
      const values = nodeDeclarations(node, rules);
      const positions = values.get('position');
      if (!positions?.size || [...positions].some(value => value !== 'absolute')) continue;
      if (node.tagName !== 'svg') {
        // A full-inset, wholly decorative wrapper can safely clip its own
        // oversized transformed child without adding any DOM hierarchy.
        const fullInset = [...values.get('inset') ?? []].some(value => /^0(?:px)?(?:\s+0(?:px)?){0,3}$/.test(value));
        const oversizedChild = (node.childNodes ?? []).some(child => child.tagName && hasHorizontalOvershoot(nodeDeclarations(child, rules)));
        if (!fullInset || !oversizedChild) continue;
        node.attrs ??= [];
        node.attrs.push({ name: CLIP_ATTRIBUTE, value: 'true' });
        const existing = node.attrs.find(item => item.name === 'style');
        const style = `${existing?.value ?? ''};overflow-x:clip!important;overflow-y:visible!important;pointer-events:none!important`;
        if (existing) existing.value = style; else node.attrs.push({ name: 'style', value: style });
        count += 1;
        changed = true;
        continue;
      }
      if (!hasHorizontalOvershoot(values) || !node.parentNode?.childNodes) continue;
      // Refuse only topology whose matching can depend on this SVG. Unrelated
      // navigation/CTA selectors must not disable every decorative repair.
      if (rules.some(({ selector }) => hasUnsafeTopology(document, node, selector))) continue;
      const alternatives = new Map<postcss.Rule, Set<string>>();
      for (const bound of rules) {
        const alternative = directChildAlternative(document, node, bound.selector);
        if (!alternative) continue;
        const set = alternatives.get(bound.rule) ?? new Set(bound.rule.selectors);
        set.add(alternative);
        alternatives.set(bound.rule, set);
      }
      const fragment = parseFragment(`<dc-decoration-clip ${CLIP_ATTRIBUTE}="true" aria-hidden="true" style="${CLIP_STYLE}"></dc-decoration-clip>`) as unknown as HtmlNode;
      const wrapper = fragment.childNodes![0]!;
      const parent = node.parentNode;
      wrapper.parentNode = parent;
      wrapper.childNodes = [node];
      parent.childNodes![parent.childNodes!.indexOf(node)] = wrapper;
      node.parentNode = wrapper;
      for (const [rule, selectors] of alternatives) {
        rule.selectors = [...selectors];
        dirtySheets.add(rule.root());
      }
      count += 1;
      changed = true;
    }
    if (changed) pages[page] = serialize(document as never);
  }
  for (const [path, root] of roots) if (dirtySheets.has(root)) styles[path] = root.toString();
  return count;
}
