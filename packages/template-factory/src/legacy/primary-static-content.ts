import postcss from 'postcss';
import { decodeCssEscapes } from './url-safety.js';

/** Recover the observed stray newline-escape letter before a width media rule. */
export function restoreMalformedMediaRules(root: postcss.Root): number {
  let count = 0;
  for (const node of [...root.nodes]) {
    if (node.type !== 'rule') continue;
    const match = /^n\s+@media\s*(\(\s*max-width\s*:\s*(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem)\s*\))$/i.exec(node.selector.trim());
    if (!match || !node.nodes.some(child => child.type === 'rule')
      || node.nodes.some(child => child.type !== 'rule' && child.type !== 'comment')) continue;
    // A qualified selector containing @media is not a browser media rule.
    // Only this exact top-level typo is recoverable; preserve its conditions,
    // children and order rather than deleting letters from raw CSS text.
    const replacement = postcss.atRule({ name: 'media', params: match[1] });
    replacement.raws.before = node.raws.before;
    replacement.raws.between = node.raws.between;
    replacement.raws.after = node.raws.after;
    for (const child of node.nodes) replacement.append(child.clone());
    node.replaceWith(replacement);
    count += 1;
  }
  return count;
}

function splitSelectorList(selector: string): string[] | undefined {
  const result: string[] = [];
  let start = 0;
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index]!;
    if (quote) {
      if (char === quote && selector[index - 1] !== '\\') quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '[') bracketDepth += 1;
    else if (char === ']') bracketDepth -= 1;
    else if (char === '(') parenthesisDepth += 1;
    else if (char === ')') parenthesisDepth -= 1;
    else if (char === ',' && bracketDepth === 0 && parenthesisDepth === 0) {
      const value = selector.slice(start, index).trim();
      if (!value) return undefined;
      result.push(value);
      start = index + 1;
    }
    if (bracketDepth < 0 || parenthesisDepth < 0) return undefined;
  }
  if (quote || bracketDepth !== 0 || parenthesisDepth !== 0) return undefined;
  const final = selector.slice(start).trim();
  if (!final) return undefined;
  result.push(final);
  return result;
}

/** Restore script-owned content without changing native disclosure/state rules. */
export function restoreScriptDependentContent(root: postcss.Root): number {
  let count = 0;
  const authoredRevealBases = new Set<string>();
  root.walkRules(rule => {
    if (!(rule.nodes ?? []).some(node => node.type === 'decl' && node.prop === 'opacity' && /^1(?:\.0*)?$/.test(node.value.trim()))) return;
    for (const selector of splitSelectorList(rule.selector) ?? []) {
      const base = selector.trim().replace(/\.(?:reveal(?:ed)?|in-view)$/, '');
      if (base !== selector.trim() && base) authoredRevealBases.add(base);
    }
  });
  root.walkRules((rule) => {
    // Nested selectors inherit their ancestor's activation state. Repair only
    // flat base content rules, never an authored state or disclosure variant.
    for (let ancestor: postcss.Node['parent'] = rule.parent; ancestor; ancestor = ancestor.parent) {
      if (ancestor.type === 'rule') return;
    }
    const selectors = splitSelectorList(rule.selector);
    const revealSection = (rule.nodes ?? []).some(node => node.type === 'decl' && node.prop === 'opacity' && /^0(?:\.0*)?$/.test(node.value.trim()))
      && (rule.nodes ?? []).some(node => node.type === 'decl' && node.prop === 'transform' && /translate/i.test(node.value))
      && (rule.nodes ?? []).some(node => node.type === 'decl' && node.prop === 'transition' && /opacity/.test(node.value));
    const collapsedAccordion = (selector: string): boolean => {
      const activationSelectors: Readonly<Record<string, readonly string[]>> = {
        '.panel': ['.panel.open'],
        '.answer': ['.answer.open', '.open .answer'],
        '.accordion .a': ['.accordion .item.open .a'],
      };
      const activations = activationSelectors[selector.trim()];
      if (!activations) return false;
      const declarations = new Map((rule.nodes ?? []).filter((node): node is postcss.Declaration => node.type === 'decl').map(node => [node.prop.toLowerCase(), node.value.trim().toLowerCase()]));
      if (!/^0(?:px|rem|em|%)?$/.test(declarations.get('max-height') ?? '')
        || declarations.get('overflow') !== 'hidden'
        || !/(?:^|[,\s])(?:max-height|all)(?:\s|$)/.test(declarations.get('transition') ?? '')) return false;
      if (declarations.get('display') === 'none'
        || /^(?:hidden|collapse)$/.test(declarations.get('visibility') ?? '')
        || declarations.get('content-visibility') === 'hidden'
        || /^0(?:\.0*)?$/.test(declarations.get('opacity') ?? '')) return false;
      // General panel/answer names require the author's corresponding open
      // rule in the same scope. Do not infer activation from another media
      // condition, a modal ancestor or nested state-dependent CSS.
      return (rule.parent?.nodes ?? []).some(sibling => sibling.type === 'rule'
        && (splitSelectorList(sibling.selector) ?? []).some(activation => activations.includes(activation.trim()))
        && sibling.nodes.some(node => node.type === 'decl' && node.prop.toLowerCase() === 'max-height'
          && /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%)$/i.test(node.value.trim())
          && Number.parseFloat(node.value) > 0));
    };
    if (!selectors?.length || !selectors.every((selector) => (
      /^\.(?:reveal(?:-on-scroll)?|acc-(?:body|panel|content|detail)|accordion-(?:body|panel)|faq-(?:a|answer))$/.test(selector.trim())
      || (/^(?:section|\.section)$/.test(selector.trim()) && (revealSection || authoredRevealBases.has(selector.trim())))
      || /^\[data-reveal(?:=[^\]]+)?\]$/.test(selector.trim())
      || collapsedAccordion(selector)
    ))) return;
    let changed = false;
    for (const declaration of rule.nodes ?? []) {
      if (declaration.type !== 'decl') continue;
      const property = decodeCssEscapes(declaration.prop).toLowerCase();
      const value = declaration.value.trim().toLowerCase();
      const replacement = property === 'opacity' && /^0(?:\.0*)?$/.test(value) ? '1'
        : property === 'visibility' && /^(?:hidden|collapse)$/.test(value) ? 'visible'
          : property === 'display' && value === 'none' ? 'block'
            : property === 'max-height' && /^0(?:px|rem|em|%)?$/.test(value) ? 'none'
              : property === 'height' && /^0(?:px|rem|em|%)?$/.test(value) ? 'auto'
                : property === 'overflow' && value === 'hidden' ? 'visible'
                  : property === 'transform' && value !== 'none' ? 'none'
                    : undefined;
      if (replacement === undefined) continue;
      declaration.value = replacement;
      changed = true;
    }
    if (changed) count += 1;
  });
  return count;
}
