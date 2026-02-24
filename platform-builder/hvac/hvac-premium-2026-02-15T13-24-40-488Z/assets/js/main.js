/* HVAC Premium Template JS */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // Mobile nav toggle
  const toggle = $('.nav-toggle');
  const nav = $('#site-menu');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Sticky header enhancement (add shadow when scrolled)
  const header = $('.site-header');
  const onScroll = () => {
    if (!header) return;
    if (window.scrollY > 6) {
      header.style.boxShadow = 'var(--shadow-1)';
    } else {
      header.style.boxShadow = 'none';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Year in footer
  const year = new Date().getFullYear();
  const yEl = $('#year');
  if (yEl) yEl.textContent = year;

  // Form helpers
  function setError(id, msg){ const el = document.getElementById(id); if (el) el.textContent = msg || ''; }
  function validEmail(v){ return /.+@.+\..+/.test(v); }

  // Booking form
  const booking = $('#booking-form');
  if (booking) {
    booking.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      const data = new FormData(booking);
      const req = ['service','date','time','name','phone','email','agree'];
      req.forEach(k => setError(`${k}-error`, ''));

      req.forEach((k) => {
        const v = data.get(k);
        if (!v || (k==='email' && !validEmail(String(v)))) {
          ok = false; setError(`${k}-error`, k==='email' ? 'Enter a valid email.' : 'This field is required.');
        }
      });

      const status = $('#form-status');
      if (ok) {
        if (status) status.textContent = 'Thanks! We\'ll be in touch shortly to confirm your appointment.';
        booking.reset();
        booking.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        if (status) status.textContent = 'Please fix the highlighted fields.';
      }
    });
  }

  // Contact form
  const contact = $('#contact-form');
  if (contact) {
    contact.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(contact);
      let ok = true;
      ['c-name','c-email','c-message'].forEach(id => setError(id+'-error',''));
      if (!data.get('name')) { ok = false; setError('c-name-error','Your name is required.'); }
      const email = data.get('email');
      if (!email || !validEmail(String(email))) { ok = false; setError('c-email-error','Enter a valid email.'); }
      if (!data.get('message')) { ok = false; setError('c-message-error','Please include a message.'); }
      const status = $('#contact-status');
      if (ok) {
        if (status) status.textContent = 'Thanks! Your message has been sent. We\'ll reply soon.';
        contact.reset();
      } else {
        if (status) status.textContent = 'Please fix the errors and try again.';
      }
    });
  }
})();
