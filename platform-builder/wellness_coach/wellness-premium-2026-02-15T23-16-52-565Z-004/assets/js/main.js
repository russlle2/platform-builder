(function(){
  const $ = (s, sc=document)=> sc.querySelector(s);
  const $$ = (s, sc=document)=> Array.from(sc.querySelectorAll(s));
  const header = $('[data-header]');
  const menu = $('[data-menu]');
  const toggle = $('.nav-toggle');
  if(toggle && menu){
    toggle.addEventListener('click', ()=>{
      const open = menu.getAttribute('data-open') === 'true';
      const next = (!open).toString();
      menu.setAttribute('data-open', next);
      toggle.setAttribute('aria-expanded', next);
      toggle.setAttribute('aria-label', next === 'true' ? 'Close navigation' : 'Open navigation');
    });
    // Close menu on link click (mobile)
    $$('#site-menu a').forEach(a=>a.addEventListener('click', ()=>{
      if(getComputedStyle(toggle).display !== 'none'){
        menu.setAttribute('data-open','false');
        toggle.setAttribute('aria-expanded','false');
      }
    }));
  }
  // Smooth scroll (enhanced)
  $$('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href').slice(1);
      if(!id) return;
      const t = document.getElementById(id);
      if(t){
        e.preventDefault();
        t.scrollIntoView({behavior:'smooth', block:'start'});
        history.replaceState(null, '', '#' + id);
        t.setAttribute('tabindex','-1');
        t.focus({preventScroll:true});
      }
    });
  });
  // Accordion
  const acc = $('[data-accordion]');
  if(acc){
    acc.addEventListener('click', (e)=>{
      const btn = e.target.closest('.accordion-trigger');
      if(!btn) return;
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      if(panel){ panel.hidden = expanded; }
    });
    // Initialize panels hidden
    $$('.accordion-panel', acc).forEach(p=> p.hidden = true);
  }
  // Newsletter form validation
  const form = $('#newsletter-form');
  if(form){
    const email = $('#nl-email', form);
    const hint = $('#nl-hint', form);
    const good = v => /\S+@\S+\.\S+/.test(v);
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const val = email.value.trim();
      if(!good(val)){
        email.setAttribute('aria-invalid','true');
        hint.textContent = 'Please enter a valid email address.';
        email.focus();
        return;
      }
      email.removeAttribute('aria-invalid');
      hint.style.color = '#2f7a67';
      hint.textContent = 'Thanks! Check your inbox for the guide.';
      form.reset();
      setTimeout(()=>{ hint.textContent=''; hint.style.color=''; }, 5000);
    });
    email.addEventListener('input', ()=>{
      if(email.hasAttribute('aria-invalid')){
        if(good(email.value.trim())){
          email.removeAttribute('aria-invalid');
          hint.textContent='Looks good.';
          hint.style.color = '#2f7a67';
        } else {
          hint.textContent='';
          hint.style.color='';
        }
      }
    });
  }
  // Footer year
  const y = document.querySelector('[data-year]');
  if(y){ y.textContent = new Date().getFullYear(); }
})();