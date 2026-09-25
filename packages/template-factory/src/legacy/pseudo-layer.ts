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

const interactiveOwners = 'a,button,input,select,textarea,label,summary,option,area,[href],[role],[tabindex],[onclick],[contenteditable]';
// Class-only selectors can match a control or a child of one. Resolve that
// ambiguity against the actual DOM, without increasing source specificity.
const nonInteractiveOwnerGuard = `:where(:not(:is(${interactiveOwners}),:is(${interactiveOwners}) *))`;

function guardedPseudoSelector(selector: string): string {
  return selector.trim().replace(/(::?(?:before|after))\s*$/i, `${nonInteractiveOwnerGuard}$1`);
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
 * Restore pointer access under empty, painted, positioned pseudo overlays.
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
    // Some authored corner/diagonal decorations have explicit dimensions and
    // offsets rather than covering all four edges. Require concrete geometry
    // on both axes; auto/variable-only positioning is not sufficient evidence.
    const concreteLength = (value: string | undefined) => /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem|vw|vh|vmin|vmax|%)$/i.test(value?.trim() ?? '')
      || /^0$/.test(value?.trim() ?? '');
    const positiveSize = (property: string) => {
      const value = declarations.get(property)?.value.trim();
      return concreteLength(value) && Number.parseFloat(value ?? '') > 0;
    };
    const positionedSize = positiveSize('width') && positiveSize('height')
      && ['left', 'right'].some((property) => concreteLength(declarations.get(property)?.value))
      && ['top', 'bottom'].some((property) => concreteLength(declarations.get(property)?.value));
    if (!fullInset && !positionedSize) continue;
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
    const translucent = Number.isFinite(opacity) && opacity >= 0 && opacity < 1;
    const blended = !!blend && !/^(?:normal|initial|inherit|unset)$/i.test(blend);
    const strippedPattern = !!patternSize && !/^(?:auto|initial|inherit|unset)$/i.test(patternSize)
      && (translucent || blended);
    // Sanitized corner artwork can retain its explicit size, image fitting,
    // and modest rotation without opacity/blending. Require all three signals
    // rather than treating an arbitrary empty positioned surface as decoration.
    const rotation = declarations.get('transform')?.value.trim().match(/^rotate\(\s*(-?(?:\d+(?:\.\d+)?|\.\d+))deg\s*\)$/i);
    const rotationDegrees = rotation ? Math.abs(Number(rotation[1])) : 0;
    const strippedRotatedPattern = positionedSize && /^(?:cover|contain)$/i.test(patternSize ?? '')
      && rotationDegrees > 0 && rotationDegrees <= 45;
    // Removed image URLs can also leave a full-inset blended pattern without
    // background-size. Require both remaining compositing signals, never
    // opacity alone, so an unspecified empty surface keeps its hit behavior.
    const strippedBlendedOverlay = fullInset && translucent && blended;
    const selectors = rule.selectors.filter((selector) => {
      if (!isNonInteractivePseudoSelector(selector) || authoredContent.has(normalizedPseudoSelector(selector))) return false;
      // A sanitized root corner pattern can lose all paint metadata. Limit
      // this last case to literal document roots with bounded geometry and
      // remaining translucency; ordinary class-only surfaces do not qualify.
      const rootCornerPattern = positionedSize && translucent && /^(?:html|body)::?(?:before|after)$/i.test(selector.trim());
      return painted || strippedPattern || strippedRotatedPattern || strippedBlendedOverlay || rootCornerPattern;
    });
    if (!selectors.length) continue;
    const selector = selectors.map(guardedPseudoSelector).join(', ');
    const following = rule.next();
    if (following?.type === 'rule' && following.selector === selector && effectiveDeclarations(following).get('pointer-events')?.value === 'none') continue;
    const override = postcss.rule({ selector });
    override.append(postcss.decl({ prop: 'pointer-events', value: 'none' }));
    rule.after(override);
    repaired += selectors.length;
  }
  return repaired;
}
