import { VISUAL_EDITABLE_SELECTOR } from './inline-edits'

export const CUSTOMER_PREVIEW_EDITOR_RUNTIME = 'customer-preview-editor-v1' as const

const SAFE_PREVIEW_PAGE_RE = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.html$/

/**
 * Return the sole app-owned runtime used inside customer preview iframes.
 *
 * The page is trusted route state rather than template input. Keeping it in
 * this canonical builder lets nested navigation resolve identically in both
 * live editors and in the catalogue compiler's browser certification.
 */
export function getCustomerPreviewEditorScript(page: string): string {
  if (!SAFE_PREVIEW_PAGE_RE.test(page) || page.length > 160) {
    throw new Error('Customer preview editor requires a safe manifest page')
  }
  const editableSelector = JSON.stringify(VISUAL_EDITABLE_SELECTOR)
  const currentPage = JSON.stringify(page)
  const runtime = JSON.stringify(CUSTOMER_PREVIEW_EDITOR_RUNTIME)
  return `
<script data-dc-runtime="${CUSTOMER_PREVIEW_EDITOR_RUNTIME}">
(function(){
  'use strict';
  var runtime = ${runtime};
  if (window.__dailyClarityCustomerPreviewEditorRuntime === runtime) return;
  window.__dailyClarityCustomerPreviewEditorRuntime = runtime;
  var editableSelectors = ${editableSelector};
  var currentPage = ${currentPage};
  var safeEditableAttributes = { content: true, alt: true, title: true, placeholder: true, 'aria-label': true };
  var supportsHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  var pendingImageClick = null;

  function editIdFor(el) {
    return el.getAttribute('data-dc-edit-id') || el.getAttribute('data-pb-edit-id') || '';
  }

  function imageIdFor(el) {
    return el.getAttribute('data-dc-image-id') || el.getAttribute('data-pb-image-id') || '';
  }

  function isSafeReplacementImageUrl(value) {
    if (typeof value !== 'string' || value.length < 2 || value.length > 2048) return false;
    if (/^data:image\\/(?:png|gif|jpeg|webp|avif);base64,[A-Za-z0-9+\\/]+={0,2}$/i.test(value)) return true;
    if (/[\\s"'<>\\\\()]/.test(value)) return false;
    if (/^\\/(?!\\/)/.test(value)) return value.indexOf('..') === -1;
    return /^(?:https?:\\/\\/|blob:https?:\\/\\/)/i.test(value);
  }

  function resolvePreviewPage(href) {
    if (typeof href !== 'string' || !href || href.length > 512 || href.indexOf('\\\\') !== -1) return '';
    for (var characterIndex = 0; characterIndex < href.length; characterIndex++) {
      if (href.charCodeAt(characterIndex) < 32) return '';
    }
    if (/^(?:[A-Za-z][A-Za-z0-9+.-]*:|\\/\\/|#)/.test(href)) return '';
    var withoutSuffix = href.split(/[?#]/, 1)[0];
    if (withoutSuffix === '/' || withoutSuffix === './') return 'index.html';
    if (!/\\.html$/i.test(withoutSuffix)) return '';
    var parts = withoutSuffix.charAt(0) === '/' ? [] : currentPage.split('/').slice(0, -1);
    var segments = withoutSuffix.replace(/^\\.\\//, '').replace(/^\\/+/, '').split('/');
    for (var index = 0; index < segments.length; index++) {
      var segment = segments[index];
      if (!segment || segment === '.') continue;
      if (segment === '..') {
        if (!parts.length) return '';
        parts.pop();
      } else if (!/^[A-Za-z0-9_-]+(?:\\.html)?$/.test(segment)) {
        return '';
      } else {
        parts.push(segment);
      }
    }
    var resolved = parts.join('/');
    return resolved.length <= 160 && /^[A-Za-z0-9_-]+(?:\\/[A-Za-z0-9_-]+)*\\.html$/.test(resolved) ? resolved : '';
  }

  function requestPromptEdit(el, attribute) {
    var nodeId = editIdFor(el);
    if (!nodeId) return false;
    if (attribute && !safeEditableAttributes[attribute]) return false;
    if (pendingImageClick) {
      clearTimeout(pendingImageClick);
      pendingImageClick = null;
    }
    var original = attribute ? (el.getAttribute(attribute) || '') : (el.textContent || '');
    window.parent.postMessage({
      type: 'editValueRequest',
      nodeId: nodeId,
      attribute: attribute || '',
      tag: el.tagName,
      original: original
    }, '*');
    return true;
  }

  function startEditing(el) {
    if (!el || el.isContentEditable || !editIdFor(el)) return;
    if (el.tagName === 'SELECT') {
      var selectedOption = el.options && el.options[el.selectedIndex];
      if (selectedOption) requestPromptEdit(selectedOption, '');
      return;
    }
    var editableAttribute = el.getAttribute('data-dc-edit-attribute') || el.getAttribute('data-pb-edit-attribute') || '';
    if (editableAttribute) {
      requestPromptEdit(el, editableAttribute);
      return;
    }
    if (el.tagName === 'OPTION') {
      requestPromptEdit(el, '');
      return;
    }
    if (el.children && el.children.length > 0) return;
    var originalText = el.textContent || '';
    el.contentEditable = 'true';
    el.style.outline = '2px solid #3b82f6';
    el.style.outlineOffset = '2px';
    el.style.borderRadius = '2px';
    el.style.cursor = 'text';
    el.focus();
    el.addEventListener('blur', function onBlur() {
      el.contentEditable = 'false';
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.borderRadius = '';
      el.style.cursor = '';
      el.removeEventListener('blur', onBlur);
      window.parent.postMessage({ type: 'textEdited', nodeId: editIdFor(el), tag: el.tagName, original: originalText, text: el.textContent || '' }, '*');
    }, { once: true });
  }

  document.addEventListener('dblclick', function(event) {
    var el = event.target instanceof Element ? event.target.closest(editableSelectors) : null;
    if (!el) return;
    startEditing(el);
    event.preventDefault();
    event.stopPropagation();
  });

  var lastTap = 0;
  document.addEventListener('touchend', function(event) {
    var el = event.target instanceof Element ? event.target.closest(editableSelectors) : null;
    if (!el) return;
    var now = Date.now();
    if (now - lastTap < 400) {
      startEditing(el);
      event.preventDefault();
    }
    lastTap = now;
  });

  var lastHovered = null;
  if (supportsHover) {
    document.addEventListener('mouseover', function(event) {
      var el = event.target instanceof Element ? event.target.closest(editableSelectors) : null;
      if (lastHovered && lastHovered !== el && !lastHovered.isContentEditable) {
        lastHovered.style.outline = '';
        lastHovered.style.outlineOffset = '';
      }
      if (el && !el.isContentEditable) {
        el.style.outline = '1px dashed rgba(59,130,246,0.4)';
        el.style.outlineOffset = '1px';
        lastHovered = el;
      }
    });
    document.addEventListener('mouseout', function(event) {
      var el = event.target instanceof Element ? event.target.closest(editableSelectors) : null;
      if (el && !el.isContentEditable) {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });
  }

  document.addEventListener('click', function(event) {
    var clickTarget = event.target instanceof Element ? event.target : null;
    if (!clickTarget) return;
    // A background-image slot can contain the whole header, navigation, or
    // content region. Only treat a background slot as selected when the user
    // clicks that element's own surface; walking up from a descendant would
    // turn every nested link or control into an image-upload trigger. Raster
    // images remain selectable when nested inside a link, as intended.
    var image = clickTarget.closest('img[data-dc-image-id],img[data-pb-image-id]');
    if (!image && clickTarget.matches('[data-dc-image-id],[data-pb-image-id]')
        && !clickTarget.closest('a[href],button,input,select,textarea,option,label,summary,[role="button"],[role="link"]')) {
      image = clickTarget;
    }
    if (!image) return;
    event.preventDefault();
    // An image can live inside a page link. Stop sibling document listeners
    // too, otherwise one click can open the upload flow and navigate away.
    event.stopImmediatePropagation();
    var requestImageSwap = function() {
      pendingImageClick = null;
      var src = image.currentSrc || image.src || '';
      if (!src) {
        var background = window.getComputedStyle(image).backgroundImage || '';
        var backgroundMatch = background.match(/^url\\(["']?(.*?)["']?\\)$/i);
        src = backgroundMatch ? backgroundMatch[1] : '';
      }
      var primarySlotId = imageIdFor(image);
      if (!primarySlotId) return;
      var pictureSlotIds = [primarySlotId];
      var picture = image.closest('picture');
      if (picture) {
        pictureSlotIds = [];
        var seenPictureSlots = {};
        for (var childIndex = 0; childIndex < picture.children.length; childIndex++) {
          var child = picture.children[childIndex];
          if (child.tagName !== 'SOURCE' && child.tagName !== 'IMG') continue;
          var childSlotId = imageIdFor(child);
          if (!childSlotId || seenPictureSlots[childSlotId]) return;
          seenPictureSlots[childSlotId] = true;
          pictureSlotIds.push(childSlotId);
        }
        if (!seenPictureSlots[primarySlotId]) return;
      }
      window.parent.postMessage({ type: 'imageSwapRequest', src: src, slotId: primarySlotId, pictureSlotIds: pictureSlotIds }, '*');
    };
    if (image.hasAttribute('data-dc-edit-attribute') || image.hasAttribute('data-pb-edit-attribute')) {
      if (pendingImageClick) clearTimeout(pendingImageClick);
      pendingImageClick = setTimeout(requestImageSwap, 280);
    } else {
      requestImageSwap();
    }
  });

  window.addEventListener('message', function(event) {
    if (event.source !== window.parent || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'imageSwapResponse') {
      var newSrc = event.data.imageUrl || event.data.dataUrl;
      if (!isSafeReplacementImageUrl(newSrc)) return;
      var responseSlotIds = event.data.slotIds;
      if (!Array.isArray(responseSlotIds) || responseSlotIds.length < 1 || responseSlotIds.length > 32 || event.data.slotId !== responseSlotIds[0]) return;
      var candidates = document.querySelectorAll('[data-dc-image-id],[data-pb-image-id]');
      var slots = [];
      var seenResponseSlots = {};
      for (var responseIndex = 0; responseIndex < responseSlotIds.length; responseIndex++) {
        var responseSlotId = responseSlotIds[responseIndex];
        if (typeof responseSlotId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(responseSlotId) || seenResponseSlots[responseSlotId]) return;
        seenResponseSlots[responseSlotId] = true;
        var slot = null;
        var slotMatches = 0;
        for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
          if (imageIdFor(candidates[candidateIndex]) === responseSlotId) {
            slot = candidates[candidateIndex];
            slotMatches += 1;
          }
        }
        if (!slot || slotMatches !== 1) return;
        slots.push(slot);
      }
      var responsePicture = slots[0].parentElement && slots[0].parentElement.tagName === 'PICTURE' ? slots[0].parentElement : null;
      if (responsePicture) {
        for (var structureIndex = 0; structureIndex < slots.length; structureIndex++) {
          if (slots[structureIndex].parentElement !== responsePicture || (slots[structureIndex].tagName !== 'SOURCE' && slots[structureIndex].tagName !== 'IMG')) return;
        }
        var responsiveChildren = 0;
        for (var responseChildIndex = 0; responseChildIndex < responsePicture.children.length; responseChildIndex++) {
          var responseChild = responsePicture.children[responseChildIndex];
          if (responseChild.tagName !== 'SOURCE' && responseChild.tagName !== 'IMG') continue;
          responsiveChildren += 1;
          if (!seenResponseSlots[imageIdFor(responseChild)]) return;
        }
        if (responsiveChildren !== slots.length) return;
      } else if (slots.length !== 1) {
        return;
      }
      for (var slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        var target = slots[slotIndex];
        if (target.tagName === 'IMG') {
          target.removeAttribute('srcset');
          target.src = newSrc;
        } else if (target.tagName === 'SOURCE') {
          if (target.hasAttribute('srcset')) target.srcset = newSrc;
          else target.src = newSrc;
        } else {
          target.style.setProperty('background-image', 'url("' + newSrc + '")', 'important');
        }
      }
      return;
    }
    if (event.data.type === 'editValueResponse') {
      var responseId = event.data.nodeId;
      var responseAttribute = event.data.attribute;
      var responseText = event.data.text;
      if (typeof responseId !== 'string' || typeof responseAttribute !== 'string' || typeof responseText !== 'string' || responseText.length > 10000) return;
      var editCandidates = document.querySelectorAll('[data-dc-edit-id],[data-pb-edit-id]');
      var editTarget = null;
      var editMatches = 0;
      for (var editIndex = 0; editIndex < editCandidates.length; editIndex++) {
        if (editIdFor(editCandidates[editIndex]) === responseId) {
          editTarget = editCandidates[editIndex];
          editMatches += 1;
        }
      }
      if (!editTarget || editMatches !== 1) return;
      if (responseAttribute) {
        var declared = editTarget.getAttribute('data-dc-edit-attribute') || editTarget.getAttribute('data-pb-edit-attribute') || '';
        if (!safeEditableAttributes[responseAttribute] || declared !== responseAttribute) return;
        editTarget.setAttribute(responseAttribute, responseText);
      } else {
        if (editTarget.children && editTarget.children.length > 0) return;
        editTarget.textContent = responseText;
      }
      return;
    }
    if (event.data.type === 'applyPreviewStyles') {
      if (typeof event.data.css !== 'string' || !event.data.css || event.data.css.length > 524288 || /<\\/style\\b/i.test(event.data.css)) return;
      var style = document.getElementById('pb-custom-styles');
      if (!style) {
        style = document.createElement('style');
        style.id = 'pb-custom-styles';
        document.head.appendChild(style);
      }
      style.textContent = event.data.css;
    }
  });

  document.addEventListener('click', function(event) {
    var link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    var page = resolvePreviewPage(link.getAttribute('href') || '');
    if (!page) return;
    event.preventDefault();
    event.stopPropagation();
    window.parent.postMessage({ type: 'navigatePage', page: page }, '*');
  });
})();
</script>`
}
