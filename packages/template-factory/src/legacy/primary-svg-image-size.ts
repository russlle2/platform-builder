import { posix } from 'node:path';
import { parse, parseFragment, serialize } from 'parse5';
import postcss from 'postcss';
import { resolveStaticSelectorTargets, type HtmlNode } from './repair.js';

const attr = (node: HtmlNode, name: string): string | undefined => node.attrs?.find(item => item.name.toLowerCase() === name.toLowerCase())?.value;
function walk(node: HtmlNode, visit: (node: HtmlNode) => void): void {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
}
const nodeText = (node: HtmlNode): string => node.nodeName === '#text' ? node.value ?? '' : (node.childNodes ?? []).map(nodeText).join('');

function localPath(owner: string, reference: string): string | undefined {
  if (!reference || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(reference)) return undefined;
  let path: string;
  try { path = decodeURIComponent(reference.split(/[?#]/, 1)[0]!); } catch { return undefined; }
  if (path.includes('\\')) return undefined;
  const resolved = posix.normalize(path.startsWith('/') ? path.slice(1) : posix.join(posix.dirname(owner), path));
  return resolved === '..' || resolved.startsWith('../') ? undefined : resolved;
}

type Sheet = { root: postcss.Root; conditional: boolean; owner: string };
function pageStyles(page: string, document: HtmlNode, styles: Readonly<Record<string, string>>): Sheet[] {
  const roots: Sheet[] = [];
  const visited = new Set<string>();
  const addCss = (owner: string, css: string, conditional: boolean): void => {
    let root: postcss.Root;
    try { root = postcss.parse(css); } catch { return; }
    roots.push({ root, conditional, owner });
    root.walkAtRules('import', rule => {
      const reference = rule.params.match(/^(?:url\(\s*)?['"]([^'"]+)['"]/i)?.[1]
        ?? rule.params.match(/^url\(\s*([^\s)]+)\s*\)/i)?.[1];
      if (!reference) return;
      // Conditional styles can veto authored dimensions but cannot establish flex.
      const conditionalImport = !/^(?:url\([^)]*\)|"[^"]*"|'[^']*')\s*$/.test(rule.params);
      addFile(owner, reference, conditional || conditionalImport);
    });
  };
  const addFile = (owner: string, reference: string, conditional: boolean): void => {
    const path = localPath(owner, reference);
    const key = `${conditional}:${path}`;
    if (!path || visited.has(key) || styles[path] === undefined) return;
    visited.add(key);
    addCss(path, styles[path]!, conditional);
  };
  walk(document, node => {
    if (node.tagName === 'style') addCss(page, nodeText(node), Boolean(attr(node, 'media')));
    if (node.tagName === 'link' && (attr(node, 'rel') ?? '').split(/\s+/).includes('stylesheet')) {
      addFile(page, attr(node, 'href') ?? '', Boolean(attr(node, 'media')));
    }
  });
  return roots;
}

type Declaration = { prop: string; value: string; conditional: boolean; compilerMobileFlex?: boolean; compilerMobileBound?: boolean };
function declarationsFor(document: HtmlNode, node: HtmlNode, roots: Sheet[]): Declaration[] {
  const declarations: Declaration[] = [];
  for (const sheet of roots) sheet.root.walkRules(rule => {
    if (!resolveStaticSelectorTargets(document, rule.selector)?.includes(node)) return;
    let conditional = sheet.conditional;
    let compilerMobileFlex = false;
    const compilerMobileBound = sheet.owner === 'assets/css/dc-repair.css' && rule.selector.trim() === 'body *'
      && rule.parent?.type === 'atrule' && rule.parent.name === 'media' && rule.parent.params === '(max-width:600px)';
    for (let parent: postcss.Node | undefined = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' || parent.type === 'rule') conditional = true;
      const previous = parent.prev();
      if (parent.type === 'atrule' && (parent as postcss.AtRule).name === 'media'
        && (parent as postcss.AtRule).params === '(max-width:600px)'
        && previous?.type === 'comment' && /^dc-repair-mobile-content-flex(?:-v\d+)?$/.test((previous as postcss.Comment).text.trim())) compilerMobileFlex = true;
    }
    rule.nodes.forEach(item => {
      if (item.type === 'decl') declarations.push({
        prop: item.prop.toLowerCase(), value: item.value.toLowerCase().trim(), conditional,
        compilerMobileFlex: compilerMobileFlex && item.important && (
          (item.prop === 'flex' && item.value === '1 1 min(100%,18rem)')
          || (item.prop === 'min-width' && item.value === 'min(100%,18rem)')
        ),
        compilerMobileBound: compilerMobileBound && item.important && item.prop === 'max-width' && item.value === '100%',
      });
    });
  });
  try {
    postcss.parse(`x{${attr(node, 'style') ?? ''}}`).walkDecls(item => {
      declarations.push({ prop: item.prop.toLowerCase(), value: item.value.toLowerCase().trim(), conditional: false });
    });
  } catch { /* Malformed styles cannot establish a flex layout. */ }
  return declarations;
}

function missingSvgSize(svg: string): { width: number; height: number } | undefined {
  const document = parseFragment(svg) as unknown as HtmlNode;
  const root = document.childNodes?.find(node => node.tagName === 'svg');
  if (!root || attr(root, 'width') !== undefined || attr(root, 'height') !== undefined) return undefined;
  // CSS inside an SVG can establish its intrinsic dimensions independently.
  let authoredSize = false;
  walk(root, node => {
    const css = node.tagName === 'style' ? nodeText(node) : attr(node, 'style') ?? '';
    if (/(?:^|[;{])\s*(?:width|height|inline-size|block-size)\s*:/i.test(css)) authoredSize = true;
  });
  if (authoredSize) return undefined;
  const values = (attr(root, 'viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || values.some(value => !Number.isFinite(value)) || values[2]! <= 0 || values[3]! <= 0) return undefined;
  const width = Math.min(values[2]!, 300);
  const height = width * (values[3]! / values[2]!);
  return Number.isFinite(height) && width >= 1 && height >= 1 ? { width, height } : undefined;
}

/** Restore a local viewBox-only image's intrinsic contribution in a shrink-to-fit flex item. */
export function restoreDimensionlessSvgImageSizes(
  pages: Record<string, string>,
  svgAssets: Readonly<Record<string, string>>,
  styles: Readonly<Record<string, string>>,
): number {
  let count = 0;
  for (const [page, html] of Object.entries(pages)) {
    const document = parse(html) as unknown as HtmlNode;
    const roots = pageStyles(page, document, styles);
    let changed = false;
    walk(document, node => {
      if (node.tagName !== 'img' || attr(node, 'width') !== undefined || attr(node, 'height') !== undefined || attr(node, 'srcset') !== undefined) return;
      const wrapper = node.parentNode;
      const container = wrapper?.parentNode;
      if (!wrapper || !container || !['div', 'span', 'figure'].includes(wrapper.tagName ?? '')) return;
      const meaningful = (wrapper.childNodes ?? []).filter(child => child.tagName || (child.nodeName === '#text' && child.value?.trim()));
      if (meaningful.length !== 1 || meaningful[0] !== node) return;
      const containerRules = declarationsFor(document, container, roots);
      if (containerRules.some(item => item.prop === 'all')) return;
      const layout = containerRules.filter(item => item.prop === 'display');
      if (!layout.some(item => !item.conditional && /^(?:inline-)?flex$/.test(item.value)) || layout.some(item => !/^(?:inline-)?flex$/.test(item.value))) return;
      const directions = containerRules.filter(item => /^(?:flex-direction|flex-flow)$/.test(item.prop));
      // A column with stretch already gives its child a real width; keep that design.
      if (directions.some(item => /column|var\(|inherit|unset|revert/.test(item.value))) {
        const alignments = containerRules.filter(item => item.prop === 'align-items');
        if (!alignments.some(item => !item.conditional && /^(?:flex-start|flex-end|start|end|center)$/.test(item.value))
          || alignments.some(item => !/^(?:flex-start|flex-end|start|end|center)$/.test(item.value))) return;
      }
      const wrapperRules = declarationsFor(document, wrapper, roots);
      if (wrapperRules.some(item => item.prop === 'all')) return;
      if (wrapperRules.some(item => item.prop === 'align-self' && !/^(?:auto|flex-start|flex-end|start|end|center)$/.test(item.value))) return;
      const wrapperDimensions = wrapperRules.some(item => !item.compilerMobileFlex && !item.compilerMobileBound && /^(?:(?:min-|max-)?(?:width|height|inline-size|block-size)|flex(?:-basis)?)$/.test(item.prop)
        && item.value !== 'auto' && !(/^min-(?:width|height|inline-size|block-size)$/.test(item.prop) && /^0(?:px)?$/.test(item.value)));
      const imageDimensions = declarationsFor(document, node, roots).some(item => /^(?:width|height|inline-size|block-size)$/.test(item.prop) && item.value !== 'auto');
      if (wrapperDimensions || imageDimensions || attr(wrapper, 'width') !== undefined || attr(wrapper, 'height') !== undefined) return;
      const path = localPath(page, attr(node, 'src') ?? '');
      const size = path && svgAssets[path] !== undefined ? missingSvgSize(svgAssets[path]!) : undefined;
      if (!size) return;
      node.attrs ??= [];
      node.attrs.push({ name: 'width', value: String(size.width) }, { name: 'height', value: String(size.height) });
      count += 1;
      changed = true;
    });
    if (changed) pages[page] = serialize(document as never);
  }
  return count;
}
