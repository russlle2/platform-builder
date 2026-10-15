/** The only template-authored script the preview asset route may execute.
 * Keep these bytes shared with the compiler so publication and serving agree. */
export const COMPILER_COMPATIBILITY_PATH = 'assets/js/dc-compat.js'

export const COMPILER_COMPATIBILITY_SCRIPT = `(() => {
  'use strict';
  if (window.__dailyClarityCompatibilityInstalled) return;
  window.__dailyClarityCompatibilityInstalled = true;
  document.addEventListener('click', (event) => {
    const control = event.target instanceof Element ? event.target.closest('[aria-controls]') : null;
    if (!(control instanceof HTMLElement)) return;
    const targetId = control.getAttribute('aria-controls');
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;
    const expanded = control.getAttribute('aria-expanded') === 'true';
    control.setAttribute('aria-expanded', String(!expanded));
    target.classList.toggle('is-open', !expanded);
  });
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-dc-standard-form]')) return;
    if (!form.checkValidity()) return;
    form.dispatchEvent(new CustomEvent('dc:form-submit', { bubbles: true }));
  });
})();
`;

