import { posix } from 'node:path';
import { parse, serialize } from 'parse5';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { resolveStaticSelectorTargets, type HtmlNode } from './repair.js';

const attr = (node: HtmlNode, name: string): string | undefined => node.attrs?.find(item => item.name === name)?.value;
const text = (node: HtmlNode): string => node.nodeName === '#text' ? node.value ?? '' : (node.childNodes ?? []).map(text).join('');
function walk(node: HtmlNode, visit: (node: HtmlNode) => void): void {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
}
type Value = { prop: string; value: string; conditional: boolean };
type BoundRule = { targets: HtmlNode[] | undefined; values: Value[] };

function localPath(owner: string, reference: string): string | undefined {
  if (!reference || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(reference)) return undefined;
  let pathname: string;
  try { pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]!); } catch { return undefined; }
  if (pathname.includes('\\')) return undefined;
  const path = posix.normalize(pathname.startsWith('/') ? pathname.slice(1) : posix.join(posix.dirname(owner), pathname));
  return path === '..' || path.startsWith('../') ? undefined : path;
}

function possibleTargets(document: HtmlNode, selector: string): HtmlNode[] | undefined {
  try {
    const parsed = selectorParser().astSync(selector);
    parsed.walkPseudos(pseudo => {
      // Pseudo paint is not a declaration on the content-owning element.
      if (/^::|^:(?:before|after|first-letter|first-line)$/i.test(pseudo.value)) return;
      const siblings = pseudo.parent?.nodes ?? [];
      if (siblings.some(item => ['tag', 'class', 'id', 'attribute', 'universal'].includes(item.type))) pseudo.remove();
      else pseudo.replaceWith(selectorParser.universal({ value: '*' }));
    });
    return resolveStaticSelectorTargets(document, parsed.toString());
  } catch { return undefined; }
}

function pageRules(page: string, document: HtmlNode, styles: Readonly<Record<string, string>>): BoundRule[] | undefined {
  const rules: BoundRule[] = [];
  const visited = new Set<string>();
  let incomplete = false;
  const addCss = (owner: string, css: string, conditional: boolean): void => {
    let root: postcss.Root;
    try { root = postcss.parse(css); } catch { incomplete = true; return; }
    root.walkRules(rule => {
      let scoped = conditional;
      for (let parent: postcss.Node | undefined = rule.parent; parent; parent = parent.parent) {
        if (parent.type === 'atrule' && /(?:^|-)keyframes$/i.test((parent as postcss.AtRule).name)) return;
        if (parent.type === 'atrule' || parent.type === 'rule') scoped = true;
      }
      for (const selector of rule.selectors) {
        if (/::|:(?:before|after|first-letter|first-line)\b/i.test(selector)) continue;
        const exact = resolveStaticSelectorTargets(document, selector);
        const targets = exact ?? possibleTargets(document, selector);
        const values = rule.nodes.filter((node): node is postcss.Declaration => node.type === 'decl')
          .map(node => ({ prop: node.prop.toLowerCase(), value: node.value.trim().toLowerCase(), conditional: scoped || exact === undefined }));
        rules.push({ targets, values });
      }
    });
    root.walkAtRules('import', rule => {
      const reference = rule.params.match(/^(?:url\(\s*)?['"]([^'"]+)['"]/i)?.[1]
        ?? rule.params.match(/^url\(\s*([^\s)]+)\s*\)/i)?.[1];
      if (!reference) { incomplete = true; return; }
      const scoped = conditional || !/^(?:url\([^)]*\)|"[^"]*"|'[^']*')\s*$/.test(rule.params);
      addFile(owner, reference, scoped);
    });
  };
  const addFile = (owner: string, reference: string, conditional: boolean): void => {
    const path = localPath(owner, reference);
    if (!path || styles[path] === undefined) { incomplete = true; return; }
    const key = `${conditional}:${path}`;
    if (visited.has(key)) return;
    visited.add(key);
    addCss(path, styles[path]!, conditional);
  };
  walk(document, node => {
    if (node.tagName === 'style') addCss(page, text(node), Boolean(attr(node, 'media')));
    if (node.tagName === 'link' && (attr(node, 'rel') ?? '').toLowerCase().split(/\s+/).includes('stylesheet')) {
      addFile(page, attr(node, 'href') ?? '', Boolean(attr(node, 'media')));
    }
  });
  return incomplete ? undefined : rules;
}

function valuesFor(node: HtmlNode, rules: BoundRule[]): Value[] {
  const values = rules.flatMap(rule => rule.targets === undefined || rule.targets.includes(node) ? rule.values : []);
  try {
    postcss.parse(`x{${attr(node, 'style') ?? ''}}`).walkDecls(decl => {
      values.push({ prop: decl.prop.toLowerCase(), value: decl.value.trim().toLowerCase(), conditional: false });
    });
  } catch { values.push({ prop: 'all', value: 'unknown', conditional: true }); }
  return values;
}

function padding(values: Value[], side: 'top' | 'bottom'): string | undefined {
  const found: string[] = [];
  let onlyShorthands = true;
  for (const item of values) {
    if (item.prop === 'all' || /^padding-(?:block|inline)/.test(item.prop)) return undefined;
    if (item.prop !== 'padding' && item.prop !== `padding-${side}`) continue;
    if (item.prop !== 'padding') onlyShorthands = false;
    if (item.conditional) return undefined;
    const parts = item.value.split(/\s+/);
    if (!parts.length || parts.length > (item.prop === 'padding' ? 4 : 1)
      || parts.some(value => !/^(?:0|(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem))$/.test(value))) return undefined;
    found.push(item.prop === 'padding' ? parts[side === 'top' ? 0 : parts.length >= 3 ? 2 : 0]! : parts[0]!);
  }
  const unique = [...new Set(found)];
  if (!unique.length) return '0';
  if (unique.length === 1) return unique[0];
  // Several unconditional concrete shorthand rules may match the same node.
  // Their minimum is a safe lower bound whichever one wins the cascade; no
  // source-order or specificity assumption is needed to establish empty space.
  return onlyShorthands && unique.every(value => Number.parseFloat(value) > 0) ? `min(${unique.join(',')})` : undefined;
}

const positiveInset = (value: string | undefined): boolean => Boolean(value && (value.startsWith('min(') || Number.parseFloat(value) > 0));

function normalFlow(values: Value[]): boolean {
  return !values.some(item => item.prop === 'all'
    || (item.prop === 'position' && !/^(?:static|relative)$/.test(item.value))
    || (/^(?:transform|translate|rotate|scale)$/.test(item.prop) && item.value !== 'none')
    || (/^(?:animation|animation-name)$/.test(item.prop) && item.value !== 'none')
    || (/^(?:top|right|bottom|left|inset(?:-.+)?)$/.test(item.prop) && !/^(?:auto|0(?:px)?)$/.test(item.value))
    || (/^margin(?:-.+)?$/.test(item.prop) && /(?:^|[\s,(])-|var\(|calc\(/.test(item.value))
    || (item.prop === 'float' && item.value !== 'none'));
}

function safeContent(node: HtmlNode, rules: BoundRule[]): boolean {
  let safe = true;
  const visit = (item: HtmlNode): void => {
    if (attr(item, 'aria-hidden') === 'true' || attr(item, 'hidden') !== undefined) return;
    if (item.tagName) {
      const values = valuesFor(item, rules);
      if (!normalFlow(values)) safe = false;
      // A fixed-height text box can spill content into its apparent padding.
      // Replaced elements contribute their own bounded box to normal flow.
      if (!['img', 'input', 'textarea', 'select', 'svg', 'video', 'audio', 'canvas'].includes(item.tagName)
        && values.some(value => /^(?:height|max-height|block-size|max-block-size)$/.test(value.prop) && !/^(?:auto|none)$/.test(value.value))) safe = false;
    }
    for (const child of item.childNodes ?? []) visit(child);
  };
  visit(node);
  return safe;
}

function safeInset(node: HtmlNode, values: Value[], rules: BoundRule[], side: 'top' | 'bottom'): string | undefined {
  if (!safeContent(node, rules)) return undefined;
  if (values.some(item => item.prop === 'display' && !/^(?:block|flex|grid|flow-root)$/.test(item.value))) return undefined;
  const own = padding(values, side);
  if (own === undefined || positiveInset(own) || side === 'top') return own;
  // With no owner padding, only the final normal-flow block can establish a
  // trailing safe area. Positive margins may collapse, so do not count them.
  if (values.some(item => /^(?:display|height|max-height|block-size|max-block-size)$/.test(item.prop)
    && !/^(?:block|flow-root|auto|none)$/.test(item.value))) return undefined;
  const meaningful = (node.childNodes ?? []).filter(child => child.tagName || (child.nodeName === '#text' && child.value?.trim()));
  const last = meaningful.at(-1);
  if (!last || !['section', 'article', 'div'].includes(last.tagName ?? '')) return undefined;
  const childValues = valuesFor(last, rules);
  if (childValues.some(item => item.prop === 'display' && !/^(?:block|flex|grid|flow-root)$/.test(item.value))
    || childValues.some(item => /^(?:height|max-height|block-size|max-block-size)$/.test(item.prop) && !/^(?:auto|none)$/.test(item.value))) return undefined;
  return padding(childValues, 'bottom');
}

function polygon(value: string): { side: 'top' | 'bottom'; percentage: string } | undefined {
  const points = value.match(/^polygon\(([^()]+)\)$/)?.[1]?.split(',').map(point => point.trim().replace(/\s+/g, ' '));
  if (!points || points.length !== 4 || points[0] !== '0 0' || !/^(?:0|0%) 100%$/.test(points[3]!)) return undefined;
  const top = points[1]?.match(/^100% (\d+(?:\.\d+)?|\.\d+)%$/);
  if (top && points[2] === '100% 100%' && Number(top[1]) > 0 && Number(top[1]) < 50) return { side: 'top', percentage: `${top[1]}%` };
  const bottom = points[2]?.match(/^100% (\d+(?:\.\d+)?|\.\d+)%$/);
  if (points[1] === '100% 0' && bottom && Number(bottom[1]) > 50 && Number(bottom[1]) < 100) return { side: 'bottom', percentage: `${bottom[1]}%` };
  return undefined;
}

/** Cap only a proven empty corner of an authored convex polygon, retaining its paint and diagonal. */
export function capContentPolygonClips(pages: Record<string, string>, styles: Readonly<Record<string, string>>): number {
  let count = 0;
  for (const [page, html] of Object.entries(pages)) {
    const document = parse(html) as unknown as HtmlNode;
    const rules = pageRules(page, document, styles);
    if (!rules) continue;
    let changed = false;
    walk(document, node => {
      if (!node.tagName || attr(node, 'data-dc-content-clip') !== undefined || !text(node).trim()) return;
      const values = valuesFor(node, rules);
      const clips = values.filter(item => /^(?:-webkit-)?clip-path$/.test(item.prop));
      if (!clips.length || clips.some(item => item.conditional) || new Set(clips.map(item => item.value)).size !== 1) return;
      const shape = polygon(clips[0]!.value);
      if (!shape) return;
      const inset = safeInset(node, values, rules, shape.side);
      if (!positiveInset(inset)) return;
      const clipped = shape.side === 'top'
        ? `polygon(0 0,100% min(${shape.percentage},${inset}),100% 100%,0 100%)`
        : `polygon(0 0,100% 0,100% max(${shape.percentage},calc(100% - ${inset})),0 100%)`;
      node.attrs ??= [];
      const style = node.attrs.find(item => item.name === 'style');
      const override = `${style?.value ?? ''};clip-path:${clipped}!important`;
      if (style) style.value = override; else node.attrs.push({ name: 'style', value: override });
      node.attrs.push({ name: 'data-dc-content-clip', value: 'padding-cap' });
      count += 1;
      changed = true;
    });
    if (changed) pages[page] = serialize(document as never);
  }
  return count;
}
