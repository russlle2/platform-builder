(function(){
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

  function onReady(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  onReady(() => {
    const header = qs('[data-elevate]');
    const nav = qs('#site-nav');
    const toggle = qs('#nav-toggle');

    // Header elevation
    const onScroll = () => {
      if(!header) return;
      const scrolled = window.scrollY > 6;
      header.classList.toggle('is-scrolled', scrolled);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile nav toggle
    if(toggle && nav){
      const closeNav = () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded','false');
        toggle.setAttribute('aria-label','Open menu');
      };
      const openNav = () => {
        nav.classList.add('open');
        toggle.setAttribute('aria-expanded','true');
        toggle.setAttribute('aria-label','Close menu');
      };
      toggle.addEventListener('click', () => {
        const isOpen = nav.classList.contains('open');
        isOpen ? closeNav() : openNav();
      });
      // Close when clicking a link
      nav.addEventListener('click', (e)=>{
        if(e.target.tagName === 'A'){
          closeNav();
        }
      });
    }

    // Smooth scroll for on-page anchors
    qsa('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if(href === '#' || href === '#!') return;
        const id = href.slice(1);
        const target = id ? document.getElementById(id) : null;
        if(target){
          e.preventDefault();
          const y = target.getBoundingClientRect().top + window.scrollY - 72; // header offset
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
    });

    // FAQ accordions
    qsa('.faq-toggle').forEach(btn => {
      const content = qs('#' + btn.getAttribute('aria-controls'));
      const setMax = (open) => {
        if(!content) return;
        content.style.maxHeight = open ? (content.scrollHeight + 'px') : '0px';
      };
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        setMax(!expanded);
      });
      // Initialize collapsed
      setMax(false);
    });

    // Newsletter form validation hints
    const form = qs('#newsletter');
    if(form){
      const email = qs('#lead-email', form);
      const consent = qs('#lead-consent', form);
      const hint = qs('#lead-hint', form);
      const name = qs('#lead-name', form);

      const setHint = (msg, type='info') => {
        if(!hint) return;
        hint.textContent = msg || '';
        hint.style.color = type === 'error' ? '#e16b6b' : (type === 'success' ? '#3bb273' : '');
      };

      const isValidEmail = (v) => /.+@.+\..+/.test(v);

      form.addEventListener('submit', (e) => {
        setHint('');
        let ok = true;
        if(!email.value || !isValidEmail(email.value)){
          ok = false;
          setHint('Please enter a valid email address to receive your guide.', 'error');
          email.focus();
        } else if(!consent.checked){
          ok = false;
          setHint('Kindly confirm consent to receive the guide and emails.', 'error');
          consent.focus();
        }
        if(!ok){ e.preventDefault(); }
        else {
          setHint(`Thanks${name && name.value ? `, ${name.value}` : ''}! Check your inbox for the guide.`, 'success');
        }
      });

      email.addEventListener('input', () => {
        if(email.value && isValidEmail(email.value)) setHint('Looks good.');
      });
      consent.addEventListener('change', () => { if(consent.checked) setHint(''); });
    }

    // Footer year
    const yearEl = qs('#year');
    if(yearEl){ yearEl.textContent = String(new Date().getFullYear()); }
  });
})();