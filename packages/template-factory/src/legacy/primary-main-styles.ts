import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const ORIGINAL_MAIN_SELECTOR = ':is(main,:where([data-dc-original-main]))';

/**
 * Keep type-selector styling on a MAIN whose duplicate landmark was demoted.
 * :is retains MAIN's type specificity; the marker branch adds no specificity.
 * Parse selector nodes so quoted attributes, declarations and namespaced tags
 * retain their authored meaning. Invoke only when a page has the marker.
 */
export function preserveOriginalMainStyles(css: string): { css: string; count: number } {
  let root: postcss.Root;
  try { root = postcss.parse(css); } catch { return { css, count: 0 }; }
  let count = 0;
  root.walkRules(rule => {
    let selectors: selectorParser.Root;
    try { selectors = selectorParser().astSync(rule.selector); } catch { return; }
    const mainTags: selectorParser.Tag[] = [];
    selectors.walkTags(tag => {
      if (tag.value.toLowerCase() !== 'main' || tag.namespace !== undefined) return;
      // Do not nest another replacement inside one emitted on a prior pass.
      for (let ancestor: selectorParser.Container | undefined = tag.parent; ancestor; ancestor = ancestor.parent) {
        if (ancestor.type === 'pseudo' && ancestor.toString().replace(/\s+/g, '') === ORIGINAL_MAIN_SELECTOR) return;
      }
      mainTags.push(tag);
    });
    if (!mainTags.length) return;
    for (const tag of mainTags) {
      const replacement = selectorParser().astSync(ORIGINAL_MAIN_SELECTOR).first!.first!.clone();
      replacement.spaces = { ...tag.spaces };
      tag.replaceWith(replacement);
    }
    rule.selector = selectors.toString();
    count += mainTags.length;
  });
  return { css: count ? root.toString() : css, count };
}
