(function(){
  const header = document.getElementById('header');
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.getElementById('primary-nav');

  // Sticky shadow on scroll
  const onScroll = () => {
    if(!header) return;
    if(window.scrollY > 6){ header.classList.add('is-scrolled'); }
    else { header.classList.remove('is-scrolled'); }
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // Mobile menu toggle
  if(toggle && menu){
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if(!menu.classList.contains('is-open')) return;
      const within = e.target.closest('#primary-nav') || e.target.closest('.nav__toggle');
      if(!within){ menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); }
    });
  }

  // Footer year
  const yearEl = document.getElementById('year');
  if(yearEl){ yearEl.textContent = new Date().getFullYear(); }

  // Generic async form handler (simulated)
  function handleForm(formId, statusId, successMessage){
    const form = document.getElementById(formId);
    const status = document.getElementById(statusId);
    if(!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if(status){ status.textContent = 'Sending…'; }
      setTimeout(() => {
        if(status){ status.textContent = successMessage; }
        form.reset();
      }, 800);
    });
  }

  handleForm('newsletter-form', 'newsletter-status', 'Thanks! Please check your inbox to confirm.');
  handleForm('contact-form', 'contact-status', 'Thanks for reaching out! We will respond shortly.');
  handleForm('booking-form', 'booking-status', 'Request received. We\'ll confirm your appointment ASAP.');
  handleForm('review-form', 'review-status', 'Thank you for your review! It\'s now pending moderation.');
})();
