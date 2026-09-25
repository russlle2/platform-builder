import postcss from 'postcss';

function effectiveDeclarations(rule: postcss.Rule): Map<string, postcss.Declaration> {
  const declarations = new Map<string, postcss.Declaration>();
  for (const node of rule.nodes ?? []) {
    if (node.type !== 'decl') continue;
    const property = node.prop.toLowerCase();
    const previous = declarations.get(property);
    if (!previous?.important || node.important) declarations.set(property, node);
  }
  return declarations;
}

function normalizedPseudoSelector(selector: string): string {
  return selector.trim().replace(/::?(before|after)\s*$/i, (_, name: string) => `::${name.toLowerCase()}`);
}

function isNonInteractivePseudoSelector(selector: string): boolean {
  if (!/::?(?:before|after)\s*$/i.test(selector)) return false;
  const owner = selector.replace(/::?(?:before|after)\s*$/i, '');
  // A stretched-link or virtual control surface can deliberately use empty
  // generated content. Keep authored action selectors and their hit areas.
  if (/(?:^|[\s>+~,(])(?:a|button|input|select|textarea|label|summary|option|area)(?=[\s>+~.#[:),]|$)/i.test(owner)) return false;
  if (/\[\s*(?:href|role|tabindex|onclick)\b|:(?:hover|active|focus(?:-within|-visible)?|checked)\b/i.test(owner)) return false;
  if (/[.#][\w-]*(?:button|btn|link|toggle|switch|checkbox|radio|control|cta)(?:[-_\w]*)/i.test(owner)) return false;
  return true;
}

/**
 * Restore pointer access under empty, painted, full-inset pseudo overlays.
 * Does not remove/reposition paint, modify generated text, or blanket-disable
 * pseudo elements. Keeping the repair beside its source rule preserves media
 * and supports conditions and avoids a global override of author behavior.
 */
export function makeDecorativePseudoLayersPointerTransparent(root: postcss.Root): number {
  const rules: postcss.Rule[] = [];
  const authoredContent = new Set<string>();
  root.walkRules((rule) => {
    rules.push(rule);
    const content = effectiveDeclarations(rule).get('content');
    if (content && !/^(?:''|"")$/.test(content.value.trim())) {
      for (const selector of rule.selectors) authoredContent.add(normalizedPseudoSelector(selector));
    }
  });
  let repaired = 0;
  for (const rule of rules) {
    const declarations = effectiveDeclarations(rule);
    if (!/^(?:''|"")$/.test(declarations.get('content')?.value.trim() ?? '')) continue;
    if (!/^(?:absolute|fixed)$/i.test(declarations.get('position')?.value.trim() ?? '')) continue;
    // Explicit pointer rules may describe an intentional interaction surface.
    if (declarations.has('pointer-events') || /^pointer$/i.test(declarations.get('cursor')?.value.trim() ?? '')) continue;
    const zero = (value: string | undefined) => /^(?:0(?:px|em|rem|%)?)(?:\s+0(?:px|em|rem|%)?){0,3}$/i.test(value?.trim() ?? '');
    const fullInset = zero(declarations.get('inset')?.value)
      || ['top', 'right', 'bottom', 'left'].every((property) => zero(declarations.get(property)?.value));
    if (!fullInset) continue;
    const painted = ['background', 'background-image', 'background-color', 'box-shadow', 'border', 'border-image'].some((property) => {
      const value = declarations.get(property)?.value.trim();
      return value && !/^(?:none|transparent|initial|inherit|unset)$/i.test(value);
    });
    // URL sanitization can remove the image while leaving its empty, full-page
    // pattern surface intercepting input. Pattern sizing plus non-default
    // blending/opacity still establishes the authored decorative intent.
    const patternSize = declarations.get('background-size')?.value.trim();
    const opacity = Number(declarations.get('opacity')?.value);
    const blend = declarations.get('mix-blend-mode')?.value.trim();
    const strippedPattern = !!patternSize && !/^(?:auto|initial|inherit|unset)$/i.test(patternSize)
      && ((Number.isFinite(opacity) && opacity >= 0 && opacity < 1) || (!!blend && !/^(?:normal|initial|inherit|unset)$/i.test(blend)));
    if (!painted && !strippedPattern) continue;
    const selectors = rule.selectors.filter((selector) => isNonInteractivePseudoSelector(selector) && !authoredContent.has(normalizedPseudoSelector(selector)));
    if (!selectors.length) continue;
    const selector = selectors.join(', ');
    const following = rule.next();
    if (following?.type === 'rule' && following.selector === selector && effectiveDeclarations(following).get('pointer-events')?.value === 'none') continue;
    if (selectors.length === rule.selectors.length) {
      rule.append(postcss.decl({ prop: 'pointer-events', value: 'none' }));
    } else {
      const override = postcss.rule({ selector });
      override.append(postcss.decl({ prop: 'pointer-events', value: 'none' }));
      rule.after(override);
    }
    repaired += selectors.length;
  }
  return repaired;
}
